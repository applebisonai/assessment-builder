'use client';
import { useState, useRef, useEffect, Component } from 'react';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-lg w-full text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">An unexpected error occurred. Try refreshing the page — your work may be recovered from local storage.</p>
            <pre className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-3 text-left whitespace-pre-wrap mb-4 max-h-32 overflow-y-auto">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function NumberLine({ min=0, max=10, step=1, marks=[], label='', showJumps=false }) {
  const width = 460, pad = 30;
  const lineY = showJumps ? 54 : 30;
  const svgH = showJumps ? 86 : 60;
  const arcH = 22;
  const scale = (v) => pad + (v - min) / (max - min) * (width - pad*2);
  const ticks = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  return (
    <div className="my-3">
      {label && <div className="text-xs text-gray-500 mb-1 font-medium">{label}</div>}
      <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} style={{maxWidth:'100%'}}>
        {/* Jump arcs */}
        {showJumps && ticks.slice(0, -1).map((v, i) => {
          const x1 = scale(v), x2 = scale(v + step), mx = (x1 + x2) / 2;
          return (
            <g key={`arc-${i}`}>
              <path d={`M ${x1} ${lineY} Q ${mx} ${lineY - arcH} ${x2} ${lineY}`} fill="none" stroke="#6366f1" strokeWidth="1.5"/>
              <text x={mx} y={lineY - arcH - 3} textAnchor="middle" fill="#4f46e5" fontSize="10" fontWeight="600">+{step}</text>
            </g>
          );
        })}
        {/* Main line */}
        <line x1={pad-10} y1={lineY} x2={width-pad+10} y2={lineY} stroke="#374151" strokeWidth="2"/>
        {/* Arrow ends */}
        <polygon points={`${pad-10},${lineY} ${pad-2},${lineY-4} ${pad-2},${lineY+4}`} fill="#374151"/>
        <polygon points={`${width-pad+10},${lineY} ${width-pad+2},${lineY-4} ${width-pad+2},${lineY+4}`} fill="#374151"/>
        {/* Ticks */}
        {ticks.map(v => (
          <g key={v}>
            <line x1={scale(v)} y1={lineY-8} x2={scale(v)} y2={lineY+8} stroke="#374151" strokeWidth="1.5"/>
            <text x={scale(v)} y={lineY+22} textAnchor="middle" fill="#374151" fontSize="11">{v}</text>
          </g>
        ))}
        {/* Marked points */}
        {marks.map((m, i) => (
          <circle key={i} cx={scale(m.value)} cy={lineY} r={5} fill={m.open ? 'white' : '#6366f1'} stroke="#6366f1" strokeWidth="2"/>
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

function EqualGroups({ groups=3, items=5 }) {
  const bgColors = ['#c7d2fe','#fde68a','#bbf7d0','#fecaca','#bfdbfe','#f5d0fe','#fed7aa'];
  const dotColors = ['#4f46e5','#d97706','#059669','#dc2626','#2563eb','#9333ea','#ea580c'];
  const boxW = Math.min(88, Math.floor(460 / Math.max(groups, 1)) - 6);
  const boxH = 72;
  const totalW = groups * (boxW + 6) + 10;
  const dotsPerRow = items <= 3 ? items : items <= 6 ? 3 : items <= 8 ? 4 : 5;
  const rows = Math.ceil(items / dotsPerRow);
  const dotR = Math.max(3, Math.min(7, Math.floor((boxW - 14) / dotsPerRow / 2) - 1));
  const dxSp = (boxW - 12) / Math.max(dotsPerRow, 1);
  const dySp = Math.min(16, (boxH - 12) / Math.max(rows, 1));
  return (
    <div className="my-3">
      <svg width={totalW} height={boxH} viewBox={`0 0 ${totalW} ${boxH}`} style={{maxWidth:'100%'}}>
        {Array.from({length: groups}).map((_, gi) => {
          const gx = 5 + gi * (boxW + 6);
          return (
            <g key={gi}>
              <rect x={gx} y={0} width={boxW} height={boxH} fill={bgColors[gi % bgColors.length]} stroke="#6366f1" strokeWidth="1.5" rx="8"/>
              {Array.from({length: items}).map((_, di) => {
                const col = di % dotsPerRow, row = Math.floor(di / dotsPerRow);
                const cx = gx + 7 + dxSp * col + dxSp / 2;
                const cy = 7 + dySp * row + dySp / 2;
                return <circle key={di} cx={cx} cy={cy} r={dotR} fill={dotColors[gi % dotColors.length]} opacity="0.85"/>;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ArrayModel({ rows=3, cols=4 }) {
  // A true array: discrete dots arranged in a strict grid.
  // Every row has exactly `cols` dots. Every column has exactly `rows` dots.
  // Grid lines make the equal-groups structure immediately visible.
  // NO SVG marker elements — they cause ID conflicts when multiple arrays
  // appear on the same page and scramble the dot positions.
  const cellSize = Math.min(40, Math.max(22, Math.floor(380 / Math.max(cols, rows))));
  const dotR = Math.max(6, Math.floor(cellSize * 0.3));
  const pad = 10;
  const svgW = cols * cellSize + pad * 2;
  const svgH = rows * cellSize + pad * 2;
  const elements = [];
  // Light grid lines so rows and columns are crystal-clear
  for (let r = 0; r <= rows; r++) {
    const y = pad + r * cellSize;
    elements.push(<line key={`hr${r}`} x1={pad} y1={y} x2={pad + cols * cellSize} y2={y} stroke="#c7d2fe" strokeWidth="1"/>);
  }
  for (let c = 0; c <= cols; c++) {
    const x = pad + c * cellSize;
    elements.push(<line key={`vc${c}`} x1={x} y1={pad} x2={x} y2={pad + rows * cellSize} stroke="#c7d2fe" strokeWidth="1"/>);
  }
  // One dot per cell — centered exactly in its cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = pad + c * cellSize + cellSize / 2;
      const cy = pad + r * cellSize + cellSize / 2;
      elements.push(
        <circle key={`d${r}-${c}`} cx={cx} cy={cy} r={dotR} fill="#4f46e5" opacity="0.85"/>
      );
    }
  }
  return (
    <div className="my-3">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
        style={{maxWidth:'100%', display:'block'}}>
        {elements}
      </svg>
      <div style={{fontSize:'11px', color:'#4f46e5', fontWeight:'600', marginTop:'4px'}}>
        {rows} row{rows!==1?'s':''} × {cols} column{cols!==1?'s':''} = {rows*cols} total
      </div>
    </div>
  );
}

function AreaModel({ colLabels=[], rowLabels=[], showProducts=true }) {
  // Area / rectangle model — filled rectangle with labeled sections.
  // colLabels: dimension of each column section (e.g. ['20','3'])
  // rowLabels: dimension of each row section (e.g. ['4'])
  // Used for area, distributive property, partial products (box method).
  const cols = Math.max(1, colLabels.length || 1);
  const rows = Math.max(1, rowLabels.length || 1);

  // Size each section proportionally to its numeric value (or equal if not numeric)
  const toNum = s => { const n = parseInt(String(s).replace(/\D/g,'')); return isNaN(n) || n === 0 ? 1 : n; };
  const colVals = colLabels.length ? colLabels.map(toNum) : [1];
  const rowVals = rowLabels.length ? rowLabels.map(toNum) : [1];
  const totalColVal = colVals.reduce((a,b)=>a+b,0);
  const totalRowVal = rowVals.reduce((a,b)=>a+b,0);

  const maxW = 360, minCellW = 52, minCellH = 40;
  const labelPad = 28; // space for outside labels
  const innerW = Math.max(cols * minCellW, maxW - labelPad);
  const innerH = Math.max(rows * minCellH, rows * 54);

  // x positions of each column
  const colWidths = colVals.map(v => Math.round(v / totalColVal * innerW));
  const rowHeights = rowVals.map(v => Math.round(v / totalRowVal * innerH));

  // Fix rounding drift
  const wSum = colWidths.reduce((a,b)=>a+b,0);
  if (wSum !== innerW) colWidths[colWidths.length-1] += innerW - wSum;
  const hSum = rowHeights.reduce((a,b)=>a+b,0);
  if (hSum !== innerH) rowHeights[rowHeights.length-1] += innerH - hSum;

  const ox = labelPad, oy = labelPad;
  const svgW = innerW + labelPad + 8;
  const svgH = innerH + labelPad + 8;

  // Build column x positions
  const colXs = [ox];
  for (let c = 0; c < cols - 1; c++) colXs.push(colXs[c] + colWidths[c]);
  // Build row y positions
  const rowYs = [oy];
  for (let r = 0; r < rows - 1; r++) rowYs.push(rowYs[r] + rowHeights[r]);

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = colXs[c], y = rowYs[r];
      const w = colWidths[c], h = rowHeights[r];
      // Compute partial product if both labels are numeric
      const cv = parseInt(colLabels[c]), rv = parseInt(rowLabels[r]);
      const product = (!isNaN(cv) && !isNaN(rv) && showProducts) ? String(cv * rv) : '';
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width={w} height={h} fill="#c7d2fe" stroke="#4f46e5" strokeWidth="1.5"/>
          {product && (
            <text x={x + w/2} y={y + h/2 + 6} textAnchor="middle" fill="#1e1b4b" fontSize="14" fontWeight="700">{product}</text>
          )}
        </g>
      );
    }
  }

  // Outer border
  const outerBorder = <rect x={ox} y={oy} width={innerW} height={innerH} fill="none" stroke="#4f46e5" strokeWidth="2.5"/>;

  // Column labels (top)
  const colLabelEls = colLabels.map((lbl, c) => (
    <text key={`cl${c}`} x={colXs[c] + colWidths[c]/2} y={oy - 8}
      textAnchor="middle" fill="#1e1b4b" fontSize="13" fontWeight="700">{lbl}</text>
  ));

  // Row labels (left)
  const rowLabelEls = rowLabels.map((lbl, r) => (
    <text key={`rl${r}`} x={ox - 8} y={rowYs[r] + rowHeights[r]/2 + 5}
      textAnchor="end" fill="#1e1b4b" fontSize="13" fontWeight="700">{lbl}</text>
  ));

  return (
    <div className="my-3">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{maxWidth:'100%'}}>
        {cells}
        {outerBorder}
        {colLabelEls}
        {rowLabelEls}
      </svg>
    </div>
  );
}

function NumberBond({ whole=10, part1=4, part2=6, showParts=true }) {
  // Part-part-whole diagram: large circle on top, two part circles below
  const cr = 28; // circle radius
  const cx = 120, topY = 36;
  const leftX = 56, rightX = 184, partY = 110;
  return (
    <div className="my-3 inline-block">
      <svg width={240} height={148} viewBox="0 0 240 148" style={{maxWidth:'100%'}}>
        {/* Connecting lines */}
        <line x1={cx} y1={topY+cr} x2={leftX} y2={partY-cr} stroke="#6366f1" strokeWidth="2"/>
        <line x1={cx} y1={topY+cr} x2={rightX} y2={partY-cr} stroke="#6366f1" strokeWidth="2"/>
        {/* Whole (top) */}
        <circle cx={cx} cy={topY} r={cr} fill="#c7d2fe" stroke="#4f46e5" strokeWidth="2"/>
        <text x={cx} y={topY+5} textAnchor="middle" fill="#1e1b4b" fontSize="16" fontWeight="700">{whole}</text>
        {/* Part 1 (left) */}
        <circle cx={leftX} cy={partY} r={cr} fill="#e0e7ff" stroke="#4f46e5" strokeWidth="2"/>
        <text x={leftX} y={partY+5} textAnchor="middle" fill="#1e1b4b" fontSize="16" fontWeight="700">{showParts ? part1 : '?'}</text>
        {/* Part 2 (right) */}
        <circle cx={rightX} cy={partY} r={cr} fill="#e0e7ff" stroke="#4f46e5" strokeWidth="2"/>
        <text x={rightX} y={partY+5} textAnchor="middle" fill="#1e1b4b" fontSize="16" fontWeight="700">{showParts ? part2 : '?'}</text>
        {/* Labels */}
        <text x={cx} y={142} textAnchor="middle" fill="#6b7280" fontSize="10">Whole</text>
        <text x={leftX} y={142} textAnchor="middle" fill="#6b7280" fontSize="10">Part</text>
        <text x={rightX} y={142} textAnchor="middle" fill="#6b7280" fontSize="10">Part</text>
      </svg>
    </div>
  );
}

function TensFrame({ filled=5, total=10 }) {
  // 2-row × 5-col grid (or 1×5 for five-frame)
  const rows = total <= 5 ? 1 : 2;
  const cols = 5;
  const cw = 36, ch = 36, pad = 4, cr = 13;
  const svgW = cols * cw + pad * 2;
  const svgH = rows * ch + pad * 2;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = pad + c * cw + cw / 2;
      const y = pad + r * ch + ch / 2;
      const isFilled = idx < filled;
      cells.push(
        <g key={idx}>
          <rect x={pad + c * cw} y={pad + r * ch} width={cw} height={ch} fill="white" stroke="#374151" strokeWidth="1.5"/>
          <circle cx={x} cy={y} r={cr} fill={isFilled ? '#4f46e5' : 'transparent'} stroke={isFilled ? '#3730a3' : '#d1d5db'} strokeWidth="1.5"/>
        </g>
      );
    }
  }
  return (
    <div className="my-3 inline-block">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{maxWidth:'100%'}}>
        <rect x={pad} y={pad} width={cols*cw} height={rows*ch} fill="#f8faff" stroke="#4f46e5" strokeWidth="2" rx="3"/>
        {cells}
      </svg>
    </div>
  );
}

function FractionCircle({ numerator=1, denominator=4 }) {
  const r = 60, cx = 70, cy = 70;
  const slices = [];
  for (let i = 0; i < denominator; i++) {
    const startAngle = (i / denominator) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = (1 / denominator) > 0.5 ? 1 : 0;
    const isFilled = i < numerator;
    slices.push(
      <path key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={isFilled ? '#6366f1' : '#e0e7ff'}
        stroke="white" strokeWidth="2"/>
    );
  }
  return (
    <div className="my-3 inline-block">
      <svg width={140} height={152} viewBox="0 0 140 152" style={{maxWidth:'100%'}}>
        {slices}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4f46e5" strokeWidth="2"/>
        <text x={cx} y={cy+r+18} textAnchor="middle" fill="#374151" fontSize="13" fontWeight="600">{numerator}/{denominator}</text>
      </svg>
    </div>
  );
}

function FunctionTable({ ruleLabel='Rule: ?', pairs=[], inputLabel='Input', outputLabel='Output' }) {
  // pairs = [{in: 1, out: 3}, ...]
  const headerBg = '#ede9fe', rowBg = ['#fafafa', 'white'];
  const colW = 80, rowH = 32;
  const svgW = colW * 2 + 4;
  const svgH = (pairs.length + 2) * rowH + 4;
  const rows = [];
  // Header
  rows.push(
    <g key="header">
      <rect x={2} y={2} width={colW} height={rowH} fill={headerBg} stroke="#6366f1" strokeWidth="1.5"/>
      <rect x={2+colW} y={2} width={colW} height={rowH} fill={headerBg} stroke="#6366f1" strokeWidth="1.5"/>
      <text x={2+colW/2} y={2+rowH/2+5} textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="700">{inputLabel}</text>
      <text x={2+colW*1.5} y={2+rowH/2+5} textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="700">{outputLabel}</text>
    </g>
  );
  // Data rows
  pairs.forEach((p, i) => {
    const y = 2 + (i + 1) * rowH;
    const bg = rowBg[i % 2];
    rows.push(
      <g key={i}>
        <rect x={2} y={y} width={colW} height={rowH} fill={bg} stroke="#6366f1" strokeWidth="1"/>
        <rect x={2+colW} y={y} width={colW} height={rowH} fill={bg} stroke="#6366f1" strokeWidth="1"/>
        <text x={2+colW/2} y={y+rowH/2+5} textAnchor="middle" fill="#1e1b4b" fontSize="13" fontWeight="600">{p.in}</text>
        <text x={2+colW*1.5} y={y+rowH/2+5} textAnchor="middle" fill="#1e1b4b" fontSize="13" fontWeight="600">{p.out}</text>
      </g>
    );
  });
  return (
    <div className="my-3 inline-block">
      <div className="text-xs text-indigo-600 font-semibold mb-1 ml-1">{ruleLabel}</div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{maxWidth:'100%'}}>
        {rows}
      </svg>
    </div>
  );
}

// ─── GridResponse ────────────────────────────────────────────────────────────
// Renders the standard gridded-response bubble grid used on standardized tests.
// Students write the answer digits in boxes across the top, then bubble the
// corresponding digit 0–9 in each column below.
// Marker: [GRID_RESPONSE: cols=4]
function GridResponse({ cols = 4 }) {
  const digits = [0,1,2,3,4,5,6,7,8,9];
  const cellW = 36, digitH = 28, boxH = 36;
  const svgW = cellW * cols + 2;
  const svgH = boxH + digits.length * digitH + 8;
  const columns = Array.from({ length: cols });
  return (
    <div className="my-3 inline-block">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
        {/* Write-in boxes at top */}
        {columns.map((_, c) => (
          <rect key={`box-${c}`} x={1 + c * cellW} y={1} width={cellW - 1} height={boxH - 1}
            fill="#f9fafb" stroke="#9ca3af" strokeWidth="1.5" rx="2"/>
        ))}
        {/* Digit bubble rows */}
        {digits.map((d, di) => (
          columns.map((_, c) => {
            const x = 1 + c * cellW;
            const y = boxH + di * digitH;
            const cx2 = x + cellW / 2;
            const cy = y + digitH / 2;
            const r = 11;
            return (
              <g key={`${c}-${d}`}>
                <circle cx={cx2} cy={cy} r={r} fill="#f9fafb" stroke="#9ca3af" strokeWidth="1"/>
                <text x={cx2} y={cy + 4} textAnchor="middle" fontSize="11" fill="#374151">{d}</text>
              </g>
            );
          })
        ))}
      </svg>
    </div>
  );
}

// ─── NumberChart ─────────────────────────────────────────────────────────────
// Renders a number grid (like a hundreds chart or portion of one) with
// optional shaded cells.
// Marker: [NUM_CHART: start=1 end=40 cols=10 shaded=3,9,15,21,27,33,39]
function NumberChart({ start = 1, end = 100, cols = 10, shaded = [] }) {
  const shadedSet = new Set(shaded.map(Number));
  const cellW = 36, cellH = 32;
  const count = end - start + 1;
  const rows = Math.ceil(count / cols);
  const svgW = cellW * cols;
  const svgH = cellH * rows;
  const cells = [];
  for (let n = start; n <= end; n++) {
    const idx = n - start;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = col * cellW;
    const y = row * cellH;
    const isShaded = shadedSet.has(n);
    cells.push(
      <g key={n}>
        <rect x={x} y={y} width={cellW} height={cellH}
          fill={isShaded ? '#6366f1' : '#f9fafb'}
          stroke="#d1d5db" strokeWidth="0.75"/>
        <text x={x + cellW / 2} y={y + cellH / 2 + 5}
          textAnchor="middle" fontSize="12"
          fontWeight={isShaded ? '700' : '400'}
          fill={isShaded ? 'white' : '#374151'}>{n}</text>
      </g>
    );
  }
  return (
    <div className="my-3 overflow-x-auto">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', maxWidth: '100%' }}>
        {cells}
      </svg>
    </div>
  );
}

// ─── YesNoTable ───────────────────────────────────────────────────────────────
// Renders a two-column (Yes / No) decision table where students circle a
// bubble letter.
// Marker: [YES_NO_TABLE: 42÷__=7 | __×9=54 | 36÷6=__ | 6×__=30]
function YesNoTable({ rows }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let letterIdx = 0;
  return (
    <div className="my-3 overflow-x-auto">
      <table style={{ borderCollapse: 'collapse', minWidth: '320px', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', background: '#f3f4f6', fontSize: '13px', fontWeight: 600, textAlign: 'left', width: '60%' }}></th>
            <th style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', background: '#f3f4f6', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>Yes</th>
            <th style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', background: '#f3f4f6', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>No</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((label, i) => {
            const yesLetter = letters[letterIdx++];
            const noLetter = letters[letterIdx++];
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', fontSize: '13px', color: '#1f2937' }}>{label}</td>
                <td style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #6366f1',
                    fontSize: '12px', fontWeight: 600, color: '#6366f1' }}>{yesLetter}</span>
                </td>
                <td style={{ border: '1.5px solid #d1d5db', padding: '6px 12px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #6b7280',
                    fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{noLetter}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Visual Analyzer — sends an image to the /api/analyze-visual endpoint
// and returns an array of marker strings (or null if unrecognized).
async function analyzeVisualImage(imageData, apiKey) {
  const res = await fetch('/api/analyze-visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, apiKey }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.markers || null;
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
    const showJumps = rest.includes('jumps=yes');
    return <NumberLine min={mn} max={mx} step={st} label={lbl} showJumps={showJumps}/>;
  }
  if (inner.startsWith('GROUPS:')) {
    const rest = inner.slice('GROUPS:'.length).trim();
    const g = parseInt(rest.match(/groups=(\d+)/)?.[1] || '3');
    const it = parseInt(rest.match(/items=(\d+)/)?.[1] || '4');
    return <EqualGroups groups={Math.min(g, 12)} items={Math.min(it, 12)}/>;
  }
  if (inner.startsWith('ARRAY:')) {
    const rest = inner.slice('ARRAY:'.length).trim();
    const r = parseInt(rest.match(/rows=(\d+)/)?.[1] || '3');
    const c = parseInt(rest.match(/cols=(\d+)/)?.[1] || '4');
    return <ArrayModel rows={Math.min(r, 12)} cols={Math.min(c, 12)}/>;
  }
  if (inner.startsWith('AREA_MODEL:')) {
    const rest = inner.slice('AREA_MODEL:'.length).trim();
    // New format: collabels=20,3 | rowlabels=4
    const clM = rest.match(/collabels=([^|]+)/);
    const rlM = rest.match(/rowlabels=([^|]+)/);
    const showP = !rest.includes('products=hidden');
    if (clM || rlM) {
      const colLabels = clM ? clM[1].trim().split(',').map(s => s.trim()) : [''];
      const rowLabels = rlM ? rlM[1].trim().split(',').map(s => s.trim()) : [''];
      return <AreaModel colLabels={colLabels} rowLabels={rowLabels} showProducts={showP}/>;
    }
    // Legacy / simple format: rows=R cols=C
    const r = parseInt(rest.match(/rows=(\d+)/)?.[1] || '1');
    const c = parseInt(rest.match(/cols=(\d+)/)?.[1] || '1');
    const colLabels = Array.from({length: Math.min(c,6)}, () => '');
    const rowLabels = Array.from({length: Math.min(r,6)}, () => '');
    return <AreaModel colLabels={colLabels} rowLabels={rowLabels} showProducts={false}/>;
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
  if (inner.startsWith('NUM_BOND:')) {
    const rest = inner.slice('NUM_BOND:'.length).trim();
    const w = parseInt(rest.match(/whole=(\d+)/)?.[1] || '10');
    const p1 = parseInt(rest.match(/part1=(\d+)/)?.[1] || '4');
    const p2 = parseInt(rest.match(/part2=(\d+)/)?.[1] || '6');
    const showP = !rest.includes('parts=hidden');
    return <NumberBond whole={w} part1={p1} part2={p2} showParts={showP}/>;
  }
  if (inner.startsWith('TENS_FRAME:')) {
    const rest = inner.slice('TENS_FRAME:'.length).trim();
    const filled = parseInt(rest.match(/filled=(\d+)/)?.[1] || '5');
    const total = parseInt(rest.match(/total=(\d+)/)?.[1] || '10');
    return <TensFrame filled={Math.min(filled, total)} total={Math.min(total, 10)}/>;
  }
  if (inner.startsWith('FRAC_CIRCLE:')) {
    const rest = inner.slice('FRAC_CIRCLE:'.length).trim();
    const m = rest.match(/(\d+)\/(\d+)/);
    if (m) return <FractionCircle numerator={parseInt(m[1])} denominator={parseInt(m[2])}/>;
  }
  if (inner.startsWith('FUNC_TABLE:')) {
    const rest = inner.slice('FUNC_TABLE:'.length).trim();
    const ruleM = rest.match(/rule=([^|]+)/);
    const ruleLabel = ruleM ? 'Rule: ' + ruleM[1].trim() : 'Rule: ?';
    const inLabel = rest.match(/in=([^|]+)/)?.[1]?.trim() || 'Input';
    const outLabel = rest.match(/out=([^|]+)/)?.[1]?.trim() || 'Output';
    // pairs like: pairs=1:3,2:6,3:9
    const pairsM = rest.match(/pairs=([^|]+)/);
    const pairs = pairsM
      ? pairsM[1].split(',').map(p => {
          const [i, o] = p.trim().split(':');
          return { in: i ?? '?', out: o ?? '?' };
        })
      : [{in:1,out:'?'},{in:2,out:'?'},{in:3,out:'?'},{in:4,out:'?'}];
    return <FunctionTable ruleLabel={ruleLabel} pairs={pairs} inputLabel={inLabel} outputLabel={outLabel}/>;
  }
  if (inner.startsWith('GRID_RESPONSE:')) {
    const rest = inner.slice('GRID_RESPONSE:'.length).trim();
    const cols = parseInt(rest.match(/cols=(\d+)/)?.[1] || rest.match(/(\d+)/)?.[1] || '4');
    return <GridResponse cols={Math.min(Math.max(cols, 1), 8)}/>;
  }
  if (inner.startsWith('NUM_CHART:')) {
    const rest = inner.slice('NUM_CHART:'.length).trim();
    const start = parseInt(rest.match(/start=(\d+)/)?.[1] || '1');
    const end   = parseInt(rest.match(/end=(\d+)/)?.[1] || '100');
    const cols  = parseInt(rest.match(/cols=(\d+)/)?.[1] || '10');
    // Allow spaces around commas: "shaded=3, 9, 15" or "shaded=3,9,15"
    const shadedM = rest.match(/shaded=([\d,\s]+)/);
    const shaded = shadedM ? shadedM[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
    return <NumberChart start={start} end={end} cols={cols} shaded={shaded}/>;
  }
  if (inner.startsWith('YES_NO_TABLE:')) {
    const rest = inner.slice('YES_NO_TABLE:'.length).trim();
    // Normalise separators: support both | and ; in case AI uses semicolons
    const rows = rest.split(/[|;]/).map(s => s.trim()).filter(Boolean);
    return <YesNoTable rows={rows}/>;
  }
  if (inner.startsWith('DATA_TABLE:')) {
    const rest = inner.slice('DATA_TABLE:'.length).trim();
    const headerM = rest.match(/header=([^|;]+)/);
    const headers = headerM ? headerM[1].split(',').map(s => s.trim()) : [];
    // Remaining pipe-delimited segments are data rows: "Label,value"
    // Support both | and ; as separators
    const segments = rest.split(/[|;]/).map(s => s.trim()).filter(s => !s.startsWith('header='));
    const dataRows = segments.map(seg => seg.split(',').map(s => s.trim()));
    return (
      <div className="my-3 overflow-x-auto">
        <table style={{ borderCollapse: 'collapse', minWidth: '260px' }}>
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{ border: '1.5px solid #d1d5db', padding: '6px 14px',
                    background: '#f3f4f6', fontSize: '13px', fontWeight: 600,
                    textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ border: '1.5px solid #d1d5db', padding: '6px 14px',
                    fontSize: '13px', color: '#1f2937',
                    textAlign: j === 0 ? 'left' : 'center' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (inner.startsWith('IMAGE:')) {
    const url = inner.slice('IMAGE:'.length).trim();
    if (url) return (
      <div className="my-2">
        <img src={url} alt="Visual model" style={{maxWidth:'100%', borderRadius:'6px', display:'block'}}
          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}/>
        <span style={{display:'none'}} className="text-xs text-red-400 italic">Image could not be loaded.</span>
        <div className="no-print mt-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded flex gap-1 items-start">
          <span className="shrink-0">⚠️</span>
          <span><strong>Teacher note:</strong> This visual was copied from the source and may not match this parallel version. Hover → use <strong>✏ Edit</strong> to paste your own image, or <strong>🔬 Recreate</strong> to auto-convert it to an editable vector model.</span>
        </div>
      </div>
    );
    // No URL — empty IMAGE placeholder (AI left a marker for a visual it can't reproduce)
    return (
      <div className="no-print my-2 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg p-4 text-center">
        <p className="text-sm text-amber-700 font-medium">📎 Visual placeholder</p>
        <p className="text-xs text-amber-600 mt-1">The source had a visual here that couldn&apos;t be auto-copied. Hover → <strong>✏ Edit</strong> to paste or upload your own image.</p>
      </div>
    );
  }
  return null;
}

// ─── PDF page renderer ──────────────────────────────────────────────────────
// Lazy-loads PDF.js from CDN, renders every page of the uploaded PDF to a
// JPEG data-URL and returns them as an array.  Returns [] on any failure.
async function renderPdfPages(file) {
  try {
    // Ensure PDF.js script is loaded (idempotent)
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const existing = document.getElementById('__pdfjs__');
        if (existing) { resolve(); return; }
        const s = document.createElement('script');
        s.id = '__pdfjs__';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const images = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.85));
    }
    return images;
  } catch { return []; }
}

// Crop a rectangular region from a base64 image.
// Coordinates (top/left/width/height) are 0-1 fractions of the page dimensions.
// Returns a JPEG data-URL, or null on failure.
function cropImageRegion(pageBase64, { top, left, width, height }) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const sx = Math.round(left * img.naturalWidth);
      const sy = Math.round(top * img.naturalHeight);
      const sw = Math.round(width * img.naturalWidth);
      const sh = Math.round(height * img.naturalHeight);
      if (sw <= 4 || sh <= 4) { resolve(null); return; }
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(null);
    img.src = pageBase64;
  });
}

// Insert a visual marker immediately before the line that starts with qNum.
// If a marker already exists for that question, it is replaced.
function insertMarkerBeforeQuestion(text, qNum, marker) {
  const lines = text.split('\n');
  const out = [];
  const qRe = new RegExp(`^\\(?0*${qNum}[.)\\s]`);
  let inserted = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!inserted && qRe.test(t)) {
      // Remove any existing [IMAGE:] placeholder already on the preceding line
      if (out.length > 0 && out[out.length - 1].trim().startsWith('[IMAGE:')) out.pop();
      out.push(marker);
      inserted = true;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

// ─── Assessment Parser ──────────────────────────────────────────────────────

// Strip markdown formatting that AI models sometimes add despite instructions
function stripMarkdown(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')        // *italic*
    .replace(/^#{1,6}\s+/gm, '')        // ## headers
    .replace(/^[-*]\s+/gm, '');         // bullet points at line start
}

function parseAssessment(text) {
  if (!text || typeof text !== 'string') return { title: '', subtitle: '', questions: [] };

  // Pre-process: strip markdown formatting that some AI outputs contain
  const cleaned = stripMarkdown(text);
  const lines = cleaned.split('\n');
  const questions = [];
  let currentQ = null;
  let lastQNum = 0; // tracks last confirmed question number for sequential-format matching
  let titleLine = '';
  let subtitleLine = '';
  let headerParsed = false;
  // Markers are placed BEFORE the question they belong to in the AI output.
  // We queue them here and attach them to the NEXT question that starts.
  let pendingModels = [];
  // Track whether we're waiting for the question text on the next line
  // (handles "1.\n  Question text" format where number is on its own line)
  let pendingQNum = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // If we saw a bare question number on the previous line, this line is the question text
    if (pendingQNum !== null) {
      // Only treat it as question text if it's not itself a new question number or choice
      const isNewQ = trimmed.match(/^(\d+)[\.\)\:]\s*(.+)/) ||
                     trimmed.match(/^(\d+)\s*[—–]\s*(.+)/) ||
                     trimmed.match(/^Question\s+(\d+)[\.\)\:]?\s+(.+)/i) ||
                     trimmed.match(/^(\d+)\s+([A-Za-z].+)/);
      const isChoice = trimmed.match(/^([A-Ja-j])[\.\)]\s*(.+)/);
      if (!isNewQ && !isChoice) {
        if (currentQ) questions.push(currentQ);
        headerParsed = true;
        currentQ = {
          num: pendingQNum,
          text: trimmed,
          choices: [],
          models: [...pendingModels],
          extra: [],
          standard: '',
          type: 'open'
        };
        lastQNum = pendingQNum;
        pendingModels = [];
        pendingQNum = null;
        continue;
      }
      pendingQNum = null; // wasn't actually a bare question number, abandon
    }

    // Extract title from first non-empty lines
    // Guard matches all question-number formats so they aren't swallowed as title/subtitle.
    if (!headerParsed && !trimmed.match(/^\d+[\.\)\:]/) && !trimmed.match(/^\d+\s*[—–]/) && !trimmed.match(/^\(\d+\)/) && !trimmed.match(/^Q\.?\s*\d+/i) && !trimmed.match(/^Question\s+\d+/i) && !(trimmed.match(/^\d+\s+[A-Za-z]/) && (lastQNum === 0 || parseInt((trimmed.match(/^(\d+)/)||[])[1]) === lastQNum + 1))) {
      if (!titleLine) { titleLine = trimmed; continue; }
      if (!subtitleLine && !trimmed.match(/^(version|TEACHER|ANSWER)/i)) { subtitleLine = trimmed; continue; }
    }

    // Check for visual model markers (type names may contain digits, e.g. BASE10)
    // Always queue into pendingModels — they belong to the NEXT question below them.
    const modelMatch = trimmed.match(/^\[([A-Z][A-Z0-9_]*):.+\]$/);
    if (modelMatch) {
      pendingModels.push(trimmed);
      continue;
    }

    // New question — attach any queued markers, then start fresh.
    // Handles many real-world formats:
    //   "1. text"  "1) text"  "1: text"  "1.text" (no space)
    //   "(1) text"  "Q1. text"  "Q. 1. text"  "Question 1. text"
    //   "1 — text"  "1 – text"  (em/en dash)
    //   "1 text"  (plain space, no separator — checked last to avoid false positives)
    const qMatch =
      trimmed.match(/^(\d+)[\.\)\:]\s*(.+)/) ||
      trimmed.match(/^(\d+)\s*[—–]\s*(.+)/) ||
      trimmed.match(/^\((\d+)\)\s*(.+)/) ||
      trimmed.match(/^Q\.?\s*(\d+)[\.\)\:]?\s*(.+)/i) ||
      trimmed.match(/^Question\s+(\d+)[\.\)\:]?\s+(.+)/i) ||
      // Plain "N text" only when N is the expected next question (avoids "30 students" false positives)
      ((() => { const m = trimmed.match(/^(\d+)\s+([A-Za-z].+)/); return (m && (lastQNum === 0 || parseInt(m[1]) === lastQNum + 1)) ? m : null; })());
    if (qMatch && parseInt(qMatch[1]) > 0 && parseInt(qMatch[1]) < 200) {
      if (currentQ) questions.push(currentQ);
      headerParsed = true;
      const qText = qMatch[2];
      // Also handle inline model on the same line as question number
      const inlineModel = qText.match(/\[([A-Z][A-Z0-9_]*):.+\]/);
      const cleanText = inlineModel ? qText.replace(inlineModel[0], '').trim() : qText;
      currentQ = {
        num: parseInt(qMatch[1]),
        text: cleanText,
        choices: [],
        // Pending markers come first; inline marker (if any) appended after
        models: [...pendingModels, ...(inlineModel ? [inlineModel[0]] : [])],
        extra: [],
        standard: '',
        type: 'open'
      };
      lastQNum = parseInt(qMatch[1]); // track for sequential plain-space matching
      pendingModels = []; // reset — they've been claimed by this question
      continue;
    }

    // Bare question number on its own line (e.g. "1." or "2)" or "Question 3") — question text follows
    const bareQMatch = trimmed.match(/^(\d+)[\.\)\:]?\s*$/) ||
                       trimmed.match(/^Question\s+(\d+)[\.\)\:]?\s*$/i);
    if (bareQMatch && parseInt(bareQMatch[1]) > 0 && parseInt(bareQMatch[1]) < 200) {
      pendingQNum = parseInt(bareQMatch[1]);
      headerParsed = true;
      continue;
    }

    if (!currentQ) continue;

    // Answer choices — various formats, supports A–J so assessments with
    // 5 or more options (E, F …) display correctly alongside A–D.
    // O A) text  or  O A. text  or  A) text  or  (A) text
    const choiceMatch = trimmed.match(/^[Oo○◯]\s*([A-Ja-j])[\.\)]\s*(.+)/) ||
                        trimmed.match(/^([A-Ja-j])[\.\)]\s*(.+)/) ||
                        trimmed.match(/^\(([A-Ja-j])\)\s*(.+)/);
    if (choiceMatch) {
      currentQ.choices.push({ letter: choiceMatch[1].toUpperCase(), text: choiceMatch[2] });
      currentQ.type = 'mc';
      continue;
    }

    // Standard tag — exclude visual model markers like [BASE10:], [NUM_LINE:], etc.
    const stdMatch = trimmed.match(/^\[(.+)\]$/);
    if (stdMatch && !trimmed.match(/^\[[A-Z][A-Z0-9_]*:/)) {
      currentQ.standard = stdMatch[1];
      continue;
    }

    // Extra context lines (not a new question, not a choice)
    if (currentQ && !trimmed.match(/^(TEACHER|ANSWER KEY|Version [AB])/i)) {
      currentQ.extra.push(trimmed);
    }
  }
  if (currentQ) questions.push(currentQ);

  // ── Visual inference pass ──────────────────────────────────────────────────
  // For questions that reliably signal a visual type in their text but had no
  // marker in the source (e.g. plain-text PDFs), auto-add the correct marker.
  const inferredQuestions = questions.map(q => {
    if (q.models && q.models.length > 0) return q; // already has a visual
    const full = ((q.text || '') + ' ' + (q.extra || []).join(' ')).toLowerCase();

    // Gridded response bubble grid
    if (/record.{0,25}(on the grid|your answer on the grid)|fill.{0,15}(the )?bubbles?/.test(full)) {
      return { ...q, models: ['[GRID_RESPONSE: cols=4]'] };
    }
    return q;
  });

  return { title: titleLine, subtitle: subtitleLine, questions: inferredQuestions };
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
        const imgM = m.match(/\[IMAGE:\s*(.+?)\]/);
        if (imgM) {
          block += `<div style="margin:6px 0;"><img src="${escapeHtml(imgM[1].trim())}" alt="Visual model" style="max-width:100%;border-radius:4px;"/></div>`;
          continue;
        }
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

function ModelEditWrapper({ marker, onSave, onRemove, onSaveToBank, onReplace, apiKey, children, invalid }) {
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
  // GROUPS state
  const [groupsCount, setGroupsCount] = useState(parseInt(rawSpecInit.match(/groups=(\d+)/)?.[1] || '3'));
  const [itemsPerGroup, setItemsPerGroup] = useState(parseInt(rawSpecInit.match(/items=(\d+)/)?.[1] || '4'));
  // ARRAY state
  const [arrRows, setArrRows] = useState(parseInt(rawSpecInit.match(/rows=(\d+)/)?.[1] || '3'));
  const [arrCols, setArrCols] = useState(parseInt(rawSpecInit.match(/cols=(\d+)/)?.[1] || '4'));
  // AREA_MODEL state
  const [areaColLabels, setAreaColLabels] = useState(() => {
    const m = rawSpecInit.match(/collabels=([^|]+)/);
    return m ? m[1].trim() : '20, 3';
  });
  const [areaRowLabels, setAreaRowLabels] = useState(() => {
    const m = rawSpecInit.match(/rowlabels=([^|]+)/);
    return m ? m[1].trim() : '4';
  });
  const [areaShowProducts, setAreaShowProducts] = useState(!rawSpecInit.includes('products=hidden'));
  // NUM_LINE jumps
  const [nlJumps, setNlJumps] = useState(rawSpecInit.includes('jumps=yes'));
  // NUMBER BOND state
  const [nbWhole, setNbWhole] = useState(parseInt(rawSpecInit.match(/whole=(\d+)/)?.[1] || '10'));
  const [nbPart1, setNbPart1] = useState(parseInt(rawSpecInit.match(/part1=(\d+)/)?.[1] || '4'));
  const [nbPart2, setNbPart2] = useState(parseInt(rawSpecInit.match(/part2=(\d+)/)?.[1] || '6'));
  const [nbShowParts, setNbShowParts] = useState(!rawSpecInit.includes('parts=hidden'));
  // TENS FRAME state
  const [tfFilled, setTfFilled] = useState(parseInt(rawSpecInit.match(/filled=(\d+)/)?.[1] || '5'));
  const [tfTotal, setTfTotal] = useState(parseInt(rawSpecInit.match(/total=(\d+)/)?.[1] || '10'));
  // FRAC CIRCLE state
  const fcM = rawSpecInit.match(/(\d+)\/(\d+)/);
  const [fcNumer, setFcNumer] = useState(parseInt(fcM?.[1] || '1'));
  const [fcDenom, setFcDenom] = useState(parseInt(fcM?.[2] || '4'));
  // FUNC TABLE state
  const [ftRule, setFtRule] = useState(rawSpecInit.match(/rule=([^|]+)/)?.[1]?.trim() || '');
  const [ftInLabel, setFtInLabel] = useState(rawSpecInit.match(/in=([^|]+)/)?.[1]?.trim() || 'Input');
  const [ftOutLabel, setFtOutLabel] = useState(rawSpecInit.match(/out=([^|]+)/)?.[1]?.trim() || 'Output');
  const [ftPairsRaw, setFtPairsRaw] = useState(() => {
    const pm = rawSpecInit.match(/pairs=([^|]+)/);
    return pm ? pm[1].trim() : '1:?,2:?,3:?,4:?';
  });
  // IMAGE state
  const [imageUrl, setImageUrl] = useState(modelType === 'IMAGE' ? rawSpecInit : '');
  const editorFileRef = useRef(null);
  // Recreate state (for IMAGE markers)
  const [analyzingModel, setAnalyzingModel] = useState(false);
  const [analyzeModelError, setAnalyzeModelError] = useState(null);
  // Bank save state
  const [bankName, setBankName] = useState('');
  const [showBankSave, setShowBankSave] = useState(false);

  if (!modelType) return <>{children}</>;

  const inputCls = 'border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-indigo-400';
  const labelCls = 'text-xs text-gray-500 flex items-center gap-1';

  const computeNewMarker = () => {
    switch (modelType) {
      case 'FRACTION':
        return (isMixed && whole > 0)
          ? `[FRACTION: ${whole} ${numer}/${denom}]`
          : `[FRACTION: ${numer}/${denom}]`;
      case 'BASE10':
        return `[BASE10: hundreds=${hundreds} tens=${tens} ones=${ones}]`;
      case 'NUM_LINE': {
        const jp = nlJumps ? ' jumps=yes' : '';
        const lp = nlLabel ? ` | label=${nlLabel}` : '';
        return `[NUM_LINE: min=${nlMin} max=${nlMax} step=${nlStep}${jp}${lp}]`;
      }
      case 'PV_CHART':
        return `[PV_CHART: ${pvNum}]`;
      case 'BAR_MODEL':
        return `[BAR_MODEL: ${rawSpec}]`;
      case 'TAPE':
        return `[TAPE: ${rawSpec}]`;
      case 'GROUPS':
        return `[GROUPS: groups=${groupsCount} items=${itemsPerGroup}]`;
      case 'ARRAY':
        return `[ARRAY: rows=${arrRows} cols=${arrCols}]`;
      case 'AREA_MODEL': {
        const pp = areaShowProducts ? '' : ' | products=hidden';
        return `[AREA_MODEL: collabels=${areaColLabels} | rowlabels=${areaRowLabels}${pp}]`;
      }
      case 'IMAGE':
        return `[IMAGE: ${imageUrl}]`;
      case 'NUM_BOND':
        return `[NUM_BOND: whole=${nbWhole} part1=${nbPart1} part2=${nbPart2}${!nbShowParts ? ' parts=hidden' : ''}]`;
      case 'TENS_FRAME':
        return `[TENS_FRAME: filled=${Math.min(tfFilled,tfTotal)} total=${tfTotal}]`;
      case 'FRAC_CIRCLE':
        return `[FRAC_CIRCLE: ${fcNumer}/${fcDenom}]`;
      case 'FUNC_TABLE': {
        const rulePart = ftRule ? ` | rule=${ftRule}` : '';
        const inPart = ftInLabel !== 'Input' ? ` | in=${ftInLabel}` : '';
        const outPart = ftOutLabel !== 'Output' ? ` | out=${ftOutLabel}` : '';
        return `[FUNC_TABLE: pairs=${ftPairsRaw}${rulePart}${inPart}${outPart}]`;
      }
      default:
        return `[${modelType}: ${rawSpec}]`;
    }
  };

  const handleSave = () => {
    onSave(marker, computeNewMarker());
    setEditing(false);
  };

  const TYPE_LABELS = {
    FRACTION: 'Fraction', BASE10: 'Base-10 Blocks', NUM_LINE: 'Number Line',
    PV_CHART: 'Place Value Chart', BAR_MODEL: 'Bar Model', TAPE: 'Tape Diagram',
    GROUPS: 'Equal Groups', ARRAY: 'Array', AREA_MODEL: 'Area Model', IMAGE: 'Image',
    NUM_BOND: 'Number Bond', TENS_FRAME: 'Tens Frame', FRAC_CIRCLE: 'Fraction Circle',
    FUNC_TABLE: 'Function Table',
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
          <label className={`${labelCls} cursor-pointer select-none`}><input type="checkbox" checked={nlJumps} onChange={e => setNlJumps(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/> Show jumps</label>
          <label className={labelCls}>Label <input type="text" value={nlLabel} onChange={e => setNlLabel(e.target.value)} className={`${inputCls} w-28 text-left`}/></label>
        </div>
      );
      case 'GROUPS': return (
        <div className="flex items-center gap-4 flex-wrap">
          <label className={labelCls}>Groups <input type="number" min="1" max="12" value={groupsCount} onChange={e => setGroupsCount(Math.max(1,Math.min(12,parseInt(e.target.value)||1)))} className={`${inputCls} w-14`}/></label>
          <label className={labelCls}>Items per group <input type="number" min="1" max="12" value={itemsPerGroup} onChange={e => setItemsPerGroup(Math.max(1,Math.min(12,parseInt(e.target.value)||1)))} className={`${inputCls} w-14`}/></label>
        </div>
      );
      case 'ARRAY': return (
        <div className="space-y-1">
          <p className="text-xs text-gray-400">Array = individual dots in a grid. Every row has the same number; every column has the same number.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <label className={labelCls}>Rows <input type="number" min="1" max="12" value={arrRows} onChange={e => setArrRows(Math.max(1,Math.min(12,parseInt(e.target.value)||1)))} className={`${inputCls} w-14`}/></label>
            <label className={labelCls}>Columns <input type="number" min="1" max="12" value={arrCols} onChange={e => setArrCols(Math.max(1,Math.min(12,parseInt(e.target.value)||1)))} className={`${inputCls} w-14`}/></label>
          </div>
        </div>
      );
      case 'AREA_MODEL': return (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Filled rectangle for area/partial products (box method). Enter dimension labels as comma-separated values — e.g. col labels <strong>20, 3</strong> × row labels <strong>4</strong> → shows 80 | 12 inside.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className={`${labelCls} block`}>Column dimensions (top)
              <input type="text" value={areaColLabels} onChange={e => setAreaColLabels(e.target.value)}
                className="mt-0.5 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 w-40 text-left"
                placeholder="e.g. 20, 3"/>
            </label>
            <label className={`${labelCls} block`}>Row dimensions (left)
              <input type="text" value={areaRowLabels} onChange={e => setAreaRowLabels(e.target.value)}
                className="mt-0.5 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 w-28 text-left"
                placeholder="e.g. 4"/>
            </label>
            <label className={`${labelCls} cursor-pointer select-none`}>
              <input type="checkbox" checked={areaShowProducts} onChange={e => setAreaShowProducts(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/>
              Show partial products
            </label>
          </div>
        </div>
      );
      case 'NUM_BOND': return (
        <div className="flex items-center gap-4 flex-wrap">
          <label className={labelCls}>Whole <input type="number" min="0" value={nbWhole} onChange={e => setNbWhole(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-16`}/></label>
          <label className={labelCls}>Part 1 <input type="number" min="0" value={nbPart1} onChange={e => setNbPart1(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-16`}/></label>
          <label className={labelCls}>Part 2 <input type="number" min="0" value={nbPart2} onChange={e => setNbPart2(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-16`}/></label>
          <label className={`${labelCls} cursor-pointer select-none`}><input type="checkbox" checked={!nbShowParts} onChange={e => setNbShowParts(!e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/> Hide parts (show ?)</label>
        </div>
      );
      case 'TENS_FRAME': return (
        <div className="flex items-center gap-4 flex-wrap">
          <label className={labelCls}>Frame size
            <select value={tfTotal} onChange={e => setTfTotal(parseInt(e.target.value))} className={`${inputCls} w-20`}>
              <option value={5}>5 (one row)</option>
              <option value={10}>10 (two rows)</option>
            </select>
          </label>
          <label className={labelCls}>Filled <input type="number" min="0" max={tfTotal} value={tfFilled} onChange={e => setTfFilled(Math.max(0,Math.min(tfTotal,parseInt(e.target.value)||0)))} className={`${inputCls} w-14`}/></label>
        </div>
      );
      case 'FRAC_CIRCLE': return (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" min="0" value={fcNumer} onChange={e => setFcNumer(Math.max(0,parseInt(e.target.value)||0))} className={`${inputCls} w-14`} placeholder="num"/>
          <span className="text-gray-500 text-sm font-bold">⁄</span>
          <input type="number" min="1" value={fcDenom} onChange={e => setFcDenom(Math.max(1,parseInt(e.target.value)||1))} className={`${inputCls} w-14`} placeholder="den"/>
        </div>
      );
      case 'FUNC_TABLE': return (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <label className={labelCls}>Rule <input type="text" value={ftRule} onChange={e => setFtRule(e.target.value)} className={`${inputCls} w-28 text-left`} placeholder="e.g. ×3"/></label>
            <label className={labelCls}>In label <input type="text" value={ftInLabel} onChange={e => setFtInLabel(e.target.value)} className={`${inputCls} w-20 text-left`}/></label>
            <label className={labelCls}>Out label <input type="text" value={ftOutLabel} onChange={e => setFtOutLabel(e.target.value)} className={`${inputCls} w-20 text-left`}/></label>
          </div>
          <label className={`${labelCls} block`}>Pairs (input:output, comma-separated, use ? for blanks)
            <input type="text" value={ftPairsRaw} onChange={e => setFtPairsRaw(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
              placeholder="e.g. 1:3,2:6,3:?,4:?"/>
          </label>
        </div>
      );
      case 'IMAGE': return (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">📋 Paste or upload your own image:</p>
            <div
              tabIndex={0}
              onPaste={handleEditorPaste}
              onClick={() => editorFileRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 rounded-lg p-3 text-center text-xs text-gray-400 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition focus:outline-none focus:border-indigo-400 select-none">
              Click here → then <strong>Ctrl+V</strong> / <strong>⌘V</strong> to paste a screenshot or snipped image
              <span className="block mt-0.5 text-indigo-400">or click to choose a file from your computer</span>
            </div>
            <input ref={editorFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files[0]) handleEditorFile(e.target.files[0]); e.target.value=''; }}/>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Or paste an image URL:</p>
            <input type="url" value={typeof imageUrl === 'string' && !imageUrl.startsWith('data:') ? imageUrl : ''} onChange={e => setImageUrl(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
              placeholder="https://..."/>
          </div>
          {imageUrl && <img src={imageUrl} alt="" className="max-w-full rounded border border-gray-200" style={{maxHeight:'140px', objectFit:'contain'}}/>}
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

  // Convert file → base64 data URL and set as imageUrl
  const handleEditorFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
  };
  // Handle paste inside the editor paste zone
  const handleEditorPaste = (e) => {
    const file = e.clipboardData?.files?.[0];
    if (file && file.type.startsWith('image/')) { e.preventDefault(); handleEditorFile(file); }
  };

  // Recreate IMAGE as a native vector visual
  const handleRecreate = async () => {
    if (!onReplace || !apiKey) return;
    const imageData = rawSpecInit; // the data URL or URL from [IMAGE: ...]
    setAnalyzingModel(true);
    setAnalyzeModelError(null);
    try {
      const markers = await analyzeVisualImage(imageData, apiKey);
      if (!markers) {
        setAnalyzeModelError('Could not identify visual type. Try a clearer crop.');
      } else {
        onReplace(markers);
      }
    } catch (err) {
      setAnalyzeModelError(err.message || 'Analysis failed.');
    } finally {
      setAnalyzingModel(false);
    }
  };

  return (
    <div className="relative group/model">
      {children}
      {!editing && (
        <div className="absolute top-1 right-1 opacity-0 group-hover/model:opacity-100 flex gap-1 transition-opacity no-print">
          {modelType === 'IMAGE' && onReplace && (
            <button onClick={handleRecreate} disabled={analyzingModel}
              className="bg-emerald-500 text-white hover:bg-emerald-600 rounded px-1.5 py-0.5 text-xs shadow-sm disabled:opacity-60">
              {analyzingModel ? '⏳' : '🔬 Recreate'}
            </button>
          )}
          <button onClick={() => setEditing(true)}
            className="bg-white border border-indigo-200 text-indigo-500 hover:bg-indigo-50 rounded px-1.5 py-0.5 text-xs shadow-sm">
            ✏ Edit
          </button>
        </div>
      )}
      {analyzeModelError && !editing && (
        <p className="text-xs text-amber-600 mt-1 no-print">{analyzeModelError}</p>
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
          {/* Save to Model Bank */}
          {onSaveToBank && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {!showBankSave ? (
                <button onClick={() => setShowBankSave(true)} className="text-xs text-violet-500 hover:text-violet-700 font-medium">
                  🏦 Save to Model Bank
                </button>
              ) : (
                <div className="flex gap-1.5 items-center">
                  <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="Name this model (e.g. 4×6 Array)..."
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-violet-400"
                    onKeyDown={e => { if (e.key === 'Enter' && bankName.trim()) { onSaveToBank(computeNewMarker(), bankName.trim()); setBankName(''); setShowBankSave(false); }}}
                    autoFocus/>
                  <button
                    onClick={() => { if (bankName.trim()) { onSaveToBank(computeNewMarker(), bankName.trim()); setBankName(''); setShowBankSave(false); }}}
                    disabled={!bankName.trim()}
                    className="bg-violet-600 text-white text-xs px-3 py-1 rounded-lg disabled:opacity-40 hover:bg-violet-700 transition font-semibold">
                    Save
                  </button>
                  <button onClick={() => { setShowBankSave(false); setBankName(''); }} className="text-gray-400 text-xs px-1 hover:text-gray-600">✕</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddImageButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="text-xs text-indigo-400 hover:text-indigo-600 border border-dashed border-indigo-200 rounded-lg px-3 py-1.5 mt-2 no-print w-full text-center hover:bg-indigo-50 transition">
      + Add image to this question
    </button>
  );
  return (
    <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg no-print space-y-2">
      <p className="text-xs text-indigo-700 font-medium">Paste image URL</p>
      <p className="text-xs text-gray-500">Right-click any image online → "Copy image address", then paste here.</p>
      <div className="flex gap-1">
        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"/>
        <button onClick={() => { if (url.trim()) { onAdd(url.trim()); setUrl(''); setOpen(false); }}}
          disabled={!url.trim()}
          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg disabled:opacity-40 hover:bg-indigo-700 transition">Add</button>
        <button onClick={() => { setOpen(false); setUrl(''); }}
          className="text-gray-400 text-xs px-2 hover:text-gray-600">✕</button>
      </div>
      {url && <img src={url} alt="" className="max-w-full rounded border border-gray-200 mt-1" style={{maxHeight:'100px', objectFit:'contain'}} onError={e => e.target.style.display='none'}/>}
    </div>
  );
}

// ─── Model Bank Panel ────────────────────────────────────────────────────────

function ModelBankPanel({ bank, onInsert, onDelete, onClose }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const TYPE_FILTERS = ['ALL','ARRAY','AREA_MODEL','GROUPS','NUM_LINE','FRACTION','FRAC_CIRCLE','BASE10','PV_CHART','BAR_MODEL','TAPE','NUM_BOND','TENS_FRAME','FUNC_TABLE','IMAGE'];
  const TYPE_FILTER_LABELS = {
    ALL: 'All', ARRAY: 'Arrays', AREA_MODEL: 'Area Models', GROUPS: 'Groups', NUM_LINE: 'Number Lines',
    FRACTION: 'Fraction Bars', FRAC_CIRCLE: 'Fraction Circles', BASE10: 'Base-10', PV_CHART: 'Place Value',
    BAR_MODEL: 'Bar Models', TAPE: 'Tape', NUM_BOND: 'Number Bonds',
    TENS_FRAME: 'Tens Frames', FUNC_TABLE: 'Function Tables', IMAGE: 'Images',
  };

  const filtered = bank.filter(item => {
    const matchesFilter = filter === 'ALL' || item.type === filter;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏦</span>
            <h2 className="text-lg font-bold text-gray-800">Model Bank</h2>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{bank.length} saved</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
        </div>

        {/* Search + filter tabs */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
          <div className="flex gap-1.5 flex-wrap">
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${filter === t ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'}`}>
                {TYPE_FILTER_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-medium text-gray-500">{bank.length === 0 ? 'Your model bank is empty' : 'No models match your filter'}</p>
              <p className="text-sm mt-1">
                {bank.length === 0
                  ? 'Hover any model in the preview → click ✏ Edit → "Save to Model Bank"'
                  : 'Try a different filter or search term.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-3 hover:border-violet-300 hover:bg-violet-50 transition">
                  {/* Preview (scaled down) */}
                  <div className="flex justify-center items-center min-h-[80px] overflow-hidden">
                    <div style={{transform:'scale(0.65)', transformOrigin:'center', maxWidth:'140%', pointerEvents:'none'}}>
                      {parseVisualModel(item.marker) || <span className="text-xs text-gray-300 italic">No preview</span>}
                    </div>
                  </div>
                  {/* Name + type badge */}
                  <p className="text-xs font-semibold text-gray-700 mt-2 text-center truncate" title={item.name}>{item.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <p className="text-xs text-violet-400 font-medium">{item.type}</p>
                    {item.autoSaved && <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 rounded font-medium">auto</span>}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 mt-2.5">
                    <button onClick={() => onInsert(item.marker)}
                      className="flex-1 bg-violet-600 text-white text-xs py-1.5 rounded-lg hover:bg-violet-700 transition font-semibold">
                      Insert
                    </button>
                    <button onClick={() => onDelete(item.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 rounded-lg hover:bg-red-50 transition" title="Remove from bank">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Resources panel */}
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">📎 Free visual resources — right-click any image → Copy image address → paste into an IMAGE model</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '📐 Math Salamanders', href: 'https://www.math-salamanders.com/place-value-charts.html', note: 'Place value charts, number lines' },
              { label: '🔟 Class Playground', href: 'https://classplayground.com/ten-frame/', note: 'Tens frames, place value' },
              { label: '📊 Mashup Math', href: 'https://www.mashupmath.com/virtual-math-manipulatives-free-library-for-grades-k-8', note: 'Arrays, base-10, fractions' },
            ].map(r => (
              <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer"
                className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 hover:border-violet-300 hover:bg-violet-50 transition text-center">
                <p className="text-xs font-semibold text-violet-700">{r.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.note}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
          To save a model: hover it in the preview → ✏ Edit → Save to Model Bank
        </div>
      </div>
    </div>
  );
}

function AssessmentPreview({ text, subject, gradeLevel, onModelEdit, onAddImage, onBrowseBank, onSaveToBank, customTitle, apiKey }) {
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
            <div key={idx} className={`question-card bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden border-l-4 ${accent} mt-6`}>
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
                      <div className="mt-2 space-y-1.5">
                        {q.extra.map((line, i) => (
                          <p key={i} className="text-gray-800 text-base leading-relaxed">{line}</p>
                        ))}
                      </div>
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
                            onRemove={() => onModelEdit(m, '')}
                            onSaveToBank={onSaveToBank}
                            apiKey={apiKey}
                            onReplace={(newMarkers) => {
                              // Replace this one IMAGE marker with one or more new markers
                              newMarkers.forEach((nm, ni) => onModelEdit(ni === 0 ? m : '', nm));
                              // Auto-save each to the bank
                              newMarkers.forEach(nm => onSaveToBank?.(nm, autoNameMarker(
                                nm.replace(/^\[|\]$/g,'').split(':')[0],
                                nm.replace(/^\[[A-Z_]+:/,'').replace(/\]$/,'')
                              )));
                            }}>
                            {rendered ? <div>{rendered}</div> : null}
                          </ModelEditWrapper>
                        );
                      }
                      // In print/read-only mode: skip invalid models entirely
                      return rendered ? <div key={mi}>{rendered}</div> : null;
                    })}
                  </div>
                )}

                {/* Add Image + Browse Bank buttons (edit mode only) */}
                {onAddImage && (
                  <div className="ml-11 mb-1">
                    <AddImageButton onAdd={(url) => onAddImage(q.num, url)}/>
                  </div>
                )}
                {onBrowseBank && (
                  <div className="ml-11 mb-3 no-print">
                    <button onClick={() => onBrowseBank(q.num)}
                      className="text-xs text-violet-500 hover:text-violet-700 border border-dashed border-violet-200 rounded-lg px-3 py-1.5 w-full text-center hover:bg-violet-50 transition">
                      🔍 Search for resource in the bank of models and visuals
                    </button>
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
        {questions.length === 0 && text && text.trim().length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 bg-amber-50 p-6">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="text-gray-700 font-semibold mb-1">Questions couldn't be parsed from this output.</p>
              <p className="text-sm text-gray-500">The AI generated a response, but the question numbering format wasn't recognized. Switch to <strong>✏️ Raw Edit</strong> view to fix the formatting manually, or copy the raw text below and share it so we can improve the parser.</p>
            </div>
            <div className="flex justify-end mb-2">
              <button onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
                className="text-xs border border-amber-300 text-amber-700 bg-white rounded-lg px-3 py-1.5 hover:bg-amber-50 transition font-medium">
                📋 Copy raw output
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-left max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{text}</pre>
            </div>
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
  const lines = (text || '').split('\n').filter(l => l.trim());
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

// ─── Auto-name a marker for the Model Bank ──────────────────────────────────

function autoNameMarker(type, spec) {
  switch (type) {
    case 'ARRAY': {
      const r = spec.match(/rows=(\d+)/)?.[1];
      const c = spec.match(/cols=(\d+)/)?.[1];
      return r && c ? `Array ${r}×${c}` : 'Array';
    }
    case 'AREA_MODEL': {
      const cl = spec.match(/collabels=([^|]+)/)?.[1]?.trim();
      const rl = spec.match(/rowlabels=([^|]+)/)?.[1]?.trim();
      return cl && rl ? `Area Model ${rl}×(${cl})` : 'Area Model';
    }
    case 'GROUPS': {
      const g  = spec.match(/groups=(\d+)/)?.[1];
      const it = spec.match(/items=(\d+)/)?.[1];
      return g && it ? `${g} Groups of ${it}` : 'Equal Groups';
    }
    case 'NUM_LINE': {
      const mn   = spec.match(/min=(-?\d+)/)?.[1];
      const mx   = spec.match(/max=(\d+)/)?.[1];
      const st   = spec.match(/step=(\d+)/)?.[1];
      const jump = spec.includes('jumps=yes') ? ' +jumps' : '';
      return mn !== undefined && mx
        ? `Number Line ${mn}–${mx}${st && st !== '1' ? ` by ${st}` : ''}${jump}`
        : 'Number Line';
    }
    case 'FRACTION':     return `Fraction Bar ${spec.trim()}`;
    case 'FRAC_CIRCLE':  return `Fraction Circle ${spec.trim()}`;
    case 'BASE10': {
      const h = spec.match(/hundreds=(\d+)/)?.[1] || '0';
      const t = spec.match(/tens=(\d+)/)?.[1]     || '0';
      const o = spec.match(/ones=(\d+)/)?.[1]     || '0';
      return `Base-10 ${h}h ${t}t ${o}o`;
    }
    case 'PV_CHART': {
      const n = spec.match(/(\d+)/)?.[1];
      return n ? `Place Value ${n}` : 'Place Value Chart';
    }
    case 'BAR_MODEL':    return `Bar Model (${spec.split('|')[0].trim()})`;
    case 'TAPE':         return `Tape Diagram (${spec.split('|')[0].trim()})`;
    case 'NUM_BOND': {
      const w  = spec.match(/whole=(\d+)/)?.[1];
      const p1 = spec.match(/part1=(\d+)/)?.[1];
      const p2 = spec.match(/part2=(\d+)/)?.[1];
      return w ? `Number Bond ${w} (${p1}+${p2})` : 'Number Bond';
    }
    case 'TENS_FRAME': {
      const f = spec.match(/filled=(\d+)/)?.[1];
      const t = spec.match(/total=(\d+)/)?.[1];
      return f && t ? `Tens Frame ${f}/${t}` : 'Tens Frame';
    }
    case 'FUNC_TABLE': {
      const r = spec.match(/rule=([^|]+)/)?.[1]?.trim();
      return r ? `Function Table (${r})` : 'Function Table';
    }
    case 'GRID_RESPONSE': {
      const c = spec.match(/cols=(\d+)/)?.[1];
      return c ? `Answer Grid (${c} digits)` : 'Answer Grid';
    }
    case 'NUM_CHART': {
      const s  = spec.match(/start=(\d+)/)?.[1];
      const e  = spec.match(/end=(\d+)/)?.[1];
      const sh = spec.match(/shaded=([\d,]+)/)?.[1];
      const shCount = sh ? sh.split(',').length : 0;
      return s && e ? `Number Chart ${s}–${e}${shCount ? ` (${shCount} shaded)` : ''}` : 'Number Chart';
    }
    case 'DATA_TABLE': {
      const h = spec.match(/header=([^|]+)/)?.[1]?.trim();
      return h ? `Data Table (${h})` : 'Data Table';
    }
    case 'YES_NO_TABLE': {
      const rows = spec.split('|').length;
      return `Yes/No Table (${rows} rows)`;
    }
    case 'IMAGE': {
      // For external URLs give a short name; skip data: URLs (handled separately)
      if (!spec.trim().startsWith('data:')) return `Image (${spec.trim().slice(0, 40)}...)`;
      return 'Pasted Image';
    }
    default: return type.replace(/_/g, ' ');
  }
}

// ─── Main App ───────────────────────────────────────────────────────────────

// ─── Pre-built visual library for Build Your Own mode ────────────────────────
const VISUAL_LIBRARY = [
  { category: 'Number Lines', items: [
    { name: '0–10', marker: '[NUM_LINE: min=0 max=10 step=1]' },
    { name: '0–20 by 2s', marker: '[NUM_LINE: min=0 max=20 step=2]' },
    { name: '0–20 hops', marker: '[NUM_LINE: min=0 max=20 step=5 jumps=yes]' },
    { name: '0–30 by 5s', marker: '[NUM_LINE: min=0 max=30 step=5]' },
    { name: '0–50 by 10s', marker: '[NUM_LINE: min=0 max=50 step=10]' },
    { name: '0–100 by 10s', marker: '[NUM_LINE: min=0 max=100 step=10]' },
    { name: '0–12 hops (×3)', marker: '[NUM_LINE: min=0 max=12 step=3 jumps=yes]' },
  ]},
  { category: 'Frames & Number Bonds', items: [
    { name: 'Five Frame (3/5)', marker: '[TENS_FRAME: filled=3 total=5]' },
    { name: 'Five Frame (4/5)', marker: '[TENS_FRAME: filled=4 total=5]' },
    { name: 'Tens Frame (6)', marker: '[TENS_FRAME: filled=6 total=10]' },
    { name: 'Tens Frame (7)', marker: '[TENS_FRAME: filled=7 total=10]' },
    { name: 'Tens Frame (8)', marker: '[TENS_FRAME: filled=8 total=10]' },
    { name: 'Tens Frame (9)', marker: '[TENS_FRAME: filled=9 total=10]' },
    { name: 'Number Bond (whole=10)', marker: '[NUM_BOND: whole=10 part1=4 part2=6]' },
    { name: 'Number Bond (missing parts)', marker: '[NUM_BOND: whole=10 part1=4 part2=6 parts=hidden]' },
    { name: 'Number Bond (whole=15)', marker: '[NUM_BOND: whole=15 part1=8 part2=7]' },
    { name: 'Number Bond (whole=20)', marker: '[NUM_BOND: whole=20 part1=12 part2=8]' },
  ]},
  { category: 'Place Value', items: [
    { name: 'Base-10 Blocks (12)', marker: '[BASE10: hundreds=0 tens=1 ones=2]' },
    { name: 'Base-10 Blocks (134)', marker: '[BASE10: hundreds=1 tens=3 ones=4]' },
    { name: 'Base-10 Blocks (245)', marker: '[BASE10: hundreds=2 tens=4 ones=5]' },
    { name: 'Base-10 Blocks (321)', marker: '[BASE10: hundreds=3 tens=2 ones=1]' },
    { name: 'PV Chart (342)', marker: '[PV_CHART: 342]' },
    { name: 'PV Chart (1,234)', marker: '[PV_CHART: 1234]' },
    { name: 'PV Chart (4,506)', marker: '[PV_CHART: 4506]' },
  ]},
  { category: 'Arrays & Equal Groups', items: [
    { name: 'Array 2×4', marker: '[ARRAY: rows=2 cols=4]' },
    { name: 'Array 3×3', marker: '[ARRAY: rows=3 cols=3]' },
    { name: 'Array 3×4', marker: '[ARRAY: rows=3 cols=4]' },
    { name: 'Array 3×6', marker: '[ARRAY: rows=3 cols=6]' },
    { name: 'Array 4×5', marker: '[ARRAY: rows=4 cols=5]' },
    { name: 'Array 4×7', marker: '[ARRAY: rows=4 cols=7]' },
    { name: 'Array 5×6', marker: '[ARRAY: rows=5 cols=6]' },
    { name: '3 groups of 4', marker: '[GROUPS: groups=3 items=4]' },
    { name: '4 groups of 5', marker: '[GROUPS: groups=4 items=5]' },
    { name: '5 groups of 3', marker: '[GROUPS: groups=5 items=3]' },
    { name: '6 groups of 2', marker: '[GROUPS: groups=6 items=2]' },
  ]},
  { category: 'Area & Bar Models', items: [
    { name: 'Area Model 4×23', marker: '[AREA_MODEL: collabels=20,3 | rowlabels=4]' },
    { name: 'Area Model 3×24', marker: '[AREA_MODEL: collabels=20,4 | rowlabels=3]' },
    { name: 'Area Model 6×15', marker: '[AREA_MODEL: collabels=10,5 | rowlabels=6]' },
    { name: 'Area Model 7×12', marker: '[AREA_MODEL: collabels=10,2 | rowlabels=7]' },
    { name: 'Bar Model (4+6)', marker: '[BAR_MODEL: 4,6 | label=Total]' },
    { name: 'Bar Model (3+5+2)', marker: '[BAR_MODEL: 3,5,2 | label=Total is 10]' },
    { name: 'Tape Diagram (4+6)', marker: '[TAPE: 4:Part A,6:Part B | brace=yes | total=10]' },
    { name: 'Tape Diagram (3 parts)', marker: '[TAPE: 3:A,4:B,5:C | brace=yes | total=12]' },
  ]},
  { category: 'Fractions', items: [
    { name: 'Bar ½', marker: '[FRACTION: 1/2]' },
    { name: 'Bar ⅓', marker: '[FRACTION: 1/3]' },
    { name: 'Bar ¼', marker: '[FRACTION: 1/4]' },
    { name: 'Bar ¾', marker: '[FRACTION: 3/4]' },
    { name: 'Bar ⅔', marker: '[FRACTION: 2/3]' },
    { name: 'Bar ⅜', marker: '[FRACTION: 3/8]' },
    { name: 'Bar ⅝', marker: '[FRACTION: 5/8]' },
    { name: 'Mixed 1⅔', marker: '[FRACTION: 1 2/3]' },
    { name: 'Circle ¼', marker: '[FRAC_CIRCLE: 1/4]' },
    { name: 'Circle ½', marker: '[FRAC_CIRCLE: 1/2]' },
    { name: 'Circle ¾', marker: '[FRAC_CIRCLE: 3/4]' },
    { name: 'Circle ⅖', marker: '[FRAC_CIRCLE: 2/5]' },
    { name: 'Circle ⅓', marker: '[FRAC_CIRCLE: 1/3]' },
  ]},
  { category: 'Function Tables', items: [
    { name: 'Table ×2', marker: '[FUNC_TABLE: pairs=1:2,2:4,3:6,4:? | rule=×2]' },
    { name: 'Table ×3', marker: '[FUNC_TABLE: pairs=1:3,2:6,3:9,4:? | rule=×3]' },
    { name: 'Table ×4', marker: '[FUNC_TABLE: pairs=1:4,2:8,3:12,4:? | rule=×4]' },
    { name: 'Table ×5', marker: '[FUNC_TABLE: pairs=1:5,2:10,3:15,4:? | rule=×5]' },
    { name: 'Table +4', marker: '[FUNC_TABLE: pairs=1:5,2:6,3:7,4:? | rule=+4]' },
    { name: 'Table +6', marker: '[FUNC_TABLE: pairs=2:8,4:10,6:12,8:? | rule=+6]' },
    { name: 'Table ÷3', marker: '[FUNC_TABLE: pairs=3:1,6:2,9:3,12:? | rule=÷3]' },
  ]},
];

// ─── BuilderQuestionCard: single editable question card for Manual Builder ───
function BuilderQuestionCard({ q, num, isEditing, onToggleEdit, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, modelBank, apiKey, onSaveMarkerToBank }) {
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  const [editingModelIdx, setEditingModelIdx] = useState(null);
  const [editMarkerText, setEditMarkerText] = useState('');
  const [analyzingIdx, setAnalyzingIdx] = useState(null); // index of IMAGE marker being analyzed
  const [analyzeError, setAnalyzeError] = useState(null);
  const imageInputRef = useRef(null);
  const pasteZoneRef = useRef(null);
  const letters = 'ABCDEFGHIJ';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const QTYPE_LABELS = { mc:'Multiple Choice', multi_answer:'Multiple Answer', short:'Short Answer', fill_blank:'Fill in the Blank', true_false:'True / False', open:'Open Response' };
  const QTYPE_COLORS = { mc:'bg-indigo-100 text-indigo-700', multi_answer:'bg-purple-100 text-purple-700', short:'bg-emerald-100 text-emerald-700', fill_blank:'bg-amber-100 text-amber-700', true_false:'bg-blue-100 text-blue-700', open:'bg-gray-100 text-gray-600' };

  // Auto-focus paste zone when insert panel opens
  useEffect(() => {
    if (showInsertPanel && pasteZoneRef.current) {
      setTimeout(() => pasteZoneRef.current?.focus(), 50);
    }
  }, [showInsertPanel]);

  const addChoice = () => onUpdate({ choices: [...q.choices, { id: uid(), text: '', correct: false }] });
  const removeChoice = (id) => { if (q.choices.length > 2) onUpdate({ choices: q.choices.filter(c => c.id !== id) }); };
  const updateChoice = (id, text) => onUpdate({ choices: q.choices.map(c => c.id === id ? { ...c, text } : c) });
  const toggleCorrect = (id) => {
    if (q.type === 'mc' || q.type === 'true_false') {
      onUpdate({ choices: q.choices.map(c => ({ ...c, correct: c.id === id })) });
    } else {
      onUpdate({ choices: q.choices.map(c => c.id === id ? { ...c, correct: !c.correct } : c) });
    }
  };

  // Convert an image File/Blob to a base64 [IMAGE: ...] marker and attach it
  const handleImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      onUpdate({ models: [...(q.models||[]), `[IMAGE: ${url}]`] });
      setShowInsertPanel(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdate({ models: [...(q.models||[]), `[IMAGE: ${e.target.result}]`] });
      setShowInsertPanel(false);
    };
    reader.readAsDataURL(file);
  };

  // Paste handler for the dedicated paste zone (gets proper focus)
  const handlePasteInZone = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        handleImageFile(item.getAsFile());
        e.preventDefault();
        return;
      }
    }
  };

  // Add a visual marker from library or bank
  const addVisualMarker = (marker) => {
    onUpdate({ models: [...(q.models||[]), marker] });
    onSaveMarkerToBank?.(marker);
    setShowInsertPanel(false);
  };

  // Apply edit to a model marker
  const applyModelEdit = (idx) => {
    const updated = (q.models||[]).map((m, i) => i === idx ? editMarkerText.trim() : m);
    onUpdate({ models: updated });
    setEditingModelIdx(null);
  };

  // Send an IMAGE marker to Claude vision to recreate it as a native vector model
  const recreateVisual = async (mi) => {
    const m = (q.models||[])[mi];
    if (!m || !m.startsWith('[IMAGE:')) return;
    const imageData = m.slice('[IMAGE:'.length, -1).trim();
    if (!apiKey) { setAnalyzeError('Add your Anthropic API key in Settings first.'); return; }
    setAnalyzingIdx(mi);
    setAnalyzeError(null);
    try {
      const markers = await analyzeVisualImage(imageData, apiKey);
      if (!markers) {
        setAnalyzeError('Could not identify a known visual type. The image stays as-is.');
      } else {
        // Replace the IMAGE marker at position mi with the new marker(s)
        const current = [...(q.models||[])];
        current.splice(mi, 1, ...markers);
        onUpdate({ models: current });
        // Auto-save each recreated marker to the bank
        markers.forEach(mk => onSaveMarkerToBank?.(mk));
      }
    } catch (err) {
      setAnalyzeError(err.message || 'Analysis failed.');
    } finally {
      setAnalyzingIdx(null);
    }
  };

  // Separate IMAGE markers from other visual markers for display
  const imageMarkers = (q.models||[]).filter(m => m.startsWith('[IMAGE:'));
  const visualMarkers = (q.models||[]).filter(m => !m.startsWith('[IMAGE:'));
  const imageCount = imageMarkers.length;

  return (
    <div className={'bg-white rounded-2xl shadow-sm border transition ' + (isEditing ? 'border-indigo-300 shadow-md' : 'border-gray-100 hover:border-gray-200')}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={onToggleEdit}>
        <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{num}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">
            {q.text || <span className="text-gray-400 italic">Click to edit...</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (QTYPE_COLORS[q.type] || 'bg-gray-100 text-gray-600')}>{QTYPE_LABELS[q.type]}</span>
            {visualMarkers.length > 0 && <span className="text-xs text-indigo-500">📊 {visualMarkers.length} visual</span>}
            {imageCount > 0 && <span className="text-xs text-rose-500">🖼 {imageCount} image{imageCount>1?'s':''}</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▲</button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▼</button>
          <button onClick={onDelete} className="p-1.5 text-red-300 hover:text-red-500 text-xs ml-1">✕</button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-gray-100 px-4 pb-5 pt-3 space-y-3" onPaste={handlePaste}>
          {/* Hidden file input */}
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,application/pdf"
            onChange={e => { handleImageFile(e.target.files[0]); e.target.value = ''; }} className="hidden" />

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Question Type</label>
            <select value={q.type} onChange={e => {
              const t = e.target.value;
              const nc = (t === 'mc' || t === 'multi_answer') ? (q.choices.length >= 2 ? q.choices.map(c=>({...c})) : ['','','',''].map(()=>({id:uid(),text:'',correct:false})))
                       : t === 'true_false' ? [{id:uid(),text:'True',correct:false},{id:uid(),text:'False',correct:false}]
                       : [];
              onUpdate({ type: t, choices: nc });
            }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="mc">Multiple Choice — one correct answer</option>
              <option value="multi_answer">Multiple Answer — select all that apply</option>
              <option value="short">Short Answer</option>
              <option value="fill_blank">Fill in the Blank — use ___ for each blank</option>
              <option value="true_false">True / False</option>
              <option value="open">Open Response</option>
            </select>
          </div>

          {/* ── Images & Visuals — above question text so you see the visual while writing ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Images &amp; Visuals</label>
              <div className="flex items-center gap-1">
                <button onClick={() => imageInputRef.current?.click()}
                  className="text-xs border border-gray-200 text-gray-500 rounded-md px-2 py-0.5 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition">
                  📁 Upload
                </button>
                <button
                  onClick={() => setShowInsertPanel(v => !v)}
                  className={'text-xs border rounded-md px-2 py-0.5 transition font-medium ' + (showInsertPanel ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50')}>
                  + Insert Visual
                </button>
              </div>
            </div>

            {/* ── Insert Visual panel ── */}
            {showInsertPanel && (
              <div className="mb-2 border border-indigo-200 bg-indigo-50 rounded-xl p-3 space-y-3">
                {/* Paste zone — auto-focused so Ctrl+V works immediately */}
                <div>
                  <p className="text-[11px] font-semibold text-indigo-700 mb-1">📋 Paste an image</p>
                  <div
                    ref={pasteZoneRef}
                    tabIndex={0}
                    onPaste={handlePasteInZone}
                    className="w-full border-2 border-dashed border-indigo-300 rounded-lg px-3 py-4 text-xs text-indigo-500 text-center cursor-text select-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white focus:border-indigo-400 hover:bg-white transition"
                    style={{minHeight: 44}}
                  >
                    Click here → then press <strong>Ctrl+V</strong> / <strong>⌘V</strong> to paste a screenshot or copied image
                  </div>
                </div>

                {/* Visual Library */}
                <div>
                  <p className="text-[11px] font-semibold text-indigo-700 mb-1.5">📊 Visual Library</p>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {VISUAL_LIBRARY.map(cat => (
                      <div key={cat.category}>
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">{cat.category}</div>
                        <div className="flex flex-wrap gap-1">
                          {cat.items.map(item => (
                            <button key={item.marker} onClick={() => addVisualMarker(item.marker)}
                              className="text-[11px] bg-white border border-indigo-200 text-indigo-700 rounded-md px-2 py-0.5 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition">
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* AI Model Bank items if any */}
                    {modelBank.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1">From AI Model Bank</div>
                        <div className="flex flex-wrap gap-1">
                          {modelBank.map(item => (
                            <button key={item.id} onClick={() => addVisualMarker(item.marker)}
                              className="text-[11px] bg-white border border-violet-200 text-violet-700 rounded-md px-2 py-0.5 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition">
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rendered previews of all attached images + visual models */}
            {(q.models||[]).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 overflow-hidden">
                {(q.models||[]).map((m, mi) => {
                  const rendered = parseVisualModel(m);
                  const isEditingThis = editingModelIdx === mi;
                  return (
                    <div key={mi} className="relative group">
                      {isEditingThis ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editMarkerText}
                            onChange={e => setEditMarkerText(e.target.value)}
                            rows={2}
                            className="w-full border border-indigo-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => applyModelEdit(mi)}
                              className="text-xs bg-indigo-600 text-white rounded-md px-3 py-1 hover:bg-indigo-700 transition font-medium">Apply</button>
                            <button onClick={() => setEditingModelIdx(null)}
                              className="text-xs border border-gray-200 text-gray-500 rounded-md px-3 py-1 hover:bg-gray-50 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {rendered
                            ? <div className="overflow-x-auto">{rendered}</div>
                            : <div className="text-xs text-gray-400 italic font-mono px-1">{m}</div>}
                          {/* Edit + Recreate + Remove buttons — visible on hover */}
                          <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            {m.startsWith('[IMAGE:') && (
                              <button
                                onClick={() => recreateVisual(mi)}
                                disabled={analyzingIdx === mi}
                                className="h-5 px-1.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow hover:bg-emerald-600 disabled:opacity-60 whitespace-nowrap"
                                title="Analyze image and recreate as a scalable vector visual">
                                {analyzingIdx === mi ? '⏳' : '🔬 Recreate'}
                              </button>
                            )}
                            <button
                              onClick={() => { setEditingModelIdx(mi); setEditMarkerText(m); }}
                              className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[9px] shadow hover:bg-indigo-600"
                              title="Edit marker">✎</button>
                            <button
                              onClick={() => onUpdate({ models: (q.models||[]).filter((_,j) => j !== mi) })}
                              className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-red-600"
                              title="Remove">✕</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {analyzeError && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                ⚠️ {analyzeError}
                <button onClick={() => setAnalyzeError(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
              </div>
            )}

            {(q.models||[]).length === 0 && !showInsertPanel && (
              <div className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-center text-xs text-gray-400">
                No image or visual yet — click <strong>+ Insert Visual</strong> above
              </div>
            )}
          </div>

          {/* Question Text — below visuals so you can write referencing what you see above */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Question Text</label>
            <textarea value={q.text} onChange={e => onUpdate({ text: e.target.value })}
              placeholder={q.type === 'fill_blank' ? 'e.g. The product of ___ × ___ = ___.' : 'Type your question here...'}
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          {(q.type === 'mc' || q.type === 'multi_answer' || q.type === 'true_false') && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Choices — <span className="font-normal text-gray-400">{q.type === 'mc' || q.type === 'true_false' ? 'click ○ to mark correct' : 'check all correct'}</span>
              </label>
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <button onClick={() => toggleCorrect(c.id)}
                      className={'w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition ' + (c.correct ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-indigo-400')}>
                      {c.correct && <span className="text-white" style={{fontSize:'9px'}}>✓</span>}
                    </button>
                    <span className="text-xs font-bold text-gray-400 w-5">{letters[ci]})</span>
                    {q.type === 'true_false'
                      ? <span className="flex-1 text-sm text-gray-700">{c.text}</span>
                      : <input value={c.text} onChange={e => updateChoice(c.id, e.target.value)} placeholder={`Option ${letters[ci]}`}
                          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />}
                    {q.type !== 'true_false' && q.choices.length > 2 && (
                      <button onClick={() => removeChoice(c.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {(q.type === 'mc' || q.type === 'multi_answer') && q.choices.length < 8 && (
                <button onClick={addChoice} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">+ Add Option</button>
              )}
            </div>
          )}

          {(q.type === 'short' || q.type === 'fill_blank' || q.type === 'open') && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sample Answer <span className="font-normal text-gray-400">(optional)</span></label>
              <input value={q.answerHint || ''} onChange={e => onUpdate({ answerHint: e.target.value })}
                placeholder="e.g. 4 × 7 = 28"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}

          {/* Standard row */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Standard <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={q.standard || ''} onChange={e => onUpdate({ standard: e.target.value })}
              placeholder="e.g. 3.OA.A.1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

        </div>
      )}
    </div>
  );
}

// ─── ManualBuilder: full manual assessment building mode ──────────────────────
function ManualBuilder({ modelBank, onBack, gradeLevel, setGradeLevel, subject, setSubject }) {
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('Directions: Show your work.');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('build');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);

  const QTYPES = [
    { id: 'mc', icon: '🔘', label: 'Multiple Choice', desc: 'One correct answer' },
    { id: 'multi_answer', icon: '☑️', label: 'Multiple Answer', desc: 'Select all that apply' },
    { id: 'short', icon: '✏️', label: 'Short Answer', desc: 'Brief written response' },
    { id: 'fill_blank', icon: '___', label: 'Fill in the Blank', desc: 'Complete the sentence with ___' },
    { id: 'true_false', icon: '✓✗', label: 'True / False', desc: 'True or False' },
    { id: 'open', icon: '📝', label: 'Open Response', desc: 'Extended written response' },
  ];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const letters = 'ABCDEFGHIJ';

  const addQuestion = (type) => {
    const choices = (type === 'mc' || type === 'multi_answer')
      ? ['','','',''].map(() => ({ id: uid(), text: '', correct: false }))
      : type === 'true_false'
      ? [{ id: uid(), text: 'True', correct: false }, { id: uid(), text: 'False', correct: false }]
      : [];
    const q = { id: uid(), type, text: '', choices, answerHint: '', standard: '', models: [] };
    setQuestions(prev => [...prev, q]);
    setEditingId(q.id);
    setShowTypePicker(false);
  };

  const updateQ = (id, updates) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  const deleteQ = (id) => { setQuestions(prev => prev.filter(q => q.id !== id)); if (editingId === id) setEditingId(null); };
  const moveQ = (id, dir) => setQuestions(prev => {
    const i = prev.findIndex(q => q.id === id);
    if (i < 0) return prev;
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const arr = [...prev]; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr;
  });

  const serializeToText = () => {
    const lines = [title || 'My Assessment'];
    if (subtitle) lines.push(subtitle);
    questions.forEach((q, i) => {
      (q.models || []).forEach(m => lines.push(m));
      lines.push(`${i + 1}. ${q.text || '(Question text)'}`);
      if (q.type === 'mc' || q.type === 'multi_answer' || q.type === 'true_false') {
        q.choices.forEach((c, ci) => lines.push(`${letters[ci]}) ${c.text || '(option)'}`));
      }
      if (q.standard) lines.push(`[${q.standard}]`);
    });
    return lines.join('\n');
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(serializeToText()); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const printPreview = () => {
    const el = previewRef.current;
    if (!el) return;
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title||'Assessment'}</title><script src="https://cdn.tailwindcss.com"><\/script><style>@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@page{margin:0.65in;size:letter}}body{background:white;font-family:ui-sans-serif,system-ui,sans-serif}</style></head><body class="p-8">${el.innerHTML}<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>`);
    pw.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition flex-shrink-0">← Back</button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">✏️</span>
            <span className="font-bold text-gray-800">Build Your Own Assessment</span>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('build')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode==='build' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>✏️ Build</button>
              <button onClick={() => setViewMode('preview')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode==='preview' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>👁 Preview</button>
            </div>
            <button onClick={copyText} className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition min-w-[70px]">{copied ? '✓ Copied!' : 'Copy'}</button>
            <button onClick={printPreview} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">Print / PDF</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {viewMode === 'preview' ? (
          <div ref={previewRef}>
            <AssessmentPreview text={serializeToText()} subject={subject} gradeLevel={gradeLevel}
              onModelEdit={() => {}} onAddImage={() => {}} onBrowseBank={() => {}} onSaveToBank={() => {}} customTitle={title} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings column */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Info</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Check-In"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Directions</label>
                  <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Directions: Show your work."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Grade</label>
                    <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none">
                      {['K','1','2','3','4','5','6','7','8','9','10','11','12'].map(g => <option key={g} value={g}>{g==='K'?'K':g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none">
                      {['Math','ELA','Reading','Science','Social Studies','History','Writing'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="text-xs font-bold text-indigo-700 mb-2">Quick Tips</div>
                <div className="text-xs text-indigo-600 space-y-1">
                  <div>• Click a question to expand and edit it</div>
                  <div>• Click ○ to mark the correct answer</div>
                  <div>• Use ▲▼ to reorder questions</div>
                  <div>• Add visual models from the Model Bank</div>
                  <div>• Preview to see the finished look</div>
                </div>
              </div>

              {questions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600">{questions.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">question{questions.length!==1?'s':''} added</div>
                </div>
              )}
            </div>

            {/* Questions column */}
            <div className="lg:col-span-2 space-y-3">
              {questions.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-14 flex flex-col items-center text-center">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="font-semibold text-gray-500 text-lg">Start building your assessment</p>
                  <p className="text-sm text-gray-400 mt-2">Click "Add Question" below and choose a question type</p>
                </div>
              )}

              {questions.map((q, i) => (
                <BuilderQuestionCard key={q.id} q={q} num={i+1}
                  isEditing={editingId === q.id}
                  onToggleEdit={() => setEditingId(editingId === q.id ? null : q.id)}
                  onUpdate={updates => updateQ(q.id, updates)}
                  onDelete={() => deleteQ(q.id)}
                  onMoveUp={() => moveQ(q.id, -1)} onMoveDown={() => moveQ(q.id, 1)}
                  isFirst={i===0} isLast={i===questions.length-1}
                  modelBank={modelBank} apiKey={apiKey}
                  onSaveMarkerToBank={saveMarkerToBank} />
              ))}

              <div className="relative">
                <button onClick={() => setShowTypePicker(v => !v)}
                  className="w-full py-3.5 border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold rounded-2xl hover:bg-indigo-50 hover:border-indigo-400 transition flex items-center justify-center gap-2">
                  <span className="text-xl leading-none">+</span> Add Question
                </button>
                {showTypePicker && (
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-20 grid grid-cols-2 gap-2">
                    {QTYPES.map(qt => (
                      <button key={qt.id} onClick={() => addQuestion(qt.id)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-indigo-50 text-left transition border border-transparent hover:border-indigo-100 group">
                        <span className="text-xl mt-0.5">{qt.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700">{qt.label}</div>
                          <div className="text-xs text-gray-400">{qt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── GenQuestionCard: editable card for AI-generated questions ────────────────
function GenQuestionCard({ q, isExpanded, onToggle, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const letters = 'ABCDEFGHIJ';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const QTYPE_LABELS = { mc:'Multiple Choice', short:'Short Answer', fill_blank:'Fill in the Blank', true_false:'True / False', open:'Open Response' };

  const getDetectedType = () => {
    if (q.choices.length === 2 && q.choices.some(c => /^true$/i.test(c.text.trim()))) return 'true_false';
    if (q.choices.length > 0) return 'mc';
    if (q.text.includes('___')) return 'fill_blank';
    return 'open';
  };
  const [localType, setLocalType] = useState(q.type || getDetectedType());

  return (
    <div className={'bg-white rounded-2xl shadow-sm border transition ' + (isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-100 hover:border-gray-200')}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{q.num}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">{q.text || '(empty)'}</p>
          <div className="flex gap-2 mt-0.5">
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{QTYPE_LABELS[localType] || 'Open Response'}</span>
            {q.choices.length > 0 && <span className="text-xs text-gray-400">{q.choices.length} choices</span>}
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▲</button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▼</button>
          <button onClick={onDelete} className="p-1.5 text-red-300 hover:text-red-500 text-xs ml-1">✕</button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-5 pt-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Question Format</label>
            <select value={localType} onChange={e => {
              const t = e.target.value;
              setLocalType(t);
              let nc = q.choices;
              if (t === 'mc' && q.choices.length === 0) nc = ['A','B','C','D'].map(l => ({ letter: l, text: '' }));
              else if (t === 'true_false') nc = [{ letter: 'A', text: 'True' }, { letter: 'B', text: 'False' }];
              else if (t === 'open' || t === 'short' || t === 'fill_blank') nc = [];
              onUpdate({ type: t, choices: nc });
            }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="mc">Multiple Choice</option>
              <option value="short">Short Answer</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="true_false">True / False</option>
              <option value="open">Open Response</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Question Text</label>
            <textarea value={q.text} onChange={e => onUpdate({ text: e.target.value })}
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          {q.extra && q.extra.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sub-parts / Additional Text</label>
              <textarea value={q.extra.join('\n')} onChange={e => onUpdate({ extra: e.target.value.split('\n') })}
                rows={Math.max(2, q.extra.length + 1)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
          )}

          {(localType === 'mc' || localType === 'true_false') && q.choices.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Answer Choices</label>
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">{c.letter})</span>
                    <input value={c.text} onChange={e => {
                      const nc = q.choices.map((ch, i) => i === ci ? { ...ch, text: e.target.value } : ch);
                      onUpdate({ choices: nc });
                    }} className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    {localType === 'mc' && q.choices.length > 2 && (
                      <button onClick={() => {
                        const nc = q.choices.filter((_,i) => i !== ci).map((ch, i) => ({ ...ch, letter: letters[i] }));
                        onUpdate({ choices: nc });
                      }} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {localType === 'mc' && q.choices.length < 8 && (
                <button onClick={() => onUpdate({ choices: [...q.choices, { letter: letters[q.choices.length], text: '' }] })}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">+ Add Option</button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Tag</label>
            <input value={q.standard || ''} onChange={e => onUpdate({ standard: e.target.value })}
              placeholder="e.g. 3.OA.A.1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StructuredEditor: parse + rebuild AI-generated text via question cards ───
function StructuredEditor({ text, onTextChange }) {
  const letters = 'ABCDEFGHIJ';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const questionsToText = ({ title, subtitle, questions }) => {
    const lines = [];
    if (title) lines.push(title);
    if (subtitle) lines.push(subtitle);
    questions.forEach(q => {
      (q.models || []).forEach(m => lines.push(m));
      lines.push(`${q.num}. ${q.text}`);
      if (q.choices && q.choices.length) q.choices.forEach(c => lines.push(`${c.letter}) ${c.text}`));
      (q.extra || []).forEach(e => { if (e.trim()) lines.push(e); });
      if (q.standard) lines.push(`[${q.standard}]`);
    });
    return lines.join('\n');
  };

  const initial = parseAssessment(text);
  const [editTitle, setEditTitle] = useState(initial.title);
  const [editSubtitle, setEditSubtitle] = useState(initial.subtitle);
  const [editQ, setEditQ] = useState(initial.questions);
  const [expandedNum, setExpandedNum] = useState(null);

  const rebuild = (title, subtitle, questions) => onTextChange(questionsToText({ title, subtitle, questions }));

  const updateQ = (num, updates) => {
    const nq = editQ.map(q => q.num === num ? { ...q, ...updates } : q);
    setEditQ(nq); rebuild(editTitle, editSubtitle, nq);
  };
  const deleteQ = (num) => {
    const nq = editQ.filter(q => q.num !== num).map((q, i) => ({ ...q, num: i+1 }));
    setEditQ(nq); rebuild(editTitle, editSubtitle, nq);
    if (expandedNum === num) setExpandedNum(null);
  };
  const moveQ = (num, dir) => {
    const i = editQ.findIndex(q => q.num === num);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= editQ.length) return;
    const arr = [...editQ]; [arr[i], arr[j]] = [arr[j], arr[i]];
    const renumbered = arr.map((q, k) => ({ ...q, num: k+1 }));
    setEditQ(renumbered); rebuild(editTitle, editSubtitle, renumbered);
  };
  const addQ = () => {
    const num = editQ.length + 1;
    const nq = [...editQ, { num, text: '', choices: [], extra: [], standard: '', models: [], type: 'open' }];
    setEditQ(nq); rebuild(editTitle, editSubtitle, nq); setExpandedNum(num);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <p className="text-xs text-indigo-700 font-semibold">📋 Edit question text, format, and choices. Changes update the Preview and Raw tabs immediately.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assessment Title</label>
          <input value={editTitle} onChange={e => { setEditTitle(e.target.value); rebuild(e.target.value, editSubtitle, editQ); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Subtitle / Directions</label>
          <input value={editSubtitle} onChange={e => { setEditSubtitle(e.target.value); rebuild(editTitle, e.target.value, editQ); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </div>
      <div className="space-y-2">
        {editQ.map((q, i) => (
          <GenQuestionCard key={`${q.num}-${i}`} q={q}
            isExpanded={expandedNum === q.num}
            onToggle={() => setExpandedNum(expandedNum === q.num ? null : q.num)}
            onUpdate={updates => updateQ(q.num, updates)}
            onDelete={() => deleteQ(q.num)}
            onMoveUp={() => moveQ(q.num, -1)} onMoveDown={() => moveQ(q.num, 1)}
            isFirst={i===0} isLast={i===editQ.length-1} />
        ))}
      </div>
      <button onClick={addQ}
        className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition text-sm">
        + Add Question
      </button>
    </div>
  );
}

function AssessmentBuilderInner() {
  const [appMode, setAppMode] = useState(null); // null=landing | 'build' | 'generate'
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [sourcePdfPages, setSourcePdfPages] = useState([]); // base64 JPEG renders of source PDF pages
  const [pdfRenderStatus, setPdfRenderStatus] = useState(''); // '' | 'rendering' | 'ready' | 'error'
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [scratchTopic, setScratchTopic] = useState('');
  const [scratchInstructions, setScratchInstructions] = useState('');
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
  // Model Bank state
  const [modelBank, setModelBank] = useState([]);
  const [showBank, setShowBank] = useState(false);
  const [bankTarget, setBankTarget] = useState(null); // question num
  const [bankSavedCount, setBankSavedCount] = useState(0); // how many auto-saved last generation
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  // skipNextPersist is set true while the load effect is running so the
  // persist effect doesn't overwrite localStorage with the initial empty []
  // before the loaded data has been applied.
  const skipNextPersistRef = useRef(true);

  // Default starter items pre-loaded into a fresh bank
  const DEFAULT_BANK_ITEMS = [
    { id: 'default-1', marker: '[ARRAY: rows=4 cols=5]', name: '⭐ Starter: Array 4×5', type: 'ARRAY', autoSaved: false },
    { id: 'default-2', marker: '[NUM_LINE: min=0 max=30 step=5 jumps=yes]', name: '⭐ Starter: Number Line 0–30 (by 5s)', type: 'NUM_LINE', autoSaved: false },
    { id: 'default-3', marker: '[TENS_FRAME: filled=7 total=10]', name: '⭐ Starter: Tens Frame (7 out of 10)', type: 'TENS_FRAME', autoSaved: false },
    { id: 'default-4', marker: '[FUNC_TABLE: pairs=1:?,2:?,3:?,4:?,5:? | rule=?]', name: '⭐ Starter: Blank Function Table', type: 'FUNC_TABLE', autoSaved: false },
    { id: 'default-5', marker: '[NUM_BOND: whole=10 part1=4 part2=6]', name: '⭐ Starter: Number Bond (4+6=10)', type: 'NUM_BOND', autoSaved: false },
  ];

  useEffect(() => {
    try { const saved = localStorage.getItem('anthropic_api_key'); if (saved) setApiKey(saved); } catch {}
    // Load model bank from localStorage; seed with defaults if first run
    try {
      const bankSaved = localStorage.getItem('assessBuilderBank');
      if (bankSaved) {
        const parsed = JSON.parse(bankSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setModelBank(parsed);
        } else {
          setModelBank(DEFAULT_BANK_ITEMS);
        }
      } else {
        setModelBank(DEFAULT_BANK_ITEMS);
      }
    } catch { setModelBank(DEFAULT_BANK_ITEMS); }
  }, []);

  // Persist model bank to localStorage whenever it changes.
  // Skip the very first run (initial [] before load effect fires).
  useEffect(() => {
    if (skipNextPersistRef.current) { skipNextPersistRef.current = false; return; }
    try {
      localStorage.setItem('assessBuilderBank', JSON.stringify(modelBank));
    } catch {}
  }, [modelBank]);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError('File must be under 20MB'); return; }
    setFile(f);
    setSourcePdfPages([]);
    // Render PDF/image pages so visuals can be auto-cropped after generation
    if (f.type === 'application/pdf') {
      setPdfRenderStatus('rendering');
      try {
        const pages = await renderPdfPages(f);
        setSourcePdfPages(pages);
        setPdfRenderStatus(pages.length > 0 ? 'ready' : 'error');
      } catch { setPdfRenderStatus('error'); }
    } else if (f.type.startsWith('image/')) {
      setPdfRenderStatus('rendering');
      const reader = new FileReader();
      reader.onload = ev => { setSourcePdfPages([ev.target.result]); setPdfRenderStatus('ready'); };
      reader.onerror = () => setPdfRenderStatus('error');
      reader.readAsDataURL(f);
    }
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
        // Send rendered page images so server can locate visual bounding boxes
        if (sourcePdfPages.length > 0) {
          fd.append('pageImagesJson', JSON.stringify(sourcePdfPages));
        }
        setLoadingStep('Generating assessment...');
        const res = await fetch('/api/generate', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Auto-crop visuals from source pages and insert them as IMAGE markers
        let resultText = data.result;
        if (data.cropInstructions?.length > 0 && sourcePdfPages.length > 0) {
          setLoadingStep('Copying visuals from source...');
          for (const crop of data.cropInstructions) {
            const pageImg = sourcePdfPages[(crop.page || 1) - 1];
            if (!pageImg) continue;
            try {
              const cropped = await cropImageRegion(pageImg, crop);
              if (cropped) resultText = insertMarkerBeforeQuestion(resultText, crop.q, `[IMAGE: ${cropped}]`);
            } catch { /* skip failed crop */ }
          }
        }
        setOutput(resultText);
        autoSaveMarkersToBank(resultText);
      } else {
        setLoadingStep('Generating assessment...');
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gradeLevel, subject, standard, includeVersionB, includeAnswerKey, questionCount, customTitle, url: inputMode === 'url' ? url : '', pastedText: inputMode === 'paste' ? pastedText : '', scratchTopic: inputMode === 'scratch' ? scratchTopic : '', scratchInstructions: inputMode === 'scratch' ? scratchInstructions : '', apiKey }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOutput(data.result);
        autoSaveMarkersToBank(data.result);
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
    if (!text) return { versionA: '', versionB: '', answerKey: '' };
    // Strip an explicit "VERSION A" header line if the AI added one at the top
    const cleaned = text.replace(/^VERSION A[:\s]*\n/i, '').trim();
    const vBIdx = cleaned.indexOf('VERSION B');
    const akIdx = cleaned.indexOf('TEACHER ANSWER KEY');
    const versionA = vBIdx > 0 ? cleaned.slice(0, vBIdx).trim() : (akIdx > 0 ? cleaned.slice(0, akIdx).trim() : cleaned);
    const versionB = vBIdx > 0 ? (akIdx > vBIdx ? cleaned.slice(vBIdx, akIdx).trim() : cleaned.slice(vBIdx).trim()) : '';
    const answerKey = akIdx > 0 ? cleaned.slice(akIdx).trim() : '';
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
    setSourcePdfPages([]);
    setPdfRenderStatus('');
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

  const handleAddImage = (questionNum, imageUrl) => {
    const marker = `[IMAGE: ${imageUrl}]`;
    const lines = currentTabContent.split('\n');
    // Find the line starting this question number
    const idx = lines.findIndex(l => /^\d+\./.test(l.trim()) && parseInt(l.trim()) === questionNum);
    if (idx >= 0) {
      lines.splice(idx, 0, marker);
    } else {
      // Fallback: append at end
      lines.push(marker);
    }
    setEditedSections(prev => ({ ...prev, [outputTab]: lines.join('\n') }));
  };

  const handleSaveToBank = (marker, name) => {
    const inner = marker.replace(/^\[|\]$/g, '').trim();
    const type = inner.split(':')[0].trim();
    setModelBank(prev => {
      if (prev.some(item => item.marker === marker)) return prev; // deduplicate
      return [...prev, { id: Date.now().toString() + Math.random().toString(36).slice(2), marker, name: name || autoNameMarker(type, inner.slice(inner.indexOf(':') + 1).trim()), type }];
    });
  };

  // Auto-save all markers found in generated text into the Model Bank.
  // Skips duplicates (by exact marker string). Runs after every generation.
  // Also skips IMAGE markers that contain data: URLs (too large for localStorage).
  const autoSaveMarkersToBank = (text) => {
    const found = [];
    const seen = new Set();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const m = trimmed.match(/^\[([A-Z][A-Z0-9_]*):(.+)\]$/);
      if (!m || seen.has(trimmed)) continue;
      const [, type, spec] = m;
      // Skip IMAGE markers that embed base64 data (too large for localStorage)
      if (type === 'IMAGE' && spec.trim().startsWith('data:')) continue;
      seen.add(trimmed);
      found.push({ marker: trimmed, type, spec: spec.trim() });
    }
    if (found.length === 0) return;
    setModelBank(prev => {
      const existingMarkers = new Set(prev.map(item => item.marker));
      const toAdd = found
        .filter(f => !existingMarkers.has(f.marker))
        .map(f => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          marker: f.marker,
          name: autoNameMarker(f.type, f.spec),
          type: f.type,
          autoSaved: true,
        }));
      if (toAdd.length === 0) return prev;
      setBankSavedCount(toAdd.length);
      setTimeout(() => setBankSavedCount(0), 5000); // clear badge after 5 s
      return [...prev, ...toAdd];
    });
  };

  // Save a single marker to the bank immediately (e.g. after Recreate or manual add).
  // Skips duplicates and data: URL images.
  const saveMarkerToBank = (marker, nameOverride) => {
    const inner = marker.replace(/^\[|\]$/g, '').trim();
    const colonIdx = inner.indexOf(':');
    const type = colonIdx >= 0 ? inner.slice(0, colonIdx).trim() : inner;
    const spec = colonIdx >= 0 ? inner.slice(colonIdx + 1).trim() : '';
    if (type === 'IMAGE' && spec.startsWith('data:')) return; // skip large data URLs
    setModelBank(prev => {
      if (prev.some(item => item.marker === marker)) return prev; // already in bank
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        marker,
        name: nameOverride || autoNameMarker(type, spec),
        type,
        autoSaved: true,
      }];
    });
  };

  const handleBrowseBank = (questionNum) => {
    setBankTarget(questionNum);
    setShowBank(true);
  };

  const handleInsertFromBank = (marker) => {
    const lines = currentTabContent.split('\n');
    if (bankTarget !== null) {
      // Insert the marker immediately before the targeted question line.
      // parseAssessment reads markers as "pending for the next question below",
      // so placing the marker right before "N. Question text" assigns it to question N.
      const idx = lines.findIndex(l => {
        const t = l.trim();
        return /^\d+[\.\)]/.test(t) && parseInt(t) === bankTarget;
      });
      if (idx >= 0) {
        lines.splice(idx, 0, marker);
      } else {
        // Target question not found in text — append to end as a fallback
        lines.push(marker);
      }
    } else {
      // Bank opened from header (no specific question targeted) — append to end
      lines.push(marker);
    }
    setEditedSections(prev => ({ ...prev, [outputTab]: lines.join('\n') }));
    setShowBank(false);
    setBankTarget(null);
  };

  const handleDeleteFromBank = (id) => {
    setModelBank(prev => prev.filter(item => item.id !== id));
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
    { id: 'scratch', label: 'From Scratch', desc: 'Build your own' },
  ];
  const GRADE_LEVELS = ['K','1','2','3','4','5','6','7','8','9','10','11','12'];
  const SUBJECTS = ['Math','ELA','Reading','Science','Social Studies','History','Writing'];

  // ── Landing page ──────────────────────────────────────────────────────────
  if (appMode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 shadow-sm">
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
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-start justify-end">
            <div className="bg-white w-80 h-full shadow-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Anthropic API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={() => { localStorage.setItem('anthropic_api_key', apiKey); setShowSettings(false); }}
                  className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">Save Key</button>
                <p className="mt-3 text-xs text-gray-400">Your key is stored locally and never shared.</p>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-3">Create Your Assessment</h1>
            <p className="text-lg text-gray-500 max-w-lg mx-auto">Choose how you want to build your assessment. Build manually question by question, or let AI generate one from your content.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Build Your Own card */}
            <button onClick={() => setAppMode('build')}
              className="group bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:border-indigo-300 hover:shadow-lg p-8 text-left transition-all duration-200 flex flex-col">
              <div className="text-5xl mb-5">✏️</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition">Build Your Own</h2>
              <p className="text-sm text-gray-500 mb-5 flex-1">Create your assessment question by question. Input questions manually, choose question types, and add visuals from your Model Bank.</p>
              <div className="space-y-1.5 mb-6">
                {['Multiple Choice, Short Answer, Fill in the Blank, True/False, and more','Mark correct answers and add answer key notes','Add visual models from your Model Bank','Reorder and edit questions anytime'].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-indigo-600 group-hover:bg-indigo-700 text-white text-sm font-bold py-3 rounded-2xl text-center transition">
                Start Building →
              </div>
            </button>

            {/* AI Generate card */}
            <button onClick={() => setAppMode('generate')}
              className="group bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:border-violet-300 hover:shadow-lg p-8 text-left transition-all duration-200 flex flex-col">
              <div className="text-5xl mb-5">✨</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-violet-700 transition">AI Generate</h2>
              <p className="text-sm text-gray-500 mb-5 flex-1">Upload a PDF, paste text, enter a URL, or describe a topic. Claude AI generates a complete, formatted assessment in seconds.</p>
              <div className="space-y-1.5 mb-6">
                {['Upload existing tests to create parallel forms','Generate from scratch with any topic or standard','Visual models (arrays, number lines, fraction bars) auto-added','Edit questions by format after generation'].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-violet-600 group-hover:bg-violet-700 text-white text-sm font-bold py-3 rounded-2xl text-center transition">
                Generate with AI →
              </div>
            </button>
          </div>
        </main>
        <footer className="text-center py-6 text-xs text-gray-400">
          Assessment Builder · Powered by Claude AI · Your API key is stored locally and never shared
        </footer>
      </div>
    );
  }

  // ── Manual Builder mode ───────────────────────────────────────────────────
  if (appMode === 'build') {
    return (
      <ManualBuilder
        modelBank={modelBank}
        onBack={() => setAppMode(null)}
        gradeLevel={gradeLevel} setGradeLevel={setGradeLevel}
        subject={subject} setSubject={setSubject}
      />
    );
  }

  // ── AI Generate mode (existing UI) ────────────────────────────────────────
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

      {/* Model Bank Panel */}
      {showBank && (
        <ModelBankPanel
          bank={modelBank}
          onInsert={handleInsertFromBank}
          onDelete={handleDeleteFromBank}
          onClose={() => { setShowBank(false); setBankTarget(null); }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setAppMode(null)} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition flex-shrink-0">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="font-bold text-gray-800 text-lg">AI Generate</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
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
                          {pdfRenderStatus === 'rendering' && (
                            <div className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                              <span className="animate-spin inline-block">⟳</span> Preparing visual extraction...
                            </div>
                          )}
                          {pdfRenderStatus === 'ready' && (
                            <div className="text-xs text-emerald-600 mt-1">✓ {sourcePdfPages.length} page{sourcePdfPages.length !== 1 ? 's' : ''} ready — visuals will be auto-copied</div>
                          )}
                          {pdfRenderStatus === 'error' && (
                            <div className="text-xs text-amber-600 mt-1">⚠ Could not pre-render pages — you can paste visuals manually after generation</div>
                          )}
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
                          onClick={() => { setFile(null); setSourcePdfPages([]); setPdfRenderStatus(''); }}
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

              {/* From Scratch */}
              {inputMode === 'scratch' && (
                <div className="p-4 space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
                    <span className="font-semibold">✏️ Build from scratch</span> — describe what you want and Claude will write the full assessment. Use the options below to set grade, subject, and question count.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Topic / Skill <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={scratchTopic}
                      onChange={(e) => setScratchTopic(e.target.value)}
                      placeholder="e.g. Multiplication facts for 3s and 4s, Comparing fractions, Main idea..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Additional Instructions <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={scratchInstructions}
                      onChange={(e) => setScratchInstructions(e.target.value)}
                      placeholder="e.g. Include 2 word problems and 1 diagram question. Use arrays for visual models. Focus on conceptual understanding."
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
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
                disabled={loading || (inputMode === 'file' && !file) || (inputMode === 'url' && !url) || (inputMode === 'paste' && !pastedText) || (inputMode === 'scratch' && !scratchTopic.trim())}
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

                {/* Auto-save confirmation badge */}
                {bankSavedCount > 0 && (
                  <div className="mb-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm text-emerald-700 font-medium">
                    <span>✅</span>
                    <span>{bankSavedCount} visual model{bankSavedCount > 1 ? 's' : ''} from this assessment saved to your Model Bank automatically.</span>
                  </div>
                )}

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
                      <button onClick={() => setViewMode('questions')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'questions' ? 'bg-white shadow text-violet-700' : 'text-gray-500')}>
                        📋 Questions
                      </button>
                      <button onClick={() => setViewMode('edit')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'edit' ? 'bg-white shadow text-emerald-700' : 'text-gray-500')}>
                        ✏️ Raw Edit
                      </button>
                      <button onClick={() => setViewMode('raw')} className={'px-3 py-1 text-xs font-semibold rounded-md transition ' + (viewMode === 'raw' ? 'bg-white shadow text-indigo-700' : 'text-gray-500')}>
                        📄 Text
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

                {/* Preview / Questions / Edit / Raw content */}
                {viewMode === 'questions' && outputTab !== 'answerKey' ? (
                  <StructuredEditor
                    text={currentTabContent}
                    onTextChange={newText => setEditedSections(prev => ({ ...prev, [outputTab]: newText }))}
                  />
                ) : viewMode === 'preview' ? (
                  <div ref={previewRef}>
                  {outputTab === 'answerKey' ? (
                    <AnswerKeyPreview text={currentTabContent}/>
                  ) : (
                    <AssessmentPreview
                      text={currentTabContent}
                      subject={subject}
                      gradeLevel={gradeLevel}
                      onModelEdit={handleModelEdit}
                      onAddImage={handleAddImage}
                      onBrowseBank={handleBrowseBank}
                      onSaveToBank={handleSaveToBank}
                      customTitle={customTitle}
                      apiKey={apiKey}
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
                  <strong>Pro tip:</strong> Use <strong>📋 Questions</strong> to edit question text, formats (MC, Short Answer, Fill in Blank…), and answer choices. Use <strong>✏️ Raw Edit</strong> for free-form text editing. Click <strong>Copy</strong> to paste with full formatting into Google Docs.
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

export default function AssessmentBuilder() {
  return (
    <ErrorBoundary>
      <AssessmentBuilderInner />
    </ErrorBoundary>
  );
}
