'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Clock3,
  Flag,
  ShieldCheck,
  FileCheck2,
  Download,
  RefreshCw,
  ArrowRight,
  LockKeyhole,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import {
  elapsedClockSeconds,
  formatFinishTime,
  parseFinishTime,
  TIMING_LABELS,
  isPrizeCandidate,
  type RaceDistance,
  type TimingProvenance,
} from '@/lib/event-day';
import type { User } from '@supabase/supabase-js';
import './event-portal.css';

type Result = {
  elapsed_seconds: number;
  provenance: TimingProvenance;
  status: string;
  note: string;
  certificate_hold: boolean;
  revision: number;
  prize_eligible: boolean;
};
type Entry = {
  id: string;
  registration_number: string | null;
  full_name: string;
  race: RaceDistance;
  gender: string;
  payment_status: string;
  fee_paise: number;
  tshirt: string;
  transaction_id: string | null;
  receipt_path: string | null;
  result: Result | null;
  certificates: {
    id: string;
    certificate_number: string;
    kind: string;
    status: string;
  }[];
};
type Finish = {
  id: string;
  race: RaceDistance;
  captured_at: string;
  elapsed_ms: number;
  captured_by: string;
};
type Snapshot = {
  server_now: string;
  is_organiser: boolean;
  timing_enabled: boolean;
  self_submission_open: boolean;
  certificates_configured: boolean;
  clocks: { race: RaceDistance; started_at: string }[];
  registrations: Entry[];
  unassigned_finishes: Finish[];
};
type PortalView = 'participant' | 'organiser' | 'verify';
const races: RaceDistance[] = ['5', '10', '21'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resultLabels: Record<string, string> = {
  participant_submitted: 'Time submitted',
  organiser_recorded: 'Recorded by finish official',
  verified: 'Verified',
  correction_required: 'Correction required',
  locked: 'Result locked',
};
function ContactHelp() {
  return (
    <span>
      Organiser help: <a href="tel:+918838463776">88384 63776</a> /{' '}
      <a href="tel:+917027964880">70279 64880</a>
    </span>
  );
}

export function EventPortal({
  onClose,
  initialView = 'participant',
  onViewChange,
}: {
  onClose?: () => void;
  initialView?: PortalView;
  onViewChange?: (view: PortalView) => void;
}) {
  const [view, setView] = useState<PortalView>(initialView),
    [user, setUser] = useState<User | null>(null),
    [authLoading, setAuthLoading] = useState(!!supabase);
  const [email, setEmail] = useState(''),
    [otp, setOtp] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [offset, setOffset] = useState(0),
    [lastSync, setLastSync] = useState(0),
    [now, setNow] = useState(Date.now),
    [race, setRace] = useState<RaceDistance>('5');
  const [search, setSearch] = useState(''),
    [selected, setSelected] = useState(''),
    [time, setTime] = useState(''),
    [reviewing, setReviewing] = useState(false),
    [note, setNote] = useState(''),
    [hold, setHold] = useState(false),
    [reviewRevision, setReviewRevision] = useState<number | null>(null);
  const [associations, setAssociations] = useState<Record<string, string>>({}),
    [proof, setProof] = useState(''),
    [download, setDownload] = useState<{ url: string; number: string } | null>(
      null,
    );
  const [pendingCapture, setPendingCapture] = useState<{
    request_id: string;
    race: RaceDistance;
    device_captured_at: string;
  } | null>(null);
  const startKeys = useRef<Record<string, string>>({}),
    errorRef = useRef<HTMLParagraphElement>(null),
    snapshotRequest = useRef(0),
    snapshotUser = useRef<string | null>(null);
  const [verificationToken, setVerificationToken] = useState(
      () =>
        new URLSearchParams(window.location.search).get('certificate') || '',
    ),
    [verification, setVerification] = useState<Record<string, unknown> | null>(
      null,
    );
  const activeEntry = snapshot?.registrations.find(
    (entry) => entry.id === selected,
  );
  const isOrganiser = !!snapshot?.is_organiser;
  const currentClock = snapshot?.clocks.find((clock) => clock.race === race);
  const elapsed = elapsedClockSeconds(
    currentClock?.started_at || null,
    now + offset,
  );

  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  function changeView(next: PortalView) {
    if (next === view) return;
    setView(next);
    onViewChange?.(next);
  }
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(
      ({ data }) => {
        if (alive) {
          setUser(data.session?.user || null);
          setAuthLoading(false);
        }
      },
      () => {
        if (alive) setAuthLoading(false);
      },
    );
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user || null);
        setAuthLoading(false);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (error) {
      const frame = requestAnimationFrame(() => errorRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [error]);
  async function refresh() {
    if (!supabase || !user) return null;
    const before = Date.now(),
      request = ++snapshotRequest.current;
    const { data, error: failure } = await supabase.rpc('event_day', {
      p_action: 'snapshot',
      p_payload: {},
    });
    if (snapshotUser.current !== user.id || request !== snapshotRequest.current)
      return null;
    if (failure) {
      setError(
        'The event portal could not load. Its backend setup may still be pending; please retry or contact the organising team.',
      );
      return;
    }
    const after = Date.now();
    setSnapshot(data);
    setOffset(Date.parse(data.server_now) - (before + after) / 2);
    setLastSync(after);
    return data as Snapshot;
  }
  useEffect(() => {
    snapshotUser.current = user?.id || null;
    snapshotRequest.current++;
    setSnapshot(null);
    setSelected('');
    setProof('');
    setDownload(null);
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [user]);
  useEffect(() => {
    setTime(
      activeEntry?.result
        ? formatFinishTime(activeEntry.result.elapsed_seconds)
        : '',
    );
    setReviewing(false);
    setNote('');
    setHold(activeEntry?.result?.certificate_hold || false);
    setReviewRevision(activeEntry?.result?.revision || null);
    setDownload(null);
  }, [selected]);
  async function run(action: string, payload: Record<string, unknown> = {}) {
    if (!supabase) return null;
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const { data, error: failure } = await supabase.rpc('event_day', {
        p_action: action,
        p_payload: payload,
      });
      if (failure) throw new Error(failure.message);
      await refresh();
      return data;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The action could not be saved. Please retry.',
      );
      return null;
    } finally {
      setBusy('');
    }
  }
  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy('auth');
    setError('');
    try {
      if (sent) {
        const { error: failure } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          type: 'email',
        });
        if (failure) throw failure;
        setSent(false);
        setOtp('');
      } else {
        const { error: failure } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });
        if (failure) throw failure;
        setSent(true);
        setMessage(
          'Check the inbox used for your registration or organiser account.',
        );
      }
    } catch {
      setError(
        sent
          ? 'That code is invalid or expired. Request a new code.'
          : 'We could not send a code. Use your registered email or contact an organiser.',
      );
    } finally {
      setBusy('');
    }
  }
  async function capture() {
    const payload = pendingCapture || {
      request_id: crypto.randomUUID(),
      race,
      device_captured_at: new Date().toISOString(),
    };
    setPendingCapture(payload);
    const data = await run('capture_finish', payload);
    if (data) {
      setPendingCapture(null);
      setMessage(
        `Finish recorded at ${formatFinishTime(data.elapsed_ms / 1000)}. Associate the participant below.`,
      );
    }
  }
  async function certificate(entry: Entry) {
    if (!supabase) return;
    setBusy('certificate');
    setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke(
        'certificate',
        { body: { registration_id: entry.id, kind: 'completion' } },
      );
      if (failure) {
        let description =
          'Certificate generation is awaiting approved setup or organiser release.';
        try {
          const detail = await failure.context?.json();
          if (detail?.error) description = detail.error;
        } catch {}
        throw new Error(description);
      }
      setDownload({ url: data.download_url, number: data.certificate_number });
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Certificate could not be prepared.',
      );
    } finally {
      setBusy('');
    }
  }
  async function showProof(entry: Entry) {
    if (!supabase || !entry.receipt_path) return;
    setBusy('proof');
    setError('');
    const { data, error: failure } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(entry.receipt_path, 120);
    setBusy('');
    if (failure) setError('The private payment proof could not be opened.');
    else setProof(data.signedUrl);
  }
  async function verify(event?: FormEvent) {
    event?.preventDefault();
    if (!supabase) return;
    if (!uuid.test(verificationToken.trim())) {
      setError('Enter the verification token from the certificate QR link.');
      return;
    }
    setBusy('verify');
    setError('');
    const { data, error: failure } = await supabase.rpc('verify_certificate', {
      p_token: verificationToken.trim(),
    });
    setBusy('');
    if (failure) setError('Certificate verification is currently unavailable.');
    else setVerification(data);
  }
  useEffect(() => {
    if (initialView === 'verify' && uuid.test(verificationToken) && supabase)
      void verify();
  }, []);
  function exportCSV() {
    if (!snapshot?.is_organiser) return;
    const rows = [
      [
        'Registration ID',
        'Name',
        'Race KM',
        'Gender',
        'T-shirt',
        'Payment status',
        'Fee INR',
        'Finish time',
        'Timing source',
        'Result status',
      ],
      ...snapshot.registrations.map((entry) => [
        entry.registration_number || entry.id,
        entry.full_name,
        entry.race,
        entry.gender,
        entry.tshirt,
        entry.payment_status,
        String(entry.fee_paise / 100),
        entry.result ? formatFinishTime(entry.result.elapsed_seconds) : '',
        entry.result?.provenance || '',
        entry.result?.status || '',
      ]),
    ];
    const cell = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'suratgarh-event-register.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const rows = (snapshot?.registrations || []).filter((entry) =>
    `${entry.full_name} ${entry.registration_number || entry.id}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent className="event-portal" showCloseButton={!!onClose}>
        <div className="portal-header">
          <span className="portal-eyebrow">DESERT BRAVES · SURATGARH</span>
          <DialogTitle>
            {view === 'organiser'
              ? 'Organiser console'
              : view === 'verify'
                ? 'Certificate verification'
                : 'My race desk'}
          </DialogTitle>
          <DialogDescription>
            Your entry, finish time and certificate.
          </DialogDescription>
        </div>
        <nav className="portal-tabs" aria-label="Portal sections">
          <button
            aria-current={view === 'participant' ? 'page' : undefined}
            onClick={() => changeView('participant')}
          >
            My event
          </button>
          <button
            aria-current={view === 'organiser' ? 'page' : undefined}
            onClick={() => changeView('organiser')}
          >
            Organiser
          </button>
          <button
            aria-current={view === 'verify' ? 'page' : undefined}
            onClick={() => changeView('verify')}
          >
            Verify certificate
          </button>
        </nav>
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="portal-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="portal-message">
            {message}
          </p>
        )}
        {!supabase ? (
          <div className="portal-notice">
            <LockKeyhole />
            <h3>
              {view === 'verify'
                ? 'Certificate verification is not available yet'
                : view === 'organiser'
                  ? 'Organiser console setup is pending'
                  : 'Your race desk opens soon.'}
            </h3>
            <p>
              {view === 'verify'
                ? 'Verification will be available when certificates are issued. Scan the QR on your certificate to check its details.'
                : view === 'organiser'
                  ? 'Connect the approved event services and organiser accounts before using payment review or finish recording.'
                  : 'Registration has not opened yet. Your entries and results will appear here when available.'}
            </p>
          </div>
        ) : view === 'verify' ? (
          <section className="portal-panel">
            <h3>Verify a certificate</h3>
            <p>
              Scan the certificate’s QR or paste its verification token below.
              No sign-in is needed.
            </p>
            <form className="portal-form" onSubmit={verify}>
              <label>
                Verification token
                <input
                  value={verificationToken}
                  onChange={(event) => setVerificationToken(event.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder="Token from the certificate QR link"
                />
              </label>
              <button className="portal-button" disabled={!!busy}>
                Verify certificate <ShieldCheck size={17} />
              </button>
            </form>
            {verification && (
              <div className="portal-verification">
                <h4>
                  {verification.status === 'valid'
                    ? 'Certificate valid'
                    : verification.status === 'revoked'
                      ? 'Certificate revoked'
                      : verification.status === 'not_ready'
                        ? 'Certificate not issued yet'
                        : 'Certificate not found'}
                </h4>
                {!!verification.certificate_number && (
                  <>
                    <p>
                      {String(verification.participant_name)} ·{' '}
                      {String(verification.race)} KM
                    </p>
                    <p>
                      {String(verification.certificate_number)} ·{' '}
                      {String(verification.event_date)}
                    </p>
                    <p>
                      {String(verification.kind)} certificate ·{' '}
                      {formatFinishTime(Number(verification.elapsed_seconds))}
                    </p>
                    <small>
                      {
                        TIMING_LABELS[
                          verification.timing_provenance as TimingProvenance
                        ]
                      }{' '}
                      · Approved visual signature
                    </small>
                  </>
                )}
              </div>
            )}
          </section>
        ) : authLoading ? (
          <p className="portal-notice">Checking your sign-in…</p>
        ) : !user ? (
          <section className="portal-panel">
            <h3>
              {view === 'organiser' ? 'Authorised officials' : 'Welcome back'}
            </h3>
            <p>
              Use your registered email. Organiser access is checked against the
              station’s approved account list.
            </p>
            <form className="portal-form" onSubmit={signIn}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  readOnly={sent}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              {sent && (
                <label>
                  Email sign-in code
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,10}"
                    required
                  />
                </label>
              )}
              <button className="portal-button" disabled={!!busy}>
                {sent ? 'Verify email' : 'Send sign-in code'}{' '}
                <ArrowRight size={17} />
              </button>
              {sent && (
                <button
                  type="button"
                  className="portal-link"
                  onClick={() => {
                    setSent(false);
                    setOtp('');
                  }}
                >
                  Change email / request another code
                </button>
              )}
            </form>
          </section>
        ) : (
          <>
            <div className="portal-account">
              <span>{user.email}</span>
              <button
                className="portal-link"
                disabled={!!busy}
                onClick={async () => {
                  await supabase?.auth.signOut();
                  setUser(null);
                }}
              >
                Sign out
              </button>
              <button
                className="portal-link"
                onClick={async () => {
                  const data = await refresh();
                  if (!data) return;
                  const entry = data.registrations.find(
                    (item) => item.id === selected,
                  );
                  setReviewRevision(entry?.result?.revision || null);
                  setTime(
                    entry?.result
                      ? formatFinishTime(entry.result.elapsed_seconds)
                      : '',
                  );
                  setHold(entry?.result?.certificate_hold || false);
                  setNote('');
                  setError('');
                }}
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
            {!snapshot ? (
              <p className="portal-notice">
                {error
                  ? 'Portal data is unavailable. Your existing registration is unchanged.'
                  : 'Loading your event…'}
              </p>
            ) : (
              <>
                <section className="portal-clock-panel">
                  <div className="portal-row">
                    <h3>
                      <Clock3 size={19} /> Category clock
                    </h3>
                    <select
                      aria-label="Clock category"
                      value={race}
                      disabled={!!pendingCapture}
                      onChange={(event) =>
                        setRace(event.target.value as RaceDistance)
                      }
                    >
                      {races.map((distance) => (
                        <option value={distance} key={distance}>
                          {distance} KM
                        </option>
                      ))}
                    </select>
                  </div>
                  <strong className="portal-clock">
                    {elapsed === null ? '--:--:--' : formatFinishTime(elapsed)}
                  </strong>
                  <p>
                    {currentClock
                      ? 'Elapsed from the recorded category start'
                      : 'This category has not started.'}
                  </p>
                  <small>
                    {lastSync
                      ? `Last server sync ${Math.max(0, Math.floor((now - lastSync) / 1000))}s ago. Display is an estimate; saved finish marks use server receipt time.`
                      : 'Waiting for server sync.'}
                  </small>
                </section>
                {view === 'organiser' ? (
                  !isOrganiser ? (
                    <div className="portal-notice">
                      <ShieldCheck />
                      <h3>Organiser access is not enabled for this account.</h3>
                      <p>
                        Use the email authorised by the station event
                        administrator.
                      </p>
                      <ContactHelp />
                    </div>
                  ) : (
                    <>
                      <div className="portal-stats">
                        <span>
                          <b>{snapshot.registrations.length}</b> entries
                        </span>
                        <span>
                          <b>
                            {
                              snapshot.registrations.filter(
                                (entry) => entry.payment_status === 'verified',
                              ).length
                            }
                          </b>{' '}
                          confirmed
                        </span>
                        <span>
                          <b>
                            {
                              snapshot.registrations.filter(
                                (entry) => !!entry.result,
                              ).length
                            }
                          </b>{' '}
                          finish results
                        </span>
                        <span>
                          <b>
                            {
                              snapshot.registrations.filter((entry) =>
                                entry.certificates.some(
                                  (cert) => cert.status === 'ready',
                                ),
                              ).length
                            }
                          </b>{' '}
                          certificates
                        </span>
                      </div>
                      <section className="portal-panel">
                        <h3>Finish console</h3>
                        {!snapshot.timing_enabled ? (
                          <p className="portal-notice">
                            Timing has not been enabled by the event
                            administrator. Conduct a station rehearsal before
                            race day.
                          </p>
                        ) : !currentClock ? (
                          <button
                            className="portal-button"
                            disabled={!!busy}
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Start the official ${race} KM clock now? It cannot be reset from the portal.`,
                                )
                              )
                                return;
                              startKeys.current[race] ||= crypto.randomUUID();
                              await run('start_clock', {
                                race,
                                request_id: startKeys.current[race],
                              });
                            }}
                          >
                            Start {race} KM clock <Flag size={18} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="portal-finish-button"
                              disabled={!!busy}
                              onClick={capture}
                            >
                              {pendingCapture
                                ? 'RETRY FINISH CAPTURE'
                                : `FINISH · ${race} KM`}
                            </button>
                            <p>
                              Record the timestamp first, then associate the
                              confirmed runner. Network delay affects
                              server-recorded time; maintain a finish-line
                              backup list for disputes.
                            </p>
                          </>
                        )}
                        {snapshot.unassigned_finishes
                          .filter((mark) => mark.race === race)
                          .map((mark) => (
                            <div className="portal-finish-mark" key={mark.id}>
                              <strong>
                                {formatFinishTime(mark.elapsed_ms / 1000)}
                              </strong>
                              <small>
                                Unassigned finish ·{' '}
                                {new Date(mark.captured_at).toLocaleTimeString(
                                  'en-IN',
                                )}
                              </small>
                              <select
                                aria-label={`Participant for finish at ${formatFinishTime(mark.elapsed_ms / 1000)}`}
                                value={associations[mark.id] || ''}
                                onChange={(event) =>
                                  setAssociations((current) => ({
                                    ...current,
                                    [mark.id]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">
                                  Choose registration ID / participant
                                </option>
                                {snapshot.registrations
                                  .filter(
                                    (entry) =>
                                      entry.race === mark.race &&
                                      entry.payment_status === 'verified' &&
                                      (!entry.result ||
                                        entry.result.provenance ===
                                          'participant_submitted'),
                                  )
                                  .map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.registration_number} ·{' '}
                                      {entry.full_name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                className="portal-button secondary"
                                disabled={!!busy || !associations[mark.id]}
                                onClick={() =>
                                  run('associate_finish', {
                                    finish_id: mark.id,
                                    registration_id: associations[mark.id],
                                  })
                                }
                              >
                                Associate runner
                              </button>
                            </div>
                          ))}
                      </section>
                      <section className="portal-panel">
                        <div className="portal-row">
                          <h3>Registrations & review</h3>
                          <button className="portal-link" onClick={exportCSV}>
                            <Download size={16} /> CSV
                          </button>
                        </div>
                        <label className="portal-search">
                          Find a participant
                          <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Name or registration ID"
                          />
                        </label>
                        <div className="portal-entry-list">
                          {rows.map((entry) => (
                            <button
                              className={
                                selected === entry.id ? 'selected' : ''
                              }
                              key={entry.id}
                              onClick={() => setSelected(entry.id)}
                            >
                              <span>
                                <b>{entry.full_name}</b>
                                <small>
                                  {entry.registration_number ||
                                    'Awaiting confirmation'}{' '}
                                  · {entry.race} KM · {entry.tshirt}
                                </small>
                              </span>
                              <span>
                                {entry.payment_status === 'verified'
                                  ? 'Confirmed'
                                  : entry.payment_status === 'rejected'
                                    ? 'Payment rejected'
                                    : 'Review payment'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                      {activeEntry && (
                        <section className="portal-panel">
                          <h3>
                            {activeEntry.full_name} · {activeEntry.race} KM
                          </h3>
                          <p>
                            {activeEntry.registration_number || activeEntry.id}
                          </p>
                          <div className="portal-row">
                            <p>
                              ₹{activeEntry.fee_paise / 100} · UTR{' '}
                              {activeEntry.transaction_id}
                            </p>
                            <button
                              className="portal-link"
                              disabled={!!busy}
                              onClick={() => showProof(activeEntry)}
                            >
                              View private payment proof
                            </button>
                          </div>
                          {activeEntry.payment_status === 'pending_review' && (
                            <>
                              <label>
                                Review note
                                <textarea
                                  value={note}
                                  onChange={(event) =>
                                    setNote(event.target.value)
                                  }
                                  maxLength={1000}
                                  placeholder="Compare the bank/UPI record, payee, amount and transaction reference."
                                />
                              </label>
                              <div className="portal-actions">
                                <button
                                  className="portal-button"
                                  disabled={!!busy}
                                  onClick={() =>
                                    run('review_payment', {
                                      registration_id: activeEntry.id,
                                      status: 'verified',
                                      note,
                                    })
                                  }
                                >
                                  Confirm payment
                                </button>
                                <button
                                  className="portal-button secondary"
                                  disabled={!!busy || note.trim().length < 5}
                                  onClick={() =>
                                    run('review_payment', {
                                      registration_id: activeEntry.id,
                                      status: 'rejected',
                                      note,
                                    })
                                  }
                                >
                                  Reject / explain correction
                                </button>
                              </div>
                              <small>
                                Uploading proof alone is not payment
                                confirmation. Reviewed decisions cannot be
                                reversed here.
                              </small>
                            </>
                          )}
                          {activeEntry.result && (
                            <>
                              <h4>Result review</h4>
                              <p>
                                {TIMING_LABELS[activeEntry.result.provenance]} ·{' '}
                                {resultLabels[activeEntry.result.status]}
                              </p>
                              <label>
                                Finish time
                                <input
                                  value={time}
                                  onChange={(event) =>
                                    setTime(event.target.value)
                                  }
                                  disabled={
                                    activeEntry.result.status === 'locked'
                                  }
                                  placeholder="HH:MM:SS"
                                  inputMode="numeric"
                                />
                              </label>
                              <label>
                                Evidence / review note
                                <textarea
                                  value={note}
                                  onChange={(event) =>
                                    setNote(event.target.value)
                                  }
                                  maxLength={1000}
                                  disabled={
                                    activeEntry.result.status === 'locked'
                                  }
                                  placeholder="State how this time was checked. Self-reported times alone cannot determine cash prizes."
                                />
                              </label>
                              <label className="portal-check">
                                <input
                                  type="checkbox"
                                  checked={hold}
                                  onChange={(event) =>
                                    setHold(event.target.checked)
                                  }
                                  disabled={
                                    activeEntry.result.status === 'locked'
                                  }
                                />{' '}
                                Hold certificate pending review
                              </label>
                              <div className="portal-actions">
                                {[
                                  ['verified', 'Verify result'],
                                  ['correction_required', 'Request correction'],
                                  ['locked', 'Lock result'],
                                ].map(([status, label]) => (
                                  <button
                                    key={status}
                                    className="portal-button secondary"
                                    disabled={
                                      !!busy ||
                                      activeEntry.result?.status === 'locked' ||
                                      note.trim().length < 5
                                    }
                                    onClick={async () => {
                                      try {
                                        const seconds = parseFinishTime(time);
                                        if (
                                          status === 'locked' &&
                                          !window.confirm(
                                            'Lock this reviewed result? Further edits will require the database administrator.',
                                          )
                                        )
                                          return;
                                        const updated = await run(
                                          'review_result',
                                          {
                                            registration_id: activeEntry.id,
                                            status,
                                            note,
                                            elapsed_seconds: seconds,
                                            certificate_hold: hold,
                                            expected_revision: reviewRevision,
                                          },
                                        );
                                        if (updated) {
                                          setReviewRevision(updated.revision);
                                          setTime(
                                            formatFinishTime(
                                              updated.elapsed_seconds,
                                            ),
                                          );
                                          setHold(updated.certificate_hold);
                                        }
                                      } catch (failure) {
                                        setError((failure as Error).message);
                                      }
                                    }}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </section>
                      )}
                      <section className="portal-panel">
                        <h3>Leading reviewed times</h3>
                        <p>
                          These are review candidates, not declared awards.
                          Officials must resolve ties and confirm eligibility.
                        </p>
                        <div className="portal-divisions">
                          {races.flatMap((distance) =>
                            ['male', 'female'].map((gender) => {
                              const candidates = snapshot.registrations
                                .filter(
                                  (entry) =>
                                    entry.race === distance &&
                                    entry.gender === gender &&
                                    isPrizeCandidate(entry.result),
                                )
                                .sort(
                                  (a, b) =>
                                    a.result!.elapsed_seconds -
                                    b.result!.elapsed_seconds,
                                )
                                .slice(0, 3);
                              return (
                                <div key={distance + gender}>
                                  <h4>
                                    {distance} KM ·{' '}
                                    {gender === 'male' ? 'Men' : 'Women'}{' '}
                                    overall
                                  </h4>
                                  {candidates.length ? (
                                    candidates.map((entry) => (
                                      <p key={entry.id}>
                                        {entry.full_name}{' '}
                                        <b>
                                          {formatFinishTime(
                                            entry.result!.elapsed_seconds,
                                          )}
                                        </b>
                                      </p>
                                    ))
                                  ) : (
                                    <p>No reviewed candidates yet.</p>
                                  )}
                                </div>
                              );
                            }),
                          )}
                        </div>
                      </section>
                    </>
                  )
                ) : (
                  <section className="portal-panel">
                    <h3>My registrations</h3>
                    {snapshot.registrations.length === 0 ? (
                      <p>
                        No registrations are linked to this email. Use the email
                        entered during registration.
                      </p>
                    ) : (
                      <>
                        <label>
                          Choose your participant
                          <select
                            value={selected}
                            onChange={(event) =>
                              setSelected(event.target.value)
                            }
                          >
                            <option value="">
                              Choose registration / participant
                            </option>
                            {snapshot.registrations.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.registration_number || 'Pending payment'}{' '}
                                · {entry.full_name} · {entry.race} KM
                              </option>
                            ))}
                          </select>
                        </label>
                        {activeEntry && (
                          <div className="portal-participant">
                            <h4>{activeEntry.full_name}</h4>
                            <p>
                              {activeEntry.registration_number ||
                                'Registration ID is assigned after payment confirmation'}{' '}
                              · {activeEntry.race} KM
                            </p>
                            <p className="portal-status">
                              {activeEntry.payment_status === 'verified'
                                ? 'Registration confirmed'
                                : activeEntry.payment_status === 'rejected'
                                  ? 'Payment needs correction — contact organisers'
                                  : 'Payment verification pending'}
                            </p>
                            {activeEntry.result && (
                              <div className="portal-result">
                                <strong>
                                  {formatFinishTime(
                                    activeEntry.result.elapsed_seconds,
                                  )}
                                </strong>
                                <span>
                                  {TIMING_LABELS[activeEntry.result.provenance]}{' '}
                                  · {resultLabels[activeEntry.result.status]}
                                </span>
                                {activeEntry.result.note && (
                                  <p>{activeEntry.result.note}</p>
                                )}
                              </div>
                            )}
                            {activeEntry.payment_status === 'verified' &&
                              (!activeEntry.result ||
                                (activeEntry.result.status ===
                                  'correction_required' &&
                                  activeEntry.result.provenance ===
                                    'participant_submitted')) && (
                                <form
                                  className="portal-form"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    try {
                                      const seconds = parseFinishTime(time);
                                      if (!reviewing) {
                                        setReviewing(true);
                                        return;
                                      }
                                      const data = await run('self_time', {
                                        registration_id: activeEntry.id,
                                        elapsed_seconds: seconds,
                                      });
                                      if (data) {
                                        setReviewing(false);
                                        setMessage(
                                          'Your finish time is saved as self-reported. Prize decisions require an organiser-verified result.',
                                        );
                                        if (snapshot.certificates_configured)
                                          await certificate(activeEntry);
                                      }
                                    } catch (failure) {
                                      setError((failure as Error).message);
                                    }
                                  }}
                                >
                                  <label>
                                    My finish time · HH:MM:SS
                                    <input
                                      value={time}
                                      onChange={(event) => {
                                        setTime(event.target.value);
                                        setReviewing(false);
                                      }}
                                      placeholder="00:42:18"
                                      inputMode="numeric"
                                      required
                                      disabled={!snapshot.self_submission_open}
                                    />
                                  </label>
                                  {!snapshot.self_submission_open ? (
                                    <p>
                                      Finish-time submission has not opened.
                                    </p>
                                  ) : reviewing ? (
                                    <p className="portal-notice">
                                      Confirm {time} for {activeEntry.full_name}
                                      , {activeEntry.race} KM. This is a
                                      self-reported time; changes after
                                      submission need organiser review.
                                    </p>
                                  ) : (
                                    <p>
                                      Enter the elapsed time you saw on the race
                                      clock or were told by a finish official.
                                    </p>
                                  )}
                                  <button
                                    className="portal-button"
                                    disabled={
                                      !!busy || !snapshot.self_submission_open
                                    }
                                  >
                                    {reviewing
                                      ? 'Confirm my finish time'
                                      : 'Review finish time'}{' '}
                                    <ArrowRight size={17} />
                                  </button>
                                </form>
                              )}
                            {activeEntry.result && (
                              <div className="portal-certificate">
                                <h4>
                                  <FileCheck2 size={18} /> Completion
                                  certificate
                                </h4>
                                {activeEntry.result.certificate_hold ||
                                activeEntry.result.status ===
                                  'correction_required' ? (
                                  <p>
                                    Your certificate awaits organiser review.
                                  </p>
                                ) : !snapshot.certificates_configured ? (
                                  <p>
                                    Your result is saved. Certificates will be
                                    available after the approved signature and
                                    certificate setup are ready.
                                  </p>
                                ) : (
                                  <button
                                    className="portal-button"
                                    disabled={!!busy}
                                    onClick={() => certificate(activeEntry)}
                                  >
                                    Prepare / download certificate{' '}
                                    <Download size={17} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}
              </>
            )}
            {download && (
              <div className="portal-message">
                <b>{download.number} is ready.</b>{' '}
                <a
                  href={download.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download PDF
                </a>
                <small>
                  This private link expires after two minutes. Prepare it again
                  if it expires.
                </small>
              </div>
            )}
            {proof && (
              <section className="portal-proof">
                <div className="portal-row">
                  <h3>Private payment proof</h3>
                  <button className="portal-link" onClick={() => setProof('')}>
                    Close proof
                  </button>
                </div>
                <img
                  src={proof}
                  alt="Payment proof for organiser verification"
                />
              </section>
            )}
          </>
        )}
        <div className="portal-footer">
          <ContactHelp />
          {onClose && (
            <button className="portal-link" onClick={onClose}>
              Return to event
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
