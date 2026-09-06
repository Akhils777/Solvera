import { ReflectionMode, TurnMessage } from '../types';
import { getAuthIdToken } from './firebase';

export interface ReflectResponse {
  success: boolean;
  text: string;
  modelUsed: string;
  mode: ReflectionMode;
}

export interface SummarizeResponse {
  success: boolean;
  data: {
    title: string;
    summary: string;
    tags: string[];
  };
  modelUsed: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function askGeminiReflection(
  reflection: string,
  mode: ReflectionMode = 'reflect',
  history: TurnMessage[] = []
): Promise<ReflectResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reflection,
      mode,
      history: history.map((t) => ({ role: t.role, text: t.text })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

export async function askGeminiSummarize(text: string): Promise<SummarizeResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

export async function askGeminiInsights(
  reflections: Array<{ title: string; text?: string; summary?: string; tags?: string[]; createdAt: number }>
): Promise<{ success: boolean; data: any; modelUsed: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/insights', {
    method: 'POST',
    headers,
    body: JSON.stringify({ reflections }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

export async function askGeminiGoalDecompose(
  intention: string,
  category?: string
): Promise<{
  success: boolean;
  data: {
    title: string;
    category: string;
    description: string;
    targetDate: string;
    actions: string[];
  };
  modelUsed: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/goal-decompose', {
    method: 'POST',
    headers,
    body: JSON.stringify({ intention, category }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

export async function askGeminiWeeklyReview(
  reflections: any[],
  goals: any[]
): Promise<{
  success: boolean;
  data: {
    weekSummary: string;
    majorThemes: string[];
    progressMade: string[];
    goalsCompleted: string[];
    unfinishedActions: string[];
    importantReflections: string[];
    prioritiesNextWeek: string[];
  };
  modelUsed: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/weekly-review', {
    method: 'POST',
    headers,
    body: JSON.stringify({ reflections, goals }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

