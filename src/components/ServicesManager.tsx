   1 | import { useState } from 'react';
   2 | import { useForm } from 'react-hook-form';
   3 | import { zodResolver } from '@hookform/resolvers/zod';
   4 | import { z } from 'zod';
   5 | import { supabase } from '@/lib/supabase';
   6 | import { useServices } from '@/hooks/useServices';
   7 | import type { Service } from '@/types';
   8 | 
   9 | const schema = z.object({
  10 |   name:             z.string().min(2).max(80).regex(/^[^<>&"']*$/, 'No HTML characters'),
  11 |   description:      z.string().max(200).regex(/^[^<>&"']*$/, 'No HTML characters'),
  12 |   tag:              z.string().min(1).max(30).regex(/^[a-zA-Z0-9 &-]+$/, 'Letters, numbers, spaces, & -'),
  13 |   price:            z.number().min(1, 'Min E1').max(5000, 'Max E5000'),
  14 |   duration_minutes: z.number().int().min(5, 'Min 5 min').max(480, 'Max 8 hours'),
  15 | });
  16 | 
  17 | type FormData = z.infer<typeof schema>;
  18 | 
  19 | export function ServicesManager() {
  20 |   const { services, loading, error: loadError, reload } = useServices(true);
  21 |   const [mode, setMode]             = useState<'list' | 'add' | 'edit'>('list');
  22 |   const [editing, setEditing]       = useState<Service | null>(null);
  23 |   const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  24 |   const [dbError, setDbError]       = useState<string | null>(null);
  25 | 
  26 |   const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
  27 |     resolver: zodResolver(schema),
  28 |     defaultValues: { name: '', description: '', tag: '', price: 100, duration_minutes: 30 },
  29 |   });
  30 | 
  31 |   const openAdd = () => {
  32 |     reset({ name: '', description: '', tag: '', price: 100, duration_minutes: 30 });
  33 |     setEditing(null);
  34 |     setMode('add');
  35 |   };
  36 | 
  37 |   const openEdit = (s: Service) => {
  38 |     reset({ name: s.name, description: s.description, tag: s.tag, price: s.price, duration_minutes: s.duration });
  39 |     setEditing(s);
  40 |     setMode('edit');
  41 |   };
  42 | 
  43 |   const cancel = () => { setMode('list'); setEditing(null); setDbError(null); };
  44 | 
  45 |   const onSubmit = async (data: FormData) => {
  46 |     setDbError(null);
  47 |     const payload = {
  48 |       name:             data.name,
  49 |       description:      data.description,
  50 |       tag:              data.tag,
  51 |       price_swl:        Math.round(data.price * 100),
  52 |       duration_minutes: data.duration_minutes,
  53 |     };
  54 | 
  55 |     let error: { message: string } | null = null;
  56 |     if (mode === 'add') {
  57 |       const { error: insertError } = await supabase.from('services').insert({ ...payload, active: true });
  58 |       error = insertError;
  59 |     } else { // mode === 'edit'
  60 |       if (!editing) {
  61 |         setDbError('No service selected for editing.');
  62 |         return;
  63 |       }
  64 |       const { error: updateError } = await supabase.from('services').update(payload).eq('id', editing.id);
  65 |       error = updateError;
  66 |     }
  67 | 
  68 |     if (error) { setDbError(error.message); return; }
  69 |     await reload();
  70 |     cancel();
  71 |   };
  72 | 
  73 |   const toggleActive = async (s: Service) => {
  74 |     const { error } = await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
  75 |     if (!error) await reload();
  76 |     else setDbError(error.message);
  77 |   };
  78 | 
  79 |   const confirmDelete = async () => {
  80 |     if (!deleteTarget) return;
  81 |     const { error } = await supabase.from('services').delete().eq('id', deleteTarget.id);
  82 |     setDeleteTarget(null);
  83 |     if (!error) await reload();
  84 |     else setDbError(error.message);
  85 |   };
  86 | 
  87 |   const field: React.CSSProperties = {
  88 |     width: '100%', background: 'var(--port-bg)', border: '1px solid var(--port-bord)',
  89 |     color: 'var(--port-t)', padding: '9px 12px', borderRadius: 6,
  90 |     fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
  91 |     boxSizing: 'border-box',
  92 |   };
  93 |   const lbl: React.CSSProperties = {
  94 |     fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em',
  95 |     color: 'var(--stone)', display: 'block', marginBottom: 4, textTransform: 'uppercase',
  96 |   };
  97 |   const errS: React.CSSProperties = {
  98 |     fontSize: 10, color: '#f87171', marginTop: 3, fontFamily: 'DM Mono, monospace',
  99 |   };
 100 | 
 101 |   return (
 102 |     <div>
 103 |       {/* Header */}
 104 |       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
 105 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase' }}>
 106 |           Pricelist
 107 |         </div>
 108 |         {mode === 'list' && (
 109 |           <button className="pb" onClick={openAdd} style={{ fontSize: 9, padding: '6px 12px' }}>+ Add Service</button>
 110 |         )}
 111 |       </div>
 112 | 
 113 |       {/* Error banner */}
 114 |       {(dbError || loadError) && (
 115 |         <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
 116 |           <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'DM Mono, monospace' }}>{dbError || loadError}</span>
 117 |           <button onClick={() => { setDbError(null); reload(); }} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset', flexShrink: 0 }}>Retry</button>
 118 |         </div>
 119 |       )}
 120 | 
 121 |       {/* Add / Edit form */}
 122 |       {(mode === 'add' || mode === 'edit') && (
 123 |         <form onSubmit={handleSubmit(onSubmit)} style={{
 124 |           background: 'var(--port-side)', border: '1px solid var(--port-bord)',
 125 |           borderRadius: 8, padding: 16, marginBottom: 16,
 126 |         }}>
 127 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.25em', color: 'var(--port-a)', marginBottom: 12, textTransform: 'uppercase' }}>
 128 |             {mode === 'add' ? 'New Service' : 'Edit Service'}
 129 |           </div>
 130 |           <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
 131 |             <div>
 132 |               <label style={lbl}>Name</label>
 133 |               <input {...register('name')} style={field} placeholder="Signature Fade" />
 134 |               {errors.name && <p style={errS}>{errors.name.message}</p>}
 135 |             </div>
 136 |             <div>
 137 |               <label style={lbl}>Description</label>
 138 |               <input {...register('description')} style={field} placeholder="Short description…" />
 139 |               {errors.description && <p style={errS}>{errors.description.message}</p>}
 140 |             </div>
 141 |             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
 142 |               <div>
 143 |                 <label style={lbl}>Tag</label>
 144 |                 <input {...register('tag')} style={field} placeholder="Signature" />
 145 |                 {errors.tag && <p style={errS}>{errors.tag.message}</p>}
 146 |               </div>
 147 |               <div>
 148 |                 <label style={lbl}>Price (E)</label>
 149 |                 <input {...register('price', { valueAsNumber: true })} type="number" min="1" max="5000" step="1" style={field} />
 150 |                 {errors.price && <p style={errS}>{errors.price.message}</p>}
 151 |               </div>
 152 |               <div>
 153 |                 <label style={lbl}>Duration (min)</label>
 154 |                 <input {...register('duration_minutes', { valueAsNumber: true })} type="number" min="5" max="480" step="5" style={field} />
 155 |                 {errors.duration_minutes && <p style={errS}>{errors.duration_minutes.message}</p>}
 156 |               </div>
 157 |             </div>
 158 |           </div>
 159 |           <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
 160 |             <button type="button" onClick={cancel} className="pbg" style={{ fontSize: 9, padding: '7px 14px' }}>Cancel</button>
 161 |             <button type="submit" disabled={isSubmitting} className="pb" style={{ fontSize: 9, padding: '7px 14px', opacity: isSubmitting ? .6 : 1 }}>
 162 |               {isSubmitting ? 'Saving…' : 'Save'}
 163 |             </button>
 164 |           </div>
 165 |         </form>
 166 |       )}
 167 | 
 168 |       {/* Service list */}
 169 |       {loading && (
 170 |         <div style={{ textAlign: 'center', padding: 24, color: 'var(--stone)', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em' }}>
 171 |           LOADING…
 172 |         </div>
 173 |       )}
 174 |       {!loading && services.map(s => (
 175 |         <div key={s.id} style={{
 176 |           display: 'flex', alignItems: 'center', gap: 10,
 177 |           padding: '12px 0', borderBottom: '1px solid var(--port-bord)',
 178 |         }}>
 179 |           <div style={{ flex: 1, minWidth: 0 }}>
 180 |             <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
 181 |               <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--port-t)' }}>{s.name}</span>
 182 |               <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.15em', color: 'var(--brass)', textTransform: 'uppercase' }}>{s.tag}</span>
 183 |               {!s.active && (
 184 |                 <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, color: 'var(--stone)', border: '1px solid var(--port-bord)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>inactive</span>
 185 |               )}
 186 |             </div>
 187 |             <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 2 }}>
 188 |               E{s.price} · {s.duration} min
 189 |             </div>
 190 |           </div>
 191 |           <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
 192 |             <button onClick={() => toggleActive(s)} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset' }}>
 193 |               {s.active ? 'Disable' : 'Enable'}
 194 |             </button>
 195 |             <button onClick={() => openEdit(s)} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset' }}>Edit</button>
 196 |             <button
 197 |               onClick={() => setDeleteTarget(s)}
 198 |               style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset', background: 'rgba(248,113,113,.1)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em' }}
 199 |             >
 200 |               Delete
 201 |             </button>
 202 |           </div>
 203 |         </div>
 204 |       ))}
 205 | 
 206 |       {/* Delete confirmation modal */}
 207 |       {deleteTarget && (
 208 |         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
 209 |           <div style={{ background: 'var(--ink2)', border: '1px solid var(--bord2)', borderRadius: 12, padding: 28, maxWidth: 340, width: '90%', textAlign: 'center', animation: 'windowIn .25s cubic-bezier(.16,1,.3,1)' }}>
 210 |             <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 600, marginBottom: 8 }}>Delete Service?</div>
 211 |             <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>
 212 |               Remove <strong style={{ color: 'var(--parch)' }}>{deleteTarget.name}</strong> from the pricelist? This cannot be undone.
 213 |             </p>
 214 |             <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
 215 |               <button onClick={() => setDeleteTarget(null)} className="pbg" style={{ padding: '9px 20px' }}>Cancel</button>
 216 |               <button
 217 |                 onClick={confirmDelete}
 218 |                 style={{ background: '#f87171', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.1em', cursor: 'pointer' }}
 219 |               >
 220 |                 Delete
 221 |               </button>
 222 |             </div>
 223 |           </div>
 224 |         </div>
 225 |       )}
 226 |     </div>
 227 |   );
 228 | }
 229 | 