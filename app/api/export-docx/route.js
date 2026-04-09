import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, BorderStyle, WidthType,
  Table, TableRow, TableCell,
} from 'docx';
import { NextResponse } from 'next/server';

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Unit helpers
const PT  = v => v * 20;   // points  → twips  (for spacing values)
const HPT = v => v * 2;    // points  → half-points (for font size values)
const IN  = v => v * 1440; // inches  → twips  (for margins / indents)

function imgRunFromDataUrl(dataUrl, widthPt = 300, heightPt = 150) {
  try {
    const match = dataUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!match) return null;
    const imgType = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buf = Buffer.from(match[2], 'base64');
    return new ImageRun({
      type: imgType,
      data: buf,
      transformation: { width: Math.round(widthPt), height: Math.round(heightPt) },
      altText: { title: 'Visual', description: 'Question visual', name: 'visual' },
    });
  } catch {
    return null;
  }
}

// A simple underline-style answer blank
function answerBlank(fsChoice) {
  return new Paragraph({
    spacing: { before: PT(8), after: PT(4) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 2 } },
    children: [new TextRun({ text: ' ', font: 'Arial', size: HPT(fsChoice) })],
  });
}

// Empty spacer paragraph between question blocks
function spacer(ptBefore = 0, ptAfter = 14) {
  return new Paragraph({
    spacing: { before: PT(ptBefore), after: PT(ptAfter) },
    children: [new TextRun('')],
  });
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    questions = [], title = '',
    showNameLine = true, showDateLine = true, showClassLine = false,
    showScoreLine = false, totalPoints = null,
    fontSize = 'normal', twoColChoices = false,
  } = body;

  // Font size helpers based on selected size
  const FS = { normal: 12, large: 14, xl: 17 }[fontSize] || 12;
  const FS_CHOICE = Math.max(FS - 1, 10);
  const FS_TITLE  = FS + 4;

  const children = [];

  // ── 1. Assessment title ───────────────────────────────────────────────────────
  if (title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: PT(6) },
      children: [new TextRun({ text: title, bold: true, size: HPT(FS_TITLE), font: 'Arial' })],
    }));
  }

  // ── 2. Student header (Name / Date / Class) ──────────────────────────────────
  const noBorder = {
    top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  if (showNameLine || showDateLine || showClassLine || showScoreLine) {
    // Row 1: Name / Date
    if (showNameLine || showDateLine) {
      const nameW = showDateLine ? 6240 : 9360;
      const dateW = showNameLine ? 3120 : 9360;
      const cells = [];

      if (showNameLine) {
        cells.push(new TableCell({
          borders: noBorder,
          width: { size: nameW, type: WidthType.DXA },
          children: [new Paragraph({
            spacing: { before: PT(4), after: PT(4) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 1 } },
            children: [new TextRun({ text: 'Name: ', font: 'Arial', size: HPT(FS_CHOICE) })],
          })],
        }));
      }
      if (showDateLine) {
        cells.push(new TableCell({
          borders: noBorder,
          width: { size: dateW, type: WidthType.DXA },
          margins: { left: showNameLine ? 360 : 0 },
          children: [new Paragraph({
            spacing: { before: PT(4), after: PT(4) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 1 } },
            children: [new TextRun({ text: 'Date: ', font: 'Arial', size: HPT(FS_CHOICE) })],
          })],
        }));
      }
      children.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: cells.length === 2 ? [nameW, dateW] : [9360],
        rows: [new TableRow({ children: cells })],
      }));
    }

    // Row 2: Class / Period (left) + Score (right)
    if (showClassLine || showScoreLine) {
      children.push(spacer(4, 0));
      const scorePtLabel = totalPoints != null ? ` / ${totalPoints} ${totalPoints === 1 ? 'pt' : 'pts'}` : '';
      const classW = showScoreLine ? 5760 : 9360;
      const scoreW = showClassLine ? 3600 : 9360;
      const row2cells = [];
      if (showClassLine) {
        row2cells.push(new TableCell({
          borders: noBorder,
          width: { size: classW, type: WidthType.DXA },
          children: [new Paragraph({
            spacing: { before: PT(4), after: PT(4) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 1 } },
            children: [new TextRun({ text: 'Class / Period: ', font: 'Arial', size: HPT(FS_CHOICE) })],
          })],
        }));
      }
      if (showScoreLine) {
        row2cells.push(new TableCell({
          borders: noBorder,
          width: { size: scoreW, type: WidthType.DXA },
          margins: { left: showClassLine ? 360 : 0 },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: PT(4), after: PT(4) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 1 } },
            children: [new TextRun({ text: `Score: ___________${scorePtLabel}`, font: 'Arial', size: HPT(FS_CHOICE) })],
          })],
        }));
      }
      children.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: row2cells.length === 2 ? [classW, scoreW] : [9360],
        rows: [new TableRow({ children: row2cells })],
      }));
    }

    children.push(spacer(6, 0)); // gap after header block
  }

  // ── 3. Questions ──────────────────────────────────────────────────────────────
  for (const q of questions) {
    if (!q || !q.type) continue;

    // Section / chapter header (not the assessment title)
    if (q.type === 'header' && q.id !== 'title') {
      children.push(spacer(8, 4));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: PT(6) },
        children: [new TextRun({ text: q.text || '', bold: true, size: HPT(FS + 1), font: 'Arial' })],
      }));
      continue;
    }

    if (q.type === 'vb-divider') {
      children.push(new Paragraph({
        spacing: { before: PT(20), after: PT(8) },
        border: { top: { style: BorderStyle.SINGLE, size: 8, color: '333333', space: 4 } },
        children: [new TextRun({ text: 'VERSION B', bold: true, size: HPT(FS + 1), font: 'Arial' })],
      }));
      continue;
    }

    if (q.type === 'ak-divider') {
      children.push(new Paragraph({
        spacing: { before: PT(20), after: PT(8) },
        border: { top: { style: BorderStyle.SINGLE, size: 8, color: '333333', space: 4 } },
        children: [new TextRun({ text: 'TEACHER ANSWER KEY', bold: true, size: HPT(FS + 1), font: 'Arial' })],
      }));
      continue;
    }

    if (q.type === 'section') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: PT(18), after: PT(6) },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: '555555', space: 4 } },
        children: [new TextRun({ text: q.text || '', bold: true, size: HPT(FS), font: 'Arial' })],
      }));
      continue;
    }

    if (q.type === 'answer-key') {
      children.push(new Paragraph({
        spacing: { before: PT(2), after: PT(2) },
        children: [new TextRun({ text: q.text || '', font: 'Courier New', size: HPT(FS_CHOICE - 1) })],
      }));
      continue;
    }

    if (q.type !== 'question') continue;

    // ── Image visual ──────────────────────────────────────────────────────────
    const imgDataUrl = q._svgPng || q._customImg || null;
    if (imgDataUrl) {
      const imgW = q._svgW ? Math.min(q._svgW, 380) : 280;
      const imgH = q._svgH ? Math.min(q._svgH, 180) : 130;
      const imageRun = imgRunFromDataUrl(imgDataUrl, imgW, imgH);
      if (imageRun) {
        children.push(new Paragraph({
          spacing: { before: PT(16), after: PT(4) },
          children: [imageRun],
        }));
      }
    }

    // ── Question number + text ────────────────────────────────────────────────
    const ptLabel = q.points != null ? ` (${q.points} ${q.points === 1 ? 'pt' : 'pts'})` : '';
    children.push(new Paragraph({
      spacing: { before: imgDataUrl ? PT(4) : PT(16), after: PT(4) },
      children: [
        ...(q.qNum ? [new TextRun({ text: `${q.qNum}.`, bold: true, font: 'Arial', size: HPT(FS) })] : []),
        ...(ptLabel ? [new TextRun({ text: ptLabel, font: 'Arial', size: HPT(FS_CHOICE - 2), color: '555555' })] : []),
        new TextRun({ text: `  ${q.text || ''}`, font: 'Arial', size: HPT(FS) }),
        ...(q.standard ? [new TextRun({ text: `  [${q.standard}]`, font: 'Arial', size: HPT(FS_CHOICE - 2), color: '3B82F6', italics: true })] : []),
      ],
    }));

    // ── Sub-lines (e.g. computation rows) ────────────────────────────────────
    for (const l of q.lines || []) {
      children.push(new Paragraph({
        spacing: { before: PT(3), after: PT(3) },
        indent: { left: IN(0.25) },
        children: [new TextRun({ text: l, font: 'Arial', size: HPT(FS) })],
      }));
    }

    // ── Answer choices ────────────────────────────────────────────────────────
    if (q.choices?.length) {
      const isSATA = q.qType === 'multiselect';
      const use2Col = twoColChoices && !isSATA && q.choices.length >= 3;

      if (use2Col) {
        // Pair choices into rows of 2
        const pairs = [];
        for (let i = 0; i < q.choices.length; i += 2) pairs.push([q.choices[i], q.choices[i + 1]].filter(Boolean));
        const colW = 4500;
        for (const pair of pairs) {
          const cells = pair.map(ch => new TableCell({
            borders: noBorder,
            width: { size: colW, type: WidthType.DXA },
            children: [new Paragraph({
              spacing: { before: PT(3), after: PT(3) },
              children: [new TextRun({ text: `○  ${ch.letter})  ${ch.text || ''}`, font: 'Arial', size: HPT(FS_CHOICE) })],
            })],
          }));
          // If odd number of choices, add empty cell to balance
          if (cells.length === 1) cells.push(new TableCell({ borders: noBorder, width: { size: colW, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }));
          children.push(new Table({
            width: { size: 9000, type: WidthType.DXA },
            indent: { size: IN(0.3), type: WidthType.DXA },
            columnWidths: [colW, colW],
            rows: [new TableRow({ children: cells })],
          }));
        }
      } else {
        for (const ch of q.choices) {
          children.push(new Paragraph({
            spacing: { before: PT(4), after: PT(4) },
            indent: { left: IN(0.3) },
            children: [new TextRun({
              text: `${isSATA ? '☐' : '○'}  ${ch.letter})  ${ch.text || ''}`,
              font: 'Arial',
              size: HPT(FS_CHOICE),
            })],
          }));
        }
      }
    } else if (['fill', 'open', 'compute', 'computation', 'word'].includes(q.qType)) {
      const defaults = { fill: 2, open: 4, compute: 3, computation: 3, word: 5 };
      const lineCount = q.lineCount ?? defaults[q.qType] ?? 3;
      for (let i = 0; i < lineCount; i++) {
        children.push(answerBlank(FS_CHOICE));
      }
    }

    // ── Gap after each question ───────────────────────────────────────────────
    children.push(spacer(8, 0));
  }

  // ── 4. Build and return document ─────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: HPT(FS), fontSize: HPT(FS) } },
      },
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 12240, height: 15840 },          // US Letter
          margin: { top: IN(1), right: IN(1), bottom: IN(1), left: IN(1) },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="assessment.docx"',
    },
  });
}
