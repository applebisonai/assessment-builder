import Anthropic from '@anthropic-ai/sdk';

// ─── Post-processor: strip markers whose type contradicts the question text ──
// This is deterministic code, not AI judgment — catches cases like a [NUM_LINE]
// placed before a question that says "array", or [GROUPS] before "number line".
function fixMarkerTypeMismatches(text) {
  // keyword pattern → the ONLY allowed marker types for questions containing that keyword
  const TYPE_RULES = [
    { pattern: /\b(array|arrays|rows\s+and\s+columns)\b/i,          allowed: ['ARRAY', 'AREA_MODEL'] },
    { pattern: /\bnumber\s+line\b/i,                                  allowed: ['NUM_LINE'] },
    { pattern: /\b(equal\s+groups?|groups?\s+of\s+\d)\b/i,           allowed: ['GROUPS'] },
    { pattern: /\bnumber\s+bond\b/i,                                  allowed: ['NUM_BOND'] },
    { pattern: /\b(tens?\s+frame|five[\s-]frame)\b/i,                 allowed: ['TENS_FRAME'] },
    { pattern: /\bfraction\s+circle\b/i,                              allowed: ['FRAC_CIRCLE'] },
    { pattern: /\bfraction\s+bar\b/i,                                 allowed: ['FRACTION'] },
    { pattern: /\b(function\s+table|input.{0,12}output|in\/out)\b/i,  allowed: ['FUNC_TABLE'] },
    { pattern: /\btape\s+diagram\b/i,                                 allowed: ['TAPE'] },
    { pattern: /\bbar\s+model\b/i,                                    allowed: ['BAR_MODEL'] },
    { pattern: /\bplace\s+value\s+(chart|table)\b/i,                  allowed: ['PV_CHART'] },
    { pattern: /\bbase[\s-]?10\b/i,                                   allowed: ['BASE10'] },
  ];

  const lines = text.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect a visual marker line
    const markerMatch = trimmed.match(/^\[([A-Z][A-Z0-9_]*):.*\]$/);
    if (!markerMatch) {
      out.push(line);
      continue;
    }

    const markerType = markerMatch[1];

    // Look ahead to find the question text (next non-empty line)
    let questionText = '';
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const t = lines[j].trim();
      if (t) { questionText = t; break; }
    }

    // Check each rule: if the question text matches a keyword pattern AND the
    // marker type is NOT in that pattern's allowed list → strip the marker.
    let shouldStrip = false;
    for (const rule of TYPE_RULES) {
      if (rule.pattern.test(questionText) && !rule.allowed.includes(markerType)) {
        shouldStrip = true;
        break;
      }
    }

    if (!shouldStrip) {
      out.push(line);
    }
    // else: drop the line entirely — mismatched marker removed
  }

  return out.join('\n');
}

export async function POST(request) {
  try {
    let gradeLevel, subject, standard, includeVersionB, includeAnswerKey, questionCount, customTitle, url, pastedText, apiKey;
    let fileContent = null;
    let fileMediaType = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      gradeLevel = formData.get('gradeLevel') || '3';
      subject = formData.get('subject') || 'Math';
      standard = formData.get('standard') || '';
      includeVersionB = formData.get('includeVersionB') === 'true';
      includeAnswerKey = formData.get('includeAnswerKey') === 'true';
      questionCount = formData.get('questionCount') || '8';
      customTitle = formData.get('customTitle') || '';
      apiKey = formData.get('apiKey') || '';
      url = '';
      pastedText = '';

      const file = formData.get('file');
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fileContent = buffer.toString('base64');
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) fileMediaType = 'application/pdf';
        else if (name.endsWith('.png')) fileMediaType = 'image/png';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) fileMediaType = 'image/jpeg';
        else if (name.endsWith('.gif')) fileMediaType = 'image/gif';
        else if (name.endsWith('.webp')) fileMediaType = 'image/webp';
        else fileMediaType = 'application/pdf';
      }
    } else {
      const body = await request.json();
      gradeLevel = body.gradeLevel || '3';
      subject = body.subject || 'Math';
      standard = body.standard || '';
      includeVersionB = body.includeVersionB || false;
      includeAnswerKey = body.includeAnswerKey || false;
      questionCount = body.questionCount || '8';
      customTitle = body.customTitle || '';
      url = body.url || '';
      pastedText = body.pastedText || '';
      apiKey = body.apiKey || '';
    }

    if (!apiKey) {
      return Response.json({ error: 'API key is required. Click the Settings button to add your Anthropic API key.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : 'Grade ' + gradeLevel;

    const gradeNum = gradeLevel === 'K' ? 0 : parseInt(gradeLevel) || 3;
    const isEarlyGrades = gradeNum <= 2;
    const isMidGrades = gradeNum >= 3 && gradeNum <= 5;
    const isUpperGrades = gradeNum >= 6;

    const visualModelGuide = subject === 'Math' ? `

VISUAL MODEL MARKERS — place on their own line immediately BEFORE the question number.

Allowed types (use ONLY these — never invent new types):
  [FRACTION: 3/4]                              simple fraction bar
  [FRACTION: 1 2/3]                            mixed number bar
  [FRAC_CIRCLE: 3/4]                           fraction circle (shaded sectors)
  [BASE10: hundreds=3 tens=4 ones=2]           base-10 blocks
  [PV_CHART: 342]                              place value chart
  [NUM_LINE: min=0 max=20 step=2]              number line
  [NUM_LINE: min=0 max=20 step=5 jumps=yes]   number line with hop arcs
  [BAR_MODEL: 4,6 | label=Total]              bar model (equal or unequal segments)
  [TAPE: 4:A,6:B | brace=yes | total=10]      tape diagram
  [GROUPS: groups=3 items=5]                   equal groups (ovals with dots inside)
  [ARRAY: rows=4 cols=6]                       dot array — discrete dots in a grid; equal items per row AND per column; ONLY for small numbers (factors ≤ 12); intro to multiplication (grades 2-3)
  [AREA_MODEL: collabels=20,3 | rowlabels=4]  filled rectangle (box method); shows dimension labels outside, partial products inside; for larger numbers, distributive property, grades 3-5
  [NUM_BOND: whole=10 part1=4 part2=6]         number bond (part-part-whole diagram)
  [NUM_BOND: whole=10 part1=4 part2=6 parts=hidden]  number bond with missing parts
  [TENS_FRAME: filled=7 total=10]              tens frame (2×5 grid with counters)
  [TENS_FRAME: filled=3 total=5]               five frame (1×5 grid with counters)
  [FUNC_TABLE: pairs=1:3,2:6,3:9,4:? | rule=×3]      function/input-output table

━━━ THE GOLDEN RULE ━━━
The visual marker defines what the student SEES. The question asks them to REASON about it.
The question text must NEVER repeat the marker values — the student should need to look at the visual.

HOW TO WRITE A QUESTION WITH A VISUAL (always this order):
  1. Decide the visual type and exact values → write the marker.
  2. Write a question that refers to the visual vaguely: "this array", "the number line",
     "these groups", "the model shown" — NOT the specific dimensions.
  3. Ask the student to figure out something FROM the visual.

CORRECT EXAMPLES:
  [ARRAY: rows=4 cols=7]
  3. The array shows ___ × ___.

  [AREA_MODEL: collabels=20,3 | rowlabels=4]
  4. Use the area model to find 4 × 23. Fill in the partial products.
  ___ + ___ = ___

  [NUM_LINE: min=0 max=30 step=5 jumps=yes]
  4. Which equation matches this number line?
  A) 5 × 5 = 25   B) 6 × 5 = 30   C) 5 × 6 = 25   D) 30 × 5 = 6

  [GROUPS: groups=3 items=6]
  5. Write a multiplication equation to represent these equal groups.

  [FRACTION: 3/8]
  6. What fraction of the bar is shaded? ___

  [NUM_BOND: whole=15 part1=8 part2=7]
  7. What is the missing part? Write the fact family for this number bond.

  [TENS_FRAME: filled=7 total=10]
  8. How many more counters are needed to fill the frame? ___

  [FUNC_TABLE: pairs=2:6,4:12,6:?,8:? | rule=×3]
  9. Complete the function table. What is the rule?

  [FRAC_CIRCLE: 2/5]
  10. What fraction of the circle is shaded? ___

WRONG EXAMPLES (never do this):
  [ARRAY: rows=4 cols=7]
  3. A 4-by-7 array is shown. What is 4 × 7?   ← restates dimensions ✗

  [GROUPS: groups=3 items=6]
  5. There are 3 groups of 6. What is 3 × 6?   ← gives away both factors ✗

━━━ CRITICAL: WHEN NOT TO ADD A VISUAL MARKER ━━━

🚫 NEVER place a visual marker before questions that ask the student to CREATE their own model:
  • "Use a model to represent..."
  • "Use a different model to represent..."
  • "Draw a picture to show..."
  • "Use any strategy to solve. Show your work."
  • "Show your thinking."
  These questions need BLANK WORK SPACE, not an AI-generated visual.
  The whole point is that the STUDENT draws the model.

🚫 NEVER add a visual marker to pure computation questions:
  • "420 ÷ 7 ="
  • "3 × 6 = ___"
  • "9/4 + 5/4 ="
  These just need work space to solve. No visual.

✅ ONLY use a visual marker when the question asks students to READ or INTERPRET a given model:
  • "The array shows ___ × ___."
  • "Which equation matches this number line?" (with MC choices)
  • "Which context could this model represent?" (with MC choices)
  • "What fraction of the bar is shaded?"
  • "Write the equation this bar model represents."

⚠️ ABSOLUTE RULE — MARKER TYPE MUST MATCH THE QUESTION'S OWN WORDS EXACTLY:
  If the question says "array" → the marker MUST be [ARRAY:...]. NEVER [NUM_LINE:] or any other type.
  If the question says "number line" → the marker MUST be [NUM_LINE:...]. NEVER [ARRAY:] or any other type.
  If the question says "equal groups" → MUST be [GROUPS:...].
  If the question says "number bond" → MUST be [NUM_BOND:...].
  If the question says "tens frame" or "five frame" → MUST be [TENS_FRAME:...].
  If the question says "fraction circle" → MUST be [FRAC_CIRCLE:...].
  If the question says "fraction bar" → MUST be [FRACTION:...].
  If the question says "function table" or "in/out table" → MUST be [FUNC_TABLE:...].
  If the question says "area model" or "box method" → MUST be [AREA_MODEL:...].
  WRONG: question says "array" but marker is [NUM_LINE:] ← this is always an error.
  WRONG: question says "number line" but marker is [ARRAY:] ← this is always an error.
  When in doubt: omit the marker entirely rather than use the wrong type.

⚠️ ARRAY DIMENSIONS MUST EXACTLY MATCH THE QUESTION'S MULTIPLICATION FACT:
  Read the question to find the multiplication fact, then set rows and cols accordingly.
  If the question involves 4 × 6 → use [ARRAY: rows=4 cols=6]. NOT rows=3 cols=5.
  If the question involves 3 × 7 → use [ARRAY: rows=3 cols=7]. NOT rows=4 cols=7.
  Each row shows one group. Each column position shows one item per group.
  The total number of dots (rows × cols) MUST equal the product in the question.
  Double-check: rows × cols = the answer to the multiplication. If they don't match, fix the marker.

⚠️ VISUAL MARKERS MUST BE REFERENCED IN THE QUESTION TEXT:
  If you place a [NUM_LINE:] marker, the question MUST say "this number line" or "the number line shown."
  If you place an [ARRAY:] marker, the question MUST say "this array" or "the array shown."
  NEVER add a marker to a question without the question text explicitly referencing that visual type.
  WRONG: [NUM_LINE: min=0 max=30 step=5] followed by "What is 6 × 5?" ← question never mentions the number line ✗
  CORRECT: [NUM_LINE: min=0 max=30 step=5] followed by "Which equation matches this number line?" ✓

If you cannot make the marker type and values exactly consistent with the question, omit the visual entirely rather than show a misleading one.
${isEarlyGrades ? 'Include a visual on most questions where a model is provided to the student.' : ''}
${isMidGrades ? 'Include visuals on questions where a model is provided to the student (fractions, arrays, number lines, bar models). Skip visuals on word problems and "show your work" questions.' : ''}
${isUpperGrades ? 'Include visuals only where a diagram genuinely helps clarify the problem structure.' : ''}
` : '';

    const systemPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES (CRITICAL — follow exactly):
1. Start with the assessment title on line 1${customTitle ? ` — use exactly this title: "${customTitle}"` : ' (e.g. "3.NBT.1 Place Value Check-In")'}
2. Optionally add a brief subtitle or directions line on line 2 (e.g. "Directions: Show your work.")
3. Number each main question: "1. Question text here"
4. For MULTIPLE CHOICE questions, list 4 options:
   A) option text
   B) option text
   C) option text
   D) option text
5. For OPEN RESPONSE questions, just write the question — no choices needed.
6. For FILL-IN-THE-BLANK questions, use ___ for each blank in the question text:
   Example: "The array shows ___ × ___."
   Example: "___ × ___ = ___"
7. For COMPUTATION questions (just an equation to solve), write it plainly:
   Example: "1.  420 ÷ 7 ="
   Example: "3 × 6 = ___"
8. For MULTI-PART questions, use sub-labels:
   Example:
   5. Solve the word problem. Show your work.
   a) How many total?
   b) Write an equation to represent the problem.
9. For SECTION HEADERS or direction lines (not numbered questions), write them on their own line:
   Example: "Part A: Word Problems"
   Example: "Use any strategy to solve. Show your work."
   Example: "Solve the equations below."
10. Add the standard tag on its own line after the question: [3.NBT.A.1]
11. Do NOT use asterisks, markdown, bold, or special formatting.
12. Keep language ${isEarlyGrades ? 'very simple and concrete — short sentences, familiar vocabulary' : isMidGrades ? 'clear and grade-appropriate' : 'precise and academic'}.
${visualModelGuide}

QUESTION QUALITY GUIDELINES:
- Write exactly ${questionCount} questions for Version A
- Mix question types naturally: fill-in-the-blank, MC, open response, computation, word problems
- Questions should progress from basic recall → application → reasoning
- ${isEarlyGrades ? 'Use simple story contexts, picture-based questions, and short fill-in-the-blank' : 'Use real-world contexts and mix of question formats'}
- ${standard ? 'Focus specifically on standard: ' + standard : 'Cover the key concepts from the uploaded content'}
- Each question tests ONE clear skill

${includeVersionB ? `After all Version A questions, write "VERSION B" on its own line, then write ${questionCount} alternate questions testing the same skills with different numbers/contexts.` : ''}

${includeAnswerKey ? `After all questions, write "TEACHER ANSWER KEY" on its own line, then list:
- For MC: "1. C — explanation of why"
- For fill-in-the-blank: "2. 4 × 7 = 28"
- For open response: "3. [Sample answer] — scoring note"
- Include notes on common misconceptions to watch for` : ''}`;

    let userContent;
    let activeSystemPrompt = systemPrompt;

    if (fileContent) {
      const isImageFile = ['image/png','image/jpeg','image/gif','image/webp'].includes(fileMediaType);

      // For file uploads use a completely separate system prompt focused on
      // faithful transcription — NOT creative generation.
      activeSystemPrompt = `You are a PARALLEL FORM GENERATOR. Your ONLY job is to reproduce the uploaded assessment almost word-for-word, swapping numbers and minor contexts. You are NOT writing a new assessment from scratch. You are making a parallel version.

━━━ TRANSCRIPTION RULES ━━━

RULE 1 — SAME NUMBER OF QUESTIONS, SAME ORDER.
Count the questions in the source. Output exactly that many, in the same order. Do not add or remove any.

RULE 2 — COPY EVERY QUESTION ALMOST WORD FOR WORD.
Change ONLY these things:
  • Specific numbers (e.g., 420 → 560)
  • Specific proper names in word problems (e.g., "Maria" → "James")
  • Specific objects/contexts in word problems (e.g., "apples" → "books")
  • Answer choices — recalculate to match the new numbers
Do NOT change: question wording, question structure, blank layout, sub-parts (a/b/c), skill being assessed.

RULE 3 — COPY SECTION HEADERS AND DIRECTION LINES EXACTLY.
  "Part A: Word Problems" → copy it exactly
  "Use any strategy to solve. Show your work." → copy it exactly
  "Directions: Circle the correct answer." → copy it exactly
  These are NOT questions. They go on their own line, no number.

RULE 4 — COPY QUESTION FORMAT EXACTLY.
  Source: "The array shows ___ × ___."     → Output: "The array shows ___ × ___."   (keep blanks)
  Source: "420 ÷ 7 ="                      → Output: "560 ÷ 8 ="                    (keep format)
  Source: MC with 4 options (A B C D)      → Output: MC with 4 options (A B C D)
  Source: sub-parts a) b) c)               → Output: sub-parts a) b) c)
  Source: open response / show work        → Output: open response / show work
  Source: fill-in-the-blank               → Output: fill-in-the-blank (same blank positions)

RULE 5 — COPY VISUAL TYPES. NEVER SWAP THEM.
  Source has an array → output gets an array [ARRAY: rows=R cols=C]
  Source has a number line → output gets a number line [NUM_LINE: ...]
  Source has a tens frame → output gets a tens frame [TENS_FRAME: ...]
  Source has a fraction bar → output gets [FRACTION: N/D]
  Source has equal groups → output gets [GROUPS: ...]
  Source has a number bond → output gets [NUM_BOND: ...]
  Source has a function table → output gets [FUNC_TABLE: ...]
  NEVER replace an array with a number line or any other type.

RULE 5a — ARRAY DIMENSIONS MUST MATCH THE MULTIPLICATION FACT IN THE QUESTION.
  Read the swapped question to find the multiplication fact, then set rows × cols accordingly.
  If new question involves 4 × 6 → [ARRAY: rows=4 cols=6]. Verify: 4 × 6 = 24 dots. ✓
  If new question involves 3 × 8 → [ARRAY: rows=3 cols=8]. Verify: 3 × 8 = 24 dots. ✓
  rows × cols MUST equal the product in the question. Double-check before writing the marker.

RULE 5b — QUESTION TEXT MUST REFERENCE THE VISUAL TYPE.
  If you place a [NUM_LINE:] marker, the question MUST say "this number line" or "the number line shown."
  If you place an [ARRAY:] marker, the question MUST say "this array" or "the array shown."
  WRONG: [NUM_LINE: ...] before "What is 6 × 5?" — question never mentions a number line ✗
  CORRECT: [NUM_LINE: ...] before "Which equation matches this number line?" ✓

RULE 6 — NEVER ADD VISUALS WHERE SOURCE HAS NONE.
  If the source question has no pre-drawn model, the output gets no visual marker.
  • "Use a model to represent..." → NO marker (student draws it — blank work space only)
  • "Use any strategy. Show your work." → NO marker
  • "420 ÷ 7 =" → NO marker (pure computation)

RULE 7 — VISUAL MARKER FORMAT.
Place the marker on its own line immediately BEFORE the question number.
Question text must NOT restate the marker values — say "this array", "the model shown".
Available markers:
  [ARRAY: rows=R cols=C]
  [AREA_MODEL: collabels=20,3 | rowlabels=4]
  [NUM_LINE: min=0 max=M step=S]
  [NUM_LINE: min=0 max=M step=S jumps=yes]
  [GROUPS: groups=G items=I]
  [FRACTION: N/D]
  [FRAC_CIRCLE: N/D]
  [BAR_MODEL: v1,v2,v3]
  [TAPE: v1:label,v2:label | brace=yes | total=X]
  [BASE10: hundreds=H tens=T ones=O]
  [PV_CHART: number]
  [NUM_BOND: whole=W part1=P1 part2=P2]
  [TENS_FRAME: filled=F total=10]
  [FUNC_TABLE: pairs=1:3,2:6,3:? | rule=×3]

RULE 8 — OUTPUT FORMAT.
  Line 1: Assessment title${customTitle ? ` — use exactly: "${customTitle}"` : ' (same as source or close parallel)'}
  Line 2: Directions/subtitle (same as source)
  Then: questions numbered exactly as in source
  Answer choices: A) B) C) D) format
  Sub-parts: a) b) c) format
  Standard tags: [3.OA.A.1] on their own line after a question
  No asterisks, no markdown, no bold text.
${includeVersionB ? `\nAfter all questions, write "VERSION B" on its own line, then repeat the same structure with a second set of swapped numbers/contexts.` : ''}
${includeAnswerKey ? `\nAfter all questions, write "TEACHER ANSWER KEY" on its own line, then list answers: "1. C — explanation" for MC, computed value for fill-in-blank, sample answer for open response.` : ''}
${standard ? `\nAlign to standard: ${standard}` : ''}`;

      userContent = [
        {
          type: 'text',
          text: `Here is the source assessment. Read every question carefully. Then reproduce it following the transcription rules — same structure, same wording, same format — with only the numbers and minor contexts changed.`
        },
        {
          type: isImageFile ? 'image' : 'document',
          source: { type: 'base64', media_type: fileMediaType, data: fileContent }
        }
      ];
    } else if (url) {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the lesson content at this URL: ${url}`;
    } else if (pastedText) {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on this content:\n\n${pastedText}`;
    } else {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''}. Generate ${questionCount} questions covering the most important skills for this grade level and subject.`;
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: activeSystemPrompt,
      messages: [{ role: 'user', content: userContent }]
    });

    const rawResult = response.content[0].text;
    const result = fixMarkerTypeMismatches(rawResult);
    return Response.json({ result });

  } catch (error) {
    console.error('Assessment generation error:', error);
    const message = error.message || 'Unknown error occurred';
    if (message.includes('credit') || message.includes('balance')) {
      return Response.json({ error: 'Your Anthropic API credit balance is too low. Please go to console.anthropic.com → Billing to add credits.' }, { status: 402 });
    }
    if (message.includes('API key') || message.includes('auth') || message.includes('401')) {
      return Response.json({ error: 'Invalid API key. Please check your key in Settings.' }, { status: 401 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
