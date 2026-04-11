import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

export async function POST(request) {
  try {
    let apiKey, gradeLevel, subject, standard, customTitle;
    let includeVersionB, includeAnswerKey;
    let fileContent = null, fileMediaType = null;
    let inputMode = 'file';
    let generateMode = 'parallel'; // 'extract' | 'parallel'
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
      generateMode     = fd.get('generateMode') || 'parallel';
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
      generateMode     = body.generateMode || 'parallel';
      pastedText       = body.pastedText || '';
      url              = body.url || '';
      scratchTopic     = body.scratchTopic || '';
      scratchInstructions = body.scratchInstructions || '';
    }

    if (!apiKey) {
      return Response.json({ error: 'API key required. Click â Settings to add your Anthropic key.' }, { status: 400 });
    }

    // Validate grade and subject against known values
    const VALID_GRADES = new Set(['K','1','2','3','4','5','6','7','8','9','10','11','12']);
    const VALID_SUBJECTS = new Set(['Math','ELA','Science','Social Studies']);
    if (!VALID_GRADES.has(gradeLevel)) gradeLevel = '3';
    if (!VALID_SUBJECTS.has(subject)) subject = 'Math';

    const client = new Anthropic({ apiKey });
    const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : `Grade ${gradeLevel}`;

    // âââ Shared output format rules (applied to every prompt) ââââââââââââââââ
    const OUTPUT_RULES = `
CRITICAL OUTPUT FORMAT RULES â follow these exactly, no exceptions:
1. No markdown: no ** bold **, no _italic_, no # headers, no ``` code blocks, no > blockquotes.
2. No extra blank lines between a question number and its answer choices.
3. Answer choices always on separate lines: A) on its own line, B) on its own line, etc.
4. If a question has a visual marker AND answer choices, place the marker on its own line, then the question line, then choices on separate A) B) C) D) lines.
5. Never put spaces inside marker brackets: write cols=20,3 not cols=20, 3.
6. [IMAGE:] descriptions must be specific: "[IMAGE: bar graph showing rainfall by month]" not "[IMAGE: graph]".`;

    // âââ Visual marker reference (shared across prompts) ââââââââââââââââââââââ
    const VISUAL_REFERENCE = `
VISUAL MARKERS â place on their own line BEFORE the question number or sub-question.

Standard vector types (recreated automatically):
  [ARRAY: rows=R cols=C]
      Dot array. R rows, C dots per row. No labels unless source shows them.
  [NUM_LINE: min=0 max=M step=S]
      Number line; numbers shown at 0 and M only.
  [NUM_LINE: min=0 max=M step=S show=all]
      Number line with a label at EVERY tick (only if source labels every tick).
  [NUM_LINE: min=0 max=M step=S jumps=yes]
      Number line with curved hop arcs â one arc per step by default. Shows +value label above each arc.
  [NUM_LINE: min=0 max=M step=S jumps=yes hop_size=N]
      Hop arcs that each span N units. e.g. hop_size=5 on a 0â20 line â four +5 arcs.
  [NUM_LINE: min=0 max=M step=S jumps=yes hop_size=N hop_start=V]
      Same but hops begin at value V instead of min.
  [NUM_LINE: min=0 max=M step=1 jumps=yes hops=0:3,3:7,7:10]
      Custom arcs between specific from:to values. Use for variable-size jumps (overrides hop_size).
  [GROUPS: groups=G items=I]
      G ovals, each containing I dots. Use for "groups of" / "equal groups" models.
  [TENS_FRAME: filled=F total=10]
      2Ã5 tens frame with F filled circles.
  [TENS_FRAME: filled=F total=5]
      1Ã5 five-frame with F filled circles.
  [NUM_BOND: whole=W part1=P1 part2=P2]
      Three connected circles: top=whole, lower-left=P1, lower-right=P2.
  [NUM_BOND: whole=W part1=P1 part2=?]
      Number bond with one missing part (student fills in).
  [FRACTION: N/D]
      Horizontal fraction bar shaded N out of D sections.
      If N > D (improper fraction), automatically renders as multiple bars â e.g. [FRACTION: 5/3] shows 1 full bar + 2/3 bar.
  [FRAC_CIRCLE: N/D]
      Circle (pie) model shaded N out of D sectors.
      If N > D (improper fraction), renders as multiple circles automatically.
  [MIXED_NUM: whole=W n=N d=D]
      Mixed number fraction bar. W whole bars + N/D partial bar. e.g. whole=2 n=1 d=3 â 2 and 1/3.
  [MIXED_CIRCLE: whole=W n=N d=D]
      Mixed number circle model. W full circles + N/D partial circle.
  [AREA_MODEL: cols=A,B rows=R]
      Blank 1-row area model (multiplication). Cells are EMPTY â student fills in products.
  [AREA_MODEL: cols=A,B rows=R,S]
      Multi-digit area model. Comma-separate BOTH cols and rows for 2Ã2 or larger grids.
      Example 23Ã14: [AREA_MODEL: cols=20,3 rows=10,4] â 2Ã2 grid with cells for 200,30,40,12
      Example 3-digit: [AREA_MODEL: cols=200,40,7 rows=10,3] â 2Ã3 grid
  [AREA_MODEL: cols=A,B rows=R vals=V1,V2]
      Area model with products shown inside cells (use for DIVISION models where products are given).
  [BASE10: hundreds=H tens=T ones=O]
      Base-10 block diagram.
  [PV_CHART: NUMBER]
      Place value chart showing NUMBER broken into columns.
  [BAR_MODEL: v1,v2,...vN]
      Equal or Unequal segmented bar. For "6 equal groups of 4" â [BAR_MODEL: 4,4,4,4,4,4].
  [BAR_MODEL: v1,v2,v3 | label=Total]
      Bar model with a total label underneath.
  [TAPE: A:labelA,B:labelB | total=T]
      Tape diagram with labeled segments and optional total.
  [FUNC_TABLE: pairs=1:3,2:6,3:?,4:? | rule=Ã3]
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
  â¢ Dot array, star array, triangle array â [ARRAY:]
  â¢ Ovals/circles with items grouped inside â [GROUPS:]
  â¢ Number line with arcs/hops â [NUM_LINE: ... jumps=yes]
  â¢ Bar with labeled equal segments (multiplication/division model) â [BAR_MODEL: v,v,v,v]
  â¢ Area rectangle for multiplication (blank cells) â [AREA_MODEL: cols=... rows=...]
  â¢ Area rectangle for division (products shown inside) â [AREA_MODEL: cols=... rows=... vals=...]
  â¢ Fraction bar segments, proper fraction â [FRACTION: N/D]
  â¢ Improper fraction bar â [FRACTION: N/D] where N > D (auto renders multiple bars)
  â¢ Mixed number bar â [MIXED_NUM: whole=W n=N d=D]
  â¢ Mixed number circles â [MIXED_CIRCLE: whole=W n=N d=D]
  â¢ Multi-digit area model (e.g. 23Ã14) â [AREA_MODEL: cols=20,3 rows=10,4]
  â¢ Real-world pictures (clipart, photographs) â [IMAGE: description]
  â¢ Partial quotients long division work â [IMAGE: partial quotients]
  â¢ Student draw/show-work blank â [WORK_SPACE]
  â¢ Table of data referenced by questions â [DATA_TABLE: ...]
`;

    // âââ Exact copy / extract prompt ââââââââââââââââââââââââââââââââââââââââââ
    const extractPrompt = `You are an EXACT COPY EXTRACTOR for assessments.
Your only job: read the source and reproduce every real question EXACTLY as written â same words, same numbers, same answer choices.

âââ EXTRACTION RULES âââ

RULE 1 â COPY EVERYTHING EXACTLY.
Reproduce each question number, question text, and all answer choices word-for-word.
Do NOT change any numbers, names, words, or phrasing.
Do NOT add, remove, or reorder questions.

RULE 2 â CLEAN UP NOISE ONLY.
Remove these â they are NOT questions:
- Google Forms metadata: "Multiple Choice 1 pt * Required", "Numeric 1 pt â± Required", "Mark the correct answer.", "Your answer", "* Required"
- Student info fields: "Name", "Class", "Date", "Email" (these are form fields, not questions)
- Page numbers, footers, "This form was created inside ofâ¦"
- Any item with no actual question text â skip it entirely

RULE 3 â COMPUTATION QUESTIONS.
If a question is a bare number with the equation on the next line (e.g. "10." then "24 Ã· 6 = ___" below), combine them:
  10. 24 Ã· 6 = ___
Never output a question that is just a number with no text.

RULE 4 â VISUAL MARKERS.
For EVERY question that has a visual model, diagram, or graphic in the source, add the correct marker on its own line BEFORE the question number.
${VISUAL_REFERENCE}
${VISUAL_SELECTION_GUIDE}

RULE 5 â OUTPUT FORMAT.
Line 1: Assessment title${customTitle ? ` â use exactly: "${customTitle}"` : ' (copy"from source)'}
Then: questions numbered exactly as in source
Answer choices: A) B) C) D) format â each on its own line
${OUTPUT_RULES}
No student info fields. No form metadata.

RULE 6 â ELA READING PASSAGES.
If the source is an ELA assessment that includes a reading passage (a story or excerpt students read before answering questions):
- Write [PASSAGE] on its own line BEFORE the passage text.
- Output each passage paragraph as plain prose â no numbers, no letters, no bullets.
- Strip any margin or inline line-numbers printed beside the passage (e.g. "1  The bubble floated..." â "The bubble floated...").
- Leave one blank line between passage paragraphs.
- Write [/PASSAGE] on its own line AFTER the last passage paragraph.
- Then begin the numbered questions starting with 1.
- The passage text is NOT a question â NEVER assign it a number like "1." or any letter label.
- Question-type labels ("Multiple Selection", "Mark all correct answers", "Select all that apply") are metadata â omit them entirely, just keep the question text and choices.`;

    // âââ ELA Parallel Assessment prompt âââââââââââââââââââââââââââââââââââââââ
    const elaParallelPrompt = `You are an ELA PARALLEL ASSESSMENT CREATOR for ${gradeDisplay} students.
You will receive an ELA reading assessment (PDF or image). Your job: analyze it, then create a BRAND-NEW parallel assessment â a completely different passage with the same question types in the same order.

âââ PHASE 1 â ANALYZE (do this silently, do not output this analysis) âââ
Determine:
  â¢ Fiction or non-fiction?
  â¢ Approximate reading level and complexity (sentence length, vocabulary difficulty)
  â¢ Approximate passage word count and number of paragraphs
  â¢ Exact question types, in order (e.g., Q1 = main idea, Q2 = vocabulary in context, Q3 = inference, Q4 = text evidence, Q5 = author's purpose)
  â¢ Number of questions total
  â¢ Answer choice format (4-choice MC, multiple select, short answer, etc.)

âââ PHASE 2 â CREATE NEW PASSAGE âââ

RULE 1 â WRITE A COMPLETELY ORIGINAL PASSAGE.
â¢ If source is fiction: write a new original short story or narrative.
  - Use entirely different characters, setting, conflict, and resolution.
  - Match the approximate length (word count / paragraph count) of the source passage.
  - Match the reading complexity: similar sentence length, vocabulary level, and story structure.
â¢ If source is non-fiction: write a new informational passage on a DIFFERENT topic.
  - Choose a fresh, age-appropriate topic (animals, science, history, community, nature, etc.).
  - Match approximate length, paragraph structure, and informational density.
  - Do NOT copy or paraphrase the source topic â choose something entirely different.
â¢ The passage must be entirely your own writing.
â¢ Write in plain prose paragraphs â no numbered paragraphs, no line numbers, no bullet points.
â¢ Use age-appropriate vocabulary for ${gradeDisplay}.

âââ PHASE 3 â CREATE PARALLEL QUESTIONS âââ

RULE 2 â MIRROR THE QUESTION TYPES IN ORDER.
â¢ Output exactly the same number of questions as the source.
â¢ Preserve the question type sequence exactly:
  - If source Q1 is "main idea" â your Q1 is "main idea" (about your new passage)
  - If source Q3 is "vocabulary in context" â your Q3 is "vocabulary in context" (a word from your passage)
  - If source Q5 is "inference" â your Q5 is "inference" (answerable from your passage)
â¢ Common fiction question types: central message/theme, character traits, character feelings/motivations, setting, problem and solution, cause and effect, sequence of events, point of view, inference, vocabulary in context, figurative language, text evidence.
â¢ Common non-fiction question types: main idea, key details, inference, vocabulary in context, author's purpose, text structure, cause and effect, compare and contrast, central idea, text evidence, summary.
â¢ Match the exact number of answer choices (usually AâD).
â¢ Ensure exactly one correct answer per multiple-choice question.
â¢ For vocabulary questions: choose a word that actually appears in your new passage; make distractors real words that don't fit the context.
â¢ For text evidence questions: the answer must be directly supportable from your passage.
â¢ For inference questions: the answer must be logically inferable from your passage.

RULE 3 â DO NOT INCLUDE THE ANSWER KEY.

âââ OUTPUT FORMAT âââ

Line 1: New assessment title (relevant to your new passage)
Line 2: Directions (e.g., "Read the passage below. Then answer the questions.")
[PASSAGE]
(your new passage â plain paragraphs, no line numbers)
[/PASSAGE]
1. (first question text)
A) ...
B) ...
C) ...
D) ...

2. (second question text)
A) ...
(continue for all questions)

${OUTPUT_RULES}`;

    // âââ Parallel form system prompt ââââââââââââââââââââââââââââââââââââââââââ
    const parallelPrompt = `You are a PARALLEL FORM GENERATOR for math assessments.
Your only job: read the source assessment and output a near-identical version with different numbers.

You generate items using Radical/Incidental theory:
â¢ RADICALS are the mathematical parameters that control difficulty and cognitive level (number range, operation, whether regrouping is needed). Keep radicals at the SAME difficulty as the source â do not make problems harder or easier.
â¢ INCIDENTALS are surface features (character names, object types, story context). Change incidentals freely to make the parallel form feel fresh.

âââ THE RULES âââ

RULE 1 â SAME STRUCTURE, SAME DIFFICULTY.
Count questions in the source. Output exactly that many, in the same order.
Keep: question type (MC/fill-in/open/computation), sub-parts (a/b/c), section headers, direction lines.
Keep radicals equivalent: same operation, same number range, same regrouping/carry requirements.
Change incidentals: names, objects, story contexts â but keep them grade-appropriate and realistic.

RULE 2 â COPY QUESTION FORMAT EXACTLY.
Source "The array shows ___ Ã ___."  â  Output "The array shows ___ Ã ___."   (keep every blank)
Source "420 Ã· 7 ="                  â  Output "560 Ã· 8 ="                      (keep computation format)
Source MC with A B C D               â  Output MC with A B C D (recalculate choices for new numbers)
Source sub-parts a) b) c)            â  Output sub-parts a) b) c)

RULE 3 â COPY SECTION HEADERS AND DIRECTIONS EXACTLY.
"Part A: Word Problems" â copy it exactly. It goes on its own line, no number.

RULE 4 â VISUAL MARKERS.
For EVERY question that has a visual in the source, you MUST include the correct marker.
Place markers on their own line IMMEDIATELY BEFORE the question number.

Step A â Look at the visual and identify its TYPE using the recognition guide below.
Step B â Write the parallel question text with new numbers.
Step C â Write the marker with values matching the PARALLEL question's numbers.

VISUAL RECOGNITION GUIDE â use specific markers whenever possible:
  â¢ Row/column grid of dots, stars, or shapes â [ARRAY: rows=R cols=C]
  â¢ Horizontal line with tick marks and numbers â [NUM_LINE: min=A max=B step=S]
  â¢ Horizontal line with curved arcs/jumps above it â [NUM_LINE: ... jumps=yes hop_size=N]
  â¢ Ovals or circles each containing equal groups of dots â [GROUPS: groups=G items=I]
  â¢ 2Ã5 or 1Ã5 grid of circles (some filled) â [TENS_FRAME: filled=F]
  â¢ Three connected circles (top=whole, two below=parts) â [NUM_BOND: whole=W part1=P1 part2=P2]
  â¢ Horizontal bar divided into equal sections, some shaded â [FRACTION: N/D]
  â¢ Circle divided into equal pie sectors, some shaded â [FRAC_CIRCLE: N/D]
  â¢ Multiple fraction bars (improper fractions) â [FRACTION: N/D] where N > D
  â¢ Whole bars plus partial bar â [MIXED_NUM: whole=W n=N d=D]
  â¢ Small unit cubes, rods (10s), flat squares (100s), big cubes (1000s) â [BASE10: ...]
  â¢ Rectangle split into sub-rectangles (multiplication model) â [AREA_MODEL: cols=... rows=...]
  â¢ Segmented horizontal bar with labeled parts â [BAR_MODEL: v1,v2,v3]
  â¢ Two-part tape/strip diagram with labels â [TAPE: A:labelA,B:labelB]
  â¢ InputâOutput table with a rule â [FUNC_TABLE: pairs=1:3,2:6 | rule=Ã3]
  â¢ Multi-column data/tally table â [DATA_TABLE: header=... | row1 | row2]
  â¢ Number chart (like a hundred chart) with highlighted cells â [NUM_CHART: start=1 end=100 cols=10 shaded=5,10]
  â¢ Blank box labeled "Show your work" or "Draw a model" â [WORK_SPACE]

CRITICAL: Use [IMAGE: description] ONLY for things that CANNOT be a standard marker:
  photos, clipart, illustrations of real objects, bar/line/picture graphs, clocks,
  rulers, coordinate planes, geometry diagrams, partial quotients boxes,
  complex multi-fraction comparison strips.
  DO NOT use [IMAGE:] for number lines, fraction bars, arrays, base-10 blocks, number bonds,
  tens frames, or any other standard math model type listed above.

VISUAL PARAMETER RULES (prevents answer give-aways):
  â¢ Number line labels at EVERY tick â add show=all; only endpoints labeled â omit show=all.
  â¢ Area model with BLANK cells (student finds products) â omit vals=. NEVER pre-fill blank-cell models.
  â¢ Area model where products ARE shown â include vals=V1,V2,...
  â¢ Number bond with a missing part â [NUM_BOND: whole=W part1=P1 part2=?].
  â¢ Bar model with equal same-value segments â list value N times: [BAR_MODEL: 4,4,4,4,4,4].

DO NOT add any visual to questions that had none in the source.
DO NOT use [WORK_SPACE] unless the source actually has a blank drawing/work box there.

${VISUAL_REFERENCE}
${VISUAL_SELECTION_GUIDE}

RULE 5 â VARIABLE SYNCHRONIZATION (VISUAL â TEXT).
When you change numbers for the parallel form, the visual marker parameters MUST update to match.
Use this process for each question:
  Step 1: Pick new numbers for the parallel question (the radicals).
  Step 2: Write the question text with those new numbers.
  Step 3: Write the visual marker using EXACTLY the same numbers from Step 1.
  Step 4: Recalculate answer choices based on those same numbers.
NEVER let the text say one thing and the visual show different numbers.
Examples of synchronized output:
  Source: "3 Ã 4 = ___" with [ARRAY: rows=3 cols=4]
  Parallel: "5 Ã 3 = ___" with [ARRAY: rows=5 cols=3]  â visual matches text
  Source: "What is 2/5 of the bar?" with [FRACTION: 2/5]
  Parallel: "What is 3/8 of the bar?" with [FRACTION: 3/8]  â visual matches text

RULE 6 â ANSWER CHOICES.
Recalculate MC choices to match the new numbers. Keep the same structure (one correct + three plausible distractors).
Verify: the correct answer must be mathematically correct for the new numbers. Distractors should reflect common errors for the new problem (off-by-one, wrong operation, etc.).

RULE 7 â OUTPUT FORMAT.
Line 1: Assessment title${customTitle ? ` â use exactly: "${customTitle}"` : ' (same as source, or a close parallel)'}
Line 2: Subtitle/directions (exact copy from source)
Then: questions numbered exactly as in source
Answer choices: A) B) C) D) format â each on its own line
Standard tags: [3.OA.A.1] on their own line after a question
${OUTPUT_RULES}

RULE 8 â GOOGLE FORMS / QUIZ CLEANUP.
If the source is a Google Form or online quiz PDF, it will contain metadata you must IGNORE and NEVER include in your output:
- "Multiple Choice 1 pt * Required", "Short answer text", "Numeric 1 pt", "Paragraph text", etc.
- "Mark the correct answer.", "Your answer", "* Required", "Select all that apply."
- Student info fields like "Name *", "Class *", "Date *", "Email address" â these are NOT questions; omit them entirely.
- Page numbers, form footers, "This form was created inside ofâ¦"
- Any question that has NO actual question text (just a label or blank) â skip it entirely.
Output only the real academic questions with their answer choices.

RULE 8 â COMPUTATION QUESTIONS.
If the source has computation-only questions (a bare math expression, e.g. "24 Ã· 6 = ___" or "3/4 + 1/4 = ___"), put the equation directly as the question text on the same line as the number:
  10. 56 Ã· 8 = ___
Never write "10. Solve" with the equation on a separate line. The equation IS the question.
If the source says "Solve" or "Compute" with an equation below, replace the whole thing with just:
  N. [the equation] = ___

RULE 9 â EVERY QUESTION MUST HAVE REAL TEXT.
Before writing each question, check: does this question have actual academic content?
  â INCLUDE: real math questions, word problems, fill-in-the-blank, MC, equations to solve
  â SKIP: student info fields (Name, Class, Date, Email), form labels, UI buttons, page numbers, blank items
Every numbered question in your output must have actual question text â never output a bare number with nothing after it.
If the source question is unclear or unreadable, write a similar question on the same topic/skill instead of leaving it blank.
${includeVersionB ? '\nAfter all questions write "VERSION B" on its own line, then repeat with a different set of numbers/contexts.' : ''}
${includeAnswerKey ? '\nAfter all questions (and Version B if included) write "TEACHER ANSWER KEY" on its own line. List: "1. C â brief explanation" for MC; computed value for fill-in; sample answer for open response.' : ''}
${standard ? `\nAlign to standard: ${standard}` : ''}`;

    // âââ From-scratch system prompt âââââââââââââââââââââââââââââââââââââââââââ
    const scratchPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES:
1. Title on line 1${customTitle ? ` â use exactly: "${customTitle}"` : ''}
2. Optional brief subtitle/directions on line 2
3. Number each question: "1. Question text"
4. MC questions: list 4 options as A) B) C) D)
5. Fill-in-the-blank: use ___ for each blank
6. Computation: write the equation plainly, e.g. "420 Ã· 7 ="
7. Multi-part: use a) b) c) sub-labels
8. Standard tags on own line after question: [3.OA.A.1]
9. No asterisks, no markdown, no bold.

QUESTION QUALITY:
- Mix types: fill-in, MC, open response, computation, word problems
- Progress from recall â application â reasoning
- Each question tests ONE clear skill
${standard ? `- Focus on standard: ${standard}` : ''}

For MATH assessments, add appropriate visual markers where they help:
${VISUAL_REFERENCE}

Only add a visual when it genuinely aids the question. Never add one to "explain" or "show your work" questions.
${includeVersionB ? '\nAfter all questions write "VERSION B" then alternate questions testing the same skills.' : ''}
${includeAnswerKey ? '\nAfter questions write "TEACHER ANSWER KEY" then list answers.' : ''}
${OUTPUT_RULES}`;

    // âââ Build messages âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    let systemPrompt, userContent;

    if (inputMode === 'file' && fileContent) {
      const isImage = ['image/png','image/jpeg','image/webp'].includes(fileMediaType);
      if (generateMode === 'ela-parallel') {
        systemPrompt = elaParallelPrompt;
        userContent = [
          { type: 'text', text: 'Here is the source ELA assessment. Analyze it carefully â identify whether it is fiction or non-fiction, the passage length and complexity, and every question type in order. Then create a brand-new parallel assessment following all rules.' },
          { type: isImage ? 'image' : 'document', source: { type: 'base64', media_type: fileMediaType, data: fileContent } },
        ];
      } else if (generateMode === 'extract') {
        systemPrompt = extractPrompt;
        userContent = [
          { type: 'text', text: 'Here is the source assessment. Extract every question exactly as written, add visual markers where needed, and clean up any form metadata noise.' },
          { type: isImage ? 'image' : 'document', source: { type: 'base64', media_type: fileMediaType, data: fileContent } },
        ];
      } else {
        systemPrompt = parallelPrompt;
        userContent = [
          { type: 'text', text: 'Here is the source assessment. Read every question carefully, identify each visual, then output the parallel form following all rules.' },
          { type: isImage ? 'image' : 'document', source: { type: 'base64', media_type: fileMediaType, data: fileContent } },
        ];
      }
    } else if (inputMode === 'paste' && pastedText) {
      systemPrompt = generateMode === 'parallel' ? parallelPrompt : extractPrompt;
      userContent = generateMode === 'parallel'
        ? `Here is the source assessment text. Read every question, then output a parallel form:\n\n${pastedText}`
        : `Here is the assessment text. Extract every question exactly as written:\n\n${pastedText}`;
    } else if (inputMode === 'url' && url) {
      systemPrompt = scratchPrompt;
      userContent = `Create a ${gradeDisplay} ${subject} assessment based on the lesson at: ${url}`;
    } else {
      systemPrompt = scratchPrompt;
      userContent = `Create a ${gradeDisplay} ${subject} assessment on: ${scratchTopic}.${scratchInstructions ? '\n\nExtra instructions:\n' + scratchInstructions : ''}`;
    }

    // Temperature: low for extraction (deterministic), higher for creative generation
    // max_tokens: larger for parallel + version B modes; standard for extraction/scratch
    const isCreative = generateMode === 'ela-parallel' || (generateMode === 'parallel' && inputMode === 'scratch');
    const isExtract  = generateMode === 'extract';
    const needsBig   = includeVersionB || includeAnswerKey || generateMode === 'parallel' || generateMode === 'ela-parallel';
    const temperature = isExtract ? 0.2 : isCreative ? 0.75 : 0.4;
    const max_tokens  = needsBig ? 8192 : 4096;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const result = response.content[0].text;
    return Response.json({ result });

  } catch (err) {
    console.error('Generate error:', err);
    const msg   = err.message || 'Unknown error';
    const status = err.status ?? err.statusCode ?? null;
    if (status === 402 || msg.includes('credit') || msg.includes('balance')) {
      return Response.json({ error: 'API credit balance too low. Add credits at console.anthropic.com â Billing.' }, { status: 402 });
    }
    if (status === 401 || msg.includes('API key') || msg.includes('auth') || msg.includes('401')) {
      return Response.json({ error: 'Invalid API key. Check your key in â Settings.' }, { status: 401 });
    }
    if (status === 529 || msg.includes('overloaded')) {
      return Response.json({ error: 'Claude API is overloaded right now. Please try again in a moment.' }, { status: 503 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
