require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function extractTextFromFile(file) {
  const { originalname, buffer, mimetype } = file;
  const name = originalname;

  if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return { name, text: data.text.trim() };
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalname.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return { name, text: result.value.trim() };
  }

  throw new Error(`Unsupported file type for "${originalname}". Please upload PDF or .docx files.`);
}

async function scrapeJobDescription(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  $('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"]').remove();

  const candidateSelectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job-details"]',
    '[class*="jobDetails"]',
    '[class*="description-content"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    '[id*="job-details"]',
    '.job-view-layout',
    '.jobs-description',
    '.description__text',
    'article',
    'main',
    '.content',
    '#content',
  ];

  let text = '';
  for (const selector of candidateSelectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const candidate = el.text().replace(/\s+/g, ' ').trim();
      if (candidate.length > 300) {
        text = candidate;
        break;
      }
    }
  }

  if (!text || text.length < 300) {
    text = $('body').text().replace(/\s+/g, ' ').trim();
  }

  return text.substring(0, 10000);
}

app.post('/api/analyse', upload.array('cvFiles', 20), async (req, res) => {
  try {
    const { guidelines, jobUrl } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one CV file.' });
    }
    if (!jobUrl || !jobUrl.trim()) {
      return res.status(400).json({ error: 'Please provide a job URL.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
    }

    // Extract text from all uploaded CVs
    let cvTexts;
    try {
      cvTexts = await Promise.all(files.map(extractTextFromFile));
    } catch (err) {
      return res.status(400).json({ error: `File parsing error: ${err.message}` });
    }

    // Scrape the job description
    let jobDescription;
    try {
      jobDescription = await scrapeJobDescription(jobUrl.trim());
    } catch (err) {
      return res.status(400).json({
        error: `Could not fetch the job description from that URL. It may require authentication or block scrapers. Error: ${err.message}`,
      });
    }

    // Build the prompt
    const cvSection = cvTexts
      .map((cv, i) => `=== CV ${i + 1}: "${cv.name}" ===\n\n${cv.text}`)
      .join('\n\n---\n\n');

    const guidelinesSection = guidelines && guidelines.trim()
      ? `=== BEST PRACTICES & GUIDELINES ===\n\n${guidelines.trim()}`
      : '=== BEST PRACTICES & GUIDELINES ===\n\nNo custom guidelines provided — use general CV best practices.';

    const systemPrompt = `You are an expert career consultant and professional CV strategist with 15+ years of experience helping candidates land roles at top companies. Your analysis is specific, actionable, and tailored to the exact job description provided — never generic.`;

    const userPrompt = `Analyse the CV(s), guidelines, and job description below. Provide a detailed, actionable strategy.

${cvSection}

---

${guidelinesSection}

---

=== JOB DESCRIPTION (from: ${jobUrl}) ===

${jobDescription}

---

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):

{
  "bestMatch": {
    "filename": "<exact filename of the best CV to use as a base>",
    "reason": "<2-3 sentences explaining specifically why this CV is the strongest starting point for this exact role — reference concrete details from both the CV and job description>"
  },
  "specificEdits": [
    "<Specific edit 1: be very concrete — name the section, what to change, and why it matters for this role>",
    "<Specific edit 2>",
    "<Specific edit 3>",
    "<Specific edit 4>",
    "<Specific edit 5>"
  ],
  "missingKeywords": [
    "<keyword or phrase from JD missing from all CVs>",
    "<keyword 2>",
    "<keyword 3>"
  ],
  "structuralImprovements": [
    "<Structural improvement 1: section to reorder, rename, or emphasise and why>",
    "<Structural improvement 2>"
  ]
}

Rules:
- specificEdits: provide 5–10 items, each highly specific to THIS job (not generic advice)
- missingKeywords: list every important keyword/technology/skill/methodology from the JD that does not appear in the CVs
- structuralImprovements: 2–5 items about section ordering, emphasis, length, or presentation`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = message.content[0].text;

    // Parse the JSON — handle potential markdown code fences
    let analysis;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:', rawText);
      return res.status(500).json({
        error: 'Failed to parse the AI response as JSON.',
        raw: rawText,
      });
    }

    res.json({
      success: true,
      analysis,
      cvFiles: cvTexts.map((cv) => cv.name),
    });
  } catch (err) {
    console.error('Unhandled error in /api/analyse:', err);
    res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CV Strategist backend running on http://localhost:${PORT}`);
});
