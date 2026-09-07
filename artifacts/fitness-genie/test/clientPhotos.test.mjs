import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getClientAvatarUri,
  normalizeClientPhotoUri,
  openClientPhotoSettings,
  selectClientPhoto,
} from '../services/clientPhotos.ts';

const pickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

test('selected client photo is retained for storage and avatar rendering', async () => {
  const selectedUri = 'file:///photos/alex.jpg';
  const picker = {
    requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
    launchImageLibraryAsync: async (options) => {
      assert.deepEqual(options, pickerOptions);
      return { canceled: false, assets: [{ uri: selectedUri }] };
    },
  };

  const selection = await selectClientPhoto(picker);
  assert.deepEqual(selection, { status: 'selected', uri: selectedUri });

  const storedClient = {
    id: 'client-1',
    name: 'Alex',
    photoUri: normalizeClientPhotoUri(selection.uri),
  };
  assert.equal(storedClient.photoUri, selectedUri);
  assert.equal(getClientAvatarUri(storedClient), selectedUri);
});

test('does not launch the picker when photo permission is denied', async () => {
  let launched = false;
  const selection = await selectClientPhoto({
    requestMediaLibraryPermissionsAsync: async () => ({ granted: false }),
    launchImageLibraryAsync: async () => {
      launched = true;
      return { canceled: false, assets: [{ uri: 'file:///unexpected.jpg' }] };
    },
  });

  assert.deepEqual(selection, { status: 'denied' });
  assert.equal(launched, false);
});

test('reports when photo permission must be recovered from device settings', async () => {
  const selection = await selectClientPhoto({
    requestMediaLibraryPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
    launchImageLibraryAsync: async () => {
      throw new Error('picker should not launch');
    },
  });

  assert.deepEqual(selection, { status: 'settings-required' });
});

test('does not try to open settings on web', async () => {
  let opened = false;
  const result = await openClientPhotoSettings('web', async () => {
    opened = true;
  });

  assert.equal(result, 'unavailable');
  assert.equal(opened, false);
});

test('reports settings-opening failures without throwing', async () => {
  const result = await openClientPhotoSettings('ios', async () => {
    throw new Error('settings unavailable');
  });

  assert.equal(result, 'failed');
});

test('reports successful settings opening', async () => {
  let opened = false;
  const result = await openClientPhotoSettings('android', async () => {
    opened = true;
  });

  assert.equal(result, 'opened');
  assert.equal(opened, true);
});

test('treats picker cancellation and missing assets as no selection', async () => {
  for (const result of [
    { canceled: true, assets: [{ uri: 'file:///cancelled.jpg' }] },
    { canceled: false, assets: [] },
    { canceled: false },
  ]) {
    const selection = await selectClientPhoto({
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => result,
    });
    assert.deepEqual(selection, { status: 'cancelled' });
  }
});

test('propagates native picker failures for the screen to report', async () => {
  const failure = new Error('picker unavailable');
  await assert.rejects(
    selectClientPhoto({
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => {
        throw failure;
      },
    }),
    failure,
  );
});