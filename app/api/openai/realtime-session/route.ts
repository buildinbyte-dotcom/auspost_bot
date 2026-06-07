import { AUSPOST_VOICE_SYSTEM_PROMPT } from '@/app/lib/auspostVoicePrompt';

export const runtime = 'nodejs';

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
const SUPPORTED_REALTIME_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);

function getRealtimeVoice() {
  const configuredVoice = process.env.OPENAI_REALTIME_VOICE || 'marin';
  return SUPPORTED_REALTIME_VOICES.has(configuredVoice) ? configuredVoice : 'marin';
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.includes('replace-me')) {
    return Response.json(
      { error: 'Set OPENAI_API_KEY in .env.local before starting a voice session.' },
      { status: 500 },
    );
  }

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions: AUSPOST_VOICE_SYSTEM_PROMPT,
        tools: [
          {
            type: 'function',
            name: 'claim_prize_code',
            description: 'Reserve one one-time prize code after a child answers both quiz questions correctly. Call this only after both answers are correct.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Short reason why the prize code is being requested.',
                },
              },
              required: ['reason'],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: 'auto',
        audio: {
          input: {
            noise_reduction: {
              type: 'near_field',
            },
            transcription: {
              model: 'gpt-4o-mini-transcribe',
              language: 'en',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.72,
              prefix_padding_ms: 700,
              silence_duration_ms: 2200,
              create_response: true,
              interrupt_response: false,
            },
          },
          output: {
            voice: getRealtimeVoice(),
          },
        },
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return Response.json(
      { error: 'OpenAI Realtime session could not be created.', detail: data },
      { status: response.status },
    );
  }

  return Response.json(data);
}
