export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  photoUri: string;
  active: boolean;
  createdAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  difficultyLevel: string;
  jointMuscleGroup: string;
  intensity: string;
  needPurpose: string;
  notesCues: string;
  contraindications: string;
  modifications: string;
  photoUri: string;
  videoUri: string;
  videoThumbnailUri?: string;
  videoFileId: string;
  videoFileName: string;
  isCustom: boolean;
};

export const workoutTypes = ['Strength', 'Power', 'Core Stability', 'Dexterity', 'Mobility', 'Balance', 'Aerobic'] as const;
export type WorkoutType = typeof workoutTypes[number];

export type WorkoutItem = {
  id: string;
  exerciseId: string;
  sets: string;
  reps: string;
  resistance: string;
  rest: string;
  duration: string;
  type: WorkoutType | '';
  notes: string;
};

export type Workout = {
  id: string;
  title: string;
  clientId: string;
  description: string;
  date: string;
  items: WorkoutItem[];
  sentAt?: string;
};

export type ExerciseDraft = Omit<Exercise, 'id' | 'isCustom'>;

export function normalizeWorkoutItem(value: Partial<WorkoutItem> | null | undefined, fallbackId: string): WorkoutItem {
  const text = (key: keyof Pick<WorkoutItem, 'exerciseId' | 'sets' | 'reps' | 'resistance' | 'rest' | 'duration' | 'notes'>) => typeof value?.[key] === 'string' ? value[key] as string : '';
  const type = value?.type;
  return {
    id: typeof value?.id === 'string' && value.id ? value.id : fallbackId,
    exerciseId: text('exerciseId'),
    sets: text('sets'),
    reps: text('reps'),
    resistance: text('resistance'),
    rest: typeof value?.rest === 'string' ? value.rest : '60 sec',
    duration: text('duration'),
    type: typeof type === 'string' && workoutTypes.includes(type as WorkoutType) ? type as WorkoutType : '',
    notes: text('notes'),
  };
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}