# CV Strategist

AI-powered CV optimisation tool. Upload your CV versions, provide a job URL, and get tailored recommendations from Claude.

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

### 1. Configure the backend API key

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

## Running

Open **two terminals**:

**Terminal 1 — Backend (port 3001):**

```bash
cd backend
npm start
```

**Terminal 2 — Frontend (port 3000):**

```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload CVs** — drag & drop or click to select your PDF/.docx CV files (multiple versions supported)
2. **Add guidelines** — paste your personal CV best-practice guidelines (optional)
3. **Paste job URL** — copy the URL from LinkedIn, Greenhouse, Lever, etc.
4. Click **Analyse My CVs**

## Results

The app returns:

- **Best CV base match** — which of your CVs is the strongest starting point and why
- **Specific edits** — 5–10 actionable changes tailored to the exact role
- **Missing keywords** — terms from the job description absent from your CVs
- **Structural improvements** — section ordering and presentation suggestions

## Project Structure

```
cv-strategist/
├── backend/          # Express API server (port 3001)
│   ├── server.js     # Main server + /api/analyse endpoint
│   ├── package.json
│   └── .env          # Your API key (create from .env.example)
├── frontend/         # React + Vite + Tailwind app (port 3000)
│   ├── src/
│   │   ├── App.jsx   # Main UI component
│   │   └── main.jsx
│   └── package.json
├── cvs/              # Store your CV files here (optional)
└── guidelines.md     # Edit this with your personal CV guidelines
```

## Development

For hot-reload backend development:

```bash
cd backend
npm run dev   # uses nodemon
```
