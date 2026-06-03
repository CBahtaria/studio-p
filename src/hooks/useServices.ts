import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/types';

const FALLBACK: Service[] = [
  { id:'01', name:'Fade',                 description:'Precision skin fade.',                    tag:'Basic',     price:50,  priceCents:5000,  duration:30, active:true },
  { id:'02', name:'Brush cut',            description:'Clean brush cut with shape.',              tag:'Classic',   price:40,  priceCents:4000,  duration:35, active:true },
  { id:'03', name:'Chiskop',              description:'Neat chiskop style.',                      tag:'Classic',   price:40,  priceCents:4000,  duration:35, active:true },
  { id:'04', name:'Fiber+Fade',           description:'Fiber texture with fade blend.',           tag:'Premium',   price:60,  priceCents:6000,  duration:45, active:true },
  { id:'05', name:'Brush+Fiber',          description:'Brush cut with fiber finish.',             tag:'Premium',   price:50,  priceCents:5000,  duration:40, active:true },
  { id:'06', name:'Fiber',               description:'Fiber texture styling.',                   tag:'Quick',     price:15,  priceCents:1500,  duration:20, active:true },
  { id:'07', name:'Afro Fade+Black dye', description:'Afro fade with black dye application.',   tag:'Premium',   price:100, priceCents:10000, duration:60, active:true },
  { id:'08', name:'Skin fade+Black dye', description:'Skin fade with black dye.',               tag:'Premium',   price:60,  priceCents:6000,  duration:45, active:true },
  { id:'09', name:'Mid fade+Black dye',  description:'Mid fade with black dye application.',    tag:'Premium',   price:80,  priceCents:8000,  duration:50, active:true },
  { id:'10', name:'Bleach only',         description:'Hair bleach treatment.',                   tag:'Treatment', price:100, priceCents:10000, duration:60, active:true },
  { id:'11', name:'Bleach+Color',        description:'Bleach with color application.',           tag:'Premium',   price:180, priceCents:18000, duration:90, active:true },
  { id:'12', name:'Ecurl',              description:'Ecurl styling service.',                   tag:'Premium',   price:150, priceCents:15000, duration:75, active:true },
  { id:'13', name:'Streaming',           description:'Hair streaming treatment.',                tag:'Quick',     price:15,  priceCents:1500,  duration:20, active:true },
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
