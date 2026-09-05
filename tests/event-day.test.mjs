import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFinishTime,formatFinishTime,isPrizeCandidate,elapsedClockSeconds} from '../lib/event-day.ts';
test('finish times use hours/minutes/seconds and reject malformed or unreasonable input',()=>{
  assert.equal(parseFinishTime('01:02:03'),3723);
  assert.equal(parseFinishTime('24:00:00'),86400);
  for(const value of ['12:34','01:60:00','00:00:00','24:00:01','-1:01:01','01:10:60','1e2:00:00']) assert.throws(()=>parseFinishTime(value));
});
test('display uses elapsed time, not time of day, and handles unsynchronised clocks',()=>{
  assert.equal(formatFinishTime(3723.99),'01:02:03');
  assert.equal(formatFinishTime(-1),'--:--:--');
  assert.equal(elapsedClockSeconds(null,10),null);
  assert.equal(elapsedClockSeconds('invalid',10),null);
  assert.equal(elapsedClockSeconds('2026-10-04T00:00:00Z',Date.parse('2026-10-04T00:01:30Z')),90);
});
test('self-reported and unreviewed console times never become prize candidates',()=>{
  for(const status of ['participant_submitted','verified','locked']) assert.equal(isPrizeCandidate({provenance:'participant_submitted',status}),false);
  assert.equal(isPrizeCandidate({provenance:'organiser_recorded',status:'organiser_recorded'}),false);
  assert.equal(isPrizeCandidate({provenance:'organiser_recorded',status:'locked'}),true);
  assert.equal(isPrizeCandidate({provenance:'organiser_verified',status:'verified'}),true);
});
