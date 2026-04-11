import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

function formatQuestion(q) {
  let out = '';
  if (q.marker) out += q.marker + '\n';
  out += `${q.qNum || '1'}. ${q.text}`;
  if (q.choices?.length) {
    out += '\n' + q.choices.map(c => `${c.letter}) ${c.text}`).join('\n');
  }
  return out;
}

const QTYPE_LABELS = {
  mc:          'multiple choice (must have exactly the same number of lettered answer choices)',
  multiselect: 'select-all-that-apply (checkbox style — must have exactly the same number of lettered choices, multiple correct)',
  fill:        'fill-in-the-blank (NO answer choices at all)',
  open:        'open response / short answer (NO answer choices at all)',
  computation: 'computation / show-your-work (NO answer choices at all)',
  word:        'word problem (NO answer choices at all)',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      apiKey,
      question,
      contextQuestions = [],
      gradeLevel = '3',
      subject = 'Math',
      standard = '',
    } = body;

    if (!apiKey) {
      return Response.json({ error: 'API key required.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const gradeDisplay = gradeLevel === 'K' ? 'Kindergarten' : `Grade ${gradeLevel}`;
    const qTypeLabel = QTYPE_LABELS[question.qType] || 'short answer (NO answer choices)';
    const choiceCount = question.choices?.length || 0;
    const hasChoices = choiceCount > 0;

    const contextStr = contextQuestions.length > 0
      ? `Other questions in this assessment (for context — do NOT repeat them):\n${contextQuestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}\n\n`
      : '';

    const prompt = `You are a ${gradeDisplay} ${subject} assessment writer${standard ? ` (${standard})` : ''}.

Rewrite the question below with DIFFERENT numbers or values. You MUST keep:
1. QUESTION TYPE: ${qTypeLabel}
2. SAME SKILL being assessed
3. SAME DIFFICULTY level${hasChoices ? `
4. EXACTLY ${choiceCount} answer choices (${question.choices.map(c => c.letter).join(', ')}) — one correct, rest plausible distractors` : `
4. NO answer choices — this is NOT multiple choice`}${question.marker ? `
5. A visual/model marker of the same TYPE (update values to match new numbers)` : ''}

${contextStr}Original question:
${formatQuestion(question)}

Output ONLY the replacement question in this exact format:
${question.marker ? '<same marker type with updated values>\n' : ''}1. <new question text>
${hasChoices ? question.choices.map(c => `${c.letter}) <new option>`).join('\n') : '(no choices — leave blank)'}

No preamble, no explanation.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = msg.content[0]?.text?.trim() || '';
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: e.message || 'Regeneration failed' }, { status: 500 });
  }
}
