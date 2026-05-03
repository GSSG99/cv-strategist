import { useState, useRef } from 'react'

function FileUploadZone({ files, onFilesChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(newFiles) {
    const valid = Array.from(newFiles).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    )
    if (valid.length < newFiles.length) {
      alert('Only PDF and .docx files are supported. Other files were skipped.')
    }
    onFilesChange((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      const unique = valid.filter((f) => !existing.has(f.name))
      return [...prev, ...unique]
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function removeFile(name) {
    onFilesChange((prev) => prev.filter((f) => f.name !== name))
  }

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            Drop CV files here or <span className="text-blue-600">click to browse</span>
          </p>
          <p className="text-xs text-gray-500">PDF and .docx supported — upload multiple versions</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.name) }}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ResultCard({ icon, title, accentClass, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${accentClass}`}>
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function KeywordBadge({ word }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
      {word}
    </span>
  )
}

export default function App() {
  const [cvFiles, setCvFiles] = useState([])
  const [guidelines, setGuidelines] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleAnalyse() {
    if (cvFiles.length === 0) return setError('Please upload at least one CV file.')
    if (!jobUrl.trim()) return setError('Please enter a job URL.')

    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const formData = new FormData()
      cvFiles.forEach((f) => formData.append('cvFiles', f))
      formData.append('guidelines', guidelines)
      formData.append('jobUrl', jobUrl.trim())

      const res = await fetch('https://cv-strategist-production.up.railway.app/api/analyse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'An error occurred during analysis.')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">CV Strategist</h1>
            <p className="text-xs text-gray-500">AI-powered CV optimisation for your target role</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Input section */}
        {!result && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-7">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Analyse your CVs</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload your CV versions, paste your best-practice guidelines, and provide the job URL.
              </p>
            </div>

            {/* CV Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                1. Upload your CV files
                <span className="font-normal text-gray-500 ml-1">(PDF / .docx)</span>
              </label>
              <FileUploadZone files={cvFiles} onFilesChange={setCvFiles} />
            </div>

            {/* Guidelines */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                2. Best practices / guidelines
                <span className="font-normal text-gray-500 ml-1">(optional — paste or type)</span>
              </label>
              <textarea
                rows={5}
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Paste your CV guidelines here — e.g. 'Always lead with metrics', 'Use the STAR method', 'Keep to 2 pages', etc."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
              />
            </div>

            {/* Job URL */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                3. Job posting URL
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://www.linkedin.com/jobs/view/..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleAnalyse}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing — this may take 15–30 seconds...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyse My CVs
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading state overlay */}
        {loading && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-900">AI is analysing your CVs...</p>
              <p className="text-sm text-blue-600 mt-0.5">
                Parsing files, scraping job description, and generating recommendations.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Analysed {result.cvFiles.length} CV{result.cvFiles.length > 1 ? 's' : ''}:{' '}
                  {result.cvFiles.join(', ')}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Over
              </button>
            </div>

            {/* Best Match */}
            <ResultCard icon="🏆" title="Best CV Base Match" accentClass="bg-green-50">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 rounded-lg px-3 py-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-sm">{result.analysis.bestMatch.filename}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{result.analysis.bestMatch.reason}</p>
              </div>
            </ResultCard>

            {/* Specific Edits */}
            <ResultCard icon="✏️" title="Specific Edits to Make" accentClass="bg-blue-50">
              <ol className="space-y-3">
                {result.analysis.specificEdits.map((edit, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed">{edit}</p>
                  </li>
                ))}
              </ol>
            </ResultCard>

            {/* Missing Keywords */}
            <ResultCard icon="🔑" title="Missing Keywords from Job Description" accentClass="bg-amber-50">
              {result.analysis.missingKeywords.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No missing keywords identified — great coverage!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.analysis.missingKeywords.map((kw, i) => (
                    <KeywordBadge key={i} word={kw} />
                  ))}
                </div>
              )}
            </ResultCard>

            {/* Structural Improvements */}
            <ResultCard icon="🏗️" title="Structural & Ordering Improvements" accentClass="bg-purple-50">
              <ul className="space-y-3">
                {result.analysis.structuralImprovements.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </ResultCard>

            {/* Analyse again button */}
            <div className="text-center pt-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyse a different role
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by Claude AI · CV Strategist
      </footer>
    </div>
  )
}
