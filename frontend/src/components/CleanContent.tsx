import { useMemo } from 'react';
import MathRenderer from './MathRenderer';

/**
 * Detects and cleans raw JSON content that may have been stored
 * from failed OCR/AI parsing. If the content is a JSON wrapper
 * (e.g. {"questions":[{"content":"...","type":"essay",...}]}),
 * it extracts the actual question text.
 */
function cleanText(raw: string): string {
  if (!raw) return raw;

  const trimmed = raw.trim();

  // Fast check: does it look like a JSON object or array?
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    // Might still have a code fence
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

    // Pattern 1: OCR question response {"questions": [{...}]}
    if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      const q = parsed.questions[0];
      // Take the actual question content
      if (q.content && typeof q.content === 'string' && q.content.length > 10) {
        return q.content;
      }
      // Rebuild a readable question from fields
      const parts: string[] = [];
      if (q.content) parts.push(q.content);
      if (q.type) parts.push(`[${q.type}]`);
      if (q.points) parts.push(`(${q.points}分)`);
      if (q.reference_answer) parts.push(`答案: ${q.reference_answer}`);
      if (q.note) parts.push(q.note);
      return parts.join('\n') || raw;
    }

    // Pattern 2: Grading result {"is_correct": true, "feedback": "...", ...}
    if ('is_correct' in parsed || 'feedback' in parsed || 'score' in parsed) {
      const fbParts: string[] = [];
      if (parsed.feedback) fbParts.push(parsed.feedback);
      if (parsed.key_points && Array.isArray(parsed.key_points)) {
        fbParts.push('知识点: ' + parsed.key_points.join('、'));
      }
      return fbParts.join('\n') || raw;
    }

    // Pattern 3: Plain JSON that happens to be stored - show as formatted
    return raw;
  } catch {
    // Not valid JSON, return as-is
    return raw;
  }
}

interface Props {
  content: string;
  style?: React.CSSProperties;
  tag?: 'p' | 'div' | 'span';
}

export default function CleanContent({ content, style, tag = 'p' }: Props) {
  const cleaned = useMemo(() => cleanText(content || ''), [content]);

  const Tag = tag as any;
  return (
    <Tag style={{ whiteSpace: 'pre-line', ...style }}>
      <MathRenderer content={cleaned} />
    </Tag>
  );
}

export { cleanText };
