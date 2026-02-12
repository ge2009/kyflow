#!/usr/bin/env tsx
/**
 * WeCom e-invoice approval submitter
 *
 * Features:
 * - parse invoice number from PDF (best effort)
 * - upload invoice PDF
 * - submit invoice table form
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const kv = process.argv.find((a) => a.startsWith(`${name}=`));
  return kv ? kv.slice(name.length + 1) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function wecomUrl(pathname: string, accessToken?: string): string {
  const base = 'https://qyapi.weixin.qq.com';
  if (!accessToken) return `${base}${pathname}`;
  const sep = pathname.includes('?') ? '&' : '?';
  return `${base}${pathname}${sep}access_token=${encodeURIComponent(accessToken)}`;
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
}

function okOrThrow(data: any, scene: string) {
  const code = Number(data?.errcode ?? -1);
  if (code !== 0) throw new Error(`${scene} failed: errcode=${code}, errmsg=${data?.errmsg || 'unknown'}`);
}

function extractInvoiceNoFromPdf(pdfPath: string): string | null {
  try {
    const cmd = `python3 - <<'PY'\nimport re, sys, pdfplumber\npath = ${JSON.stringify(pdfPath)}\ntext=[]\nwith pdfplumber.open(path) as p:\n    for page in p.pages[:3]:\n        try:\n            text.append(page.extract_text() or '')\n        except Exception:\n            pass\nfull='\\n'.join(text)\npatterns=[r'发票号码[:：]?\\s*([0-9]{8,20})', r'Invoice\\s*No\\.?\\s*[:：]?\\s*([0-9]{8,20})']\nfor pat in patterns:\n    m=re.search(pat, full, re.I)\n    if m:\n        print(m.group(1)); sys.exit(0)\nnums=re.findall(r'\\b[0-9]{8,20}\\b', full)\nif nums:\n    nums=sorted(nums, key=len, reverse=True)\n    print(nums[0]); sys.exit(0)\nprint('')\nPY`;
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

async function uploadFile(accessToken: string, filePath: string): Promise<string> {
  const abs = path.resolve(process.cwd(), filePath);
  const buf = readFileSync(abs);

  const form = new FormData();
  form.append('media', new File([buf], path.basename(abs)));

  const res = await fetch(wecomUrl('/cgi-bin/media/upload?type=file', accessToken), {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || Number(data.errcode) !== 0 || !data.media_id) {
    throw new Error(`upload failed: errcode=${data?.errcode ?? 'unknown'}, errmsg=${data?.errmsg ?? 'unknown'}`);
  }
  return String(data.media_id);
}

async function main() {
  const submit = hasFlag('--submit');

  const pdf = arg('--pdf');
  const amount = arg('--amount');
  const invoiceNoInput = arg('--invoice-no');

  if (!pdf || !amount) {
    console.log('Usage: pnpm wecom:invoice --pdf ./invoice.pdf --amount 98 [--invoice-no 12345678] [--submit]');
    process.exit(1);
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  const userId = process.env.WECOM_DEFAULT_USER_ID;
  const templateId = process.env.WECOM_TEMPLATE_INVOICE || 'C4ZUv6mmpw9tXPiUc6danXUoVR4cZCuKbmWjYB9YE';

  if (!corpId || !secret || !userId) {
    throw new Error('missing env: WECOM_CORP_ID / WECOM_SECRET / WECOM_DEFAULT_USER_ID');
  }

  const tokenResp = await getJson(
    wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`)
  );
  okOrThrow(tokenResp, 'gettoken');
  const accessToken = String(tokenResp.access_token);

  const invoiceNo = invoiceNoInput || extractInvoiceNoFromPdf(pdf);
  if (!invoiceNo) {
    throw new Error('failed to extract invoice number from PDF; please pass --invoice-no manually');
  }

  const mediaId = await uploadFile(accessToken, pdf);

  const payload = {
    creator_userid: userId,
    template_id: templateId,
    use_template_approver: 1,
    apply_data: {
      contents: [
        {
          control: 'Table',
          id: 'Table-1571833544573',
          value: {
            children: [
              {
                list: [
                  {
                    control: 'Text',
                    id: 'Text-1571833555317',
                    value: { text: invoiceNo },
                  },
                  {
                    control: 'File',
                    id: 'File-1735031559504',
                    value: { files: [{ file_id: mediaId }] },
                  },
                  {
                    control: 'Money',
                    id: 'Money-1571833750552',
                    value: { new_money: String(amount) },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    summary_list: [
      { summary_info: [{ text: `发票号:${String(invoiceNo).slice(0, 20)}`, lang: 'zh_CN' }] },
      { summary_info: [{ text: `金额:${String(amount).slice(0, 20)}`, lang: 'zh_CN' }] },
      { summary_info: [{ text: '电子发票提交', lang: 'zh_CN' }] },
    ],
  };

  console.log(JSON.stringify({ invoice_no: invoiceNo, amount, template_id: templateId }, null, 2));

  if (!submit) {
    console.log('\nDry-run only. Add --submit to actually submit.');
    return;
  }

  const submitResp = await getJson(wecomUrl('/cgi-bin/oa/applyevent', accessToken), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  okOrThrow(submitResp, 'applyevent');

  console.log(`✅ submitted: sp_no=${submitResp?.sp_no || 'unknown'}`);
}

main().catch((e: any) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
