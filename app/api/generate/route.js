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
  [BASE10: hundreds=3 tens=4 ones=2]           base-10 blocks
  [PV_CHART: 342]                              place value chart
  [NUM_LINE: min=0 max=20 step=2]              number line
  [NUM_LINE: min=0 max=20 step=5 jumps=yes]   number line with hop arcs
  [BAR_MODEL: 4,6 | label=Total]              bar model
  [TAPE: 4:A,6:B | brace=yes | total=10]      tape diagram
  [GROUPS: groups=3 items=5]                   equal groups (circles with dots)
  [ARRAY: rows=4 cols=6]                       rectangular array of tiles

━━━ THE GOLDEN RULE ━━━
The visual marker and the question text serve DIFFERENT jobs:
  • The MARKER defines what the student sees (the exact numbers/dimensions).
  • The QUESTION asks the student to reason about what they see.
The question text must NEVER repeat the values already shown in the marker.
The student should need to look at the visual to know those values.

HOW TO WRITE A QUESTION WITH A VISUAL — always in this order:
  1. Decide the visual type and exact values → write the marker.
  2. Write a question that refers to the visual vaguely: "this array", "the number line", "these groups", "the model shown" — NOT the specific dimensions.
  3. Ask the student to figure out something FROM the visual.

CORRECT — the question does NOT reveal the marker values:
  [ARRAY: rows=4 cols=7]
  Write a multiplication equation for this array.

  [NUM_LINE: min=0 max=30 step=5 jumps=yes]
  What number does the last jump land on?

  [GROUPS: groups=3 items=6]
  Write a multiplication equation to represent these equal groups.

  [FRACTION: 3/8]
  What fraction of the bar is shaded?

WRONG — the question repeats or reveals the marker values:
  [ARRAY: rows=4 cols=7]
  A 4-by-7 array is shown. What is 4 × 7?   ← restates dimensions, gives away answer ✗

  [NUM_LINE: min=0 max=30 step=5 jumps=yes]
  A number line counts by 5s to 30. What number comes after 25?  ← reveals all values ✗

  [GROUPS: groups=3 items=6]
  There are 3 groups of 6. What is 3 × 6?  ← restates both factors ✗

MARKER TYPE MUST MATCH QUESTION WORDS:
  • Question says "array" → marker must be ARRAY
  • Question says "number line" → marker must be NUM_LINE
  • Question says "groups" → marker must be GROUPS
  • Question says "fraction bar" / "shaded" → marker must be FRACTION
  • NEVER show a number line for an array question or vice versa.

If the marker type or values can't be made consistent with the question, omit the visual entirely.
${isEarlyGrades ? 'Include a visual on every question.' : ''}
${isMidGrades ? 'Include visuals on questions about fractions, multiplication, arrays, number lines, and place value.' : ''}
${isUpperGrades ? 'Include visuals where a diagram genuinely helps clarify the problem.' : ''}
` : '';

    const systemPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES (CRITICAL — follow exactly):
1. Start with the assessment title on line 1${customTitle ? ` — use exactly this title: "${customTitle}"` : ' (e.g. "3.NBT.1 Place Value Check-In")'}
2. Optionally add a brief subtitle on line 2
3. Number each question: "1. Question text here"
4. For MULTIPLE CHOICE questions, list 4 options:
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
- Mix question types: ${isEarlyGrades ? 'mostly open response, some MC' : 'mix of MC and open response'}
- Questions should progress from basic recall → application → reasoning
- ${isEarlyGrades ? 'Use simple story contexts and avoid abstract notation' : 'Use real-world contexts when possible'}
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

Examine every visual in the document (arrays, number lines, fraction bars, base-10 blocks, groups, etc.). For each question involving a visual:
1. Write the marker FIRST with the correct type and values.
2. Then write the question text — refer to it as "this array", "the number line", "these groups", etc. Do NOT restate the dimensions or values in the question text.

The student must look at the visual to get the numbers. The question text alone should not give the answer away.`
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
