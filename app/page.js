'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function AssessmentBuilder() {
  // State
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
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

  const saveApiKey = () => {
    localStorage.setItem('anthropic_api_key', apiKey);
    setShowSettings(false);
  };

  const handleFileChange = (f) => {
    setFile(f);
    setFilePreview(f ? f.name : '');
    setError('');
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleGenerate = async () => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true);
    setError('');
    setOutput('');

    try {
      let content = '';
      let imageBase64 = null;
      let contentType = '';

      if (inputMode === 'file' && file) {
        contentType = file.type.includes('pdf') ? 'PDF document' : 'scanned image';
        setLoadingStep('Reading document...');
        imageBase64 = await fileToBase64(file);
      } else if (inputMode === 'url' && url) {
        contentType = 'website';
        setLoadingStep('Fetching website content...');
        const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        const data = await res.json();
        content = data.text || '';
      } else if (inputMode === 'text' && pastedText) {
        contentType = 'typed questions';
        content = pastedText;
      } else {
        setError('Please provide input content.');
        setLoading(false);
        return;
      }

      setLoadingStep('Generating assessment with Claude...');
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ content, contentType, gradeLevel, subject, standard, includeVersionB, includeAnswerKey, imageBase64 })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.assessment);
      setOutputTab('versionA');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Parse output into sections
  const parseOutput = (text) => {
    if (!text) return { versionA: '', versionB: '', answerKey: '' };
    const versionBIdx = text.indexOf('â¶ VERSION B');
    const answerKeyIdx = text.indexOf('TEACHER ANSWER KEY');

    const versionA = versionBIdx > 0 ? text.slice(0, versionBIdx).trim() :
                     answerKeyIdx > 0 ? text.slice(0, answerKeyIdx).trim() : text;
    const versionB = versionBIdx > 0 ?
                     (answerKeyIdx > 0 ? text.slice(versionBIdx, answerKeyIdx).trim() : text.slice(versionBIdx).trim()) : '';
    const answerKey = answerKeyIdx > 0 ? text.slice(answerKeyIdx).trim() : '';

    return { versionA, versionB, answerKey };
  };

  const sections = parseOutput(output);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTabContent = outputTab === 'versionA' ? sections.versionA :
                             outputTab === 'versionB' ? sections.versionB :
                             sections.answerKey;

  const tabFilename = outputTab === 'versionA' ? 'assessment-version-a.txt' :
                      outputTab === 'versionB' ? 'assessment-version-b.txt' :
                      'assessment-answer-key.txt';

  // Render the full UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
            <p className="text-gray-500 mb-6 text-sm">Your API key is stored locally in your browser and never sent anywhere except directly to Anthropic.</p>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Anthropic API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2"
            />
            <p className="text-xs text-gray-400 mb-6">Get your API key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">console.anthropic.com</a></p>
            <div className="flex gap-3">
              <button onClick={saveApiKey} disabled={!apiKey} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">Save Key</button>
              {apiKey && <button onClick={() => setShowSettings(false)} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition">Cancel</button>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">ð</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assessment Builder</h1>
              <p className="text-xs text-gray-500">Powered by Claude AI</p>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition">
            <span>âï¸</span> Settings
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">1. Choose Your Source</h2>

          {/* Input mode tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'file', label: 'ð Upload File', desc: 'PDF or image' },
              { id: 'url', label: 'ð Website URL', desc: 'Any web page' },
              { id: 'text', label: 'âï¸ Type/Paste', desc: 'Direct input' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInputMode(tab.id)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition border-2 ${
                  inputMode === tab.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-xs font-normal opacity-70">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* File Upload */}
          {inputMode === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e.target.files?.[0])} className="hidden" />
              {file ? (
                <div>
                  <div className="text-3xl mb-2">â</div>
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB â click to replace</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">ð</div>
                  <p className="font-semibold text-gray-700">Drag & drop your file here</p>
                  <p className="text-sm text-gray-500 mt-1">Supports PDF, PNG, JPG â scanned documents work too</p>
                </div>
              )}
            </div>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.khanacademy.org/math/..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-2">Works with Khan Academy, IXL, curriculum sites, and most educational pages</p>
            </div>
          )}

          {/* Text Paste */}
          {inputMode === 'text' && (
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste or type your questions here...&#10;&#10;1. What is 3/4 + 1/2?&#10;2. Solve: 5 1/3 â 2 3/4"
              rows={8}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            />
          )}
        </div>

        {/* Config Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">2. Configure Your Assessment</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Grade Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level</label>
              <div className="flex gap-2 flex-wrap">
                {['K','1','2','3','4','5'].map(g => (
                  <button key={g} onClick={() => setGradeLevel(g)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition border-2 ${gradeLevel === g ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:border-indigo-400'}`}
                  >{g}</button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option>Math</option>
                <option>ELA</option>
                <option>Science</option>
                <option>Social Studies</option>
              </select>
            </div>

            {/* Standard */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">CCSS Standard <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="text" value={standard} onChange={(e) => setStandard(e.target.value)}
                placeholder="e.g. 5.NF.1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-6 mt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeVersionB} onChange={(e) => setIncludeVersionB(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-sm font-semibold text-gray-700">Generate Version B <span className="font-normal text-gray-500">(alternate version)</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeAnswerKey} onChange={(e) => setIncludeAnswerKey(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-sm font-semibold text-gray-700">Include Answer Key</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || (inputMode === 'file' && !file) || (inputMode === 'url' && !url) || (inputMode === 'text' && !pastedText)}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {loadingStep || 'Generating...'}
            </span>
          ) : 'ð Generate Assessment'}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Output Card */}
        {output && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Output Tabs */}
            <div className="flex items-center border-b border-gray-100 bg-gray-50">
              <div className="flex gap-1 p-2 flex-1">
                {[
                  { id: 'versionA', label: 'ð Version A', show: true },
                  { id: 'versionB', label: 'ð Version B', show: includeVersionB },
                  { id: 'answerKey', label: 'ð Answer Key', show: includeAnswerKey },
                ].filter(t => t.show).map(tab => (
                  <button key={tab.id} onClick={() => setOutputTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${outputTab === tab.id ? 'bg-white shadow text-indigo-700 border border-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                  >{tab.label}</button>
                ))}
              </div>
              <div className="flex gap-2 p-2">
                <button onClick={() => copyToClipboard(currentTabContent)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium">
                  ð Copy
                </button>
                <button onClick={() => downloadText(currentTabContent, tabFilename)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium">
                  â¬ï¸ Download
                </button>
                <button onClick={() => downloadText(output, 'full-assessment.txt')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition font-medium">
                  â¬ï¸ Download All
                </button>
              </div>
            </div>

            {/* Output Content */}
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl p-6 max-h-[600px] overflow-y-auto border border-gray-200">
                {currentTabContent || 'No content for this section.'}
              </pre>
            </div>

            {/* Tips */}
            <div className="px-6 pb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Pro tip:</strong> Click "Copy" then open a new Google Doc and paste (Ctrl+V) to get a fully editable document. For visual model questions marked with , insert images directly from your original PDF.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400">
        Assessment Builder â¢ Powered by Claude AI â¢ Your API key is stored locally and never shared
      </footer>
    </div>
  );
}
