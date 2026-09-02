/**
 * Detect and clean raw JSON content that may have been stored from a failed
 * OCR/AI parse before the content is rendered for a user.
 */
export function cleanText(raw: string): string {
  if (!raw) return raw;

  const trimmed = raw.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    if (trimmed.startsWith('```')) {
      const inner = trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      if (inner.startsWith('{') || inner.startsWith('[')) {
        return cleanText(inner);
      }
    }
    return raw;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      const q = parsed.questions[0];
      if (q.content && typeof q.content === 'string' && q.content.length > 10) {
        return q.content;
      }
      const parts: string[] = [];
      if (q.content) parts.push(q.content);
      if (q.type) parts.push(`[${q.type}]`);
      if (q.points) parts.push(`(${q.points}分)`);
      if (q.reference_answer) parts.push(`答案: ${q.reference_answer}`);
      if (q.note) parts.push(q.note);
      return parts.join('\n') || raw;
    }

    if ('is_correct' in parsed || 'feedback' in parsed || 'score' in parsed) {
      const feedback: string[] = [];
      if (parsed.feedback) feedback.push(parsed.feedback);
      if (parsed.key_points && Array.isArray(parsed.key_points)) {
        feedback.push('知识点: ' + parsed.key_points.join('、'));
      }
      return feedback.join('\n') || raw;
    }

    return raw;
  } catch {
    return raw;
  }
}

export function renderMath(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  if (!text) return [];
  const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...renderInlineMath(text.slice(last, match.index)));
    }
    parts.push({ type: 'math', content: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(...renderInlineMath(text.slice(last)));
  }
  return parts;
}

function renderInlineMath(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
  const regex = /\$([^$]+)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    parts.push({ type: 'math', content: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}
