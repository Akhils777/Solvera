import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Resilient Gemini Fallback Ladder
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Lazy initialization of GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Helper
async function generateContentWithFallback(
  contents: any,
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: systemInstruction
          ? { systemInstruction }
          : undefined,
      });

      const responseText = response.text || '';
      if (responseText.trim()) {
        return {
          text: responseText,
          modelUsed: modelName,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 500;
      const message = String(err?.message || '');
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        message.includes('not found') ||
        message.includes('overloaded') ||
        message.includes('quota') ||
        message.includes('RESOURCE_EXHAUSTED');

      console.warn(`[Gemini Fallback] Model ${modelName} failed (status ${status}): ${message}. Trying next fallback.`);
      if (!isRecoverable && status === 400 && !message.includes('model')) {
        // Bad request not related to model availability
        throw err;
      }
    }
  }

  throw lastError || new Error('All fallback models failed to generate content');
}

// --- API ROUTES ---

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Firebase runtime config (for secure injection without baking keys into git)
app.get('/api/firebase-config', (_req: Request, res: Response) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
  };
  res.json(config);
});

// Main Gemini Reflection & Conversation Endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const reflection = typeof data.reflection === 'string' ? data.reflection.trim() : '';
    const mode = typeof data.mode === 'string' ? data.mode : 'reflect';
    const history = Array.isArray(data.history) ? data.history : [];

    if (!reflection) {
      return res.status(400).json({
        error: 'Missing required field: "reflection" must be a non-empty string.',
      });
    }

    // Determine system instruction based on reflection mode
    let systemInstruction = `You are Solvéra, a thoughtful, empathetic, and insightful personal space for reflection and clarity.
Your mission is to help the user turn thoughts into clarity, unpack feelings, dilemmas, and ideas, and foster meaningful momentum.
- Be supportive, articulate, and grounding.
- Provide thoughtful questions, deeper perspectives, and constructive observations.
- Keep answers well-structured and engaging with clear paragraphs or gentle bullet points where helpful.
- Respect that this is user private journal reflection.`;

    if (mode === 'summarize') {
      systemInstruction += `\nMode: Provide an insightful executive summary capturing core emotional themes, key realizations, and questions worth exploring.`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\nMode: Brainstorm creative ideas, alternate perspectives, and constructive paths forward inspired by the entry.`;
    } else if (mode === 'action_items') {
      systemInstruction += `\nMode: Extract clear, gentle, actionable next steps and habit nudges from what the user shared.`;
    } else if (mode === 'decision') {
      systemInstruction += `\nMode: Act as a rigorous decision-making advisor. Analyze the dilemmas, trade-offs, first-order vs second-order consequences, blind spots, and recommend a clear framework for deciding.`;
    }

    // Build multi-turn content representation
    // Map prior conversation turns cleanly
    const contents: any[] = [];

    for (const turn of history) {
      if (turn && typeof turn.text === 'string' && turn.text.trim()) {
        const role = turn.role === 'model' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: turn.text.trim() }],
        });
      }
    }

    // Add current user reflection turn
    contents.push({
      role: 'user',
      parts: [{ text: reflection }],
    });

    const result = await generateContentWithFallback(contents, systemInstruction);

    return res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection response with Gemini',
    });
  }
});

// Quick Summarization / Title Generator Endpoint
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const text = typeof data.text === 'string' ? data.text.trim() : '';

    if (!text) {
      return res.status(400).json({ error: 'Text is required for summarization.' });
    }

    const prompt = `Based on the following journal entry or conversation snippet, generate a JSON object with:
1. "title": A short, poignant title (3 to 6 words).
2. "summary": A concise 1-2 sentence executive summary highlighting key themes and sentiment.
3. "tags": An array of 2 to 4 short thematic tags (e.g. ["Gratitude", "Career", "Focus"]).

Respond with ONLY valid JSON without markdown wrapping.

Text:
${text.slice(0, 3000)}`;

    const result = await generateContentWithFallback(prompt);
    let parsed = { title: 'Journal Reflection', summary: text.slice(0, 120) + '...', tags: ['Reflection'] };
    try {
      const cleanJson = result.text.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      // fallback if JSON parsing failed
    }

    return res.json({
      success: true,
      data: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate summary',
    });
  }
});

// 5. AI Insight Engine Endpoint: Cross-reflection pattern analysis
app.post('/api/gemini/insights', async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const reflections = Array.isArray(data.reflections) ? data.reflections : [];

    if (reflections.length === 0) {
      return res.status(400).json({
        error: 'At least one saved reflection is required to analyze patterns.',
      });
    }

    const compiledReflections = reflections
      .slice(0, 15)
      .map(
        (r: any, idx: number) =>
          `[Entry ${idx + 1} - ${r.title || 'Untitled'}]\nTags: ${(r.tags || []).join(', ')}\nContent: ${(
            r.text || r.summary || ''
          ).slice(0, 600)}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are the Solvéra Insight Engine.
Analyze the following private personal journal entries belonging to a single user.
Identify key recurring themes, recurring bottlenecks/concerns, cognitive strengths and positive habits, growth areas, and high-leverage next actions.
Do NOT make medical, psychological, or diagnostic claims. Keep advice grounded, empathetic, and actionable.

Return ONLY a JSON object formatted strictly as:
{
  "summary": "2-3 sentence overarching executive synthesis of the user's current mindset and trajectory",
  "recurringThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "commonConcerns": ["Concern or cognitive bottleneck 1", "Concern 2"],
  "positivePatterns": ["Positive habit/strength 1", "Strength 2"],
  "improvementAreas": ["Constructive growth opportunity 1", "Opportunity 2"],
  "observations": ["Poignant observation 1", "Observation 2"],
  "suggestedActions": ["Specific, bite-sized next step 1", "Next step 2", "Next step 3"]
}

User Journal Entries:
${compiledReflections}`;

    const result = await generateContentWithFallback(prompt);
    let parsed: any = null;
    try {
      const cleanJson = result.text.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        summary: 'Deep reflections observed across self-discipline, focus, and deliberate decision-making.',
        recurringThemes: ['Focus & Clarity', 'Continuous Growth', 'Intentional Action'],
        commonConcerns: ['Balancing urgency with deliberate planning'],
        positivePatterns: ['Consistent self-awareness and willingness to evaluate habits'],
        improvementAreas: ['Creating micro-milestones to reduce decision fatigue'],
        observations: ['Your entries reveal a strong desire for clarity amidst busy schedules.'],
        suggestedActions: ['Block 20 minutes tomorrow morning for deep focus on your highest-priority goal.'],
      };
    }

    return res.json({
      success: true,
      data: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/insights:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate personal AI insights',
    });
  }
});

// 6. Natural Language Goal Decomposer Endpoint
app.post('/api/gemini/goal-decompose', async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const intention = typeof data.intention === 'string' ? data.intention.trim() : '';
    const category = typeof data.category === 'string' ? data.category.trim() : 'Personal Growth';

    if (!intention) {
      return res.status(400).json({ error: 'Intention text is required.' });
    }

    const prompt = `You are an expert productivity and goal architect in Solvéra.
Convert the user's natural language intention into a structured, measurable goal with 3 to 5 realistic, bite-sized actionable tasks.

User Intention: "${intention}"
Preferred Category: "${category}"

Return ONLY a JSON object formatted strictly as:
{
  "title": "A concise, active goal title (e.g. Master Python Fundamentals)",
  "category": "Career | Learning | Health | Mindset | Projects",
  "description": "A clear 1-2 sentence definition of success",
  "targetDate": "A suggested timeframe such as '30 Days' or 'End of Quarter'",
  "actions": [
    "Actionable step 1 (concrete and verifiable)",
    "Actionable step 2",
    "Actionable step 3"
  ]
}`;

    const result = await generateContentWithFallback(prompt);
    let parsed: any = null;
    try {
      const cleanJson = result.text.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        title: intention.slice(0, 50),
        category: category || 'Personal Growth',
        description: `Execute purposeful steps to achieve: ${intention}`,
        targetDate: '30 Days',
        actions: ['Define milestone 1', 'Set aside 30 minutes daily', 'Review progress weekly'],
      };
    }

    return res.json({
      success: true,
      data: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/goal-decompose:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to decompose goal intention',
    });
  }
});

// 7. Weekly AI Review Endpoint
app.post('/api/gemini/weekly-review', async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const reflections = Array.isArray(data.reflections) ? data.reflections : [];
    const goals = Array.isArray(data.goals) ? data.goals : [];

    const reflectionSummary = reflections
      .slice(0, 10)
      .map((r: any) => `- "${r.title}": ${(r.summary || r.text || '').slice(0, 200)}`)
      .join('\n');

    const goalsSummary = goals
      .map(
        (g: any) =>
          `- Goal: ${g.title} [Status: ${g.status}]. Actions completed: ${
            (g.actions || []).filter((a: any) => a.completed).length
          }/${(g.actions || []).length}`
      )
      .join('\n');

    const prompt = `You are the Weekly Reviewer in Solvéra.
Synthesize the user's week based on their journal entries and goal tracker activities.
Highlight major progress, key thoughts, unfinished actions needing attention, and recommend 3 focused priorities for the upcoming week.

Weekly Reflections:
${reflectionSummary || 'No journal entries logged this week.'}

Active Goals & Actions:
${goalsSummary || 'No active goals recorded.'}

Return ONLY a JSON object formatted strictly as:
{
  "weekSummary": "2-3 sentence executive review of the week's cadence and milestones",
  "majorThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "progressMade": ["Accomplishment or milestone 1", "Milestone 2"],
  "goalsCompleted": ["Completed milestone or active focus 1"],
  "unfinishedActions": ["Key pending task to carry forward 1", "Task 2"],
  "importantReflections": ["Key realization or mental model from the week"],
  "prioritiesNextWeek": ["Top priority 1", "Top priority 2", "Top priority 3"]
}`;

    const result = await generateContentWithFallback(prompt);
    let parsed: any = null;
    try {
      const cleanJson = result.text.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        weekSummary: 'A productive week characterized by thoughtful contemplation and steady action.',
        majorThemes: ['Focus', 'Consistency', 'Deliberate Growth'],
        progressMade: ['Maintained consistent reflection cadence', 'Advanced core goals'],
        goalsCompleted: [],
        unfinishedActions: ['Review pending action items before Monday'],
        importantReflections: ['Consistency over intensity creates durable outcomes.'],
        prioritiesNextWeek: ['Establish daily deep-work blocks', 'Complete top active goal task', 'Plan mid-week check-in'],
      };
    }

    return res.json({
      success: true,
      data: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/weekly-review:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate weekly review',
    });
  }
});


// --- VITE MIDDLEWARE & SERVER BOOTSTRAP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
