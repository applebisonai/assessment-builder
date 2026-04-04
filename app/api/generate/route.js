import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    let apiKey, gradeLevel, subject, standard, customTitle;
    let includeVersionB, includeAnswerKey;
    let fileContent = null, fileMediaType = null;
    let inputMode = 'file';
    let pastedText = '', url = '', scratchTopic = '', scratchInstructions = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      apiKey           = fd.get('apiKey') || '';
      gradeLevel       = fd.get('gradeLevel') || '3';
      subject          = fd.get('subject') || 'Math';
      standard         = fd.get('standard') || '';
      customTitle      = fd.get('customTitle') || '';
      includeVersionB  = fd.get('includeVersionB') === 'true';
      includeAnswerKey = fd.get('includeAnswerKey') === 'true';
      inputMode        = 'file';

      const file = fd.get('file');
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        fileContent = buf.toString('base64');
        const n = file.name.toLowerCase();
        if      (n.endsWith('.pdf'))              fileMediaType = 'application/pdf';
        else if (n.endsWith('.png'))              fileMediaType = 'image/png';
        else if (n.endsWith('.jpg') || n.endsWith('.jpeg')) fileMediaType = 'image/jpeg';
        else if (n.endsWith('.webp'))             fileMediaType = 'image/webp';
        else                                      fileMediaType = 'application/pdf';
      }
    } else {
      const body = await request.json();
      apiKey           = body.apiKey || '';
      gradeLevel       = body.gradeLevel || '3';
      subject          = body.subject || 'Math';
      standard         = body.standard || '';
      customTitle      = body.customTitle || '';
      includeVersionB  = body.includeVersionB || false;
      includeAnswerKey = body.includeAnswerKey || false;
      inputMode        = body.inputMode || 'scratch';
      pastedText       = body.pastedText || '';
      url              = body.url || '';
      scratchTopic     = body.scratchTopic || '';
      scratchInstructions = body.scratchInstructions || '';
    }

    if (!apiKey) {
      return Response.json({ error: 'API key required. Click ⚙ Settings to add your Anthropic key.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : `Grade ${gradeLevel}`;

    // ─── Visual marker reference (shared across prompts) ──────────────────────
    const VISUAL_REFERENCE = `
VISUAL MARKERS — place on their own line BEFORE the question number or sub-question.

Standard vector types (recreated automatically):
  [ARRAY: rows=R cols=C]
      Dot array. R rows, C dots per row. No labels unless source shows them.
  [NUM_LINE: min=0 max=M step=S]
      Number line; numbers shown at 0 and M only.
  [NUM_LINE: min=0 max=M step=S show=all]
      Number line with a label at EVERY tick (only if source labels every tick).
  [NUM_LINE: min=0 max=M step=S jumps=yes]
      Number line with curved hop arcs — one arc per step by default. Shows +value label above each arc.
  [NUM_LINE: min=0 max=M step=S jumps=yes hop_size=N]
      Hop arcs that each span N units. e.g. hop_size=5 on a 0–20 line → four +5 arcs.
  [NUM_LINE: min=0 max=M step=S jumps=yes hop_size=N hop_start=V]
      Same but hops begin at value V instead of min.
  [NUM_LINE: min=0 max=M step=1 jumps=yes hops=0:3,3:7,7:10]
      Custom arcs between specific from:to values. Use for variable-size jumps (overrides hop_size).
  [GROUPS: groups=G items=I]
      G ovals, each containing I dots. Use for "groups of" / "equal groups" models.
  [TENS_FRAME: filled=F total=10]
      2×5 tens frame with F filled circles.
  [TENS_FRAME: filled=F total=5]
      1×5 five-frame with F filled circles.
  [NUM_BOND: whole=W part1=P1 part2=P2]
      Three connected circles: top=whole, lower-left=P1, lower-right=P2.
  [NUM_BOND: whole=W part1=P1 part2=?]
      Number bond with one missing part (student fills in).
  [FRACTION: N/D]
      Horizontal fraction bar shaded N out of D sections.
      If N > D (improper fraction), automatically renders as multiple bars — e.g. [FRACTION: 5/3] shows 1 full bar + 2/3 bar.
  [FRAC_CIRCLE: N/D]
      Circle (pie) model shaded N out of D sectors.
      If N > D (improper fraction), renders as multiple circles automatically.
  [MIXED_NUM: whole=W n=N d=D]
      Mixed number fraction bar. W whole bars + N/D partial bar. e.g. whole=2 n=1 d=3 → 2 and 1/3.
  [MIXED_CIRCLE: whole=W n=N d=D]
      Mixed number circle model. W full circles + N/D partial circle.
  [AREA_MODEL: cols=A,B rows=R]
      Blank 1-row area model (multiplication). Cells are EMPTY — student fills in products.
  [AREA_MODEL: cols=A,B rows=R,S]
      Multi-digit area model. Comma-separate BOTH cols and rows for 2×2 or larger grids.
      Example 23×14: [AREA_MODEL: cols=20,3 rows=10,4] → 2×2 grid with cells for 200,30,40,12
      Example 3-digit: [AREA_MODEL: cols=200,40,7 rows=10,3] → 2×3 grid
  [AREA_MODEL: cols=A,B rows=R vals=V1,V2]
      Area model with products shown inside cells (use for DIVISION models where products are given).
  [BASE10: hundreds=H tens=T ones=O]
      Base-10 block diagram.
  [PV_CHART: NUMBER]
      Place value chart showing NUMBER broken into columns.
  [BAR_MODEL: v1,v2,...vN]
      Equal or unequal segmented bar. For "6 equal groups of 4" → [BAR_MODEL: 4,4,4,4,4,4].
  [BAR_MODEL: v1,v2,v3 | label=Total]
      Bar model with a total label underneath.
  [TAPE: A:labelA,B:labelB | total=T]
      Tape diagram with labeled segments and optional total.
  [FUNC_TABLE: pairs=1:3,2:6,3:?,4:? | rule=×3]
      Input/output function table. Use ? for blanks students must find.
  [DATA_TABLE: header=Col1,Col2,Col3 | Row1Val1,Row1Val2,Row1Val3 | Row2Val1,...]
      Any data table, tally chart, or multi-column reference table.
      Example: [DATA_TABLE: header=Year,Nikolas,Jayson | Last Year,1362,1948 | This Year,1982,1013]
  [YES_NO_TABLE: statement1 | statement2 | statement3]
      Decision table; each statement gets a Yes/No bubble pair.
  [GRID_RESPONSE: cols=4]
      Bubble-in answer grid (one column per digit).
  [NUM_CHART: start=1 end=100 cols=10 shaded=5,10,15,20]
      Hundred chart or partial number chart with highlighted cells.
  [WORK_SPACE]
      A blank box where students draw or show their work.
      Use whenever the source has empty drawing space for: "Draw a model", "Show your work",
      "Use a model to represent", or "Draw an array/number line/etc."
  [IMAGE: brief description]
      Teacher-paste placeholder for visuals that cannot be recreated as standard types:
      illustrations of real objects (bags, apples, animals), bar/line/picture graphs,
      clocks, rulers, coordinate planes, partial quotients algorithm boxes,
      complex multi-fraction bar comparisons, geometry diagrams.
`;

    const VISUAL_SELECTION_GUIDE = `
CHOOSING THE RIGHT MARKER:
  • Dot array, star array, triangle array → [ARRAY:]
  • Ovals/circles with items grouped inside → [GROUPS:]
  • Number line with arcs/hops → [NUM_LINE: ... jumps=yes]
  • Bar with labeled equal segments (multiplication/division model) → [BAR_MODEL: v,v,v,v]
  • Area rectangle for multiplication (blank cells) → [AREA_MODEL: cols=... rows=...]
  • Area rectangle for division (products shown inside) → [AREA_MODEL: cols=... rows=... vals=...]
  • Fraction bar segments, proper fraction → [FRACTION: N/D]
  • Improper fraction bar → [FRACTION: N/D] where N > D (auto renders multiple bars)
  • Mixed number bar → [MIXED_NUM: whole=W n=N d=D]
  • Mixed number circles → [MIXED_CIRCLE: whole=W n=N d=D]
  • Multi-digit area model (e.g. 23×14) → [AREA_MODEL: cols=20,3 rows=10,4]
  • Real-world pictures (clipart, photographs) → [IMAGE: description]
  • Partial quotients long division work → [IMAGE: partial quotients]
  • Student draw/show-work blank → [WORK_SPACE]
  • Table of data referenced by questions → [DATA_TABLE: ...]
`;

    // ─── Parallel form system prompt ──────────────────────────────────────────
    const parallelPrompt = `You are a PARALLEL FORM GENERATOR for math assessments.
Your only job: read the source assessment and output a near-identical version with different numbers.

━━━ THE 6 RULES ━━━

RULE 1 — SAME STRUCTURE.
Count questions in the source. Output exactly that many, in the same order.
Keep: question type (MC/fill-in/open/computation), sub-parts (a/b/c), section headers, direction lines.
Change only: specific numbers, proper names in word problems, and the objects/context of word problems.

RULE 2 — COPY QUESTION FORMAT EXACTLY.
Source "The array shows ___ × ___."  →  Output "The array shows ___ × ___."   (keep every blank)
Source "420 ÷ 7 ="                  →  Output "560 ÷ 8 ="                      (keep computation format)
Source MC with A B C D               →  Output MC with A B C D (recalculate choices for new numbers)
Source sub-parts a) b) c)            →  Output sub-parts a) b) c)

RULE 3 — COPY SECTION HEADERS AND DIRECTIONS EXACTLY.
"Part A: Word Problems" → copy it exactly. It goes on its own line, no number.

RULE 4 — VISUAL MARKERS.
For EVERY question that has a visual in the source, include the right marker.
Place markers on their own line IMMEDIATELY BEFORE the question number (or sub-question if the visual is inside a sub-part).

Step A — Identify the visual TYPE from the source (see guide below).
Step B — Write the parallel question text with new numbers.
Step C — Write the marker with values matching the PARALLEL question's numbers (not the source's).

Example:
  Source has a 4×6 dot array. Question: "The array shows ___ × ___."
  Parallel question is about 3 × 8.
  → Write: [ARRAY: rows=3 cols=8]   then: "3. The array shows ___ × ___."

VISUAL LABEL RULE (critical — prevents answer give-aways):
  ONLY include parameters the source visual actually shows.
  • Array with NO dimension labels → [ARRAY: rows=R cols=C] only, no extras.
  • Number line labels at EVERY tick → add show=all; only endpoints labeled → omit show=all.
  • Number line with hop arcs → add jumps=yes.
  • Area model with BLANK cells (student finds products) → omit vals=. NEVER put products inside blank-cell models.
  • Area model where products ARE shown (division context) → include vals=V1,V2,...
  • Fraction bar with no label beside it → no label parameter.
  • Number bond with a missing part → [NUM_BOND: whole=W part1=P1 part2=?].
  • Bar model with equal same-value segments → list value N times: [BAR_MODEL: 4,4,4,4,4,4].

For "draw/show your work" blank spaces: use [WORK_SPACE] — not [IMAGE:].
For pictures you cannot recreate (clipart, illustrations, bar graphs, clocks, rulers,
partial quotients algorithm, multi-fraction bar comparisons, geometry, photographs):
  → use [IMAGE: brief description].

DO NOT add any visual to questions that had none in the source.
DO NOT use [WORK_SPACE] unless the source actually has a blank drawing/work box there.

${VISUAL_REFERENCE}
${VISUAL_SELECTION_GUIDE}

RULE 5 — ANSWER CHOICES.
Recalculate MC choices to match the new numbers. Keep the same structure (one correct + three plausible distractors).

RULE 6 — OUTPUT FORMAT.
Line 1: Assessment title${customTitle ? ` — use exactly: "${customTitle}"` : ' (same as source, or a close parallel)'}
Line 2: Subtitle/directions (exact copy from source)
Then: questions numbered exactly as in source
Answer choices: A) B) C) D) format
Standard tags: [3.OA.A.1] on their own line after a question
No asterisks, no markdown, no bold text.
${includeVersionB ? '\nAfter all questions write "VERSION B" on its own line, then repeat with a different set of numbers/contexts.' : ''}
${includeAnswerKey ? '\nAfter all questions (and Version B if included) write "TEACHER ANSWER KEY" on its own line. List: "1. C — brief explanation" for MC; computed value for fill-in; sample answer for open response.' : ''}
${standard ? `\nAlign to standard: ${standard}` : ''}`;

    // ─── From-scratch system prompt ───────────────────────────────────────────
    const scratchPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES:
1. Title on line 1${customTitle ? ` — use exactly: "${customTitle}"` : ''}
2. Optional brief subtitle/directions on line 2
3. Number each question: "1. Question text"
4. MC questions: list 4 options as A) B) C) D)
5. Fill-in-the-blank: use ___ for each blank
6. Computation: write the equation plainly, e.g. "420 ÷ 7 ="
7. Multi-part: use a) b) c) sub-labels
8. Standard tags on own line after question: [3.OA.A.1]
9. No asterisks, no markdown, no bold.

QUESTION QUALITY:
- Mix types: fill-in, MC, open response, computation, word problems
- Progress from recall → application → reasoning
- Each question tests ONE clear skill
${standard ? `- Focus on standard: ${standard}` : ''}

For MATH assessments, add appropriate visual markers where they help:
${VISUAL_REFERENCE}

Only add a visual when it genuinely aids the question. Never add one to "explain" or "show your work" questions.
${includeVersionB ? '\nAfter all questions write "VERSION B" then alternate questions testing the same skills.' : ''}
${includeAnswerKey ? '\nAfter questions write "TEACHER ANSWER KEY" then list answers.' : ''}`;

    // ─── Build messages ───────────────────────────────────────────────────────
    let systemPrompt, userContent;

    if (inputMode === 'file' && fileContent) {
      systemPrompt = parallelPrompt;
      const isImage = ['image/png','image/jpeg','image/webp'].includes(fileMediaType);
      userContent = [
        { type: 'text', text: 'Here is the source assessment. Read every question carefully, identify each visual, then output the parallel form following all rules.' },
        { type: isImage ? 'image' : 'document', source: { type: 'base64', media_type: fileMediaType, data: fileContent } },
      ];
    } else if (inputMode === 'paste' && pastedText) {
      systemPrompt = parallelPrompt;
      userContent = `Here is the source assessment text. Read every question, then output a parallel form:\n\n${pastedText}`;
    } else if (inputMode === 'url' && url) {
      systemPrompt = scratchPrompt;
      userContent = `Create a ${gradeDisplay} ${subject} assessment based on the lesson at: ${url}`;
    } else {
      systemPrompt = scratchPrompt;
      userContent = `Create a ${gradeDisplay} ${subject} assessment on: ${scratchTopic}.${scratchInstructions ? '\n\nExtra instructions:\n' + scratchInstructions : ''}`;
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const result = response.content[0].text;
    return Response.json({ result });

  } catch (err) {
    console.error('Generate error:', err);
    const msg = err.message || 'Unknown error';
    if (msg.includes('credit') || msg.includes('balance')) {
      return Response.json({ error: 'API credit balance too low. Add credits at console.anthropic.com → Billing.' }, { status: 402 });
    }
    if (msg.includes('API key') || msg.includes('auth') || msg.includes('401')) {
      return Response.json({ error: 'Invalid API key. Check your key in ⚙ Settings.' }, { status: 401 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
