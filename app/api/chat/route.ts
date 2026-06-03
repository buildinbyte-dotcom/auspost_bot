import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const STORIES: Record<string, string> = {
  magical_parcel: 'The Magical Parcel',
  big_day_out:    "Kody's Big Day Out",
  reef_mail:      'Reef Mail',
  lost_star:      'The Star That Got Lost',
};

const KODY_SYSTEM = `You are Kody the Koala — the friendly, enthusiastic Australia Post mascot at an interactive kiosk.

Your personality:
- Warm, cheerful, encouraging — like a fun older sibling
- Use Australian slang naturally (mate, crikey, ripper, g'day)
- Keep every spoken response SHORT — 1–3 sentences only
- End with a question or invitation when relevant

Available stories (you can start any of these):
1. The Magical Parcel — a sparkling mystery parcel adventure
2. Kody's Big Day Out — across Australia with Kody
3. Reef Mail — underwater adventure delivering mail
4. The Star That Got Lost — help a lost star find its way home

CRITICAL: When the user wants to start a story or you decide it's time to start one,
you MUST include a JSON block at the END of your reply in exactly this format:
{"action":"start_story","storyId":"magical_parcel"}

Valid storyId values: magical_parcel, big_day_out, reef_mail, lost_star

If no story action needed, do NOT include any JSON.

Example:
User: "I want the reef one!"
Reply: "Oh ripper! Let's dive into Reef Mail — you're in for a wild underwater ride, mate!
{"action":"start_story","storyId":"reef_mail"}"`;

const IDLE_PROMPTS = [
  "Oops, did I lose you there, mate? Just tap the phone and say G'day!",
  "G'day! I'm Kody the Koala! Want to hear an amazing adventure story today?",
  "Hey there! I've got four brilliant adventures ready — just tap the phone and tell me which one you'd like!",
  "Crikey, it's a bit quiet! Come on, tap that phone and let's go on an adventure!",
  "Hello hello! Tap the phone button and tell me your name — let's go on an adventure together!",
];

export async function POST(req: Request) {
  const { message, context, isIdle } = await req.json();

  if (isIdle) {
    const prompt = IDLE_PROMPTS[Math.floor(Math.random() * IDLE_PROMPTS.length)];
    return Response.json({ reply: prompt, emotion: 'happy', action: null });
  }

  const userMsg = message?.trim();
  if (!userMsg) {
    return Response.json({
      reply: "I didn't quite catch that, mate! Tap the phone and try again!",
      emotion: 'surprised', action: null,
    });
  }

  // Quick local story detection before calling Claude
  const lower = userMsg.toLowerCase();
  for (const [id, title] of Object.entries(STORIES)) {
    const keywords = title.toLowerCase().split(/\s+/);
    const matches = keywords.filter(k => k.length > 3 && lower.includes(k)).length;
    if (matches >= 1 && (lower.includes('start') || lower.includes('want') ||
        lower.includes('that') || lower.includes('one') || lower.includes('let') ||
        lower.includes('go') || lower.includes('play') || lower.includes('tell') ||
        matches >= 2)) {
      return Response.json({
        reply: `Ripper choice! Let's go on "${title}"! Hold on tight, mate — the adventure begins now!`,
        emotion: 'excited',
        action: 'start_story',
        storyId: id,
      });
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    if (context?.length > 0) {
      for (const turn of context) {
        messages.push({ role: 'user',      content: turn.user });
        messages.push({ role: 'assistant', content: turn.kody });
      }
    }
    messages.push({ role: 'user', content: userMsg });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 160,
      system: KODY_SYSTEM,
      messages,
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract action JSON if present
    const jsonMatch = raw.match(/\{"action"[^}]+\}/);
    let action = null;
    let storyId = null;
    let cleanReply = raw;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        action   = parsed.action;
        storyId  = parsed.storyId;
        cleanReply = raw.replace(jsonMatch[0], '').trim();
      } catch { /* ignore parse errors */ }
    }

    let emotion = 'happy';
    if (/crikey|wow|amazing|ripper|woohoo/i.test(cleanReply)) emotion = 'excited';
    else if (/sorry|oh no/i.test(cleanReply))                 emotion = 'sad';
    else if (/think|hmm|wonder/i.test(cleanReply))            emotion = 'thinking';
    else if (/great|proud|well done|brilliant/i.test(cleanReply)) emotion = 'proud';
    else if (/!{2,}|woohoo|yay|hooray/i.test(cleanReply))    emotion = 'cheering';

    return Response.json({ reply: cleanReply, emotion, action, storyId });
  } catch {
    return Response.json({
      reply: "Oops! Give me a tick, mate — tap the phone and try again!",
      emotion: 'surprised', action: null,
    });
  }
}
