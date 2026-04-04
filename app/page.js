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
  hopSize = null, hopStart = null, hops = null }) {
  const mn = parseFloat(min), mx = parseFloat(max), st = parseFloat(step) || 1;

  // Build tick positions
  const ticks = [];
  for (let v = mn; v <= mx + 0.0001; v += st) ticks.push(parseFloat(v.toFixed(4)));

  const hasArcs = jumps === true || jumps === 'true' || jumps === 'yes';
  const W = 340, pad = 28, lineY = hasArcs ? 58 : 38;
  const totalH = hasArcs ? 84 : 56;
  const toX = v => pad + ((v - mn) / (mx - mn)) * (W - 2 * pad);

  // Build hop pairs — three modes:
  // 1. custom hops string "0:5,5:12,12:20"
  // 2. uniform hop_size with optional hop_start
  // 3. default: hop every step (original behavior)
  let hopPairs = [];
  if (hasArcs) {
    if (hops && String(hops).trim()) {
      // Parse "0:5,5:12" style
      hopPairs = String(hops).split(',').map(s => {
        const [a, b] = s.split(':').map(Number);
        return [a, b];
      }).filter(([a, b]) => !isNaN(a) && !isNaN(b));
    } else if (hopSize) {
      // Uniform hops of hopSize units
      const hs = parseFloat(hopSize);
      const start = hopStart !== null && hopStart !== '' ? parseFloat(hopStart) : mn;
      if (hs > 0) {
        for (let v = start; v + hs <= mx + 0.0001; v = parseFloat((v + hs).toFixed(4))) {
          hopPairs.push([v, parseFloat((v + hs).toFixed(4))]);
        }
      }
    } else {
      // Default: hop each step
      ticks.slice(0, -1).forEach((v, i) => hopPairs.push([v, ticks[i + 1]]));
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
        const showLabel = showAll || v === mn || v === mx;
        return (
          <g key={i}>
            <line x1={x} y1={lineY - 7} x2={x} y2={lineY + 7} stroke="#334155" strokeWidth={1.5} />
            {showLabel && (
              <text x={x} y={lineY + 20} textAnchor="middle" fontSize={11} fill="#334155">{v}</text>
            )}
          </g>
        );
      })}

      {/* Hop arcs with value labels */}
      {hopPairs.map(([v1, v2], i) => {
        const x1 = toX(Math.max(v1, mn)), x2 = toX(Math.min(v2, mx));
        const midX = (x1 + x2) / 2;
        const span = x2 - x1;
        const arcH = Math.min(32, Math.max(14, span * 0.45));
        const hopVal = parseFloat((v2 - v1).toFixed(4));
        const label = hopVal > 0 ? `+${hopVal % 1 === 0 ? hopVal : hopVal}` : `${hopVal}`;
        return (
          <g key={i}>
            <path d={`M${x1},${lineY} Q${midX},${lineY - arcH} ${x2},${lineY}`}
              fill="none" stroke="#2563eb" strokeWidth={2} />
            {/* Arrow tip */}
            <polygon
              points={`${x2},${lineY} ${x2 - 5},${lineY - 6} ${x2 + 1},${lineY - 3}`}
              fill="#2563eb" />
            {/* Value label above arc */}
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
    <svg width={totalW} height={H + 22} style={{ display: 'block' }}>
      {Array.from({ length: wholeCount }, (_, bi) => (
        <g key={`w${bi}`}>
          {Array.from({ length: D }, (_, si) => (
            <rect key={si} x={pad + bi * (barW + gap) + si * segW} y={1}
              width={segW - 1} height={H} fill="#93c5fd" stroke="#334155" strokeWidth={1.5} />
          ))}
          <text x={pad + bi * (barW + gap) + barW / 2} y={H + 17}
            textAnchor="middle" fontSize={10} fill="#6b7280">1 whole</text>
        </g>
      ))}
      {hasPartial && (
        <g>
          {Array.from({ length: D }, (_, si) => (
            <rect key={si} x={pad + wholeCount * (barW + gap) + si * segW} y={1}
              width={segW - 1} height={H}
              fill={si < remainder ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />
          ))}
          <text x={pad + wholeCount * (barW + gap) + barW / 2} y={H + 17}
            textAnchor="middle" fontSize={10} fill="#6b7280">{remainder}/{D}</text>
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
    <svg width={totalW} height={circleD + 20} style={{ display: 'block' }}>
      {Array.from({ length: wholeCount }, (_, bi) => {
        const cx = bi * (circleD + gap) + circleD / 2;
        return (
          <g key={`w${bi}`}>
            {makeCircle(cx, cy, D)}
            <text x={cx} y={circleD + 15} textAnchor="middle" fontSize={10} fill="#6b7280">1 whole</text>
          </g>
        );
      })}
      {hasPartial && (() => {
        const cx = wholeCount * (circleD + gap) + circleD / 2;
        return (
          <g key="frac">
            {makeCircle(cx, cy, remainder)}
            <text x={cx} y={circleD + 15} textAnchor="middle" fontSize={10} fill="#6b7280">{remainder}/{D}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function AreaModel({ cols, rows: rowsStr, vals }) {
  const colVals = (cols || '20,7').split(',').map(s => s.trim());
  const rowVals = (rowsStr || '4').split(',').map(s => s.trim());
  const cellVals = vals ? vals.split(',').map(s => s.trim()) : [];
  const cellW = 72, cellH = 48, labelW = 40, labelH = 30;
  const W = labelW + colVals.length * cellW + 2;
  const H = labelH + rowVals.length * cellH + 2;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {colVals.map((cv, ci) => (
        <text key={ci} x={labelW + ci * cellW + cellW / 2} y={labelH - 8}
          textAnchor="middle" fontSize={13} fontWeight="600" fill="#334155">{cv}</text>
      ))}
      {rowVals.map((rv, ri) => (
        <text key={ri} x={labelW - 8} y={labelH + ri * cellH + cellH / 2 + 5}
          textAnchor="end" fontSize={13} fontWeight="600" fill="#334155">{rv}</text>
      ))}
      {rowVals.map((_, ri) =>
        colVals.map((_, ci) => {
          const idx = ri * colVals.length + ci;
          const cellVal = cellVals[idx];
          const colors = ['#fed7aa', '#fce7f3', '#bbf7d0', '#bfdbfe', '#fef08a'];
          const fill = cellVal ? colors[ci % colors.length] : 'white';
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={labelW + ci * cellW} y={labelH + ri * cellH}
                width={cellW} height={cellH}
                fill={fill} stroke="#334155" strokeWidth={1.5} />
              {cellVal && (
                <text x={labelW + ci * cellW + cellW / 2} y={labelH + ri * cellH + cellH / 2 + 5}
                  textAnchor="middle" fontSize={14} fontWeight="600" fill="#334155">{cellVal}</text>
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

function Base10({ hundreds = 0, tens = 0, ones = 0 }) {
  const H = parseInt(hundreds) || 0;
  const T = parseInt(tens) || 0;
  const O = parseInt(ones) || 0;
  const blockSz = 30, unitSz = 8, gap = 6, pad = 10;
  let x = pad;
  const items = [];
  for (let i = 0; i < Math.min(H, 9); i++) {
    const bx = x, by = pad;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        items.push(<rect key={`h${i}${r}${c}`} x={bx + c * 3} y={by + r * 3} width={2.5} height={2.5} fill="#334155" />);
    x += blockSz + gap;
  }
  for (let i = 0; i < Math.min(T, 9); i++) {
    for (let r = 0; r < 10; r++)
      items.push(<rect key={`t${i}${r}`} x={x} y={pad + r * 3} width={8} height={2.5} fill="#334155" />);
    x += 12 + gap;
  }
  for (let i = 0; i < Math.min(O, 9); i++) {
    items.push(<rect key={`o${i}`} x={x} y={pad + 2} width={unitSz} height={unitSz} fill="#334155" />);
    x += unitSz + gap;
  }
  const totalW = Math.max(x + pad, 60);
  return (
    <svg width={totalW} height={50} style={{ display: 'block' }}>
      {items}
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
    return <NumberLine min={kv.min} max={kv.max} step={kv.step}
      showAll={kv.show === 'all'} jumps={kv.jumps === 'yes'}
      hopSize={kv.hop_size} hopStart={kv.hop_start} hops={kv.hops} />;
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
    return <Base10 hundreds={kv.hundreds} tens={kv.tens} ones={kv.ones} />;
  }
  if (m.startsWith('[PV_CHART:')) {
    const num = kvPart.trim();
    return <PlaceValueChart number={num} />;
  }
  if (m.startsWith('[BAR_MODEL:')) {
    const pipeIdx = kvPart.indexOf('|');
    const segPart = pipeIdx >= 0 ? kvPart.slice(0, pipeIdx).trim() : kvPart.trim();
    const labelMatch = kvPart.match(/label=(.+?)(\s|$)/);
    return <BarModel segments={segPart} label={labelMatch ? labelMatch[1] : null} />;
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
  if (m.startsWith('[IMAGE:')) {
    return null; // handled separately as paste zone
  }
  return null;
}

// ─── Parse assessment text → question objects ──────────────────────────────────
function parseAssessment(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let inVersionB = false;
  let inAnswerKey = false;
  const MARKER_RE = /^\[(ARRAY|NUM_LINE|GROUPS|TENS_FRAME|NUM_BOND|FRACTION|FRAC_CIRCLE|MIXED_NUM|MIXED_CIRCLE|AREA_MODEL|BASE10|PV_CHART|BAR_MODEL|TAPE|FUNC_TABLE|DATA_TABLE|YES_NO_TABLE|GRID_RESPONSE|NUM_CHART|WORK_SPACE|IMAGE)[:|\]]/i;

  const flush = () => { if (current) { questions.push(current); current = null; } };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

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

    // Question number: "1." or "1)"
    const qMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (qMatch) {
      if (current && !current.qNum) {
        // Marker was the line before — attach number to it
        current.qNum = qMatch[1];
        current.text = qMatch[2];
        if (/select all|choose all/i.test(qMatch[2])) current.qType = 'multiselect';
        continue;
      }
      flush();
      const isMulti = /select all|choose all/i.test(qMatch[2]);
      current = { id: `q-${i}`, type: 'question', qNum: qMatch[1], marker: null, text: qMatch[2], choices: [], lines: [], vb: inVersionB, qType: isMulti ? 'multiselect' : 'mc' };
      continue;
    }

    // MC / multi-select choice: A) B) C) D) E) F)...
    const choiceMatch = trimmed.match(/^([A-Fa-f])[.)]\s+(.*)$/);
    if (choiceMatch && current) {
      current.choices.push({ letter: choiceMatch[1].toUpperCase(), text: choiceMatch[2] });
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
  { id: 'none', label: 'None' },
  { id: 'ARRAY', label: 'Array (dots)' },
  { id: 'NUM_LINE', label: 'Number Line' },
  { id: 'GROUPS', label: 'Groups / Ovals' },
  { id: 'TENS_FRAME', label: 'Tens Frame' },
  { id: 'NUM_BOND', label: 'Number Bond' },
  { id: 'FRACTION', label: 'Fraction Bar (proper / improper)' },
  { id: 'FRAC_CIRCLE', label: 'Fraction Circle (proper / improper)' },
  { id: 'MIXED_NUM', label: 'Mixed Number Bar' },
  { id: 'MIXED_CIRCLE', label: 'Mixed Number Circle' },
  { id: 'AREA_MODEL', label: 'Area Model (multi-digit)' },
  { id: 'BASE10', label: 'Place Value Blocks' },
  { id: 'BAR_MODEL', label: 'Bar Model' },
  { id: 'DATA_TABLE', label: 'Data Table' },
  { id: 'WORK_SPACE', label: 'Work Space (blank box)' },
  { id: 'custom', label: 'Upload / Paste Image' },
];

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
            {inp('Min', 'min', { type: 'number' })}
            {inp('Max', 'max', { type: 'number' })}
            {inp('Step', 'step', { type: 'number', min: 1 })}
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={params.show === 'all'} onChange={e => set('show', e.target.checked ? 'all' : '')} />
              All labels
            </label>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={params.jumps === 'yes'} onChange={e => set('jumps', e.target.checked ? 'yes' : '')} />
              <strong>Hops/Arcs</strong>
            </label>
            {params.jumps === 'yes' && (
              <>
                {inp('Hop size', 'hop_size', { type: 'number', min: 1, placeholder: '= 1 step' })}
                {inp('Start at', 'hop_start', { type: 'number', placeholder: 'default: min' })}
                <label className="text-xs flex flex-col gap-0.5">
                  <span>Custom hops (from:to, ...)</span>
                  <input value={params.hops || ''} onChange={e => set('hops', e.target.value)}
                    className="border rounded p-1 w-40 font-mono text-xs"
                    placeholder="e.g. 0:5,5:12,12:20" />
                  <span className="text-slate-400 text-xs">Overrides hop size if filled</span>
                </label>
              </>
            )}
          </div>
          {params.jumps === 'yes' && (
            <p className="text-xs text-slate-400">
              Examples: hop size=5 → equal +5 arcs · custom 0:3,3:7 → arcs of different sizes
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
    case 'MIXED_NUM':
    case 'MIXED_CIRCLE':
      return (
        <div className="space-y-1">
          <div className="flex gap-2">{inp('Whole #', 'whole', { type: 'number', min: 0 })}{inp('Numerator', 'n', { type: 'number', min: 0 })}{inp('Denominator', 'd', { type: 'number', min: 1 })}</div>
          <p className="text-xs text-slate-400">e.g. Whole=2, N=1, D=3 → 2 and 1/3</p>
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
        <div className="space-y-1">
          <div className="flex gap-2">
            {inp('Hundreds', 'hundreds', { type: 'number', min: 0, max: 9 })}
            {inp('Tens', 'tens', { type: 'number', min: 0, max: 9 })}
            {inp('Ones', 'ones', { type: 'number', min: 0, max: 9 })}
          </div>
          <p className="text-xs text-slate-400">Shows flat squares (100s), rods (10s), and unit cubes (1s)</p>
        </div>
      );
    case 'BAR_MODEL':
      return (
        <div className="space-y-1">
          <label className="text-xs block">Segment values (comma-sep) <input value={params.vals || ''} onChange={e => set('vals', e.target.value)} placeholder="e.g. 4,4,4,4" className="border rounded p-1 w-32 ml-1" /></label>
          <label className="text-xs block">Label (optional) <input value={params.label || ''} onChange={e => set('label', e.target.value)} className="border rounded p-1 w-24 ml-1" /></label>
        </div>
      );
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
    default: return null;
  }
}

function paramsToMarker(type, params) {
  if (!type || type === 'none' || type === 'custom') return null;
  if (type === 'WORK_SPACE') return '[WORK_SPACE]';
  if (type === 'ARRAY') return `[ARRAY: rows=${params.rows || 3} cols=${params.cols || 4}]`;
  if (type === 'NUM_LINE') {
    let m = `[NUM_LINE: min=${params.min ?? 0} max=${params.max ?? 20} step=${params.step ?? 1}`;
    if (params.jumps === 'yes') {
      m += ' jumps=yes';
      if (params.hops && String(params.hops).trim()) {
        m += ` hops=${String(params.hops).replace(/\s/g, '')}`;
      } else {
        if (params.hop_size) m += ` hop_size=${params.hop_size}`;
        if (params.hop_start !== undefined && params.hop_start !== '') m += ` hop_start=${params.hop_start}`;
      }
    }
    if (params.show === 'all') m += ' show=all';
    return m + ']';
  }
  if (type === 'GROUPS') return `[GROUPS: groups=${params.groups || 3} items=${params.items || 4}]`;
  if (type === 'TENS_FRAME') return `[TENS_FRAME: filled=${params.filled ?? 5} total=${params.total || 10}]`;
  if (type === 'NUM_BOND') return `[NUM_BOND: whole=${params.whole || ''} part1=${params.part1 || ''} part2=${params.part2 || '?'}]`;
  if (type === 'FRACTION') return `[FRACTION: ${params.n || 1}/${params.d || 4}]`;
  if (type === 'FRAC_CIRCLE') return `[FRAC_CIRCLE: ${params.n || 1}/${params.d || 4}]`;
  if (type === 'MIXED_NUM') return `[MIXED_NUM: whole=${params.whole || 1} n=${params.n || 1} d=${params.d || 3}]`;
  if (type === 'MIXED_CIRCLE') return `[MIXED_CIRCLE: whole=${params.whole || 1} n=${params.n || 1} d=${params.d || 3}]`;
  if (type === 'BASE10') return `[BASE10: hundreds=${params.hundreds || 0} tens=${params.tens || 0} ones=${params.ones || 0}]`;
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
  if (type === 'DATA_TABLE') {
    const rows = (params.rowsText || '').split('\n').filter(Boolean);
    return `[DATA_TABLE: header=${params.header || 'Category,Count'} | ${rows.join(' | ')}]`;
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
    { label: '×', tip: 'Multiply' },
    { label: '÷', tip: 'Divide' },
    { label: '±', tip: 'Plus/minus' },
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
  const [visualType, setVisualType] = useState(question?._visualType || 'none');
  const [visualParams, setVisualParams] = useState(question?._visualParams || {});
  const [customImg, setCustomImg] = useState(question?._customImg || null);
  const fileRef = useRef();
  const qTextRef = useRef();

  const handlePaste = e => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'));
    if (item) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = ev => setCustomImg(ev.target.result);
      reader.readAsDataURL(blob);
    }
  };

  const marker = visualType === 'custom' ? (customImg ? '[IMAGE: custom]' : null) : paramsToMarker(visualType, visualParams);
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
      lines: [], marker, standard,
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
        <select value={visualType} onChange={e => { setVisualType(e.target.value); setVisualParams({}); setCustomImg(null); }}
          className="border rounded p-1.5 text-sm w-full mb-2">
          {VISUAL_TYPES_LIST.map(vt => <option key={vt.id} value={vt.id}>{vt.label}</option>)}
        </select>

        {visualType !== 'none' && visualType !== 'custom' && (
          <div className="bg-gray-50 rounded p-2 space-y-2">
            <VisualParamForm type={visualType} params={visualParams} onChange={setVisualParams} />
            {marker && (
              <div className="overflow-x-auto pt-1">
                <ErrorBoundary><div>{parseVisualModel(marker)}</div></ErrorBoundary>
              </div>
            )}
          </div>
        )}

        {visualType === 'custom' && (
          <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center cursor-pointer hover:border-blue-400"
            onPaste={handlePaste} onClick={() => fileRef.current?.click()}>
            {customImg
              ? <img src={customImg} alt="custom" className="max-h-24 mx-auto" />
              : <p className="text-xs text-gray-500">Paste (Ctrl+V) or click to upload an image</p>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setCustomImg(ev.target.result); r.readAsDataURL(f); }} />
          </div>
        )}
      </div>

      {/* Preview */}
      {qText && (
        <div className="border rounded p-3 bg-gray-50">
          <p className="text-xs text-gray-400 mb-1">Preview:</p>
          <ErrorBoundary>
            <AssessmentPreviewSingle q={previewQ} customImg={visualType === 'custom' ? customImg : null} />
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
function ManualBuilder({ onPrint, onCopyGdoc }) {
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [customVisuals, setCustomVisuals] = useState({});
  const [editingVisual, setEditingVisual] = useState(null);

  const handleSave = q => {
    if (editingQ) {
      setQuestions(prev => prev.map(pq => pq.id === editingQ.id ? q : pq));
    } else {
      const num = questions.filter(x => x.type === 'question').length + 1;
      setQuestions(prev => [...prev, { ...q, qNum: String(num) }]);
    }
    setShowForm(false);
    setEditingQ(null);
  };

  const deleteQ = id => setQuestions(prev => prev.filter(q => q.id !== id));
  const moveQ = (id, dir) => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((q, i) => ({ ...q, qNum: q.type === 'question' ? String(i + 1) : q.qNum }));
    });
  };

  const headerQ = title ? [{ id: 'title', type: 'header', text: title }] : [];
  const allQs = [...headerQ, ...questions];
  const qCount = questions.filter(q => q.type === 'question').length;

  return (
    <div className="flex gap-6">
      {/* Left — question list */}
      <div className="w-80 shrink-0 space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 3.OA.1 Multiplication Check-In"
            className="w-full border rounded p-2 text-sm" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions ({qCount})</p>
            <button onClick={() => { setEditingQ(null); setShowForm(!showForm); }}
              className="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700">+ Add</button>
          </div>

          {questions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No questions yet — click Add to begin</p>
          )}

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {questions.map((q, idx) => q.type === 'question' && (
              <div key={q.id} className="flex items-center gap-1 bg-gray-50 rounded p-1.5 group">
                <span className="text-xs text-gray-400 w-5 shrink-0">{q.qNum}.</span>
                <span className="flex-1 text-xs text-gray-700 truncate">{q.text}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                  <button onClick={() => moveQ(q.id, -1)} className="text-gray-400 hover:text-gray-700 px-0.5">↑</button>
                  <button onClick={() => moveQ(q.id, 1)} className="text-gray-400 hover:text-gray-700 px-0.5">↓</button>
                  <button onClick={() => { setEditingQ(q); setShowForm(true); }} className="text-blue-500 hover:text-blue-700 px-0.5">✎</button>
                  <button onClick={() => deleteQ(q.id)} className="text-red-400 hover:text-red-600 px-0.5">✕</button>
                </div>
              </div>
            ))}
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
            <button onClick={onPrint}
              className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              🖨 Print / Export PDF
            </button>
            <button onClick={() => onCopyGdoc(allQs)}
              className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              📋 Copy to Google Docs
            </button>
          </div>
        )}
      </div>

      {/* Right — preview */}
      <div className="flex-1 min-w-0">
        {allQs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <p className="text-4xl mb-3">✏️</p>
            <p className="text-sm">Add questions to build your assessment</p>
          </div>
        ) : (
          <div id="print-area" className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <AssessmentPreview
              questions={allQs}
              customVisuals={customVisuals}
              onEdit={(idx, marker) => setEditingVisual({ idx, marker })}
              onQuestionEdit={(idx, uq) => setQuestions(prev => prev.map((q, i) => {
                const qIdx = questions.indexOf(prev.filter(x => x.type === 'question')[i]);
                return q.id === uq.id ? uq : q;
              }))}
            />
          </div>
        )}
      </div>

      {editingVisual && (
        <ModelEditor
          marker={editingVisual.marker}
          onSave={({ marker, customImg }) => {
            setCustomVisuals(prev => ({ ...prev, [editingVisual.idx]: { marker, customImg } }));
            setEditingVisual(null);
          }}
          onClose={() => setEditingVisual(null)}
        />
      )}
    </div>
  );
}

// ─── Model Editor ─────────────────────────────────────────────────────────────
function ModelEditor({ marker, onSave, onClose }) {
  const [val, setVal] = useState(marker || '');
  const [pastedImg, setPastedImg] = useState(null);
  const fileRef = useRef();

  const handlePaste = e => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'));
    if (item) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = ev => setPastedImg(ev.target.result);
      reader.readAsDataURL(blob);
    }
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPastedImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const preview = (() => {
    try { return parseVisualModel(val); } catch { return null; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-3">Edit Visual</h3>

        {pastedImg ? (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Custom image:</p>
            <img src={pastedImg} alt="custom" className="max-w-full border rounded" />
            <button onClick={() => setPastedImg(null)}
              className="mt-2 text-xs text-red-600 hover:underline">Remove image</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-1">Marker code:</p>
            <textarea value={val} onChange={e => setVal(e.target.value)}
              className="w-full border rounded p-2 font-mono text-sm h-20 mb-3" />
            {preview && (
              <div className="mb-3 p-2 bg-gray-50 rounded border overflow-x-auto">
                <p className="text-xs text-gray-400 mb-1">Preview:</p>
                <ErrorBoundary><div>{preview}</div></ErrorBoundary>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center mb-3 cursor-pointer hover:border-blue-400"
              onPaste={handlePaste} onClick={() => fileRef.current?.click()}>
              <p className="text-sm text-gray-500">Paste or click to upload your own image</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({ marker: val, customImg: pastedImg })}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Assessment Preview ────────────────────────────────────────────────────────
function AssessmentPreview({ questions, onEdit, customVisuals, onQuestionEdit }) {
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

  const startEdit = (idx, text) => { setEditingIdx(idx); setEditText(text); };
  const saveEdit = (idx, q) => { onQuestionEdit(idx, { ...q, text: editText }); setEditingIdx(null); };

  // Map from visibleQs index to original questions index (for customVisuals keying)
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

      <div className="space-y-4">
        {visibleQs.map((q, vIdx) => {
          const idx = origIdxMap[vIdx];

          if (q.type === 'header') {
            return (
              <div key={q.id} className="text-center font-bold text-base mt-4 mb-1 text-gray-800">
                {q.text}
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

          const cv = customVisuals?.[idx];
          const markerToUse = cv?.marker || q.marker;
          const visualComponent = cv?.customImg
            ? <img src={cv.customImg} alt="custom" className="max-h-32 border rounded" />
            : markerToUse
              ? (markerToUse.startsWith('[IMAGE:')
                ? <div className="border-2 border-dashed border-orange-300 rounded p-3 text-xs text-orange-600 bg-orange-50">
                    ⚠ Paste your own image here — click Edit Visual
                  </div>
                : <ErrorBoundary>{parseVisualModel(markerToUse)}</ErrorBoundary>)
              : null;

          return (
            <div key={q.id} className="group relative">
              {visualComponent && (
                <div className="mb-1 relative">
                  {visualComponent}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(idx, markerToUse)}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-xs bg-white border border-gray-300 rounded px-2 py-0.5 shadow text-gray-600 hover:bg-gray-50 transition-opacity no-print">
                      Edit Visual
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-1">
                {q.qNum && <span className="font-semibold text-gray-700 shrink-0">{q.qNum}.</span>}
                <div className="flex-1">
                  {editingIdx === idx ? (
                    <div className="flex gap-2 items-start">
                      <textarea value={editText} onChange={e => setEditText(e.target.value)}
                        className="flex-1 border rounded p-1 text-sm font-sans" rows={2} />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => saveEdit(idx, q)} className="text-xs bg-green-600 text-white rounded px-2 py-1">✓</button>
                        <button onClick={() => setEditingIdx(null)} className="text-xs border rounded px-2 py-1">✕</button>
                      </div>
                    </div>
                  ) : (
                    <span className="cursor-pointer hover:bg-yellow-50 rounded px-0.5 transition-colors"
                      onClick={() => startEdit(idx, q.text)} title="Click to edit">
                      {q.text}
                      {q.lines?.map((l, li) => <span key={li}><br />{l}</span>)}
                    </span>
                  )}

                  {q.choices?.length > 0 && (() => {
                    const isMultiselect = q.qType === 'multiselect' || /select all|choose all/i.test(q.text || '');
                    return (
                      <div className="mt-1 ml-2 space-y-0.5">
                        {q.choices.map((ch, ci) => (
                          <div key={ci} className="text-sm flex items-start gap-1.5">
                            {isMultiselect
                              ? <span className="mt-0.5 shrink-0 w-3.5 h-3.5 border border-gray-500 rounded-sm inline-block" />
                              : <span className="mt-0.5 shrink-0 w-3.5 h-3.5 border border-gray-500 rounded-full inline-block" />}
                            <span><span className="font-medium">{ch.letter})</span> {ch.text}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {q.standard && <div className="text-xs text-gray-400 mt-0.5">{q.standard}</div>}
                </div>
              </div>
            </div>
          );
        })}
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
    const hopsParam = gp('hops');

    const ticks = [];
    for (let v = mn; v <= mx + 0.0001; v += st) ticks.push(parseFloat(v.toFixed(4)));
    const tw = Math.max(22, Math.min(40, Math.floor(340 / ticks.length)));

    // Build hop pairs
    let hopPairs = [];
    if (hasArcs) {
      if (hopsParam) {
        hopPairs = hopsParam.split(',').map(s => s.split(':').map(Number)).filter(([a,b]) => !isNaN(a) && !isNaN(b));
      } else if (hopSizeParam) {
        const hs = parseFloat(hopSizeParam);
        const start = hopStartParam !== null ? parseFloat(hopStartParam) : mn;
        for (let v = start; v + hs <= mx + 0.0001; v = parseFloat((v + hs).toFixed(4)))
          hopPairs.push([v, parseFloat((v + hs).toFixed(4))]);
      } else {
        ticks.slice(0, -1).forEach((v, i) => hopPairs.push([v, ticks[i + 1]]));
      }
    }

    let t = `<table style="${tbl}border:none"><tbody>`;
    // Arc labels row
    if (hasArcs && hopPairs.length) {
      // Map each hop to the tick columns it spans
      t += '<tr>';
      let lastIdx = 0;
      hopPairs.forEach(([v1, v2]) => {
        const idx1 = ticks.findIndex(t => Math.abs(t - v1) < 0.0001);
        const idx2 = ticks.findIndex(t => Math.abs(t - v2) < 0.0001);
        const span = (idx2 >= 0 && idx1 >= 0) ? idx2 - idx1 : 1;
        const hopVal = parseFloat((v2 - v1).toFixed(4));
        const label = hopVal > 0 ? `+${hopVal}` : `${hopVal}`;
        t += `<td colspan="${Math.max(1,span)}" style="border:none;border-bottom:2px solid #2563eb;text-align:center;font-size:9pt;color:#2563eb;font-weight:bold;padding:0 2px;width:${tw * Math.max(1,span)}px">⌢ ${label}</td>`;
        lastIdx = idx2 >= 0 ? idx2 : lastIdx + span;
      });
      // Fill remaining cols
      if (lastIdx < ticks.length - 1)
        t += `<td colspan="${ticks.length - 1 - lastIdx}" style="border:none"></td>`;
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
    const dots = Array(I).fill('●').join(' ');
    let t = `<table style="${tbl}border:none"><tbody><tr>`;
    for (let g = 0; g < G; g++) {
      t += `<td style="border:2px solid #333;border-radius:40px;padding:6px 10px;text-align:center;font-size:11pt">${dots}</td>`;
      if (g < G - 1) t += '<td style="border:none;width:10px"></td>';
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
    const circle = (v) => `<td style="border:2px solid #333;border-radius:50%;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:13pt;font-weight:bold">${v}</td>`;
    return `<table style="${tbl}border:none;text-align:center"><tbody>
      <tr><td style="border:none;width:55px"></td>${circle(whole)}<td style="border:none;width:55px"></td></tr>
      <tr><td style="border:none;border-top:2px solid #333;border-right:2px solid #333;height:22px"></td><td style="border:none"></td><td style="border:none;border-top:2px solid #333;border-left:2px solid #333;height:22px"></td></tr>
      <tr>${circle(p1)}<td style="border:none;width:55px"></td>${circle(p2)}</tr>
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
      t += `</tr></tbody></table><br/><span style="font-size:9pt;color:#666">1 whole</span></td>`;
    }
    if (hasPartial) {
      t += `<td style="border:none;padding-right:6px"><table style="border-collapse:collapse;display:inline-table"><tbody><tr>`;
      for (let si = 0; si < d; si++) t += `<td style="${cell}width:20px;height:22px;background:${si < remainder ? '#93c5fd' : '#fff'}"></td>`;
      t += `</tr></tbody></table><br/><span style="font-size:9pt;color:#666">${n <= d ? `${n}/${d}` : `${remainder}/${d}`}</span></td>`;
    }
    return t + '</tr></tbody></table>';
  }

  // ── FRACTION CIRCLE (proper + improper) ──
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
    const totalCircles = wholeCount + (hasPartial ? 1 : 0);
    // Represent circles as simple labeled pies using unicode pie symbol
    let t = `<table style="${tbl}border:none;"><tbody><tr>`;
    for (let bi = 0; bi < wholeCount; bi++)
      t += `<td style="border:none;text-align:center;padding:0 6px"><div style="border:2px solid #333;border-radius:50%;width:52px;height:52px;background:#93c5fd;line-height:52px;text-align:center;font-size:9pt"></div><div style="font-size:9pt;color:#666;margin-top:2px">1 whole</div></td>`;
    if (hasPartial) {
      t += `<td style="border:none;text-align:center;padding:0 6px"><div style="border:2px solid #333;border-radius:50%;width:52px;height:52px;background:linear-gradient(to right,#93c5fd 50%,#fff 50%);line-height:52px;text-align:center;font-size:9pt">${n <= d ? `${n}/${d}` : `${remainder}/${d}`}</div><div style="font-size:9pt;color:#666;margin-top:2px">${n <= d ? `${n}/${d}` : `${remainder}/${d}`}</div></td>`;
    }
    return t + '</tr></tbody></table>';
  }

  // ── AREA MODEL ──
  if (m.startsWith('AREA_MODEL:')) {
    const colsRaw = (m.match(/cols=([\d,]+)/) || [])[1] || '10,10';
    const colVals = colsRaw.split(',');
    const rowsN = parseInt(gp('rows') ?? '1');
    const valsRaw = (m.match(/vals=([\d,]+)/) || [])[1];
    const vals = valsRaw ? valsRaw.split(',') : null;
    let t = `<table style="${tbl}"><tbody>`;
    t += '<tr><td style="border:none;width:20px"></td>' +
      colVals.map(cv => `<td style="${cell}font-weight:bold;background:#f1f5f9;min-width:44px;padding:4px 8px">${cv}</td>`).join('') + '</tr>';
    for (let r = 0; r < rowsN; r++) {
      t += `<tr><td style="${cell}font-weight:bold;background:#f1f5f9;padding:4px 8px">${r + 1}</td>`;
      colVals.forEach((_, ci) => {
        const idx = r * colVals.length + ci;
        const v = vals ? (vals[idx] ?? '') : '';
        t += `<td style="${cell}min-width:44px;height:36px;padding:6px 12px">${v}</td>`;
      });
      t += '</tr>';
    }
    return t + '</tbody></table>';
  }

  // ── BASE-10 BLOCKS ──
  if (m.startsWith('BASE10:')) {
    const H = parseInt(gp('hundreds') ?? '0');
    const T = parseInt(gp('tens') ?? '0');
    const O = parseInt(gp('ones') ?? '0');
    let parts = [];
    if (H) parts.push(`Hundreds: ${Array(H).fill('▪▪▪▪▪▪▪▪▪▪').join(' ')}`);
    if (T) parts.push(`Tens: ${Array(T).fill('▪▪▪▪▪▪▪▪▪▪').join(' ')}`);
    if (O) parts.push(`Ones: ${Array(O).fill('▪').join(' ')}`);
    return `<p style="margin:8px 0;font-size:11pt">${parts.join(' &nbsp;&nbsp; ')}</p>`;
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

  // ── WORK SPACE ──
  if (m.startsWith('WORK_SPACE')) {
    return `<table style="${tbl}width:100%"><tbody><tr><td style="border:1px dashed #94a3b8;height:80pt;width:100%">&nbsp;</td></tr></tbody></table>`;
  }

  // ── IMAGE placeholder ──
  if (m.startsWith('IMAGE:')) {
    const desc = m.replace('IMAGE:', '').trim();
    return `<p style="border:1px dashed #ea580c;padding:6px 10px;color:#ea580c;font-size:10pt;margin:6px 0">[Insert image: ${desc}]</p>`;
  }

  // Default
  return `<p style="border:1px dashed #94a3b8;padding:4px 8px;color:#64748b;font-size:9pt;margin:4px 0">[${m}]</p>`;
}

// ─── Google Docs copy helper ──────────────────────────────────────────────────
function copyToGoogleDocs(questions) {
  // Build HTML that pastes cleanly into Google Docs
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
      html += `<p style="margin:12px 0 2px 0"></p>`;

      // Visual/model — render as actual HTML table/structure
      if (q.marker) {
        html += visualToHtml(q.marker);
      }

      // Question text
      const numStr = q.qNum ? `<strong>${q.qNum}.</strong> ` : '';
      html += `<p style="margin:2px 0 4px 0">${numStr}${q.text || ''}</p>`;

      // Sub-lines (multi-part question continuation lines)
      q.lines?.forEach(l => {
        html += `<p style="margin:1px 0 1px 20px">${l}</p>`;
      });

      // Answer choices
      if (q.choices?.length) {
        const isSATA = q.qType === 'multiselect' || /select all|choose all/i.test(q.text || '');
        const bubble = isSATA ? '☐' : '○';
        q.choices.forEach(ch => {
          html += `<p style="margin:1px 0 1px 28px">${bubble} ${ch.letter})&nbsp;&nbsp;${ch.text}</p>`;
        });
      }

      // Standard tag
      if (q.standard) {
        html += `<p style="color:#888;font-size:9pt;margin:1px 0">${q.standard}</p>`;
      }
    }
  });

  html += '</body></html>';

  // Plain text fallback
  const plain = questions
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

  // Use execCommand('copy') on a rendered contenteditable div —
  // this is the most reliable way to get HTML (including tables) into Google Docs.
  // ClipboardItem text/html is often ignored by Docs in favor of plain text.
  try {
    const bodyHtml = html.replace(/^<html><body[^>]*>/, '').replace(/<\/body><\/html>$/, '');
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0.01;pointer-events:none;width:600px;';
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

    if (!ok) throw new Error('execCommand failed');
  } catch {
    // Fallback: ClipboardItem API
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).catch(() => {});
    } catch {
      navigator.clipboard.writeText(plain).catch(() => {});
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
    copyToGoogleDocs(qs);
    showToast('Copied! Paste into the Google Doc that just opened (Ctrl+V / Cmd+V)');
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
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [customVisuals, setCustomVisuals] = useState({});
  const [editingVisual, setEditingVisual] = useState(null); // {idx, marker}

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
    // inject print styles
    const style = document.createElement('style');
    style.textContent = PRINT_STYLE;
    document.head.appendChild(style);
  }, []);

  const saveApiKey = key => {
    setApiKey(key);
    localStorage.setItem('anthropic_api_key', key);
  };

  const handleFileChange = e => {
    setFile(e.target.files[0] || null);
  };

  const handleGenerate = async () => {
    if (!apiKey) { setShowSettings(true); return; }
    setLoading(true);
    setError('');
    setRawText('');
    setQuestions([]);
    setCustomVisuals({});

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
        fd.append('file', file);
        response = await fetch('/api/generate', { method: 'POST', body: fd });
      } else {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey, gradeLevel, subject, standard, customTitle,
            includeVersionB, includeAnswerKey,
            inputMode, pastedText, url, scratchTopic, scratchInstructions,
          }),
        });
      }
      const data = await response.json();
      if (data.error) { setError(data.error); return; }
      setRawText(data.result);
      setQuestions(parseAssessment(data.result));
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVisual = (idx, marker) => {
    setEditingVisual({ idx, marker });
  };

  const handleSaveVisual = ({ marker, customImg }) => {
    setCustomVisuals(prev => ({ ...prev, [editingVisual.idx]: { marker, customImg } }));
    setEditingVisual(null);
  };

  const handleQuestionEdit = (idx, updatedQ) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? updatedQ : q));
  };

  const handlePrint = () => window.print();

  const hasResult = questions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-lg no-print">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Assessment Builder</h1>
          </div>
          {/* App mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[['ai', '✦ AI Generate'], ['manual', '✏ Manual Build']].map(([mode, label]) => (
              <button key={mode} onClick={() => setAppMode(mode)}
                className={`px-4 py-1.5 text-xs transition-colors ${appMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}
          className="text-gray-500 hover:text-gray-800 text-xl" title="Settings">⚙</button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">

      {/* ── Manual Build mode ── */}
      {appMode === 'manual' && (
        <ManualBuilder onPrint={() => window.print()} onCopyGdoc={handleCopyGdoc} />
      )}

      {/* ── AI Generate mode ── */}
      {appMode === 'ai' && (
      <div className="flex gap-6">

        {/* Left panel — inputs */}
        <div className="w-80 shrink-0 space-y-4 no-print">

          {/* Mode tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Input</p>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</p>

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

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm">
            {loading ? 'Generating…' : '✦ Generate Assessment'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {hasResult && (
            <div className="space-y-2">
              <button onClick={handlePrint}
                className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                🖨 Print / Export PDF
              </button>
              <button onClick={() => handleCopyGdoc(questions)}
                className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                📋 Copy to Google Docs
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([rawText], { type: 'text/plain' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'assessment.txt';
                  a.click();
                }}
                className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                ⬇ Download Text
              </button>
              <button
                onClick={() => { setQuestions([]); setRawText(''); setCustomVisuals({}); setFile(null); }}
                className="w-full py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                ✕ Clear
              </button>
            </div>
          )}

          {/* Raw text toggle */}
          {rawText && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View raw output</summary>
              <pre className="mt-2 bg-gray-100 rounded p-2 whitespace-pre-wrap text-gray-600 max-h-64 overflow-y-auto">{rawText}</pre>
            </details>
          )}
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="animate-spin text-3xl mb-3">⟳</div>
              <p className="text-sm">Generating parallel form…</p>
              <p className="text-xs mt-1 text-gray-300">This may take 20–40 seconds</p>
            </div>
          )}

          {!loading && !hasResult && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm">Upload a PDF to generate a parallel form</p>
              <p className="text-xs mt-1">Visual models will be recreated as editable vector graphics</p>
            </div>
          )}

          {!loading && hasResult && (
            <div id="print-area" className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <AssessmentPreview
                questions={questions}
                customVisuals={customVisuals}
                onEdit={handleEditVisual}
                onQuestionEdit={handleQuestionEdit}
              />
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
          onSave={handleSaveVisual}
          onClose={() => setEditingVisual(null)}
        />
      )}
      </div>
    </div>
  );
}
