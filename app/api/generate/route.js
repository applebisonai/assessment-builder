import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return Response.json({ error: 'Missing API key. Add your Anthropic API key in Settings.' }, { status: 401 });

  const { content, contentType, gradeLevel, subject, standard, includeVersionB, includeAnswerKey, imageBase64 } = await request.json();

  const client = new Anthropic({ apiKey });

  let extractedText = content;

  // If image data provided, first use Claude vision to extract text
  if (imageBase64) {
    const visionResp = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          { type: 'text', text: 'Please extract ALL text from this document exactly as it appears. Include every question, answer choice, instruction, and label. Format it clearly with question numbers preserved.' }
        ]
      }]
    });
    extractedText = visionResp.content[0].text;
  }

  const standardNote = standard ? `Standard: ${standard}` : `Identify the appropriate CCSS standard(s) for grade ${gradeLevel} ${subject}`;

  const prompt = `You are an expert ${subject} curriculum designer for grade ${gradeLevel}.

Here is the source content from a ${contentType}:
---
${extractedText}
---

Your task: Convert this into a polished, teacher-ready assessment with the following:

REQUIREMENTS:
- Grade Level: ${gradeLevel === 'K' ? 'Kindergarten' : `Grade ${gradeLevel}`}
- Subject: ${subject}
- ${standardNote}
- Tag every question with its specific CCSS standard (e.g., [5.NF.1])
- Label every question with its type: [Word Problem], [Multiple Choice], [Computation], [Visual Model -- Bar Diagram], [Visual Model -- Number Line], [Visual Model -- Fraction Strips], [Visual Model -- Area Model], etc.
- For visual model questions, include a * TEACHER: marker explaining what image to insert
- Include a Name/Date/Class header
- Include work space lines after each question
- Keep answer blanks at the end of each question
- Separate into sections: "SECTION 1: WORD PROBLEMS & VISUAL MODELS" and "SECTION 2: COMPUTATION"

OUTPUT FORMAT -- produce exactly this structure:

=============================================
VERSION A -- ORIGINAL
=============================================

Name: _________________________________ Date: _____________ Class: _______________

Directions: Solve each problem. Show your work in the space provided.

--------------------------------------------
SECTION 1: WORD PROBLEMS & VISUAL MODELS
--------------------------------------------

[questions here with labels, work space, answer blanks]

--------------------------------------------
SECTION 2: COMPUTATION
--------------------------------------------

[computation questions here]

${includeVersionB ? `
=============================================
VERSION B -- ALTERNATE ASSESSMENT
(Same Standards | Different Context & Numbers | Questions Reordered)
=============================================

Name: _________________________________ Date: _____________ Class: _______________

Directions: Solve each problem. Show your work in the space provided.

[reordered questions with DIFFERENT names, contexts, and numbers but same question types and skill difficulty -- every Version A question must have a parallel Version B question]

--------------------------------------------
SECTION 2: COMPUTATION
--------------------------------------------

[computation questions]
` : ''}

${includeAnswerKey ? `
=============================================
* TEACHER ANSWER KEY -- DO NOT DISTRIBUTE *
=============================================

Standards: [list all CCSS standards covered]
Scoring: 1 pt per question | [N] pts total
  [N-2]-[N] pts = Mastery
  [N-4]-[N-3] pts = Approaching
  Below = Needs Intervention

--------------------------------------------
VERSION A -- ANSWERS
--------------------------------------------

[For each question: show full worked solution with step-by-step math, CCSS tag, and question type]

${includeVersionB ? `--------------------------------------------
VERSION B -- ANSWERS
--------------------------------------------

[answers for Version B, each noting which Version A question it parallels]` : ''}

--------------------------------------------
TEACHER NOTES
--------------------------------------------

VISUAL MODELS: [instructions for inserting images]
DIFFERENTIATION: [below grade / above grade suggestions]
COMMON ERRORS: [top 3-4 errors to watch for]
RETEACH RESOURCES: [specific Khan Academy, IXL links for the standard]
` : ''}

IMPORTANT RULES:
1. Every question must have a [CCSS Standard] tag and a [Question Type] tag
2. For Version B, ALL names, contexts, and numbers must be different from Version A
3. Questions in Version B must be REORDERED (not just different numbers in same order)
4. Each answer in the key must show full step-by-step work (e.g., "5/6 - 2/5 = 25/30 - 12/30 = 13/30")
5. Visual model questions must have a * TEACHER: note explaining what to insert
6. Do NOT include answer choices for open-ended questions -- those are fill-in or show-work
7. Multiple choice questions must have 4 answer choices labeled O A  O B  O C  O D`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });

  return Response.json({ assessment: response.content[0].text, extractedText });
}
