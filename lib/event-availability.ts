import { useEffect, useState } from 'react';
import type { EventConfig } from './supabase';

export type EventAvailability =
  | 'loading'
  | 'upcoming'
  | 'open'
  | 'closed'
  | 'unavailable';
export const REGISTRATION_DEADLINE = '2026-09-27T23:59:59+05:30';
export type ConfirmedRaceFees = Record<'5' | '10' | '21', number>;
export const MAX_PAYMENT_QR_BYTES = 5 * 1024 * 1024;

/** Only a complete, unambiguous event price list can authorize live payments. */
export function resolveConfirmedRaceFees(
  rows: unknown,
  eventId = 'suratgarh-2026',
): ConfirmedRaceFees | null {
  if (!Array.isArray(rows) || rows.length !== 3) return null;
  const fees: Partial<ConfirmedRaceFees> = {};
  for (const row of rows) {
    if (
      !row ||
      row.event_id !== eventId ||
      !['5', '10', '21'].includes(row.race) ||
      !Number.isSafeInteger(row.fee_paise) ||
      row.fee_paise <= 0 ||
      Object.hasOwn(fees, row.race)
    )
      return null;
    fees[row.race as keyof ConfirmedRaceFees] = row.fee_paise / 100;
  }
  return fees as ConfirmedRaceFees;
}

/** Bound both advertised and actual bytes, including chunked/incorrect-length responses. */
export async function readPaymentQrBlob(response: Response): Promise<Blob> {
  const declaredLength = response.headers.get('content-length');
  if (
    !response.ok ||
    (declaredLength !== null && Number(declaredLength) > MAX_PAYMENT_QR_BYTES)
  ) {
    await response.body?.cancel().catch(() => {});
    throw new Error('QR response is unavailable or exceeds 5 MB');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('QR response has no image body');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PAYMENT_QR_BYTES)
        throw new Error('QR response exceeds 5 MB');
      chunks.push(new Uint8Array(value));
    }
    if (!size) throw new Error('QR response is empty');
    return new Blob(chunks, {
      type: response.headers.get('content-type') || '',
    });
  } catch (failure) {
    await reader.cancel().catch(() => {});
    throw failure;
  } finally {
    reader.releaseLock();
  }
}

export function isUsablePaymentQrUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.pathname.toLowerCase().endsWith('/payment-placeholder.svg')
    );
  } catch {
    return false;
  }
}

/** A missing backend is a preview; incomplete or unreadable live settings never enable payment. */
export function resolveEventAvailability(
  config: EventConfig | null,
  {
    loading = false,
    failed = false,
    now = Date.now(),
    raceConfig = null,
  }: {
    loading?: boolean;
    failed?: boolean;
    now?: number;
    raceConfig?: unknown;
  } = {},
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
    !isUsablePaymentQrUrl(config.payment_qr_url) ||
    !config.payee_name?.trim() ||
    !config.upi_id?.trim() ||
    !resolveConfirmedRaceFees(raceConfig, config.id)
  )
    return 'unavailable';
  return 'open';
}

export function useEventAvailability() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [raceConfig, setRaceConfig] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let alive = true;
    let latestRequest = 0;
    // Load the client only in the effect so the pure state resolver also works outside the browser.
    async function refresh() {
      const request = ++latestRequest;
      setLoading(true);
      try {
        const { supabase } = await import('./supabase');
        if (!supabase) {
          if (alive && request === latestRequest) {
            setConfig(null);
            setRaceConfig(null);
            setFailed(false);
          }
          return;
        }
        const [event, races] = await Promise.all([
          supabase
            .from('event_config')
            .select('*')
            .eq('id', 'suratgarh-2026')
            .single(),
          supabase
            .from('race_config')
            .select('event_id,race,fee_paise')
            .eq('event_id', 'suratgarh-2026'),
        ]);
        if (alive && request === latestRequest) {
          // Preserve the last event identity on a failed refresh, but never its payment authority.
          if (!event.error && event.data) setConfig(event.data);
          setRaceConfig(races.data);
          setFailed(!!event.error || !event.data || !!races.error);
        }
      } catch {
        if (alive && request === latestRequest) setFailed(true);
      } finally {
        if (alive && request === latestRequest) {
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
    confirmedFees: failed
      ? null
      : resolveConfirmedRaceFees(raceConfig, config?.id),
    availability: resolveEventAvailability(config, {
      loading,
      failed,
      now,
      raceConfig,
    }),
  };
}
