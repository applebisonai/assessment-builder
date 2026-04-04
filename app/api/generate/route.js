import Anthropic from '@anthropic-ai/sdk';

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

MARKER TYPE MUST MATCH QUESTION WORDS:
  • Question says "array" or "rows and columns" with small factors (≤12) → marker must be ARRAY (discrete dots)
  • Question says "area model", "box method", "partial products", or involves 2-digit multiplication → marker must be AREA_MODEL with collabels and rowlabels showing the decomposed factors
  • Question says "number line" → marker must be NUM_LINE
  • Question says "equal groups" → marker must be GROUPS
  • Question says "fraction bar" / "fraction strip" / "shaded bar" → marker must be FRACTION
  • Question says "fraction circle" / "shaded circle" → marker must be FRAC_CIRCLE
  • Question says "number bond" / "part-part-whole" → marker must be NUM_BOND
  • Question says "tens frame" / "five frame" / "frame" with counters → marker must be TENS_FRAME
  • Question says "function table" / "input-output table" / "in/out table" → marker must be FUNC_TABLE
  • NEVER show a number line for an array question or vice versa.

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

    if (fileContent) {
      const isImageFile = ['image/png','image/jpeg','image/gif','image/webp'].includes(fileMediaType);
      userContent = [
        {
          type: 'text',
          text: `Create a parallel ${gradeDisplay} ${subject} assessment based on the source document attached.

YOUR ONLY JOB: Mirror the source as closely as possible — same question types, same skill sequence, same wording structure — but with different numbers and contexts. Do NOT rewrite from scratch.

━━━ WHAT TO PRESERVE FROM THE SOURCE ━━━

1. QUESTION FORMAT: Keep the exact format of each question.
   • If source has fill-in-the-blank ("The array shows ___ × ___"), keep the blanks.
   • If source has computation ("420 ÷ 7 ="), keep that format — just change the numbers.
   • If source has MC with 4 options, keep MC. If open response, keep open response.
   • If source has sub-parts (a, b, c), keep the sub-parts.

2. SECTION HEADERS AND DIRECTIONS: Preserve direction lines and section headers.
   • If source has "Part A: Word Problems" → keep that section header.
   • If source has "Use any strategy to solve. Show your work." → keep that direction.
   • If source has "Solve the equations below." → keep that direction.

3. QUESTION STRUCTURE: Keep the same cognitive demand.
   • Interpretation question ("What does this model show?") → keep interpretation question.
   • Word problem → keep word problem (just change names, numbers, context).
   • Computation problem → keep computation (just change the numbers).
   • Conceptual question ("What does the factor ___ tell you?") → keep that question type.

━━━ THE MOST IMPORTANT RULE ABOUT VISUALS ━━━

🚫 NEVER add a visual marker to questions where the STUDENT creates the model:
   • "Use a model to represent..." → NO marker (student draws it)
   • "Use a different model to..." → NO marker (student draws it)
   • "Use any strategy. Show your work." → NO marker
   • "Draw a picture to show..." → NO marker
   These MUST have blank work space. The teacher uses the Add Image button separately.

🚫 NEVER add a visual marker to pure computation questions:
   • "420 ÷ 7 =" → NO marker (just change to a new computation problem)
   • "3 × 6 = ___" → NO marker

✅ ONLY add a visual marker when the SOURCE shows a pre-drawn model that students read/interpret:
   • Source shows a dot array (discrete items in rows/columns) → use [ARRAY: rows=R cols=C]
   • Source shows a filled rectangle model (area, partial products) → use [AREA_MODEL: rows=R cols=C]
   • Source shows a number line → students pick which equation matches → use [NUM_LINE: ...]
   • Source shows equal groups → students pick which context it represents → use [GROUPS: ...]
   • Source shows a bar model with equal segments → use [BAR_MODEL: ...]
   • Source shows a fraction bar / strip → use [FRACTION: N/D]
   • Source shows a fraction circle / pie → use [FRAC_CIRCLE: N/D]
   • Source shows a number bond / part-part-whole → use [NUM_BOND: whole=W part1=P1 part2=P2]
   • Source shows a tens frame or five frame → use [TENS_FRAME: filled=F total=10]
   • Source shows an input-output / function table → use [FUNC_TABLE: pairs=...]
   For anything else (photos of objects, complex diagrams), SKIP IT entirely.

━━━ VISUAL MARKER RULES (when you do use one) ━━━
  [ARRAY: rows=R cols=C]               dot array — individual circles, equal items per row and per column; small factors only
  [AREA_MODEL: collabels=20,3 | rowlabels=4]  filled rectangle (box method) with dimension labels and partial products
  [NUM_LINE: min=0 max=M step=S jumps=yes]  number line with hop arcs
  [GROUPS: groups=G items=I]           equal groups (ovals with dots)
  [FRACTION: N/D]                      fraction bar
  [FRAC_CIRCLE: N/D]                   fraction circle (shaded sectors)
  [BAR_MODEL: 4,4,4,4,4,4]           equal segment bar model
  [BASE10: hundreds=H tens=T ones=O]  base-10 blocks
  [NUM_BOND: whole=W part1=P1 part2=P2]  number bond / part-part-whole
  [TENS_FRAME: filled=F total=10]      tens frame with counters
  [FUNC_TABLE: pairs=1:3,2:6,3:? | rule=×3]  function/input-output table

Rules:
  • Write the marker on its own line BEFORE the question number.
  • Question text must NOT state the marker dimensions. Say "this array" or "the model", not "a 4×6 array".
  • If you are not 100% certain the marker matches the question exactly, leave it out.

━━━ WHAT NOT TO DO ━━━
  ✗ Don't add visuals to word problems or "show your work" questions
  ✗ Don't change the question type (MC → open, computation → word problem)
  ✗ Don't skip questions that require photos or complex diagrams — just omit the visual and keep the text
  ✗ Don't restate marker values in the question text

${standard ? 'Align to standard: ' + standard : ''}`
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
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    });

    const result = response.content[0].text;
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
