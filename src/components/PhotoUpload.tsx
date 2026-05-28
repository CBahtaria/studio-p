// ════════════════════════════════════════════════
// STUDIO P — PhotoUpload
// Canvas watermark + Supabase Storage upload
// Submitted photos are held for admin approval
// ════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface PhotoUploadProps {
  userId: string;
}

function applyWatermark(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // Watermark: scaled to 4% of image width, min 14px
        const fs = Math.max(14, Math.round(w * 0.04));
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fs}px "DM Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('Studio P', w - 12, h - 12);
        ctx.restore();
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
          'image/jpeg',
          0.88,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({ userId }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('error'); setMsg('Please select an image file'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error'); setMsg('Image must be under 10 MB'); return;
    }

    setUploading(true);
    setStatus('idle');
    try {
      const blob = await applyWatermark(file);
      const path = `${userId}/${Date.now()}.jpg`;

      const { error: storageErr } = await supabase.storage
        .from('client-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (storageErr) throw new Error(storageErr.message);

      const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(path);

      const { error: dbErr } = await supabase.from('gallery_items').insert({
        uploader_id: userId,
        url: urlData.publicUrl,
        storage_path: path,
        caption: caption.trim() || null,
        approved: false,
      });
      if (dbErr) throw new Error(dbErr.message);

      setStatus('success');
      setMsg('Photo submitted — pending review!');
      setCaption('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setStatus('error');
      setMsg((err as Error).message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pc">
      <div className="pc-h"><span className="pc-t">Share Your Look</span></div>
      <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          ref={inputRef}
          id="photo-upload-input"
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <input
          className="port-input"
          placeholder="Caption (optional, max 120 chars)"
          maxLength={120}
          value={caption}
          onChange={e => setCaption(e.target.value)}
          disabled={uploading}
        />
        <label
          htmlFor="photo-upload-input"
          style={{
            display: 'block', textAlign: 'center', padding: '12px',
            border: '1px dashed var(--port-bord)', borderRadius: 6,
            color: uploading ? 'var(--port-m)' : 'var(--port-a)',
            fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em',
            cursor: uploading ? 'wait' : 'pointer', transition: 'border-color .15s, color .15s',
          }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--port-a)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--port-bord)'; }}
        >
          {uploading ? 'UPLOADING…' : '+ UPLOAD PHOTO'}
        </label>
        {status !== 'idle' && (
          <div style={{ fontSize: 11, color: status === 'success' ? '#4ade80' : '#f87171', padding: '4px 0' }}>
            {msg}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--port-m)', lineHeight: 1.5 }}>
          Studio P watermark applied automatically · Photos reviewed before public display
        </div>
      </div>
    </div>
  );
}
