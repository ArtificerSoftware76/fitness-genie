import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNamedWorkoutPdf,
  emailNamedWorkoutPdf,
  shareNamedWorkoutPdf,
} from '../services/sharingCore.ts';

function makeRuntime(overrides = {}) {
  const calls = [];
  const runtime = {
    printToFileAsync: async (options) => {
      calls.push(['print', options]);
      return { uri: 'file:///cache/ExponentPrint.pdf', base64: false };
    },
    createCacheFile: (uri) => {
      const file = {
        uri: `file:///cache/${uri}`,
        exists: uri === 'Client-Workout.pdf',
        delete: () => calls.push(['delete', file.uri]),
        copy: (destination) => calls.push(['copy', file.uri, destination.uri]),
      };
      return file;
    },
    createFile: (uri) => ({
      uri,
      exists: false,
      delete() {},
      copy: (destination) => calls.push(['copy', uri, destination.uri]),
    }),
    isMailAvailableAsync: async () => true,
    composeAsync: async (options) => calls.push(['compose', options]),
    isSharingAvailableAsync: async () => true,
    shareAsync: async (uri, options) => calls.push(['share', uri, options]),
    openURL: async (uri) => calls.push(['open', uri]),
    platform: 'ios',
    ...overrides,
  };
  return { runtime, calls };
}

test('generated PDF is copied to the ClientName-WorkoutName filename', async () => {
  const { runtime, calls } = makeRuntime();
  const pdf = await createNamedWorkoutPdf(runtime, '<html>workout</html>', 'Client-Workout.pdf');

  assert.equal(pdf.uri, 'file:///cache/Client-Workout.pdf');
  assert.deepEqual(calls, [
    ['print', { html: '<html>workout</html>', base64: false }],
    ['delete', 'file:///cache/Client-Workout.pdf'],
    ['copy', 'file:///cache/ExponentPrint.pdf', 'file:///cache/Client-Workout.pdf'],
  ]);
});

test('email attaches the named PDF and falls back to native sharing when mail is unavailable', async () => {
  const { runtime, calls } = makeRuntime({ isMailAvailableAsync: async () => false });
  const result = await emailNamedWorkoutPdf(runtime, { uri: 'file:///cache/Alex-Legs.pdf' }, 'alex@example.com', 'Alex', 'Legs');

  assert.equal(result, 'share');
  assert.deepEqual(calls, [
    ['share', 'file:///cache/Alex-Legs.pdf', { mimeType: 'application/pdf', dialogTitle: 'Email workout PDF' }],
  ]);
});

test('email uses the named PDF attachment when mail is available', async () => {
  const { runtime, calls } = makeRuntime();
  const result = await emailNamedWorkoutPdf(runtime, { uri: 'file:///cache/Alex-Legs.pdf' }, 'alex@example.com', 'Alex', 'Legs');

  assert.equal(result, 'email');
  assert.deepEqual(calls, [
    ['compose', {
      recipients: ['alex@example.com'],
      subject: 'Legs — Fitness Genie',
      body: 'Hi Alex,\n\nYour workout is attached. Clickable exercise video previews are included in the PDF.\n\nMove well!',
      attachments: ['file:///cache/Alex-Legs.pdf'],
    }],
  ]);
});

test('email reports unavailable when mail and native sharing are unavailable', async () => {
  const { runtime, calls } = makeRuntime({
    isMailAvailableAsync: async () => false,
    isSharingAvailableAsync: async () => false,
  });

  assert.equal(
    await emailNamedWorkoutPdf(runtime, { uri: 'file:///cache/Alex-Legs.pdf' }, 'alex@example.com', 'Alex', 'Legs'),
    'unavailable',
  );
  assert.deepEqual(calls, []);
});

test('share falls back to opening the PDF on web and reports unavailable native sharing', async () => {
  const web = makeRuntime({ isSharingAvailableAsync: async () => false, platform: 'web' });
  assert.equal(await shareNamedWorkoutPdf(web.runtime, { uri: 'file:///cache/Alex-Legs.pdf' }), 'open');
  assert.deepEqual(web.calls, [['open', 'file:///cache/Alex-Legs.pdf']]);

  const native = makeRuntime({ isSharingAvailableAsync: async () => false });
  assert.equal(await shareNamedWorkoutPdf(native.runtime, { uri: 'file:///cache/Alex-Legs.pdf' }), 'unavailable');
  assert.deepEqual(native.calls, []);
});

test('propagates print, file, mail, and sharing failures for the screen to report', async () => {
  const printFailure = new Error('print failed');
  await assert.rejects(
    createNamedWorkoutPdf(makeRuntime({ printToFileAsync: async () => { throw printFailure; } }).runtime, '', 'Alex-Legs.pdf'),
    printFailure,
  );

  const copyFailure = new Error('copy failed');
  const { runtime: copyRuntime } = makeRuntime();
  copyRuntime.createFile = (uri) => ({
    uri,
    exists: false,
    delete() {},
    copy() { throw copyFailure; },
  });
  await assert.rejects(createNamedWorkoutPdf(copyRuntime, '', 'Alex-Legs.pdf'), copyFailure);

  const mailFailure = new Error('mail failed');
  await assert.rejects(
    emailNamedWorkoutPdf(makeRuntime({ composeAsync: async () => { throw mailFailure; } }).runtime, { uri: 'file:///cache/Alex-Legs.pdf' }, '', 'Alex', 'Legs'),
    mailFailure,
  );

  const shareFailure = new Error('share failed');
  await assert.rejects(
    shareNamedWorkoutPdf(makeRuntime({ shareAsync: async () => { throw shareFailure; } }).runtime, { uri: 'file:///cache/Alex-Legs.pdf' }),
    shareFailure,
  );
});