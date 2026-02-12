#!/usr/bin/env tsx
/**
 * List approval sp_no within a time window.
 *
 * Example:
 *   pnpm wecom:list --days 30
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const kv = process.argv.find((a) => a.startsWith(`${name}=`));
  return kv ? kv.slice(name.length + 1) : undefined;
}

function wecomUrl(path: string, token?: string) {
  const base = 'https://qyapi.weixin.qq.com';
  if (!token) return `${base}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}access_token=${encodeURIComponent(token)}`;
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
}

function okOrThrow(data: any, scene: string) {
  const code = Number(data?.errcode ?? -1);
  if (code !== 0) throw new Error(`${scene} failed: errcode=${code}, errmsg=${data?.errmsg || 'unknown'}`);
}

async function main() {
  const days = Number(arg('--days') || '30');
  const size = Math.min(100, Math.max(1, Number(arg('--size') || '20')));

  const now = Math.floor(Date.now() / 1000);
  const start = now - days * 24 * 3600;

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  if (!corpId || !secret) throw new Error('missing env: WECOM_CORP_ID / WECOM_SECRET');

  const tokenResp = await getJson(
    wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`)
  );
  okOrThrow(tokenResp, 'gettoken');
  const accessToken = tokenResp.access_token as string;

  let cursor = 0;
  const all: string[] = [];

  for (let i = 0; i < 10; i++) {
    const resp = await getJson(wecomUrl('/cgi-bin/oa/getapprovalinfo', accessToken), {
      method: 'POST',
      body: JSON.stringify({
        starttime: start,
        endtime: now,
        cursor,
        size,
      }),
    });
    okOrThrow(resp, 'getapprovalinfo');

    const list = (resp?.sp_no_list || []) as string[];
    all.push(...list);

    const next = Number(resp?.next_cursor ?? 0);
    if (!next || next === cursor || list.length === 0) break;
    cursor = next;
  }

  console.log(JSON.stringify({ count: all.length, sp_no_list: all }, null, 2));
}

main().catch((e: any) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
