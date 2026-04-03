'use client';
import { useState, useRef, useEffect } from 'react';

// ─── SVG Visual Model Renderers ────────────────────────────────────────────

function BarModel({ parts, total, label }) {
  // parts = array of {value, color, label}
  const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'];
  const totalVal = parts.reduce((s,p) => s + (p.value||1), 0);
  const width = 480, height = 52;
  let x = 0;
  return (
    <div className="my-3">
      {label && <div className="text-xs text-gray-500 mb-1 font-medium">{label}</div>}
      <svg width={width} height={height + 28} viewBox={`0 0 ${width} ${height + 28}`} style={{maxWidth:'100%'}}>
        {parts.map((p, i) => {
          const w = Math.round((p.value||1) / totalVal * width);
          const rect = (
            <g key={i}>
              <rect x={x} y={0} width={w} height={height} fill={colors[i % colors.length]} opacity="0.85" rx="2"/>
              <rect x={x} y={0} width={w} height={height} fill="none" stroke="white" strokeWidth="1.5" rx="2"/>
              <text x={x + w/2} y={height/2 + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="600">{p.label || p.value}</text>
              <text x={x + w/2} y={height + 16} textAnchor="middle" fill="#374151" fontSize="11">{p.value}</text>
            </g>
          );
          x += w;
          return rect;
        })}
        {total && <text x={width/2} y={height + 28} textAnchor="middle" fill="#6b7280" fontSize="11">Total: {total}</text>}
      </svg>
    </div>
  );
}

function TapeDiagram({ segments, showBrace, totalLabel }) {
  const colors = ['#ddd6fe','#fde68a','#bbf7d0','#fecaca','#bfdbfe'];
  const width = 480, h = 48;
  const total = segments.reduce((s,seg) => s + (seg.value||1), 0);
  let x = 0;
  return (
    <div className="my-3">
      <svg width={width} height={h + 40} viewBox={`0 0 ${width} ${h + 40}`} style={{maxWidth:'100%'}}>
        {segments.map((seg, i) => {
          const w = Math.round((seg.value||1) / total * width);
          const el = (
            <g key={i}>
              <rect x={x} y={0} width={w} height={h} fill={colors[i % colors.length]} stroke="#6366f1" strokeWidth="1.5"/>
              <text x={x + w/2} y={h/2 + 5} textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="600">{seg.label}</text>
            </g>
          );
          x += w;
          return el;
        })}
        {showBrace && (
          <>
            <path d={`M 0 ${h+8} Q ${width/2} ${h+24} ${width} ${h+8}`} fill="none" stroke="#374151" strokeWidth="1.5"/>
            {totalLabel && <text x={width/2} y={h+38} textAnchor="middle" fill="#374151" fontSize="12" fontWeight="600">{totalLabel}</text>}
          </>
        )}
      </svg>
    </div>
  );
}

function Base10Blocks({ hundreds=0, tens=0, ones=0 }) {
  const blockSize = 12, gap = 2;
  const elements = [];
  let x = 8;
  // Hundreds (10×10 grid)
  for (let h = 0; h < Math.min(hundreds, 9); h++) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        elements.push(<rect key={`h${h}${r}${c}`} x={x + c*(blockSize/10+0.5)} y={8 + r*(blockSize/10+0.5)} width={blockSize/10} height={blockSize/10} fill="#6366f1" opacity="0.7" stroke="white" strokeWidth="0.3"/>);
      }
    }
    x += blockSize + gap * 3;
  }
  x += gap * 2;
  // Tens (1×10 column)
  for (let t = 0; t < Math.min(tens, 20); t++) {
    for (let r = 0; r < 10; r++) {
      elements.push(<rect key={`t${t}${r}`} x={x} y={8 + r*(blockSize/10 + 0.5)} width={blockSize/10} height={blockSize/10} fill="#f59e0b" opacity="0.8" stroke="white" strokeWidth="0.3"/>);
    }
    x += blockSize/10 + gap;
    if ((t+1) % 10 === 0) { x += gap * 2; }
  }
  x += gap * 2;
  // Ones (single square)
  let oneX = x, oneY = 8;
  for (let o = 0; o < Math.min(ones, 30); o++) {
    elements.push(<rect key={`o${o}`} x={oneX} y={oneY} width={blockSize/10} height={blockSize/10} fill="#10b981" opacity="0.8" stroke="white" strokeWidth="0.3"/>);
    oneX += blockSize/10 + gap;
    if ((o+1) % 5 === 0) { oneX = x; oneY += blockSize/10 + gap; }
  }
  const svgW = Math.max(200, x + 60), svgH = 32;
  return (
    <div className="my-3 bg-gray-50 rounded-lg p-3 inline-block">
      <div className="flex gap-4 items-start text-xs text-gray-500 mb-1">
        {hundreds > 0 && <span className="text-indigo-600 font-medium">{hundreds} hundred{hundreds>1?'s':''}</span>}
        {tens > 0 && <span className="text-amber-600 font-medium">{tens} ten{tens>1?'s':''}</span>}
        {ones > 0 && <span className="text-emerald-600 font-medium">{ones} one{ones>1?'s':''}</span>}
      </div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{maxWidth:'100%'}}>
        {elements}
      </svg>
    </div>
  );
}

function NumberLine({ min=0, max=10, step=1, marks=[], label='' }) {
  const width = 460, pad = 30, h = 60;
  const scale = (v) => pad + (v - min) / (max - min) * (width - pad*2);
  const ticks = [];
  for (let v = min; v <= max; v += step) {
    ticks.push(v);
  }
  return (
    <div className="my-3">
      {label && <div className="text-xs text-gray-500 mb-1 font-medium">{label}</div>}
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{maxWidth:'100%'}}>
        {/* Main line */}
        <line x1={pad-10} y1={30} x2={width-pad+10} y2={30} stroke="#374151" strokeWidth="2"/>
        {/* Arrow ends */}
        <polygon points={`${pad-10},30 ${pad-2},26 ${pad-2},34`} fill="#374151"/>
        <polygon points={`${width-pad+10},30 ${width-pad+2},26 ${width-pad+2},34`} fill="#374151"/>
        {/* Ticks */}
        {ticks.map(v => (
          <g key={v}>
            <line x1={scale(v)} y1={22} x2={scale(v)} y2={38} stroke="#374151" strokeWidth="1.5"/>
            <text x={scale(v)} y={52} textAnchor="middle" fill="#374151" fontSize="11">{v}</text>
          </g>
        ))}
        {/* Marked points */}
        {marks.map((m, i) => (
          <circle key={i} cx={scale(m.value)} cy={30} r={5} fill={m.open ? 'white' : '#6366f1'} stroke="#6366f1" strokeWidth="2"/>
        ))}
      </svg>
    </div>
  );
}

function PlaceValueChart({ number, places=['Hundreds','Tens','Ones'] }) {
  const digits = String(number).padStart(places.length, '0').split('');
  const colors = ['#ede9fe','#fef3c7','#d1fae5','#fee2e2'];
  return (
    <div className="my-3 inline-block">
      <table style={{borderCollapse:'collapse', fontSize:'14px'}}>
        <thead>
          <tr>
            {places.map((p,i) => (
              <th key={i} style={{border:'2px solid #6366f1', padding:'6px 16px', background: colors[i % colors.length], color:'#312e81', fontWeight:'700', textAlign:'center'}}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {digits.map((d,i) => (
              <td key={i} style={{border:'2px solid #6366f1', padding:'8px 16px', background:'white', fontSize:'22px', fontWeight:'700', textAlign:'center', color:'#1e1b4b'}}>{d}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FractionBar({ numerator, denominator, label='' }) {
  const width = 300, h = 44, parts = denominator;
  const filled = numerator;
  const partW = width / parts;
  return (
    <div className="my-3">
      {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
      <svg width={width} height={h + 24} viewBox={`0 0 ${width} ${h + 24}`} style={{maxWidth:'100%'}}>
        {Array.from({length: parts}).map((_, i) => (
          <rect key={i} x={i*partW} y={0} width={partW-1} height={h}
            fill={i < filled ? '#6366f1' : '#e0e7ff'}
            stroke="#4f46e5" strokeWidth="1.5"/>
        ))}
        <text x={width/2} y={h+16} textAnchor="middle" fill="#374151" fontSize="12">{numerator}/{denominator}</text>
      </svg>
    </div>
  );
}

function MixedNumberBar({ whole, numerator, denominator, label='' }) {
  const stripW = 240, h = 40, partW = stripW / denominator;
  const strips = [];
  // one full strip per whole number
  for (let w = 0; w < whole; w++) {
    strips.push({ filled: denominator, isWhole: true });
  }
  // fractional part strip
  if (numerator > 0) strips.push({ filled: numerator, isWhole: false });
  const totalW = strips.length * (stripW + 8);
  const svgH = h + 28;
  return (
    <div className="my-3">
      {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
      <div className="text-xs text-gray-500 mb-1">{whole} {numerator}/{denominator}</div>
      <svg width={totalW} height={svgH} viewBox={`0 0 ${totalW} ${svgH}`} style={{maxWidth:'100%'}}>
        {strips.map((strip, si) => {
          const ox = si * (stripW + 8);
          return Array.from({length: denominator}).map((_, i) => (
            <rect key={`${si}-${i}`} x={ox + i*partW} y={0} width={partW-1} height={h}
              fill={i < strip.filled ? '#6366f1' : '#e0e7ff'}
              stroke="#4f46e5" strokeWidth="1.5"/>
          ));
        })}
        {strips.map((strip, si) => {
          const ox = si * (stripW + 8);
          const lbl = strip.isWhole ? `${denominator}/${denominator}` : `${numerator}/${denominator}`;
          return <text key={`lbl-${si}`} x={ox + stripW/2} y={h+16} textAnchor="middle" fill="#374151" fontSize="11">{lbl}</text>;
        })}
      </svg>
    </div>
  );
}

// ─── Visual Model Parser ────────────────────────────────────────────────────

function parseVisualModel(marker) {
  // marker like: [BAR_MODEL: 3,5,2 | label=Total is 10]
  // [BASE10: hundreds=1 tens=2 ones=3]
  // [NUM_LINE: min=0 max=20 step=2]
  // [PV_CHART: 342]
  // [FRACTION: 3/4]
  // [TAPE: 4,6 | brace=yes | total=10]
  const inner = marker.replace(/^\[|\]$/g, '').trim();
  if (inner.startsWith('BAR_MODEL:')) {
    const rest = inner.slice('BAR_MODEL:'.length).trim();
    const [partStr, ...opts] = rest.split('|');
    const label = opts.find(o => o.trim().startsWith('label='))?.replace('label=','').trim() || '';
    const parts = partStr.split(',').map((v,i) => {
      const [val, lbl] = v.trim().split(':');
      return { value: Number(val)||1, label: lbl || String(val) };
    });
    return <BarModel parts={parts} label={label}/>;
  }
  if (inner.startsWith('TAPE:')) {
    const rest = inner.slice('TAPE:'.length).trim();
    const [segStr, ...opts] = rest.split('|');
    const showBrace = opts.some(o => o.includes('brace=yes'));
    const totalLabel = opts.find(o => o.trim().startsWith('total='))?.replace('total=','').trim() || '';
    const segs = segStr.split(',').map(v => {
      const [val, lbl] = v.trim().split(':');
      return { value: Number(val)||1, label: lbl || String(val) };
    });
    return <TapeDiagram segments={segs} showBrace={showBrace} totalLabel={totalLabel}/>;
  }
  if (inner.startsWith('BASE10:')) {
    const rest = inner.slice('BASE10:'.length).trim();
    const h = parseInt(rest.match(/hundreds=(\d+)/)?.[1] || '0');
    const t = parseInt(rest.match(/tens=(\d+)/)?.[1] || '0');
    const o = parseInt(rest.match(/ones=(\d+)/)?.[1] || '0');
    return <Base10Blocks hundreds={h} tens={t} ones={o}/>;
  }
  if (inner.startsWith('NUM_LINE:')) {
    const rest = inner.slice('NUM_LINE:'.length).trim();
    const mn = parseInt(rest.match(/min=(\d+)/)?.[1] || '0');
    const mx = parseInt(rest.match(/max=(\d+)/)?.[1] || '10');
    const st = parseInt(rest.match(/step=(\d+)/)?.[1] || '1');
    const lbl = rest.match(/label=([^|]+)/)?.[1]?.trim() || '';
    return <NumberLine min={mn} max={mx} step={st} label={lbl}/>;
  }
  if (inner.startsWith('PV_CHART:')) {
    const rest = inner.slice('PV_CHART:'.length).trim();
    const num = parseInt(rest.match(/(\d+)/)?.[1] || '0');
    const places = num >= 1000 ? ['Thousands','Hundreds','Tens','Ones'] :
                   num >= 100  ? ['Hundreds','Tens','Ones'] : ['Tens','Ones'];
    return <PlaceValueChart number={num} places={places}/>;
  }
  if (inner.startsWith('FRACTION:')) {
    const rest = inner.slice('FRACTION:'.length).trim();
    // Check for mixed number: "1 2/3"
    const mixedM = rest.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedM) return <MixedNumberBar whole={parseInt(mixedM[1])} numerator={parseInt(mixedM[2])} denominator={parseInt(mixedM[3])}/>;
    // Simple fraction: "3/4"
    const m = rest.match(/(\d+)\/(\d+)/);
    if (m) return <FractionBar numerator={parseInt(m[1])} denominator={parseInt(m[2])}/>;
  }
  return null;
}

// ─── Assessment Parser ──────────────────────────────────────────────────────

function parseAssessment(text) {
  const lines = text.split('\n');
  const questions = [];
  let currentQ = null;
  let titleLine = '';
  let subtitleLine = '';
  let headerParsed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract title from first non-empty lines
    if (!headerParsed && !trimmed.match(/^\d+[\.\)]/)) {
      if (!titleLine) { titleLine = trimmed; continue; }
      if (!subtitleLine && !trimmed.match(/^(version|TEACHER|ANSWER)/i)) { subtitleLine = trimmed; continue; }
    }

    // Check for visual model markers
    const modelMatch = trimmed.match(/^\[([A-Z_]+):.+\]$/);
    if (modelMatch && currentQ) {
      currentQ.models.push(trimmed);
      continue;
    }

    // New question
    const qMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/);
    if (qMatch) {
      if (currentQ) questions.push(currentQ);
      headerParsed = true;
      const qText = qMatch[2];
      // Check if question has inline model
      const inlineModel = qText.match(/\[([A-Z_]+):.+\]/);
      const cleanText = inlineModel ? qText.replace(inlineModel[0], '').trim() : qText;
      currentQ = {
        num: parseInt(qMatch[1]),
        text: cleanText,
        choices: [],
        models: inlineModel ? [inlineModel[0]] : [],
        extra: [],
        standard: '',
        type: 'open'
      };
      continue;
    }

    if (!currentQ) continue;

    // Answer choices — various formats
    // O A) text  or  O A. text  or  A) text  or  (A) text
    const choiceMatch = trimmed.match(/^[Oo○◯]\s*([A-Da-d])[\.\)]\s*(.+)/) ||
                        trimmed.match(/^([A-Da-d])[\.\)]\s+(.+)/) ||
                        trimmed.match(/^\(([A-Da-d])\)\s*(.+)/);
    if (choiceMatch) {
      currentQ.choices.push({ letter: choiceMatch[1].toUpperCase(), text: choiceMatch[2] });
      currentQ.type = 'mc';
      continue;
    }

    // Standard tag
    const stdMatch = trimmed.match(/^\[(.+)\]$/);
    if (stdMatch && !trimmed.match(/^[A-Z_]+:/)) {
      currentQ.standard = stdMatch[1];
      continue;
    }

    // Extra context lines (not a new question, not a choice)
    if (currentQ && !trimmed.match(/^(TEACHER|ANSWER KEY|Version [AB])/i)) {
      currentQ.extra.push(trimmed);
    }
  }
  if (currentQ) questions.push(currentQ);

  return { title: titleLine, subtitle: subtitleLine, questions };
}

// ─── Question Type Configs ─────────────────────────────────────────────────

const TYPE_CONFIGS = {
  mc: {
    label: '● Multiple Choice',
    labelColor: 'text-gray-600',
    instruction: 'Choose the best answer.',
  },
  open: {
    label: '✏ Open Response',
    labelColor: 'text-gray-600',
    instruction: 'Show your work.',
  },
};

// ─── Assessment Preview ─────────────────────────────────────────────────────

function AssessmentPreview({ text, subject, gradeLevel }) {
  const { title, subtitle, questions } = parseAssessment(text);
  const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : 'Grade ' + gradeLevel;

  const accentColors = [
    'border-indigo-500', 'border-blue-500', 'border-emerald-500',
    'border-amber-500', 'border-rose-500', 'border-purple-500',
    'border-cyan-500', 'border-orange-500'
  ];

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 font-sans">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .question-card { break-inside: avoid; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>

      <div className="max-w-3xl mx-auto space-y-4">

        {/* ── Header / Cover Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Color bar */}
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"/>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800 leading-tight mb-1">
                  {title || `${subject} Assessment`}
                </h1>
                {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">{gradeDisplay}</span>
                  <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">{subject}</span>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{questions.length} Questions</span>
                </div>
              </div>
              {/* Score box */}
              <div className="flex-shrink-0 border-2 border-gray-300 rounded-xl p-3 text-center min-w-[72px]">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Score</div>
                <div className="text-2xl font-bold text-gray-300">/</div>
                <div className="text-xs text-gray-400">{questions.length} pts</div>
              </div>
            </div>

            {/* Student Info lines */}
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
              {['Name', 'Date', 'Class / Period', 'Teacher'].map(f => (
                <div key={f} className="flex items-end gap-2">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{f}:</span>
                  <div className="flex-1 border-b-2 border-gray-300" style={{minWidth:80, height:20}}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Question Cards ── */}
        {questions.map((q, idx) => {
          const config = TYPE_CONFIGS[q.type] || TYPE_CONFIGS.open;
          const accent = accentColors[idx % accentColors.length];

          return (
            <div key={idx} className={`question-card bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden border-l-4 ${accent}`}>
              {/* Question top bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className={`text-xs font-semibold ${config.labelColor}`}>{config.label}</span>
                <div className="flex items-center gap-2">
                  {q.standard && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">{q.standard}</span>
                  )}
                  <span className="text-xs font-bold text-red-500">★ 1 pt</span>
                </div>
              </div>

              <div className="p-5">
                {/* Question number + text */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {q.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-semibold text-base leading-relaxed">{q.text}</p>
                    {q.extra.length > 0 && (
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">{q.extra.join(' ')}</p>
                    )}
                  </div>
                </div>

                {/* Visual Models */}
                {q.models.length > 0 && (
                  <div className="ml-11 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {q.models.map((m, mi) => {
                      const rendered = parseVisualModel(m);
                      return rendered ? <div key={mi}>{rendered}</div> : (
                        <div key={mi} className="text-xs text-gray-400 italic">{m}</div>
                      );
                    })}
                  </div>
                )}

                {/* Instruction line */}
                <div className="ml-11 mb-3">
                  <p className="text-xs text-gray-400 italic">{config.instruction}</p>
                </div>

                {/* Multiple Choice Grid */}
                {q.type === 'mc' && q.choices.length > 0 && (
                  <div className="ml-11 grid grid-cols-2 gap-2.5">
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-transparent"/>
                        </div>
                        <div className="flex items-start gap-1.5 flex-1">
                          <span className="text-xs font-bold text-gray-400 mt-0.5">{c.letter}.</span>
                          <span className="text-sm text-gray-700 leading-snug">{c.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open Response Write-in area */}
                {q.type === 'open' && (
                  <div className="ml-11 mt-2 space-y-2.5">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="border-b border-gray-300 h-8"/>
                    ))}
                    <div className="border border-dashed border-gray-300 rounded-xl h-16 mt-2 flex items-center justify-center">
                      <span className="text-xs text-gray-300">Work space</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {questions.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-500 font-medium">No questions detected yet.</p>
            <p className="text-sm text-gray-400 mt-1">Switch to Raw Text to see the full output.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3 text-xs text-gray-400">
          {title || 'Assessment'} · {gradeDisplay} {subject} · {questions.length} Questions
        </div>
      </div>
    </div>
  );
}

// ─── Answer Key Preview ─────────────────────────────────────────────────────

function AnswerKeyPreview({ text }) {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔑</span>
        <h3 className="font-bold text-gray-800">Answer Key</h3>
        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full ml-auto">Teacher Copy</span>
      </div>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-3 py-1.5 border-b border-gray-50">
            <span className="text-sm font-mono text-gray-800">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function AssessmentBuilder() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [gradeLevel, setGradeLevel] = useState('3');
  const [subject, setSubject] = useState('Math');
  const [standard, setStandard] = useState('');
  const [includeVersionB, setIncludeVersionB] = useState(false);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [questionCount, setQuestionCount] = useState('8');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [outputTab, setOutputTab] = useState('versionA');
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'raw'
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.size <= 20 * 1024 * 1024) setFile(f);
    else if (f) setError('File must be under 20MB');
  };

  const handleGenerate = async () => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true); setError(''); setOutput('');
    try {
      let body;
      if (inputMode === 'file' && file) {
        setLoadingStep('Reading file...');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('gradeLevel', gradeLevel);
        fd.append('subject', subject);
        fd.append('standard', standard);
        fd.append('includeVersionB', String(includeVersionB));
        fd.append('includeAnswerKey', String(includeAnswerKey));
        fd.append('questionCount', questionCount);
        fd.append('apiKey', apiKey);
        setLoadingStep('Generating assessment...');
        const res = await fetch('/api/generate', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOutput(data.result);
      } else {
        setLoadingStep('Generating assessment...');
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gradeLevel, subject, standard, includeVersionB, includeAnswerKey, questionCount, url: inputMode === 'url' ? url : '', pastedText: inputMode === 'paste' ? pastedText : '', apiKey }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOutput(data.result);
      }
      setOutputTab('versionA');
      setViewMode('preview');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Parse output sections
  const parseOutput = (text) => {
    const vBIdx = text.indexOf('VERSION B');
    const akIdx = text.indexOf('TEACHER ANSWER KEY');
    const versionA = vBIdx > 0 ? text.slice(0, vBIdx).trim() : (akIdx > 0 ? text.slice(0, akIdx).trim() : text.trim());
    const versionB = vBIdx > 0 ? (akIdx > vBIdx ? text.slice(vBIdx, akIdx).trim() : text.slice(vBIdx).trim()) : '';
    const answerKey = akIdx > 0 ? text.slice(akIdx).trim() : '';
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

  const copyToClipboard = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // Fallback for browsers that block clipboard API
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsPDF = () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const tabLabel =
      outputTab === 'versionA' ? 'Version A' :
      outputTab === 'versionB' ? 'Version B' :
      'Answer Key';
    const html = previewEl.innerHTML;
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assessment – ${tabLabel}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin: 0.65in; size: letter; }
      .no-print { display: none !important; }
    }
    body { background: white; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body class="p-6">
  ${html}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 600); };<\/script>
</body>
</html>`);
    pw.document.close();
  };

  const INPUT_TABS = [
    { id: 'file', label: 'Upload File', desc: 'PDF or image' },
    { id: 'url', label: 'Enter URL', desc: 'Web page' },
    { id: 'paste', label: 'Paste Text', desc: 'Any content' },
  ];
  const GRADE_LEVELS = ['K','1','2','3','4','5','6','7','8','9','10','11','12'];
  const SUBJECTS = ['Math','ELA','Reading','Science','Social Studies','History','Writing'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Settings Drawer */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-start justify-end">
          <div className="bg-white w-80 h-full shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
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
            <span className="text-2xl">📝</span>
            <span className="font-bold text-gray-800 text-lg">Assessment Builder</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
            <span>⚙</span> Settings
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left Panel: Input + Options ── */}
          <div className="space-y-5">

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
                      <div className="text-3xl mb-2">✅</div>
                      <div className="text-sm font-semibold text-green-600">{file.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB — click to replace</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3 text-gray-300">📂</div>
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
                  <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {GRADE_LEVELS.map((g) => (<option key={g} value={g}>{g === 'K' ? 'Kindergarten' : 'Grade ' + g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {SUBJECTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Specific Standard (optional)</label>
                <input
                  type="text"
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                  placeholder="e.g. CCSS.Math.Content.3.OA.A.1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Questions</label>
                <select value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['4','5','6','8','10','12','15','20'].map(n => (<option key={n} value={n}>{n} questions</option>))}
                </select>
              </div>
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
          </div>

          {/* ── Right Panel: Output ── */}
          <div className="space-y-4">
            {output ? (
              <>
                {/* Output Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    <button onClick={() => setOutputTab('versionA')} className={'flex-1 py-2.5 text-sm font-semibold transition ' + (outputTab === 'versionA' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50')}>
                      Version A
                    </button>
                    {sections.versionB && (
                      <button onClick={() => setOutputTab('versionB')} className={'flex-1 py-2.5 text-sm font-semibold transition ' + (outputTab === 'versionB' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50')}>
                        Version B
                      </button>
                    )}
                    {sections.answerKey && (
                      <button onClick={() => setOutputTab('answerKey')} className={'flex-1 py-2.5 text-sm font-semibold transition ' + (outputTab === 'answerKey' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' : 'text-gray-500 hover:bg-gray-50')}>
                        Answer Key
                      </button>
                    )}
                  </div>

                  {/* View Mode toggle */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                      <button onClick={() => setViewMode('preview')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'preview' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>
                        👁 Preview
                      </button>
                      <button onClick={() => setViewMode('raw')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'raw' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>
                        📄 Raw Text
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyToClipboard(currentTabContent)} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition min-w-[60px]">
                        {copied ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button onClick={downloadAsPDF} className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition">
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview / Raw content */}
                {viewMode === 'preview' ? (
                  <div ref={previewRef}>
                  {outputTab === 'answerKey' ? (
                    <AnswerKeyPreview text={sections.answerKey}/>
                  ) : (
                    <AssessmentPreview
                      text={outputTab === 'versionA' ? sections.versionA : sections.versionB}
                      subject={subject}
                      gradeLevel={gradeLevel}
                    />
                  )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed max-h-96 overflow-y-auto">{currentTabContent}</pre>
                  </div>
                )}

                {/* Pro tip */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>Pro tip:</strong> Click &quot;Download PDF&quot; to open a print-ready version — then choose &quot;Save as PDF&quot; in the print dialog. Use &quot;Copy&quot; to paste into Google Docs or Word.
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 flex flex-col items-center justify-center text-center p-8">
                <div className="text-5xl mb-4">🎯</div>
                <p className="font-semibold text-gray-500">Your assessment will appear here</p>
                <p className="text-sm text-gray-400 mt-1">Upload content and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Assessment Builder * Powered by Claude AI * Your API key is stored locally and never shared
      </footer>
    </div>
  );
}
