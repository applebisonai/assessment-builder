'use client';
import { useState, useRef, useEffect, Component } from 'react';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Visual render error — click Edit to adjust.
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Fraction Utilities ────────────────────────────────────────────────────────
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

/** Convert a decimal value to a fraction/mixed-number string, e.g. 0.75 → "3/4", 1.5 → "1 1/2" */
function toFrac(v, maxDenom = 16) {
  const val = parseFloat(v);
  if (isNaN(val)) return String(v);
  const sign = val < 0 ? '-' : '';
  const absV = Math.abs(val);
  const whole = Math.floor(absV);
  const frac = parseFloat((absV - whole).toFixed(8));
  if (frac < 0.0001) return `${sign}${whole}`;
  for (let d = 2; d <= maxDenom; d++) {
    const n = Math.round(frac * d);
    if (Math.abs(n / d - frac) < 0.0001) {
      const g = gcd(n, d);
      const sn = n / g, sd = d / g;
      return whole > 0 ? `${sign}${whole} ${sn}/${sd}` : `${sign}${sn}/${sd}`;
    }
  }
  return String(parseFloat(val.toFixed(3)));
}

/** Parse a string like "1/2", "1 1/4", or "0.5" to a float */
function parseFracStr(s) {
  const t = String(s).trim();
  const fracM = t.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracM) return parseInt(fracM[1]) / parseInt(fracM[2]);
  const mixM = t.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixM) return parseInt(mixM[1]) + parseInt(mixM[2]) / parseInt(mixM[3]);
  return parseFloat(t);
}

// ─── Vector Visual Components ─────────────────────────────────────────────────

function ArrayViz({ rows, cols }) {
  const R = Math.min(parseInt(rows) || 3, 12);
  const C = Math.min(parseInt(cols) || 4, 12);
  const sz = 18, gap = 6, pad = 12;
  const w = pad * 2 + C * sz + (C - 1) * gap;
  const h = pad * 2 + R * sz + (R - 1) * gap;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {Array.from({ length: R }, (_, r) =>
        Array.from({ length: C }, (_, c) => (
          <circle key={`${r}-${c}`}
            cx={pad + c * (sz + gap) + sz / 2}
            cy={pad + r * (sz + gap) + sz / 2}
            r={sz / 2 - 1}
            fill="#334155" />
        ))
      )}
    </svg>
  );
}

function NumberLine({ min = 0, max = 10, step = 1, showAll = false, jumps = false,
  hopSize = null, hopStart = null, hops = null, hopOp = '+',
  labelFmt = 'decimal', labelAt = null }) {
  const mn = parseFloat(min) || 0, mx = parseFloat(max) || 10;
  // step = number of equal divisions across the number line (e.g. 4 → ticks at min, 25%, 50%, 75%, max)
  const numDivs = Math.max(1, Math.min(Math.round(parseFloat(step) || 4), 60));
  const st = (mx - mn) / numDivs; // actual interval between ticks

  // Build tick positions — exactly numDivs+1 evenly-spaced ticks
  const ticks = [];
  for (let i = 0; i <= numDivs; i++) {
    ticks.push(parseFloat((mn + i * st).toFixed(6)));
  }

  // Parse custom label positions (supports fractions: "0, 1/4, 1/2, 3/4, 1")
  const customLabelVals = labelAt
    ? String(labelAt).split(',').map(s => parseFracStr(s)).filter(v => !isNaN(v))
    : null;

  // Format a tick value as a label string
  const fmtLabel = v => labelFmt === 'fraction' ? toFrac(v) : String(parseFloat(v.toFixed(4)));

  const hasArcs = jumps === true || jumps === 'true' || jumps === 'yes';
  const W = 340, pad = 28, lineY = hasArcs ? 58 : 38;
  const totalH = hasArcs ? 84 : 56;
  const toX = v => pad + ((v - mn) / (mx - mn)) * (W - 2 * pad);

  const op = String(hopOp || '+').trim();
  // Build hop pairs + parallel label array
  // Supports: + add  − subtract  × multiply  ÷ divide  custom "from:to" pairs
  let hopPairs = [];
  let hopLabels = [];

  if (hasArcs) {
    if (hops && String(hops).trim()) {
      // Custom "from:to" pairs — supports fractions (1/4), mixed numbers (1 1/4), and decimals
      hopPairs = String(hops).split(',').map(s => {
        const parts = s.split(':');
        const a = parseFracStr(parts[0]);
        const b = parseFracStr(parts[1]);
        return [a, b];
      }).filter(([a, b]) => !isNaN(a) && !isNaN(b));
      hopPairs.forEach(([a, b]) => {
        const diff = parseFloat((b - a).toFixed(6));
        const diffStr = labelFmt === 'fraction' ? toFrac(Math.abs(diff)) : String(parseFloat(Math.abs(diff).toFixed(4)));
        hopLabels.push(diff >= 0 ? `+${diffStr}` : `−${diffStr}`);
      });
    } else if (hopSize) {
      const hs = parseFloat(hopSize);
      if (op === '×' || op === '*') {
        // Multiplicative: start × hs × hs × …
        const start = hopStart !== null && hopStart !== '' ? parseFloat(hopStart) : (mn || 1);
        let v = start;
        for (let n = 0; n < 20; n++) {
          const next = parseFloat((v * hs).toFixed(6));
          if (next > mx + 0.0001 || Math.abs(next - v) < 0.0001) break;
          hopPairs.push([v, next]);
          hopLabels.push(`×${hs}`);
          v = next;
        }
      } else if (op === '÷' || op === '/') {
        // Division: start ÷ hs ÷ hs … (default start = max)
        const start = hopStart !== null && hopStart !== '' ? parseFloat(hopStart) : mx;
        let v = start;
        for (let n = 0; n < 20; n++) {
          const next = parseFloat((v / hs).toFixed(6));
          if (next < mn - 0.0001 || Math.abs(next - v) < 0.0001) break;
          hopPairs.push([v, next]);
          hopLabels.push(`÷${hs}`);
          v = next;
        }
      } else if (op === '-' || op === '−') {
        // Subtraction: arcs go right → left (default start = max)
        const start = hopStart !== null && hopStart !== '' ? parseFloat(hopStart) : mx;
        const hsAbs = Math.abs(hs);
        for (let v = start; v - hsAbs >= mn - 0.0001; v = parseFloat((v - hsAbs).toFixed(4))) {
          hopPairs.push([v, parseFloat((v - hsAbs).toFixed(4))]);
          hopLabels.push(`−${hsAbs}`);
        }
      } else {
        // Addition (default): arcs go left → right
        const start = hopStart !== null && hopStart !== '' ? parseFloat(hopStart) : mn;
        if (hs > 0) {
          for (let v = start; v + hs <= mx + 0.0001; v = parseFloat((v + hs).toFixed(4))) {
            hopPairs.push([v, parseFloat((v + hs).toFixed(4))]);
            hopLabels.push(`+${hs}`);
          }
        }
      }
    } else {
      // Default: hop every step with + label
      ticks.slice(0, -1).forEach((v, i) => {
        hopPairs.push([v, ticks[i + 1]]);
        const diff = parseFloat((ticks[i + 1] - v).toFixed(4));
        hopLabels.push(`+${diff}`);
      });
    }
  }

  return (
    <svg width={W} height={totalH} style={{ display: 'block' }}>
      {/* Main line */}
      <line x1={pad} y1={lineY} x2={W - pad} y2={lineY} stroke="#334155" strokeWidth={2} />
      <polygon points={`${W - pad},${lineY} ${W - pad - 7},${lineY - 4} ${W - pad - 7},${lineY + 4}`} fill="#334155" />

      {/* Ticks and labels */}
      {ticks.map((v, i) => {
        const x = toX(v);
        const isEnd = Math.abs(v - mn) < st * 0.01 || Math.abs(v - mx) < st * 0.01;
        const showLabel = customLabelVals
          ? customLabelVals.some(cv => Math.abs(cv - v) < st * 0.01)
          : (showAll || isEnd);
        const label = fmtLabel(v);
        // Fraction labels may contain a space (mixed number): render on two lines
        const isMixed = label.includes(' ') && labelFmt === 'fraction';
        const [fracWhole, fracPart] = isMixed ? label.split(' ') : [null, null];
        return (
          <g key={i}>
            <line x1={x} y1={lineY - 7} x2={x} y2={lineY + 7} stroke="#334155" strokeWidth={1.5} />
            {showLabel && (
              isMixed ? (
                <text x={x} textAnchor="middle" fill="#334155">
                  <tspan x={x} dy={lineY + 14} fontSize={10}>{fracWhole}</tspan>
                  <tspan x={x} dy={11} fontSize={9}>{fracPart}</tspan>
                </text>
              ) : (
                <text x={x} y={lineY + 20} textAnchor="middle" fontSize={11} fill="#334155">{label}</text>
              )
            )}
          </g>
        );
      })}

      {/* Hop arcs — bidirectional: + and × go left→right, − and ÷ go right→left */}
      {hopPairs.map(([v1, v2], i) => {
        const xa = toX(v1), xb = toX(v2);
        const span = Math.abs(xb - xa);
        const midX = (xa + xb) / 2;
        const arcH = Math.min(32, Math.max(14, span * 0.45));
        const label = hopLabels[i] || '';
        const isBackward = xb < xa;
        // Arrowhead at destination xb, pointing in direction of travel
        const arrowTip = isBackward
          ? `${xb},${lineY} ${xb + 5},${lineY - 6} ${xb - 1},${lineY - 3}`
          : `${xb},${lineY} ${xb - 5},${lineY - 6} ${xb + 1},${lineY - 3}`;
        return (
          <g key={i}>
            <path d={`M${xa},${lineY} Q${midX},${lineY - arcH} ${xb},${lineY}`}
              fill="none" stroke="#2563eb" strokeWidth={2} />
            <polygon points={arrowTip} fill="#2563eb" />
            <text x={midX} y={lineY - arcH - 4} textAnchor="middle" fontSize={10}
              fontWeight="600" fill="#2563eb">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Groups({ groups, items }) {
  const G = Math.min(parseInt(groups) || 3, 8);
  const I = Math.min(parseInt(items) || 4, 10);
  const dotR = 5, ovalPadX = 10, ovalPadY = 8;
  const cols = Math.ceil(Math.sqrt(I));
  const rows = Math.ceil(I / cols);
  const ovalW = cols * 16 + ovalPadX * 2;
  const ovalH = rows * 16 + ovalPadY * 2;
  const gapX = 12;
  const totalW = G * ovalW + (G - 1) * gapX + 24;
  const totalH = ovalH + 24;
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      {Array.from({ length: G }, (_, g) => {
        const ox = 12 + g * (ovalW + gapX);
        const oy = 12;
        return (
          <g key={g}>
            <ellipse cx={ox + ovalW / 2} cy={oy + ovalH / 2} rx={ovalW / 2} ry={ovalH / 2}
              fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="4,3" />
            {Array.from({ length: I }, (_, i) => {
              const dc = i % cols, dr = Math.floor(i / cols);
              const dx = ox + ovalPadX + dc * 16 + 8;
              const dy = oy + ovalPadY + dr * 16 + 8;
              return <circle key={i} cx={dx} cy={dy} r={dotR} fill="#334155" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function TensFrame({ filled, total = 10 }) {
  const F = Math.min(parseInt(filled) || 0, parseInt(total));
  const T = parseInt(total) === 5 ? 5 : 10;
  const cols = T === 5 ? 5 : 5, rows = T === 5 ? 1 : 2;
  const sz = 28, gap = 3, pad = 8;
  const w = pad * 2 + cols * sz + (cols - 1) * gap;
  const h = pad * 2 + rows * sz + (rows - 1) * gap;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill="none" stroke="#334155" strokeWidth={2} />
      {Array.from({ length: T }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = pad + c * (sz + gap);
        const y = pad + r * (sz + gap);
        return (
          <g key={i}>
            <rect x={x} y={y} width={sz} height={sz} rx={2}
              fill={i < F ? '#2563eb' : 'white'} stroke="#94a3b8" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}

function NumberBond({ whole, part1, part2 }) {
  const r = 22, W = 160, H = 90;
  const topX = W / 2, topY = 26;
  const leftX = 36, rightX = W - 36, botY = 72;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <line x1={topX} y1={topY + r} x2={leftX} y2={botY - r} stroke="#334155" strokeWidth={1.5} />
      <line x1={topX} y1={topY + r} x2={rightX} y2={botY - r} stroke="#334155" strokeWidth={1.5} />
      {[{ x: topX, y: topY, v: whole }, { x: leftX, y: botY, v: part1 }, { x: rightX, y: botY, v: part2 }].map(({ x, y, v }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="white" stroke="#334155" strokeWidth={1.5} />
          <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight="600" fill="#334155">
            {v === '?' ? '?' : v}
          </text>
        </g>
      ))}
    </svg>
  );
}

function FractionBar({ n, d }) {
  const N = parseInt(n) || 1, D = Math.max(parseInt(d) || 4, 1);
  const barW = 140, H = 36, segW = barW / D, gap = 10, pad = 2;

  // Simple proper fraction (N ≤ D): single bar
  if (N <= D) {
    return (
      <svg width={barW + 4} height={H + 2} style={{ display: 'block' }}>
        {Array.from({ length: D }, (_, i) => (
          <rect key={i} x={pad + i * segW} y={1} width={segW - 1} height={H}
            fill={i < N ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />
        ))}
      </svg>
    );
  }

  // Improper fraction (N > D): render whole bars + partial bar
  const wholeCount = Math.floor(N / D);
  const remainder = N % D;
  const hasPartial = remainder > 0;
  const totalBars = wholeCount + (hasPartial ? 1 : 0);
  const totalW = totalBars * barW + (totalBars - 1) * gap + pad * 2;
  return (
    <svg width={totalW} height={H + 2} style={{ display: 'block' }}>
      {Array.from({ length: wholeCount }, (_, bi) => (
        <g key={`w${bi}`}>
          {Array.from({ length: D }, (_, si) => (
            <rect key={si} x={pad + bi * (barW + gap) + si * segW} y={1}
              width={segW - 1} height={H} fill="#93c5fd" stroke="#334155" strokeWidth={1.5} />
          ))}
        </g>
      ))}
      {hasPartial && (
        <g>
          {Array.from({ length: D }, (_, si) => (
            <rect key={si} x={pad + wholeCount * (barW + gap) + si * segW} y={1}
              width={segW - 1} height={H}
              fill={si < remainder ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />
          ))}
        </g>
      )}
    </svg>
  );
}

function FractionCircle({ n, d }) {
  const N = parseInt(n) || 1, D = Math.max(parseInt(d) || 4, 1);
  const R = 44, circleD = R * 2 + 12, gap = 10;

  // Build one circle SVG group at given cx/cy
  const makeCircle = (cx, cy, filledN) => Array.from({ length: D }, (_, i) => {
    const a0 = (i / D) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / D) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const large = D === 1 ? 1 : 0;
    const path = `M${cx},${cy} L${x0},${y0} A${R},${R} 0 ${large},1 ${x1},${y1} Z`;
    return <path key={i} d={path} fill={i < filledN ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />;
  });

  // Simple proper fraction (N ≤ D): single circle
  if (N <= D) {
    const cx = circleD / 2, cy = circleD / 2;
    return (
      <svg width={circleD} height={circleD} style={{ display: 'block' }}>
        {makeCircle(cx, cy, N)}
      </svg>
    );
  }

  // Improper fraction (N > D): multiple circles
  const wholeCount = Math.floor(N / D);
  const remainder = N % D;
  const hasPartial = remainder > 0;
  const totalCircles = wholeCount + (hasPartial ? 1 : 0);
  const totalW = totalCircles * circleD + (totalCircles - 1) * gap;
  const cy = circleD / 2;
  return (
    <svg width={totalW} height={circleD} style={{ display: 'block' }}>
      {Array.from({ length: wholeCount }, (_, bi) => {
        const cx = bi * (circleD + gap) + circleD / 2;
        return (
          <g key={`w${bi}`}>
            {makeCircle(cx, cy, D)}
          </g>
        );
      })}
      {hasPartial && (() => {
        const cx = wholeCount * (circleD + gap) + circleD / 2;
        return (
          <g key="frac">
            {makeCircle(cx, cy, remainder)}
          </g>
        );
      })()}
    </svg>
  );
}

function AreaModel({ cols, rows: rowsStr, vals }) {
  const colVals = (cols || '20,3').split(',').map(s => s.trim());
  const rowVals = (rowsStr || '10,4').split(',').map(s => s.trim());
  const cellVals = vals ? vals.split(',').map(s => s.trim()) : [];

  // Allow decimals; proportional sizing capped so total stays compact
  const colNums = colVals.map(v => Math.max(parseFloat(v) || 0.1, 0.1));
  const rowNums = rowVals.map(v => Math.max(parseFloat(v) || 0.1, 0.1));
  const maxCol = Math.max(...colNums);
  const maxRow = Math.max(...rowNums);
  const labelW = 44, labelH = 30;
  const maxColW = Math.min(90, Math.floor(260 / colVals.length));
  const minColW = 44; // wide enough for decimal labels without crowding
  const maxRowH = Math.min(56, Math.floor(160 / rowVals.length));
  const minRowH = 30;
  const colWidths  = colNums.map(v => Math.max(minColW, Math.round((v / maxCol) * maxColW)));
  const rowHeights = rowNums.map(v => Math.max(minRowH, Math.round((v / maxRow) * maxRowH)));

  // Correct cumulative offsets (was buggy for 3+ columns/rows)
  const colX = [0];
  for (let i = 1; i < colVals.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);
  const rowY = [0];
  for (let i = 1; i < rowVals.length; i++) rowY.push(rowY[i - 1] + rowHeights[i - 1]);

  const totalW = labelW + colWidths.reduce((a, b) => a + b, 0) + 2;
  const totalH = labelH + rowHeights.reduce((a, b) => a + b, 0) + 2;

  const colors = ['#fed7aa', '#fce7f3', '#bbf7d0', '#bfdbfe', '#fef08a', '#d9f99d'];
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      {/* Column labels — font scales with cell width to prevent crowding */}
      {colVals.map((cv, ci) => {
        const fs = Math.min(12, Math.max(8, Math.floor(colWidths[ci] * 0.26)));
        return (
          <text key={ci} x={labelW + colX[ci] + colWidths[ci] / 2} y={labelH - 6}
            textAnchor="middle" fontSize={fs} fontWeight="700" fill="#334155">{cv}</text>
        );
      })}
      {/* Row labels — font scales with cell height */}
      {rowVals.map((rv, ri) => {
        const fs = Math.min(12, Math.max(8, Math.floor(rowHeights[ri] * 0.34)));
        return (
          <text key={ri} x={labelW - 4} y={labelH + rowY[ri] + rowHeights[ri] / 2 + 4}
            textAnchor="end" fontSize={fs} fontWeight="700" fill="#334155">{rv}</text>
        );
      })}
      {/* Cells */}
      {rowVals.map((_, ri) =>
        colVals.map((_, ci) => {
          const idx = ri * colVals.length + ci;
          const cellVal = cellVals[idx];
          const fill = cellVal ? colors[ci % colors.length] : 'white';
          const cw = colWidths[ci], ch = rowHeights[ri];
          const cx = labelW + colX[ci], cy = labelH + rowY[ri];
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={cx} y={cy} width={cw} height={ch}
                fill={fill} stroke="#334155" strokeWidth={1.5} />
              {cellVal && (
                <text x={cx + cw / 2} y={cy + ch / 2 + 5}
                  textAnchor="middle" fontSize={Math.min(13, Math.max(8, ch * 0.38))}
                  fontWeight="600" fill="#334155">{cellVal}</text>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

function WorkSpace({ height = 80 }) {
  return (
    <svg width={380} height={parseInt(height)} style={{ display: 'block' }}>
      <rect x={1} y={1} width={378} height={parseInt(height) - 2}
        fill="#fafafa" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6,4" rx={4} />
    </svg>
  );
}

// Student response boxes for mixed numbers and fractions
function MixedNumBox({ whole = '', n = '', d = '' }) {
  const boxW = 42, boxH = 44, fracW = 38, fracH = 34, gap = 10, pad = 8;
  const totalW = pad + boxW + gap + fracW + pad;
  const totalH = pad + Math.max(boxH, fracH * 2 + 10) + pad;
  const wholeX = pad, wholeY = (totalH - boxH) / 2;
  const fracX = pad + boxW + gap;
  const numY = (totalH - fracH * 2 - 8) / 2;
  const denY = numY + fracH + 8;
  const lineY = numY + fracH + 4;
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      {/* Whole number box */}
      <rect x={wholeX} y={wholeY} width={boxW} height={boxH}
        fill="white" stroke="#334155" strokeWidth={2} rx={2} />
      {whole ? <text x={wholeX + boxW / 2} y={wholeY + boxH / 2 + 6}
        textAnchor="middle" fontSize={18} fontWeight="700" fill="#334155">{whole}</text> : null}
      {/* Fraction bar */}
      <line x1={fracX - 2} y1={lineY} x2={fracX + fracW + 2} y2={lineY}
        stroke="#334155" strokeWidth={2} />
      {/* Numerator box */}
      <rect x={fracX} y={numY} width={fracW} height={fracH}
        fill="white" stroke="#334155" strokeWidth={2} rx={2} />
      {n ? <text x={fracX + fracW / 2} y={numY + fracH / 2 + 5}
        textAnchor="middle" fontSize={14} fontWeight="700" fill="#334155">{n}</text> : null}
      {/* Denominator box */}
      <rect x={fracX} y={denY} width={fracW} height={fracH}
        fill="white" stroke="#334155" strokeWidth={2} rx={2} />
      {d ? <text x={fracX + fracW / 2} y={denY + fracH / 2 + 5}
        textAnchor="middle" fontSize={14} fontWeight="700" fill="#334155">{d}</text> : null}
    </svg>
  );
}

function FractionBox({ n = '', d = '' }) {
  const fracW = 44, fracH = 36, pad = 8;
  const totalW = fracW + pad * 2;
  const totalH = fracH * 2 + 12 + pad * 2;
  const fracX = pad;
  const numY = pad;
  const lineY = numY + fracH + 3;
  const denY = lineY + 5;
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      <line x1={fracX - 2} y1={lineY} x2={fracX + fracW + 2} y2={lineY}
        stroke="#334155" strokeWidth={2} />
      <rect x={fracX} y={numY} width={fracW} height={fracH}
        fill="white" stroke="#334155" strokeWidth={2} rx={2} />
      {n ? <text x={fracX + fracW / 2} y={numY + fracH / 2 + 5}
        textAnchor="middle" fontSize={14} fontWeight="700" fill="#334155">{n}</text> : null}
      <rect x={fracX} y={denY} width={fracW} height={fracH}
        fill="white" stroke="#334155" strokeWidth={2} rx={2} />
      {d ? <text x={fracX + fracW / 2} y={denY + fracH / 2 + 5}
        textAnchor="middle" fontSize={14} fontWeight="700" fill="#334155">{d}</text> : null}
    </svg>
  );
}

function Base10({ thousands = 0, hundreds = 0, tens = 0, ones = 0 }) {
  const TH = Math.min(parseInt(thousands) || 0, 20);
  const H  = Math.min(parseInt(hundreds) || 0, 20);
  const T  = Math.min(parseInt(tens)     || 0, 20);
  const O  = Math.min(parseInt(ones)     || 0, 20);
  const gap = 8, pad = 6;

  // 3D cube constants (for thousands)
  const cs = 36,  cox = 10, coy = 8;  // front-face size, depth-x, depth-y
  // Front face sits at y=(pad+coy); top face peaks at y=pad; right face at x=(bx+cs)
  const cubeW = cs + cox;  // 46
  const cubeH = cs + coy;  // 44  – top of top-face (y=pad) to bottom of front-face (y=pad+coy+cs)

  let x = pad;
  const items = [];

  // ── Thousands: 3-dimensional cube with 10×10 grid on front face ─────────
  for (let i = 0; i < TH; i++) {
    const fx = x, fy = pad + coy;   // top-left of front face
    // Top face (lighter purple) – parallelogram above front
    items.push(
      <polygon key={`th${i}top`}
        points={`${fx},${fy} ${fx+cs},${fy} ${fx+cs+cox},${fy-coy} ${fx+cox},${fy-coy}`}
        fill="#c4b5fd" stroke="#5b21b6" strokeWidth={0.7} />
    );
    // Right side face (darker purple) – parallelogram right of front
    items.push(
      <polygon key={`th${i}rt`}
        points={`${fx+cs},${fy} ${fx+cs+cox},${fy-coy} ${fx+cs+cox},${fy+cs-coy} ${fx+cs},${fy+cs}`}
        fill="#5b21b6" stroke="#4c1d95" strokeWidth={0.7} />
    );
    // Front face
    items.push(
      <rect key={`th${i}fr`} x={fx} y={fy} width={cs} height={cs}
        fill="#7c3aed" stroke="#5b21b6" strokeWidth={0.7} />
    );
    // 10×10 grid lines on front face
    const gStep = cs / 10;
    for (let g = 1; g < 10; g++) {
      items.push(<line key={`th${i}gv${g}`}
        x1={fx + g*gStep} y1={fy} x2={fx + g*gStep} y2={fy+cs}
        stroke="#5b21b6" strokeWidth={0.35} />);
      items.push(<line key={`th${i}gh${g}`}
        x1={fx} y1={fy + g*gStep} x2={fx+cs} y2={fy + g*gStep}
        stroke="#5b21b6" strokeWidth={0.35} />);
    }
    x += cubeW + gap;
  }

  // ── Hundreds: flat 10×10 grid square ────────────────────────────────────
  const hBy = pad + coy;  // align baseline with thousands
  for (let i = 0; i < H; i++) {
    const bx = x;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        items.push(<rect key={`h${i}${r}${c}`}
          x={bx + c * 3} y={hBy + r * 3} width={2.5} height={2.5} fill="#334155" />);
    x += 32 + gap;
  }

  // ── Tens: vertical rod ───────────────────────────────────────────────────
  for (let i = 0; i < T; i++) {
    for (let r = 0; r < 10; r++)
      items.push(<rect key={`t${i}${r}`}
        x={x} y={hBy + r * 3} width={8} height={2.5} fill="#334155" />);
    x += 12 + gap;
  }

  // ── Ones: single small square ────────────────────────────────────────────
  for (let i = 0; i < O; i++) {
    items.push(<rect key={`o${i}`}
      x={x} y={hBy + 12} width={8} height={8} fill="#334155" />);
    x += 12 + gap;
  }

  const totalW = Math.max(x + pad, 60);
  const totalH = pad + cubeH + pad;   // always tall enough for thousands cube
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      {items}
    </svg>
  );
}

// ─── Partial Quotients long-division model ────────────────────────────────────
function PartialQuotients({ dividend, divisor, steps }) {
  const dvd = parseFloat(dividend) || 0;
  const dvs = parseFloat(divisor) || 0;

  // Parse steps — filter truly empty/zero pairs
  const stepList = steps
    ? String(steps).split(',').map(s => {
        const [a, b] = s.split(':');
        return { sub: parseFloat(a) || 0, pq: parseFloat(b) || 0 };
      }).filter(s => s.sub > 0)
    : [];

  // Build rows with running remainder
  let running = dvd;
  const rows = stepList.map(({ sub, pq }) => {
    running -= sub;
    return { sub, pq, rem: running };
  });
  const quotient = stepList.reduce((s, r) => s + r.pq, 0);
  const finalRem = running;

  // ── Layout constants ──
  const FS = 13;      // font-size px
  const CW = 7.8;     // char width (monospace @ FS=13)
  const RH = 28;      // row height
  const PAD = 12;     // outer padding
  const RG = 5;       // vertical gap around horizontal rules
  const IND = 8;      // indent inside bracket for minus sign

  // ── Column width measurements ──
  const allLeft = [dvd, ...rows.flatMap(r => [r.sub, r.rem])];
  const maxLD = Math.max(...allLeft.map(n => String(Math.round(Math.abs(n))).length), 1);
  const allPQ  = [...rows.map(r => r.pq), quotient];
  const maxPQD = Math.max(...allPQ.map(n => String(Math.round(n)).length), 1);
  const dvsDigits = dvs > 0 ? String(Math.round(dvs)).length : 0;
  const dvsW = dvsDigits > 0 ? dvsDigits * CW + 14 : 0;

  // ── X positions ──
  const bracketX = PAD + dvsW;                          // left edge of bracket (vertical wall)
  const numEndX  = bracketX + IND + (maxLD + 1) * CW;  // right-align working numbers here
  const sepX     = numEndX + 18;                        // dashed column separator
  const pqX      = sepX + 10;                           // left edge of PQ numbers
  const totalW   = pqX + maxPQD * CW + PAD;

  // ── Y positions (built sequentially) ──
  let y = PAD + 2;
  const roofY = y;              // top of the bracket "roof"

  const dvdTextY = y + FS + 2; // dividend baseline
  y += RH;

  // Build step items
  const stepItems = [];
  rows.forEach(({ sub, pq, rem }, i) => {
    // subtraction row
    stepItems.push({ type: 'sub', y: y + FS + 2, sub, pq });
    y += RH;
    // rule
    stepItems.push({ type: 'rule', y: y - RG });
    // remainder
    stepItems.push({ type: 'rem', y: y + FS + 2, rem });
    y += RH;
  });

  // PQ column total
  const pqLineY  = y - RG;
  const pqTotY   = y + FS + 2;
  y += RH;

  // Remainder note
  let remNoteY = null;
  if (Math.abs(finalRem) > 0.0001) {
    remNoteY = y + FS + 2;
    y += RH;
  }

  y += PAD;
  const bracketBotY = y - PAD + 2;

  // ── Render ──
  return (
    <svg width={totalW} height={y} style={{ display: 'block', overflow: 'visible' }}>
      {/* ── BRACKET ── */}
      {/* Vertical left wall */}
      <line x1={bracketX} y1={roofY} x2={bracketX} y2={bracketBotY}
        stroke="#1e293b" strokeWidth={2.5} strokeLinecap="square" />
      {/* Horizontal roof over dividend */}
      <line x1={bracketX} y1={roofY} x2={numEndX + 6} y2={roofY}
        stroke="#1e293b" strokeWidth={2.5} strokeLinecap="square" />

      {/* ── DIVISOR (left of bracket) ── */}
      {dvs > 0 && (
        <text x={bracketX - 6} y={dvdTextY}
          textAnchor="end" fontSize={FS} fontFamily="monospace" fontWeight="700" fill="#1e293b">
          {Math.round(dvs)}
        </text>
      )}

      {/* ── DIVIDEND ── */}
      <text x={numEndX} y={dvdTextY}
        textAnchor="end" fontSize={FS} fontFamily="monospace" fill="#1e293b">
        {Math.round(dvd)}
      </text>

      {/* ── STEP ROWS ── */}
      {stepItems.map((item, i) => {
        if (item.type === 'rule') {
          return <line key={i} x1={bracketX + IND - 2} y1={item.y} x2={numEndX + 4} y2={item.y}
            stroke="#475569" strokeWidth={1.3} />;
        }
        if (item.type === 'sub') {
          return (
            <g key={i}>
              {/* minus sign */}
              <text x={bracketX + IND} y={item.y}
                fontSize={FS} fontFamily="monospace" fill="#475569">−</text>
              {/* subtracted amount */}
              <text x={numEndX} y={item.y}
                textAnchor="end" fontSize={FS} fontFamily="monospace" fill="#1e293b">
                {Math.round(item.sub)}
              </text>
              {/* partial quotient in right column */}
              <text x={pqX} y={item.y}
                fontSize={FS} fontFamily="monospace" fontWeight="700" fill="#2563eb">
                {Math.round(item.pq)}
              </text>
            </g>
          );
        }
        if (item.type === 'rem') {
          return (
            <text key={i} x={numEndX} y={item.y}
              textAnchor="end" fontSize={FS} fontFamily="monospace" fill="#1e293b">
              {String(Math.round(item.rem * 10000) / 10000)}
            </text>
          );
        }
        return null;
      })}

      {/* ── PQ COLUMN ── */}
      {/* Dashed vertical separator */}
      <line x1={sepX} y1={roofY} x2={sepX} y2={pqLineY + 2}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
      {/* Underline above quotient total */}
      <line x1={pqX - 2} y1={pqLineY} x2={pqX + maxPQD * CW + 6} y2={pqLineY}
        stroke="#1e293b" strokeWidth={1.5} />
      {/* Quotient total */}
      <text x={pqX} y={pqTotY}
        fontSize={FS} fontFamily="monospace" fontWeight="700" fill="#1e293b">
        {Math.round(quotient)}
      </text>

      {/* ── REMAINDER NOTE ── */}
      {remNoteY !== null && (
        <text x={bracketX + IND} y={remNoteY}
          fontSize={FS - 1} fontFamily="monospace" fill="#64748b">
          r {Math.round(finalRem * 10000) / 10000}
        </text>
      )}
    </svg>
  );
}

function PlaceValueChart({ number }) {
  const n = String(number || '0');
  const digits = n.split('').reverse();
  const places = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'].slice(0, Math.max(digits.length, 3));
  const cols = places.length;
  const cellW = 52, cellH = 40, labelH = 22;
  const W = cols * cellW + 2;
  return (
    <svg width={W} height={labelH + cellH + 2} style={{ display: 'block' }}>
      {places.slice().reverse().map((p, i) => {
        const x = i * cellW + 1;
        return (
          <g key={i}>
            <rect x={x} y={1} width={cellW} height={labelH} fill="#e2e8f0" stroke="#334155" strokeWidth={1} />
            <text x={x + cellW / 2} y={labelH - 6} textAnchor="middle" fontSize={9} fill="#334155">{p}</text>
            <rect x={x} y={labelH + 1} width={cellW} height={cellH} fill="white" stroke="#334155" strokeWidth={1} />
            <text x={x + cellW / 2} y={labelH + cellH / 2 + 6} textAnchor="middle" fontSize={16} fontWeight="600" fill="#334155">
              {digits[cols - 1 - i] || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BarModel({ segments, label }) {
  const segs = (segments || '5,3').split(',').map(s => s.trim());
  const nums = segs.map(s => parseFloat(s) || 1);
  const total = nums.reduce((a, b) => a + b, 0);
  const W = 280, H = 40, pad = 12;
  let x = pad;
  const colors = ['#93c5fd', '#86efac', '#fcd34d', '#f9a8d4', '#a5b4fc'];
  return (
    <svg width={W + pad} height={H + (label ? 24 : 4)} style={{ display: 'block' }}>
      {nums.map((v, i) => {
        const w = (v / total) * W;
        const rect = (
          <g key={i}>
            <rect x={x} y={4} width={w} height={H} fill={colors[i % colors.length]} stroke="#334155" strokeWidth={1.5} />
            <text x={x + w / 2} y={4 + H / 2 + 5} textAnchor="middle" fontSize={12} fontWeight="600" fill="#334155">{segs[i]}</text>
          </g>
        );
        x += w;
        return rect;
      })}
      {label && (
        <text x={pad + W / 2} y={H + 20} textAnchor="middle" fontSize={11} fill="#334155">{label}</text>
      )}
    </svg>
  );
}

// ─── Fraction Strips ──────────────────────────────────────────────────────────
// Shows stacked fraction strips for addition (two colored groups) or
// subtraction (one group with ✕ marks on crossed-out sections).
function FracStrips({ aw = 1, an = 3, d = 4, bw = 1, bn = 3, d2 = null,
                      op = '+', cross = 0, crossWh = 0 }) {
  const dA   = Math.max(2, Math.min(parseInt(d)      || 4,  24));
  const dB   = d2 ? Math.max(2, Math.min(parseInt(d2) || dA, 24)) : dA;
  const aWh  = Math.max(0, Math.min(parseInt(aw)     || 0,  10));
  const aFr  = Math.max(0, Math.min(parseInt(an)     || 0,  dA));
  const bWh  = Math.max(0, Math.min(parseInt(bw)     || 0,  10));
  const bFr  = Math.max(0, Math.min(parseInt(bn)     || 0,  dB));
  const xN   = Math.max(0, Math.min(parseInt(cross)  || 0,  dA));
  const xWh  = Math.max(0, Math.min(parseInt(crossWh)|| 0,  aWh));
  const isAdd  = String(op).trim() === '+';
  const showB  = bWh > 0 || bFr > 0;
  const hasRHS = isAdd || showB;

  const SW = 220, SH = 26, GY = 3, PAD = 10, OPW = hasRHS ? 34 : 0;

  const aRows  = aWh + 1;
  const bRows  = hasRHS ? bWh + 1 : 0;
  const maxRows = Math.max(aRows, bRows, 1);
  const svgW = PAD + SW + (hasRHS ? OPW + SW : 0) + PAD;
  const svgH = PAD + maxRows * (SH + GY) - GY + PAD;

  // Color palettes
  const CA = { fill: '#bfdbfe', stroke: '#3b82f6', text: '#1e40af' }; // blue
  const CB = { fill: '#fde68a', stroke: '#d97706', text: '#92400e' }; // amber
  const CX = { fill: '#fecaca', stroke: '#dc2626', text: '#991b1b' }; // red (crossed)
  const CE = { fill: '#f1f5f9', stroke: '#cbd5e1', text: '#94a3b8' }; // empty

  // Adaptive fraction label size based on section width
  const secFS = (den) => {
    const w = SW / den;
    return w >= 28 ? 9 : w >= 20 ? 8 : w >= 14 ? 7 : 6;
  };

  // Render one group: wholes + fraction strip
  // xStart: fraction section index from which filled sections become crossed (−1 = none)
  // xWhStart: whole strip index from which strips become crossed (−1 = none)
  const renderGroup = (ox, oy, wholes, num, den, col, xStart, xWhStart = -1) => {
    const els = [];
    // Whole strips
    for (let i = 0; i < wholes; i++) {
      const y = oy + i * (SH + GY);
      const wholeCrossed = xWhStart >= 0 && i >= xWhStart;
      const wFill   = wholeCrossed ? CX.fill   : col.fill;
      const wStroke = wholeCrossed ? CX.stroke  : col.stroke;
      const wText   = wholeCrossed ? CX.text    : col.text;
      els.push(
        <g key={`w${i}`}>
          <rect x={ox} y={y} width={SW} height={SH} fill={wFill} stroke={wStroke} strokeWidth={1.5} rx={2} />
          <text x={ox + SW / 2} y={y + SH / 2 + 4} textAnchor="middle" fontSize={13} fontWeight="700" fill={wText}>1</text>
          {wholeCrossed && (
            <>
              <line x1={ox+4} y1={y+4} x2={ox+SW-4} y2={y+SH-4} stroke="#dc2626" strokeWidth={2}/>
              <line x1={ox+SW-4} y1={y+4} x2={ox+4} y2={y+SH-4} stroke="#dc2626" strokeWidth={2}/>
            </>
          )}
        </g>
      );
    }
    // Fraction row (always shown — empty sections are white)
    const fy  = oy + wholes * (SH + GY);
    const secW = SW / den;
    const fSize = secFS(den);
    for (let i = 0; i < den; i++) {
      const sx      = ox + i * secW;
      const filled  = i < num;
      const crossed = xStart >= 0 && i >= xStart && i < num;
      const bg  = crossed ? CX.fill : filled ? col.fill : CE.fill;
      const bdr = crossed ? CX.stroke : filled ? col.stroke : CE.stroke;
      els.push(
        <g key={`f${i}`}>
          <rect x={sx} y={fy} width={secW} height={SH} fill={bg} stroke={bdr} strokeWidth={1} />
          {filled && (
            <text x={sx + secW / 2} y={fy + SH / 2 + 3} textAnchor="middle"
              fontSize={fSize} fill={crossed ? CX.text : col.text}>
              {`1/${den}`}
            </text>
          )}
          {crossed && (
            <>
              <line x1={sx+3} y1={fy+3} x2={sx+secW-3} y2={fy+SH-3} stroke="#dc2626" strokeWidth={1.5}/>
              <line x1={sx+secW-3} y1={fy+3} x2={sx+3} y2={fy+SH-3} stroke="#dc2626" strokeWidth={1.5}/>
            </>
          )}
        </g>
      );
    }
    return els;
  };

  // For subtraction: cross out the last xN filled fraction sections + last xWh whole strips
  const crossStart  = !isAdd && xN  > 0 ? aFr - xN  : -1;
  const crossWhStart = !isAdd && xWh > 0 ? aWh - xWh : -1;

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', maxWidth: '100%' }}>
      {/* Group A */}
      {renderGroup(PAD, PAD, aWh, aFr, dA, CA, crossStart, crossWhStart)}
      {/* Operator */}
      {hasRHS && (
        <text x={PAD + SW + OPW / 2} y={svgH / 2 + 7}
          textAnchor="middle" fontSize={24} fontWeight="800" fill="#475569">
          {isAdd ? '+' : '−'}
        </text>
      )}
      {/* Group B (addition, or subtraction showing subtrahend) */}
      {hasRHS && renderGroup(PAD + SW + OPW, PAD, bWh, bFr, dB, CB, -1)}
    </svg>
  );
}

function FuncTable({ pairs, rule }) {
  const rows = (pairs || '1:3,2:6,3:?,4:?').split(',').map(p => {
    const [a, b] = p.split(':');
    return { in: a?.trim() || '', out: b?.trim() || '' };
  });
  const W = 140, rowH = 28, headH = 28;
  const H = headH + rows.length * rowH + 2;
  return (
    <svg width={W + 2} height={H} style={{ display: 'block' }}>
      {['In', 'Out'].map((label, i) => (
        <g key={i}>
          <rect x={1 + i * (W / 2)} y={1} width={W / 2} height={headH} fill="#e2e8f0" stroke="#334155" strokeWidth={1} />
          <text x={1 + i * (W / 2) + W / 4} y={headH - 8} textAnchor="middle" fontSize={12} fontWeight="600" fill="#334155">{label}</text>
        </g>
      ))}
      {rows.map((row, ri) => (
        <g key={ri}>
          {[row.in, row.out].map((val, ci) => (
            <g key={ci}>
              <rect x={1 + ci * (W / 2)} y={headH + ri * rowH + 1} width={W / 2} height={rowH}
                fill={val === '?' ? '#fef9c3' : 'white'} stroke="#334155" strokeWidth={1} />
              <text x={1 + ci * (W / 2) + W / 4} y={headH + ri * rowH + rowH / 2 + 5}
                textAnchor="middle" fontSize={13} fill="#334155">{val}</text>
            </g>
          ))}
        </g>
      ))}
      {rule && (
        <text x={W / 2 + 1} y={H + 14} textAnchor="middle" fontSize={10} fill="#64748b">Rule: {rule}</text>
      )}
    </svg>
  );
}

function DataTable({ header, rows }) {
  const headers = (header || 'Category,Count').split(',').map(s => s.trim());
  const dataRows = (rows || []).map(r => r.split(',').map(s => s.trim()));
  const colW = 90, rowH = 28, headH = 30;
  const W = headers.length * colW;
  const H = headH + dataRows.length * rowH + 2;
  return (
    <svg width={W + 2} height={H} style={{ display: 'block' }}>
      {headers.map((h, i) => (
        <g key={i}>
          <rect x={1 + i * colW} y={1} width={colW} height={headH} fill="#e2e8f0" stroke="#334155" strokeWidth={1} />
          <text x={1 + i * colW + colW / 2} y={headH - 8} textAnchor="middle" fontSize={12} fontWeight="600" fill="#334155">{h}</text>
        </g>
      ))}
      {dataRows.map((row, ri) =>
        headers.map((_, ci) => (
          <g key={`${ri}-${ci}`}>
            <rect x={1 + ci * colW} y={headH + ri * rowH + 1} width={colW} height={rowH}
              fill="white" stroke="#334155" strokeWidth={1} />
            <text x={1 + ci * colW + colW / 2} y={headH + ri * rowH + rowH / 2 + 5}
              textAnchor="middle" fontSize={12} fill="#334155">{row[ci] || ''}</text>
          </g>
        ))
      )}
    </svg>
  );
}

function YesNoTable({ statements }) {
  const stmts = statements || [];
  const colW = 200, ynW = 60, rowH = 32, headH = 32;
  const W = colW + ynW * 2;
  const H = headH + stmts.length * rowH + 2;
  return (
    <svg width={W + 2} height={H} style={{ display: 'block' }}>
      {['Statement', 'Yes', 'No'].map((h, i) => {
        const x = i === 0 ? 1 : (colW + 1 + (i - 1) * ynW);
        const w = i === 0 ? colW : ynW;
        return (
          <g key={i}>
            <rect x={x} y={1} width={w} height={headH} fill="#e2e8f0" stroke="#334155" strokeWidth={1} />
            <text x={x + w / 2} y={headH - 8} textAnchor="middle" fontSize={12} fontWeight="600" fill="#334155">{h}</text>
          </g>
        );
      })}
      {stmts.map((stmt, ri) => (
        <g key={ri}>
          <rect x={1} y={headH + ri * rowH + 1} width={colW} height={rowH} fill="white" stroke="#334155" strokeWidth={1} />
          <text x={colW / 2} y={headH + ri * rowH + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="#334155">{stmt}</text>
          {[0, 1].map(ci => (
            <g key={ci}>
              <rect x={colW + 1 + ci * ynW} y={headH + ri * rowH + 1} width={ynW} height={rowH}
                fill="white" stroke="#334155" strokeWidth={1} />
              <circle cx={colW + 1 + ci * ynW + ynW / 2} cy={headH + ri * rowH + rowH / 2}
                r={8} fill="white" stroke="#334155" strokeWidth={1.5} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

function GridResponse({ cols = 4 }) {
  const C = Math.min(parseInt(cols) || 4, 6);
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const cellW = 28, cellH = 28;
  const W = C * cellW + 2, H = 10 * cellH + 2;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {Array.from({ length: C }, (_, ci) =>
        digits.map((d, ri) => (
          <g key={`${ci}-${ri}`}>
            <rect x={1 + ci * cellW} y={1 + ri * cellH} width={cellW} height={cellH}
              fill="white" stroke="#94a3b8" strokeWidth={1} />
            <text x={1 + ci * cellW + cellW / 2} y={1 + ri * cellH + cellH / 2 + 5}
              textAnchor="middle" fontSize={11} fill="#334155">{d}</text>
          </g>
        ))
      )}
    </svg>
  );
}

function NumberChart({ start = 1, end = 100, cols = 10, shaded = '' }) {
  const S = parseInt(start), E = parseInt(end), C = parseInt(cols) || 10;
  const shadedSet = new Set((shaded || '').split(',').map(s => parseInt(s.trim())).filter(Boolean));
  const nums = [];
  for (let i = S; i <= E; i++) nums.push(i);
  const cellW = 28, cellH = 24;
  const rows = Math.ceil(nums.length / C);
  const W = C * cellW + 2, H = rows * cellH + 2;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {nums.map((n, i) => {
        const r = Math.floor(i / C), c = i % C;
        return (
          <g key={n}>
            <rect x={1 + c * cellW} y={1 + r * cellH} width={cellW} height={cellH}
              fill={shadedSet.has(n) ? '#93c5fd' : 'white'} stroke="#94a3b8" strokeWidth={1} />
            <text x={1 + c * cellW + cellW / 2} y={1 + r * cellH + cellH / 2 + 5}
              textAnchor="middle" fontSize={10} fill="#334155">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Volume 3D (Rectangular Prism) ────────────────────────────────────────────
function Volume3D({ l, w, h, formula, lbl_l, lbl_w, lbl_h, cubelines }) {
  const L = Math.min(Math.max(parseInt(l) || 3, 1), 8);
  const W = Math.min(Math.max(parseInt(w) || 2, 1), 8);
  const H = Math.min(Math.max(parseInt(h) || 2, 1), 8);
  const showFormula = formula !== 'no';
  const showCubeLines = cubelines !== 'no';
  const s = 22;
  const c = Math.sqrt(3) / 2; // cos30° ≈ 0.866 for true isometric

  // Offsets so the leftmost/topmost point stays inside the SVG
  const pad = 38;
  const ox = W * s * c + pad;
  const oy = H * s + Math.round(pad * 0.55);

  const X = (i, j) => ox + (i - j) * s * c;
  const Y = (i, j, k) => oy + (i + j) * s * 0.5 - k * s;
  const P = (i, j, k) => `${X(i,j).toFixed(1)},${Y(i,j,k).toFixed(1)}`;

  const svgW = Math.ceil((L + W) * s * c + pad * 2);
  const svgH = Math.ceil(H * s + (L + W) * s * 0.5 + pad * 1.4 + (showFormula ? 22 : 0));

  // 3 visible faces
  const frontPts = `${P(0,0,0)} ${P(L,0,0)} ${P(L,0,H)} ${P(0,0,H)}`;
  const rightPts = `${P(L,0,0)} ${P(L,W,0)} ${P(L,W,H)} ${P(L,0,H)}`;
  const topPts   = `${P(0,0,H)} ${P(L,0,H)} ${P(L,W,H)} ${P(0,W,H)}`;

  // Unit-cube grid lines on each face
  const gridLines = [];
  if (showCubeLines) {
    let gk = 0;
    // Front face: length-direction verticals + height-direction horizontals
    for (let i = 1; i < L; i++) gridLines.push(
      <line key={gk++} x1={X(i,0).toFixed(1)} y1={Y(i,0,0).toFixed(1)} x2={X(i,0).toFixed(1)} y2={Y(i,0,H).toFixed(1)} stroke="#93c5fd" strokeWidth={0.8}/>);
    for (let k = 1; k < H; k++) gridLines.push(
      <line key={gk++} x1={X(0,0).toFixed(1)} y1={Y(0,0,k).toFixed(1)} x2={X(L,0).toFixed(1)} y2={Y(L,0,k).toFixed(1)} stroke="#93c5fd" strokeWidth={0.8}/>);
    // Right face: depth-direction lines + height-direction horizontals
    for (let j = 1; j < W; j++) gridLines.push(
      <line key={gk++} x1={X(L,j).toFixed(1)} y1={Y(L,j,0).toFixed(1)} x2={X(L,j).toFixed(1)} y2={Y(L,j,H).toFixed(1)} stroke="#60a5fa" strokeWidth={0.8}/>);
    for (let k = 1; k < H; k++) gridLines.push(
      <line key={gk++} x1={X(L,0).toFixed(1)} y1={Y(L,0,k).toFixed(1)} x2={X(L,W).toFixed(1)} y2={Y(L,W,k).toFixed(1)} stroke="#60a5fa" strokeWidth={0.8}/>);
    // Top face: length-direction lines + depth-direction lines
    for (let i = 1; i < L; i++) gridLines.push(
      <line key={gk++} x1={X(i,0).toFixed(1)} y1={Y(i,0,H).toFixed(1)} x2={X(i,W).toFixed(1)} y2={Y(i,W,H).toFixed(1)} stroke="#bfdbfe" strokeWidth={0.8}/>);
    for (let j = 1; j < W; j++) gridLines.push(
      <line key={gk++} x1={X(0,j).toFixed(1)} y1={Y(0,j,H).toFixed(1)} x2={X(L,j).toFixed(1)} y2={Y(L,j,H).toFixed(1)} stroke="#bfdbfe" strokeWidth={0.8}/>);
  }

  const decLbl = s => String(s || '').replace(/_/g, ' ');
  const lx = (X(0,0) + X(L,0)) / 2;
  const ly = (Y(0,0,0) + Y(L,0,0)) / 2 + 15;
  const wx = (X(L,0) + X(L,W)) / 2 + 12;
  const wy = (Y(L,0,0) + Y(L,W,0)) / 2;
  const hx = X(0,0) - 10;
  const hy = (Y(0,0,0) + Y(0,0,H)) / 2;
  const vol = L * W * H;

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block' }}>
      {/* Filled faces */}
      <polygon points={frontPts} fill="#dbeafe" stroke="none" />
      <polygon points={rightPts} fill="#bfdbfe" stroke="none" />
      <polygon points={topPts}   fill="#eff6ff" stroke="none" />
      {/* Unit cube grid lines */}
      {gridLines}
      {/* Face outlines — uniform dark blue for clean look */}
      <polygon points={frontPts} fill="none" stroke="#1d4ed8" strokeWidth={1.6} />
      <polygon points={rightPts} fill="none" stroke="#1d4ed8" strokeWidth={1.6} />
      <polygon points={topPts}   fill="none" stroke="#1d4ed8" strokeWidth={1.6} />
      {/* Hidden back edges (dashed) — completes the 3D prism look */}
      <line x1={X(0,0).toFixed(1)} y1={Y(0,0,0).toFixed(1)} x2={X(0,W).toFixed(1)} y2={Y(0,W,0).toFixed(1)} stroke="#93c5fd" strokeWidth={1} strokeDasharray="4,3"/>
      <line x1={X(0,W).toFixed(1)} y1={Y(0,W,0).toFixed(1)} x2={X(L,W).toFixed(1)} y2={Y(L,W,0).toFixed(1)} stroke="#93c5fd" strokeWidth={1} strokeDasharray="4,3"/>
      <line x1={X(0,W).toFixed(1)} y1={Y(0,W,0).toFixed(1)} x2={X(0,W).toFixed(1)} y2={Y(0,W,H).toFixed(1)} stroke="#93c5fd" strokeWidth={1} strokeDasharray="4,3"/>
      {/* Dimension labels */}
      <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" fontSize={11} fill="#1e40af" fontWeight="600">{decLbl(lbl_l) || `l = ${L}`}</text>
      <text x={wx.toFixed(1)} y={wy.toFixed(1)} textAnchor="start" fontSize={11} fill="#1e40af" fontWeight="600" dominantBaseline="middle">{decLbl(lbl_w) || `w = ${W}`}</text>
      <text x={hx.toFixed(1)} y={hy.toFixed(1)} textAnchor="end" fontSize={11} fill="#1e40af" fontWeight="600" dominantBaseline="middle">{decLbl(lbl_h) || `h = ${H}`}</text>
      {showFormula && (
        <text x={svgW / 2} y={svgH - 6} textAnchor="middle" fontSize={11} fill="#1e3a8a">
          {`V = ${L} × ${W} × ${H} = ${vol} cubic units`}
        </text>
      )}
    </svg>
  );
}

// ─── 2D Shape with side labels ────────────────────────────────────────────────
function Shape2D({ shape, labels, color }) {
  const shapeId = shape || 'rectangle';
  const fillColor = color || '#dbeafe';
  const W = 220, H = 190;
  const cx = W / 2, cy = H / 2;
  const scl = 82;
  const decLbl = s => String(s || '').replace(/_/g, ' ');

  const regPts = (n, r = 0.42) => Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i / n) - Math.PI / 2;
    return [r * Math.cos(a), r * Math.sin(a)];
  });

  const DEFS = {
    equilateral:   [[0,-0.47],[0.41,0.24],[-0.41,0.24]],
    right:         [[-0.45,0.35],[0.45,0.35],[-0.45,-0.40]],
    isosceles:     [[0,-0.47],[0.38,0.35],[-0.38,0.35]],
    square:        [[-0.38,-0.38],[0.38,-0.38],[0.38,0.38],[-0.38,0.38]],
    rectangle:     [[-0.47,-0.28],[0.47,-0.28],[0.47,0.28],[-0.47,0.28]],
    rhombus:       [[0,-0.45],[0.35,0],[0,0.45],[-0.35,0]],
    parallelogram: [[-0.25,-0.28],[0.47,-0.28],[0.25,0.28],[-0.47,0.28]],
    quadrilateral: [[-0.38,-0.35],[0.45,-0.25],[0.30,0.40],[-0.45,0.28]],
    pentagon:      regPts(5),
    hexagon:       regPts(6, 0.40),
    octagon:       regPts(8, 0.38),
  };

  if (shapeId === 'circle') {
    const r = 64;
    const lbls = String(labels || '').split(',').map(s => decLbl(s.trim()));
    return (
      <svg width={W} height={H} style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke="#1e40af" strokeWidth={1.5} />
        {lbls[0] && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#1e40af" fontWeight="600">{lbls[0]}</text>}
        {lbls[1] && <text x={cx + r + 10} y={cy} textAnchor="start" dominantBaseline="middle" fontSize={11} fill="#1e40af" fontWeight="600">{lbls[1]}</text>}
      </svg>
    );
  }
  if (shapeId === 'oval') {
    const rx = 80, ry = 50;
    const lbls = String(labels || '').split(',').map(s => decLbl(s.trim()));
    return (
      <svg width={W} height={H} style={{ display: 'block' }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fillColor} stroke="#1e40af" strokeWidth={1.5} />
        {lbls[0] && <text x={cx} y={cy - ry - 10} textAnchor="middle" fontSize={11} fill="#1e40af" fontWeight="600">{lbls[0]}</text>}
        {lbls[1] && <text x={cx + rx + 10} y={cy} textAnchor="start" dominantBaseline="middle" fontSize={11} fill="#1e40af" fontWeight="600">{lbls[1]}</text>}
      </svg>
    );
  }

  const rawPts = DEFS[shapeId] || DEFS.rectangle;
  const svgPts = rawPts.map(([nx, ny]) => ({ x: cx + nx * scl, y: cy + ny * scl }));
  const polyPts = svgPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const n = svgPts.length;
  const centX = svgPts.reduce((s, p) => s + p.x, 0) / n;
  const centY = svgPts.reduce((s, p) => s + p.y, 0) / n;
  const lblArr = String(labels || '').split(',').map(s => decLbl(s.trim()));

  const lblEls = svgPts.map((p, i) => {
    const q = svgPts[(i + 1) % n];
    const lbl = lblArr[i] || '';
    if (!lbl) return null;
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const elen = Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2);
    if (elen < 0.001) return null;
    const dx = (q.x - p.x) / elen, dy = (q.y - p.y) / elen;
    const n1x = -dy, n1y = dx;
    const dot1 = (mx + n1x - centX) * n1x + (my + n1y - centY) * n1y;
    const nx2 = dot1 > 0 ? n1x : dy, ny2 = dot1 > 0 ? n1y : -dx;
    const off = 16;
    return (
      <text key={i} x={(mx + nx2 * off).toFixed(1)} y={(my + ny2 * off).toFixed(1)}
        textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#1e40af" fontWeight="600">
        {lbl}
      </text>
    );
  });

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polygon points={polyPts} fill={fillColor} stroke="#1e40af" strokeWidth={1.5} />
      {lblEls}
    </svg>
  );
}

// ─── Parse visual marker string → React component ─────────────────────────────
function parseVisualModel(marker) {
  const m = marker.trim();
  const kv = {};
  const kvPart = m.replace(/^\[[\w_]+:/, '').replace(/\]$/, '');
  kvPart.split(/\s+/).forEach(part => {
    const [k, v] = part.split('=');
    if (k && v !== undefined) kv[k.toLowerCase()] = v;
  });

  if (m.startsWith('[ARRAY:')) return <ArrayViz rows={kv.rows} cols={kv.cols} />;
  if (m.startsWith('[NUM_LINE:')) {
    // Use dedicated regexes for params that may contain commas (breaks kv parser)
    const hopsM = m.match(/\bhops=([\d.\-:,]+)/);
    const hops = hopsM ? hopsM[1] : null;
    const labelAtM = m.match(/\blabelat=([\d.,/\s]+?)(?=\s+\w+=|\])/);
    const labelAt = labelAtM ? labelAtM[1].trim() : null;
    return <NumberLine min={kv.min} max={kv.max} step={kv.step}
      showAll={kv.show === 'all'} jumps={kv.jumps === 'yes'}
      hopSize={kv.hop_size} hopStart={kv.hop_start} hops={hops}
      hopOp={kv.hop_op || '+'}
      labelFmt={kv.labelfmt || 'decimal'}
      labelAt={kv.show === 'custom' ? labelAt : null} />;
  }
  if (m.startsWith('[GROUPS:')) return <Groups groups={kv.groups} items={kv.items} />;
  if (m.startsWith('[TENS_FRAME:')) return <TensFrame filled={kv.filled} total={kv.total} />;
  if (m.startsWith('[NUM_BOND:')) return <NumberBond whole={kv.whole} part1={kv.part1} part2={kv.part2} />;
  if (m.startsWith('[FRACTION:')) {
    const frac = kvPart.trim().replace(/\s/g, '');
    const [n, d] = frac.split('/');
    return <FractionBar n={n} d={d} />;
  }
  if (m.startsWith('[FRAC_CIRCLE:')) {
    const frac = kvPart.trim().replace(/\s/g, '');
    const [n, d] = frac.split('/');
    return <FractionCircle n={n} d={d} />;
  }
  // Mixed number bar: whole=W n=N d=D  → convert to improper → FractionBar auto-renders multi bars
  if (m.startsWith('[MIXED_NUM:')) {
    const D = Math.max(parseInt(kv.d) || 4, 1);
    const totalN = (parseInt(kv.whole) || 0) * D + (parseInt(kv.n) || 0);
    return <FractionBar n={totalN} d={D} />;
  }
  // Mixed number circle: same logic → FractionCircle auto-renders multi circles
  if (m.startsWith('[MIXED_CIRCLE:')) {
    const D = Math.max(parseInt(kv.d) || 4, 1);
    const totalN = (parseInt(kv.whole) || 0) * D + (parseInt(kv.n) || 0);
    return <FractionCircle n={totalN} d={D} />;
  }
  if (m.startsWith('[AREA_MODEL:')) {
    return <AreaModel cols={kv.cols} rows={kv.rows} vals={kv.vals} />;
  }
  if (m.startsWith('[WORK_SPACE:') || m === '[WORK_SPACE]') {
    return <WorkSpace height={kv.height || 80} />;
  }
  if (m.startsWith('[BASE10:')) {
    return <Base10 thousands={kv.thousands} hundreds={kv.hundreds} tens={kv.tens} ones={kv.ones} />;
  }
  if (m.startsWith('[PV_CHART:')) {
    const num = kvPart.trim();
    return <PlaceValueChart number={num} />;
  }
  if (m.startsWith('[BAR_MODEL:')) {
    const pipeIdx = kvPart.indexOf('|');
    const segPart = pipeIdx >= 0 ? kvPart.slice(0, pipeIdx).trim() : kvPart.trim();
    const labelMatch = kvPart.match(/label=(.+)/);
    return <BarModel segments={segPart} label={labelMatch ? labelMatch[1] : null} />;
  }
  if (m.startsWith('[FRAC_STRIPS:')) {
    return <FracStrips aw={kv.aw} an={kv.an} d={kv.d} bw={kv.bw} bn={kv.bn} d2={kv.bd}
      op={kv.op || '+'} cross={kv.cross} crossWh={kv.crosswh} />;
  }
  if (m.startsWith('[TAPE:')) {
    const pipeIdx = kvPart.indexOf('|');
    const segPart = pipeIdx >= 0 ? kvPart.slice(0, pipeIdx).trim() : kvPart.trim();
    const segs = segPart.split(',').map(s => {
      const [, val] = s.split(':');
      return val || s;
    }).join(',');
    return <BarModel segments={segs} />;
  }
  if (m.startsWith('[FUNC_TABLE:')) {
    const pairsMatch = kvPart.match(/pairs=([^\s|]+)/);
    const ruleMatch = kvPart.match(/rule=(.+?)(\s*\||\s*$)/);
    return <FuncTable pairs={pairsMatch ? pairsMatch[1] : ''} rule={ruleMatch ? ruleMatch[1] : ''} />;
  }
  if (m.startsWith('[DATA_TABLE:')) {
    const headerMatch = kvPart.match(/header=([^|]+)/);
    const header = headerMatch ? headerMatch[1].trim() : 'Category,Count';
    const pipes = kvPart.split('|').slice(1).map(s => s.trim());
    return <DataTable header={header} rows={pipes} />;
  }
  if (m.startsWith('[YES_NO_TABLE:')) {
    const stmts = kvPart.split('|').map(s => s.trim()).filter(Boolean);
    return <YesNoTable statements={stmts} />;
  }
  if (m.startsWith('[GRID_RESPONSE:')) {
    return <GridResponse cols={kv.cols} />;
  }
  if (m.startsWith('[NUM_CHART:')) {
    return <NumberChart start={kv.start} end={kv.end} cols={kv.cols} shaded={kv.shaded} />;
  }
  if (m.startsWith('[MIXED_NUM_BOX:') || m === '[MIXED_NUM_BOX]') {
    return <MixedNumBox whole={kv.whole || ''} n={kv.n || ''} d={kv.d || ''} />;
  }
  if (m.startsWith('[FRACTION_BOX:') || m === '[FRACTION_BOX]') {
    return <FractionBox n={kv.n || ''} d={kv.d || ''} />;
  }
  if (m.startsWith('[PARTIAL_Q:')) {
    // steps= contains commas, so use dedicated regex
    const stepsM = m.match(/\bsteps=([\d.:\-,]+)/);
    return <PartialQuotients dividend={kv.dividend} divisor={kv.divisor}
      steps={stepsM ? stepsM[1] : ''} />;
  }
  if (m.startsWith('[VOL_3D:')) {
    const lblLM = m.match(/\blbl_l=(\S+)/);
    const lblWM = m.match(/\blbl_w=(\S+)/);
    const lblHM = m.match(/\blbl_h=(\S+)/);
    return <Volume3D l={kv.l} w={kv.w} h={kv.h} formula={kv.formula} cubelines={kv.cubelines}
      lbl_l={lblLM ? lblLM[1] : ''} lbl_w={lblWM ? lblWM[1] : ''} lbl_h={lblHM ? lblHM[1] : ''} />;
  }
  if (m.startsWith('[SHAPE_2D:')) {
    const labelsM = m.match(/\blabels=(\S+)/);
    return <Shape2D shape={kv.shape} labels={labelsM ? labelsM[1] : ''} color={kv.color} />;
  }
  if (m.startsWith('[IMAGE:')) {
    return null; // handled separately as paste zone
  }
  return null;
}

// ─── Parse assessment text → question objects ──────────────────────────────────
// Split a text string that contains inline choices appended to the question,
// e.g. "Which is closest? A) 2 B) 20 C) 200 D) 2,000"
// Returns { qText, choices } or null if no inline choices detected.
function tryExtractInlineChoices(text) {
  // Must start with "A)" or "A." (case-insensitive) somewhere after the question text
  const choicesStart = text.search(/\s+[Aa][.)]\s/);
  if (choicesStart < 0) return null;
  const qText = text.slice(0, choicesStart).trim();
  const choicesStr = text.slice(choicesStart).trim();
  // Split at whitespace before each letter-choice marker
  const parts = choicesStr.split(/\s+(?=[A-Fa-f][.)]\s)/);
  const choices = parts.map(p => {
    const m = p.trim().match(/^([A-Fa-f])[.)]\s+(.+)$/);
    return m ? { letter: m[1].toUpperCase(), text: m[2].trim() } : null;
  }).filter(Boolean);
  return choices.length >= 2 ? { qText, choices } : null;
}

function parseAssessment(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let inVersionB = false;
  let inAnswerKey = false;
  const MARKER_RE = /^\[(ARRAY|NUM_LINE|GROUPS|TENS_FRAME|NUM_BOND|FRACTION|FRAC_CIRCLE|MIXED_NUM|MIXED_CIRCLE|MIXED_NUM_BOX|FRACTION_BOX|AREA_MODEL|BASE10|PV_CHART|BAR_MODEL|FRAC_STRIPS|TAPE|FUNC_TABLE|DATA_TABLE|YES_NO_TABLE|GRID_RESPONSE|NUM_CHART|PARTIAL_Q|WORK_SPACE|IMAGE)\s*[:|\]]/i;

  // Google Forms / quiz-platform metadata — silently skip these lines everywhere
  const GFORM_NOISE = [
    // Question type + point value labels (e.g. "Multiple Choice 1 pt * Required", "Numeric 1 pt ✱ Required")
    /^(multiple\s+choice|short\s+answer|paragraph(\s+text)?|linear\s+scale|checkbox(\s+grid)?|dropdown|date|time|file\s+upload|numeric|true\s*\/\s*false|matching)\s*[\d.]*\s*(pt|pts|point|points)?\s*[*✱]?\s*(required)?\.?$/i,
    // Bare point values: "1 pt", "2 pts * Required", "1 pt ✱ Required"
    /^\d+(\.\d+)?\s*(pt|pts|point|points)\s*[*✱]?\s*(required)?\.?$/i,
    // Form UI chrome — including Unicode heavy asterisk (✱ U+2731)
    /^[*✱]\s*required\.?$/i,
    /^mark\s+the\s+correct\s+answer\.?$/i,
    /^your\s+answer(s)?\.?$/i,
    /^(this\s+form\s+was\s+created|never\s+submit\s+passwords|page\s+\d+\s+of\s+\d+|powered\s+by\s+google)/i,
    /^(add\s+a\s+comment|submit|next|back|clear\s+form)\s*$/i,
    // Student info field labels — NOT real questions
    /^(name|your\s+name|student'?s?\s+name|first\s+name|last\s+name|full\s+name)\s*[*]?\.?$/i,
    /^(class|class\s*(\/|and)?\s*period|period|course)\s*[*]?\.?$/i,
    /^(date|today'?s?\s+date|test\s+date)\s*[*]?\.?$/i,
    /^(email(\s+address)?)\s*[*]?\.?$/i,
    /^(teacher'?s?\s+name|teacher)\s*[*]?\.?$/i,
    /^(grade|grade\s+level|student\s+(id|number|#))\s*[*]?\.?$/i,
  ];
  const isNoise = s => GFORM_NOISE.some(re => re.test(s));

  // Degenerate question text: a bare instruction word with no math content.
  // When this is the entire q.text, treat it the same as an empty text and
  // promote the first continuation line (the actual equation/problem) instead.
  const DEGENERATE_TEXT = /^(solve|compute|calculate|find|evaluate|simplify|answer)\.?$/i;

  const flush = () => {
    if (current) {
      // If text is empty OR is a bare instruction word (e.g. "Solve"),
      // promote the first continuation line to text.
      // Handles Google Form computation style: "10. Solve" with "24 ÷ 6 = ___" on next line.
      if (
        (!current.text?.trim() || DEGENERATE_TEXT.test(current.text.trim())) &&
        current.lines?.length
      ) {
        current.text = current.lines.shift();
      }
      // Drop fully empty shells (no text, no choices, no marker, no lines — Name/Email fields etc.)
      const hasContent = current.text?.trim() || current.choices?.length || current.marker || current.lines?.length;
      if (hasContent) questions.push(current);
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    // Normalize Unicode asterisk variants (✱ ⁎ ＊ ✶ etc.) → plain * so noise regex matches
    const trimmed = lines[i].trim().replace(/[✱⁎＊✶✴✵✷✸✹❋＊]/g, '*');
    if (!trimmed) continue;
    // Skip Google Forms metadata noise
    if (isNoise(trimmed)) continue;

    // Version B boundary — must not match numbered questions like "1. Version B..."
    if (/^-*\s*version\s*b\s*-*$/i.test(trimmed)) {
      flush();
      inVersionB = true;
      questions.push({ id: `vb-${i}`, type: 'vb-divider' });
      continue;
    }

    // Answer key boundary
    if (/teacher\s+answer\s+key/i.test(trimmed)) {
      flush();
      inAnswerKey = true;
      questions.push({ id: `ak-${i}`, type: 'ak-divider' });
      continue;
    }

    // Answer key lines — store as simple rows
    if (inAnswerKey) {
      questions.push({ id: `ak-line-${i}`, type: 'answer-key', text: trimmed });
      continue;
    }

    // Visual marker line
    if (MARKER_RE.test(trimmed)) {
      flush();
      current = { id: `q-${i}`, type: 'question', marker: trimmed, text: '', choices: [], lines: [], vb: inVersionB };
      continue;
    }

    // Question number with text: "1. text" or "1) text"
    const qMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    // Bare question number alone on its line: "10." or "10)" — Google Form computation style
    const bareMatch = !qMatch && trimmed.match(/^(\d+)[.)]\s*$/);

    if (qMatch || bareMatch) {
      const qNum = qMatch ? qMatch[1] : bareMatch[1];
      const qText = qMatch ? qMatch[2] : '';

      if (qMatch && current && !current.qNum) {
        // Marker was the line before — attach number to it
        current.qNum = qNum;
        const inlined = tryExtractInlineChoices(qText);
        if (inlined) { current.text = inlined.qText; current.choices = inlined.choices; }
        else current.text = qText;
        if (/select all|choose all/i.test(qText)) current.qType = 'multiselect';
        continue;
      }
      flush();
      const isMulti = /select all|choose all/i.test(qText);
      const inlined = qMatch ? tryExtractInlineChoices(qText) : null;
      current = {
        id: `q-${i}`, type: 'question', qNum, marker: null,
        text: inlined ? inlined.qText : qText,
        choices: inlined ? inlined.choices : [],
        lines: [], vb: inVersionB,
        qType: isMulti ? 'multiselect' : 'mc',
      };
      continue;
    }

    // MC / multi-select choice: A) B) C) D) E) F)...
    // Handles both single "A) text" lines and inline "A) text B) text C) text D) text" lines
    const choiceMatch = trimmed.match(/^([A-Fa-f])[.)]\s+(.*)$/);
    if (choiceMatch && current) {
      // Check if multiple choices are squished on this one line
      const parts = trimmed.split(/\s+(?=[A-Fa-f][.)]\s)/);
      if (parts.length >= 2) {
        // Multiple inline choices — split and add each
        for (const part of parts) {
          const m = part.trim().match(/^([A-Fa-f])[.)]\s+(.+)$/);
          if (m) current.choices.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
        }
      } else {
        current.choices.push({ letter: choiceMatch[1].toUpperCase(), text: choiceMatch[2] });
      }
      continue;
    }

    // Standard tag [3.OA.A.1]
    if (/^\[\d+\.[A-Z]/.test(trimmed) && current) {
      current.standard = trimmed;
      continue;
    }

    // Section header / direction line
    if (!current) {
      questions.push({ id: `h-${i}`, type: 'header', text: trimmed, vb: inVersionB });
      continue;
    }

    // Continuation text on current question
    current.lines.push(trimmed);
  }

  flush();
  return questions;
}

// ─── Manual Builder Helpers ───────────────────────────────────────────────────
const Q_TYPES = [
  { id: 'mc', label: 'Multiple Choice' },
  { id: 'multiselect', label: 'Select All That Apply' },
  { id: 'fill', label: 'Fill-in-the-blank' },
  { id: 'open', label: 'Open Response' },
  { id: 'compute', label: 'Computation' },
  { id: 'word', label: 'Word Problem' },
];

const LETTERS = 'ABCDEFGHIJ'.split('');
const defaultChoices = () => LETTERS.slice(0, 4).map(l => ({ letter: l, text: '' }));

const VISUAL_TYPES_LIST = [
  { id: 'none',        label: 'None' },
  { id: 'custom',      label: 'UPLOAD / PASTE IMAGE', color: '#b45309' },
  { id: 'DRAW',        label: '✏ DRAW (freehand)', color: '#7c3aed' },
  { id: 'SHAPE_2D',   label: '2D Shape (with labels)' },
  { id: 'AREA_MODEL',  label: 'Area Model (multi-digit)' },
  { id: 'ARRAY',       label: 'Array (dots)' },
  { id: 'BAR_MODEL',   label: 'Bar Model' },
  { id: 'DATA_TABLE',  label: 'Data Table' },
  { id: 'FRACTION',    label: 'Fraction Bar (proper / improper)' },
  { id: 'FRAC_CIRCLE', label: 'Fraction Circle (proper / improper)' },
  { id: 'FRACTION_BOX',label: 'Fraction Response Box' },
  { id: 'FRAC_STRIPS', label: 'Fraction Strips (add / subtract)' },
  { id: 'GROUPS',      label: 'Groups / Ovals' },
  { id: 'MIXED_NUM',   label: 'Mixed Number Bar' },
  { id: 'MIXED_CIRCLE',label: 'Mixed Number Circle' },
  { id: 'MIXED_NUM_BOX',label:'Mixed Number Response Box' },
  { id: 'NUM_BOND',    label: 'Number Bond' },
  { id: 'NUM_LINE',    label: 'Number Line' },
  { id: 'PARTIAL_Q',   label: 'Partial Quotients' },
  { id: 'BASE10',      label: 'Place Value Blocks' },
  { id: 'TENS_FRAME',  label: 'Tens Frame' },
  { id: 'VOL_3D',      label: 'Volume (3D Prism / Cube)' },
  { id: 'WORK_SPACE',  label: 'Work Space (blank box)' },
];

// Default params for visual types that need values to render a visible preview
const VISUAL_TYPE_DEFAULTS = {
  FRAC_STRIPS: { aw: '0', an: '3', d: '4', op: '+', bw: '0', bn: '3', d2: '', cross: '0', crossWh: '0' },
  ARRAY:       { rows: '3', cols: '4' },
  NUM_LINE:    { min: '0', max: '10', step: '4' },
  GROUPS:      { groups: '3', each: '4' },
  TENS_FRAME:  { filled: '7' },
  FRACTION:    { n: '3', d: '4' },
  FRAC_CIRCLE: { n: '3', d: '4' },
  BASE10:      { hundreds: '1', tens: '2', ones: '3' },
  BAR_MODEL:   { vals: '4,4,4,4', label: '?' },
  VOL_3D:      { l: '3', w: '2', h: '2', formula: 'yes', cubelines: 'yes', lbl_l: '', lbl_w: '', lbl_h: '' },
  SHAPE_2D:    { shape: 'rectangle', labels: '', color: '#dbeafe' },
};

function VisualParamForm({ type, params, onChange }) {
  const set = (k, v) => onChange({ ...params, [k]: v });
  const inp = (label, key, rest = {}) => (
    <label className="text-xs flex items-center gap-1">
      {label}
      <input value={params[key] ?? ''} onChange={e => set(key, e.target.value)}
        className="border rounded p-1 w-20 ml-1" {...rest} />
    </label>
  );
  switch (type) {
    case 'ARRAY':
      return <div className="flex gap-2">{inp('Rows', 'rows', { type: 'number', min: 1, max: 12 })}{inp('Cols', 'cols', { type: 'number', min: 1, max: 12 })}</div>;
    case 'NUM_LINE':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {inp('Min', 'min', { type: 'number', step: 'any' })}
            {inp('Max', 'max', { type: 'number', step: 'any' })}
            {inp('Divisions', 'step', { type: 'number', min: 1, max: 60, step: '1', placeholder: '4' })}
          </div>
          {/* Label positions */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Show labels at:</p>
            <div className="flex gap-3 flex-wrap">
              {[['', 'Endpoints only'], ['all', 'All ticks'], ['custom', 'Custom positions']].map(([val, lbl]) => (
                <label key={val} className="text-xs flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={(params.show || '') === val}
                    onChange={() => set('show', val)} />
                  {lbl}
                </label>
              ))}
            </div>
            {params.show === 'custom' && (
              <div className="flex flex-col gap-0.5">
                <input value={params.labelAt || ''} onChange={e => set('labelAt', e.target.value)}
                  className="border rounded p-1 w-full font-mono text-xs"
                  placeholder="e.g. 0, 1/4, 1/2, 3/4, 1  or  0, 0.5, 1" />
                <span className="text-xs text-slate-400">Comma-separated — fractions like 1/4 and mixed numbers like 1 1/2 are supported</span>
              </div>
            )}
          </div>
          {/* Label format */}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-600">Label format:</p>
            <div className="flex gap-3">
              {[['decimal', 'Decimal (0.5, 1.25…)'], ['fraction', 'Fraction (1/2, 1 1/4…)']].map(([val, lbl]) => (
                <label key={val} className="text-xs flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={(params.labelFmt || 'decimal') === val}
                    onChange={() => set('labelFmt', val)} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={params.jumps === 'yes'} onChange={e => set('jumps', e.target.checked ? 'yes' : '')} />
              <strong>Jumps/Arcs</strong>
            </label>
            {params.jumps === 'yes' && (
              <>
                {/* Operation model buttons — two groups */}
                <div className="flex flex-col gap-1 w-full">
                  <p className="text-xs text-gray-500">Model type</p>
                  <div className="flex gap-1">
                    {[{op:'+',label:'+ Add'},{op:'-',label:'− Subtract'},{op:'×',label:'× Multiply'},{op:'÷',label:'÷ Divide'}].map(({op,label}) => {
                      const active = (params.hop_op || '+') === op;
                      return (
                        <button key={op} type="button"
                          onClick={() => set('hop_op', op)}
                          className={`flex-1 text-xs py-1 px-1 rounded border font-medium transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {inp('Amount / Factor', 'hop_size', { type: 'number', min: 0.01, step: 'any', placeholder: '= 1 step' })}
                {inp('Start at', 'hop_start', { type: 'number', step: 'any', placeholder: 'auto' })}
                <label className="text-xs flex flex-col gap-0.5 w-full">
                  <span className="font-medium">Custom hops (from:to, …)</span>
                  <input value={params.hops || ''} onChange={e => set('hops', e.target.value)}
                    className="border rounded p-1 w-full font-mono text-xs"
                    placeholder="e.g. 0:1/4, 1/4:1/2, 1/2:3/4" />
                  <span className="text-slate-400 text-xs">Supports fractions (1/4), mixed numbers (1 1/2), and decimals (0.25). Overrides operation if filled.</span>
                </label>
              </>
            )}
          </div>
          {params.jumps === 'yes' && (
            <p className="text-xs text-slate-400">
              + − go left/right · × ÷ use start value · custom hops override all
            </p>
          )}
        </div>
      );
    case 'GROUPS':
      return <div className="flex gap-2">{inp('Groups', 'groups', { type: 'number', min: 1, max: 8 })}{inp('Items each', 'items', { type: 'number', min: 1, max: 10 })}</div>;
    case 'TENS_FRAME':
      return (
        <div className="flex gap-2">
          {inp('Filled', 'filled', { type: 'number', min: 0, max: 10 })}
          <label className="text-xs flex items-center gap-1">Total
            <select value={params.total || 10} onChange={e => set('total', e.target.value)} className="border rounded p-1 ml-1">
              <option value="10">10</option><option value="5">5</option>
            </select>
          </label>
        </div>
      );
    case 'NUM_BOND':
      return <div className="flex flex-wrap gap-2">{inp('Whole', 'whole')}{inp('Part 1', 'part1')}{inp('Part 2', 'part2')}</div>;
    case 'FRACTION':
    case 'FRAC_CIRCLE':
      return (
        <div className="space-y-1">
          <div className="flex gap-2">{inp('Numerator', 'n', { type: 'number', min: 0 })}{inp('Denominator', 'd', { type: 'number', min: 1 })}</div>
          <p className="text-xs text-slate-400">Tip: if numerator &gt; denominator, renders as improper fraction (multiple bars/circles)</p>
        </div>
      );
    case 'MIXED_NUM_BOX':
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Pre-fill values (leave blank for empty student boxes)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Whole # (opt)</span>
              <input type="text" value={params.whole ?? ''}
                onChange={e => set('whole', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="e.g. 2" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Numerator (opt)</span>
              <input type="text" value={params.n ?? ''}
                onChange={e => set('n', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="blank" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Denominator (opt)</span>
              <input type="text" value={params.d ?? ''}
                onChange={e => set('d', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="blank" />
            </div>
          </div>
        </div>
      );
    case 'FRACTION_BOX':
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Pre-fill values (leave blank for empty student boxes)</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Numerator (opt)</span>
              <input type="text" value={params.n ?? ''}
                onChange={e => set('n', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="blank" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Denominator (opt)</span>
              <input type="text" value={params.d ?? ''}
                onChange={e => set('d', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="blank" />
            </div>
          </div>
        </div>
      );
    case 'MIXED_NUM':
    case 'MIXED_CIRCLE':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Whole #</span>
              <input type="number" min={0} value={params.whole ?? ''}
                onChange={e => set('whole', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="e.g. 2" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Numerator</span>
              <input type="number" min={0} value={params.n ?? ''}
                onChange={e => set('n', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="e.g. 1" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Denominator</span>
              <input type="number" min={1} value={params.d ?? ''}
                onChange={e => set('d', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="e.g. 3" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Example: Whole=2, N=1, D=3 → shows 2 and 1/3</p>
        </div>
      );
    case 'AREA_MODEL':
      return (
        <div className="space-y-1">
          <label className="text-xs block">Column values (comma-sep) <input value={params.cols || ''} onChange={e => set('cols', e.target.value)} placeholder="e.g. 20,3 or 200,40,7" className="border rounded p-1 w-36 ml-1" /></label>
          <label className="text-xs block">Row values (comma-sep) <input value={params.rows || ''} onChange={e => set('rows', e.target.value)} placeholder="e.g. 10,4 or 30,2" className="border rounded p-1 w-36 ml-1" /></label>
          <label className="text-xs block">Cell values (optional, comma-sep) <input value={params.vals || ''} onChange={e => set('vals', e.target.value)} placeholder="e.g. 200,6,400,12" className="border rounded p-1 w-36 ml-1" /></label>
          <p className="text-xs text-slate-400">Multi-digit: cols=20,3 rows=10,4 → 2×2 grid for 23×14</p>
        </div>
      );
    case 'BASE10':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Thousands</span>
              <input type="number" min={0} max={20} value={params.thousands ?? ''}
                onChange={e => set('thousands', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="0–20" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Hundreds</span>
              <input type="number" min={0} max={20} value={params.hundreds ?? ''}
                onChange={e => set('hundreds', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="0–20" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Tens</span>
              <input type="number" min={0} max={20} value={params.tens ?? ''}
                onChange={e => set('tens', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="0–20" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 font-medium">Ones</span>
              <input type="number" min={0} max={20} value={params.ones ?? ''}
                onChange={e => set('ones', e.target.value)}
                className="border rounded p-1 w-full text-sm" placeholder="0–20" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Purple cubes=1000s · dark squares=100s · rods=10s · cubes=1s (max 20 — use above 9 for regrouping)</p>
        </div>
      );
    case 'BAR_MODEL':
      return (
        <div className="space-y-1">
          <div className="text-xs block"><span>Segment values (comma-sep) </span><input value={params.vals || ''} onChange={e => set('vals', e.target.value)} placeholder="e.g. 4,4,4,4" className="border rounded p-1 w-32 ml-1" /></div>
          <div className="text-xs block"><span>Label (optional) </span><input value={params.label || ''} onChange={e => set('label', e.target.value)} className="border rounded p-1 w-24 ml-1" /></div>
        </div>
      );
    case 'FRAC_STRIPS': {
      const fsOp = params.op || '+';
      const isAddOp = fsOp === '+';
      return (
        <div className="space-y-3">
          {/* Operation */}
          <div className="flex gap-4 items-center">
            <span className="text-xs font-medium text-gray-700">Operation:</span>
            {[{v:'+', l:'＋ Addition'}, {v:'-', l:'− Subtraction'}].map(({v,l}) => (
              <label key={v} className="text-xs flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={fsOp === v} onChange={() => set('op', v)} />
                {l}
              </label>
            ))}
          </div>
          {/* Group A */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700">Group A (blue strips):</p>
            <div className="flex gap-2 flex-wrap">
              {inp('Whole #', 'aw', { type:'number', min:0, max:10, placeholder:'0' })}
              {inp('Numerator', 'an', { type:'number', min:0, placeholder:'0' })}
              {inp('Denominator', 'd', { type:'number', min:2, max:24 })}
            </div>
          </div>
          {/* Group B */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-700">
              {isAddOp ? 'Group B (gold strips — second addend):' : 'Group B (gold strips — optional subtrahend):'}
            </p>
            <div className="flex gap-2 flex-wrap">
              {inp('Whole #', 'bw', { type:'number', min:0, max:10, placeholder:'0' })}
              {inp('Numerator', 'bn', { type:'number', min:0, placeholder:'0' })}
              {inp('Denom', 'd2', { type:'number', min:2, max:24, placeholder:'same' })}
            </div>
            {!isAddOp && <p className="text-xs text-slate-400">Leave at 0 to hide Group B; set values to show the subtrahend separately.</p>}
          </div>
          {/* Cross out (subtraction only) */}
          {!isAddOp && (
            <div className="space-y-2 bg-red-50 rounded p-2">
              <p className="text-xs font-semibold text-red-700">Cross out (subtraction):</p>
              <div className="flex gap-2 flex-wrap">
                {inp('Whole #s to ✕', 'crossWh', { type:'number', min:0, placeholder:'0' })}
                {inp('Fraction sections to ✕', 'cross', { type:'number', min:0, placeholder:'0' })}
              </div>
              <p className="text-xs text-slate-500">Crosses out the last N whole strips and/or fraction sections of Group A with red ✕ marks.</p>
            </div>
          )}
        </div>
      );
    }
    case 'DATA_TABLE':
      return (
        <div className="space-y-1">
          <label className="text-xs block">Column headers (comma-sep) <input value={params.header || 'Category,Count'} onChange={e => set('header', e.target.value)} className="border rounded p-1 w-full mt-0.5" /></label>
          <label className="text-xs block">Rows — one per line, values comma-sep
            <textarea value={params.rowsText || ''} onChange={e => set('rowsText', e.target.value)}
              className="border rounded p-1 w-full h-20 font-mono text-xs mt-0.5" placeholder={"Apples,5\nBananas,8"} />
          </label>
        </div>
      );
    case 'PARTIAL_Q': {
      // Parse steps string "sub:pq,sub:pq" → editable rows
      const raw = params.steps || '';
      const stepRows = raw.split(',').filter(Boolean).map(s => {
        const [a, b] = s.split(':');
        return { sub: a || '', pq: b || '' };
      });
      if (stepRows.length === 0) stepRows.push({ sub: '', pq: '' });

      // Serialize rows to steps string — empties stay as ":" so UI keeps them visible
      const serializeRows = rows => rows.map(r => `${r.sub}:${r.pq}`).join(',');
      // For the marker we strip truly empty rows (handled in PartialQuotients filter)

      const updateRow = (i, field, val) => {
        const next = stepRows.map((r, j) => j === i ? { ...r, [field]: val } : r);
        onChange({ ...params, steps: serializeRows(next) });
      };
      // addRow: add a blank row (stored as ":" which the SVG's filter(sub>0) safely ignores)
      const addRow = () => {
        const next = [...stepRows, { sub: '', pq: '' }];
        onChange({ ...params, steps: serializeRows(next) });
      };
      const removeRow = i => {
        const next = stepRows.filter((_, j) => j !== i);
        onChange({ ...params, steps: serializeRows(next.length ? next : [{ sub: '', pq: '' }]) });
      };

      // Live remainder preview
      let rem = parseFloat(params.dividend) || 0;
      const remainders = stepRows.map(({ sub }) => {
        rem -= parseFloat(sub) || 0;
        return rem;
      });

      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {inp('Dividend', 'dividend', { type: 'number', min: 0 })}
            {inp('Divisor', 'divisor', { type: 'number', min: 1, placeholder: 'optional' })}
          </div>
          <p className="text-xs font-medium text-gray-600">Steps</p>
          <div className="space-y-1">
            {stepRows.map((row, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-xs text-gray-400 w-4">−</span>
                <input value={row.sub} onChange={e => updateRow(i, 'sub', e.target.value)}
                  className="border rounded p-1 w-20 text-xs" placeholder="amount" type="number" min={0} />
                <span className="text-xs text-gray-400">pq:</span>
                <input value={row.pq} onChange={e => updateRow(i, 'pq', e.target.value)}
                  className="border rounded p-1 w-16 text-xs" placeholder="quot" type="number" min={0} />
                {remainders[i] !== undefined && (
                  <span className="text-xs text-slate-400 ml-1">= {Math.round(remainders[i] * 1000) / 1000}</span>
                )}
                <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs ml-0.5">✕</button>
              </div>
            ))}
            <button type="button" onClick={addRow}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1">+ Add step</button>
          </div>
          <p className="text-xs text-slate-400">Each step: amount subtracted · pq = partial quotient</p>
        </div>
      );
    }
    case 'VOL_3D':
      return (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {inp('Length', 'l', { type: 'number', min: 1, max: 8 })}
            {inp('Width', 'w', { type: 'number', min: 1, max: 8 })}
            {inp('Height', 'h', { type: 'number', min: 1, max: 8 })}
          </div>
          <div className="flex gap-2 flex-wrap">
            {inp('Label L', 'lbl_l', { placeholder: 'e.g. 5 cm' })}
            {inp('Label W', 'lbl_w', { placeholder: 'e.g. 3 cm' })}
            {inp('Label H', 'lbl_h', { placeholder: 'e.g. 2 cm' })}
          </div>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={params.formula !== 'no'}
              onChange={e => set('formula', e.target.checked ? 'yes' : 'no')} />
            Show volume formula
          </label>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={params.cubelines !== 'no'}
              onChange={e => set('cubelines', e.target.checked ? 'yes' : 'no')} />
            Show cube unit lines
          </label>
        </div>
      );
    case 'SHAPE_2D': {
      const SHAPE_OPTS = [
        { v: 'equilateral', l: 'Equilateral Triangle', n: 3 },
        { v: 'right',       l: 'Right Triangle',       n: 3 },
        { v: 'isosceles',   l: 'Isosceles Triangle',   n: 3 },
        { v: 'square',      l: 'Square',                n: 4 },
        { v: 'rectangle',   l: 'Rectangle',             n: 4 },
        { v: 'rhombus',     l: 'Rhombus',               n: 4 },
        { v: 'parallelogram',l:'Parallelogram',          n: 4 },
        { v: 'quadrilateral',l:'Quadrilateral',          n: 4 },
        { v: 'pentagon',    l: 'Pentagon',               n: 5 },
        { v: 'hexagon',     l: 'Hexagon',                n: 6 },
        { v: 'octagon',     l: 'Octagon',                n: 8 },
        { v: 'circle',      l: 'Circle',                 n: 1 },
        { v: 'oval',        l: 'Oval',                   n: 2 },
      ];
      const SIDE_NAMES = {
        equilateral: ['Side A','Side B','Side C'],
        right:       ['Base','Height','Hypotenuse'],
        isosceles:   ['Base','Leg B','Leg C'],
        square:      ['Side A','Side B','Side C','Side D'],
        rectangle:   ['Length (top)','Width (right)','Length (bottom)','Width (left)'],
        rhombus:     ['Side A','Side B','Side C','Side D'],
        parallelogram:['Side A','Side B','Side C','Side D'],
        quadrilateral:['Side A','Side B','Side C','Side D'],
        pentagon:    ['Side 1','Side 2','Side 3','Side 4','Side 5'],
        hexagon:     ['Side 1','Side 2','Side 3','Side 4','Side 5','Side 6'],
        octagon:     ['Side 1','Side 2','Side 3','Side 4','Side 5','Side 6','Side 7','Side 8'],
        circle:      ['Radius / Label'],
        oval:        ['Width label','Height label'],
      };
      const currentShape = params.shape || 'rectangle';
      const shapeInfo = SHAPE_OPTS.find(s => s.v === currentShape) || SHAPE_OPTS[4];
      const nSides = shapeInfo.n;
      const sideNames = SIDE_NAMES[currentShape] || Array.from({ length: nSides }, (_, i) => `Side ${i+1}`);
      const lblArr = String(params.labels || '').split(',');
      while (lblArr.length < nSides) lblArr.push('');
      const updateLabel = (i, val) => {
        const next = [...lblArr]; next[i] = val;
        set('labels', next.slice(0, nSides).join(','));
      };
      return (
        <div className="space-y-2">
          <label className="text-xs flex items-center gap-1">
            Shape
            <select value={currentShape}
              onChange={e => onChange({ ...params, shape: e.target.value, labels: '' })}
              className="border rounded p-1 text-xs ml-1 flex-1">
              {SHAPE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
          <label className="text-xs flex items-center gap-2">
            Fill color
            <input type="color" value={params.color || '#dbeafe'}
              onChange={e => set('color', e.target.value)}
              className="w-8 h-6 border rounded cursor-pointer" />
          </label>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Side labels (optional):</p>
            {sideNames.map((name, i) => (
              <label key={i} className="text-xs flex items-center gap-1">
                <span className="w-28 shrink-0 text-gray-500">{name}</span>
                <input value={lblArr[i] || ''} onChange={e => updateLabel(i, e.target.value)}
                  placeholder="e.g. 5 cm" className="border rounded p-1 w-20 text-xs" />
              </label>
            ))}
          </div>
        </div>
      );
    }
    default: return null;
  }
}

function paramsToMarker(type, params) {
  if (!type || type === 'none' || type === 'custom' || type === 'DRAW') return null;
  if (type === 'WORK_SPACE') return '[WORK_SPACE]';
  if (type === 'ARRAY') return `[ARRAY: rows=${params.rows || 3} cols=${params.cols || 4}]`;
  if (type === 'NUM_LINE') {
    let m = `[NUM_LINE: min=${params.min ?? 0} max=${params.max ?? 20} step=${params.step ?? 4}`;
    if (params.jumps === 'yes') {
      m += ' jumps=yes';
      if (params.hops && String(params.hops).trim()) {
        m += ` hops=${String(params.hops).trim()}`;
      } else {
        if (params.hop_op && params.hop_op !== '+') m += ` hop_op=${params.hop_op}`;
        if (params.hop_size) m += ` hop_size=${params.hop_size}`;
        if (params.hop_start !== undefined && params.hop_start !== '') m += ` hop_start=${params.hop_start}`;
      }
    }
    if (params.show === 'all') m += ' show=all';
    if (params.show === 'custom' && params.labelAt?.trim()) {
      m += ` show=custom labelat=${params.labelAt.replace(/\s+/g, '')}`;
    }
    if (params.labelFmt === 'fraction') m += ' labelfmt=fraction';
    return m + ']';
  }
  if (type === 'GROUPS') return `[GROUPS: groups=${params.groups || 3} items=${params.items || 4}]`;
  if (type === 'TENS_FRAME') return `[TENS_FRAME: filled=${params.filled ?? 5} total=${params.total || 10}]`;
  if (type === 'NUM_BOND') return `[NUM_BOND: whole=${params.whole || ''} part1=${params.part1 || ''} part2=${params.part2 || '?'}]`;
  if (type === 'FRACTION') return `[FRACTION: ${params.n || 1}/${params.d || 4}]`;
  if (type === 'FRAC_CIRCLE') return `[FRAC_CIRCLE: ${params.n || 1}/${params.d || 4}]`;
  if (type === 'MIXED_NUM') return `[MIXED_NUM: whole=${params.whole || 1} n=${params.n || 1} d=${params.d || 3}]`;
  if (type === 'MIXED_CIRCLE') return `[MIXED_CIRCLE: whole=${params.whole || 1} n=${params.n || 1} d=${params.d || 3}]`;
  if (type === 'MIXED_NUM_BOX') {
    const parts = [];
    if (params.whole) parts.push(`whole=${params.whole}`);
    if (params.n) parts.push(`n=${params.n}`);
    if (params.d) parts.push(`d=${params.d}`);
    return parts.length ? `[MIXED_NUM_BOX: ${parts.join(' ')}]` : '[MIXED_NUM_BOX]';
  }
  if (type === 'FRACTION_BOX') {
    const parts = [];
    if (params.n) parts.push(`n=${params.n}`);
    if (params.d) parts.push(`d=${params.d}`);
    return parts.length ? `[FRACTION_BOX: ${parts.join(' ')}]` : '[FRACTION_BOX]';
  }
  if (type === 'BASE10') return `[BASE10: thousands=${params.thousands || 0} hundreds=${params.hundreds || 0} tens=${params.tens || 0} ones=${params.ones || 0}]`;
  if (type === 'AREA_MODEL') {
    let m = `[AREA_MODEL: cols=${params.cols || '20,7'} rows=${params.rows || '10,4'}`;
    if (params.vals) m += ` vals=${params.vals}`;
    return m + ']';
  }
  if (type === 'BAR_MODEL') {
    let m = `[BAR_MODEL: ${params.vals || '5,3'}`;
    if (params.label) m += ` | label=${params.label}`;
    return m + ']';
  }
  if (type === 'FRAC_STRIPS') {
    const isAdd = (params.op || '+') === '+';
    let m = `[FRAC_STRIPS: aw=${params.aw || 0} an=${params.an || 0} d=${params.d || 4} op=${params.op || '+'}`;
    if (isAdd) {
      m += ` bw=${params.bw || 0} bn=${params.bn || 0}`;
      if (params.d2 && params.d2 !== params.d) m += ` bd=${params.d2}`;
    } else {
      if (params.crossWh && parseInt(params.crossWh) > 0) m += ` crossWh=${params.crossWh}`;
      if (params.cross && parseInt(params.cross) > 0) m += ` cross=${params.cross}`;
      if (params.bw || params.bn) m += ` bw=${params.bw || 0} bn=${params.bn || 0}`;
    }
    return m + ']';
  }
  if (type === 'DATA_TABLE') {
    const rows = (params.rowsText || '').split('\n').filter(Boolean);
    return `[DATA_TABLE: header=${params.header || 'Category,Count'} | ${rows.join(' | ')}]`;
  }
  if (type === 'PARTIAL_Q') {
    let m = `[PARTIAL_Q: dividend=${params.dividend || 0}`;
    if (params.divisor) m += ` divisor=${params.divisor}`;
    if (params.steps) m += ` steps=${params.steps}`;
    return m + ']';
  }
  if (type === 'VOL_3D') {
    const enc = s => String(s || '').replace(/\s+/g, '_');
    let m = `[VOL_3D: l=${params.l || 3} w=${params.w || 2} h=${params.h || 2} formula=${params.formula || 'yes'}`;
    if (params.cubelines === 'no') m += ` cubelines=no`;
    if (params.lbl_l) m += ` lbl_l=${enc(params.lbl_l)}`;
    if (params.lbl_w) m += ` lbl_w=${enc(params.lbl_w)}`;
    if (params.lbl_h) m += ` lbl_h=${enc(params.lbl_h)}`;
    return m + ']';
  }
  if (type === 'SHAPE_2D') {
    const enc = s => String(s || '').replace(/\s+/g, '_');
    let m = `[SHAPE_2D: shape=${params.shape || 'rectangle'}`;
    if (params.labels) m += ` labels=${enc(params.labels)}`;
    if (params.color && params.color !== '#dbeafe') m += ` color=${params.color}`;
    return m + ']';
  }
  return null;
}

// ─── Math Symbol Toolbar ───────────────────────────────────────────────────────
// Inserts math symbols at cursor position in any <input> or <textarea>
function MathToolbar({ targetRef, onInsert }) {
  const [showFrac, setShowFrac] = useState(false);
  const [fracW, setFracW] = useState('');
  const [fracN, setFracN] = useState('');
  const [fracD, setFracD] = useState('');

  const insert = (sym) => {
    const el = targetRef?.current;
    if (!el) { onInsert?.(sym); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newVal = before + sym + after;
    // Trigger React synthetic event
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeInputSetter) {
      nativeInputSetter.call(el, newVal);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Restore cursor after the inserted symbol
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  const insertFraction = () => {
    const w = fracW.trim(), n = fracN.trim(), d = fracD.trim();
    if (!n || !d) return;
    const str = w ? `${w} ${n}/${d}` : `${n}/${d}`;
    insert(str);
    setShowFrac(false); setFracW(''); setFracN(''); setFracD('');
  };

  const symbols = [
    { label: '+', tip: 'Plus' },
    { label: '−', tip: 'Minus' },
    { label: '×', tip: 'Multiply' },
    { label: '÷', tip: 'Divide' },
    { label: '≠', tip: 'Not equal' },
    { label: '≤', tip: 'Less than or equal' },
    { label: '≥', tip: 'Greater than or equal' },
    { label: '²', tip: 'Squared' },
    { label: '³', tip: 'Cubed' },
    { label: '½', tip: '1/2' },
    { label: '⅓', tip: '1/3' },
    { label: '¼', tip: '1/4' },
    { label: '¾', tip: '3/4' },
    { label: '⅔', tip: '2/3' },
  ];

  return (
    <div className="mb-1">
      <div className="flex flex-wrap gap-1 items-center">
        {symbols.map(({ label, tip }) => (
          <button key={label} type="button" title={tip}
            onClick={() => insert(label)}
            className="w-7 h-7 text-sm border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-400 font-medium text-gray-700 leading-none">
            {label}
          </button>
        ))}
        <button type="button"
          onClick={() => setShowFrac(v => !v)}
          className={`px-2 h-7 text-xs border rounded font-medium ${showFrac ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-blue-50'}`}>
          a/b
        </button>
      </div>
      {showFrac && (
        <div className="mt-1 flex items-center gap-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <input value={fracW} onChange={e => setFracW(e.target.value)}
            className="border rounded p-1 w-10 text-center" placeholder="W" title="Whole number (optional)" />
          <span className="text-gray-400 text-xs">and</span>
          <input value={fracN} onChange={e => setFracN(e.target.value)}
            className="border rounded p-1 w-10 text-center" placeholder="N" title="Numerator" />
          <span className="font-bold">/</span>
          <input value={fracD} onChange={e => setFracD(e.target.value)}
            className="border rounded p-1 w-10 text-center" placeholder="D" title="Denominator" />
          <button type="button" onClick={insertFraction}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Insert</button>
          <span className="text-gray-400 ml-1">Leave W blank for improper/proper fraction</span>
        </div>
      )}
    </div>
  );
}

// ─── Question Form (for Manual Builder) ──────────────────────────────────────
function QuestionForm({ question, questionCount, onSave, onCancel }) {
  const isEdit = !!question?.id;
  const [qType, setQType] = useState(question?.qType || 'mc');
  const [qText, setQText] = useState(question?.text || '');
  const [choices, setChoices] = useState(question?.choices?.length ? question.choices : defaultChoices());
  const [standard, setStandard] = useState(question?.standard || '');
  const [answer, setAnswer] = useState(question?.answer || '');
  const [points, setPoints] = useState(question?.points ?? 1);
  const DEFAULT_LINES = { fill: 2, open: 4, compute: 3, word: 5 };
  const [lineCount, setLineCount] = useState(question?.lineCount ?? null); // null = use default
  const [visualType, setVisualType] = useState(question?._visualType || 'none');
  const [visualParams, setVisualParams] = useState(question?._visualParams || {});
  const [customImg, setCustomImg] = useState(question?._customImg || null);
  const fileRef = useRef();
  const qTextRef = useRef();
  const dropZoneRef = useRef();

  const loadBlob = blob => {
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = ev => setCustomImg(ev.target.result);
    reader.readAsDataURL(blob);
  };

  // Primary: clipboard API button — reads clipboard directly on user click, no focus needed
  const [clipMsg, setClipMsg] = useState('');
  const pasteFromClipboard = async () => {
    setClipMsg('');
    try {
      if (!navigator.clipboard?.read) {
        setClipMsg('Use Ctrl+V with the box focused, or browse for a file.');
        return;
      }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            loadBlob(blob);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) setClipMsg('No image in clipboard — copy an image first, then try again.');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setClipMsg('Clipboard access denied. Allow it in your browser or use "Browse for file" below.');
      } else {
        setClipMsg('Could not read clipboard. Try browsing for a file instead.');
      }
    }
  };

  // Fallback: drop handler
  const handleDrop = e => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
    if (file) loadBlob(file);
  };

  // Fallback: document paste event
  useEffect(() => {
    if (visualType !== 'custom') return;
    const onDocPaste = e => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image'));
      if (item) { e.preventDefault(); loadBlob(item.getAsFile()); }
    };
    document.addEventListener('paste', onDocPaste);
    return () => document.removeEventListener('paste', onDocPaste);
  }, [visualType]); // eslint-disable-line react-hooks/exhaustive-deps

  const marker = visualType === 'DRAW'
    ? (customImg ? '[IMAGE: draw]' : null)
    : visualType === 'custom'
      ? (customImg ? '[IMAGE: custom]' : null)
      : paramsToMarker(visualType, visualParams);
  const hasChoices = qType === 'mc' || qType === 'multiselect';
  const addChoice = () => {
    if (choices.length >= 8) return;
    setChoices(prev => [...prev, { letter: LETTERS[prev.length], text: '' }]);
  };
  const removeChoice = idx => {
    if (choices.length <= 2) return;
    setChoices(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, letter: LETTERS[i] })));
  };

  const previewQ = {
    id: 'preview', type: 'question', qNum: String(questionCount),
    qType,
    text: qText || '(question text)',
    choices: hasChoices ? choices.filter(c => c.text) : [],
    lines: [], marker, standard,
  };

  const handleSave = () => {
    if (!qText.trim()) return;
    onSave({
      id: question?.id || `manual-${Date.now()}`,
      type: 'question', qType,
      qNum: question?.qNum || String(questionCount),
      text: qType === 'multiselect' && !/select all|choose all/i.test(qText) ? qText + ' (Select all that apply.)' : qText,
      choices: hasChoices ? choices.filter(c => c.text) : [],
      lines: [], marker, standard, answer,
      points: Math.max(1, parseInt(points) || 1),
      lineCount: lineCount !== null && lineCount !== '' ? Math.max(1, Math.min(20, parseInt(lineCount) || 1)) : undefined,
      _visualType: visualType, _visualParams: visualParams, _customImg: customImg,
      vb: false,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-gray-700">{isEdit ? 'Edit Question' : `Add Question ${questionCount}`}</h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      {/* Type */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Question Type</p>
        <div className="flex flex-wrap gap-1">
          {Q_TYPES.map(qt => (
            <button key={qt.id} onClick={() => setQType(qt.id)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${qType === qt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {qt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Question Text</p>
        <MathToolbar targetRef={qTextRef} />
        <textarea ref={qTextRef} value={qText} onChange={e => setQText(e.target.value)}
          placeholder={qType === 'fill' ? 'Use ___ for blanks, e.g. "3 × ___ = 12"' : qType === 'compute' ? 'e.g. "432 ÷ 6 ="' : 'Type your question...'}
          className="w-full border rounded p-2 text-sm h-20 resize-none" />
      </div>

      {/* Choices (MC or Multi-select) */}
      {hasChoices && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">
              {qType === 'multiselect' ? 'Answer Choices (checkboxes — multiple correct)' : 'Answer Choices'}
            </p>
            <button onClick={addChoice} disabled={choices.length >= 8}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 font-medium">
              + Add Choice
            </button>
          </div>
          <div className="space-y-1">
            {choices.map((ch, ci) => (
              <div key={ci} className="flex items-center gap-2">
                {qType === 'multiselect'
                  ? <span className="text-xs shrink-0 w-5 h-4 border border-gray-400 rounded-sm inline-block" title="checkbox" />
                  : <span className="text-xs shrink-0 w-4 h-4 border border-gray-400 rounded-full inline-block" title="bubble" />}
                <span className="text-xs font-semibold text-gray-600 w-4 shrink-0">{ch.letter})</span>
                <input value={ch.text} onChange={e => {
                  const nc = [...choices]; nc[ci] = { ...nc[ci], text: e.target.value }; setChoices(nc);
                }} className="flex-1 border rounded p-1 text-sm" placeholder={`Choice ${ch.letter}`} />
                {choices.length > 2 && (
                  <button onClick={() => removeChoice(ci)}
                    className="text-gray-300 hover:text-red-400 text-xs shrink-0 px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          {qType === 'multiselect' && (
            <p className="text-xs text-gray-400 mt-1">Tip: students check all correct answers — consider making 2–3 choices correct.</p>
          )}
        </div>
      )}

      {/* Standard */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Standard (optional)</p>
        <input value={standard} onChange={e => setStandard(e.target.value)}
          placeholder="e.g. 3.OA.A.1" className="border rounded p-1 text-sm w-full" />
      </div>

      {/* Visual */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Visual / Model</p>
        <select value={visualType} onChange={e => { const t = e.target.value; setVisualType(t); setVisualParams(VISUAL_TYPE_DEFAULTS[t] || {}); setCustomImg(null); }}
          className="border rounded p-1.5 text-sm w-full mb-2">
          {VISUAL_TYPES_LIST.map(vt => <option key={vt.id} value={vt.id} style={vt.color ? { color: vt.color, fontWeight: 'bold' } : {}}>{vt.label}</option>)}
        </select>

        {visualType !== 'none' && visualType !== 'custom' && visualType !== 'DRAW' && (
          <div className="bg-gray-50 rounded p-2 space-y-2">
            <VisualParamForm type={visualType} params={visualParams} onChange={setVisualParams} />
            {marker && (
              <div className="border-t border-gray-200 pt-2 mt-1">
                <p className="text-xs text-gray-400 mb-1">Preview:</p>
                <div className="overflow-x-auto">
                  <ErrorBoundary><div>{parseVisualModel(marker)}</div></ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        )}

        {visualType === 'custom' && (
          <div className="space-y-2">
            {customImg ? (
              <div className="text-center">
                <img src={customImg} alt="custom" className="max-h-28 mx-auto border rounded mb-1" />
                <button type="button" onClick={() => setCustomImg(null)}
                  className="text-xs text-red-500 hover:underline">Remove image</button>
              </div>
            ) : (
              <>
                {/* Primary: clipboard API button */}
                <button type="button" onClick={pasteFromClipboard}
                  className="w-full py-3 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 active:bg-blue-200 transition-colors">
                  📋 Paste Image from Clipboard
                </button>
                {clipMsg && <p className="text-xs text-amber-600">{clipMsg}</p>}

                {/* Drag-and-drop fallback */}
                <div ref={dropZoneRef}
                  className="border-2 border-dashed border-gray-200 rounded p-3 text-center text-xs text-gray-400"
                  onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                  or drag and drop an image here
                </div>

                {/* File browse fallback */}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full text-xs border border-gray-300 rounded py-1.5 text-gray-500 hover:bg-gray-50">
                  📁 Browse for image file…
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (f) loadBlob(f); }} />
              </>
            )}
          </div>
        )}

        {/* Freehand draw */}
        {visualType === 'DRAW' && (
          <div className="bg-gray-50 rounded p-2">
            <DrawingCanvas existingImg={customImg} onCapture={setCustomImg} />
          </div>
        )}
      </div>

      {/* Points + Answer Key row */}
      <div className="flex gap-3 items-start">
        <div className="shrink-0 w-24">
          <label className="text-xs font-medium text-gray-600 block mb-1">Points</label>
          <input type="number" min="1" max="100" value={points}
            onChange={e => setPoints(e.target.value)}
            className="w-full border rounded p-1.5 text-sm text-center" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Correct Answer <span className="text-gray-400 font-normal">(for answer key — optional)</span>
          </label>
        {hasChoices && choices.filter(c => c.text).length > 0 ? (
          <select value={answer} onChange={e => setAnswer(e.target.value)}
            className="w-full border rounded p-1.5 text-sm">
            <option value="">— select correct answer —</option>
            {choices.filter(c => c.text).map(c => (
              <option key={c.letter} value={c.letter}>{c.letter}) {c.text.slice(0, 50)}</option>
            ))}
          </select>
        ) : (
          <input value={answer} onChange={e => setAnswer(e.target.value)}
            className="w-full border rounded p-1.5 text-sm"
            placeholder="e.g. 42, 3/4, Sample response..." />
        )}
        </div>
      </div>

      {/* Answer lines — only for non-MC types */}
      {!hasChoices && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 shrink-0">Answer lines</label>
          <input type="number" min="1" max="20"
            value={lineCount ?? DEFAULT_LINES[qType] ?? 3}
            onChange={e => setLineCount(e.target.value)}
            className="w-16 border rounded p-1.5 text-sm text-center" />
          <span className="text-xs text-gray-400">(default: {DEFAULT_LINES[qType] ?? 3})</span>
        </div>
      )}

      {/* Preview */}
      {qText && (
        <div className="border rounded p-3 bg-gray-50">
          <p className="text-xs text-gray-400 mb-1">Preview:</p>
          <ErrorBoundary>
            <AssessmentPreviewSingle q={previewQ} customImg={(visualType === 'custom' || visualType === 'DRAW') ? customImg : null} />
          </ErrorBoundary>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border rounded border-gray-300 hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={!qText.trim()}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {isEdit ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </div>
  );
}

// Single-question preview (used inside QuestionForm)
function AssessmentPreviewSingle({ q, customImg }) {
  const visualComponent = customImg
    ? <img src={customImg} alt="custom" className="max-h-28 border rounded mb-1" />
    : q.marker
      ? (q.marker.startsWith('[IMAGE:')
        ? <div className="border-2 border-dashed border-orange-300 rounded p-2 text-xs text-orange-600 bg-orange-50 mb-1">⚠ Image placeholder</div>
        : <div className="mb-1"><ErrorBoundary>{parseVisualModel(q.marker)}</ErrorBoundary></div>)
      : null;
  return (
    <div className="font-serif text-gray-900 text-sm">
      {visualComponent}
      <div className="flex gap-1">
        {q.qNum && <span className="font-semibold shrink-0">{q.qNum}.</span>}
        <div>
          {q.text}
          {q.choices.length > 0 && (() => {
            const isMultiselect = q.qType === 'multiselect' || /select all|choose all/i.test(q.text || '');
            return (
              <div className="mt-1 ml-2 space-y-0.5">
                {q.choices.map((ch, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    {isMultiselect
                      ? <span className="mt-0.5 shrink-0 w-3 h-3 border border-gray-500 rounded-sm inline-block" />
                      : <span className="mt-0.5 shrink-0 w-3 h-3 border border-gray-500 rounded-full inline-block" />}
                    <span><span className="font-medium">{ch.letter})</span> {ch.text}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Manual Builder ───────────────────────────────────────────────────────────
function ManualBuilder({ onPrint, onCopyGdoc, onExportDocx }) {
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [customVisuals, setCustomVisuals] = useState({});
  const [editingVisual, setEditingVisual] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionText, setEditingSectionText] = useState('');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [showNameLine, setShowNameLine] = useState(true);
  const [showDateLine, setShowDateLine] = useState(true);
  const [showClassLine, setShowClassLine] = useState(false);
  const [showScoreLine, setShowScoreLine] = useState(true);
  const [fontSize, setFontSize] = useState('normal');   // 'normal' | 'large' | 'xl'
  const [twoColChoices, setTwoColChoices] = useState(false);
  const [formsScript, setFormsScript] = useState(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ab-manual');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.questions?.length) {
          setQuestions(d.questions);
          setTitle(d.title || '');
          setCustomVisuals(d.customVisuals || {});
          setIncludeAnswerKey(d.includeAnswerKey || false);
          if (d.showNameLine !== undefined) setShowNameLine(d.showNameLine);
          if (d.showDateLine !== undefined) setShowDateLine(d.showDateLine);
          if (d.showClassLine !== undefined) setShowClassLine(d.showClassLine);
          if (d.showScoreLine !== undefined) setShowScoreLine(d.showScoreLine);
          if (d.fontSize) setFontSize(d.fontSize);
          if (d.twoColChoices !== undefined) setTwoColChoices(d.twoColChoices);
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save to localStorage on every meaningful change
  useEffect(() => {
    try {
      localStorage.setItem('ab-manual', JSON.stringify({
        questions, title, customVisuals, includeAnswerKey,
        showNameLine, showDateLine, showClassLine, showScoreLine,
        fontSize, twoColChoices,
      }));
    } catch {} // quota exceeded (large images) — silently ignore
  }, [questions, title, customVisuals, includeAnswerKey, showNameLine, showDateLine, showClassLine, showScoreLine, fontSize, twoColChoices]);

  // Sync _customImg from question objects → customVisuals so images always render in preview
  useEffect(() => {
    const allQsNow = [...(title ? [{ id: 'title', type: 'header', text: title }] : []), ...questions];
    let changed = false;
    const next = { ...customVisuals };
    allQsNow.forEach((q) => {
      if (q._customImg && next[q.id]?.customImg !== q._customImg) {
        next[q.id] = { marker: q.marker || '[IMAGE: custom]', customImg: q._customImg };
        changed = true;
      }
    });
    if (changed) setCustomVisuals(next);
  }, [questions, title]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = q => {
    let newQuestions;
    if (editingQ) {
      newQuestions = questions.map(pq => pq.id === editingQ.id ? q : pq);
    } else {
      const num = questions.filter(x => x.type === 'question').length + 1;
      newQuestions = [...questions, { ...q, qNum: String(num) }];
    }
    setQuestions(newQuestions);

    // Immediately sync _customImg → customVisuals so the image shows right away.
    // This avoids a render cycle where hasCvOverride=true with a stale null cv.customImg.
    if (q._customImg) {
      setCustomVisuals(prev => ({
        ...prev,
        [q.id]: { marker: q.marker || '[IMAGE: custom]', customImg: q._customImg },
      }));
    }

    setShowForm(false);
    setEditingQ(null);
  };

  const deleteQ = id => setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, qNum: String(i + 1) })));

  const addSection = () => {
    const id = `section-${Date.now()}`;
    setQuestions(prev => [...prev, { id, type: 'section', text: 'Section Title' }]);
    setEditingSectionId(id);
    setEditingSectionText('Section Title');
    setShowForm(false);
  };
  const saveSectionEdit = id => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text: editingSectionText || q.text } : q));
    setEditingSectionId(null);
  };

  const duplicateQ = id => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: `manual-${Date.now()}` };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return next.map((q, i) => ({ ...q, qNum: String(i + 1) }));
    });
  };
  const dragIdx = useRef(null);
  const reorderByDrag = toIdx => {
    const fromIdx = dragIdx.current;
    dragIdx.current = null;
    if (fromIdx === null || fromIdx === toIdx) return;
    setQuestions(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((q, i) => ({ ...q, qNum: String(i + 1) }));
    });
    setCustomVisuals({});
  };

  const headerQ = title ? [{ id: 'title', type: 'header', text: title }] : [];
  const qCount = questions.filter(q => q.type === 'question').length;

  // Build answer key rows from questions that have an answer filled in
  const answerKeyRows = questions
    .filter(q => q.type === 'question' && q.answer)
    .map(q => {
      let text = `${q.qNum}.`;
      if ((q.qType === 'mc' || q.qType === 'multiselect') && q.choices?.length) {
        const choice = q.choices.find(c => c.letter === q.answer);
        text += ` ${q.answer}${choice ? ` — ${choice.text}` : ''}`;
      } else {
        text += ` ${q.answer}`;
      }
      return { id: `ak-${q.id}`, type: 'answer-key', text };
    });
  const akSection = includeAnswerKey && answerKeyRows.length > 0
    ? [{ id: 'ak-div', type: 'ak-divider' }, ...answerKeyRows]
    : [];
  const allQs = [...headerQ, ...questions, ...akSection];
  const totalPoints = questions.filter(q => q.type === 'question').reduce((sum, q) => sum + (parseInt(q.points) || 1), 0);

  return (
    <div className="flex gap-6">
      {/* Left — question list */}
      <div className="w-80 shrink-0 space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assessment Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 3.OA.1 Multiplication Check-In"
            className="w-full border rounded p-2 text-sm" />
        </div>

        {/* Student header — always visible, right below title */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Student Header</p>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={showNameLine} onChange={e => setShowNameLine(e.target.checked)} />
            <span className="text-gray-700">Name line</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={showDateLine} onChange={e => setShowDateLine(e.target.checked)} />
            <span className="text-gray-700">Date line</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={showScoreLine} onChange={e => setShowScoreLine(e.target.checked)} />
            <span className="text-gray-700">Score line</span>
          </label>
        </div>

        {/* Layout panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Layout</p>
          <div>
            <p className="text-xs text-gray-500 mb-1">Font Size</p>
            <div className="flex gap-1">
              {[['normal','Normal'],['large','Large'],['xl','X-Large']].map(([val, label]) => (
                <button key={val} onClick={() => setFontSize(val)}
                  className={`flex-1 text-xs py-1 rounded border transition-colors font-medium ${fontSize === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={twoColChoices} onChange={e => setTwoColChoices(e.target.checked)} />
            <span className="text-gray-700">2-column answer choices</span>
          </label>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions ({qCount})</p>
            <div className="flex items-center gap-1.5">
              {questions.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Clear all questions and start a new assessment?')) { setQuestions([]); setTitle(''); setCustomVisuals({}); setIncludeAnswerKey(false); setEditingSectionId(null); localStorage.removeItem('ab-manual'); } }}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-md px-2 py-1 transition-colors">
                  Clear
                </button>
              )}
              <button onClick={addSection}
                className="text-xs text-gray-600 border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50 font-medium transition-colors" title="Add section divider">
                ─ Section
              </button>
              <button onClick={() => { setEditingQ(null); setShowForm(!showForm); setEditingSectionId(null); }}
                className="text-xs bg-blue-600 text-white rounded-md px-2.5 py-1 hover:bg-blue-700 shadow-sm font-medium transition-colors">+ Add</button>
            </div>
          </div>

          {questions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No questions yet — click Add to begin</p>
          )}

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {questions.map((q, idx) => {
              if (q.type === 'section') {
                return (
                  <div key={q.id}
                    draggable
                    onDragStart={() => { dragIdx.current = idx; }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => reorderByDrag(idx)}
                    className="group cursor-default select-none">
                    {editingSectionId === q.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingSectionText}
                          onChange={e => setEditingSectionText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveSectionEdit(q.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                          className="flex-1 border rounded px-1.5 py-1 text-xs font-semibold"
                          placeholder="e.g. Part I: Multiple Choice"
                        />
                        <button onClick={() => saveSectionEdit(q.id)} className="text-green-600 text-xs px-1">✓</button>
                        <button onClick={() => setEditingSectionId(null)} className="text-gray-400 text-xs px-0.5">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 border-t border-gray-200 pt-1.5 mt-0.5">
                        <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 text-base leading-none">⠿</span>
                        <span className="flex-1 text-xs font-semibold text-gray-600 truncate">{q.text}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                          <button onClick={() => { setEditingSectionId(q.id); setEditingSectionText(q.text); }} className="text-blue-500 hover:text-blue-700 px-0.5 text-xs">✎</button>
                          <button onClick={() => deleteQ(q.id)} className="text-red-400 hover:text-red-600 px-0.5 text-xs">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (q.type !== 'question') return null;
              return (
                <div key={q.id}
                  draggable
                  onDragStart={() => { dragIdx.current = idx; }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => reorderByDrag(idx)}
                  className="flex items-center gap-1 bg-gray-50 rounded p-1.5 group cursor-default select-none">
                  <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 text-base leading-none">⠿</span>
                  <span className="text-xs text-gray-400 w-5 shrink-0">{q.qNum}.</span>
                  <span className="flex-1 text-xs text-gray-700 truncate">{q.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                    <button onClick={() => duplicateQ(q.id)} title="Duplicate" className="text-gray-400 hover:text-indigo-600 px-0.5 text-xs">⧉</button>
                    <button onClick={() => { setEditingQ(q); setShowForm(true); setEditingSectionId(null); }} className="text-blue-500 hover:text-blue-700 px-0.5 text-xs">✎</button>
                    <button onClick={() => deleteQ(q.id)} className="text-red-400 hover:text-red-600 px-0.5 text-xs">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showForm && (
          <QuestionForm
            question={editingQ}
            questionCount={editingQ ? parseInt(editingQ.qNum) : qCount + 1}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingQ(null); }}
          />
        )}

        {qCount > 0 && (
          <div className="space-y-2">
            {/* Answer key toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1 shadow-sm">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={includeAnswerKey}
                  onChange={e => setIncludeAnswerKey(e.target.checked)} />
                <span className="font-medium text-gray-700">Include Answer Key</span>
              </label>
              {includeAnswerKey && (
                <p className="text-xs text-gray-400">
                  {answerKeyRows.length}/{qCount} answers filled in
                  {answerKeyRows.length < qCount && ' — edit questions to add missing answers'}
                </p>
              )}
            </div>
            <button onClick={onPrint}
              className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              🖨 Print / Export PDF
            </button>
            <button onClick={() => onCopyGdoc(allQs)}
              className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              📋 Copy to Google Docs
            </button>
            <button onClick={() => onExportDocx({ questions: allQs, title, showNameLine, showDateLine, showClassLine, showScoreLine, totalPoints, fontSize, twoColChoices })}
              className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              📄 Export as Word (.docx)
            </button>
            <button onClick={() => setFormsScript(generateFormsScript(allQs, title))}
              className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              📝 Export to Google Forms
            </button>
          </div>
        )}
      </div>
      {formsScript && <FormsScriptModal script={formsScript} onClose={() => setFormsScript(null)} />}

      {/* Right — preview */}
      <div className="flex-1 min-w-0">
        {allQs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 rounded-xl border-2 border-dashed border-gray-200 bg-white text-center px-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">✏️</div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No questions yet</p>
            <p className="text-xs text-gray-400 leading-relaxed">Click "+ Add" in the panel on the left to start building your assessment</p>
          </div>
        ) : (
          <div id="print-area" className={`bg-white rounded-xl border border-gray-100 p-8 shadow-md ${{ normal: 'text-sm', large: 'text-base', xl: 'text-lg' }[fontSize]}`}>
            {/* Assessment title — top of page */}
            {title && (
              <div className="text-center font-bold text-lg mb-4 font-serif text-gray-800">{title}</div>
            )}
            {/* Student header lines — below title, above questions */}
            {(showNameLine || showDateLine || showClassLine || showScoreLine) && (
              <div className="mb-6 font-serif text-sm text-gray-900">
                {(showNameLine || showDateLine) && (
                  <div className="flex gap-8 mb-2">
                    {showNameLine && (
                      <div className="flex-1 flex items-baseline gap-2">
                        <span className="shrink-0">Name</span>
                        <span className="flex-1 border-b border-gray-800 inline-block" style={{minWidth:'8rem'}} />
                      </div>
                    )}
                    {showDateLine && (
                      <div className="w-48 flex items-baseline gap-2">
                        <span className="shrink-0">Date</span>
                        <span className="flex-1 border-b border-gray-800 inline-block" />
                      </div>
                    )}
                  </div>
                )}
                {(showClassLine || showScoreLine) && (
                  <div className="flex items-center gap-8">
                    {showClassLine && (
                      <div className="flex-1 flex items-baseline gap-2">
                        <span className="shrink-0">Class/Period</span>
                        <span className="flex-1 border-b border-gray-800 inline-block" style={{minWidth:'6rem'}} />
                      </div>
                    )}
                    {showScoreLine && qCount > 0 && (
                      <div className="ml-auto whitespace-nowrap">
                        Score: <span className="inline-block border-b border-gray-900 w-16 ml-1 mr-1 align-bottom" /> / {totalPoints} {totalPoints === 1 ? 'pt' : 'pts'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Pass allQs WITHOUT the title row so the title is never rendered inside AssessmentPreview.
                customVisuals is keyed by question ID so no index shift is needed. */}
            <AssessmentPreview
              questions={title ? allQs.slice(1) : allQs}
              customVisuals={customVisuals}
              onEdit={(qId, marker, customImg, imgScale) =>
                setEditingVisual({ qId, marker, customImg, imgScale })}
              onQuestionEdit={(idx, uq) => setQuestions(prev => prev.map(q => q.id === uq.id ? uq : q))}
              twoColChoices={twoColChoices}
            />
          </div>
        )}
      </div>

      {editingVisual && (
        <ModelEditor
          marker={editingVisual.marker}
          initialCustomImg={editingVisual.customImg}
          initialImgScale={editingVisual.imgScale}
          onSave={({ marker, customImg, imgScale }) => {
            const qId = editingVisual.qId;
            setCustomVisuals(prev => ({ ...prev, [qId]: { marker, customImg, imgScale } }));
            // Write back into questions so the change persists (match by question ID)
            setQuestions(prev => prev.map(q =>
              q.id === qId ? { ...q, marker: marker || null, _customImg: customImg || null, _imgScale: imgScale ?? 1 } : q
            ));
            setEditingVisual(null);
          }}
          onClose={() => setEditingVisual(null)}
        />
      )}
    </div>
  );
}

// ─── Parse a marker string back into { type, params } for editing ─────────────
function markerToTypeParams(marker) {
  if (!marker) return { type: 'none', params: {} };
  if (marker.startsWith('[IMAGE: draw')) return { type: 'DRAW', params: {} };
  if (marker.startsWith('[IMAGE:')) return { type: 'custom', params: {} };
  const typeMatch = marker.match(/^\[(\w+)/);
  if (!typeMatch) return { type: 'none', params: {} };
  const type = typeMatch[1];
  const inner = marker.replace(/^\[\w+\s*:?\s*/, '').replace(/\]$/, '').trim();
  const kv = (key, def = '') => { const m = inner.match(new RegExp(`\\b${key}=([^\\s\\]]+)`)); return m ? m[1] : def; };
  let params = {};
  if (type === 'ARRAY') { params = { rows: kv('rows','3'), cols: kv('cols','4') }; }
  else if (type === 'NUM_LINE') {
    const hopsM = inner.match(/\bhops=([\d.\/\-:, ]+?)(?=\s+\w+=|\])/);
    const labelAtM = inner.match(/\blabelat=([\d.,/]+)/);
    params = { min: kv('min','0'), max: kv('max','20'), step: kv('step','1'),
      jumps: kv('jumps',''), hop_op: kv('hop_op','+'),
      hop_size: kv('hop_size',''), hop_start: kv('hop_start',''),
      hops: hopsM ? hopsM[1] : '', show: kv('show',''),
      labelAt: labelAtM ? labelAtM[1] : '',
      labelFmt: kv('labelfmt','decimal') };
  }
  else if (type === 'GROUPS') { params = { groups: kv('groups','3'), items: kv('items','4') }; }
  else if (type === 'TENS_FRAME') { params = { filled: kv('filled','5'), total: kv('total','10') }; }
  else if (type === 'NUM_BOND') { params = { whole: kv('whole',''), part1: kv('part1',''), part2: kv('part2','?') }; }
  else if (type === 'FRACTION' || type === 'FRAC_CIRCLE') {
    const fm = inner.match(/(\d+)\/(\d+)/);
    params = { n: fm ? fm[1] : '1', d: fm ? fm[2] : '4' };
  }
  else if (type === 'MIXED_NUM' || type === 'MIXED_CIRCLE') {
    params = { whole: kv('whole','1'), n: kv('n','1'), d: kv('d','3') };
  }
  else if (type === 'MIXED_NUM_BOX') { params = { whole: kv('whole',''), n: kv('n',''), d: kv('d','') }; }
  else if (type === 'FRACTION_BOX') { params = { n: kv('n',''), d: kv('d','') }; }
  else if (type === 'BASE10') {
    params = { thousands: kv('thousands','0'), hundreds: kv('hundreds','0'), tens: kv('tens','0'), ones: kv('ones','0') };
  }
  else if (type === 'AREA_MODEL') { params = { cols: kv('cols','20,7'), rows: kv('rows','10,4'), vals: kv('vals','') }; }
  else if (type === 'BAR_MODEL') {
    const bmM = inner.match(/^([\d,]+)/);
    const labelM = inner.match(/\|\s*label=(.+)/);
    params = { vals: bmM ? bmM[1] : '5,3', label: labelM ? labelM[1].trim() : '' };
  }
  else if (type === 'DATA_TABLE') {
    const headerM = inner.match(/header=([^|]+)/);
    const rest = inner.replace(/header=[^|]+\|?\s*/, '');
    params = { header: headerM ? headerM[1].trim() : 'Category,Count',
      rowsText: rest.split('|').map(s => s.trim()).filter(Boolean).join('\n') };
  }
  else if (type === 'PARTIAL_Q') {
    const stepsM = inner.match(/\bsteps=([\d.:\-,]+)/);
    params = { dividend: kv('dividend','0'), divisor: kv('divisor',''), steps: stepsM ? stepsM[1] : '' };
  }
  else if (type === 'FRAC_STRIPS') {
    params = { aw: kv('aw','1'), an: kv('an','3'), d: kv('d','4'),
      op: kv('op','+'), bw: kv('bw','1'), bn: kv('bn','3'),
      d2: kv('bd',''), cross: kv('cross','0'), crossWh: kv('crossWh','0') };
  }
  else if (type === 'VOL_3D') {
    const lblLM = inner.match(/\blbl_l=(\S+)/);
    const lblWM = inner.match(/\blbl_w=(\S+)/);
    const lblHM = inner.match(/\blbl_h=(\S+)/);
    params = { l: kv('l','3'), w: kv('w','2'), h: kv('h','2'), formula: kv('formula','yes'),
      cubelines: kv('cubelines','yes'),
      lbl_l: lblLM ? lblLM[1].replace(/_/g,' ') : '',
      lbl_w: lblWM ? lblWM[1].replace(/_/g,' ') : '',
      lbl_h: lblHM ? lblHM[1].replace(/_/g,' ') : '' };
  }
  else if (type === 'SHAPE_2D') {
    const labelsM = inner.match(/\blabels=(\S+)/);
    params = { shape: kv('shape','rectangle'),
      labels: labelsM ? labelsM[1].replace(/_/g,' ') : '',
      color: kv('color','#dbeafe') };
  }
  return { type, params };
}

// ─── Drawing Canvas ────────────────────────────────────────────────────────────
function DrawingCanvas({ existingImg, onCapture }) {
  const canvasRef = useRef(null);
  const uploadRef = useRef(null);
  const [color, setColor] = useState('#111111');
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [pasteMsg, setPasteMsg] = useState('');
  const lastPos = useRef(null);

  // Load existingImg when provided (on mount only)
  useEffect(() => {
    if (!existingImg || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = existingImg;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    if (e.touches && e.touches[0]) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current.getContext('2d');
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing || !lastPos.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setSaved(false);
  };

  const endDraw = (e) => {
    e.preventDefault();
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSaved(false);
  };

  const useDrawing = () => {
    onCapture(canvasRef.current.toDataURL('image/png'));
    setSaved(true);
  };

  // Draw an image (from URL/dataURL) onto the canvas, scaled to fit
  const drawImageOnCanvas = (src) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      setSaved(false);
    };
    img.src = src;
  };

  // Upload image from file input
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => drawImageOnCanvas(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Copy canvas to clipboard
  const copyCanvas = () => {
    canvasRef.current.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopyMsg('✓ Copied!');
        setTimeout(() => setCopyMsg(''), 2000);
      } catch {
        setCopyMsg('Copy failed');
        setTimeout(() => setCopyMsg(''), 2500);
      }
    }, 'image/png');
  };

  // Paste image from clipboard
  const pasteCanvas = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            setSaved(false);
            URL.revokeObjectURL(url);
            setPasteMsg('✓ Pasted!');
            setTimeout(() => setPasteMsg(''), 2000);
          };
          img.src = url;
          return;
        }
      }
      setPasteMsg('No image in clipboard');
      setTimeout(() => setPasteMsg(''), 2500);
    } catch {
      setPasteMsg('Paste failed – allow clipboard access');
      setTimeout(() => setPasteMsg(''), 3000);
    }
  };

  const COLORS = [
    { val: '#111111', label: 'Black' },
    { val: '#dc2626', label: 'Red' },
    { val: '#2563eb', label: 'Blue' },
    { val: '#16a34a', label: 'Green' },
    { val: '#ea580c', label: 'Orange' },
    { val: '#7c3aed', label: 'Purple' },
    { val: '#ffffff', label: 'White', outline: true },
  ];
  const SIZES = [{ label: 'S', val: 2 }, { label: 'M', val: 4 }, { label: 'L', val: 8 }, { label: 'XL', val: 16 }];

  return (
    <div className="space-y-2">
      {/* Toolbar row 1: colors, sizes, eraser, clear */}
      <div className="flex items-center gap-2 flex-wrap pb-1 border-b border-gray-100">
        {/* Color swatches */}
        <div className="flex gap-1 items-center">
          {COLORS.map(c => (
            <button key={c.val} type="button" title={c.label}
              onClick={() => { setColor(c.val); setEraser(false); }}
              style={{
                backgroundColor: c.val,
                border: color === c.val && !eraser ? '2.5px solid #7c3aed' : c.outline ? '1.5px solid #d1d5db' : '1.5px solid transparent',
                boxShadow: color === c.val && !eraser ? '0 0 0 1px #7c3aed' : 'none',
              }}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110 shrink-0" />
          ))}
        </div>
        {/* Size buttons */}
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button key={s.label} type="button"
              onClick={() => { setSize(s.val); setEraser(false); }}
              className={`text-xs border rounded px-1.5 py-0.5 transition-colors font-medium ${size === s.val && !eraser ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {/* Eraser */}
        <button type="button" onClick={() => setEraser(v => !v)}
          className={`text-xs border rounded px-2 py-0.5 transition-colors ${eraser ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          🧹 Eraser
        </button>
        {/* Clear */}
        <button type="button" onClick={clearCanvas}
          className="text-xs border border-red-200 rounded px-2 py-0.5 text-red-500 hover:bg-red-50 transition-colors ml-auto">
          🗑 Clear
        </button>
      </div>

      {/* Toolbar row 2: upload, copy, paste */}
      <div className="flex items-center gap-2 flex-wrap pb-1 border-b border-gray-100">
        {/* Upload image */}
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <button type="button" onClick={() => uploadRef.current.click()}
          className="text-xs border border-blue-200 rounded px-2 py-0.5 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1">
          📁 Upload Image
        </button>
        {/* Copy */}
        <button type="button" onClick={copyCanvas}
          className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
          📋 Copy
        </button>
        {copyMsg && <span className="text-xs text-green-600 font-medium">{copyMsg}</span>}
        {/* Paste */}
        <button type="button" onClick={pasteCanvas}
          className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
          📌 Paste
        </button>
        {pasteMsg && <span className="text-xs text-blue-600 font-medium">{pasteMsg}</span>}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={400} height={220}
        style={{ cursor: eraser ? 'cell' : 'crosshair', touchAction: 'none' }}
        className="border-2 border-gray-200 rounded-lg w-full bg-white"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />

      {/* Use Drawing button */}
      <button type="button" onClick={useDrawing}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
        {saved ? '✓ Drawing Saved! (click Save below to apply)' : '✓ Use This Drawing'}
      </button>
    </div>
  );
}

function ModelEditor({ marker, initialCustomImg, initialImgScale, onSave, onClose }) {
  const init = markerToTypeParams(marker);
  const [visualType, setVisualType] = useState(init.type);
  const [visualParams, setVisualParams] = useState(init.params);
  const [customImg, setCustomImg] = useState(initialCustomImg || null);
  const [imgScale, setImgScale] = useState(initialImgScale ?? 1);
  const [clipMsg, setClipMsg] = useState('');
  const fileRef = useRef();
  const imgDropRef = useRef();

  const loadBlob = blob => {
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = ev => setCustomImg(ev.target.result);
    reader.readAsDataURL(blob);
  };

  const pasteFromClipboard = async () => {
    setClipMsg('');
    try {
      if (!navigator.clipboard?.read) { setClipMsg('Use Ctrl+V or browse for a file.'); return; }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) { loadBlob(await item.getType(type)); found = true; break; }
        }
        if (found) break;
      }
      if (!found) setClipMsg('No image in clipboard — copy an image first, then try again.');
    } catch (err) {
      setClipMsg(err.name === 'NotAllowedError'
        ? 'Clipboard access denied. Allow it in your browser or use "Browse for file" below.'
        : 'Could not read clipboard. Try browsing for a file instead.');
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
    if (file) loadBlob(file);
  };

  // Fallback: document paste event (when 'custom' type is active)
  useEffect(() => {
    if (visualType !== 'custom') return;
    const onDocPaste = e => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image'));
      if (item) { e.preventDefault(); loadBlob(item.getAsFile()); }
    };
    document.addEventListener('paste', onDocPaste);
    return () => document.removeEventListener('paste', onDocPaste);
  }, [visualType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isImgType = visualType === 'custom' || visualType === 'DRAW';
  const builtMarker = visualType === 'DRAW'
    ? (customImg ? '[IMAGE: draw]' : null)
    : visualType === 'custom'
      ? (customImg ? '[IMAGE: custom]' : null)
      : paramsToMarker(visualType, visualParams);

  const previewEl = (() => {
    if (isImgType) return null;
    try { return builtMarker ? parseVisualModel(builtMarker) : null; } catch { return null; }
  })();

  const handleSave = () => {
    onSave({ marker: builtMarker, customImg: isImgType ? customImg : null, imgScale: isImgType ? imgScale : 1 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-3">Edit Visual / Model</h3>

        {/* Visual type selector */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Visual Type</p>
          <select value={visualType}
            onChange={e => { const t = e.target.value; setVisualType(t); setVisualParams(VISUAL_TYPE_DEFAULTS[t] || {}); setCustomImg(null); setClipMsg(''); }}
            className="border rounded p-1.5 text-sm w-full">
            {VISUAL_TYPES_LIST.map(vt => <option key={vt.id} value={vt.id} style={vt.color ? { color: vt.color, fontWeight: 'bold' } : {}}>{vt.label}</option>)}
          </select>
        </div>

        {/* Param form for preset visual types */}
        {visualType !== 'none' && visualType !== 'custom' && visualType !== 'DRAW' && (
          <div className="bg-gray-50 rounded p-3 space-y-2 mb-3">
            <VisualParamForm type={visualType} params={visualParams} onChange={setVisualParams} />
            {previewEl && (
              <div className="overflow-x-auto pt-1 border-t border-gray-200 mt-2">
                <p className="text-xs text-gray-400 mb-1">Preview:</p>
                <ErrorBoundary><div>{previewEl}</div></ErrorBoundary>
              </div>
            )}
          </div>
        )}

        {/* Custom image upload / paste */}
        {visualType === 'custom' && (
          <div className="space-y-2 mb-3">
            {customImg ? (
              <div className="text-center space-y-2">
                <img src={customImg} alt="custom"
                  style={{ maxWidth: `${Math.round(imgScale * 100)}%` }}
                  className="max-h-48 mx-auto border rounded" />
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs text-gray-400 shrink-0">Size</span>
                  <input type="range" min="20" max="100" step="5"
                    value={Math.round(imgScale * 100)}
                    onChange={e => setImgScale(Number(e.target.value) / 100)}
                    className="flex-1 h-1.5 accent-blue-600" />
                  <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{Math.round(imgScale * 100)}%</span>
                </div>
                <button type="button" onClick={() => setCustomImg(null)}
                  className="text-xs text-red-500 hover:underline">Remove image</button>
              </div>
            ) : (
              <>
                <button type="button" onClick={pasteFromClipboard}
                  className="w-full py-3 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 active:bg-blue-200 transition-colors">
                  📋 Paste Image from Clipboard
                </button>
                {clipMsg && <p className="text-xs text-amber-600">{clipMsg}</p>}
                <div ref={imgDropRef}
                  className="border-2 border-dashed border-gray-200 rounded p-3 text-center text-xs text-gray-400"
                  onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                  or drag and drop an image here
                </div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full text-xs border border-gray-300 rounded py-1.5 text-gray-500 hover:bg-gray-50">
                  📁 Browse for image file…
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (f) loadBlob(f); }} />
              </>
            )}
          </div>
        )}

        {/* Freehand draw */}
        {visualType === 'DRAW' && (
          <div className="mb-3">
            <DrawingCanvas existingImg={customImg} onCapture={setCustomImg} />
          </div>
        )}

        <div className="flex gap-2 justify-between items-center">
          {/* Remove visual — only shown when there's something to remove */}
          {(marker || initialCustomImg) ? (
            <button type="button"
              onClick={() => onSave({ marker: null, customImg: null })}
              className="px-3 py-2 text-sm rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
              🗑 Remove Visual
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Math line splitter ────────────────────────────────────────────────────────
// Detects lines that are rows of math items (fractions, mixed numbers, blanks)
// and splits them into an array for spaced rendering. Returns null for prose.
const UNICODE_FRAC = '½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅐⅑⅒';
const MATH_ITEM_RE = new RegExp(
  `\\d+\\s+[${UNICODE_FRAC}]` +   // mixed number with unicode fraction: "2 ⅖"
  `|\\d+\\s*\\/\\s*\\d+` +         // fraction: "11/4" or "11 / 4"
  `|_{3,}` +                        // answer blank: "______"
  `|[${UNICODE_FRAC}]` +           // lone unicode fraction character
  `|\\d+`,                          // standalone number
  'g'
);
function splitMathItems(text) {
  if (!text) return null;
  const matches = [...text.matchAll(MATH_ITEM_RE)];
  if (matches.length < 2) return null;
  // Only split if math items cover most of the non-space content (not prose with incidental numbers)
  const covered = matches.reduce((s, m) => s + m[0].replace(/\s/g, '').length, 0);
  const total = text.replace(/\s/g, '').length;
  if (total === 0 || covered / total < 0.65) return null;
  return matches.map(m => m[0]);
}

// Renders a single line — if it's a row of math items, spaces them out; otherwise plain text.
function MathLine({ text, className = '' }) {
  const items = splitMathItems(text);
  if (items) {
    return (
      <div className={`flex flex-wrap items-baseline gap-x-10 gap-y-2 py-0.5 ${className}`}>
        {items.map((item, i) => (
          <span key={i} className="font-serif text-base tracking-wide">{item}</span>
        ))}
      </div>
    );
  }
  return <div className={className}>{text}</div>;
}

// ─── Assessment Preview ────────────────────────────────────────────────────────
function AssessmentPreview({ questions, onEdit, customVisuals, onQuestionEdit, onRegen, onDelete, regenningIdx, twoColChoices = false }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [activeVersion, setActiveVersion] = useState('A');

  const hasVersionB = questions.some(q => q.vb);
  const hasAnswerKey = questions.some(q => q.type === 'answer-key');

  const visibleQs = questions.filter(q => {
    if (q.type === 'vb-divider' || q.type === 'ak-divider') return false;
    if (activeVersion === 'key') return q.type === 'answer-key';
    if (activeVersion === 'B') return !!q.vb && q.type !== 'answer-key';
    return !q.vb && q.type !== 'answer-key'; // Version A
  });

  const startEdit = (idx, text) => { setEditingIdx(idx); setEditText(text); setEditingChoiceIdx(null); };
  const saveEdit = (idx, q) => { onQuestionEdit(idx, { ...q, text: editText }); setEditingIdx(null); };
  // Choice editing
  const [editingChoiceIdx, setEditingChoiceIdx] = useState(null); // { qIdx, cIdx }
  const [editChoiceText, setEditChoiceText] = useState('');
  const startChoiceEdit = (qIdx, cIdx, text) => { setEditingChoiceIdx({ qIdx, cIdx }); setEditChoiceText(text); setEditingIdx(null); };
  const saveChoiceEdit = (qIdx, q) => {
    const newChoices = q.choices.map((ch, ci) => ci === editingChoiceIdx.cIdx ? { ...ch, text: editChoiceText } : ch);
    onQuestionEdit(qIdx, { ...q, choices: newChoices });
    setEditingChoiceIdx(null);
  };
  // Type editing
  const [editingTypeIdx, setEditingTypeIdx] = useState(null);
  const changeType = (origIdx, q, newType) => {
    const wasMulti = q.qType === 'mc' || q.qType === 'multiselect';
    const isMulti = newType === 'mc' || newType === 'multiselect';
    const updatedQ = { ...q, qType: newType };
    if (isMulti && !wasMulti) updatedQ.choices = defaultChoices();
    else if (!isMulti && wasMulti) updatedQ.choices = [];
    onQuestionEdit(origIdx, updatedQ);
    setEditingTypeIdx(null);
  };
  // Answer editing
  const [editingAnswerIdx, setEditingAnswerIdx] = useState(null);
  const [editAnswerText, setEditAnswerText] = useState('');
  const startAnswerEdit = (origIdx, answer) => { setEditingAnswerIdx(origIdx); setEditAnswerText(answer || ''); setEditingTypeIdx(null); setEditingIdx(null); setEditingChoiceIdx(null); };
  const saveAnswer = (origIdx, q) => { onQuestionEdit(origIdx, { ...q, answer: editAnswerText }); setEditingAnswerIdx(null); };

  // Map from visibleQs index to original questions index (used for onQuestionEdit/onRegen callbacks)
  const origIdxMap = visibleQs.map(vq => questions.indexOf(vq));

  return (
    <div className="font-serif text-gray-900 max-w-2xl mx-auto">
      {/* Version tabs */}
      {(hasVersionB || hasAnswerKey) && (
        <div className="flex gap-1 mb-4 no-print">
          {['A', hasVersionB && 'B', hasAnswerKey && 'key'].filter(Boolean).map(v => (
            <button key={v}
              onClick={() => setActiveVersion(v)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${activeVersion === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {v === 'key' ? 'Answer Key' : `Version ${v}`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {(() => {
          // Single-pass sequential numbering. Any item that isn't a structural
          // non-question type gets the next question number.
          const NON_Q = new Set(['header', 'section', 'answer-key', 'vb-divider', 'ak-divider']);
          let qSeq = 0;
          return visibleQs.map((q, vIdx) => {
          const idx = origIdxMap[vIdx];
          // Count inline so there's no index mismatch between two separate maps
          const displayNum = !NON_Q.has(q.type) ? ++qSeq : null;

          if (q.type === 'header') {
            return (
              <div key={q.id} className="text-center font-bold text-base mt-4 mb-1 text-gray-800">
                {q.text}
              </div>
            );
          }

          if (q.type === 'section') {
            return (
              <div key={q.id} className="pt-2 pb-1">
                <div className="border-t-2 border-gray-300 pt-2 text-center font-bold text-sm text-gray-700 tracking-wide">
                  {q.text}
                </div>
              </div>
            );
          }

          if (q.type === 'answer-key') {
            return (
              <div key={q.id} className="text-sm text-gray-700 font-mono">
                {q.text}
              </div>
            );
          }

          const cv = customVisuals?.[q.id];
          const hasCvOverride = cv !== undefined;
          const customImgSrc = hasCvOverride ? (cv.customImg || null) : (q._customImg || null);
          const imgScale = hasCvOverride ? (cv.imgScale ?? 1) : (q._imgScale ?? 1);
          const markerToUse = hasCvOverride ? cv.marker : q.marker;
          const visualComponent = customImgSrc
            ? <img src={customImgSrc} alt="custom"
                style={{ maxWidth: `${Math.round(imgScale * 100)}%` }}
                className="max-h-48 border rounded" />
            : markerToUse
              ? (markerToUse.startsWith('[IMAGE:')
                ? <div className="border-2 border-dashed border-orange-300 rounded p-3 text-xs text-orange-600 bg-orange-50">
                    ⚠ Click "Edit Visual" below to paste your own image
                  </div>
                : <ErrorBoundary>{parseVisualModel(markerToUse)}</ErrorBoundary>)
              : null;

          return (
            <div key={q.id} className="relative">
              {/* Standard tag — top-right corner */}
              {q.standard && (
                <div className="absolute top-0 right-0 text-xs text-blue-500 font-medium bg-white/90 px-1.5 py-0.5 rounded-bl border border-blue-200 no-print-border leading-tight">
                  {q.standard}
                </div>
              )}

              {/* ① Number + question text on the same line */}
              {editingIdx === idx ? (
                <div className="mb-1.5">
                  <span className="font-bold text-gray-800 mr-1.5">
                    {displayNum != null ? `${displayNum}.` : (q.qNum ? `${q.qNum}.` : '')}
                    {q.points != null ? <span className="font-normal text-xs text-gray-500 ml-1">({q.points} {q.points === 1 ? 'pt' : 'pts'})</span> : null}
                  </span>
                  <div className="flex gap-2 items-start mt-1 pl-4">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      className="flex-1 border border-blue-300 rounded p-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} autoFocus />
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => saveEdit(idx, q)} className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 font-medium">Save</button>
                      <button type="button" onClick={() => setEditingIdx(null)} className="text-xs bg-red-100 border border-red-300 text-red-600 rounded px-2 py-1 hover:bg-red-200">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-1 leading-snug">
                  <span className="font-bold text-gray-800">
                    {displayNum != null ? `${displayNum}.` : (q.qNum ? `${q.qNum}.` : '')}
                    {q.points != null ? <span className="font-normal text-xs text-gray-500 ml-1">({q.points} {q.points === 1 ? 'pt' : 'pts'})</span> : null}
                  </span>
                  {q.text && <span className="ml-1.5">{q.text}</span>}
                </div>
              )}

              {/* ② Content — indented below the number+text row */}
              <div className="pl-4">
                {/* Math continuation lines */}
                {q.lines?.length > 0 && (
                  <div className="mt-1 space-y-3 ml-0.5">
                    {q.lines.map((l, li) => (
                      <MathLine key={li} text={l} className="text-gray-800" />
                    ))}
                  </div>
                )}

                {/* Visual model — shown below question number/text */}
                {visualComponent && (
                  <div className="my-2">{visualComponent}</div>
                )}

                {/* Choices */}
                {q.choices?.length > 0 && (() => {
                  const isMultiselect = q.qType === 'multiselect' || /select all|choose all/i.test(q.text || '');
                  const use2Col = twoColChoices && !isMultiselect && q.choices.length >= 3;
                  return (
                    <div className={`mt-2 ml-2 ${use2Col ? 'grid grid-cols-2 gap-x-4 gap-y-1.5' : 'space-y-1.5'}`}>
                      {q.choices.map((ch, ci) => (
                        <div key={ci} className="text-sm flex items-start gap-2">
                          {isMultiselect
                            ? <span className="mt-0.5 shrink-0 w-3.5 h-3.5 border border-gray-500 rounded-sm inline-block" />
                            : <span className="mt-0.5 shrink-0 w-3.5 h-3.5 border border-gray-500 rounded-full inline-block" />}
                          {editingChoiceIdx?.qIdx === idx && editingChoiceIdx?.cIdx === ci ? (
                            <span className="flex-1 flex gap-1 items-center">
                              <span className="font-medium">{ch.letter})</span>
                              <input value={editChoiceText} onChange={e => setEditChoiceText(e.target.value)}
                                className="flex-1 border border-blue-300 rounded px-1 py-0.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-200" autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') saveChoiceEdit(idx, q); if (e.key === 'Escape') setEditingChoiceIdx(null); }} />
                              <button type="button" onClick={() => saveChoiceEdit(idx, q)} className="text-xs bg-green-600 text-white rounded px-1.5 py-0.5">Save</button>
                              <button type="button" onClick={() => setEditingChoiceIdx(null)} className="text-xs bg-red-100 border border-red-300 text-red-600 rounded px-1.5 py-0.5">✕</button>
                            </span>
                          ) : (
                            <span className="group/ch">
                              <span className="font-medium">{ch.letter})</span> {ch.text}
                              {onQuestionEdit && (
                                <button type="button"
                                  onClick={() => startChoiceEdit(idx, ci, ch.text)}
                                  className="ml-1 opacity-0 group-hover/ch:opacity-60 text-xs text-blue-500 no-print hover:opacity-100">✏</button>
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Answer lines for non-MC */}
                {!q.choices?.length && ['fill', 'open', 'compute', 'word'].includes(q.qType) && (() => {
                  const ansDefaults = { fill: 2, open: 4, compute: 3, word: 5 };
                  const n = q.lineCount ?? ansDefaults[q.qType] ?? 3;
                  return (
                    <div className="mt-3 space-y-4">
                      {Array.from({ length: n }, (_, i) => (
                        <div key={i} className="border-b border-gray-400 w-full" style={{ height: '1.4rem' }} />
                      ))}
                    </div>
                  );
                })()}

                {/* Type picker — shown when ⇄ Change Type is clicked */}
                {editingTypeIdx === idx && onQuestionEdit && (
                  <div className="mt-2 no-print">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Select question type:</p>
                    <div className="flex flex-wrap gap-1">
                      {Q_TYPES.map(qt => (
                        <button key={qt.id} type="button"
                          onClick={() => changeType(idx, q, qt.id)}
                          className={`text-xs border rounded px-2 py-1 transition-colors ${q.qType === qt.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700'}`}>
                          {qt.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => setEditingTypeIdx(null)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-400 hover:bg-gray-50 ml-1">✕</button>
                    </div>
                  </div>
                )}

                {/* Inline answer display / edit */}
                {editingAnswerIdx === idx ? (
                  <div className="mt-2 flex gap-1.5 items-center no-print">
                    <span className="text-xs font-semibold text-green-700 shrink-0">Answer:</span>
                    <input value={editAnswerText} onChange={e => setEditAnswerText(e.target.value)}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveAnswer(idx, q); if (e.key === 'Escape') setEditingAnswerIdx(null); }}
                      className="flex-1 border border-green-300 rounded px-2 py-0.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-green-200" />
                    <button type="button" onClick={() => saveAnswer(idx, q)} className="text-xs bg-green-600 text-white rounded px-2 py-0.5 hover:bg-green-700">Save</button>
                    <button type="button" onClick={() => setEditingAnswerIdx(null)} className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-500 hover:bg-gray-50">✕</button>
                  </div>
                ) : q.answer && onQuestionEdit ? (
                  <div className="mt-1 text-xs text-green-700 no-print flex items-center gap-1">
                    <span className="font-semibold">✓ Answer:</span> <span>{q.answer}</span>
                    <button type="button" onClick={() => startAnswerEdit(idx, q.answer)} className="ml-1 text-blue-400 hover:text-blue-600">✏</button>
                  </div>
                ) : null}

                {/* Action toolbar — no-print, always visible (not hover-dependent) */}
                {(onEdit || onQuestionEdit || onRegen || onDelete) && editingIdx !== idx && editingTypeIdx !== idx && (
                  <div className="flex gap-1.5 mt-3 flex-wrap no-print">
                    {onEdit && (
                      <button type="button"
                        onClick={() => onEdit(q.id, markerToUse, customImgSrc, imgScale)}
                        className="text-xs border rounded px-2 py-0.5 text-blue-600 border-blue-200 bg-white hover:bg-blue-50 transition-colors">
                        {visualComponent ? '✏ Edit Visual' : '+ Add Visual / Model'}
                      </button>
                    )}
                    {onQuestionEdit && (
                      <button type="button"
                        onClick={() => startEdit(idx, q.text)}
                        className="text-xs border rounded px-2 py-0.5 text-gray-600 border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                        ✏ Edit Text
                      </button>
                    )}
                    {onQuestionEdit && (
                      <button type="button"
                        onClick={() => { setEditingTypeIdx(idx); setEditingIdx(null); setEditingAnswerIdx(null); setEditingChoiceIdx(null); }}
                        className="text-xs border rounded px-2 py-0.5 text-purple-600 border-purple-200 bg-white hover:bg-purple-50 transition-colors">
                        ⇄ Change Type
                      </button>
                    )}
                    {onQuestionEdit && (
                      <button type="button"
                        onClick={() => startAnswerEdit(idx, q.answer)}
                        className="text-xs border rounded px-2 py-0.5 text-green-600 border-green-200 bg-white hover:bg-green-50 transition-colors">
                        ✓ Edit Answer
                      </button>
                    )}
                    {onRegen && (
                      <button type="button"
                        onClick={() => onRegen(idx)}
                        disabled={regenningIdx !== null}
                        className={`text-xs border rounded px-2 py-0.5 transition-colors ${
                          regenningIdx === idx
                            ? 'text-indigo-500 border-indigo-300 bg-indigo-50 cursor-wait'
                            : 'text-gray-400 border-gray-200 bg-white hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}>
                        {regenningIdx === idx ? '↺ Regenerating…' : '↺ Regenerate'}
                      </button>
                    )}
                    {onDelete && (
                      <button type="button"
                        onClick={() => onDelete(idx)}
                        className="text-xs border rounded px-2 py-0.5 text-red-400 border-red-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors ml-auto">
                        🗑 Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        });
        })()}
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ apiKey, onSave, onClose }) {
  const [val, setVal] = useState(apiKey);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-3">Settings</h3>
        <p className="text-sm text-gray-600 mb-2">Anthropic API Key</p>
        <input type="password" value={val} onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full border rounded p-2 text-sm mb-1 font-mono" />
        <p className="text-xs text-gray-400 mb-4">
          Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a>. Key is stored in your browser only.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onSave(val); onClose(); }}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Print styles injected once ───────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area { position: absolute; top: 0; left: 0; width: 100%; }
  .no-print { display: none !important; }
  button { display: none !important; }
}
`;

// ─── Visual marker → HTML table (for Google Docs paste) ───────────────────────
function visualToHtml(marker) {
  if (!marker) return '';
  const m = marker.replace(/^\[/, '').replace(/\]$/, '').trim();
  const gp = key => { const x = m.match(new RegExp(key + '=([^\\s\\]|,]+)')); return x ? x[1] : null; };
  const tbl = 'border-collapse:collapse;margin:8px 0;';
  const cell = 'border:1px solid #333;text-align:center;padding:4px;';

  // ── ARRAY ──
  if (m.startsWith('ARRAY:')) {
    const R = Math.min(parseInt(gp('rows')) || 3, 12);
    const C = Math.min(parseInt(gp('cols')) || 3, 12);
    let t = `<table style="${tbl}border:none"><tbody>`;
    for (let r = 0; r < R; r++) {
      t += '<tr>';
      for (let c = 0; c < C; c++)
        t += '<td style="border:none;width:18px;height:18px;text-align:center;font-size:13pt;line-height:1;padding:1px">●</td>';
      t += '</tr>';
    }
    return t + '</tbody></table>';
  }

  // ── NUMBER LINE ──
  if (m.startsWith('NUM_LINE:')) {
    const mn = parseFloat(gp('min') ?? '0');
    const mx = parseFloat(gp('max') ?? '10');
    const st = parseFloat(gp('step') ?? '1') || 1;
    const showAll = m.includes('show=all');
    const hasArcs = m.includes('jumps=yes');
    const hopSizeParam = gp('hop_size');
    const hopStartParam = gp('hop_start');
    const hopOpParam = gp('hop_op') || '+';
    // Use dedicated regex for hops= since it contains commas (gp() stops at comma)
    const hopsParam = (m.match(/\bhops=([\d.\-:,]+)/) || [])[1] || null;

    const ticks = [];
    for (let v = mn; v <= mx + 0.0001; v += st) ticks.push(parseFloat(v.toFixed(4)));
    const tw = Math.max(22, Math.min(40, Math.floor(340 / ticks.length)));

    // Build hop pairs + labels (mirrors NumberLine component logic)
    let hopPairs = [];
    let hopLabelList = [];
    if (hasArcs) {
      if (hopsParam) {
        hopPairs = hopsParam.split(',').map(s => s.split(':').map(Number)).filter(([a,b]) => !isNaN(a) && !isNaN(b));
        hopPairs.forEach(([a, b]) => {
          const diff = parseFloat((b - a).toFixed(4));
          hopLabelList.push(diff >= 0 ? `+${diff}` : `−${Math.abs(diff)}`);
        });
      } else if (hopSizeParam) {
        const hs = parseFloat(hopSizeParam);
        if (hopOpParam === '×' || hopOpParam === '*') {
          const start = hopStartParam !== null ? parseFloat(hopStartParam) : (mn || 1);
          let v = start;
          for (let n = 0; n < 20; n++) {
            const next = parseFloat((v * hs).toFixed(6));
            if (next > mx + 0.0001 || Math.abs(next - v) < 0.0001) break;
            hopPairs.push([v, next]); hopLabelList.push(`×${hs}`); v = next;
          }
        } else if (hopOpParam === '÷' || hopOpParam === '/') {
          const start = hopStartParam !== null ? parseFloat(hopStartParam) : mx;
          let v = start;
          for (let n = 0; n < 20; n++) {
            const next = parseFloat((v / hs).toFixed(6));
            if (next < mn - 0.0001 || Math.abs(next - v) < 0.0001) break;
            hopPairs.push([v, next]); hopLabelList.push(`÷${hs}`); v = next;
          }
        } else if (hopOpParam === '-' || hopOpParam === '−') {
          const start = hopStartParam !== null ? parseFloat(hopStartParam) : mx;
          for (let v = start; v - hs >= mn - 0.0001; v = parseFloat((v - hs).toFixed(4))) {
            hopPairs.push([v, parseFloat((v - hs).toFixed(4))]); hopLabelList.push(`−${hs}`);
          }
        } else {
          const start = hopStartParam !== null ? parseFloat(hopStartParam) : mn;
          for (let v = start; v + hs <= mx + 0.0001; v = parseFloat((v + hs).toFixed(4))) {
            hopPairs.push([v, parseFloat((v + hs).toFixed(4))]); hopLabelList.push(`+${hs}`);
          }
        }
      } else {
        ticks.slice(0, -1).forEach((v, i) => {
          hopPairs.push([v, ticks[i + 1]]);
          hopLabelList.push(`+${parseFloat((ticks[i+1] - v).toFixed(4))}`);
        });
      }
    }

    let t = `<table style="${tbl}border:none"><tbody>`;
    // Arc labels row
    if (hasArcs && hopPairs.length) {
      // Map each hop to proportional column span (handles off-tick positions)
      const tickFrac = v => (v - mn) / (mx - mn) * (ticks.length - 1);
      t += '<tr>';
      let lastFrac = 0;
      hopPairs.forEach(([v1, v2], hi) => {
        const f1 = tickFrac(v1), f2 = tickFrac(v2);
        const [fLo, fHi] = f1 <= f2 ? [f1, f2] : [f2, f1];
        const gapCols = Math.max(0, Math.round(fLo) - Math.round(lastFrac));
        if (gapCols > 0) t += `<td colspan="${gapCols}" style="border:none"></td>`;
        const span = Math.max(1, Math.round(fHi - fLo));
        const label = hopLabelList[hi] || '';
        t += `<td colspan="${span}" style="border:none;border-bottom:2px solid #2563eb;text-align:center;font-size:9pt;color:#2563eb;font-weight:bold;padding:0 2px;width:${tw * span}px">⌢ ${label}</td>`;
        lastFrac = Math.round(fHi);
      });
      const remaining = ticks.length - 1 - lastFrac;
      if (remaining > 0) t += `<td colspan="${remaining}" style="border:none"></td>`;
      t += `<td style="border:none;width:${tw/2}px"></td></tr>`;
    }
    // Tick row
    t += '<tr>' + ticks.map(() =>
      `<td style="border:none;border-left:2px solid #333;border-bottom:2px solid #333;height:10px;width:${tw}px"></td>`
    ).join('') + '</tr>';
    // Label row
    t += '<tr>' + ticks.map((v, i) => {
      const show = showAll || i === 0 || i === ticks.length - 1;
      return `<td style="border:none;text-align:left;font-size:9pt;padding:1px 0;width:${tw}px">${show ? v : ''}</td>`;
    }).join('') + '</tr>';
    return t + '</tbody></table>';
  }

  // ── GROUPS ──
  if (m.startsWith('GROUPS:')) {
    const G = Math.min(parseInt(gp('groups')) || 3, 8);
    const I = Math.min(parseInt(gp('items')) || 3, 8);
    const dots = Array(I).fill('●').join('  ');
    let t = `<table style="${tbl}border:none"><tbody><tr>`;
    for (let g = 0; g < G; g++) {
      // Use dashed border instead of border-radius (Google Docs ignores border-radius)
      t += `<td style="border:2px dashed #333;padding:8px 12px;text-align:center;font-size:12pt;min-width:40px">${dots}</td>`;
      if (g < G - 1) t += '<td style="border:none;width:12px">&nbsp;</td>';
    }
    return t + '</tr></tbody></table>';
  }

  // ── TENS FRAME ──
  if (m.startsWith('TENS_FRAME:')) {
    const filled = parseInt(gp('filled') ?? '5');
    const total = parseInt(gp('total') ?? '10');
    const cols = total <= 5 ? total : 5;
    const rows = total <= 5 ? 1 : 2;
    let count = 0;
    let t = `<table style="${tbl}"><tbody>`;
    for (let r = 0; r < rows; r++) {
      t += '<tr>';
      for (let c = 0; c < cols; c++) {
        count++;
        t += `<td style="${cell}width:26px;height:26px;font-size:14pt;background:${count <= filled ? '#334155' : '#fff'};color:#fff">${count <= filled ? '●' : ''}</td>`;
      }
      t += '</tr>';
    }
    return t + '</tbody></table>';
  }

  // ── NUMBER BOND ──
  if (m.startsWith('NUM_BOND:')) {
    const whole = gp('whole') ?? '?';
    const p1 = gp('part1') ?? '?';
    const p2 = gp('part2') ?? '?';
    // Use rounded border (not 50% — GDocs ignores border-radius) + bold value
    const circle = (v) => `<td style="border:2px solid #333;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:13pt;font-weight:bold;padding:4px">${v}</td>`;
    return `<table style="${tbl}border:none;text-align:center"><tbody>
      <tr><td style="border:none;width:50px">&nbsp;</td>${circle(whole)}<td style="border:none;width:50px">&nbsp;</td></tr>
      <tr><td style="border:none;border-top:2px solid #333;border-right:2px solid #333;height:20px">&nbsp;</td><td style="border:none">&nbsp;</td><td style="border:none;border-top:2px solid #333;border-left:2px solid #333;height:20px">&nbsp;</td></tr>
      <tr>${circle(p1)}<td style="border:none;width:50px">&nbsp;</td>${circle(p2)}</tr>
    </tbody></table>`;
  }

  // ── FRACTION BAR (proper + improper) ──
  if (m.startsWith('FRACTION:') || m.startsWith('MIXED_NUM:')) {
    let n, d;
    if (m.startsWith('MIXED_NUM:')) {
      const whole = parseInt((m.match(/whole=(\d+)/) || [])[1]) || 0;
      n = whole * (parseInt((m.match(/d=(\d+)/) || [])[1]) || 1) + (parseInt((m.match(/\bn=(\d+)/) || [])[1]) || 0);
      d = parseInt((m.match(/d=(\d+)/) || [])[1]) || 1;
    } else {
      const frac = m.replace('FRACTION:', '').trim();
      [n, d] = frac.split('/').map(Number);
    }
    n = parseInt(n) || 0; d = Math.max(parseInt(d) || 1, 1);
    const wholeCount = Math.floor(n / d);
    const remainder = n % d;
    const hasPartial = remainder > 0 || wholeCount === 0;
    const totalBars = wholeCount + (hasPartial ? 1 : 0);
    let t = `<table style="${tbl}border:none;"><tbody><tr>`;
    for (let bi = 0; bi < wholeCount; bi++) {
      t += `<td style="border:none;padding-right:6px"><table style="border-collapse:collapse;display:inline-table"><tbody><tr>`;
      for (let si = 0; si < d; si++) t += `<td style="${cell}width:20px;height:22px;background:#93c5fd"></td>`;
      t += `</tr></tbody></table></td>`;
    }
    if (hasPartial) {
      t += `<td style="border:none;padding-right:6px"><table style="border-collapse:collapse;display:inline-table"><tbody><tr>`;
      for (let si = 0; si < d; si++) t += `<td style="${cell}width:20px;height:22px;background:${si < remainder ? '#93c5fd' : '#fff'}"></td>`;
      t += `</tr></tbody></table></td>`;
    }
    return t + '</tr></tbody></table>';
  }

  // ── FRACTION CIRCLE (proper + improper) ──
  // Google Docs ignores border-radius, so use a pie-sector table approach
  if (m.startsWith('FRAC_CIRCLE:') || m.startsWith('MIXED_CIRCLE:')) {
    let n, d;
    if (m.startsWith('MIXED_CIRCLE:')) {
      const whole = parseInt((m.match(/whole=(\d+)/) || [])[1]) || 0;
      d = parseInt((m.match(/d=(\d+)/) || [])[1]) || 1;
      n = whole * d + (parseInt((m.match(/\bn=(\d+)/) || [])[1]) || 0);
    } else {
      const frac = m.replace('FRAC_CIRCLE:', '').trim();
      [n, d] = frac.split('/').map(Number);
    }
    n = parseInt(n) || 0; d = Math.max(parseInt(d) || 1, 1);
    const wholeCount = Math.floor(n / d);
    const remainder = n % d;
    const hasPartial = remainder > 0 || wholeCount === 0;

    // Build a circle as a grid of D sectors (shown as a row of shaded/unshaded cells)
    const makeCircleRow = (filledN, total) => {
      let row = `<table style="border-collapse:collapse;display:inline-table;margin:0 6px;vertical-align:top"><tbody>`;
      row += '<tr>';
      for (let i = 0; i < total; i++)
        row += `<td style="${cell}width:${Math.min(24, Math.floor(120/total))}px;height:28px;background:${i < filledN ? '#93c5fd' : '#fff'}"></td>`;
      row += '</tr>';
      return row + '</tbody></table>';
    };

    let t = `<p style="margin:4px 0">`;
    for (let bi = 0; bi < wholeCount; bi++) t += makeCircleRow(d, d);
    if (hasPartial) t += makeCircleRow(remainder, d);
    return t + '</p>';
  }

  // ── AREA MODEL ──
  if (m.startsWith('AREA_MODEL:')) {
    const colsRaw = (m.match(/cols=([\d,]+)/) || [])[1] || '10,10';
    const rowsRaw = (m.match(/rows=([\d,]+)/) || [])[1] || '1';  // allow comma-sep rows
    const colVals = colsRaw.split(',').map(s => s.trim());
    const rowVals = rowsRaw.split(',').map(s => s.trim());
    const valsRaw = (m.match(/vals=([\d,]+)/) || [])[1];
    const vals = valsRaw ? valsRaw.split(',') : null;

    // Proportional widths: scale to value, cap so total stays compact
    const colNums = colVals.map(v => Math.max(parseFloat(v) || 1, 1));
    const rowNums = rowVals.map(v => Math.max(parseFloat(v) || 1, 1));
    const maxCol = Math.max(...colNums), maxRow = Math.max(...rowNums);
    const maxCW = Math.min(100, Math.floor(240 / colVals.length));
    const minCW = 38;
    const maxRH = Math.min(56, Math.floor(150 / rowVals.length));
    const minRH = 28;
    const colW = colNums.map(v => Math.max(minCW, Math.round((v / maxCol) * maxCW)));
    const rowH = rowNums.map(v => Math.max(minRH, Math.round((v / maxRow) * maxRH)));

    let t = `<table style="${tbl}"><tbody>`;
    // Column header row
    t += '<tr><td style="border:none;width:38px">&nbsp;</td>' +
      colVals.map((cv, ci) => `<td style="${cell}font-weight:bold;background:#f1f5f9;text-align:center;padding:4px 6px;width:${colW[ci]}px">${cv}</td>`).join('') + '</tr>';
    // Data rows with row labels
    rowVals.forEach((rv, ri) => {
      t += `<tr><td style="${cell}font-weight:bold;background:#f1f5f9;text-align:center;padding:4px 6px;height:${rowH[ri]}px">${rv}</td>`;
      colVals.forEach((_, ci) => {
        const idx = ri * colVals.length + ci;
        const v = vals ? (vals[idx] ?? '') : '';
        t += `<td style="${cell}text-align:center;padding:4px;height:${rowH[ri]}px;width:${colW[ci]}px">${v}</td>`;
      });
      t += '</tr>';
    });
    return t + '</tbody></table>';
  }

  // ── BASE-10 BLOCKS ──
  if (m.startsWith('BASE10:')) {
    const TH = Math.min(parseInt(gp('thousands') ?? '0'), 9);
    const H = Math.min(parseInt(gp('hundreds') ?? '0'), 9);
    const T = Math.min(parseInt(gp('tens') ?? '0'), 9);
    const O = Math.min(parseInt(gp('ones') ?? '0'), 9);
    // Render as labeled groups of symbols (works reliably in Google Docs)
    let t = `<table style="${tbl}border:none"><tbody><tr>`;
    if (TH) {
      // Thousands: 4×4 grid symbol ▦ repeated TH times
      t += `<td style="border:none;padding:0 10px 0 0;vertical-align:top">
        <div style="font-size:8pt;color:#666;margin-bottom:2px">Thousands (×${TH})</div>
        <table style="border-collapse:collapse;display:inline-table"><tbody>`;
      for (let i = 0; i < TH; i++) {
        t += `<tr><td style="border:1px solid #7c3aed;padding:1px;margin:1px;vertical-align:top">`;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++)
            t += `<span style="display:inline-block;width:5px;height:5px;background:#7c3aed;margin:0.5px"></span>`;
          if (r < 3) t += '<br/>';
        }
        t += '</td>';
        if ((i + 1) % 3 === 0) t += '</tr><tr>';
      }
      t += '</tr></tbody></table></td>';
    }
    if (H) {
      t += `<td style="border:none;padding:0 10px 0 0;vertical-align:top">
        <div style="font-size:8pt;color:#666;margin-bottom:2px">Hundreds (×${H})</div>
        <table style="border-collapse:collapse;display:inline-table"><tbody>`;
      for (let i = 0; i < H; i++) {
        t += `<tr><td style="border:1px solid #334155;padding:1px;vertical-align:top">`;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++)
            t += `<span style="display:inline-block;width:4px;height:4px;background:#334155;margin:0.5px"></span>`;
          if (r < 3) t += '<br/>';
        }
        t += '</td>';
        if ((i + 1) % 3 === 0) t += '</tr><tr>';
      }
      t += '</tr></tbody></table></td>';
    }
    if (T) {
      t += `<td style="border:none;padding:0 10px 0 0;vertical-align:top">
        <div style="font-size:8pt;color:#666;margin-bottom:2px">Tens (×${T})</div>`;
      for (let i = 0; i < T; i++) {
        t += `<span style="display:inline-block;border:1px solid #334155;width:8px;padding:1px;margin:1px;vertical-align:top">`;
        for (let r = 0; r < 5; r++) t += `<span style="display:block;width:6px;height:4px;background:#334155;margin-bottom:1px"></span>`;
        t += '</span>';
      }
      t += '</td>';
    }
    if (O) {
      t += `<td style="border:none;vertical-align:top">
        <div style="font-size:8pt;color:#666;margin-bottom:2px">Ones (×${O})</div>`;
      for (let i = 0; i < O; i++)
        t += `<span style="display:inline-block;width:12px;height:12px;border:1px solid #334155;background:#334155;margin:1px"></span>`;
      t += '</td>';
    }
    return t + '</tr></tbody></table>';
  }

  // ── PLACE VALUE CHART ──
  if (m.startsWith('PV_CHART:')) {
    const num = m.replace('PV_CHART:', '').trim();
    const digits = num.replace(/,/g, '').split('');
    const allPlaces = ['Millions','Hundred-Thousands','Ten-Thousands','Thousands','Hundreds','Tens','Ones'];
    const places = allPlaces.slice(allPlaces.length - digits.length);
    let t = `<table style="${tbl}"><tbody><tr>`;
    places.forEach(p => { t += `<td style="${cell}font-weight:bold;background:#f1f5f9;padding:4px 6px;font-size:10pt;min-width:44px">${p}</td>`; });
    t += '</tr><tr>';
    digits.forEach(d => { t += `<td style="${cell}font-size:16pt;padding:8px 6px;text-align:center">${d}</td>`; });
    return t + '</tr></tbody></table>';
  }

  // ── BAR MODEL ──
  if (m.startsWith('BAR_MODEL:')) {
    const raw = m.replace('BAR_MODEL:', '').split('|')[0].trim();
    const labelM = m.match(/label=([^\]]+)/);
    const label = labelM ? labelM[1].trim() : null;
    const vals = raw.split(',').map(s => s.trim());
    let t = `<table style="${tbl}border:none"><tbody><tr>`;
    vals.forEach(v => {
      t += `<td style="border:2px solid #333;text-align:center;padding:5px 10px;min-width:36px;font-size:11pt">${v}</td>`;
    });
    t += '</tr>';
    if (label) t += `<tr><td colspan="${vals.length}" style="border:none;text-align:center;font-size:10pt;padding:2px 0">Total: ${label}</td></tr>`;
    return t + '</tbody></table>';
  }

  // ── TAPE DIAGRAM ──
  if (m.startsWith('TAPE:')) {
    const segsRaw = m.replace('TAPE:', '').split('|')[0].trim();
    const totalM = m.match(/total=([^\]\s|]+)/);
    const total = totalM ? totalM[1] : null;
    const segs = segsRaw.split(',').map(s => s.trim());
    let t = `<table style="${tbl}border:none"><tbody><tr>`;
    segs.forEach(seg => {
      const colonIdx = seg.lastIndexOf(':');
      const lbl = colonIdx >= 0 ? seg.slice(0, colonIdx) : seg;
      const val = colonIdx >= 0 ? seg.slice(colonIdx + 1) : '';
      t += `<td style="border:2px solid #333;text-align:center;padding:4px 10px;min-width:44px"><div style="font-size:9pt;color:#555">${val}</div><div style="font-size:11pt;font-weight:bold">${lbl}</div></td>`;
    });
    t += '</tr>';
    if (total) t += `<tr><td colspan="${segs.length}" style="border:none;text-align:center;font-size:10pt;padding:2px 0">Total: ${total}</td></tr>`;
    return t + '</tbody></table>';
  }

  // ── FUNCTION TABLE ──
  if (m.startsWith('FUNC_TABLE:')) {
    const pairsM = m.match(/pairs=([\w:,?]+)/);
    const ruleM = m.match(/rule=([^\]\|]+)/);
    const pairs = pairsM ? pairsM[1].split(',').map(p => p.split(':')) : [];
    const rule = ruleM ? ruleM[1].trim() : '';
    let t = `<table style="${tbl}"><tbody>`;
    t += `<tr><td style="${cell}font-weight:bold;background:#f1f5f9;padding:4px 12px">Input</td><td style="${cell}font-weight:bold;background:#f1f5f9;padding:4px 12px">Output</td></tr>`;
    pairs.forEach(([inp, out]) => {
      t += `<tr><td style="${cell}padding:5px 12px;min-width:48px">${inp ?? ''}</td><td style="${cell}padding:5px 12px;min-width:48px">${out === '?' ? '' : (out ?? '')}</td></tr>`;
    });
    if (rule) t += `<tr><td colspan="2" style="${cell}font-size:10pt;background:#f8fafc">Rule: ${rule}</td></tr>`;
    return t + '</tbody></table>';
  }

  // ── DATA TABLE ──
  if (m.startsWith('DATA_TABLE:')) {
    const rest = m.replace('DATA_TABLE:', '').trim();
    const parts = rest.split('|').map(p => p.trim());
    const headerStr = parts[0].replace(/^header=/, '');
    const headers = headerStr.split(',');
    const dataRows = parts.slice(1);
    let t = `<table style="${tbl}"><tbody>`;
    t += '<tr>' + headers.map(h => `<td style="${cell}font-weight:bold;background:#f1f5f9;padding:4px 8px">${h.trim()}</td>`).join('') + '</tr>';
    dataRows.forEach(row => {
      const cells = row.split(',');
      t += '<tr>' + cells.map(c => `<td style="${cell}padding:4px 8px">${c.trim()}</td>`).join('') + '</tr>';
    });
    return t + '</tbody></table>';
  }

  // ── YES/NO TABLE ──
  if (m.startsWith('YES_NO_TABLE:')) {
    const stmts = m.replace('YES_NO_TABLE:', '').split('|').map(s => s.trim()).filter(Boolean);
    let t = `<table style="${tbl}"><tbody>`;
    t += `<tr><td style="${cell}font-weight:bold;background:#f1f5f9;min-width:180px;padding:4px 8px">Statement</td><td style="${cell}font-weight:bold;background:#f1f5f9;width:52px">Yes</td><td style="${cell}font-weight:bold;background:#f1f5f9;width:52px">No</td></tr>`;
    stmts.forEach(s => {
      t += `<tr><td style="${cell}padding:4px 8px">${s}</td><td style="${cell}text-align:center;font-size:14pt">○</td><td style="${cell}text-align:center;font-size:14pt">○</td></tr>`;
    });
    return t + '</tbody></table>';
  }

  // ── GRID RESPONSE ──
  if (m.startsWith('GRID_RESPONSE:')) {
    const cols = Math.min(parseInt(gp('cols') ?? '4'), 8);
    let t = `<table style="${tbl}"><tbody>`;
    t += '<tr>' + Array(cols).fill(0).map(() => `<td style="${cell}width:30px;height:32px;background:#f8fafc"></td>`).join('') + '</tr>';
    '0123456789'.split('').forEach(d => {
      t += '<tr>' + Array(cols).fill(0).map(() => `<td style="${cell}width:30px;height:22px;font-size:9pt;text-align:center">○ ${d}</td>`).join('') + '</tr>';
    });
    return t + '</tbody></table>';
  }

  // ── NUMBER CHART ──
  if (m.startsWith('NUM_CHART:')) {
    const start = parseInt(gp('start') ?? '1');
    const end = parseInt(gp('end') ?? '100');
    const cols = parseInt(gp('cols') ?? '10');
    const shadedStr = gp('shaded') ?? '';
    const shaded = new Set(shadedStr.split(',').map(Number).filter(Boolean));
    let t = `<table style="${tbl}"><tbody>`;
    for (let num = start; num <= end;) {
      t += '<tr>';
      for (let c = 0; c < cols && num <= end; c++, num++) {
        const hi = shaded.has(num);
        t += `<td style="${cell}width:22px;font-size:9pt;padding:2px;background:${hi ? '#334155' : '#fff'};color:${hi ? '#fff' : '#000'}">${num}</td>`;
      }
      t += '</tr>';
    }
    return t + '</tbody></table>';
  }

  // ── PARTIAL QUOTIENTS ──
  if (m.startsWith('PARTIAL_Q:')) {
    const dvd = parseFloat(gp('dividend') || '0');
    const dvs = gp('divisor');
    const stepsM = m.match(/\bsteps=([\d.:\-,]+)/);
    const stepsStr = stepsM ? stepsM[1] : '';
    const stepList = stepsStr.split(',').filter(Boolean).map(s => {
      const [a, b] = s.split(':');
      return { sub: parseFloat(a)||0, pq: parseFloat(b)||0 };
    });
    let running = dvd;
    const rows = stepList.map(({sub,pq}) => {
      running -= sub;
      return { sub, pq, after: running };
    });
    const quotient = stepList.reduce((s,r) => s + r.pq, 0);
    const rem = running;
    const mono = 'font-family:monospace;font-size:10pt;';
    let t = `<table style="${tbl}border:none;${mono}"><tbody>`;
    if (dvs) t += `<tr><td style="border:none;color:#64748b;font-size:8pt">÷ ${dvs}</td><td style="border:none;text-align:right">${dvd}</td><td style="border:none;padding-left:16px"></td></tr>`;
    else     t += `<tr><td style="border:none"></td><td style="border:none;text-align:right">${dvd}</td><td style="border:none;padding-left:16px"></td></tr>`;
    rows.forEach(({sub,pq,after}) => {
      t += `<tr><td style="border:none;text-align:right">−${sub}</td><td style="border:none"></td><td style="border:none;padding-left:16px;color:#2563eb">${pq}</td></tr>`;
      t += `<tr><td colspan="2" style="border:none;border-top:1.5px solid #334155;text-align:right">${Math.round(after*10000)/10000}</td><td style="border:none"></td></tr>`;
    });
    t += `<tr><td style="border:none"></td><td style="border:none"></td><td style="border:none;border-top:1.5px solid #334155;padding-left:16px;font-weight:bold">${quotient}${rem!==0?` r${Math.round(rem*10000)/10000}`:''}</td></tr>`;
    return t + '</tbody></table>';
  }

  // ── WORK SPACE ──
  if (m.startsWith('WORK_SPACE')) {
    return `<table style="${tbl}width:100%"><tbody><tr><td style="border:1px dashed #94a3b8;height:80pt;width:100%">&nbsp;</td></tr></tbody></table>`;
  }

  // ── MIXED_NUM_BOX ── (student response boxes: whole | N/D)
  if (m.startsWith('MIXED_NUM_BOX')) {
    const whole = (m.match(/whole=([^\s\]]+)/) || [])[1] || '';
    const n = (m.match(/\bn=([^\s\]]+)/) || [])[1] || '';
    const d = (m.match(/\bd=([^\s\]]+)/) || [])[1] || '';
    return `<table style="${tbl}border:none;vertical-align:middle"><tbody><tr>
      <td style="border:2px solid #333;width:44px;height:46px;text-align:center;vertical-align:middle;font-size:14pt;padding:4px">${whole}</td>
      <td style="border:none;width:10px">&nbsp;</td>
      <td style="border:none;padding:0"><table style="border-collapse:collapse">
        <tbody>
          <tr><td style="border:2px solid #333;width:38px;height:22px;text-align:center;font-size:11pt;border-bottom:1px solid #333">${n}</td></tr>
          <tr><td style="border:2px solid #333;width:38px;height:22px;text-align:center;font-size:11pt;border-top:1px solid #333">${d}</td></tr>
        </tbody>
      </table></td>
    </tr></tbody></table>`;
  }

  // ── FRACTION_BOX ── (student response boxes: N/D)
  if (m.startsWith('FRACTION_BOX')) {
    const n = (m.match(/\bn=([^\s\]]+)/) || [])[1] || '';
    const d = (m.match(/\bd=([^\s\]]+)/) || [])[1] || '';
    return `<table style="${tbl}border:none"><tbody><tr><td style="border:none;padding:0">
      <table style="border-collapse:collapse">
        <tbody>
          <tr><td style="border:2px solid #333;width:42px;height:22px;text-align:center;font-size:11pt;border-bottom:1px solid #333">${n}</td></tr>
          <tr><td style="border:2px solid #333;width:42px;height:22px;text-align:center;font-size:11pt;border-top:1px solid #333">${d}</td></tr>
        </tbody>
      </table>
    </td></tr></tbody></table>`;
  }

  // ── IMAGE placeholder ──
  if (m.startsWith('IMAGE:')) {
    const desc = m.replace('IMAGE:', '').trim();
    return `<p style="border:1px dashed #ea580c;padding:6px 10px;color:#ea580c;font-size:10pt;margin:6px 0">[Insert image: ${desc}]</p>`;
  }

  // Default
  return `<p style="border:1px dashed #94a3b8;padding:4px 8px;color:#64748b;font-size:9pt;margin:4px 0">[${m}]</p>`;
}

// ─── Export as Word (.docx) helper ────────────────────────────────────────────

async function exportAsDocx(questions, title, showNameLine, showDateLine, showClassLine, showScoreLine, totalPoints, fontSize = 'normal', twoColChoices = false) {
  // 1. Render SVG markers → PNG data URLs (same canvas technique as Google Docs export)
  const visualPngs = {};
  const markersNeeded = [...new Set(
    questions.filter(q => q.marker && !q.marker.startsWith('[IMAGE:')).map(q => q.marker)
  )];

  if (markersNeeded.length) {
    try {
      const { createRoot } = await import('react-dom/client');
      const renderContainer = document.createElement('div');
      renderContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;background:white;pointer-events:none;';
      document.body.appendChild(renderContainer);

      await Promise.all(markersNeeded.map(async marker => {
        const div = document.createElement('div');
        renderContainer.appendChild(div);
        const root = createRoot(div);
        try {
          root.render(parseVisualModel(marker));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const svgEl = div.querySelector('svg');
          if (!svgEl) return;
          const w = parseFloat(svgEl.getAttribute('width')) || 300;
          const h = parseFloat(svgEl.getAttribute('height')) || 100;
          const serializer = new XMLSerializer();
          let svgStr = serializer.serializeToString(svgEl);
          if (!svgStr.includes('xmlns='))
            svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          const dataUrl = await new Promise(res => {
            const img = new Image();
            img.onload = () => {
              const scale = 2;
              const canvas = document.createElement('canvas');
              canvas.width = Math.ceil(w * scale);
              canvas.height = Math.ceil(h * scale);
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(scale, scale);
              ctx.drawImage(img, 0, 0, w, h);
              res(canvas.toDataURL('image/png'));
            };
            img.onerror = () => res(null);
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
          });
          if (dataUrl) visualPngs[marker] = { dataUrl, w: Math.ceil(w), h: Math.ceil(h) };
        } catch {}
        try { root.unmount(); } catch {}
      }));

      document.body.removeChild(renderContainer);
    } catch {}
  }

  // 2. Annotate questions with pre-rendered PNG data URLs for the server
  const annotated = questions.map(q => {
    if (!q || !q.marker || q.marker.startsWith('[IMAGE:')) return q;
    const png = visualPngs[q.marker];
    if (!png) return q;
    return { ...q, _svgPng: png.dataUrl, _svgW: png.w / 2, _svgH: png.h / 2 };
  });

  // 3. POST to server and download response
  const res = await fetch('/api/export-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions: annotated, title, showNameLine, showDateLine, showClassLine, showScoreLine, totalPoints, fontSize, twoColChoices }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title || 'assessment').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Google Forms Script generator ───────────────────────────────────────────

function generateFormsScript(questions, title) {
  const safeTitle = (title || 'Assessment').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = [];
  lines.push('/**');
  lines.push(' * Auto-generated by Assessment Builder');
  lines.push(' * 1. Open https://script.google.com/create');
  lines.push(' * 2. Paste this code and click Run ▶');
  lines.push(' * 3. Check the Logs (View → Logs) for your form URL');
  lines.push(' */');
  lines.push('function createAssessment() {');
  lines.push(`  var form = FormApp.create('${safeTitle}');`);
  lines.push("  form.setIsQuiz(true);");
  lines.push("  form.setShuffleQuestions(false);");
  lines.push('');

  let qNum = 0;
  for (const q of questions) {
    if (!q || !q.type) continue;
    if (['vb-divider', 'ak-divider', 'answer-key'].includes(q.type)) continue;
    // Skip the title header row (id === 'title')
    if (q.type === 'header' && q.id === 'title') continue;

    if (q.type === 'section') {
      const safeText = (q.text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      lines.push(`  // ── Section ──────────────────────────────────`);
      lines.push(`  var sec = form.addPageBreakItem();`);
      lines.push(`  sec.setTitle('${safeText}');`);
      lines.push('');
      continue;
    }

    if (q.type !== 'question') continue;
    qNum++;
    const v = `q${qNum}`;
    const pts = q.points || 1;
    const safeText = (q.text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    if (q.qType === 'multiselect') {
      lines.push(`  var ${v} = form.addCheckboxItem();`);
      lines.push(`  ${v}.setTitle('${safeText}');`);
      if (q.choices?.length) {
        const choiceStr = q.choices.map(c => {
          const ct = (c.text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `    ${v}.createChoice('${ct}')`;
        }).join(',\n');
        lines.push(`  ${v}.setChoices([\n${choiceStr}\n  ]);`);
      }
      lines.push(`  ${v}.setPoints(${pts});`);

    } else if (q.choices?.length) {
      // Multiple choice
      lines.push(`  var ${v} = form.addMultipleChoiceItem();`);
      lines.push(`  ${v}.setTitle('${safeText}');`);
      const choiceStr = q.choices.map(c => {
        const ct = (c.text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const correct = q.answer && c.letter === q.answer;
        return `    ${v}.createChoice('${ct}', ${correct})`;
      }).join(',\n');
      lines.push(`  ${v}.setChoices([\n${choiceStr}\n  ]);`);
      lines.push(`  ${v}.setPoints(${pts});`);

    } else if (q.qType === 'fill' || q.qType === 'compute' || q.qType === 'computation') {
      lines.push(`  var ${v} = form.addShortAnswerItem();`);
      lines.push(`  ${v}.setTitle('${safeText}');`);
      lines.push(`  ${v}.setPoints(${pts});`);

    } else {
      // open, word, default
      lines.push(`  var ${v} = form.addParagraphTextItem();`);
      lines.push(`  ${v}.setTitle('${safeText}');`);
      lines.push(`  ${v}.setPoints(${pts});`);
    }
    lines.push('');
  }

  lines.push("  Logger.log('✅ Form created!');");
  lines.push("  Logger.log('Edit URL: ' + form.getEditUrl());");
  lines.push("  Logger.log('Student URL: ' + form.getPublishedUrl());");
  lines.push('}');
  return lines.join('\n');
}

// ─── Google Forms Script Modal ────────────────────────────────────────────────

function FormsScriptModal({ script, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select all in textarea
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Export to Google Forms</h3>
            <p className="text-xs text-gray-500 mt-0.5">3-step process — no sign-in required here</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Steps */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <ol className="text-xs text-blue-800 space-y-1 list-none">
            <li><span className="font-bold">1.</span> Copy the script below</li>
            <li><span className="font-bold">2.</span> Open <a href="https://script.google.com/create" target="_blank" rel="noreferrer" className="underline font-semibold">script.google.com/create</a> → paste → click <strong>Run ▶</strong></li>
            <li><span className="font-bold">3.</span> Check <strong>View → Logs</strong> for your form link</li>
          </ol>
        </div>

        {/* Script box */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <textarea
            readOnly
            value={script}
            className="w-full h-64 font-mono text-xs border border-gray-200 rounded-lg p-3 bg-gray-50 resize-none focus:outline-none"
          />
        </div>

        <div className="flex gap-3 px-6 pb-5 pt-1">
          <button
            onClick={copy}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {copied ? '✓ Copied!' : '📋 Copy Script'}
          </button>
          <a href="https://script.google.com/create" target="_blank" rel="noreferrer"
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 text-center transition-colors">
            Open script.google.com ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Google Docs copy helper ──────────────────────────────────────────────────

function gdocPlainText(questions) {
  return questions
    .filter(q => q.type === 'question' || q.type === 'header')
    .map(q => {
      if (q.type === 'header') return `\n${q.text}\n`;
      const num = q.qNum ? `${q.qNum}. ` : '';
      const choices = q.choices?.length
        ? '\n' + q.choices.map(c => `    ${c.letter}) ${c.text}`).join('\n')
        : '';
      return `${num}${q.text || ''}${choices}`;
    })
    .join('\n\n');
}

function execCopy(html) {
  const bodyHtml = html.replace(/^<html><body[^>]*>/, '').replace(/<\/body><\/html>$/, '');
  const div = document.createElement('div');
  div.setAttribute('contenteditable', 'true');
  div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0.01;pointer-events:none;width:700px;';
  div.innerHTML = bodyHtml;
  document.body.appendChild(div);
  div.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(div);
  sel.removeAllRanges();
  sel.addRange(range);
  const ok = document.execCommand('copy');
  sel.removeAllRanges();
  document.body.removeChild(div);
  return ok;
}

async function copyToGoogleDocs(questions) {
  // ── 1. Render each SVG visual to a PNG data-URL ───────────────────────────
  const visualPngs = {};
  const markersNeeded = [...new Set(
    questions.filter(q => q.marker && !q.marker.startsWith('[IMAGE:')).map(q => q.marker)
  )];

  if (markersNeeded.length) {
    try {
      const { createRoot } = await import('react-dom/client');
      const renderContainer = document.createElement('div');
      renderContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;background:white;pointer-events:none;';
      document.body.appendChild(renderContainer);

      // Render all markers in parallel
      await Promise.all(markersNeeded.map(async marker => {
        const div = document.createElement('div');
        renderContainer.appendChild(div);
        const root = createRoot(div);
        try {
          root.render(parseVisualModel(marker));
          // Wait two frames for React to paint
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

          const svgEl = div.querySelector('svg');
          if (!svgEl) return;

          const w = parseFloat(svgEl.getAttribute('width')) || 300;
          const h = parseFloat(svgEl.getAttribute('height')) || 100;

          // Serialize SVG (ensure xmlns present for img src rendering)
          const serializer = new XMLSerializer();
          let svgStr = serializer.serializeToString(svgEl);
          if (!svgStr.includes('xmlns='))
            svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

          const dataUrl = await new Promise(res => {
            const img = new Image();
            img.onload = () => {
              const scale = 2; // retina-quality
              const canvas = document.createElement('canvas');
              canvas.width = Math.ceil(w * scale);
              canvas.height = Math.ceil(h * scale);
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(scale, scale);
              ctx.drawImage(img, 0, 0, w, h);
              res(canvas.toDataURL('image/png'));
            };
            img.onerror = () => res(null);
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
          });

          if (dataUrl) visualPngs[marker] = { dataUrl, w: Math.ceil(w), h: Math.ceil(h) };
        } catch (e) { /* skip individual render failures */ }
        try { root.unmount(); } catch (e) {}
      }));

      document.body.removeChild(renderContainer);
    } catch (e) { /* dynamic import failed – fall back to table HTML */ }
  }

  // ── 2. Build HTML ─────────────────────────────────────────────────────────
  let html = `<html><body style="font-family:Arial,sans-serif;font-size:12pt;line-height:1.8;margin:0;padding:0">`;

  questions.forEach(q => {
    if (!q || !q.type) return;

    if (q.type === 'header') {
      html += `<p style="font-size:14pt;font-weight:bold;text-align:center;margin:0 0 4px 0">${q.text}</p>`;
    } else if (q.type === 'meta') {
      html += `<p style="text-align:center;font-size:11pt;color:#555;margin:0 0 12px 0">${q.text}</p>`;
    } else if (q.type === 'section') {
      html += `<p style="font-weight:bold;margin:16px 0 4px 0;font-size:12pt">${q.text}</p>`;
    } else if (q.type === 'vb-divider') {
      html += `<br/><p style="font-size:13pt;font-weight:bold;border-top:2px solid #333;padding-top:10px;margin:16px 0 8px 0">VERSION B</p>`;
    } else if (q.type === 'ak-divider') {
      html += `<br/><p style="font-size:13pt;font-weight:bold;border-top:2px solid #333;padding-top:10px;margin:16px 0 8px 0">TEACHER ANSWER KEY</p>`;
    } else if (q.type === 'answer-key') {
      html += `<p style="font-family:monospace;font-size:11pt;margin:0 0 2px 0">${q.text}</p>`;
    } else if (q.type === 'question') {
      // Wrap each question in a page-break-safe container with extra top spacing
      html += `<div style="page-break-inside:avoid;margin-top:28px">`;

      // Visual — use custom uploaded image first, then captured PNG, then table HTML
      if (q._customImg) {
        html += `<p style="margin:0 0 4px 0"><img src="${q._customImg}" style="display:block;max-width:100%;max-height:200px;border:none"></p>`;
      } else if (q.marker && !q.marker.startsWith('[IMAGE:')) {
        const png = visualPngs[q.marker];
        if (png) {
          html += `<p style="margin:0 0 4px 0"><img src="${png.dataUrl}" width="${png.w}" height="${png.h}" style="display:block;max-width:100%;border:none"></p>`;
        } else {
          html += visualToHtml(q.marker);
        }
      }

      // Question number + text + standard tag (table for reliable right-align in Docs)
      const numStr = q.qNum ? `<strong>${q.qNum}.</strong> ` : '';
      if (q.standard) {
        html += `<table style="width:100%;border-collapse:collapse;border:none;margin:2px 0 4px 0"><tbody><tr>
          <td style="border:none;padding:0;vertical-align:top">${numStr}${q.text || ''}</td>
          <td style="border:none;text-align:right;vertical-align:top;white-space:nowrap;font-size:9pt;color:#3b82f6;font-style:italic;padding-left:12px">${q.standard}</td>
        </tr></tbody></table>`;
      } else {
        html += `<p style="margin:2px 0 4px 0">${numStr}${q.text || ''}</p>`;
      }

      // Sub-lines — math item rows get letter-spaced cells; prose stays plain
      q.lines?.forEach(l => {
        const items = splitMathItems(l);
        if (items) {
          // Render as a table row with each item in its own cell for spacing
          html += `<table style="border-collapse:collapse;margin:6px 0 6px 20px;border:none"><tbody><tr>`;
          items.forEach(item => {
            html += `<td style="border:none;padding:0 28px 0 0;font-family:Georgia,serif;font-size:13pt;white-space:nowrap">${item}</td>`;
          });
          html += `</tr></tbody></table>`;
        } else {
          html += `<p style="margin:4px 0 4px 20px">${l}</p>`;
        }
      });

      // Choices
      if (q.choices?.length) {
        const isSATA = q.qType === 'multiselect' || /select all|choose all/i.test(q.text || '');
        const bubble = isSATA ? '☐' : '○';
        q.choices.forEach(ch => {
          html += `<p style="margin:1px 0 1px 28px">${bubble} ${ch.letter})&nbsp;&nbsp;${ch.text}</p>`;
        });
      }

      html += `</div>`;
    }
  });

  html += '</body></html>';

  // ── 3. Write to clipboard (execCommand – most reliable for Google Docs) ───
  const plain = gdocPlainText(questions);
  try {
    const ok = execCopy(html);
    if (!ok) throw new Error('execCommand returned false');
  } catch {
    // Fallback: ClipboardItem API
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);
    } catch {
      await navigator.clipboard.writeText(plain).catch(() => {});
    }
  }

  window.open('https://docs.google.com/document/create', '_blank');
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssessmentBuilder() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [appMode, setAppMode] = useState('ai'); // 'ai' | 'manual'
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCopyGdoc = qs => {
    showToast('Preparing visuals…');
    copyToGoogleDocs(qs).then(() => {
      showToast('Copied! Paste into the Google Doc that just opened (Ctrl+V / Cmd+V)');
    });
  };

  const handleExportDocx = ({ questions: qs, title = '', showNameLine = true, showDateLine = true, showClassLine = false, showScoreLine = true, totalPoints = null, fontSize = 'normal', twoColChoices = false }) => {
    showToast('Building Word document…');
    exportAsDocx(qs, title, showNameLine, showDateLine, showClassLine, showScoreLine, totalPoints, fontSize, twoColChoices)
      .then(() => showToast('Downloaded! Open in Word or upload to Google Drive.'))
      .catch(() => showToast('Export failed — please try again'));
  };

  // Input mode
  const [inputMode, setInputMode] = useState('file'); // file | paste | url | scratch
  const [gradeLevel, setGradeLevel] = useState('3');
  const [subject, setSubject] = useState('Math');
  const [standard, setStandard] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [includeVersionB, setIncludeVersionB] = useState(false);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [url, setUrl] = useState('');
  const [scratchTopic, setScratchTopic] = useState('');
  const [scratchInstructions, setScratchInstructions] = useState('');

  // File
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  // Generation state
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState(''); // 'extract' | 'parallel' — shown in button label
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [pendingRawText, setPendingRawText] = useState(''); // extracted text awaiting user review/edit before parsing
  const [questions, setQuestions] = useState([]);
  const [customVisuals, setCustomVisuals] = useState({});
  const [resultMode, setResultMode] = useState(''); // 'review' | 'extract' | 'parallel' — what produced current result
  const [editingVisual, setEditingVisual] = useState(null); // {qId, marker, customImg, imgScale}
  const [regenningIdx, setRegenningIdx] = useState(null);
  const [aiFormsScript, setAiFormsScript] = useState(null);

  // Load API key + restore AI mode state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
    // Restore AI mode session
    try {
      const aiSaved = localStorage.getItem('ab-ai');
      if (aiSaved) {
        const d = JSON.parse(aiSaved);
        if (d.questions?.length) {
          setQuestions(d.questions);
          setCustomVisuals(d.customVisuals || {});
          setRawText(d.rawText || '');
        }
      }
    } catch {}
    // inject print styles
    const style = document.createElement('style');
    style.textContent = PRINT_STYLE;
    document.head.appendChild(style);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save AI mode state to localStorage
  useEffect(() => {
    if (!questions.length) return;
    try {
      localStorage.setItem('ab-ai', JSON.stringify({ questions, customVisuals, rawText }));
    } catch {} // quota exceeded — silently ignore
  }, [questions, customVisuals, rawText]);

  const saveApiKey = key => {
    setApiKey(key);
    localStorage.setItem('anthropic_api_key', key);
  };

  const handleFileChange = e => {
    setFile(e.target.files[0] || null);
  };

  const handleGenerate = async (generateMode = 'parallel') => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true);
    setLoadingMode(generateMode);
    setError('');
    setRawText('');
    setPendingRawText('');
    setQuestions([]);
    setCustomVisuals({});
    setResultMode('');

    try {
      let response;
      if (inputMode === 'file' && file) {
        const fd = new FormData();
        fd.append('apiKey', apiKey);
        fd.append('gradeLevel', gradeLevel);
        fd.append('subject', subject);
        fd.append('standard', standard);
        fd.append('customTitle', customTitle);
        fd.append('includeVersionB', String(includeVersionB));
        fd.append('includeAnswerKey', String(includeAnswerKey));
        fd.append('generateMode', generateMode);
        fd.append('file', file);
        response = await fetch('/api/generate', { method: 'POST', body: fd });
      } else {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey, gradeLevel, subject, standard, customTitle,
            includeVersionB, includeAnswerKey, generateMode,
            inputMode, pastedText, url, scratchTopic, scratchInstructions,
          }),
        });
      }
      const data = await response.json();
      if (data.error) { setError(data.error); return; }
      // Show extracted text for review/edit before parsing into questions
      setPendingRawText(data.result);
      setResultMode('review');
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
      setLoadingMode('');
    }
  };

  // Parse questions from the reviewed/edited raw text
  const handleParseFromRaw = () => {
    const text = pendingRawText;
    setRawText(text);
    setQuestions(parseAssessment(text).map(q => ({ ...q, marker: null, _customImg: null })));
    setPendingRawText('');
    setResultMode('extract');
  };

  // Generate a parallel form from the already-extracted text (Step 2 of the two-step flow)
  const handleCreateParallel = async () => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true);
    setLoadingMode('parallel');
    setError('');
    setQuestions([]);
    setCustomVisuals({});
    setResultMode('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey, gradeLevel, subject, standard, customTitle,
          includeVersionB, includeAnswerKey,
          generateMode: 'parallel',
          inputMode: 'paste',
          pastedText: rawText,
        }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); return; }
      setRawText(data.result);
      // Strip any AI-generated visual markers — user adds visuals manually via "+ Add Visual/Model"
      setQuestions(parseAssessment(data.result).map(q => ({ ...q, marker: null, _customImg: null })));
      setResultMode('parallel');
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
      setLoadingMode('');
    }
  };

  const handleEditVisual = (qId, marker, customImg, imgScale) => {
    setEditingVisual({ qId, marker, customImg, imgScale });
  };

  const handleSaveVisual = ({ marker, customImg, imgScale }) => {
    const qId = editingVisual.qId;
    // Update the override map so AssessmentPreview uses this exclusively (keyed by question ID)
    setCustomVisuals(prev => ({ ...prev, [qId]: { marker, customImg, imgScale: imgScale ?? 1 } }));
    // Also write back into questions state so print/export and re-mounts stay in sync
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, marker: marker || null, _customImg: customImg || null, _imgScale: imgScale ?? 1 } : q
    ));
    setEditingVisual(null);
  };

  const handleQuestionEdit = (updatedQ) => {
    setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
  };

  const handleRegenQuestion = async idx => {
    if (!apiKey) { showToast('Add your API key first (⚙ API Key)'); return; }
    setRegenningIdx(idx);
    try {
      const q = questions[idx];
      const contextQuestions = questions.filter((_, i) => i !== idx).slice(0, 6);
      const res = await fetch('/api/regen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, question: q, contextQuestions, gradeLevel, subject, standard }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error); return; }
      const parsed = parseAssessment(data.result);
      if (parsed.length > 0) {
        // Preserve original question's type, number, and version flag;
        // qType MUST come from the original so MC stays MC, fill-in stays fill-in.
        // Strip AI-generated marker — user adds visuals manually.
        const newQ = { ...parsed[0], id: q.id, qNum: q.qNum, vb: q.vb, qType: q.qType, marker: null, _customImg: null };
        setQuestions(prev => prev.map((pq, i) => i === idx ? newQ : pq));
        // Clear stale customVisuals entry for this question so the new question renders cleanly
        setCustomVisuals(prev => { const next = { ...prev }; delete next[q.id]; return next; });
      }
    } catch {
      showToast('Regeneration failed — check your API key');
    } finally {
      setRegenningIdx(null);
    }
  };

  const handlePrint = () => window.print();

  const hasResult = questions.length > 0 || resultMode === 'review';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-lg no-print">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">A</div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Assessment Builder</h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">AI-powered parallel forms</p>
            </div>
          </div>
          {/* App mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[['ai', '✦ AI Generate'], ['manual', '✏ Manual Build']].map(([mode, label]) => (
              <button key={mode} onClick={() => setAppMode(mode)}
                className={`px-4 py-1.5 text-xs rounded-md transition-all font-medium ${appMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors" title="Settings">
          <span className="text-base leading-none">⚙</span><span className="font-medium">API Key</span>
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">

      {/* ── Manual Build mode ── */}
      {appMode === 'manual' && (
        <ManualBuilder onPrint={() => window.print()} onCopyGdoc={handleCopyGdoc} onExportDocx={handleExportDocx} />
      )}

      {/* ── AI Generate mode ── */}
      {appMode === 'ai' && (
      <div className="flex gap-6">

        {/* Left panel — inputs */}
        <div className="w-80 shrink-0 space-y-4 no-print">

          {/* Mode tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Input</p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {[['file', 'Upload PDF'], ['paste', 'Paste Text'], ['url', 'URL'], ['scratch', 'From Scratch']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 py-1.5 text-xs transition-colors ${inputMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {inputMode === 'file' && (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                  {file
                    ? <><p className="text-sm font-medium text-blue-700">{file.name}</p><p className="text-xs text-blue-500">{(file.size / 1024).toFixed(0)} KB</p></>
                    : <><p className="text-sm text-gray-500">Click to upload PDF or image</p><p className="text-xs text-gray-400">.pdf · .png · .jpg · .webp</p></>
                  }
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {inputMode === 'paste' && (
              <textarea value={pastedText} onChange={e => setPastedText(e.target.value)}
                placeholder="Paste assessment text here..."
                className="w-full border rounded p-2 text-sm h-32 resize-none" />
            )}

            {inputMode === 'url' && (
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border rounded p-2 text-sm" />
            )}

            {inputMode === 'scratch' && (
              <div className="space-y-2">
                <input value={scratchTopic} onChange={e => setScratchTopic(e.target.value)}
                  placeholder="Topic (e.g. multiplication facts)"
                  className="w-full border rounded p-2 text-sm" />
                <textarea value={scratchInstructions} onChange={e => setScratchInstructions(e.target.value)}
                  placeholder="Extra instructions (optional)"
                  className="w-full border rounded p-2 text-sm h-20 resize-none" />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Options</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Grade</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
                  className="w-full border rounded p-1.5 text-sm">
                  {['K', '1', '2', '3', '4', '5', '6', '7', '8'].map(g => (
                    <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full border rounded p-1.5 text-sm">
                  {['Math', 'ELA', 'Science', 'Social Studies'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Standard (optional)</label>
              <input value={standard} onChange={e => setStandard(e.target.value)}
                placeholder="e.g. 3.OA.A.1"
                className="w-full border rounded p-1.5 text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Custom Title (optional)</label>
              <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                placeholder="Leave blank to match source"
                className="w-full border rounded p-1.5 text-sm" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={includeVersionB} onChange={e => setIncludeVersionB(e.target.checked)}
                  className="rounded" />
                Include Version B
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={includeAnswerKey} onChange={e => setIncludeAnswerKey(e.target.checked)}
                  className="rounded" />
                Include Answer Key
              </label>
            </div>
          </div>

          {/* Generate buttons — two-step flow for file uploads */}
          {inputMode === 'file' ? (
            <div className="space-y-2">
              <button
                onClick={() => handleGenerate('extract')}
                disabled={loading || !file}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:shadow-sm active:translate-y-px">
                {loading && loadingMode === 'extract' ? 'Extracting…' : '📄 Step 1: Extract from PDF'}
              </button>
              <button
                onClick={() => handleGenerate('parallel')}
                disabled={loading || !file}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:shadow-sm active:translate-y-px">
                {loading && loadingMode === 'parallel' ? 'Generating…' : '✦ Step 2: Generate Parallel'}
              </button>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Extract first to review the copy, then generate a parallel version
              </p>
            </div>
          ) : (
            <button
              onClick={() => handleGenerate('parallel')}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md active:shadow-sm active:translate-y-px">
              {loading ? 'Generating…' : '✦ Generate Assessment'}
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {hasResult && (
            <div className="space-y-2">
              <button onClick={handlePrint}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                🖨 Print / Export PDF
              </button>
              <button onClick={() => handleCopyGdoc(questions)}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                📋 Copy to Google Docs
              </button>
              <button onClick={() => handleExportDocx({ questions, title: customTitle })}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                📄 Export as Word (.docx)
              </button>
              <button onClick={() => setAiFormsScript(generateFormsScript(questions, customTitle))}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                📝 Export to Google Forms
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([rawText], { type: 'text/plain' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'assessment.txt';
                  a.click();
                }}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                ⬇ Download Text
              </button>
              <button
                onClick={() => { setQuestions([]); setRawText(''); setPendingRawText(''); setCustomVisuals({}); setFile(null); setResultMode(''); }}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-400 hover:bg-gray-50 transition-colors">
                ✕ Clear
              </button>
            </div>
          )}

          {/* Raw text — editable, with re-parse button */}
          {rawText && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Edit raw text / Re-parse</summary>
              <div className="mt-2 space-y-2">
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  className="w-full h-48 border border-gray-200 rounded p-2 font-mono text-xs text-gray-700 bg-gray-50 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
                  spellCheck={false}
                />
                <button
                  onClick={() => setQuestions(parseAssessment(rawText).map(q => ({ ...q, marker: null, _customImg: null })))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                  ↻ Re-parse Questions from Edited Text
                </button>
              </div>
            </details>
          )}
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="flex flex-col items-center justify-center h-80 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium text-gray-700">Generating parallel form…</p>
              <p className="text-xs mt-1.5 text-gray-400">This may take 20–40 seconds</p>
            </div>
          )}

          {!loading && !hasResult && (
            <div className="flex flex-col items-center justify-center h-80 rounded-xl border-2 border-dashed border-gray-200 bg-white text-center px-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">📄</div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Ready to generate</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Upload a PDF or enter your content on the left, then click Generate. Visuals will be recreated as editable vector graphics.</p>
            </div>
          )}

          {!loading && hasResult && (
            <div>
              {/* ── Review & Edit step — shown immediately after extraction ── */}
              {resultMode === 'review' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 no-print">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">📋 Review Extracted Text</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Check the text below for accuracy. Fix any missing content (e.g. incomplete questions) before parsing into questions.
                      </p>
                    </div>
                    <button
                      onClick={handleParseFromRaw}
                      className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap">
                      Parse Questions →
                    </button>
                  </div>
                  <textarea
                    value={pendingRawText}
                    onChange={e => setPendingRawText(e.target.value)}
                    className="w-full h-96 border border-amber-200 rounded-lg p-3 text-xs font-mono bg-white text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-amber-300"
                    spellCheck={false}
                    placeholder="Extracted text will appear here..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-600">
                      Tip: Look for incomplete questions (e.g. "14. ____") and fill them in before parsing.
                    </p>
                    <button
                      onClick={handleParseFromRaw}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors shadow-sm">
                      Parse Questions →
                    </button>
                  </div>
                </div>
              )}

              {/* Step banner — shown after parsing, prompts Step 2 */}
              {resultMode === 'extract' && (
                <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex items-center justify-between gap-4 no-print">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">✅ Questions parsed</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Edit any question below. When ready, create a parallel version with new numbers.</p>
                  </div>
                  <button
                    onClick={handleCreateParallel}
                    disabled={loading}
                    className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                    ✦ Create Parallel Version
                  </button>
                </div>
              )}
              {resultMode === 'parallel' && (
                <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center justify-between gap-4 no-print">
                  <p className="text-xs text-blue-700 font-medium">✦ Parallel version generated — edit any question, visual, or choice below</p>
                  <button
                    onClick={handleCreateParallel}
                    disabled={loading}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-xs font-medium hover:bg-blue-50 transition-colors">
                    Regenerate Parallel
                  </button>
                </div>
              )}
              {resultMode !== 'review' && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => { if (window.confirm('Clear this assessment and start over?')) { setQuestions([]); setCustomVisuals({}); setRawText(''); setPendingRawText(''); setResultMode(''); localStorage.removeItem('ab-ai'); } }}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors no-print">
                  ✕ New Assessment
                </button>
              </div>
              )}
              {resultMode !== 'review' && (
              <div id="print-area" className="bg-white rounded-xl border border-gray-100 p-8 shadow-md">
                {/* Pull title out so Name/Date can go between title and questions */}
                {questions[0]?.type === 'header' && (
                  <div className="text-center font-bold text-lg mb-3 font-serif text-gray-800">
                    {questions[0].text}
                  </div>
                )}
                {/* Name / Date header — always shown below title */}
                <div className="flex gap-8 mb-5 font-serif text-sm text-gray-900">
                  <div className="flex-1 flex items-baseline gap-2">
                    <span className="shrink-0">Name</span>
                    <span className="flex-1 border-b border-gray-800 inline-block" style={{minWidth:'8rem'}} />
                  </div>
                  <div className="w-48 flex items-baseline gap-2">
                    <span className="shrink-0">Date</span>
                    <span className="flex-1 border-b border-gray-800 inline-block" />
                  </div>
                </div>
                {(() => {
                  const hasHeader = questions[0]?.type === 'header';
                  const off = hasHeader ? 1 : 0;
                  return (
                    <AssessmentPreview
                      questions={hasHeader ? questions.slice(1) : questions}
                      customVisuals={customVisuals}
                      onEdit={handleEditVisual}
                      onQuestionEdit={(idx, updatedQ) => handleQuestionEdit(updatedQ)}
                      onRegen={(idx) => handleRegenQuestion(idx + off)}
                      onDelete={(idx) => setQuestions(prev => prev.filter((_, i) => i !== idx + off))}
                      regenningIdx={regenningIdx != null ? regenningIdx - off : null}
                    />
                  );
                })()}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modals */}
      {showSettings && (
        <SettingsModal apiKey={apiKey} onSave={saveApiKey} onClose={() => setShowSettings(false)} />
      )}
      {editingVisual && (
        <ModelEditor
          marker={editingVisual.marker}
          initialCustomImg={editingVisual.customImg}
          initialImgScale={editingVisual.imgScale}
          onSave={handleSaveVisual}
          onClose={() => setEditingVisual(null)}
        />
      )}
      {aiFormsScript && <FormsScriptModal script={aiFormsScript} onClose={() => setAiFormsScript(null)} />}
      </div>
    </div>
  );
}
