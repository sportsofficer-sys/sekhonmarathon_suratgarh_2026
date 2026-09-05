export type RaceDistance = '5' | '10' | '21';
export type TimingProvenance = 'participant_submitted' | 'organiser_recorded' | 'organiser_verified' | 'organiser_corrected';
export const TIMING_LABELS: Record<TimingProvenance,string> = {
  participant_submitted: 'Self-reported time', organiser_recorded: 'Finish-console time',
  organiser_verified: 'Organiser-verified time', organiser_corrected: 'Organiser-corrected time',
};
export function parseFinishTime(value: string): number {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error('Use HH:MM:SS, for example 00:42:18.');
  const [,hours,minutes,seconds] = match.map(Number);
  const total = hours*3600+minutes*60+seconds;
  if (minutes>59 || seconds>59 || total<1 || total>86400) throw new Error('Enter a time between 00:00:01 and 24:00:00.');
  return total;
}
export function formatFinishTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds<0) return '--:--:--';
  const whole=Math.floor(seconds);
  return [Math.floor(whole/3600),Math.floor(whole/60)%60,whole%60].map(value=>String(value).padStart(2,'0')).join(':');
}
export function isPrizeCandidate(result: {provenance: TimingProvenance;status: string}|null): boolean {
  return !!result && result.provenance!=='participant_submitted' && ['verified','locked'].includes(result.status);
}
export function elapsedClockSeconds(start: string|null, now: number): number|null {
  if (!start) return null;
  const began=Date.parse(start);
  return Number.isFinite(began) && now>=began ? (now-began)/1000 : null;
}
