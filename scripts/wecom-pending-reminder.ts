#!/usr/bin/env tsx
/**
 * Send pending-approval reminders to each approver with pending tasks.
 *
 * Rules:
 * - only users with pending approvals receive message
 * - message suffix includes: （测试中）
 * - include handling hint: 工作台 → 审批 → 待处理
 */

type Json = Record<string, any>;

const BASE = 'https://qyapi.weixin.qq.com';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name}`);
  return v;
}

async function j(url: string, init?: RequestInit): Promise<Json> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => null)) as Json | null;
  if (!res.ok || !data) throw new Error(`http error: ${res.status}`);
  return data;
}

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

async function getToken(corpId: string, secret: string): Promise<string> {
  const data = await j(
    `${BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`
  );
  if (Number(data.errcode) !== 0) {
    throw new Error(`gettoken failed: ${data.errcode} ${data.errmsg}`);
  }
  return String(data.access_token);
}

async function getSpNos(accessToken: string, lookbackDays = 3, size = 100): Promise<string[]> {
  const starttime = nowTs() - lookbackDays * 24 * 3600;
  const endtime = nowTs();

  let cursor = 0;
  const all: string[] = [];

  for (let i = 0; i < 8; i++) {
    const data = await j(`${BASE}/cgi-bin/oa/getapprovalinfo?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ starttime, endtime, cursor, size }),
    });

    if (Number(data.errcode) !== 0) break;

    all.push(...((data.sp_no_list || []) as string[]));

    const next = Number(data.next_cursor || 0);
    if (!next || next === cursor) break;
    cursor = next;
  }

  // keep recent slice for performance
  return all.slice(-300);
}

async function buildPendingByUser(accessToken: string, spNos: string[]) {
  const perUser = new Map<
    string,
    { total: number; byType: Record<string, number>; samples: Array<{ sp_no: string; sp_name: string }> }
  >();

  for (const spNo of spNos) {
    const data = await j(`${BASE}/cgi-bin/oa/getapprovaldetail?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sp_no: spNo }),
    });

    if (Number(data.errcode) !== 0) continue;

    const info = (data.info || {}) as Json;
    if (Number(info.sp_status) !== 1) continue; // only pending forms

    const spName = String(info.sp_name || '审批');

    for (const node of (info.sp_record || []) as Json[]) {
      for (const detail of (node.details || []) as Json[]) {
        const uid = detail?.approver?.userid;
        const st = Number(detail?.sp_status ?? -1);
        if (!uid || st !== 1) continue; // pending for this approver

        if (!perUser.has(uid)) {
          perUser.set(uid, { total: 0, byType: {}, samples: [] });
        }

        const x = perUser.get(uid)!;
        x.total += 1;
        x.byType[spName] = (x.byType[spName] || 0) + 1;
        if (x.samples.length < 10) x.samples.push({ sp_no: spNo, sp_name: spName });
      }
    }
  }

  return perUser;
}

function buildMessage(data: { total: number; byType: Record<string, number>; samples: Array<{ sp_no: string; sp_name: string }> }) {
  const lines: string[] = [];
  lines.push('【待审批提醒（测试中）】');
  lines.push(`你当前待处理：${data.total} 条`);

  const entries = Object.entries(data.byType).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of entries) lines.push(`- ${k}: ${v}`);

  if (data.samples.length > 0) {
    lines.push('');
    lines.push('示例审批单号:');
    for (const s of data.samples.slice(0, 8)) lines.push(`- ${s.sp_no}（${s.sp_name}）`);
  }

  lines.push('');
  lines.push('请在：工作台 → 审批 → 待处理中处理。');
  lines.push(`时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`);

  return lines.join('\n').slice(0, 1800);
}

async function sendText(accessToken: string, agentId: string, toUser: string, content: string) {
  return j(`${BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      touser: toUser,
      msgtype: 'text',
      agentid: Number(agentId),
      text: { content },
      safe: 0,
    }),
  });
}

async function main() {
  const corpId = env('WECOM_CORP_ID');
  const secret = env('WECOM_SECRET');
  const agentId = env('WECOM_AGENT_ID');

  const token = await getToken(corpId, secret);
  const spNos = await getSpNos(token, Number(process.env.WECOM_REMIND_LOOKBACK_DAYS || '3'));
  const perUser = await buildPendingByUser(token, spNos);

  let sent = 0;
  let failed = 0;
  const failedUsers: Array<{ uid: string; errcode: number; errmsg: string }> = [];

  for (const [uid, data] of perUser.entries()) {
    if (!data.total) continue;
    const content = buildMessage(data);
    const resp = await sendText(token, agentId, uid, content);

    if (Number(resp.errcode) === 0) {
      sent += 1;
    } else {
      failed += 1;
      failedUsers.push({ uid, errcode: Number(resp.errcode), errmsg: String(resp.errmsg || '') });
    }
  }

  console.log(
    JSON.stringify(
      {
        usersWithPending: perUser.size,
        sent,
        failed,
        failedUsers: failedUsers.slice(0, 20),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
