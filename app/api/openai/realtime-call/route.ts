export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { sdp, token } = await req.json() as { sdp?: string; token?: string };

  if (!sdp || !token) {
    return Response.json(
      { error: 'Missing SDP offer or Realtime client secret.' },
      { status: 400 },
    );
  }

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/sdp',
    },
    body: sdp,
  });

  const answer = await response.text();

  if (!response.ok) {
    return Response.json(
      { error: 'OpenAI Realtime call exchange failed.', detail: answer },
      { status: response.status },
    );
  }

  return new Response(answer, {
    headers: {
      'Content-Type': 'application/sdp',
    },
  });
}

