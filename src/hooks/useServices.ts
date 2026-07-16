import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/types';

const FALLBACK: Service[] = [
  { id:'01', name:'Signature Fade',     description:'Precision skin fade, tailored to your face shape.', tag:'Signature', price:120, priceCents:12000, duration:45, active:true },
  { id:'02', name:'Taper & Define',     description:'Timeless taper with surgical edges.',                 tag:'Classic',   price:100, priceCents:10000, duration:40, active:true },
  { id:'03', name:'Beard Architecture', description:'Hot towel, sculpt, line-up.',                          tag:'Grooming',  price:80,  priceCents:8000,  duration:30, active:true },
  { id:'04', name:'Full Package',       description:'Cut + Beard + Skin ritual.',                           tag:'Premium',   price:220, priceCents:22000, duration:90, active:true },
  { id:'05', name:'Youth Cut',          description:'Clean cuts for the next generation.',                  tag:'Youth',     price:60,  priceCents:6000,  duration:30, active:true },
  { id:'06', name:'Edge & Line-Up',     description:'Sharp lines, no compromises.',                         tag:'Quick',     price:60,  priceCents:6000,  duration:20, active:true },
];

export function useServices(includeInactive = false) {
  const [services, setServices] = useState<Service[]>(FALLBACK);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('services').select('*').order('price_swl');
      if (!includeInactive) q = q.eq('active', true);
      const { data, error: err } = await q;
      if (err) throw err;
      if (data && data.length > 0) {
        setServices(data.map(r => ({
          id: String(r.id ?? ''),
          name: String(r.name ?? 'Unnamed Service'),
          description: r.description ?? '',
          tag: String(r.tag ?? ''),
          price: typeof r.price_swl === 'number' ? r.price_swl / 100 : 0,
          priceCents: typeof r.price_swl === 'number' ? r.price_swl : 0,
          duration: typeof r.duration_minutes === 'number' ? r.duration_minutes : 0,
          active: r.active ?? false,
        })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Keep FALLBACK data — service stays usable offline
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { load(); }, [load]);
  return { services, loading, error, reload: load };
}
