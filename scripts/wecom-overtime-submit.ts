#!/usr/bin/env tsx
/**
 * WeCom overtime approval payload generator/submission
 *
 * Default mode: dry-run (print payload JSON only)
 * Submit mode: pass --submit
 *
 * Example:
 *   pnpm wecom:overtime --reason "修复线上问题" --start "2026-02-12 19:00" --end "2026-02-12 22:30"
 *   pnpm wecom:overtime --reason "修复线上问题" --start "2026-02-12 19:00" --end "2026-02-12 22:30" --submit
 */

export {};

type AnyObj = Record<string, any>;

type FlatControl = {
  id: string;
  control: string;
  title: string;
  raw: AnyObj;
};

const TZ_OFFSET = '+08:00';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const kv = process.argv.find((a) => a.startsWith(`${name}=`));
  return kv ? kv.slice(name.length + 1) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function toTs(input: string): number {
  const normalized = input.includes('T')
    ? input
    : input.replace(' ', 'T') + (input.length <= 16 ? ':00' : '');
  const withTz = /([zZ]|[+-]\d\d:?\d\d)$/.test(normalized)
    ? normalized
    : `${normalized}${TZ_OFFSET}`;
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid datetime: ${input} (expect e.g. 2026-02-12 19:00)`);
  }
  return Math.floor(d.getTime() / 1000);
}

function wecomUrl(path: string, accessToken?: string): string {
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
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
}

function okOrThrow(data: any, scene: string) {
  const code = Number(data?.errcode ?? -1);
  if (code !== 0) throw new Error(`${scene} failed: errcode=${code}, errmsg=${data?.errmsg || 'unknown'}`);
}

function flattenControls(node: any, out: FlatControl[] = []): FlatControl[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenControls(item, out);
    return out;
  }
  if (typeof node !== 'object') return out;

  const id = node.id;
  const control = node.control;
  const title =
    node?.property?.title?.[0]?.text ||
    node?.property?.title?.text ||
    node?.title?.[0]?.text ||
    node?.title?.text ||
    node?.name ||
    '';

  if (id && control) {
    out.push({ id: String(id), control: String(control), title: String(title), raw: node });
  }

  for (const v of Object.values(node)) flattenControls(v, out);
  return out;
}

function findByTitle(controls: FlatControl[], keywords: string[]): FlatControl | undefined {
  return controls.find((c) => keywords.some((k) => c.title.includes(k)));
}

function calcHours(startTs: number, endTs: number): string {
  const h = (endTs - startTs) / 3600;
  if (h <= 0) throw new Error('end time must be later than start time');
  return (Math.round(h * 100) / 100).toString();
}

function formatCN(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function trim20(text: string): string {
  const arr = Array.from(text);
  if (arr.length <= 20) return text;
  return arr.slice(0, 20).join('');
}

function buildValue(control: FlatControl, val: { reason: string; startTs: number; endTs: number; durationSec: number; hours: string; userId: string }) {
  const title = control.title;
  const c = control.control;

  const isReason = /事由|原因|说明|备注/.test(title);
  const isStart = /开始/.test(title);
  const isEnd = /结束/.test(title);
  const isDuration = /时长|小时/.test(title);
  const isApplicant = /申请人|加班人|人员/.test(title);

  if (isReason && ['Text', 'Textarea'].includes(c)) {
    return { text: val.reason };
  }

  if (isStart && c === 'Date') {
    return { date: { type: 'hour', s_timestamp: val.startTs } };
  }
  if (isEnd && c === 'Date') {
    return { date: { type: 'hour', s_timestamp: val.endTs } };
  }

  if (isDuration && (c === 'Text' || c === 'Textarea')) {
    return { text: val.hours };
  }
  if (isDuration && c === 'Number') {
    return { new_number: val.hours };
  }

  if (isApplicant && c === 'Contact') {
    return { members: [{ userid: val.userId }] };
  }

  // Overtime template built-in control (id is often "smart-time")
  if (c === 'Attendance' || control.id === 'smart-time') {
    return {
      attendance: {
        date_range: {
          type: 'hour',
          new_begin: val.startTs,
          new_end: val.endTs,
          new_duration: val.durationSec,
        },
        // 5 = 加班
        type: 5,
      },
    };
  }

  if (c === 'DateRange') {
    return {
      date_range: {
        type: 'hour',
        new_begin: val.startTs,
        new_end: val.endTs,
        new_duration: val.durationSec,
      },
    };
  }

  return undefined;
}

async function main() {
  const reason = arg('--reason');
  const start = arg('--start');
  const end = arg('--end');
  const submit = hasFlag('--submit');
  const inspect = hasFlag('--inspect');

  if (!inspect && (!reason || !start || !end)) {
    console.log('Usage: pnpm wecom:overtime --reason "..." --start "YYYY-MM-DD HH:mm" --end "YYYY-MM-DD HH:mm" [--submit] [--inspect]');
    process.exit(1);
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  const userId = process.env.WECOM_DEFAULT_USER_ID;
  const templateId = process.env.WECOM_TEMPLATE_OVERTIME;

  for (const [k, v] of Object.entries({ corpId, secret, userId, templateId })) {
    if (!v) throw new Error(`missing env: ${k.replace(/[A-Z]/g, (m, i) => (i ? '_' : '') + m).toUpperCase()}`);
  }

  const startTs = start ? toTs(start) : 0;
  const endTs = end ? toTs(end) : 0;
  const durationSec = start && end ? endTs - startTs : 0;
  const hours = start && end ? calcHours(startTs, endTs) : '0';

  const tokenResp = await getJson(
    wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId!)}&corpsecret=${encodeURIComponent(secret!)}`)
  );
  okOrThrow(tokenResp, 'gettoken');
  const accessToken = tokenResp.access_token as string;

  const templateResp = await getJson(wecomUrl('/cgi-bin/oa/gettemplatedetail', accessToken), {
    method: 'POST',
    body: JSON.stringify({ template_id: templateId }),
  });
  okOrThrow(templateResp, 'gettemplatedetail');

  const controls = flattenControls(templateResp?.template_content);

  if (inspect) {
    const rows = controls.map((c) => ({
      id: c.id,
      control: c.control,
      title: c.title,
      require: c.raw?.property?.require ?? c.raw?.require ?? false,
    }));
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const applyDataContents: Array<{ control: string; id: string; value: any }> = [];
  for (const ctrl of controls) {
    const value = buildValue(ctrl, {
      reason: reason ?? '',
      startTs,
      endTs,
      durationSec,
      hours,
      userId: userId ?? '',
    });
    if (value !== undefined) {
      applyDataContents.push({ control: ctrl.control, id: ctrl.id, value });
    }
  }

  const requiredControls = controls.filter(
    (c) => c.raw?.property?.require === 1 || c.raw?.property?.require === true || c.raw?.require === 1 || c.raw?.require === true
  );
  const providedIds = new Set(applyDataContents.map((c) => c.id));
  const missingRequired = requiredControls.filter((c) => !providedIds.has(c.id));

  if (missingRequired.length > 0) {
    console.log('⚠️ required controls not auto-filled:');
    for (const m of missingRequired) {
      console.log(`- ${m.title || '(no-title)'} [id=${m.id}, control=${m.control}]`);
    }
  }

  const summaryList = [
    { summary_info: [{ text: trim20(`加班事由:${reason}`), lang: 'zh_CN' }] },
    { summary_info: [{ text: trim20(`开始:${formatCN(startTs)}`), lang: 'zh_CN' }] },
    { summary_info: [{ text: trim20(`结束:${formatCN(endTs)}`), lang: 'zh_CN' }] },
  ];

  const payload = {
    creator_userid: userId,
    template_id: templateId,
    use_template_approver: 1,
    apply_data: {
      contents: applyDataContents,
    },
    summary_list: summaryList,
    // optional, keep empty for now
    notifyer: [],
  };

  console.log(JSON.stringify(payload, null, 2));

  if (!submit) {
    console.log('\nDry-run only. Add --submit to actually create approval.');
    return;
  }

  const submitResp = await getJson(wecomUrl('/cgi-bin/oa/applyevent', accessToken), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  okOrThrow(submitResp, 'applyevent');

  console.log(`\n✅ submitted: sp_no=${submitResp?.sp_no || 'unknown'}`);
}

main().catch((e) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
