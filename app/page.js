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

function NumberLine({ min = 0, max = 10, step = 1, showAll = false, jumps = false }) {
  const mn = parseFloat(min), mx = parseFloat(max), st = parseFloat(step) || 1;
  const ticks = [];
  for (let v = mn; v <= mx + 0.0001; v += st) ticks.push(parseFloat(v.toFixed(4)));
  const W = 320, pad = 24, lineY = 36, h = jumps ? 72 : 52;
  const toX = v => pad + ((v - mn) / (mx - mn)) * (W - 2 * pad);
  return (
    <svg width={W} height={h} style={{ display: 'block' }}>
      <line x1={pad} y1={lineY} x2={W - pad} y2={lineY} stroke="#334155" strokeWidth={2} />
      <polygon points={`${W - pad},${lineY} ${W - pad - 7},${lineY - 4} ${W - pad - 7},${lineY + 4}`} fill="#334155" />
      {ticks.map((v, i) => {
        const x = toX(v);
        const showLabel = showAll || v === mn || v === mx;
        return (
          <g key={i}>
            <line x1={x} y1={lineY - 6} x2={x} y2={lineY + 6} stroke="#334155" strokeWidth={1.5} />
            {showLabel && (
              <text x={x} y={lineY + 18} textAnchor="middle" fontSize={11} fill="#334155">{v}</text>
            )}
          </g>
        );
      })}
      {jumps && ticks.slice(0, -1).map((v, i) => {
        const x1 = toX(v), x2 = toX(ticks[i + 1]);
        const mx2 = (x1 + x2) / 2, arcH = 18;
        return (
          <path key={i} d={`M${x1},${lineY} Q${mx2},${lineY - arcH} ${x2},${lineY}`}
            fill="none" stroke="#2563eb" strokeWidth={1.5} />
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
  const W = 220, segW = W / D, H = 36;
  return (
    <svg width={W + 2} height={H + 2} style={{ display: 'block' }}>
      {Array.from({ length: D }, (_, i) => (
        <rect key={i} x={1 + i * segW} y={1} width={segW - 1} height={H}
          fill={i < N ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function FractionCircle({ n, d }) {
  const N = parseInt(n) || 1, D = Math.max(parseInt(d) || 4, 1);
  const R = 50, cx = 56, cy = 56;
  const slices = Array.from({ length: D }, (_, i) => {
    const a0 = (i / D) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / D) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const large = D === 1 ? 1 : 0;
    return `M${cx},${cy} L${x0},${y0} A${R},${R} 0 ${large},1 ${x1},${y1} Z`;
  });
  return (
    <svg width={112} height={112} style={{ display: 'block' }}>
      {slices.map((d2, i) => (
        <path key={i} d={d2} fill={i < N ? '#93c5fd' : 'white'} stroke="#334155" strokeWidth={1.5} />
      ))}
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
      showAll={kv.show === 'all'} jumps={kv.jumps === 'yes'} />;
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
  let inAnswerKey = false;
  let inVersionB = false;
  const MARKER_RE = /^\[(ARRAY|NUM_LINE|GROUPS|TENS_FRAME|NUM_BOND|FRACTION|FRAC_CIRCLE|AREA_MODEL|BASE10|PV_CHART|BAR_MODEL|TAPE|FUNC_TABLE|DATA_TABLE|YES_NO_TABLE|GRID_RESPONSE|NUM_CHART|WORK_SPACE|IMAGE)[:|\]]/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^TEACHER ANSWER KEY/i.test(trimmed)) { inAnswerKey = true; continue; }
    if (/^VERSION B/i.test(trimmed)) { inVersionB = true; continue; }

    if (inAnswerKey || inVersionB) {
      if (questions.length && !questions[questions.length - 1].answerKeyLine) {
        // store in last section marker
      }
      questions.push({ id: `meta-${i}`, type: 'meta', text: trimmed, isVersionB: inVersionB, isAnswerKey: inAnswerKey });
      continue;
    }

    if (MARKER_RE.test(trimmed)) {
      // Look ahead: next non-empty line should be a question
      if (current) questions.push(current);
      current = { id: `q-${i}`, type: 'question', marker: trimmed, text: '', choices: [], lines: [] };
      continue;
    }

    // Question number pattern: "1." or "1)" or "Question 1"
    const qMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (qMatch) {
      if (current && !current.qNum) {
        current.qNum = qMatch[1];
        current.text = qMatch[2];
        continue;
      }
      if (current) questions.push(current);
      current = { id: `q-${i}`, type: 'question', qNum: qMatch[1], marker: null, text: qMatch[2], choices: [], lines: [] };
      continue;
    }

    // MC choice: A) B) C) D)
    const choiceMatch = trimmed.match(/^([A-D])[.)]\s+(.*)$/);
    if (choiceMatch && current) {
      current.choices.push({ letter: choiceMatch[1], text: choiceMatch[2] });
      continue;
    }

    // Standard tag: [3.OA.A.1]
    if (/^\[\d+\.[A-Z]+\.[A-Z]+\.\d+\]/.test(trimmed) && current) {
      current.standard = trimmed;
      continue;
    }

    // Section header (no number, all caps or ends with colon)
    if (trimmed && !current && !qMatch) {
      questions.push({ id: `h-${i}`, type: 'header', text: trimmed });
      continue;
    }

    // Continuation text
    if (current) {
      if (trimmed) current.lines.push(trimmed);
    } else if (trimmed) {
      questions.push({ id: `h-${i}`, type: 'header', text: trimmed });
    }
  }

  if (current) questions.push(current);
  return questions;
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

  const startEdit = (idx, text) => { setEditingIdx(idx); setEditText(text); };
  const saveEdit = (idx, q) => {
    onQuestionEdit(idx, { ...q, text: editText });
    setEditingIdx(null);
  };

  return (
    <div className="font-serif text-gray-900 max-w-2xl mx-auto space-y-4">
      {questions.map((q, idx) => {
        if (q.type === 'header') {
          return (
            <div key={q.id} className="text-center font-bold text-base mt-4 mb-1 text-gray-800">
              {q.text}
            </div>
          );
        }
        if (q.type === 'meta') {
          return (
            <div key={q.id} className="text-sm text-gray-600 font-mono border-t pt-2 mt-4">
              {q.text}
            </div>
          );
        }

        const cv = customVisuals?.[idx];
        const visualComponent = cv?.customImg
          ? <img src={cv.customImg} alt="custom" className="max-h-32 border rounded" />
          : q.marker
            ? (q.marker.startsWith('[IMAGE:')
              ? <div className="border-2 border-dashed border-orange-300 rounded p-3 text-xs text-orange-600 bg-orange-50">
                  ⚠ Paste your own image here — click Edit Visual
                </div>
              : <ErrorBoundary>{parseVisualModel(cv?.marker || q.marker)}</ErrorBoundary>)
            : null;

        return (
          <div key={q.id} className="group relative">
            {visualComponent && (
              <div className="mb-1 relative">
                {visualComponent}
                <button
                  onClick={() => onEdit(idx, cv?.marker || q.marker)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-xs bg-white border border-gray-300 rounded px-2 py-0.5 shadow text-gray-600 hover:bg-gray-50 transition-opacity">
                  Edit Visual
                </button>
              </div>
            )}

            <div className="flex gap-1">
              {q.qNum && (
                <span className="font-semibold text-gray-700 shrink-0">{q.qNum}.</span>
              )}
              <div className="flex-1">
                {editingIdx === idx ? (
                  <div className="flex gap-2 items-start">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      className="flex-1 border rounded p-1 text-sm font-sans" rows={2} />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => saveEdit(idx, q)}
                        className="text-xs bg-green-600 text-white rounded px-2 py-1">✓</button>
                      <button onClick={() => setEditingIdx(null)}
                        className="text-xs border rounded px-2 py-1">✕</button>
                    </div>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:bg-yellow-50 rounded px-0.5 transition-colors"
                    onClick={() => startEdit(idx, q.text)}
                    title="Click to edit">
                    {q.text}
                    {q.lines.map((l, li) => <span key={li}><br />{l}</span>)}
                  </span>
                )}

                {q.choices.length > 0 && (
                  <div className="mt-1 ml-2 space-y-0.5">
                    {q.choices.map((ch, ci) => (
                      <div key={ci} className="text-sm">
                        <span className="font-medium">{ch.letter})</span> {ch.text}
                      </div>
                    ))}
                  </div>
                )}

                {q.standard && (
                  <div className="text-xs text-gray-400 mt-0.5">{q.standard}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssessmentBuilder() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

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
      {/* Print styles injected via useEffect */}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assessment Builder</h1>
          <p className="text-sm text-gray-500">Upload a PDF → get a parallel form with updated visuals</p>
        </div>
        <button onClick={() => setShowSettings(true)}
          className="text-gray-500 hover:text-gray-800 text-xl" title="Settings">⚙</button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 flex gap-6">

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
  );
}
