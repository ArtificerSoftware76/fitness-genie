import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { defaultExercises } from '@/data/defaultExercises';
import { Client, Exercise, ExerciseDraft, Workout, WorkoutItem, createId, normalizeWorkoutItem } from '@/data/types';
import { normalizeClientPhotoUri } from '@/services/clientPhotos';

const STORAGE_KEY = 'fitness-genie-state-v1';
const EXERCISE_CATALOG_VERSION = 2;

type FitnessContextValue = {
  clients: Client[];
  exercises: Exercise[];
  workouts: Workout[];
  pdfLogoUri: string;
  hydrated: boolean;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  replaceClients: (items: Client[]) => void;
  setPdfLogoUri: (uri: string) => void;
  upsertExercise: (exercise: ExerciseDraft, id?: string) => void;
  deleteExercise: (id: string) => void;
  importExercises: (items: Exercise[]) => void;
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  deleteWorkout: (id: string) => void;
  markWorkoutSent: (id: string) => void;
};

const FitnessContext = createContext<FitnessContextValue | null>(null);

const seededExercises: Exercise[] = defaultExercises.map((exercise) => ({ ...exercise }));

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(seededExercises);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [pdfLogoUri, setPdfLogoUri] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<{ catalogVersion: number; clients: Client[]; exercises: Exercise[]; workouts: Workout[]; pdfLogoUri: string }>;
           if (Array.isArray(parsed.clients)) setClients(parsed.clients.map((client) => ({ ...client, photoUri: normalizeClientPhotoUri(client.photoUri) })));
          if (typeof parsed.pdfLogoUri === 'string') setPdfLogoUri(parsed.pdfLogoUri);
          if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
            if (parsed.catalogVersion === EXERCISE_CATALOG_VERSION) {
              setExercises(parsed.exercises);
            } else {
              // Refresh the built-in catalog while keeping exercises the coach
              // created manually in the previous version.
              setExercises([...seededExercises, ...parsed.exercises.filter((exercise) => exercise.isCustom)]);
            }
          }
          if (Array.isArray(parsed.workouts)) {
            setWorkouts(parsed.workouts.map((workout) => ({
              ...workout,
              items: Array.isArray(workout.items)
                ? workout.items.map((item, index) => normalizeWorkoutItem(item, `${workout.id || 'workout'}-item-${index}`))
                : [],
            })));
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ catalogVersion: EXERCISE_CATALOG_VERSION, clients, exercises, workouts, pdfLogoUri })).catch(() => undefined);
  }, [clients, exercises, workouts, pdfLogoUri, hydrated]);

  const value = useMemo<FitnessContextValue>(() => ({
    clients,
    exercises,
    workouts,
    pdfLogoUri,
    hydrated,
    addClient: (client) => setClients((current) => [...current, { ...client, id: createId('client'), createdAt: new Date().toISOString() }]),
    updateClient: (id, updates) => setClients((current) => current.map((client) => client.id === id ? { ...client, ...updates } : client)),
    deleteClient: (id) => setClients((current) => current.filter((client) => client.id !== id)),
    replaceClients: (items) => setClients(items),
    setPdfLogoUri,
    upsertExercise: (draft, id) => setExercises((current) => {
      if (id) return current.map((exercise) => exercise.id === id ? { ...exercise, ...draft } : exercise);
      return [{ ...draft, id: createId('exercise'), isCustom: true }, ...current];
    }),
    deleteExercise: (id) => setExercises((current) => current.filter((exercise) => exercise.id !== id)),
    importExercises: (items) => setExercises(items),
    addWorkout: (workout) => setWorkouts((current) => [{ ...workout, id: createId('workout') }, ...current]),
    deleteWorkout: (id) => setWorkouts((current) => current.filter((workout) => workout.id !== id)),
    markWorkoutSent: (id) => setWorkouts((current) => current.map((workout) => workout.id === id ? { ...workout, sentAt: new Date().toISOString() } : workout)),
  }), [clients, exercises, workouts, pdfLogoUri, hydrated]);

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>;
}

export function useFitness() {
  const context = useContext(FitnessContext);
  if (!context) throw new Error('useFitness must be used within FitnessProvider');
  return context;
}

export function makeWorkoutItem(exerciseId: string): WorkoutItem {
  return { id: createId('item'), exerciseId, sets: '', reps: '', resistance: '', rest: '', duration: '', type: '', notes: '' };
}