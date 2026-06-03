import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const STORIES: Record<string, { title: string; opening: string }> = {
  magical_parcel: {
    title: 'The Magical Parcel',
    opening:
      "One sunny morning, a sparkling golden parcel landed at Kody's post office — glowing and humming a little tune. The address label had words that changed colour every few seconds!",
  },
  big_day_out: {
    title: "Kody's Big Day Out",
    opening:
      "Kody the Koala had the BIGGEST delivery bag ever today — stuffed full of colourful letters and parcels for animals all across Australia. First stop: the red outback!",
  },
  reef_mail: {
    title: 'Reef Mail',
    opening:
      "A friendly dolphin named Coral leapt out of the ocean, holding a soggy envelope in her fin. She needed Kody's help to deliver a very important letter to her underwater friends at the Great Barrier Reef!",
  },
  lost_star: {
    title: 'The Star That Got Lost',
    opening:
      "During a big thunderstorm, a tiny twinkling star tumbled out of the night sky and landed right inside Australia Post's letterbox with a soft CLINK. It needed help finding its way back home!",
  },
};

const SYSTEM_PROMPT = `You are Kody, Australia Post's magical storytelling Koala for children aged 4–10.

Tell interactive adventure stories set in magical Australian worlds. Include fun Australian animals (kangaroos, wombats, possums, echidnas, cockatoos, quokkas, etc.). Stories always tie back to the joy of sending and receiving parcels and letters.

ALWAYS respond with ONLY valid JSON — no markdown, no extra text:
{
  "narration": "2–3 vivid, exciting sentences. Max 55 words. Simple, joyful language for young children!",
  "emotion": "one of: happy, excited, surprised, thinking, proud, sad",
  "choices": ["First fun choice (max 8 words)", "Second fun choice (max 8 words)"],
  "storyComplete": false
}

When ending the story (after 4–6 segments OR if the history is long), set storyComplete to true, omit choices, end on a warm happy note, and have Kody cheer for the child's great choices.
Keep it magical, vivid, and full of wonder!`;

export async function POST(req: Request) {
  const { storyId, history, choice } = await req.json();

  const story = STORIES[storyId];
  if (!story) {
    return Response.json({ error: 'Story not found' }, { status: 404 });
  }

  const historyLength = Array.isArray(history) ? history.length : 0;
  const shouldEnd = historyLength >= 4;

  let userContent: string;

  if (historyLength === 0) {
    userContent = `Start the story "${story.title}" with this opening:\n"${story.opening}"\n\nRespond with the first story JSON segment.`;
  } else {
    const historyText = history
      .map((h: { narration: string; choice: string }) =>
        `📖 Story: ${h.narration}\n🧒 Child chose: ${h.choice}`)
      .join('\n\n');

    userContent = shouldEnd
      ? `Story "${story.title}" so far:\n${historyText}\n\nLatest choice: "${choice}"\n\nNow END the story beautifully — set storyComplete: true, no choices. Give Kody a proud, heartwarming farewell to the child.`
      : `Story "${story.title}" so far:\n${historyText}\n\nLatest choice: "${choice}"\n\nContinue the story with the next exciting moment! Respond with the next JSON segment.`;
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '';

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const data = JSON.parse(match[0]);
    return Response.json(data);
  } catch {
    return Response.json({
      narration:
        'Something magical happened and the adventure continued in the most wonderful way!',
      emotion: 'happy',
      choices: ['Keep exploring!', 'Try something new!'],
      storyComplete: false,
    });
  }
}
