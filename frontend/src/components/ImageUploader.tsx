import { useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  previewUrl?: string;
}

export default function ImageUploader({ onUpload, previewUrl }: Props) {
  const [preview, setPreview] = useState<string>(previewUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {preview ? (
        <div onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, border: '2px dashed #cbd5e1' }}
          />
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>点击更换图片</p>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            padding: 40,
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <p style={{ fontSize: 36, margin: '0 0 8px' }}>📷</p>
          <p>点击拍照或上传作业图片</p>
        </div>
      )}
    </div>
  );
}
