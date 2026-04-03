'use client';
import { useState, useRef, useEffect } from 'react';

// Subject style config (full class names for Tailwind JIT)
const SUBJECT_STYLES = {
  'Math':          { grad: 'from-blue-500 to-indigo-600',   border: 'border-blue-400',   numBg: 'bg-blue-100',   numTxt: 'text-blue-700',   badge: 'bg-blue-50 text-blue-600',   emoji: '\u{1F4D0}' },
  'Science':       { grad: 'from-emerald-500 to-teal-600',  border: 'border-emerald-400', numBg: 'bg-emerald-100', numTxt: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-600', emoji: '\u{1F52C}' },
  'ELA':           { grad: 'from-amber-500 to-orange-600',  border: 'border-amber-400',  numBg: 'bg-amber-100',  numTxt: 'text-amber-700',  badge: 'bg-amber-50 text-amber-600',  emoji: '\u{1F4DA}' },
  'Reading':       { grad: 'from-amber-500 to-orange-600',  border: 'border-amber-400',  numBg: 'bg-amber-100',  numTxt: 'text-amber-700',  badge: 'bg-amber-50 text-amber-600',  emoji: '\u{1F4DA}' },
  'Social Studies':{ grad: 'from-purple-500 to-violet-600', border: 'border-purple-400', numBg: 'bg-purple-100', numTxt: 'text-purple-700', badge: 'bg-purple-50 text-purple-600', emoji: '\u{1F30D}' },
  'History':       { grad: 'from-rose-500 to-red-600',      border: 'border-rose-400',   numBg: 'bg-rose-100',   numTxt: 'text-rose-700',   badge: 'bg-rose-50 text-rose-600',   emoji: '\u{1F3DB}' },
  'Writing':       { grad: 'from-pink-500 to-fuchsia-600',  border: 'border-pink-400',   numBg: 'bg-pink-100',   numTxt: 'text-pink-700',   badge: 'bg-pink-50 text-pink-600',   emoji: '\u270F\uFE0F' },
};
const DEFAULT_STYLE = { grad: 'from-indigo-500 to-purple-600', border: 'border-indigo-400', numBg: 'bg-indigo-100', numTxt: 'text-indigo-700', badge: 'bg-indigo-50 text-indigo-600', emoji: '\u2B50' };

function parseAssessment(text) {
  const lines = text.split('\n');
  const questions = [];
  let currentQ = null;
  let titleLines = [];
  let foundFirst = false;

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    const qMatch = t.match(/^(\d+)\.\s+([\s\S]+)/);
    if (qMatch) {
      foundFirst = true;
      if (currentQ) questions.push(currentQ);
      currentQ = { num: qMatch[1], text: qMatch[2], standard: '', choices: [], extra: [] };
      continue;
    }
    if (currentQ) {
      if (t.startsWith('[') && t.endsWith(']')) { currentQ.standard = t; continue; }
      const cm = t.match(/^O\s+([A-D])\s+(.*)/);
      if (cm) { currentQ.choices.push({ letter: cm[1], text: cm[2] }); continue; }
      if (t.length > 2 && !t.startsWith('=') && !t.startsWith('-') && !t.startsWith('*')) {
        currentQ.extra.push(t);
      }
    } else if (!foundFirst) {
      titleLines.push(t);
    }
  }
  if (currentQ) questions.push(currentQ);
  return { title: titleLines[0] || '', subtitle: titleLines.slice(1).join(' '), questions };
}

function AssessmentPreview({ text, subject, gradeLevel }) {
  const style = SUBJECT_STYLES[subject] || DEFAULT_STYLE;
  const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : 'Grade ' + gradeLevel;
  const { title, subtitle, questions } = parseAssessment(text);
  const displayTitle = title || (gradeDisplay + ' ' + subject + ' Assessment');

  return (
    <div className="font-sans text-gray-900">
      {/* Colorful subject header */}
      <div className={'bg-gradient-to-r ' + style.grad + ' text-white px-6 py-5'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{style.emoji}</span>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">{displayTitle}</h1>
              {subtitle && <p className="text-sm text-white text-opacity-80 mt-0.5">{subtitle}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="bg-white bg-opacity-25 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{gradeDisplay}</span>
                <span className="bg-white bg-opacity-25 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{subject}</span>
                <span className="bg-white bg-opacity-25 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{questions.length} Questions</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-8 text-sm mt-4 pt-3 border-t border-white border-opacity-20">
          <div>
            <span className="font-semibold">Name:</span>
            <span className="border-b border-white border-opacity-50 inline-block w-44 ml-2 -mb-0.5"></span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="border-b border-white border-opacity-50 inline-block w-28 ml-2 -mb-0.5"></span>
          </div>
          <div>
            <span className="font-semibold">Score:</span>
            <span className="border-b border-white border-opacity-50 inline-block w-20 ml-2 -mb-0.5"></span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-gray-50 p-4 space-y-3">
        {questions.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">
            <p className="text-2xl mb-2">&#128203;</p>
            <p>No questions detected in this section.</p>
            <p>Switch to Raw Text to view the full output.</p>
          </div>
        )}

        {questions.map((q, i) => (
          <div key={i} className={'bg-white rounded-xl shadow-sm border-l-4 ' + style.border + ' overflow-hidden'}>
            <div className="p-4">
              <div className="flex gap-3">
                {/* Question number bubble */}
                <div className={'flex-shrink-0 w-8 h-8 rounded-full ' + style.numBg + ' ' + style.numTxt + ' flex items-center justify-center font-bold text-sm'}>
                  {q.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-semibold text-base leading-relaxed">{q.text}</p>
                  {q.extra.length > 0 && (
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">{q.extra.join(' ')}</p>
                  )}

                  {q.choices.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none">
                          <div className={'w-6 h-6 rounded-full border-2 ' + style.border + ' flex items-center justify-center text-xs font-bold ' + style.numTxt + ' bg-white flex-shrink-0'}>
                            {c.letter}
                          </div>
                          <span className="text-gray-700 text-sm leading-snug">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="h-px bg-gray-200 w-full"></div>
                      <div className="h-px bg-gray-200 w-full"></div>
                      <div className="h-px bg-gray-200 w-3/4"></div>
                    </div>
                  )}

                  {q.standard && (
                    <div className={'mt-3 inline-block text-xs px-2 py-0.5 rounded-full font-medium ' + style.badge}>
                      {q.standard.replace(/[[\]]/g, '')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssessmentBuilder() {
  // State
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileType, setFileType] = useState('');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [gradeLevel, setGradeLevel] = useState('5');
  const [subject, setSubject] = useState('Math');
  const [standard, setStandard] = useState('');
  const [includeVersionB, setIncludeVersionB] = useState(true);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [output, setOutput] = useState('');
  const [outputTab, setOutputTab] = useState('versionA');
  const [previewMode, setPreviewMode] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
    else setShowSettings(true);
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFileType(f.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(',')[1];
      setFilePreview(b64);
    };
    reader.readAsDataURL(f);
  };

  const handleGenerate = async () => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true);
    setError('');
    setOutput('');
    setOutputTab('versionA');
    setPreviewMode(true);
    try {
      let content = '';
      let contentType = inputMode;
      if (inputMode === 'paste') content = pastedText;
      else if (inputMode === 'url') content = url;

      if (inputMode === 'file' && filePreview) {
        setLoadingStep('Analyzing file...');
      } else {
        setLoadingStep('Generating assessment...');
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          content,
          contentType,
          gradeLevel,
          subject,
          standard,
          includeVersionB,
          includeAnswerKey,
          imageBase64: filePreview || null,
          fileType: fileType || null,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOutput(data.assessment || '');
        setLoadingStep('');
      }
    } catch (e) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Parse output into sections
  const parseOutput = (text) => {
    if (!text) return { versionA: '', versionB: '', answerKey: '' };
    const versionBIdx = text.indexOf('VERSION B --');
    const answerKeyIdx = text.indexOf('TEACHER ANSWER KEY');
    const versionA = versionBIdx > 0
      ? text.slice(0, versionBIdx).trim()
      : answerKeyIdx > 0 ? text.slice(0, answerKeyIdx).trim() : text;
    const versionB = versionBIdx > 0
      ? (answerKeyIdx > 0 ? text.slice(versionBIdx, answerKeyIdx).trim() : text.slice(versionBIdx).trim())
      : '';
    const answerKey = answerKeyIdx > 0 ? text.slice(answerKeyIdx).trim() : '';
    return { versionA, versionB, answerKey };
  };

  const sections = parseOutput(output);

  const currentTabContent =
    outputTab === 'versionA' ? sections.versionA :
    outputTab === 'versionB' ? sections.versionB :
    sections.answerKey;

  const tabFilename =
    outputTab === 'versionA' ? 'assessment-version-a.txt' :
    outputTab === 'versionB' ? 'assessment-version-b.txt' :
    'answer-key.txt';

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const INPUT_TABS = [
    { id: 'file', label: 'Upload File', desc: 'PDF or image' },
    { id: 'url', label: 'Enter URL', desc: 'Web page' },
    { id: 'paste', label: 'Paste Text', desc: 'Any content' },
  ];

  const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const SUBJECTS = ['Math', 'ELA', 'Reading', 'Science', 'Social Studies', 'History', 'Writing'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Settings Drawer */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-start justify-end">
          <div className="bg-white w-80 h-full shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">x</button>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Anthropic API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => { localStorage.setItem('anthropic_api_key', apiKey); setShowSettings(false); }}
                className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Save Key
              </button>
              <p className="mt-3 text-xs text-gray-400">Your key is stored locally and never shared.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#127891;</span>
            <span className="font-bold text-gray-800 text-lg">Assessment Builder</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
            <span>&#9881;</span> Settings
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Input Mode Tabs */}
          <div className="flex border-b border-gray-100">
            {INPUT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInputMode(tab.id)}
                className={'flex-1 py-3 px-2 flex flex-col items-center transition ' + (inputMode === tab.id ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-b-2 border-gray-100 bg-white text-gray-500 hover:bg-gray-50')}
              >
                <div className="text-xs font-semibold">{tab.label}</div>
                <div className="text-xs font-normal opacity-70">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* File Upload */}
          {inputMode === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileChange({ target: { files: e.dataTransfer.files } }); }}
              onClick={() => fileInputRef.current?.click()}
              className={'border-2 border-dashed rounded-xl m-4 p-10 text-center cursor-pointer transition ' + (dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50')}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div>
                  <div className="text-3xl mb-2">&#9989;</div>
                  <div className="text-sm font-semibold text-green-600">{file.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB -- click to replace</div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3 text-gray-300">&#128206;</div>
                  <p className="font-semibold text-gray-400">Drop a file or click to browse</p>
                  <p className="text-xs text-gray-300 mt-1">PDF, PNG, JPG up to 20MB</p>
                </div>
              )}
            </div>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <div className="p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Web Page URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/lesson"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {/* Paste Text */}
          {inputMode === 'paste' && (
            <div className="p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Paste Content</label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste lesson content, reading passage, or any text here..."
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
          )}
        </div>

        {/* Options Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Assessment Options</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grade Level</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : 'Grade ' + g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Specific Standard (optional)</label>
            <input
              type="text"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              placeholder="e.g. CCSS.Math.Content.5.NBT.A.1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {/* Options */}
          <div className="flex gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeVersionB} onChange={(e) => setIncludeVersionB(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm font-semibold text-gray-700">Generate Version B <span className="font-normal text-gray-400">(alternate)</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeAnswerKey} onChange={(e) => setIncludeAnswerKey(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm font-semibold text-gray-700">Include Answer Key</span>
            </label>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (inputMode === 'file' && !file) || (inputMode === 'url' && !url) || (inputMode === 'paste' && !pastedText)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-lg font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition mt-5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {loadingStep || 'Generating...'}
              </span>
            ) : 'Generate Assessment'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Output Card */}
        {output && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-100 px-4 pt-3 gap-1 overflow-x-auto">
              <div className="flex gap-1 flex-1">
                {[
                  { id: 'versionA', label: 'Version A', show: true },
                  { id: 'versionB', label: 'Version B', show: includeVersionB },
                  { id: 'answerKey', label: 'Answer Key', show: includeAnswerKey },
                ].filter((t) => t.show).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOutputTab(tab.id)}
                    className={'px-4 py-2 rounded-t-lg text-sm font-semibold transition ' + (outputTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Preview / Raw toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-2">
                <button
                  onClick={() => setPreviewMode(true)}
                  className={'text-xs font-semibold px-3 py-1.5 rounded-md transition ' + (previewMode ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700')}
                >
                  &#128065; Preview
                </button>
                <button
                  onClick={() => setPreviewMode(false)}
                  className={'text-xs font-semibold px-3 py-1.5 rounded-md transition ' + (!previewMode ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700')}
                >
                  Raw Text
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 p-3 border-b border-gray-50 bg-gray-50">
              <button onClick={() => copyToClipboard(currentTabContent)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-gray-200">
                &#128203; Copy
              </button>
              <button onClick={() => downloadText(currentTabContent, tabFilename)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-gray-200">
                &#11015; Download
              </button>
              <button onClick={() => downloadText(output, 'full-assessment.txt')} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition ml-auto">
                &#11015; Download All
              </button>
            </div>

            {/* Output Content */}
            <div className="overflow-hidden">
              {previewMode ? (
                <AssessmentPreview
                  text={currentTabContent}
                  subject={subject}
                  gradeLevel={gradeLevel}
                />
              ) : (
                <div className="p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-screen overflow-y-auto">
                    {currentTabContent || 'No content for this section.'}
                  </pre>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="px-6 pb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Pro tip:</strong> Click &quot;Copy&quot; then open a new Google Doc and paste (Ctrl+V) to get a fully formatted document ready for printing.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400">
        Assessment Builder * Powered by Claude AI * Your API key is stored locally and never shared
      </footer>
    </div>
  );
}
