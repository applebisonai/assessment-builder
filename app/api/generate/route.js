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

    // Determine grade band for age-appropriate instructions
    const gradeNum = gradeLevel === 'K' ? 0 : parseInt(gradeLevel) || 3;
    const isEarlyGrades = gradeNum <= 2;
    const isMidGrades = gradeNum >= 3 && gradeNum <= 5;
    const isUpperGrades = gradeNum >= 6;

    // Grade-appropriate visual model guidance
    const visualModelGuide = subject === 'Math' ? `

VISUAL MODELS — place these markers on their OWN LINE immediately before the question they belong to.

⚠️ CRITICAL: You may ONLY use these exact 8 marker types. Do NOT invent new types.
Allowed types: FRACTION, BASE10, NUM_LINE, PV_CHART, BAR_MODEL, TAPE, GROUPS, ARRAY

For NUMBER SENSE / PLACE VALUE questions:
  [BASE10: hundreds=1 tens=2 ones=3]   ← shows base-10 blocks
  [PV_CHART: 342]                       ← shows a place value chart

For ADDITION / SUBTRACTION / PART-WHOLE:
  [BAR_MODEL: 4,6 | label=How many in all?]      ← colored bar segments
  [TAPE: 4:Group A,6:Group B | brace=yes | total=10]  ← tape diagram with brace

For COUNTING / NUMBER LINES:
  [NUM_LINE: min=0 max=20 step=2 | label=Count by 2s]
  [NUM_LINE: min=0 max=20 step=5 jumps=yes]      ← adds hop arcs for skip counting

For MULTIPLICATION / DIVISION — EQUAL GROUPS:
  [GROUPS: groups=3 items=5]            ← 3 circles each containing 5 dots (use for "groups of" problems)
  [ARRAY: rows=3 cols=5]                ← 3×5 dot array (use for array/area model problems)

For FRACTIONS — ALWAYS include numerator/denominator with a slash. NEVER write just a whole number like [FRACTION: 7]:
  [FRACTION: 3/4]                       ← simple fraction (numerator/denominator, slash required)
  [FRACTION: 1 2/3]                     ← mixed number (whole SPACE numerator/denominator, slash required)

For FRACTION ADDITION (mixed numbers), place TWO fraction markers on separate lines before the question:
  [FRACTION: 1 2/4]
  [FRACTION: 2 1/4]
  What is 1 2/4 + 2 1/4?

CRITICAL — THE VISUAL TYPE AND VALUES MUST BOTH MATCH THE QUESTION:
The question text must match the visual in TWO ways: (1) the TYPE of visual shown, and (2) the exact numbers used. A student should be able to look at the visual and answer the question using only what they see.

RULE 1 — MATCH THE TYPE:
- If the question says "number line" → use NUM_LINE (never ARRAY, never GROUPS)
- If the question says "array" → use ARRAY (never NUM_LINE, never GROUPS)
- If the question says "groups" or "groups of" → use GROUPS (never ARRAY)
- If the question says "fraction bar" or "shaded" → use FRACTION
- If the question says "place value chart" → use PV_CHART
- If the question says "base-10 blocks" → use BASE10
- NEVER show a number line for a question about arrays. NEVER show an array for a question about a number line.

RULE 2 — MATCH THE VALUES:
Every specific number the question asks about must appear in the visual marker spec.

CORRECT examples:
  [NUM_LINE: min=0 max=30 step=5 jumps=yes]
  Use the number line to skip count by 5s. What number comes after 25?  ← number line for a number line question ✓

  [ARRAY: rows=4 cols=6]
  What does the factor 4 tell you about this array?  ← array for array question, 4 is in the spec ✓

  [GROUPS: groups=5 items=3]
  There are 5 groups. How many items are in each group?  ← groups visual for groups question ✓

WRONG examples (never do this):
  [ARRAY: rows=3 cols=5]
  Use the number line to find the missing number.  ← array shown but question asks for number line ✗

  [NUM_LINE: min=0 max=20 step=4]
  What does the factor 4 tell you about this array?  ← number line shown but question asks about an array ✗

  [ARRAY: rows=3 cols=4]
  What does the factor 5 tell you about this array?  ← correct type but wrong values ✗

FINAL RULE: If you cannot find a visual that matches both the type AND the values in the question, do not include a visual at all. A missing visual is better than a wrong one.

CRITICAL — WHEN TO USE VISUAL MODELS:
- If the uploaded document contains visual representations (fraction bars, number lines, base-10 blocks, bar models, place value charts, tape diagrams), you MUST include the matching visual model marker on EVERY question that tests the same concept. Match the visual style of the source document.
- Do NOT skip visuals for questions about fractions, place value, number lines, or part-whole relationships if those visuals appear in the source.
${isEarlyGrades ? `- K-2: include a visual on EVERY question` : ''}
${isMidGrades ? `- Grades 3-5: include a visual on every question involving fractions, place value, number lines, or part-whole relationships` : ''}
${isUpperGrades ? `- Grades 6+: include visuals wherever a diagram clarifies the problem` : ''}
` : '';

    const systemPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES (CRITICAL — follow exactly):
1. Start with the assessment title on line 1${customTitle ? ` — use exactly this title: "${customTitle}"` : ' (e.g. "3.NBT.1 Place Value Check-In")'}
2. Optionally add a brief subtitle on line 2 (e.g. "Understanding hundreds, tens, and ones")
3. Number each question: "1. Question text here"
4. For MULTIPLE CHOICE questions, list 4 options with capital letters:
   A) option text
   B) option text
   C) option text
   D) option text
5. For OPEN RESPONSE questions, just write the question — no choices.
6. Add the standard tag on its own line after the question: [3.NBT.A.1]
7. Do NOT use asterisks, markdown, bold, or special formatting.
8. Keep language ${isEarlyGrades ? 'very simple and concrete — short sentences, familiar vocabulary' : isMidGrades ? 'clear and grade-appropriate' : 'precise and academic'}.
${visualModelGuide}

QUESTION QUALITY GUIDELINES:
- Write exactly ${questionCount} questions for Version A
- Mix question types: ${isEarlyGrades ? 'mostly open response with visuals, some MC' : 'mix of MC and open response'}
- Questions should progress from basic recall → application → reasoning
- ${isEarlyGrades ? 'Use simple story contexts (e.g. "Sam has 5 apples...") and avoid abstract notation' : 'Use real-world contexts when possible'}
- ${standard ? 'Focus specifically on standard: ' + standard : 'Cover the key concepts from the uploaded content'}
- Each question tests ONE clear skill

${includeVersionB ? `After all Version A questions, write "VERSION B" on its own line, then write ${questionCount} alternate questions testing the same skills with different numbers/contexts.` : ''}

${includeAnswerKey ? `After all questions, write "TEACHER ANSWER KEY" on its own line, then list:
- For MC: "1. C — explanation of why"
- For open response: "2. [Sample answer] — scoring note"
- Include brief notes on common misconceptions to watch for` : ''}`;

    let userContent;

    if (fileContent) {
      const isImageFile = ['image/png','image/jpeg','image/gif','image/webp'].includes(fileMediaType);
      userContent = [
        {
          type: 'text',
          text: `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the content in this file.

STEP 1 — Carefully examine every visual in the document: fraction strips, number lines, base-10 blocks, bar models, place value charts, tape diagrams, and any other math representations.

STEP 2 — For every question you write that tests a concept shown visually in the document, place the matching visual model marker on its own line immediately before that question. Use the exact same representation type as the source (e.g. if the source shows fraction strips, use [FRACTION:]; if it shows base-10 blocks, use [BASE10:]). CRITICAL: the marker must use the EXACT values from that specific question — if the question is about 3/4, write [FRACTION: 3/4]; if it's about the number 205, write [BASE10: hundreds=2 tens=0 ones=5]; if the number line counts by 2s to 20, write [NUM_LINE: min=0 max=20 step=2]. Never use placeholder or generic values.

STEP 3 — Do not skip visuals. If the source document is heavy with visuals, your assessment should match that density.`
        },
        {
          type: isImageFile ? 'image' : 'document',
          source: {
            type: 'base64',
            media_type: fileMediaType,
            data: fileContent
          }
        }
      ];
    } else if (url) {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the lesson content at this URL: ${url}

Analyze the key concepts covered and create questions that assess student understanding of those concepts.`;
    } else if (pastedText) {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on this content:

${pastedText}

Analyze the key concepts and create questions that assess student understanding.`;
    } else {
      userContent = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''}.

Generate ${questionCount} questions that assess the most important skills for this grade level and subject. Include a variety of question types and difficulty levels.`;
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
