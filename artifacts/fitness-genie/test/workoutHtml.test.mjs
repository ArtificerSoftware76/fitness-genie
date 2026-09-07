import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWorkoutItem } from '../data/types.ts';
import { getVideoThumbnailUri, renderWorkoutHtml } from '../services/workoutHtml.ts';

const client = {
  id: 'client-1',
  name: 'Alex <Client>',
  email: 'alex@example.com',
  phone: '',
  notes: '',
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const baseExercise = {
  id: 'exercise-1',
  name: 'Goblet Squat <strong>',
  difficultyLevel: 'Intermediate',
  jointMuscleGroup: 'Quads, glutes',
  intensity: 'Medium',
  needPurpose: 'Lower-body strength',
  notesCues: 'Keep your chest tall.',
  contraindications: 'Stop if knee pain occurs.',
  modifications: 'Use a box for support.',
  photoUri: '',
  videoUri: '',
  videoFileId: '',
  videoFileName: '',
  isCustom: false,
};

const workout = {
  id: 'workout-1',
  title: 'Lower Body <Plan>',
  clientId: client.id,
  description: 'A focused strength session.',
  date: '2026-09-01',
  items: [{
    id: 'item-1',
    exerciseId: baseExercise.id,
    sets: '3',
    reps: '8',
    resistance: '20 kg',
    rest: '60 sec',
    duration: '45 sec',
    type: 'Strength',
    notes: 'Use the client’s comfortable depth.',
  }],
};

const dataImage = 'data:image/png;base64,ZmFrZS1wcmV2aWV3';

test('requests a higher-resolution thumbnail for the exercise detail preview', () => {
  assert.equal(getVideoThumbnailUri('drive-file-1', undefined, 800), '/api/drive/thumbnail/drive-file-1?v=3&size=800');
  assert.equal(getVideoThumbnailUri('drive-file-1', undefined), '/api/drive/thumbnail/drive-file-1?v=2');
});

test('renders populated exercise and prescription fields in the document', async () => {
  const html = await renderWorkoutHtml(workout, client, [{
    ...baseExercise,
    videoUri: 'https://videos.example.com/goblet-squat',
    videoThumbnailUri: dataImage,
  }], 'data:image/png;base64,ZmFrZS1sb2dv', async (uri) => uri);

  assert.match(html, /Lower Body &lt;Plan&gt;/);
  assert.match(html, /Prepared for Alex &lt;Client&gt;/);
  assert.match(html, /Goblet Squat &lt;strong&gt;/);
  for (const field of [
    ['Difficulty Level', 'Intermediate'],
    ['Joint \\/ Muscle Group Involved', 'Quads, glutes'],
    ['Intensity', 'Medium'],
    ['Need \\/ Purpose', 'Lower-body strength'],
    ['Notes \\/ Cues', 'Keep your chest tall.'],
    ['Contraindications', 'Stop if knee pain occurs.'],
    ['Modifications \\/ Related Exercises', 'Use a box for support.'],
    ['Client-specific Notes', 'Use the client’s comfortable depth.'],
  ]) {
    assert.match(html, new RegExp(`<strong>${field[0]}:<\\/strong> ${field[1]}`), `missing ${field[0]}`);
  }
  for (const field of [
    ['Resistance', '20 kg'],
    ['Repetitions', '8'],
    ['Sets', '3'],
    ['Duration', '45 sec'],
    ['Type', 'Strength'],
    ['Rest', '60 sec'],
  ]) {
    assert.match(html, new RegExp(`<small>${field[0]}<\\/small><b>${field[1]}</b>`), `missing ${field[0]}`);
  }
  assert.match(html, /href="https:\/\/videos\.example\.com\/goblet-squat">.*<img src="data:image\/png;base64,ZmFrZS1wcmV2aWV3" alt="Goblet Squat &lt;strong&gt; video preview"/s);
  assert.match(html, /\.video-link,.image-preview\{[^}]*width:132px;height:132px/);
  assert.match(html, /<a class="video-link" href="[^"]+">.*<\/a>/s);
  assert.match(html, /<img src="data:image\/png;base64,ZmFrZS1sb2dv" alt="Fitness Genie logo" class="logo"/);
  assert.match(html, /<header class="top"><img src="data:image\/png;base64,ZmFrZS1sb2dv" alt="Fitness Genie logo" class="logo"\s*\/>/);
});

test('omits empty prescription and exercise detail fields', async () => {
  const emptyExercise = {
    ...baseExercise,
    difficultyLevel: '',
    jointMuscleGroup: '',
    intensity: '',
    needPurpose: '',
    notesCues: '',
    contraindications: '',
    modifications: '',
  };
  const emptyWorkout = {
    ...workout,
    description: '',
    items: [{ ...workout.items[0], sets: '', reps: '', resistance: '', rest: '', duration: '', type: '', notes: '' }],
  };
  const html = await renderWorkoutHtml(emptyWorkout, client, [emptyExercise]);

  assert.doesNotMatch(html, /class="prescription"/);
  for (const label of [
    'Resistance',
    'Repetitions',
    'Sets',
    'Duration',
    'Type',
    'Rest',
    'Difficulty Level',
    'Joint \\/ Muscle Group Involved',
    'Intensity',
    'Need \\/ Purpose',
    'Notes \\/ Cues',
    'Contraindications',
    'Modifications \\/ Related Exercises',
    'Client-specific Notes',
  ]) {
    assert.doesNotMatch(html, new RegExp(`<strong>${label}:|<small>${label}<\\/small>`), `unexpected empty ${label}`);
  }
  assert.doesNotMatch(html, /class="video-link"|class="image-preview"/);
});

test('renders legacy workout items after normalization without errors', async () => {
  const legacyItem = normalizeWorkoutItem({
    id: 'legacy-item',
    exerciseId: baseExercise.id,
    sets: '2',
    reps: '10',
  }, 'fallback-item');
  const html = await renderWorkoutHtml({
    ...workout,
    items: [legacyItem],
  }, client, [baseExercise]);

  assert.match(html, /<h2>Goblet Squat &lt;strong&gt;<\/h2>/);
  assert.match(html, /<small>Repetitions<\/small><b>10<\/b>/);
  assert.match(html, /<small>Sets<\/small><b>2<\/b>/);
  assert.match(html, /<small>Rest<\/small><b>60 sec<\/b>/);
  assert.doesNotMatch(html, /<small>Resistance<\/small>|<small>Duration<\/small>|<small>Type<\/small>/);
});

test('keeps Drive video thumbnails embedded inside the clickable preview', async () => {
  const exercise = {
    ...baseExercise,
    videoFileId: 'drive/file id',
    videoFileName: 'goblet-squat.mp4',
  };
  const html = await renderWorkoutHtml(workout, client, [exercise], '', async (uri) => {
    assert.equal(uri, '/api/drive/thumbnail/drive%2Ffile%20id?v=2');
    return dataImage;
  });

  assert.match(html, /href="https:\/\/drive\.google\.com\/file\/d\/drive%2Ffile%20id\/view"/);
  assert.match(html, /<a class="video-link" href="[^"]+"><img src="data:image\/png;base64,ZmFrZS1wcmV2aWV3"/);
  assert.doesNotMatch(html, /<img src="\/api\/drive\/thumbnail/);
});