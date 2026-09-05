import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGISTRATION_DEADLINE,
  resolveEventAvailability,
} from '../lib/event-availability.ts';

const now = Date.parse('2026-09-05T12:00:00+05:30');
const ready = {
  id: 'suratgarh-2026',
  registration_open: true,
  payment_configured: true,
  registration_deadline: REGISTRATION_DEADLINE,
  payment_qr_url: 'https://example.com/approved-qr.png',
  payee_name: 'Test organiser',
  upi_id: 'test@example',
  contact_phone: null,
  contact_email: null,
};

test('unconfigured preview is upcoming before its deadline, then closes', () => {
  assert.equal(resolveEventAvailability(null, { now }), 'upcoming');
  assert.equal(
    resolveEventAvailability(null, {
      now: Date.parse(REGISTRATION_DEADLINE) + 1,
    }),
    'closed',
  );
});

test('loading and unreadable live settings cannot advertise open registration', () => {
  assert.equal(
    resolveEventAvailability(ready, { now, loading: true }),
    'loading',
  );
  assert.equal(
    resolveEventAvailability(ready, { now, failed: true }),
    'unavailable',
  );
  assert.equal(
    resolveEventAvailability(null, { now, failed: true }),
    'unavailable',
  );
});

test('only enabled registration with a complete payment configuration opens', () => {
  assert.equal(resolveEventAvailability(ready, { now }), 'open');
  assert.equal(
    resolveEventAvailability({ ...ready, registration_open: false }, { now }),
    'upcoming',
  );
  assert.equal(
    resolveEventAvailability({ ...ready, payment_configured: false }, { now }),
    'upcoming',
  );
  for (const missing of [
    { payment_qr_url: null },
    { payment_qr_url: 'http://example.com/qr.png' },
    { payee_name: '  ' },
    { upi_id: null },
  ]) {
    assert.equal(
      resolveEventAvailability({ ...ready, ...missing }, { now }),
      'unavailable',
    );
  }
});

test('deadline closes new entries regardless of open flags or incomplete payment details', () => {
  const afterDeadline = Date.parse(REGISTRATION_DEADLINE) + 1;
  for (const config of [
    ready,
    { ...ready, registration_open: false },
    { ...ready, payment_qr_url: null },
  ]) {
    assert.equal(
      resolveEventAvailability(config, { now: afterDeadline }),
      'closed',
    );
  }
});

test('configured deadline takes precedence over the public preview date', () => {
  assert.equal(
    resolveEventAvailability(
      { ...ready, registration_deadline: '2026-09-01T23:59:59+05:30' },
      { now },
    ),
    'closed',
  );
});

test('exact deadline boundary agrees with the database inclusive deadline', () => {
  const deadline = Date.parse(REGISTRATION_DEADLINE);
  assert.equal(resolveEventAvailability(ready, { now: deadline }), 'open');
  assert.equal(
    resolveEventAvailability(ready, { now: deadline + 1 }),
    'closed',
  );
});

test('invalid configured deadlines remain unavailable instead of using the preview deadline', () => {
  for (const registration_deadline of ['invalid', '']) {
    assert.equal(
      resolveEventAvailability({ ...ready, registration_deadline }, { now }),
      'unavailable',
    );
  }
});
