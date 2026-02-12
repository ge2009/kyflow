#!/usr/bin/env tsx
/**
 * WeCom connectivity health check (safe output)
 *
 * This script validates:
 * 1) Access token can be fetched
 * 2) Default user can be queried
 * 3) Overtime template exists
 * 4) Expense template exists
 *
 * Security boundary:
 * - Never prints secrets, tokens, or full response bodies.
 */

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const REQUIRED_ENVS = [
  'WECOM_CORP_ID',
  'WECOM_SECRET',
  'WECOM_DEFAULT_USER_ID',
  'WECOM_TEMPLATE_OVERTIME',
  'WECOM_TEMPLATE_EXPENSE',
] as const;

function mask(value: string, keep = 4): string {
  if (!value) return '';
  if (value.length <= keep * 2) return '*'.repeat(value.length);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

function endpoint(path: string, accessToken?: string): string {
  const base = 'https://qyapi.weixin.qq.com';
  if (!accessToken) return `${base}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}access_token=${encodeURIComponent(accessToken)}`;
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return data;
}

function wecomOk(data: any): { ok: boolean; code?: number; msg?: string } {
  const code = Number(data?.errcode ?? -1);
  return {
    ok: code === 0,
    code,
    msg: data?.errmsg,
  };
}

async function main() {
  const missing = REQUIRED_ENVS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.log('❌ Missing required env vars:');
    for (const key of missing) console.log(`- ${key}`);
    process.exit(1);
  }

  const corpId = process.env.WECOM_CORP_ID!;
  const secret = process.env.WECOM_SECRET!;
  const userId = process.env.WECOM_DEFAULT_USER_ID!;
  const tplOvertime = process.env.WECOM_TEMPLATE_OVERTIME!;
  const tplExpense = process.env.WECOM_TEMPLATE_EXPENSE!;

  const results: CheckResult[] = [];

  let accessToken = '';
  try {
    const tokenResp = await getJson(
      endpoint(
        `/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`
      )
    );
    const st = wecomOk(tokenResp);
    if (!st.ok || !tokenResp?.access_token) {
      results.push({
        name: 'token',
        ok: false,
        detail: `errcode=${st.code}, errmsg=${st.msg || 'unknown'}`,
      });
    } else {
      accessToken = tokenResp.access_token;
      results.push({ name: 'token', ok: true });
    }
  } catch (e: any) {
    results.push({ name: 'token', ok: false, detail: e?.message || 'request failed' });
  }

  if (accessToken) {
    try {
      const userResp = await getJson(
        endpoint(`/cgi-bin/user/get?userid=${encodeURIComponent(userId)}`, accessToken)
      );
      const st = wecomOk(userResp);
      results.push({
        name: 'user',
        ok: st.ok,
        detail: st.ok ? `userid=${mask(userId, 3)}` : `errcode=${st.code}, errmsg=${st.msg || 'unknown'}`,
      });
    } catch (e: any) {
      results.push({ name: 'user', ok: false, detail: e?.message || 'request failed' });
    }

    for (const [name, templateId] of [
      ['template_overtime', tplOvertime],
      ['template_expense', tplExpense],
    ] as const) {
      try {
        const tplResp = await getJson(endpoint('/cgi-bin/oa/gettemplatedetail', accessToken), {
          method: 'POST',
          body: JSON.stringify({ template_id: templateId }),
        });
        const st = wecomOk(tplResp);
        results.push({
          name,
          ok: st.ok,
          detail: st.ok ? `template_id=${mask(templateId, 5)}` : `errcode=${st.code}, errmsg=${st.msg || 'unknown'}`,
        });
      } catch (e: any) {
        results.push({ name, ok: false, detail: e?.message || 'request failed' });
      }
    }
  } else {
    results.push({ name: 'user', ok: false, detail: 'skipped: token failed' });
    results.push({ name: 'template_overtime', ok: false, detail: 'skipped: token failed' });
    results.push({ name: 'template_expense', ok: false, detail: 'skipped: token failed' });
  }

  console.log('WeCom health check');
  for (const r of results) {
    console.log(`- ${r.name}: ${r.ok ? 'ok' : 'fail'}${r.detail ? ` (${r.detail})` : ''}`);
  }

  const failed = results.some((r) => !r.ok);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e?.message || e);
  process.exit(1);
});
