#!/usr/bin/env tsx
/**
 * One-shot workflow:
 * 1) submit overtime approval
 * 2) submit expense approval linked to overtime sp_no
 *
 * Default: dry-run (print payloads only)
 * Use --submit to actually submit.
 */

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
    : input.replace(' ', 'T') + (input.length <= 10 ? 'T00:00:00' : input.length <= 16 ? ':00' : '');
  const withTz = /([zZ]|[+-]\d\d:?\d\d)$/.test(normalized)
    ? normalized
    : `${normalized}${TZ_OFFSET}`;
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) throw new Error(`invalid datetime/date: ${input}`);
  return Math.floor(d.getTime() / 1000);
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  return arr.length <= 20 ? text : arr.slice(0, 20).join('');
}

function isWeekend(dateTs: number): boolean {
  const d = new Date(dateTs * 1000);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function pickRandomOvertimeWindow(dateTs: number): { startTs: number; endTs: number } {
  const base = new Date(dateTs * 1000);
  // random start between 08:00 and 10:45
  const startHour = 8 + Math.floor(Math.random() * 3); // 8,9,10
  const minuteOptions = [0, 15, 30, 45];
  const startMinute = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];

  const start = new Date(base);
  start.setHours(startHour, startMinute, 0, 0);

  // random duration between 8.0h and 10.0h in 0.5h steps
  const durationHours = 8 + Math.floor(Math.random() * 5) * 0.5;
  const end = new Date(start.getTime() + durationHours * 3600 * 1000);

  return {
    startTs: Math.floor(start.getTime() / 1000),
    endTs: Math.floor(end.getTime() / 1000),
  };
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

  if (id && control) out.push({ id: String(id), control: String(control), title: String(title), raw: node });
  for (const v of Object.values(node)) flattenControls(v, out);
  return out;
}

async function getAccessToken(corpId: string, secret: string): Promise<string> {
  const tokenResp = await getJson(
    wecomUrl(`/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`)
  );
  okOrThrow(tokenResp, 'gettoken');
  return String(tokenResp.access_token);
}

async function getTemplateControls(accessToken: string, templateId: string): Promise<FlatControl[]> {
  const tpl = await getJson(wecomUrl('/cgi-bin/oa/gettemplatedetail', accessToken), {
    method: 'POST',
    body: JSON.stringify({ template_id: templateId }),
  });
  okOrThrow(tpl, 'gettemplatedetail');
  return flattenControls(tpl?.template_content);
}

function buildOvertimePayload(input: {
  userId: string;
  templateId: string;
  reason: string;
  startTs: number;
  endTs: number;
  controls: FlatControl[];
}) {
  const durationSec = input.endTs - input.startTs;
  const hours = (Math.round((durationSec / 3600) * 100) / 100).toString();

  if (durationSec <= 0) throw new Error('end time must be later than start time');

  const contents: Array<{ control: string; id: string; value: any }> = [];

  for (const c of input.controls) {
    if (/事由|原因|说明|备注/.test(c.title) && ['Text', 'Textarea'].includes(c.control)) {
      contents.push({ control: c.control, id: c.id, value: { text: input.reason } });
      continue;
    }
    if (c.control === 'Attendance' || c.id === 'smart-time') {
      contents.push({
        control: c.control,
        id: c.id,
        value: {
          attendance: {
            date_range: {
              type: 'hour',
              new_begin: input.startTs,
              new_end: input.endTs,
              new_duration: durationSec,
            },
            type: 5,
          },
        },
      });
      continue;
    }
    if (/时长|小时/.test(c.title) && c.control === 'Number') {
      contents.push({ control: c.control, id: c.id, value: { new_number: hours } });
      continue;
    }
    if (/时长|小时/.test(c.title) && ['Text', 'Textarea'].includes(c.control)) {
      contents.push({ control: c.control, id: c.id, value: { text: hours } });
      continue;
    }
  }

  return {
    creator_userid: input.userId,
    template_id: input.templateId,
    use_template_approver: 1,
    apply_data: { contents },
    summary_list: [
      { summary_info: [{ text: trim20(`加班事由:${input.reason}`), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`开始:${formatCN(input.startTs)}`), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`结束:${formatCN(input.endTs)}`), lang: 'zh_CN' }] },
    ],
  };
}

function buildExpensePayload(input: {
  userId: string;
  templateId: string;
  purpose: string;
  remark: string;
  amount: string;
  dateTs: number;
  relatedSpNo: string;
  projectKey: string;
  categoryKey: string;
}) {
  return {
    creator_userid: input.userId,
    template_id: input.templateId,
    use_template_approver: 1,
    apply_data: {
      contents: [
        {
          control: 'Selector',
          id: 'Selector-1735095929782',
          value: { selector: { type: 'single', options: [{ key: input.projectKey }] } },
        },
        {
          control: 'Date',
          id: 'Date-1735096117172',
          value: { date: { type: 'day', s_timestamp: String(input.dateTs) } },
        },
        {
          control: 'RelatedApproval',
          id: 'RelatedApproval-1735096130891',
          value: { related_approval: [{ sp_no: input.relatedSpNo }] },
        },
        {
          control: 'Selector',
          id: 'Selector-1735096182835',
          value: { selector: { type: 'single', options: [{ key: input.categoryKey }] } },
        },
        {
          control: 'Text',
          id: 'Text-1735096223119',
          value: { text: input.purpose },
        },
        {
          control: 'Money',
          id: 'Money-1735099003530',
          value: { new_money: input.amount },
        },
        {
          control: 'Textarea',
          id: 'Textarea-1735096237052',
          value: { text: input.remark },
        },
      ],
    },
    summary_list: [
      { summary_info: [{ text: trim20('类别:加班补贴'), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`用途:${input.purpose}`), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`日期:${formatDate(input.dateTs)} 金额:${input.amount}`), lang: 'zh_CN' }] },
    ],
  };
}

async function submitApplyEvent(accessToken: string, payload: any): Promise<string> {
  const resp = await getJson(wecomUrl('/cgi-bin/oa/applyevent', accessToken), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  okOrThrow(resp, 'applyevent');
  return String(resp.sp_no || '');
}

async function main() {
  const submit = hasFlag('--submit');

  const reason = arg('--reason');
  const purpose = arg('--purpose') || reason || '';
  const remark = arg('--remark') || purpose;

  const dateInput = arg('--date') || '';
  const startInput = arg('--start');
  const endInput = arg('--end');
  const amount = arg('--amount') || '150';

  if (!reason) {
    console.log('Usage: pnpm wecom:workflow --reason "..." [--start "YYYY-MM-DD HH:mm" --end "YYYY-MM-DD HH:mm"] [--date YYYY-MM-DD] [--amount 150] [--submit]');
    process.exit(1);
  }

  let startTs = 0;
  let endTs = 0;
  let dateTs = 0;

  if (startInput && endInput) {
    startTs = toTs(startInput);
    endTs = toTs(endInput);
    dateTs = dateInput ? toTs(dateInput) : toTs(formatDate(startTs));
  } else {
    dateTs = dateInput ? toTs(dateInput) : Math.floor(Date.now() / 1000);
    const win = pickRandomOvertimeWindow(dateTs);
    startTs = win.startTs;
    endTs = win.endTs;
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  const userId = process.env.WECOM_DEFAULT_USER_ID;
  const overtimeTpl = process.env.WECOM_TEMPLATE_OVERTIME;
  const expenseTpl = process.env.WECOM_TEMPLATE_EXPENSE;

  const projectKey = process.env.WECOM_EXPENSE_PROJECT_KEY || 'option-1735096088613';
  const weekdayKey = process.env.WECOM_EXPENSE_CATEGORY_WEEKDAY_KEY || 'option-1735096198799';
  const weekendKey = process.env.WECOM_EXPENSE_CATEGORY_WEEKEND_KEY || 'option-1735096198800';
  const categoryKey = isWeekend(dateTs) ? weekendKey : weekdayKey;

  if (!startInput || !endInput) {
    console.log(`ℹ️ auto time window selected: ${formatCN(startTs)} ~ ${formatCN(endTs)}`);
  }

  if (!corpId || !secret || !userId || !overtimeTpl || !expenseTpl) {
    throw new Error('missing env: WECOM_CORP_ID / WECOM_SECRET / WECOM_DEFAULT_USER_ID / WECOM_TEMPLATE_OVERTIME / WECOM_TEMPLATE_EXPENSE');
  }

  const accessToken = await getAccessToken(corpId, secret);

  const overtimeControls = await getTemplateControls(accessToken, overtimeTpl);
  const overtimePayload = buildOvertimePayload({
    userId,
    templateId: overtimeTpl,
    reason,
    startTs,
    endTs,
    controls: overtimeControls,
  });

  if (!submit) {
    const expensePreview = buildExpensePayload({
      userId,
      templateId: expenseTpl,
      purpose,
      remark,
      amount,
      dateTs,
      relatedSpNo: 'TO_BE_FILLED_AFTER_OVERTIME_SUBMIT',
      projectKey,
      categoryKey,
    });

    console.log('--- overtime payload (dry-run) ---');
    console.log(JSON.stringify(overtimePayload, null, 2));
    console.log('\n--- expense payload (dry-run, related_sp_no placeholder) ---');
    console.log(JSON.stringify(expensePreview, null, 2));
    console.log('\nDry-run only. Add --submit to execute both submissions.');
    return;
  }

  const overtimeSpNo = await submitApplyEvent(accessToken, overtimePayload);
  console.log(`✅ overtime submitted: sp_no=${overtimeSpNo}`);

  const expensePayload = buildExpensePayload({
    userId,
    templateId: expenseTpl,
    purpose,
    remark,
    amount,
    dateTs,
    relatedSpNo: overtimeSpNo,
    projectKey,
    categoryKey,
  });

  const expenseSpNo = await submitApplyEvent(accessToken, expensePayload);
  console.log(`✅ expense submitted: sp_no=${expenseSpNo}`);
}

main().catch((e: any) => {
  console.error(`❌ ${e?.message || e}`);
  process.exit(1);
});
