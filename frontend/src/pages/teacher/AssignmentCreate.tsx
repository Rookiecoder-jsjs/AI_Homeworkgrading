import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

interface QuestionDraft {
  type: string; content: string; reference_answer: string;
  rubric: string; points: number; sort_order: number; image_url: string;
}

export default function AssignmentCreatePage() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<Record<number, boolean>>({});

  const handleQuestionOCR = async (idx: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setOcrLoading((p) => ({ ...p, [idx]: true }));
      try {
        const result = await api.ocrQuestionImage(file);
        if (result.questions && result.questions.length > 0) {
          const q = result.questions[0];
          updateQ(idx, 'content', q.content || '');
          updateQ(idx, 'type', q.type || 'short_answer');
          updateQ(idx, 'reference_answer', q.reference_answer || '');
          if (q.points) updateQ(idx, 'points', q.points);
          // Save the uploaded image URL so students see the original image
          if (result.image_url) updateQ(idx, 'image_url', result.image_url);
        }
      } catch (e: any) { alert('OCR 识别失败：' + e.message); }
      setOcrLoading((p) => ({ ...p, [idx]: false }));
    };
    input.click();
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      type: 'choice', content: '', reference_answer: '',
      rubric: '', points: 5, sort_order: questions.length, image_url: '',
    }]);
  };

  const updateQ = (idx: number, field: string, value: any) => {
    const next = [...questions];
    (next[idx] as any)[field] = value;
    setQuestions(next);
  };
  const removeQ = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!title.trim()) return alert('请输入作业标题');
    setSaving(true);
    try {
      await api.createAssignment({
        title, subject, class_name: className, teacher_name: teacherName,
        description, questions: questions.map((q, i) => ({ ...q, sort_order: i })),
        status: 'published',
      });
      nav('/teacher/assignments');
    } catch (e: any) { alert('创建失败：' + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: 780, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => nav('/teacher/assignments')} style={{
          border: 'none', background: 'none', color: '#4338ca', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
        }}>← 返回</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' }}>创建新作业</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <input placeholder="作业标题 *" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <input placeholder="科目" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
        <input placeholder="班级" value={className} onChange={(e) => setClassName(e.target.value)} style={inputStyle} />
        <input placeholder="教师姓名" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={inputStyle} />
      </div>
      <textarea placeholder="作业说明（可选）" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, width: '100%', marginBottom: 28 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#334155' }}>题目列表</h2>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{questions.length} 题</span>
      </div>

      {questions.map((q, idx) => (
        <div key={idx} style={{
          padding: 16, borderRadius: 14, background: '#fafbfc',
          border: '1px solid #e2e8f0', marginBottom: 12,
          animation: `fadeInUp 0.3s ${idx * 0.04}s cubic-bezier(0.4,0,0.2,1) both`,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 6, background: '#eef2ff',
              color: '#4338ca', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{idx + 1}</span>
            <select value={q.type} onChange={(e) => updateQ(idx, 'type', e.target.value)} style={{ ...inputStyle, width: 130, fontSize: 13 }}>
              <option value="choice">选择题</option>
              <option value="true_false">判断题</option>
              <option value="fill_blank">填空题</option>
              <option value="short_answer">简答题</option>
              <option value="essay">作文/证明题</option>
            </select>
            <input type="number" placeholder="分值" value={q.points} onChange={(e) => updateQ(idx, 'points', +e.target.value)} style={{ ...inputStyle, width: 70, fontSize: 13 }} />
            <button
              onClick={() => handleQuestionOCR(idx)}
              disabled={ocrLoading[idx]}
              title="拍照识别题目"
              style={{
                marginLeft: 'auto', padding: '4px 12px', borderRadius: 6,
                border: '1px solid #c7d2fe', background: '#eef2ff',
                color: '#4338ca', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                opacity: ocrLoading[idx] ? 0.5 : 1,
              }}
            >
              {ocrLoading[idx] ? '识别中...' : '📷 拍照识别'}
            </button>
            <button onClick={() => removeQ(idx)} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca',
              background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}>删除</button>
          </div>
          <input placeholder="题目内容" value={q.content} onChange={(e) => updateQ(idx, 'content', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 8, fontSize: 13 }} />
          <input placeholder="参考答案" value={q.reference_answer} onChange={(e) => updateQ(idx, 'reference_answer', e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 8, fontSize: 13 }} />
          {['short_answer', 'essay'].includes(q.type) && (
            <input placeholder="评分标准（可选）" value={q.rubric} onChange={(e) => updateQ(idx, 'rubric', e.target.value)} style={{ ...inputStyle, width: '100%', fontSize: 13 }} />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={addQuestion} style={{
          padding: '10px 24px', borderRadius: 10, border: '2px dashed #cbd5e1',
          background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
        }}>+ 添加题目</button>
        <button onClick={handleSubmit} disabled={saving} style={{
          padding: '10px 32px', borderRadius: 10, border: 'none',
          background: saving ? '#a5b4fc' : '#4338ca', color: '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 700,
          boxShadow: saving ? undefined : '0 2px 8px rgba(67,56,202,0.2)',
        }}>
          {saving ? '保存中...' : '发布作业'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
};
