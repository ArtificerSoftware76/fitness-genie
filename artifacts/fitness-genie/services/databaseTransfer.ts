import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Client, Exercise } from '@/data/types';

export type DatabaseKind = 'clients' | 'exercises';

type ExportEnvelope = {
  app: 'Fitness Genie';
  kind: DatabaseKind;
  exportedAt: string;
  records: Client[] | Exercise[];
};

const labels: Record<DatabaseKind, string> = {
  clients: 'clients',
  exercises: 'exercises',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRecords(value: unknown, kind: DatabaseKind): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && value.kind === kind && Array.isArray(value.records)) return value.records;
  throw new Error(`Choose a Fitness Genie ${labels[kind]} JSON export.`);
}

function normalizeClient(value: unknown, index: number): Client | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `client-import-${Date.now()}-${index}`,
    name: value.name.trim(),
    email: typeof value.email === 'string' ? value.email : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    notes: typeof value.notes === 'string' ? value.notes : '',
    photoUri: typeof value.photoUri === 'string' ? value.photoUri : '',
    active: typeof value.active === 'boolean' ? value.active : true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeExercise(value: unknown, index: number): Exercise | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  const text = (key: string) => typeof value[key] === 'string' ? value[key] as string : '';
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `exercise-import-${Date.now()}-${index}`,
    name: value.name.trim(),
    difficultyLevel: text('difficultyLevel'),
    jointMuscleGroup: text('jointMuscleGroup'),
    intensity: text('intensity'),
    needPurpose: text('needPurpose'),
    notesCues: text('notesCues'),
    contraindications: text('contraindications'),
    modifications: text('modifications'),
    photoUri: text('photoUri'),
    videoUri: text('videoUri'),
    videoThumbnailUri: text('videoThumbnailUri') || undefined,
    videoFileId: text('videoFileId'),
    videoFileName: text('videoFileName'),
    isCustom: typeof value.isCustom === 'boolean' ? value.isCustom : true,
  };
}

export async function exportDatabase(kind: DatabaseKind, records: Client[] | Exercise[]) {
  const file = new File(Paths.cache, `fitness-genie-${kind}-${new Date().toISOString().slice(0, 10)}.json`);
  const envelope: ExportEnvelope = {
    app: 'Fitness Genie',
    kind,
    exportedAt: new Date().toISOString(),
    records,
  };
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(envelope, null, 2));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: `Export ${labels[kind]}`,
  });
}

export async function importDatabase(kind: DatabaseKind): Promise<Client[] | Exercise[] | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const raw = await fetch(result.assets[0].uri).then((response) => response.text());
  const parsed = JSON.parse(raw) as unknown;
  const records = readRecords(parsed, kind);
  if (kind === 'clients') {
    const clients = records.map(normalizeClient).filter((record): record is Client => record !== null);
    if (!clients.length) throw new Error('No valid clients were found in that file.');
    return clients;
  }
  const exercises = records.map(normalizeExercise).filter((record): record is Exercise => record !== null);
  if (!exercises.length) throw new Error('No valid exercises were found in that file.');
  return exercises;
}