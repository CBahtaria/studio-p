import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useServices';
import type { Service } from '@/types';

const schema = z.object({
  name:             z.string().min(2).max(80).regex(/^[^<>&"']*$/, 'No HTML characters'),
  description:      z.string().max(200).regex(/^[^<>&"']*$/, 'No HTML characters'),
  tag:              z.string().min(1).max(30).regex(/^[a-zA-Z0-9 &-]+$/, 'Letters, numbers, spaces, & -'),
  price:            z.number().min(1, 'Min E1').max(5000, 'Max E5000'),
  duration_minutes: z.number().int().min(5, 'Min 5 min').max(480, 'Max 8 hours'),
});

type FormData = z.infer<typeof schema>;

export function ServicesManager() {
  const { services, loading, error: loadError, reload } = useServices(true);
  const [mode, setMode]             = useState<'list' | 'add' | 'edit'>('list');
  const [editing, setEditing]       = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [dbError, setDbError]       = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', tag: '', price: 100, duration_minutes: 30 },
  });

  const openAdd = () => {
    reset({ name: '', description: '', tag: '', price: 100, duration_minutes: 30 });
    setEditing(null);
    setMode('add');
  };

  const openEdit = (s: Service) => {
    reset({ name: s.name, description: s.description, tag: s.tag, price: s.price, duration_minutes: s.duration });
    setEditing(s);
    setMode('edit');
  };

  const cancel = () => { setMode('list'); setEditing(null); setDbError(null); };

  const onSubmit = async (data: FormData) => {
    setDbError(null);
    const payload = {
      name:             data.name,
      description:      data.description,
      tag:              data.tag,
      price_swl:        Math.round(data.price * 100),
      duration_minutes: data.duration_minutes,
    };
    const { error } = mode === 'add'
      ? await supabase.from('services').insert({ ...payload, active: true })
      : await supabase.from('services').update(payload).eq('id', editing!.id);

    if (error) { setDbError(error.message); return; }
    await reload();
    cancel();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
    if (!error) await reload();
    else setDbError(error.message);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('services').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (!error) await reload();
    else setDbError(error.message);
  };

  const field: React.CSSProperties = {
    width: '100%', background: 'var(--port-bg)', border: '1px solid var(--port-bord)',
    color: 'var(--port-t)', padding: '9px 12px', borderRadius: 6,
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em',
    color: 'var(--stone)', display: 'block', marginBottom: 4, textTransform: 'uppercase',
  };
  const errS: React.CSSProperties = {
    fontSize: 10, color: '#f87171', marginTop: 3, fontFamily: 'DM Mono, monospace',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase' }}>
          Pricelist
        </div>
        {mode === 'list' && (
          <button className="pb" onClick={openAdd} style={{ fontSize: 9, padding: '6px 12px' }}>+ Add Service</button>
        )}
      </div>

      {/* Error banner */}
      {(dbError || loadError) && (
        <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'DM Mono, monospace' }}>{dbError || loadError}</span>
          <button onClick={() => { setDbError(null); reload(); }} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {/* Add / Edit form */}
      {(mode === 'add' || mode === 'edit') && (
        <form onSubmit={handleSubmit(onSubmit)} style={{
          background: 'var(--port-side)', border: '1px solid var(--port-bord)',
          borderRadius: 8, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.25em', color: 'var(--port-a)', marginBottom: 12, textTransform: 'uppercase' }}>
            {mode === 'add' ? 'New Service' : 'Edit Service'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Name</label>
              <input {...register('name')} style={field} placeholder="Signature Fade" />
              {errors.name && <p style={errS}>{errors.name.message}</p>}
            </div>
            <div>
              <label style={lbl}>Description</label>
              <input {...register('description')} style={field} placeholder="Short description…" />
              {errors.description && <p style={errS}>{errors.description.message}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={lbl}>Tag</label>
                <input {...register('tag')} style={field} placeholder="Signature" />
                {errors.tag && <p style={errS}>{errors.tag.message}</p>}
              </div>
              <div>
                <label style={lbl}>Price (E)</label>
                <input {...register('price', { valueAsNumber: true })} type="number" min="1" max="5000" step="1" style={field} />
                {errors.price && <p style={errS}>{errors.price.message}</p>}
              </div>
              <div>
                <label style={lbl}>Duration (min)</label>
                <input {...register('duration_minutes', { valueAsNumber: true })} type="number" min="5" max="480" step="5" style={field} />
                {errors.duration_minutes && <p style={errS}>{errors.duration_minutes.message}</p>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancel} className="pbg" style={{ fontSize: 9, padding: '7px 14px' }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="pb" style={{ fontSize: 9, padding: '7px 14px', opacity: isSubmitting ? .6 : 1 }}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Service list */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--stone)', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em' }}>
          LOADING…
        </div>
      )}
      {!loading && services.map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 0', borderBottom: '1px solid var(--port-bord)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--port-t)' }}>{s.name}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.15em', color: 'var(--brass)', textTransform: 'uppercase' }}>{s.tag}</span>
              {!s.active && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, color: 'var(--stone)', border: '1px solid var(--port-bord)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>inactive</span>
              )}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 2 }}>
              E{s.price} · {s.duration} min
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={() => toggleActive(s)} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset' }}>
              {s.active ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => openEdit(s)} className="pbg" style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset' }}>Edit</button>
            <button
              onClick={() => setDeleteTarget(s)}
              style={{ fontSize: 8, padding: '4px 8px', minHeight: 'unset', background: 'rgba(248,113,113,.1)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--bord2)', borderRadius: 12, padding: 28, maxWidth: 340, width: '90%', textAlign: 'center', animation: 'windowIn .25s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 600, marginBottom: 8 }}>Delete Service?</div>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.6 }}>
              Remove <strong style={{ color: 'var(--parch)' }}>{deleteTarget.name}</strong> from the pricelist? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteTarget(null)} className="pbg" style={{ padding: '9px 20px' }}>Cancel</button>
              <button
                onClick={confirmDelete}
                style={{ background: '#f87171', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 6, fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.1em', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
