# Rive + OpenAI Realtime Voice Flow

This document describes the current main experience in `app/page.tsx`: a shopping-centre Australia Post Koala that talks to kids through OpenAI Realtime voice and animates a Rive mascot in sync with the voice stream.

## Entry Points

- `/` is the main kiosk experience with the Rive koala animation.
- `/voice` is still present as a smaller voice-chat prototype, but it is not the main integrated Rive experience.
- The main page dynamically imports `app/components/KoalaMascot.tsx` with `ssr: false` because Rive depends on browser-only APIs.

## Runtime Flow

1. The child presses the main mic button in `app/page.tsx`.
2. `startSession()` calls `/api/openai/realtime-session` to request an ephemeral OpenAI Realtime client secret.
3. The browser asks for microphone access with `navigator.mediaDevices.getUserMedia({ audio: true })`.
4. A browser `RTCPeerConnection` is created.
5. The microphone track is added to the peer connection.
6. A data channel named `oai-events` is created for Realtime events and tool-call messages.
7. The browser creates a WebRTC offer and sends the SDP to `https://api.openai.com/v1/realtime/calls` using the ephemeral token.
8. OpenAI returns the SDP answer, which is set as the remote description.
9. When the data channel opens, the app sends an initial `response.create` event that asks the model to greet the child as the Australia Post Koala and offer three choices: story, quiz, or chat.

## Server-Side Realtime Session

`app/api/openai/realtime-session/route.ts` keeps the real OpenAI API key server-side and creates the ephemeral client secret used by the browser.

The session config includes:

- `model`: defaults to `gpt-realtime`, overridable through `OPENAI_REALTIME_MODEL`.
- `instructions`: imported from `app/lib/auspostVoicePrompt.ts`.
- `audio.input.transcription`: uses `gpt-4o-mini-transcribe`.
- `audio.input.turn_detection`: uses server VAD with a longer silence window so kids can pause before finishing an answer.
- `audio.output.voice`: read from `OPENAI_REALTIME_VOICE`, with unsupported values falling back to `marin`.
- `tools`: registers `claim_prize_code`, used only after both quiz answers are correct.

## Voice Conversation Modes

The behavior is mainly controlled by `app/lib/auspostVoicePrompt.ts`.

The Australia Post Koala starts by offering three distinct options:

1. Story: a short kid-friendly story about Australia Post, post, parcels, letters, deliveries, post offices, or stamps.
2. Quiz: a two-question quiz for a chance to win a prize.
3. Chat: up to three Australia Post related questions.

Kids can say `menu`, `go back`, or `start again` to return to the menu.

## Audio Playback and Rive Sync

OpenAI sends remote voice audio over the WebRTC connection. The main page handles that in `pc.ontrack`.

The same remote media stream is used in two ways:

- Playback: assigned to the hidden `<audio ref={audioRef} autoPlay />`.
- Animation signal: connected to a Web Audio `AnalyserNode`.

The analyser loop runs on `requestAnimationFrame()`:

1. `getByteFrequencyData()` reads the current voice energy.
2. The app averages the frequency bins.
3. If the average is above the threshold, `isTalking` is set to `true` and the phase becomes `speaking`.
4. If the average drops, `isTalking` is set to `false`.

That means the Rive koala reacts to the actual OpenAI voice stream, not only to text events.

## Transcript-Driven Mouth Shapes

Realtime audio transcript deltas are also used for more detailed mouth movement.

In `app/page.tsx`:

- `response.audio_transcript.delta` appends text into `transcriptRef`.
- The current delta is passed into `speakingText`.
- The speech bubble displays the accumulated transcript while Kody is speaking.

In `app/components/KoalaMascot.tsx`:

- The Rive file is loaded from `public/koala_mascot.riv`.
- The state machine is `Koala_StateMachine`.
- The component binds Rive view-model inputs:
  - `is_speaking`
  - `mouth_index`
  - `blink_trigger`
  - `wave_trigger`

Important detail: `is_speaking` is forced to `false` because the Rive `talk_loop` would override manual `mouth_index` control. The code drives `mouth_index` directly.

`charToMouthIndex()` maps transcript characters to mouth shapes:

- `0`: rest or pause
- `1`: closed lips for `m`, `b`, `p`
- `2`: small mouth for most consonants
- `3`: open `a`
- `4`: wide `e`, `i`, `y`
- `5`: round `o`, `u`, `w`

If audio is playing but no transcript delta is available yet, the mascot falls back to a generic talking mouth sequence.

## Rive Idle and Greeting Behavior

`KoalaMascot` also adds non-speech animation:

- Random blinking every few seconds.
- Initial wave shortly after mount.
- Occasional idle waves while not speaking.
- Small idle mouth wiggles to keep the character alive.
- A greeting wave if the spoken text contains greeting words such as `hi`, `hello`, `hey`, or `g'day`.

## Prize Flow

The quiz prize logic is intentionally not left to free-form model output.

1. The prompt tells the model to call `claim_prize_code` only after the child answers both quiz questions correctly.
2. Realtime sends a `response.function_call_arguments.done` event over the data channel.
3. `app/page.tsx` handles the tool call with `handlePrizeClaim()`.
4. The browser calls `/api/prize/claim`.
5. `app/api/prize/claim/route.ts` reads `data/prize-codes.csv`.
6. For the current demo, the hourly prize window is disabled. The route reserves the next unclaimed one-time code and marks it with `claimedAt`.
7. The tool result is sent back to OpenAI with `conversation.item.create` as `function_call_output`.
8. If a prize is won, the app shows the code above the koala for about 10 seconds while the model spells it out and then offers the menu again.

## Cleanup

When the child finishes or the session resets, `stopSession()`:

- Cancels the animation frame.
- Closes the audio context.
- Closes the data channel.
- Stops microphone tracks.
- Closes the peer connection.
- Clears the remote audio element.
- Resets local UI state and transcript buffers.

This avoids keeping microphone, WebRTC, or Web Audio resources alive after the interaction ends.
