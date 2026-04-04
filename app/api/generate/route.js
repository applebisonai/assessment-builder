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
VISUAL MARKERS — place on their own line BEFORE the question number.

Common types:
  [ARRAY: rows=R cols=C]
      Simple dot array. R rows of C dots. No dimension labels unless source has them.
  [NUM_LINE: min=0 max=M step=S]
      Number line. Shows numbers at 0 and M only.
  [NUM_LINE: min=0 max=M step=S show=all]
      Number line showing a number at EVERY tick (use only when source labels all ticks).
  [NUM_LINE: min=0 max=M step=S jumps=yes]
      Number line with curved hop arcs above each jump.
  [GROUPS: groups=G items=I]
      G ovals, each containing I dots.
  [TENS_FRAME: filled=F total=10]
      Standard 2×5 tens frame with F filled circles.
  [TENS_FRAME: filled=F total=5]
      1×5 five-frame with F filled circles.
  [NUM_BOND: whole=W part1=P1 part2=P2]
      Three connected circles: top=whole, bottom-left=P1, bottom-right=P2.
  [NUM_BOND: whole=W part1=P1 part2=?]
      Number bond with missing second part (student fills in).
  [FRACTION: N/D]
      Horizontal fraction bar; N of D sections shaded.
  [FRAC_CIRCLE: N/D]
      Fraction circle; N of D sectors shaded.
  [AREA_MODEL: cols=A,B rows=R]
      Distributive property rectangle. Interior cells are BLANK for student to fill.
  [BASE10: hundreds=H tens=T ones=O]
      Base-10 block diagram.
  [PV_CHART: NUMBER]
      Place value chart showing NUMBER in its columns.
  [BAR_MODEL: v1,v2,v3 | label=Total]
      Segmented bar; optional total label.
  [TAPE: A:labelA,B:labelB | total=T]
      Tape diagram with labeled segments.
  [FUNC_TABLE: pairs=1:3,2:6,3:?,4:? | rule=×3]
      Input/output table. Use ? for missing values students must find.
  [DATA_TABLE: header=Category,Count | Apples,5 | Bananas,8]
      Data table (tally chart, frequency table, survey results).
  [YES_NO_TABLE: 4×6=24 | 3×8=24 | 5×5=30]
      Decision table; each row gets a Yes/No bubble pair.
  [GRID_RESPONSE: cols=4]
      Bubble-in student answer grid.
  [NUM_CHART: start=1 end=40 cols=10 shaded=3,6,9,12]
      Number chart with highlighted cells.
  [IMAGE:]
      Placeholder — teacher will paste their own image here.
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
For EVERY question that has a visual in the source, you MUST include a visual marker.
Place the marker on its own line IMMEDIATELY BEFORE the question number.

Step A — Identify the visual TYPE from the source.
Step B — Write the parallel question text with new numbers.
Step C — Write the marker with values matching the PARALLEL question's numbers (not the source's).

Example:
  Source has a 4×6 dot array. Question: "The array shows ___ × ___."
  Parallel question is about 3 × 8.
  → Write: [ARRAY: rows=3 cols=8]   then: "3. The array shows ___ × ___."

VISUAL LABEL RULE (critical):
  ONLY include parameters the source visual actually shows.
  • Source array has NO dimension labels → output [ARRAY: rows=R cols=C] with no extras.
  • Source number line shows numbers at EVERY tick → add show=all. If only endpoints → omit show=all.
  • Source area model interior is BLANK → interior stays blank (student fills it in). NEVER put the product inside.
  • Source fraction bar has NO fraction text beside it → do NOT add any label.
  • Source number bond has a missing part → use [NUM_BOND: whole=W part1=P1 part2=?].
  This rule exists so visuals never give away the answer students are supposed to find.

For visuals you CANNOT recreate as a standard type (illustrations, bar graphs, clocks, rulers,
coordinate planes, photographs, complex geometry diagrams):
  → Output [IMAGE:] as a placeholder. The teacher will paste their own image.

DO NOT add a visual to questions with none in the source.
DO NOT add a visual to "explain how/why", "show your work", or "write the fact family" questions.

${VISUAL_REFERENCE}

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
