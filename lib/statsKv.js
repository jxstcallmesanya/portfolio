function moscowDateKeyForOffset(daysAgo) {
  const msPerDay = 86400000;
  const t = new Date(Date.now() - daysAgo * msPerDay);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(t);
}

export function todayMoscowKey() {
  return moscowDateKeyForOffset(0);
}

export function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function incrementVisitToday() {
  if (!isKvConfigured()) {
    return { ok: false, skipped: true };
  }
  const { kv } = await import('@vercel/kv');
  const key = todayMoscowKey();
  const n = await kv.incr(`visits:${key}`);
  return { ok: true, skipped: false, date: key, total: n };
}

export async function getVisitStatsLastDays(numDays = 30) {
  if (!isKvConfigured()) {
    return { ok: false, days: [], hint: 'Подключите Vercel KV (KV_REST_API_URL, KV_REST_API_TOKEN)' };
  }
  const { kv } = await import('@vercel/kv');
  const labels = [];
  const keys = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const label = moscowDateKeyForOffset(i);
    labels.push(label);
    keys.push(`visits:${label}`);
  }
  const values = await Promise.all(keys.map((k) => kv.get(k)));
  const days = labels.map((date, i) => ({
    date,
    count: values[i] == null ? 0 : Number(values[i])
  }));
  return { ok: true, days };
}
