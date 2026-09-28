import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini API client on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// CineFlow AI Timeline Copilot Endpoint
app.post('/api/ai-command', async (req, res) => {
  try {
    const { prompt, editorContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: false,
        fallback: true,
        message: 'No GEMINI_API_KEY set on server; utilizing local intent engine.',
      });
    }

    const systemInstruction = `You are CineFlow AI Assistant, an expert video editing copilot for CineFlow Studio non-linear video editor.
Your job is to translate natural language editing commands into structured JSON timeline actions.

Current Timeline Editor Context:
- Current Playhead Time: ${editorContext.currentTimeFormatted} (${editorContext.currentTime}s)
- Total Sequence Duration: ${editorContext.duration}s
- Selected Active Clip: ${editorContext.selectedClip ? `"${editorContext.selectedClip.name}" (ID: ${editorContext.selectedClip.id}, Track: ${editorContext.selectedClip.trackId}, Type: ${editorContext.selectedClip.type}, Start: ${editorContext.selectedClip.startTime}s, Dur: ${editorContext.selectedClip.duration}s)` : 'None'}
- Selected Clips Count: ${editorContext.selectedClipIds?.length || 0}
- Active Tracks: ${JSON.stringify(editorContext.tracksSummary || [])}

Available Actions:
- "add_adjustment_layer": Create a non-destructive adjustment layer clip.
- "add_effects_layer": Create a procedural FX overlay layer.
- "add_title": Insert a title graphic clip.
- "add_smpte_bars": Add SMPTE color bars leader.
- "add_countdown": Add countdown leader.
- "add_track": Add a new track (media, adjustment, effects, or audio).
- "split_clip": Cut/split selected clip or clip at playhead.
- "apply_transition": Apply fade-in, fade-out, crossfade, or dip to black to selected clip.
- "apply_effect": Apply an effect or LUT (e.g., "lut-teal-orange", "lut-cyberpunk", "gaussian-blur", "ae-vhs-glitch", "ae-deep-glow", "ae-optical-flares", "ae-chromatic-aberration").
- "modify_transform": Update opacity, scale, rotation, positionX, positionY, or blendMode on selected clip.
- "track_control": Mute, unmute, solo, or lock a track.
- "seek_playhead": Jump playhead to specific timestamp or relative time.
- "delete_clip": Remove selected clip from timeline.

Parse the prompt and return the structured action parameters.`;

    let response;
    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: 'The primary timeline action name',
          },
          parameters: {
            type: Type.OBJECT,
            properties: {
              layerType: { type: Type.STRING, description: 'media, adjustment, effects, or audio' },
              trackId: { type: Type.STRING },
              targetClipId: { type: Type.STRING },
              effectId: { type: Type.STRING },
              transitionType: { type: Type.STRING, description: 'fade-in, fade-out, crossfade, dip-to-black' },
              opacity: { type: Type.NUMBER },
              scale: { type: Type.NUMBER },
              rotation: { type: Type.NUMBER },
              positionX: { type: Type.NUMBER },
              positionY: { type: Type.NUMBER },
              time: { type: Type.NUMBER },
              mute: { type: Type.BOOLEAN },
              lock: { type: Type.BOOLEAN },
              type: { type: Type.STRING },
            },
          },
          explanation: {
            type: Type.STRING,
            description: 'Human-friendly description of the action taken on the timeline',
          },
        },
        required: ['action', 'explanation'],
      },
    };

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });
    } catch (primaryErr: any) {
      console.warn('Primary model error, falling back to gemini-3.1-flash-lite:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config,
      });
    }

    const rawText = (response.text || '{}').trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned || '{}');
    }
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error in /api/ai-command:', error);
    return res.json({ success: false, error: error.message });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineFlow Server running at http://localhost:${PORT}`);
  });
}

startServer();
