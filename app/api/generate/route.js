import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) return Response.json({ error: 'Missing API key. Add your Anthropic API key in Settings.' }, { status: 401 });

    const { content, contentType, gradeLevel, subject, standard, includeVersionB, includeAnswerKey, imageBase64, fileType } = await request.json();

    const client = new Anthropic({ apiKey });

    let extractedText = content;

    if (imageBase64) {
      const isPDF = fileType === 'application/pdf';
      const mediaType = isPDF ? 'application/pdf' : (fileType && fileType.startsWith('image/') ? fileType : 'image/png');
      const blockType = isPDF ? 'document' : 'image';

      const visionResp = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: blockType, source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: 'Please extract ALL text from this document exactly as it appears. Include every question, answer choice, instruction, and label. Format it clearly with question numbers preserved.' }
          ]
        }]
      });
      extractedText = visionResp.content[0].text;
    }

    const standardNote = standard
      ? ('Standard: ' + standard)
      : ('Identify the appropriate CCSS standard(s) for grade ' + gradeLevel + ' ' + subject);

    const gradeName = gradeLevel === 'K' ? 'Kindergarten' : ('Grade ' + gradeLevel);

    const versionBBlock = includeVersionB
      ? '\n=============================================\nVERSION B -- ALTERNATE ASSESSMENT\n(Same Standards | Different Context & Numbers | Questions Reordered)\n=============================================\n\nName: _________________________________ Date: _____________ Class: _______________\n\nDirections: Solve each problem. Show your work in the space provided.\n\n[reordered questions with DIFFERENT names, contexts, and numbers but same question types and skill difficulty -- every Version A question must have a parallel Version B question]\n\n--------------------------------------------\nSECTION 2: COMPUTATION\n--------------------------------------------\n\n[computation questions]'
      : '';

    const versionBAnswers = includeVersionB
      ? '\n--------------------------------------------\nVERSION B -- ANSWERS\n--------------------------------------------\n\n[answers for Version B, each noting which Version A question it parallels]'
      : '';

    const answerKeyBlock = includeAnswerKey
      ? '\n=============================================\n* TEACHER ANSWER KEY -- DO NOT DISTRIBUTE *\n=============================================\n\nStandards: [list all CCSS standards covered]\nScoring: 1 pt per question | [N] pts total\n  [N-2]-[N] pts = Mastery\n  [N-4]-[N-3] pts = Approaching\n  Below = Needs Intervention\n\n--------------------------------------------\nVERSION A -- ANSWERS\n--------------------------------------------\n\n[For each question: show full worked solution with step-by-step math, CCSS tag, and question type]' + versionBAnswers + '\n\n--------------------------------------------\nTEACHER NOTES\n--------------------------------------------\n\nVISUAL MODELS: [instructions for inserting images]\nDIFFERENTIATION: [below grade / above grade suggestions]\nCOMMON ERRORS: [top 3-4 errors to watch for]\nRETEACH RESOURCES: [specific Khan Academy, IXL links for the standard]'
      : '';

    const prompt =
      'You are an expert ' + subject + ' curriculum designer for grade ' + gradeLevel + '.\n\n' +
      'Here is the source content from a ' + contentType + ':\n---\n' + extractedText + '\n---\n\n' +
      'Your task: Convert this into a polished, teacher-ready assessment with the following:\n\n' +
      'REQUIREMENTS:\n' +
      '- Grade Level: ' + gradeName + '\n' +
      '- Subject: ' + subject + '\n' +
      '- ' + standardNote + '\n' +
      '- Tag every question with its specific CCSS standard (e.g., [5.NF.1])\n' +
      '- Label every question with its type: [Word Problem], [Multiple Choice], [Computation], [Visual Model -- Bar Diagram], [Visual Model -- Number Line], [Visual Model -- Fraction Strips], [Visual Model -- Area Model], etc.\n' +
      '- For visual model questions, include a * TEACHER: marker explaining what image to insert\n' +
      '- Include a Name/Date/Class header\n' +
      '- Include work space lines after each question\n' +
      '- Keep answer blanks at the end of each question\n' +
      '- Separate into sections: "SECTION 1: WORD PROBLEMS & VISUAL MODELS" and "SECTION 2: COMPUTATION"\n\n' +
      'OUTPUT FORMAT -- produce exactly this structure:\n\n' +
      '=============================================\nVERSION A -- ORIGINAL\n=============================================\n\n' +
      'Name: _________________________________ Date: _____________ Class: _______________\n\n' +
      'Directions: Solve each problem. Show your work in the space provided.\n\n' +
      '--------------------------------------------\nSECTION 1: WORD PROBLEMS & VISUAL MODELS\n--------------------------------------------\n\n' +
      '[questions here with labels, work space, answer blanks]\n\n' +
      '--------------------------------------------\nSECTION 2: COMPUTATION\n--------------------------------------------\n\n' +
      '[computation questions here]\n' +
      versionBBlock +
      answerKeyBlock +
      '\n\nIMPORTANT RULES:\n' +
      '1. Every question must have a [CCSS Standard] tag and a [Question Type] tag\n' +
      '2. For Version B, ALL names, contexts, and numbers must be different from Version A\n' +
      '3. Questions in Version B must be REORDERED (not just different numbers in same order)\n' +
      '4. Each answer in the key must show full step-by-step work (e.g., "5/6 - 2/5 = 25/30 - 12/30 = 13/30")\n' +
      '5. Visual model questions must have a * TEACHER: note explaining what to insert\n' +
      '6. Do NOT include answer choices for open-ended questions -- those are fill-in or show-work\n' +
      '7. Multiple choice questions must have 4 answer choices labeled O A  O B  O C  O D';

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });

    return Response.json({ assessment: response.content[0].text, extractedText });

  } catch (e) {
    console.error('Generate error:', e);
    const msg = e?.error?.error?.message || e?.message || 'An unexpected error occurred.';
    return Response.json({ error: msg }, { status: 500 });
  }
}
