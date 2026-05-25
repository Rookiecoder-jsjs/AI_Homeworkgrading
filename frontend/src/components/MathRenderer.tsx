import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderMath(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  if (!text) return [];
  // Split by $...$ (inline) and $$...$$ (block)
  const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
  // First handle $$...$$ blocks
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null) {
    if (m.index > last) {
      // Process inline math in the text before this block
      parts.push(...renderInline(text.slice(last, m.index)));
    }
    parts.push({ type: 'math', content: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(...renderInline(text.slice(last)));
  }
  return parts;
}

function renderInline(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
  const regex = /\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    parts.push({ type: 'math', content: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

interface Props {
  content: string;
  style?: React.CSSProperties;
}

export default function MathRenderer({ content, style }: Props) {
  const parts = useMemo(() => renderMath(content || ''), [content]);

  return (
    <span style={style}>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.content}</span>;
        }
        try {
          const html = katex.renderToString(part.content, {
            throwOnError: false,
            displayMode: false,
            trust: true,
          });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i} style={{ color: '#ef4444' }}>${part.content}$</span>;
        }
      })}
    </span>
  );
}

export { renderMath };
