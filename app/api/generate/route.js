import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    let gradeLevel, subject, standard, includeVersionB, includeAnswerKey, questionCount, url, pastedText, apiKey;
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

VISUAL MODELS — Include these markers INLINE in questions where a visual would help:

For NUMBER SENSE / PLACE VALUE questions:
  [BASE10: hundreds=1 tens=2 ones=3]   ← shows base-10 blocks
  [PV_CHART: 342]                       ← shows a place value chart

For ADDITION / SUBTRACTION / PART-WHOLE:
  [BAR_MODEL: 4,6 | label=How many in all?]      ← colored bar segments
  [TAPE: 4:Group A,6:Group B | brace=yes | total=10]  ← tape diagram with brace

For COUNTING / NUMBER LINES:
  [NUM_LINE: min=0 max=20 step=2 | label=Count by 2s]

For FRACTIONS:
  [FRACTION: 3/4]                       ← fraction bar model (simple fraction)
  [FRACTION: 1 2/3]                     ← mixed number bar model (whole + fraction)

For FRACTION ADDITION (mixed numbers), place TWO fraction markers on separate lines before the question:
  [FRACTION: 1 2/4]
  [FRACTION: 2 1/4]
  What is 1 2/4 + 2 1/4?

WHEN TO USE VISUAL MODELS:
${isEarlyGrades ? `- Use visuals on MOST questions for K-2 (counting, adding, comparing, place value)
- Show base-10 blocks for 2-digit numbers
- Use number lines for counting on/back
- Use bar models for simple addition/subtraction stories` : ''}
${isMidGrades ? `- Use visuals on 30-50% of questions for grades 3-5
- Place value charts for multi-digit numbers
- Tape/bar diagrams for multiplication, fractions, ratios
- Number lines for fractions and decimals` : ''}
${isUpperGrades ? `- Use visuals selectively for grades 6+ (geometry, ratios, graphs)
- Focus visuals on problems where a diagram is essential to understand` : ''}
` : '';

    const systemPrompt = `You are an expert ${gradeDisplay} ${subject} teacher creating a high-quality formative assessment.

FORMAT RULES (CRITICAL — follow exactly):
1. Start with the assessment title on line 1 (e.g. "3.NBT.1 Place Value Check-In")
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
      userContent = [
        {
          type: 'text',
          text: `Create a ${gradeDisplay} ${subject} assessment${standard ? ' aligned to ' + standard : ''} based on the content in this file. Use the content to determine what concepts to assess.`
        },
        {
          type: 'document',
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
