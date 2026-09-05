import { useEffect, useState } from 'react';
import type { EventConfig } from './supabase';

export type EventAvailability =
  | 'loading'
  | 'upcoming'
  | 'open'
  | 'closed'
  | 'unavailable';
export const REGISTRATION_DEADLINE = '2026-09-27T23:59:59+05:30';

/** A missing backend is a preview; incomplete or unreadable live settings never enable payment. */
export function resolveEventAvailability(
  config: EventConfig | null,
  {
    loading = false,
    failed = false,
    now = Date.now(),
  }: { loading?: boolean; failed?: boolean; now?: number } = {},
): EventAvailability {
  if (loading) return 'loading';
  if (failed) return 'unavailable';
  const deadline = Date.parse(
    config ? config.registration_deadline : REGISTRATION_DEADLINE,
  );
  if (!Number.isFinite(deadline)) return 'unavailable';
  if (now > deadline) return 'closed';
  if (!config?.registration_open || !config.payment_configured)
    return 'upcoming';
  if (
    !config.payment_qr_url?.startsWith('https://') ||
    !config.payee_name?.trim() ||
    !config.upi_id?.trim()
  )
    return 'unavailable';
  return 'open';
}

export function useEventAvailability() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let alive = true;
    // Load the client only in the effect so the pure state resolver also works outside the browser.
    async function refresh() {
      try {
        const { supabase } = await import('./supabase');
        if (!supabase) {
          if (alive) {
            setConfig(null);
            setFailed(false);
          }
          return;
        }
        const { data, error } = await supabase
          .from('event_config')
          .select('*')
          .eq('id', 'suratgarh-2026')
          .single();
        if (alive) {
          setConfig(data);
          setFailed(!!error || !data);
        }
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const deadline = Date.parse(
      config ? config.registration_deadline : REGISTRATION_DEADLINE,
    );
    if (!Number.isFinite(deadline) || now > deadline) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(deadline - now + 1, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [config, now]);

  return {
    config,
    availability: resolveEventAvailability(config, { loading, failed, now }),
  };
}
