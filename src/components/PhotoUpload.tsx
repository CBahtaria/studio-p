   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — PhotoUpload
   3 | // Canvas watermark + Supabase Storage upload
   4 | // Supports images (client-photos) and videos (studio-media)
   5 | // Submitted items are held for admin approval
   6 | // ════════════════════════════════════════════════
   7 | 
   8 | import { useState, useRef } from 'react';
   9 | import { supabase } from '@/lib/supabase';
  10 | 
  11 | interface PhotoUploadProps {
  12 |   userId: string;
  13 | }
  14 | 
  15 | const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  16 | const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
  17 | const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;   // 10 MB
  18 | const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024;   // 50 MB
  19 | 
  20 | // Magic-byte signatures: [offset, bytes]
  21 | const MAGIC: Array<{ type: string; offset: number; bytes: number[] }> = [
  22 |   { type: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  23 |   { type: 'image/png',  offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  24 |   { type: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  25 |   { type: 'video/mp4',  offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp box
  26 |   { type: 'video/webm', offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] },
  27 | ];
  28 | 
  29 | function validateMagicBytes(file: File): Promise<boolean> {
  30 |   return new Promise(resolve => {
  31 |     const reader = new FileReader();
  32 |     reader.onload = (e) => {
  33 |       if (!e.target || e.target.result === null) { // Guard for null result
  34 |         resolve(false);
  35 |         return;
  36 |       }
  37 |       const buf = new Uint8Array(e.target.result as ArrayBuffer);
  38 |       const match = MAGIC.find(m => m.type === file.type);
  39 |       if (!match) { resolve(false); return; }
  40 |       const ok = match.bytes.every((b, i) => buf[match.offset + i] === b);
  41 |       resolve(ok);
  42 |     };
  43 |     reader.onerror = () => resolve(false);
  44 |     reader.readAsArrayBuffer(file.slice(0, 16));
  45 |   });
  46 | }
  47 | 
  48 | function applyWatermark(file: File): Promise<Blob> {
  49 |   return new Promise((resolve, reject) => {
  50 |     const reader = new FileReader();
  51 |     reader.onerror = () => reject(new Error('Failed to read file'));
  52 |     reader.onload = (e) => {
  53 |       if (!e.target || e.target.result === null) { // Guard for null result
  54 |         reject(new Error('Failed to read file content'));
  55 |         return;
  56 |       }
  57 |       const img = new Image();
  58 |       img.onerror = () => reject(new Error('Invalid image'));
  59 |       img.onload = () => {
  60 |         const MAX = 1200;
  61 |         const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  62 |         const w = Math.round(img.width * scale);
  63 |         const h = Math.round(img.height * scale);
  64 |         const canvas = document.createElement('canvas');
  65 |         canvas.width = w;
  66 |         canvas.height = h;
  67 |         const ctx = canvas.getContext('2d');
  68 |         if (!ctx) { reject(new Error('Canvas unavailable')); return; }
  69 |         ctx.drawImage(img, 0, 0, w, h);
  70 |         const fs = Math.max(14, Math.round(w * 0.04));
  71 |         ctx.save();
  72 |         ctx.globalAlpha = 0.72;
  73 |         ctx.fillStyle = '#ffffff';
  74 |         ctx.font = `bold ${fs}px "DM Mono", monospace`;
  75 |         ctx.textAlign = 'right';
  76 |         ctx.textBaseline = 'bottom';
  77 |         ctx.shadowColor = 'rgba(0,0,0,0.5)';
  78 |         ctx.shadowBlur = 4;
  79 |         ctx.fillText('Studio P', w - 12, h - 12);
  80 |         ctx.restore();
  81 |         canvas.toBlob(
  82 |           (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
  83 |           'image/jpeg',
  84 |           0.88,
  85 |         );
  86 |       };
  87 |       img.src = e.target.result as string;
  88 |     };
  89 |     reader.readAsDataURL(file);
  90 |   });
  91 | }
  92 | 
  93 | export function PhotoUpload({ userId }: PhotoUploadProps) {
  94 |   const [uploading, setUploading] = useState(false);
  95 |   const [caption, setCaption]     = useState('');
  96 |   const [status, setStatus]       = useState<'idle' | 'success' | 'error'>('idle');
  97 |   const [msg, setMsg]             = useState('');
  98 |   const inputRef = useRef<HTMLInputElement>(null);
  99 | 
 100 |   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 101 |     const file = e.target.files?.[0];
 102 |     if (!file) return;
 103 | 
 104 |     const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
 105 |     const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
 106 | 
 107 |     if (!isImage && !isVideo) {
 108 |       setStatus('error'); setMsg('Please select an image (JPEG/PNG/WebP) or video (MP4/WebM)'); return;
 109 |     }
 110 | 
 111 |     const magicOk = await validateMagicBytes(file);
 112 |     if (!magicOk) {
 113 |       setStatus('error'); setMsg('File content does not match its type — please use a real image or video file'); return;
 114 |     }
 115 |     if (isImage && file.size > IMAGE_SIZE_LIMIT) {
 116 |       setStatus('error'); setMsg('Image must be under 10 MB'); return;
 117 |     }
 118 |     if (isVideo && file.size > VIDEO_SIZE_LIMIT) {
 119 |       setStatus('error'); setMsg('Video must be under 50 MB'); return;
 120 |     }
 121 | 
 122 |     setUploading(true);
 123 |     setStatus('idle');
 124 | 
 125 |     try {
 126 |       let uploadBlob: Blob | File;
 127 |       let contentType: string;
 128 |       let ext: string;
 129 |       let bucket: string;
 130 | 
 131 |       if (isImage) {
 132 |         uploadBlob = await applyWatermark(file);
 133 |         contentType = 'image/jpeg';
 134 |         ext = 'jpg';
 135 |         bucket = 'client-photos';
 136 |       } else {
 137 |         // Videos skip watermark — upload raw
 138 |         uploadBlob = file;
 139 |         contentType = file.type;
 140 |         ext = file.type === 'video/webm' ? 'webm' : 'mp4';
 141 |         bucket = 'studio-media';
 142 |       }
 143 | 
 144 |       const path = `${userId}/${Date.now()}.${ext}`;
 145 | 
 146 |       const { error: storageErr } = await supabase.storage
 147 |         .from(bucket)
 148 |         .upload(path, uploadBlob, { contentType, upsert: false });
 149 |       if (storageErr) throw new Error(storageErr.message);
 150 | 
 151 |       const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
 152 | 
 153 |       const { error: dbErr } = await supabase.from('gallery_items').insert({
 154 |         uploader_id:  userId,
 155 |         url:          urlData.publicUrl,
 156 |         storage_path: path,
 157 |         caption:      caption.trim() || null,
 158 |         approved:     false,
 159 |         media_type:   isImage ? 'image' : 'video',
 160 |       });
 161 |       if (dbErr) throw new Error(dbErr.message);
 162 | 
 163 |       setStatus('success');
 164 |       setMsg(isImage ? 'Photo submitted — pending review!' : 'Video submitted — pending review!');
 165 |       setCaption('');
 166 |       if (inputRef.current) inputRef.current.value = '';
 167 |     } catch (err) {
 168 |       setStatus('error');
 169 |       setMsg(err instanceof Error ? err.message : 'Upload failed');
 170 |     } finally {
 171 |       setUploading(false);
 172 |     }
 173 |   };
 174 | 
 175 |   return (
 176 |     <div className="pc">
 177 |       <div className="pc-h"><span className="pc-t">Share Your Look</span></div>
 178 |       <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 179 |         <input
 180 |           ref={inputRef}
 181 |           id="media-upload-input"
 182 |           type="file"
 183 |           accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
 184 |           onChange={handleFile}
 185 |           disabled={uploading}
 186 |           style={{ display: 'none' }}
 187 |         />
 188 |         <input
 189 |           className="port-input"
 190 |           placeholder="Caption (optional, max 120 chars)"
 191 |           maxLength={120}
 192 |           value={caption}
 193 |           onChange={e => setCaption(e.target.value)}
 194 |           disabled={uploading}
 195 |         />
 196 |         <label
 197 |           htmlFor="media-upload-input"
 198 |           style={{
 199 |             display: 'block', textAlign: 'center', padding: '12px',
 200 |             border: '1px dashed var(--port-bord)', borderRadius: 6,
 201 |             color: uploading ? 'var(--port-m)' : 'var(--port-a)',
 202 |             fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em',
 203 |             cursor: uploading ? 'wait' : 'pointer', transition: 'border-color .15s, color .15s',
 204 |           }}
 205 |           onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--port-a)'; }}
 206 |           onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--port-bord)'; }}
 207 |         >
 208 |           {uploading ? 'UPLOADING…' : '+ UPLOAD PHOTO / VIDEO'}
 209 |         </label>
 210 |         {status !== 'idle' && (
 211 |           <div style={{ fontSize: 11, color: status === 'success' ? '#4ade80' : '#f87171', padding: '4px 0' }}>
 212 |             {msg}
 213 |           </div>
 214 |         )}
 215 |         <div style={{ fontSize: 11, color: 'var(--port-m)', lineHeight: 1.5 }}>
 216 |           Studio P watermark applied to photos · Videos up to 50 MB · Items reviewed before public display
 217 |         </div>
 218 |       </div>
 219 |     </div>
 220 |   );
 221 | }
 222 | 