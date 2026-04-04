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

    // ─── PASS 1: Generate clean question text, NO visual markers ───────────────
    const systemPromptPass1 = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

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

VISUAL REFERENCES — when a question involves a visual model, describe it completely in the question text itself:
- Instead of relying on a diagram, write the numbers directly into the question.
- Example: "Look at an array with 4 rows and 6 columns." — NOT just "Look at the array below."
- Example: "Use a number line that counts by 5s from 0 to 30." — NOT just "Use the number line."
- Example: "There are 3 groups with 7 items in each group." — NOT just "Use the groups shown."
- Every number a student needs to answer the question must appear in the question text.
- Do NOT include any visual marker tags like [ARRAY:], [NUM_LINE:], [GROUPS:], etc. Those will be added automatically in a separate step.

QUESTION QUALITY GUIDELINES:
- Write exactly ${questionCount} questions for Version A
- Mix question types: ${isEarlyGrades ? 'mostly open response, some MC' : 'mix of MC and open response'}
- Questions should progress from basic recall → application → reasoning
- ${isEarlyGrades ? 'Use simple story contexts (e.g. "Sam has 5 apples...") and avoid abstract notation' : 'Use real-world contexts when possible'}
- ${standard ? 'Focus specifically on standard: ' + standard : 'Cover the key concepts from the uploaded content'}
- Each question tests ONE clear skill

${includeVersionB ? `After all Version A questions, write "VERSION B" on its own line, then write ${questionCount} alternate questions testing the same skills with different numbers/contexts.` : ''}

${includeAnswerKey ? `After all questions, write "TEACHER ANSWER KEY" on its own line, then list:
- For MC: "1. C — explanation of why"
- For open response: "2. [Sample answer] — scoring note"
- Include brief notes on common misconceptions to watch for` : ''}`;

    let userContentPass1;

    if (fileContent) {
      const isImageFile = ['image/png','image/jpeg','image/gif','image/webp'].includes(fileMediaType);
      userContentPass1 = [
        {
          type: 'text',
          text: `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the content in this file.

Carefully examine the document and identify the key concepts and skills being assessed. For any question that involves a visual (array, number line, groups, fraction, place value, etc.), write the exact numbers into the question text so the question is fully self-contained.

For example:
- If the source shows a 4×6 array, write: "Look at an array with 4 rows and 6 columns."
- If the source shows a number line counting by 3s to 24, write: "Use a number line that counts by 3s from 0 to 24."
- If the source shows 2 groups of 5, write: "There are 2 groups with 5 items in each group."

Do NOT include any marker tags like [ARRAY:] or [NUM_LINE:] in your output. Those are added automatically.`
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
      userContentPass1 = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the lesson content at this URL: ${url}

For any question involving a visual, write the exact numbers into the question text so it is self-contained. Do not include any visual marker tags.`;
    } else if (pastedText) {
      userContentPass1 = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on this content:

${pastedText}

For any question involving a visual, write the exact numbers into the question text so it is self-contained. Do not include any visual marker tags.`;
    } else {
      userContentPass1 = `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''}.

Generate ${questionCount} questions that assess the most important skills for this grade level and subject. For any question involving a visual, write the exact numbers into the question text. Do not include any visual marker tags.`;
    }

    const pass1Response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: systemPromptPass1,
      messages: [{ role: 'user', content: userContentPass1 }]
    });

    const assessmentText = pass1Response.content[0].text;

    // ─── PASS 2: Inject visual markers derived from question text ──────────────
    // Only run pass 2 for Math assessments
    if (subject !== 'Math') {
      return Response.json({ result: assessmentText });
    }

    const systemPromptPass2 = `You are a visual marker injector for elementary math assessments.

You receive a complete assessment and return it with visual model markers inserted before questions that reference specific math visuals. You do NOT change any question text, answer choices, titles, subtitles, standard tags, or any other content — you ONLY insert marker lines.

ALLOWED MARKER TYPES (use only these — do not invent new types):
[FRACTION: N/D]                              simple fraction
[FRACTION: W N/D]                            mixed number (whole, space, fraction)
[BASE10: hundreds=H tens=T ones=O]           base-10 blocks
[PV_CHART: NNN]                              place value chart for number NNN
[NUM_LINE: min=A max=B step=S]               number line
[NUM_LINE: min=A max=B step=S jumps=yes]     number line with hop arcs
[BAR_MODEL: N,M | label=text]               bar model
[TAPE: N:A,M:B | brace=yes | total=T]       tape diagram
[GROUPS: groups=N items=M]                   equal groups
[ARRAY: rows=R cols=C]                       dot array

WHEN to insert a marker — look for these exact phrases in the question text:
- "array" or "rows and columns" → ARRAY
- "number line" → NUM_LINE
- "groups" and "items" or "groups of N" → GROUPS
- "fraction" with a specific fraction like 3/4 → FRACTION
- "fraction bar" or "shaded" parts → FRACTION
- "base-10 blocks" → BASE10
- "place value chart" → PV_CHART

HOW to extract values — use ONLY numbers already written in the question text:
- "4 rows and 6 columns" → [ARRAY: rows=4 cols=6]
- "4 rows of 6" → [ARRAY: rows=4 cols=6]
- "factor 4 … 4 × 7 array" → [ARRAY: rows=4 cols=7]
- "counts by 5s from 0 to 30" → [NUM_LINE: min=0 max=30 step=5 jumps=yes]
- "skip count by 3s to 24" → [NUM_LINE: min=0 max=24 step=3 jumps=yes]
- "3 groups of 7" or "3 groups with 7 items" → [GROUPS: groups=3 items=7]
- "the fraction 3/4" or "3/4 of the bar" → [FRACTION: 3/4]
- "1 and 2/3" or "1 2/3" → [FRACTION: 1 2/3]
- "the number 342 … base-10 blocks" → [BASE10: hundreds=3 tens=4 ones=2]
- "place value chart … 508" → [PV_CHART: 508]

PLACEMENT: insert the marker on its own line immediately BEFORE the line that starts with the question number (e.g., before "3. ").

DO NOT insert a marker if:
- The question does not explicitly name a visual type (array, number line, groups, fraction bar, etc.)
- You cannot find the exact numeric values in the question text
- The values are ambiguous or missing

Return the COMPLETE assessment text. Only add marker lines — change nothing else.`;

    const pass2Response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 5000,
      system: systemPromptPass2,
      messages: [{ role: 'user', content: assessmentText }]
    });

    const result = pass2Response.content[0].text;
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
