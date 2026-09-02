import { useEffect, useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  previewUrl?: string;
}

export default function ImageUploader({ onUpload, previewUrl }: Props) {
  const [preview, setPreview] = useState<string>(previewUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
    onUpload(file);
  };

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="作业图片文件"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="更换作业图片"
          style={{ border: 'none', background: 'none', padding: 0, width: '100%', cursor: 'pointer' }}
        >
          <img
            src={preview}
            alt="已选择的作业图片"
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, border: '2px dashed #cbd5e1' }}
          />
          <span style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginTop: 8 }}>点击更换图片</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="拍照或上传作业图片"
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            padding: 40,
            cursor: 'pointer',
            color: '#64748b',
            width: '100%',
            background: 'transparent',
          }}
        >
          <span aria-hidden="true" style={{ display: 'block', fontSize: 36, margin: '0 0 8px' }}>📷</span>
          <span>点击拍照或上传作业图片</span>
        </button>
      )}
    </div>
  );
}
