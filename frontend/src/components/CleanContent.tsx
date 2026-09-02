import { useMemo } from 'react';
import MathRenderer from './MathRenderer';
import { cleanText } from './contentUtils';

interface Props {
  content: string;
  style?: React.CSSProperties;
  tag?: 'p' | 'div' | 'span';
}

export default function CleanContent({ content, style, tag = 'p' }: Props) {
  const cleaned = useMemo(() => cleanText(content || ''), [content]);

  const Tag = tag;
  return (
    <Tag style={{ whiteSpace: 'pre-line', ...style }}>
      <MathRenderer content={cleaned} />
    </Tag>
  );
}
