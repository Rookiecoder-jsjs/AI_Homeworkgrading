import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderMath } from './contentUtils';

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
            // Content can originate from student answers or model output.
            // Keep KaTeX's potentially unsafe commands disabled.
            trust: false,
          });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i} style={{ color: '#ef4444' }}>${part.content}$</span>;
        }
      })}
    </span>
  );
}
