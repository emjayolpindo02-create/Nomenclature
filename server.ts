import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_LIBRARY_IDS = [
  'writing-chemical-formulas',
  'metal-one-oxidation-nonmetal',
  'metal-variable-oxidation-nonmetal',
  'nonmetal-nonmetal',
  'hydrogen-halogen-binary-acids',
  'metal-one-oxidation-polyatomic',
  'metal-variable-oxidation-polyatomic',
  'hydrogen-polyatomic-ternary-acids',
];

const DOCTOR_NOMEN_INSTRUCTION = `You are Doctor Nomen, a warm, friendly, and clear chemistry tutor inside the I-LAB learning app.
Your job is to guide learners and answer any question about these 8 chemical compound naming and formula writing topics:
1. Writing Chemical Formulas (libraryId: "writing-chemical-formulas"):
   - Cation (+) first, anion (-) second.
   - Criss-cross charge magnitudes as subscripts; omit subscript 1.
   - Reduce ionic subscripts to lowest whole-number ratio (e.g., Ca2O2 -> CaO), but NEVER change subscripts inside a polyatomic ion.
   - Use parentheses around a polyatomic ion when its subscript is greater than 1 (e.g., Ca3(PO4)2).
2. Metal with One Oxidation Number + Nonmetal (libraryId: "metal-one-oxidation-nonmetal"):
   - Plain metal name + nonmetal stem + "-ide" (e.g., ZnS = zinc sulfide, Li2O = lithium oxide, AlCl3 = aluminum chloride).
   - Fixed metals (Group 1A +1, Group 2A +2, Al +3, Zn +2, Ag +1) never use Roman numerals or Greek prefixes.
3. Metal with Variable Oxidation Number + Nonmetal (libraryId: "metal-variable-oxidation-nonmetal"):
   - Show both IUPAC Stock (Roman numeral in parentheses) and Traditional (Latin stem + "-ous" for lower, "-ic" for higher).
   - Core variable metals: Cu (+1/+2 cuprous/cupric), Fe (+2/+3 ferrous/ferric), Co (+2/+3 cobaltous/cobaltic), Mn (+2/+4 manganous/manganic), Hg (+1/+2 mercurous/mercuric), Sn (+2/+4 stannous/stannic), Pb (+2/+4 plumbous/plumbic), As (+3/+5 arsenous/arsenic), Sb (+3/+5 antimonous/antimonic).
   - Examples: FeS = iron (II) sulfide / ferrous sulfide; Fe2S3 = iron (III) sulfide / ferric sulfide; Hg2O = mercury (I) oxide / mercurous oxide; HgO = mercury (II) oxide / mercuric oxide.
4. Nonmetal + Nonmetal (libraryId: "nonmetal-nonmetal"):
   - Greek prefixes mono- (1), di- (2), tri- (3), tetra- (4), penta- (5), hexa- (6), hepta- (7), octa- (8), nona- (9), deca- (10) + second element ending in "-ide".
   - Never use "mono-" on the first element. Drop the trailing "a" or "o" of a prefix before "oxide" (e.g., CO = carbon monoxide, CO2 = carbon dioxide, N2O5 = dinitrogen pentoxide).
5. Hydrogen + Halogen (Binary Acids) (libraryId: "hydrogen-halogen-binary-acids"):
   - Pattern: "hydro-" + nonmetal stem + "-ic acid" (e.g., HF = hydrofluoric acid, HCl = hydrochloric acid, HBr = hydrobromic acid, HI = hydroiodic acid).
6. Metal with One Oxidation Number + Polyatomic Ion (libraryId: "metal-one-oxidation-polyatomic"):
   - Metal name + polyatomic ion name without changing the polyatomic ending (e.g., NaNO3 = sodium nitrate, Ca3(PO4)2 = calcium phosphate).
7. Metal with Variable Oxidation Number + Polyatomic Ion (libraryId: "metal-variable-oxidation-polyatomic"):
   - Both Stock (Roman numeral) and Traditional (-ous/-ic) + polyatomic ion name (e.g., Pb(NO3)2 = lead (II) nitrate / plumbous nitrate; Pb(NO3)4 = lead (IV) nitrate / plumbic nitrate).
8. Hydrogen + Polyatomic Ion (Ternary Acids) (libraryId: "hydrogen-polyatomic-ternary-acids"):
   - Never use "hydro-". Change "-ite" to "-ous" and "-ate" to "-ic", then add "acid" (e.g., HNO2 = nitrous acid, HNO3 = nitric acid, H2SO3 = sulfurous acid, H2SO4 = sulfuric acid).
   - Special note: H2O is water, a neutral molecule, never named like an acid.

Rules for your responses:
- Speak naturally, simply, and encouragingly in 2 to 4 clear sentences so your answer reads smoothly aloud as voice speech. Avoid markdown syntax like **, ##, or backticks.
- Write chemical formulas in plain readable text inside "reply" (or pronounce clearly) and put the exact clean ASCII formula in the "formula" field (e.g., "Fe2S3", "Ca3(PO4)2", "HNO3"), or "" if none applies.
- Never mention any school name, author, course code, or case letters like Case A, Case B, A1, B2.
- If the user asks something outside chemistry or these topics, politely connect it back to chemical naming or answer briefly and invite a compound naming question.
- Always select the most relevant "libraryId" from the 8 valid IDs, or "" if the question is purely general.`;

interface HistoryTurn {
  role: 'user' | 'model';
  text: string;
}

function cleanTextForSpeech(input: string): string {
  return input
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGeminiError(err: unknown): { status: number; message: string } {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/AIza[0-9A-Za-z_-]+/g, '[redacted]');
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED')) {
    return { status: 403, message: 'API permission denied. Please check your Gemini API key in Settings > Secrets.' };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, message: 'Doctor Nomen is momentarily busy. Please try again in a few seconds.' };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('400')) {
    return { status: 400, message: 'Invalid request or API key configuration.' };
  }
  return { status: 500, message: 'Doctor Nomen could not respond right now. Please try again.' };
}

const ttsAudioCache = new Map<string, string>();
const MAX_TTS_CACHE_ENTRIES = 50;
let ttsCooldownUntilMs = 0;

function extractRetryDelayMs(err: unknown): number {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (match) {
    const sec = Number(match[1]);
    if (Number.isFinite(sec) && sec > 0) {
      return Math.min(sec * 1000, 60 * 60 * 1000);
    }
  }
  return 15 * 60 * 1000;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Ask Doctor Nomen a question (text or transcribed speech)
  app.post('/api/nomen/ask', async (req, res) => {
    try {
      const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      const history: HistoryTurn[] = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

      if (!question) {
        res.status(400).json({ error: 'Please enter or speak a question for Doctor Nomen.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Doctor Nomen voice and AI service requires GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      const contents = [
        ...history
          .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim())
          .map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          })),
        {
          role: 'user' as const,
          parts: [{ text: question }],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: DOCTOR_NOMEN_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Clear, friendly, spoken-ready explanation answering the student question.',
              },
              formula: {
                type: Type.STRING,
                description: 'Plain ASCII chemical formula if a specific compound is discussed (e.g., Fe2S3, Ca3(PO4)2), else empty string.',
              },
              compoundName: {
                type: Type.STRING,
                description: 'Full chemical name (including Stock and Traditional if variable metal), else empty string.',
              },
              libraryId: {
                type: Type.STRING,
                description: 'Most relevant library ID from the 8 topics, or empty string if general.',
              },
              followUpSuggestion: {
                type: Type.STRING,
                description: 'One short follow-up question the student might ask next.',
              },
            },
            required: ['reply', 'formula', 'compoundName', 'libraryId', 'followUpSuggestion'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      let parsed: {
        reply?: string;
        formula?: string;
        compoundName?: string;
        libraryId?: string;
        followUpSuggestion?: string;
      } = {};

      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { reply: cleanTextForSpeech(rawText) };
      }

      const libraryId =
        parsed.libraryId && VALID_LIBRARY_IDS.includes(parsed.libraryId)
          ? parsed.libraryId
          : '';

      res.json({
        reply: cleanTextForSpeech(parsed.reply || 'I can help you with any of our 8 compound naming rules. Try asking about a formula or name!'),
        formula: (parsed.formula || '').trim(),
        compoundName: (parsed.compoundName || '').trim(),
        libraryId,
        followUpSuggestion: (parsed.followUpSuggestion || '').trim(),
      });
    } catch (err) {
      const { status, message } = parseGeminiError(err);
      if (status === 429) {
        console.warn('Gemini quota reached in /api/nomen/ask; client falls back locally.');
      } else {
        console.error('Error in /api/nomen/ask:', err);
      }
      res.status(status).json({ error: message });
    }
  });

  // Convert Doctor Nomen's reply into spoken audio using Gemini TTS (with cache + graceful browser fallback on quota)
  app.post('/api/nomen/speak', async (req, res) => {
    try {
      const text = typeof req.body?.text === 'string' ? cleanTextForSpeech(req.body.text) : '';
      if (!text) {
        res.status(400).json({ error: 'No text provided to speak.' });
        return;
      }

      const clippedText = text.slice(0, 1200);
      const ttsCacheKey = `Iapetus:${clippedText}`;
      const cachedAudio = ttsAudioCache.get(ttsCacheKey);
      if (cachedAudio) {
        res.json({
          audioBase64: cachedAudio,
          mimeType: 'audio/wav',
          voiceName: 'Iapetus',
          cached: true,
        });
        return;
      }

      if (Date.now() < ttsCooldownUntilMs) {
        res.json({
          audioBase64: null,
          fallback: 'browser',
          quotaLimited: true,
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.json({
          audioBase64: null,
          fallback: 'browser',
          quotaLimited: false,
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clippedText,
                speechMetadata: {
                  style: 'Warm, clear, steady chemistry teacher',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Iapetus' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.json({
          audioBase64: null,
          fallback: 'browser',
          quotaLimited: false,
        });
        return;
      }

      if (ttsAudioCache.size >= MAX_TTS_CACHE_ENTRIES) {
        const oldestKey = ttsAudioCache.keys().next().value;
        if (oldestKey) ttsAudioCache.delete(oldestKey);
      }
      ttsAudioCache.set(ttsCacheKey, base64Audio);

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      const { status } = parseGeminiError(err);
      if (status === 429) {
        ttsCooldownUntilMs = Date.now() + extractRetryDelayMs(err);
        console.warn('Gemini TTS daily quota reached in /api/nomen/speak; using browser speech synthesis fallback.');
        res.json({
          audioBase64: null,
          fallback: 'browser',
          quotaLimited: true,
        });
        return;
      }

      console.warn('Gemini TTS unavailable in /api/nomen/speak; using browser fallback.');
      res.json({
        audioBase64: null,
        fallback: 'browser',
        quotaLimited: false,
      });
    }
  });

  // Transcribe user's spoken question audio via Gemini Transcribe
  app.post('/api/nomen/transcribe', async (req, res) => {
    try {
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/webm';

      if (!audioBase64) {
        res.status(400).json({ error: 'No audio data received.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured.',
        });
        return;
      }

      let transcript = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this audio.',
              },
            ],
          },
        });
        transcript = (
          response.text ??
          response.candidates?.[0]?.content?.parts
            ?.map((p) => (typeof p.text === 'string' ? p.text : ''))
            .join(' ') ??
          ''
        ).trim();
      } catch (transcribeErr) {
        console.warn('gemini-3.5-transcribe failed, falling back to multimodal flash-lite:', transcribeErr);
      }

      if (!transcript) {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe the spoken chemistry question in this audio into plain text only. Output only the exact spoken words.',
              },
            ],
          },
          config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
        });
        transcript = (fallbackResp.text ?? '').trim();
      }

      res.json({ transcript });
    } catch (err) {
      console.error('Error in /api/nomen/transcribe:', err);
      const { status, message } = parseGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  // Serve Vite middleware in development or static dist in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        ws: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });

    if (disableHmr) {
      app.use(async (req, res, next) => {
        if (req.method !== 'GET' || !req.path.endsWith('/@vite/client')) {
          next();
          return;
        }
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (!result?.code) {
            next();
            return;
          }
          const patched = result.code
            .replaceAll('await wsTransport.connect(handlers);', 'return;')
            .replaceAll('ws.send(JSON.stringify(data));', 'ws?.send(JSON.stringify(data));');
          res.type('application/javascript').send(patched);
        } catch {
          next();
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          const fileName = path.basename(filePath);
          if (
            fileName === 'sw.js' ||
            fileName === 'registerSW.js' ||
            fileName === 'manifest.webmanifest' ||
            fileName === 'index.html'
          ) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`I-LAB server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start I-LAB server:', err);
  process.exit(1);
});
