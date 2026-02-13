#!/usr/bin/env tsx
/**
 * Fetch approval detail by sp_no (safe extraction for form mapping)
 */

export {};

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

function readText(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(readText).filter(Boolean).join(' | ');
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (Array.isArray(v.value)) return v.value.map(readText).filter(Boolean).join(' | ');
  }
  return '';
}

async function main() {
  const spNo = arg('--sp-no');
  if (!spNo) {
    console.log('Usage: pnpm wecom:detail --sp-no 202602120011');
    process.exit(1);
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  if (!corpId || !secret) throw new Error('missing env: WECOM_CORP_ID / WECOM_SECRET');

  const tokenResp = await getJson(
    wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`)
  );
  okOrThrow(tokenResp, 'gettoken');
  const accessToken = tokenResp.access_token as string;

  const detailResp = await getJson(wecomUrl('/cgi-bin/oa/getapprovaldetail', accessToken), {
    method: 'POST',
    body: JSON.stringify({ sp_no: spNo }),
  });
  okOrThrow(detailResp, 'getapprovaldetail');

  const contents = detailResp?.info?.apply_data?.contents || [];
  const normalized = contents.map((c: any) => ({
    id: c?.id,
    control: c?.control,
    title: c?.title?.[0]?.text || c?.title?.text || '',
    text_preview: readText(c?.value),
    selector_keys: c?.value?.selector?.options?.map((o: any) => o?.key).filter(Boolean) || [],
    related_sp_no: c?.value?.related_approval?.map((x: any) => x?.sp_no).filter(Boolean) || [],
    file_ids: c?.value?.files?.map((f: any) => f?.file_id).filter(Boolean) || [],
  }));

  console.log(JSON.stringify({ sp_no: spNo, controls: normalized }, null, 2));
}

main().catch((e: any) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
