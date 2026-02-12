#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const kv = process.argv.find((a) => a.startsWith(`${name}=`));
  return kv ? kv.slice(name.length + 1) : undefined;
}

function wecomUrl(p: string, token?: string) {
  const base = 'https://qyapi.weixin.qq.com';
  if (!token) return `${base}${p}`;
  const sep = p.includes('?') ? '&' : '?';
  return `${base}${p}${sep}access_token=${encodeURIComponent(token)}`;
}

async function getToken(corpId: string, secret: string) {
  const url = wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
  const res = await fetch(url);
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data || data.errcode !== 0 || !data.access_token) {
    throw new Error(`gettoken failed: errcode=${data?.errcode ?? 'unknown'}, errmsg=${data?.errmsg ?? 'unknown'}`);
  }
  return String(data.access_token);
}

async function main() {
  const filePath = arg('--file');
  if (!filePath) {
    console.log('Usage: pnpm wecom:upload-file --file ./receipt.jpg');
    process.exit(1);
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  if (!corpId || !secret) throw new Error('missing env: WECOM_CORP_ID / WECOM_SECRET');

  const accessToken = await getToken(corpId, secret);
  const abs = path.resolve(process.cwd(), filePath);
  const buf = await readFile(abs);

  const form = new FormData();
  const file = new File([buf], path.basename(abs));
  form.append('media', file);

  const res = await fetch(wecomUrl('/cgi-bin/media/upload?type=file', accessToken), {
    method: 'POST',
    body: form,
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data || data.errcode !== 0) {
    throw new Error(`upload failed: errcode=${data?.errcode ?? 'unknown'}, errmsg=${data?.errmsg ?? 'unknown'}`);
  }

  console.log(`media_id=${data.media_id}`);
}

main().catch((e: any) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
