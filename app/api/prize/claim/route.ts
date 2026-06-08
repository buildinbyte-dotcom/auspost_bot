import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

interface PrizeRow {
  code: string;
  claimedAt: string;
}

const CSV_PATH = path.join(process.cwd(), 'data', 'prize-codes.csv');

function parseCsv(csv: string): PrizeRow[] {
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [code = '', claimedAt = ''] = line.split(',');
      return { code: code.trim(), claimedAt: claimedAt.trim() };
    })
    .filter((row) => row.code);
}

function serializeCsv(rows: PrizeRow[]) {
  return [
    'code,claimedAt',
    ...rows.map((row) => `${row.code},${row.claimedAt}`),
    '',
  ].join('\n');
}

export async function POST() {
  const csv = await fs.readFile(CSV_PATH, 'utf8');
  const rows = parseCsv(csv);
  const now = new Date();

  const nextCode = rows.find((row) => !row.claimedAt);

  if (!nextCode) {
    return Response.json({
      status: 'no_codes_left',
      message: 'There are no prize codes left.',
    });
  }

  nextCode.claimedAt = now.toISOString();
  await fs.writeFile(CSV_PATH, serializeCsv(rows), 'utf8');

  return Response.json({
    status: 'won',
    code: nextCode.code,
    message: 'Prize code reserved.',
  });
}
