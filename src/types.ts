export interface Routine {
  id: string;
  userId: string;
  name: string;
  weekStart: string; // ISO date of Monday
  createdAt: unknown;
}

export interface Day {
  id: string;
  routineId: string;
  userId: string;
  name: string;
  order: number;
}

export interface Exercise {
  id: string;
  dayId: string;
  routineId: string;
  userId: string;
  name: string;
  reps: number;
  sets: number;
  weight: number;
  imageUrl?: string;
  order: number;
}

export interface ExerciseMedia {
  id: string;
  userId: string;
  exerciseName: string;
  imageUrl: string;
  createdAt: unknown;
}
