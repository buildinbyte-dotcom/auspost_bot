// ── Voucher reward pool ──────────────────────────────────────────────────────
const REWARDS = [
  {
    reward: 'Free Kody Koala Sticker Pack 🐨',
    description: 'Grab your FREE sticker pack at the counter — Kody stickers inside!',
    icon: '🎁',
  },
  {
    reward: 'Free Australia Post Postcard ✉️',
    description: 'Send a FREE postcard anywhere in Australia — tell a friend your story!',
    icon: '📮',
  },
  {
    reward: 'Free Gift Wrapping Service 🎀',
    description: 'Get FREE gift wrapping on your next parcel — perfect for surprises!',
    icon: '🎀',
  },
  {
    reward: 'Free Kody Colouring Sheet 🖍️',
    description: 'Colour in your very own Kody the Koala adventure page — ask at the counter!',
    icon: '🎨',
  },
  {
    reward: 'Kody Explorer Badge 🏅',
    description: 'Collect your official Kody Explorer Badge — show the counter team!',
    icon: '🌟',
  },
];

// ── Generate a unique voucher code ──────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KODY-${part(4)}-${part(4)}`;
}

export async function POST(req: Request) {
  const { storyTitle } = await req.json();

  const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  const code = generateCode();

  // Expiry: 30 days from today
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const expiryDate = expiry.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return Response.json({
    code,
    reward: reward.reward,
    description: reward.description,
    icon: reward.icon,
    storyTitle: storyTitle ?? 'Kody\'s Story',
    expiryDate,
    validAt: 'All Australia Post stores',
    issuedAt: new Date().toISOString(),
  });
}
