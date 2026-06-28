/**
 * AI Processor — powered by Google Gemini 2.5 Flash
 * Handles: summarization, key extraction, flashcards, MCQs,
 *          podcast scripts, and chatbot responses.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialise Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel(opts = {}) {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      temperature:     opts.temperature     ?? parseFloat(process.env.AI_TEMPERATURE)  ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? parseInt(process.env.AI_MAX_TOKENS)    ?? 8192,
    },
  });
}

/** Call Gemini and return the text response */
async function ask(systemPrompt, userPrompt, opts = {}) {
  const model  = getModel(opts);
  const prompt = `${systemPrompt}\n\n${userPrompt}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/** Parse JSON safely from a Gemini response */
function safeParseJSON(raw, fallback) {
  try {
    // strip markdown code fences if present
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const arrayMatch  = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (arrayMatch)  return JSON.parse(arrayMatch[0]);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    return JSON.parse(cleaned);
  } catch {
    console.warn('JSON parse failed, returning fallback');
    return fallback;
  }
}

// ── Summaries ────────────────────────────────────────────────────

async function generateComprehensiveSummary(text) {
  return ask(
    'You are an expert academic summarizer. Create a detailed, comprehensive summary that retains ALL important information, key concepts, and examples.',
    `Create a comprehensive summary of:\n\n${text}`,
    { maxOutputTokens: parseInt(process.env.SUMMARY_MAX_TOKENS) || 2048 }
  );
}

async function generateMediumSummary(text) {
  return ask(
    'You are an expert academic summarizer. Create a concise summary (about 40% of the original) focusing on the most important concepts.',
    `Create a medium-length summary of:\n\n${text}`,
    { maxOutputTokens: 1500 }
  );
}

async function generateExamRevisionSummary(text) {
  return ask(
    'You are an expert exam prep specialist. Focus on content most likely to appear on exams. Use numbered bullet points and clear formatting.',
    `Create an exam revision summary with key terms, important facts, and exam-likely topics:\n\n${text}`,
    { maxOutputTokens: 2000 }
  );
}

async function generateOneMinuteNotes(text) {
  return ask(
    'You are a concise study guide creator. Create ultra-compact revision notes readable in 1 minute using bullet points. Maximum 300 words.',
    `Create one-minute revision notes (bullet points only) from:\n\n${text}`,
    { maxOutputTokens: 400 }
  );
}

// ── Key Information Extraction ───────────────────────────────────

async function extractKeyInformation(text) {
  const raw = await ask(
    'You are an academic content analyzer. Return a JSON object only — no explanation, no markdown, just the JSON.',
    `Extract key information from the text below. Return JSON with:
{
  "mainTopics": ["topic1", ...],
  "subTopics": ["subtopic1", ...],
  "learningObjectives": ["objective1", ...],
  "keywords": ["keyword1", ...],
  "definitions": { "term": "definition" },
  "keyFacts": ["fact1", ...]
}

Text:\n${text}`,
    { temperature: 0.3, maxOutputTokens: 2000 }
  );
  return safeParseJSON(raw, { mainTopics: [], subTopics: [], keywords: [], learningObjectives: [] });
}

// ── Flashcards ───────────────────────────────────────────────────

async function generateFlashcards(text, numberOfFlashcards = 15) {
  const n = Math.min(numberOfFlashcards, 20);
  const raw = await ask(
    'You are an expert educator. CRITICAL: Your entire response must be ONLY a valid JSON array. No markdown code fences, no explanations, no text outside the JSON.',
    `Create ${n} flashcards from the text below.
Respond with ONLY this JSON array (nothing else before or after):
[{"question":"...","answer":"...","category":"definition","difficulty":"medium","topic":"..."},...]

Text (focus on the most important concepts):\n${text.substring(0, 8000)}`,
    { temperature: 0.4, maxOutputTokens: 6000 }
  );
  const parsed = safeParseJSON(raw, []);
  return Array.isArray(parsed) ? parsed.slice(0, n) : [];
}

// ── Multiple Choice Questions ────────────────────────────────────

async function generateMCQs(text, numberOfQuestions = 15) {
  const n = Math.min(numberOfQuestions, 20);
  const raw = await ask(
    'You are an expert exam creator. CRITICAL: Your entire response must be ONLY a valid JSON array. No markdown code fences, no explanations.',
    `Create ${n} multiple-choice questions from the text below.
Respond with ONLY this JSON array (nothing before or after it):
[{"id":"q1","question":"...","options":["Option A","Option B","Option C","Option D"],"correctAnswer":0,"explanation":"..."},...]
Note: correctAnswer is the index (0-3) of the correct option.

Text:\n${text.substring(0, 8000)}`,
    { temperature: 0.4, maxOutputTokens: 8192 }
  );
  const parsed = safeParseJSON(raw, []);
  return Array.isArray(parsed) ? parsed.slice(0, n) : [];
}

// ── Podcast Script (adaptive length based on text size) ──────────

async function generatePodcastScript(text, length = 'auto') {
  // Adaptive: base duration on how much content there is
  let duration;
  if (length === 'short') {
    duration = '3–5 minutes';
  } else if (length === 'long') {
    duration = '12–18 minutes';
  } else if (length === 'medium') {
    duration = '7–10 minutes';
  } else {
    // 'auto' — scale with text length
    const words = text.trim().split(/\s+/).length;
    if (words < 400)       duration = '2–4 minutes';
    else if (words < 1200) duration = '5–8 minutes';
    else if (words < 3000) duration = '8–12 minutes';
    else                   duration = '12–18 minutes';
  }

  return ask(
    `You are a professional podcast narrator and scriptwriter.
Write an engaging, conversational narration script that sounds natural when read aloud.
Rules: no stage directions, no [bracketed notes], no headers, no speaker labels — only the spoken words.
Start immediately with engaging content. Use smooth transitions between topics.`,
    `Write a podcast narration script (approximately ${duration} when spoken aloud) based on this content:\n\n${text.substring(0, 12000)}`,
    { temperature: 0.75, maxOutputTokens: parseInt(process.env.PODCAST_SCRIPT_MAX_TOKENS) || 4096 }
  );
}

// ── AI Chatbot ────────────────────────────────────────────────────

/**
 * Answer a user question based on note context.
 * @param {string} question     - The user's question
 * @param {string} noteContext  - The relevant note content
 * @param {Array}  history      - [{ role: 'user'|'model', text: '...' }]
 */
async function chatWithNotes(question, noteContext, history = []) {
  const model = getModel({ temperature: 0.5, maxOutputTokens: 2048 });

  // Build system preamble
  const systemPreamble = `You are an intelligent study assistant. Your ONLY knowledge source is the document below.
Answer questions clearly and accurately based solely on this document.
If the answer is not in the document, say: "I couldn't find that in your notes."
Be helpful, concise, and educational.

--- DOCUMENT START ---
${noteContext.substring(0, 12000)}
--- DOCUMENT END ---`;

  // Build conversation history for Gemini
  const chatHistory = history.slice(-parseInt(process.env.CHAT_HISTORY_LIMIT) || -20).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPreamble }] },
      { role: 'model', parts: [{ text: 'Understood. I will answer questions based on the provided document only.' }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessage(question);
  return result.response.text().trim();
}

// ── General AI Chat (no note context required) ───────────────────
async function generalChat(question, history = []) {
  const model = getModel({ temperature: 0.7, maxOutputTokens: 2048 });

  const systemPreamble = `You are VoiceAI Assistant, a smart AI study companion powered by Google Gemini.
You help students with their learning — answering academic questions, explaining concepts, helping with essays, 
summarizing topics, and supporting all educational needs.
You are friendly, clear, and helpful. Use markdown formatting when it improves readability.
Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  const chatHistory = history.slice(-20).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemPreamble }] },
      { role: 'model', parts: [{ text: 'Hi! I\'m VoiceAI Assistant. How can I help you study today?' }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessage(question);
  return result.response.text().trim();
}

// ── Multi-language Translation ───────────────────────────────────

async function translateText(text, targetLanguage) {
  return ask(
    `You are a professional translator. Translate the following text to ${targetLanguage}. 
Preserve the original structure, formatting, and meaning exactly. Return only the translated text.`,
    text,
    { temperature: 0.3, maxOutputTokens: 4096 }
  );
}

// ── Language Detection ───────────────────────────────────────────

async function detectLanguage(text) {
  const raw = await ask(
    'Return only a JSON object with "language" (full name) and "code" (ISO 639-1). Nothing else.',
    `Detect the language of: "${text.substring(0, 500)}"`,
    { temperature: 0.1, maxOutputTokens: 50 }
  );
  return safeParseJSON(raw, { language: 'English', code: 'en' });
}

module.exports = {
  generateComprehensiveSummary,
  generateMediumSummary,
  generateExamRevisionSummary,
  generateOneMinuteNotes,
  extractKeyInformation,
  generateFlashcards,
  generateMCQs,
  generatePodcastScript,
  chatWithNotes,
  generalChat,
  translateText,
  detectLanguage,
};
