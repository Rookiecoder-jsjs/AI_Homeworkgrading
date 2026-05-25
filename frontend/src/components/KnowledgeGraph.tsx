import { useState } from 'react';

interface KPNode {
  id: number;
  name: string;
  description: string;
  children: KPNode[];
}

interface Props {
  roots: KPNode[];
  mastery?: Record<string, number>;
}

function TreeNode({ node, mastery, depth }: { node: KPNode; mastery?: Record<string, number>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const score = mastery?.[node.name];
  const hasChildren = node.children.length > 0;

  const bgColor = score === undefined ? '#f8fafc'
    : score < 0.4 ? '#fef2f2'
    : score < 0.7 ? '#fffbeb'
    : '#ecfdf5';
  const borderColor = score === undefined ? '#e2e8f0'
    : score < 0.4 ? '#fecaca'
    : score < 0.7 ? '#fde68a'
    : '#a7f3d0';

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', marginBottom: 4, borderRadius: 8,
          background: bgColor, border: `1px solid ${borderColor}`,
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'all 0.15s', fontSize: 13,
        }}
      >
        {hasChildren && (
          <span style={{ fontSize: 10, color: '#94a3b8', width: 12 }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 12 }} />}
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{node.name}</span>
        {score !== undefined && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            color: score < 0.4 ? '#b91c1c' : score < 0.7 ? '#b45309' : '#047857',
          }}>
            {Math.round(score * 100)}%
          </span>
        )}
        {node.description && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{node.description}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 8 }}>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} mastery={mastery} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeGraph({ roots, mastery }: Props) {
  if (!roots || roots.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无知识图谱数据</p>;
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {roots.map((root) => (
        <TreeNode key={root.id} node={root} mastery={mastery} depth={0} />
      ))}
    </div>
  );
}
