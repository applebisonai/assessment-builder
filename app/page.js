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

// ─── HTML Export Helper ─────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFractionTableHTML(whole, numerator, denominator) {
  const cellW = Math.max(20, Math.floor(180 / denominator));
  const strips = [];
  for (let w = 0; w < whole; w++) strips.push(denominator);
  if (numerator > 0 || whole === 0) strips.push(numerator);
  const label = whole > 0 ? `${whole} ${numerator}/${denominator}` : `${numerator}/${denominator}`;
  let html = `<div style="margin:4px 0 8px;">`;
  html += `<div style="font-size:11px;color:#555;margin-bottom:4px;font-weight:600;">${label}</div>`;
  for (let si = 0; si < strips.length; si++) {
    const filled = strips[si];
    html += `<table style="display:inline-table;border-collapse:collapse;margin-right:6px;vertical-align:middle;">`;
    html += `<tr>`;
    for (let i = 0; i < denominator; i++) {
      const isFilled = i < filled;
      html += `<td style="width:${cellW}px;height:30px;background:${isFilled ? '#6366f1' : '#e0e7ff'};border:1.5px solid #4f46e5;"></td>`;
    }
    html += `</tr>`;
    const stripLabel = si < whole ? `${denominator}/${denominator}` : `${numerator}/${denominator}`;
    html += `<tr><td colspan="${denominator}" style="text-align:center;font-size:10px;color:#374151;padding:1px 0;">${stripLabel}</td></tr>`;
    html += `</table>`;
  }
  html += `</div>`;
  return html;
}

function generateGoogleDocsHTML(text, subject, gradeLevel, customTitle) {
  const { title, subtitle, questions } = parseAssessment(text);
  const displayTitle = customTitle || title || `${subject} Assessment`;
  const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : 'Grade ' + gradeLevel;
  const borderColors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#f43f5e','#a855f7','#06b6d4','#f97316'];

  const questionBlocks = questions.map((q, idx) => {
    const config = TYPE_CONFIGS[q.type] || TYPE_CONFIGS.open;
    const color = borderColors[idx % borderColors.length];
    let block = `
      <div style="margin-bottom:18px;padding:14px 16px;border:1px solid #e5e7eb;border-left:4px solid ${color};border-radius:8px;page-break-inside:avoid;">
        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(config.label)} &nbsp;·&nbsp; ★ 1 pt</div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px;">
          <div style="flex-shrink:0;min-width:26px;height:26px;background:#6366f1;color:#fff;border-radius:50%;font-weight:bold;font-size:13px;text-align:center;line-height:26px;">${q.num}</div>
          <div>
            <p style="font-size:15px;font-weight:600;margin:0 0 4px;line-height:1.5;">${escapeHtml(q.text)}</p>
            ${q.extra.length > 0 ? `<p style="font-size:13px;color:#555;margin:0;">${escapeHtml(q.extra.join(' '))}</p>` : ''}
          </div>
        </div>`;

    if (q.models.length > 0) {
      block += `<div style="margin:6px 0 6px 36px;padding:8px 12px;background:#f8faff;border:1px solid #e0e7ff;border-radius:6px;">`;
      for (const m of q.models) {
        const fm = m.match(/\[FRACTION:\s*(.+?)\]/);
        if (fm) {
          const spec = fm[1].trim();
          const mx = spec.match(/^(\d+)\s+(\d+)\/(\d+)$/);
          const sm = spec.match(/^(\d+)\/(\d+)$/);
          if (mx) block += renderFractionTableHTML(parseInt(mx[1]), parseInt(mx[2]), parseInt(mx[3]));
          else if (sm) block += renderFractionTableHTML(0, parseInt(sm[1]), parseInt(sm[2]));
          else block += `<div style="font-size:12px;color:#666;font-style:italic;">${escapeHtml(m)}</div>`;
        } else {
          block += `<div style="font-size:12px;color:#666;font-style:italic;">${escapeHtml(m)}</div>`;
        }
      }
      block += `</div>`;
    }

    if (q.type === 'mc' && q.choices.length > 0) {
      block += `<table style="width:calc(100% - 36px);margin-left:36px;border-collapse:separate;border-spacing:4px;margin-top:6px;">`;
      for (let i = 0; i < q.choices.length; i += 2) {
        block += `<tr>`;
        block += `<td style="padding:6px 10px;width:50%;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">○ <strong>${q.choices[i].letter}.</strong> ${escapeHtml(q.choices[i].text)}</td>`;
        if (q.choices[i+1]) {
          block += `<td style="padding:6px 10px;width:50%;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">○ <strong>${q.choices[i+1].letter}.</strong> ${escapeHtml(q.choices[i+1].text)}</td>`;
        } else {
          block += `<td></td>`;
        }
        block += `</tr>`;
      }
      block += `</table>`;
    }

    if (q.type === 'open') {
      block += `<div style="margin-left:36px;margin-top:10px;">`;
      for (let i = 0; i < 4; i++) block += `<div style="border-bottom:1px solid #bbb;margin-bottom:18px;height:18px;"></div>`;
      block += `<div style="border:1px dashed #ccc;border-radius:6px;height:60px;margin-top:4px;"></div></div>`;
    }

    block += `</div>`;
    return block;
  }).join('');

  return `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#1a1a1a;">
    <div style="border-top:4px solid #6366f1;padding:18px 0 12px;text-align:center;">
      <h1 style="font-size:20px;font-weight:bold;margin:0 0 6px;">${escapeHtml(displayTitle)}</h1>
      ${subtitle ? `<p style="color:#666;font-size:13px;margin:0 0 10px;">${escapeHtml(subtitle)}</p>` : ''}
      <div style="display:inline-flex;gap:8px;margin-bottom:4px;">
        <span style="background:#eef2ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${gradeDisplay}</span>
        <span style="background:#f3e8ff;color:#7c3aed;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${subject}</span>
        <span style="background:#f3f4f6;color:#555;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${questions.length} Questions</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:14px 0 20px;">
      <tr>
        <td style="padding:4px 0;width:50%;font-size:12px;"><strong>Name:</strong> <span style="display:inline-block;width:200px;border-bottom:1px solid #999;">&nbsp;</span></td>
        <td style="padding:4px 0;width:50%;font-size:12px;"><strong>Date:</strong> <span style="display:inline-block;width:200px;border-bottom:1px solid #999;">&nbsp;</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:12px;"><strong>Class / Period:</strong> <span style="display:inline-block;width:165px;border-bottom:1px solid #999;">&nbsp;</span></td>
        <td style="padding:4px 0;font-size:12px;"><strong>Teacher:</strong> <span style="display:inline-block;width:185px;border-bottom:1px solid #999;">&nbsp;</span></td>
      </tr>
    </table>
    ${questionBlocks}
  </div>`;
}

// ─── Assessment Preview ─────────────────────────────────────────────────────

// ─── Visual Model Inline Editor ─────────────────────────────────────────────

function ModelEditWrapper({ marker, onSave, onRemove, children, invalid }) {
  // Parse model type and spec from marker
  const inner = marker.replace(/^\[|\]$/g, '').trim();
  const colonIdx = inner.indexOf(':');
  const modelType = colonIdx >= 0 ? inner.slice(0, colonIdx).trim() : '';
  const rawSpecInit = colonIdx >= 0 ? inner.slice(colonIdx + 1).trim() : inner;

  // FRACTION state
  const fmSpec = modelType === 'FRACTION' ? rawSpecInit : '';
  const mx0 = fmSpec ? fmSpec.match(/^(\d+)\s+(\d+)\/(\d+)$/) : null;
  const sm0 = fmSpec ? fmSpec.match(/^(\d+)\/(\d+)$/) : null;
  const [editing, setEditing] = useState(false);
  const [isMixed, setIsMixed] = useState(!!mx0);
  const [whole, setWhole] = useState(mx0 ? parseInt(mx0[1]) : 0);
  const [numer, setNumer] = useState(mx0 ? parseInt(mx0[2]) : (sm0 ? parseInt(sm0[1]) : 1));
  const [denom, setDenom] = useState(mx0 ? parseInt(mx0[3]) : (sm0 ? parseInt(sm0[2]) : 4));
  // BASE10 state
  const [hundreds, setHundreds] = useState(parseInt(rawSpecInit.match(/hundreds=(\d+)/)?.[1] || '0'));
  const [tens, setTens]         = useState(parseInt(rawSpecInit.match(/tens=(\d+)/)?.[1]     || '0'));
  const [ones, setOnes]         = useState(parseInt(rawSpecInit.match(/ones=(\d+)/)?.[1]     || '0'));
  // NUM_LINE state
  const [nlMin,   setNlMin]   = useState(parseInt(rawSpecInit.match(/min=(-?\d+)/)?.[1]  || '0'));
  const [nlMax,   setNlMax]   = useState(parseInt(rawSpecInit.match(/max=(\d+)/)?.[1]    || '10'));
  const [nlStep,  setNlStep]  = useState(parseInt(rawSpecInit.match(/step=(\d+)/)?.[1]   || '1'));
  const [nlLabel, setNlLabel] = useState(rawSpecInit.match(/label=([^|\]]+)/)?.[1]?.trim() || '');
  // PV_CHART state
  const [pvNum, setPvNum] = useState(parseInt(rawSpecInit.match(/(\d+)/)?.[1] || '0'));
  // BAR_MODEL / TAPE raw edit
  const [rawSpec, setRawSpec] = useState(rawSpecInit);

  if (!modelType) return <>{children}</>;

  const inputCls = 'border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-indigo-400';
  const labelCls = 'text-xs text-gray-500 flex items-center gap-1';

  const handleSave = () => {
    let newMarker = marker;
    switch (modelType) {
      case 'FRACTION':
        newMarker = (isMixed && whole > 0)
          ? `[FRACTION: ${whole} ${numer}/${denom}]`
          : `[FRACTION: ${numer}/${denom}]`;
        break;
      case 'BASE10':
        newMarker = `[BASE10: hundreds=${hundreds} tens=${tens} ones=${ones}]`;
        break;
      case 'NUM_LINE': {
        const lp = nlLabel ? ` | label=${nlLabel}` : '';
        newMarker = `[NUM_LINE: min=${nlMin} max=${nlMax} step=${nlStep}${lp}]`;
        break;
      }
      case 'PV_CHART':
        newMarker = `[PV_CHART: ${pvNum}]`;
        break;
      case 'BAR_MODEL':
        newMarker = `[BAR_MODEL: ${rawSpec}]`;
        break;
      case 'TAPE':
        newMarker = `[TAPE: ${rawSpec}]`;
        break;
      default:
        newMarker = `[${modelType}: ${rawSpec}]`;
    }
    onSave(marker, newMarker);
    setEditing(false);
  };

  const TYPE_LABELS = {
    FRACTION: 'Fraction', BASE10: 'Base-10 Blocks', NUM_LINE: 'Number Line',
    PV_CHART: 'Place Value Chart', BAR_MODEL: 'Bar Model', TAPE: 'Tape Diagram',
  };

  const renderEditor = () => {
    switch (modelType) {
      case 'FRACTION': return (
        <div className="flex items-center gap-2 flex-wrap">
          <label className={`${labelCls} cursor-pointer select-none`}>
            <input type="checkbox" checked={isMixed} onChange={e => setIsMixed(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/>
            Mixed number
          </label>
          {isMixed && <><input type="number" min="0" value={whole} onChange={e => setWhole(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-14`} placeholder="whole"/><span className="text-gray-400 text-xs font-bold">+</span></>}
          <input type="number" min="1" value={numer} onChange={e => setNumer(Math.max(1,parseInt(e.target.value)||1))} className={`${inputCls} w-14`} placeholder="num"/>
          <span className="text-gray-500 text-sm font-bold">⁄</span>
          <input type="number" min="1" value={denom} onChange={e => setDenom(Math.max(1,parseInt(e.target.value)||1))} className={`${inputCls} w-14`} placeholder="den"/>
        </div>
      );
      case 'BASE10': return (
        <div className="flex items-center gap-4 flex-wrap">
          <label className={labelCls}>Hundreds <input type="number" min="0" value={hundreds} onChange={e => setHundreds(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-14`}/></label>
          <label className={labelCls}>Tens <input type="number" min="0" value={tens} onChange={e => setTens(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-14`}/></label>
          <label className={labelCls}>Ones <input type="number" min="0" value={ones} onChange={e => setOnes(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-14`}/></label>
        </div>
      );
      case 'NUM_LINE': return (
        <div className="flex items-center gap-3 flex-wrap">
          <label className={labelCls}>Min <input type="number" value={nlMin} onChange={e => setNlMin(parseInt(e.target.value)||0)} className={`${inputCls} w-16`}/></label>
          <label className={labelCls}>Max <input type="number" value={nlMax} onChange={e => setNlMax(parseInt(e.target.value)||10)} className={`${inputCls} w-16`}/></label>
          <label className={labelCls}>Step <input type="number" min="1" value={nlStep} onChange={e => setNlStep(Math.max(1,parseInt(e.target.value)||1))} className={`${inputCls} w-14`}/></label>
          <label className={labelCls}>Label <input type="text" value={nlLabel} onChange={e => setNlLabel(e.target.value)} className={`${inputCls} w-28 text-left`}/></label>
        </div>
      );
      case 'PV_CHART': return (
        <div className="flex items-center gap-2">
          <label className={labelCls}>Number <input type="number" min="0" value={pvNum} onChange={e => setPvNum(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-24`}/></label>
        </div>
      );
      default: return (
        <div>
          <p className="text-xs text-gray-400 mb-1">Edit model spec (values separated by commas, options after |):</p>
          <input type="text" value={rawSpec} onChange={e => setRawSpec(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"/>
        </div>
      );
    }
  };

  // Invalid model: show remove-only UI
  if (invalid) return (
    <div className="flex items-center gap-2 py-1 no-print">
      <span className="text-xs text-red-400 italic">{marker}</span>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-1.5 py-0.5 bg-white">✕ Remove</button>
    </div>
  );

  return (
    <div className="relative group/model">
      {children}
      {!editing && (
        <button onClick={() => setEditing(true)}
          className="absolute top-1 right-1 opacity-0 group-hover/model:opacity-100 bg-white border border-indigo-200 text-indigo-500 hover:bg-indigo-50 rounded px-1.5 py-0.5 text-xs transition-opacity shadow-sm no-print">
          ✏ Edit
        </button>
      )}
      {editing && (
        <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-lg shadow-sm no-print">
          <p className="text-xs font-semibold text-indigo-600 mb-2">Edit {TYPE_LABELS[modelType] || modelType}</p>
          {renderEditor()}
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition">Save</button>
            <button onClick={() => setEditing(false)} className="text-gray-500 text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            {onRemove && <button onClick={onRemove} className="ml-auto text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">Remove model</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentPreview({ text, subject, gradeLevel, onModelEdit, customTitle }) {
  const { title, subtitle, questions } = parseAssessment(text);
  const displayTitle = customTitle || title || `${subject} Assessment`;
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
                  {displayTitle}
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
                      const isInvalid = !rendered;
                      if (onModelEdit) {
                        return (
                          <ModelEditWrapper key={mi} marker={m}
                            invalid={isInvalid}
                            onSave={(oldM, newM) => onModelEdit(oldM, newM)}
                            onRemove={() => onModelEdit(m, '')}>
                            {rendered ? <div>{rendered}</div> : null}
                          </ModelEditWrapper>
                        );
                      }
                      // In print/read-only mode: skip invalid models entirely
                      return rendered ? <div key={mi}>{rendered}</div> : null;
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
          {displayTitle} · {gradeDisplay} {subject} · {questions.length} Questions
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
  const [customTitle, setCustomTitle] = useState('');
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'edit' | 'raw'
  const [copied, setCopied] = useState(false);
  const [editedSections, setEditedSections] = useState({});
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
        fd.append('customTitle', customTitle);
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
          body: JSON.stringify({ gradeLevel, subject, standard, includeVersionB, includeAnswerKey, questionCount, customTitle, url: inputMode === 'url' ? url : '', pastedText: inputMode === 'paste' ? pastedText : '', apiKey }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOutput(data.result);
      }
      setOutputTab('versionA');
      setViewMode('preview');
      setEditedSections({});
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
  const rawTabContent =
    outputTab === 'versionA' ? sections.versionA :
    outputTab === 'versionB' ? sections.versionB :
    sections.answerKey;
  const currentTabContent = editedSections[outputTab] ?? rawTabContent;

  const tabFilename =
    outputTab === 'versionA' ? 'assessment-version-a.txt' :
    outputTab === 'versionB' ? 'assessment-version-b.txt' :
    'answer-key.txt';

  const handleNewAssessment = () => {
    setOutput('');
    setFile(null);
    setEditedSections({});
    setCustomTitle('');
    setOutputTab('versionA');
    setViewMode('preview');
    setError('');
    setInputMode('file');
    // Small delay so the input re-mounts before we trigger the picker
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleModelEdit = (oldMarker, newMarker) => {
    // newMarker === '' means remove the model entirely
    const escaped = oldMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updated = newMarker === ''
      ? currentTabContent.replace(new RegExp(`\\n?${escaped}`, 'g'), '')
      : currentTabContent.replace(oldMarker, newMarker);
    setEditedSections(prev => ({ ...prev, [outputTab]: updated }));
  };

  const copyToClipboard = async (t) => {
    try {
      // Copy rich HTML for Google Docs / Word, plus plain text fallback
      const htmlContent = outputTab !== 'answerKey'
        ? generateGoogleDocsHTML(t, subject, gradeLevel, customTitle)
        : null;
      if (htmlContent && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([t], { type: 'text/plain' }),
          })
        ]);
      } else {
        await navigator.clipboard.writeText(t);
      }
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
                <div className="m-4">
                  <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
                  {file ? (
                    /* File already selected — show info card with clear actions */
                    <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">✅</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-green-700 truncate">{file.name}</div>
                          <div className="text-xs text-green-600 mt-0.5">{(file.size / 1024).toFixed(0)} KB</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 text-xs font-semibold border border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg py-2 transition"
                        >
                          ↑ Replace File
                        </button>
                        <button
                          onClick={() => setFile(null)}
                          className="text-xs font-semibold border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 rounded-lg px-3 py-2 transition"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* No file yet — drag/drop zone */
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ' + (dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50')}
                    >
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
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assessment Title <span className="font-normal text-gray-400">(optional — AI will generate one if blank)</span></label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Unit 4 Fractions Quiz, Chapter 3 Check-In..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
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
                {/* New Assessment banner */}
                <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-600">Assessment ready</span>
                  <button
                    onClick={handleNewAssessment}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                  >
                    <span className="text-base leading-none">+</span> New Assessment
                  </button>
                </div>

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
                      <button onClick={() => setViewMode('edit')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'edit' ? 'bg-white shadow text-emerald-700' : 'text-gray-500')}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => setViewMode('raw')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'raw' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>
                        📄 Raw
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

                {/* Preview / Edit / Raw content */}
                {viewMode === 'preview' ? (
                  <div ref={previewRef}>
                  {outputTab === 'answerKey' ? (
                    <AnswerKeyPreview text={currentTabContent}/>
                  ) : (
                    <AssessmentPreview
                      text={currentTabContent}
                      subject={subject}
                      gradeLevel={gradeLevel}
                      onModelEdit={handleModelEdit}
                      customTitle={customTitle}
                    />
                  )}
                  </div>
                ) : viewMode === 'edit' ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-emerald-700 font-semibold">✏️ Edit the text below — the preview updates live when you switch back.</p>
                      {editedSections[outputTab] && (
                        <button
                          onClick={() => setEditedSections(prev => { const n = {...prev}; delete n[outputTab]; return n; })}
                          className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                          Reset to original
                        </button>
                      )}
                    </div>
                    <textarea
                      className="w-full text-xs text-gray-700 font-mono leading-relaxed border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      style={{ minHeight: '420px' }}
                      value={currentTabContent}
                      onChange={e => setEditedSections(prev => ({ ...prev, [outputTab]: e.target.value }))}
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed max-h-96 overflow-y-auto">{currentTabContent}</pre>
                  </div>
                )}

                {/* Pro tip */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>Pro tip:</strong> Use <strong>✏️ Edit</strong> to tweak questions, then click <strong>Copy</strong> to paste with full formatting into Google Docs or Word. Use <strong>Download PDF</strong> for a print-ready version.
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
