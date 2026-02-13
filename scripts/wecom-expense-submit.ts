#!/usr/bin/env tsx
/**
 * WeCom expense approval payload generator/submission
 *
 * Default mode: dry-run (print payload JSON only)
 * Inspect mode: --inspect (print controls/options)
 * Submit mode: --submit
 */

export {};

type AnyObj = Record<string, any>;

type FlatControl = {
  id: string;
  control: string;
  title: string;
  raw: AnyObj;
};

type SelectorOption = {
  key: string;
  text: string;
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
  if (/^\d{10}$/.test(input)) return Number(input);
  const normalized = input.includes('T')
    ? input
    : input.replace(' ', 'T') + (input.length <= 10 ? 'T00:00:00' : input.length <= 16 ? ':00' : '');
  const withTz = /([zZ]|[+-]\d\d:?\d\d)$/.test(normalized)
    ? normalized
    : `${normalized}${TZ_OFFSET}`;
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid datetime/date: ${input}`);
  }
  return Math.floor(d.getTime() / 1000);
}

function todayDateStrCN(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWeekend(dateTs: number): boolean {
  const d = new Date(dateTs * 1000);
  const day = d.getDay();
  return day === 0 || day === 6;
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

function readTextValue(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    for (const i of v) {
      const t = readTextValue(i);
      if (t) return t;
    }
    return '';
  }
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (Array.isArray(v.value)) {
      for (const i of v.value) {
        const t = readTextValue(i);
        if (t) return t;
      }
    }
  }
  return '';
}

function extractSelectorOptions(ctrl: FlatControl): SelectorOption[] {
  const out: SelectorOption[] = [];

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node !== 'object') return;

    const maybeKey = node?.key;
    if (typeof maybeKey === 'string') {
      const text = readTextValue(node) || node?.label || node?.name || '';
      out.push({ key: maybeKey, text: String(text || maybeKey) });
    }

    for (const v of Object.values(node)) walk(v);
  }

  walk(ctrl.raw?.property?.options ?? ctrl.raw);

  const dedup = new Map<string, SelectorOption>();
  for (const x of out) {
    if (!dedup.has(x.key)) dedup.set(x.key, x);
  }
  return [...dedup.values()];
}

function chooseOption(options: SelectorOption[], keyword: string): SelectorOption | undefined {
  const k = keyword.trim();
  if (!k) return undefined;
  return (
    options.find((o) => o.text.includes(k)) ||
    options.find((o) => o.key.includes(k)) ||
    options.find((o) => o.text.toLowerCase().includes(k.toLowerCase()))
  );
}

function trim20(text: string): string {
  const arr = Array.from(text);
  if (arr.length <= 20) return text;
  return arr.slice(0, 20).join('');
}

function formatCN(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
}

async function main() {
  const inspect = hasFlag('--inspect');
  const submit = hasFlag('--submit');

  const dateInput = arg('--date') || todayDateStrCN();
  const dateTs = toTs(dateInput);

  const purpose = arg('--purpose') || '';
  const amount = arg('--amount') || '150';
  const relatedSpNo = arg('--related-sp-no') || '';
  const remark = arg('--remark') || purpose;
  const projectName = arg('--project') || '温州天铭信息技术有限公司';
  const projectKey =
    arg('--project-key') || process.env.WECOM_EXPENSE_PROJECT_KEY || 'option-1735096088613';

  const weekendCategoryKey = process.env.WECOM_EXPENSE_CATEGORY_WEEKEND_KEY || 'option-1735096198800';
  const weekdayCategoryKey = process.env.WECOM_EXPENSE_CATEGORY_WEEKDAY_KEY || 'option-1735096198799';
  const inlandTripCategoryKey = process.env.WECOM_EXPENSE_CATEGORY_INLAND_TRIP_KEY || 'option-1735096198796';

  // Learned aliases from historical records (can be overridden by env)
  const categoryAliasKeyMap: Record<string, string> = {
    'overtime-night': weekdayCategoryKey,
    'overtime-weekend': weekendCategoryKey,
    'inland-trip': inlandTripCategoryKey,
    'travel-transport': process.env.WECOM_EXPENSE_CATEGORY_TRAVEL_TRANSPORT_KEY || 'option-1735096198793',
    'city-transport': process.env.WECOM_EXPENSE_CATEGORY_CITY_TRANSPORT_KEY || 'option-1735096198794',
    lodging: process.env.WECOM_EXPENSE_CATEGORY_LODGING_KEY || 'option-1735096198795',
  };

  const categoryType = arg('--category-type') || '';

  const categoryKey =
    arg('--category-key') ||
    (categoryType ? categoryAliasKeyMap[categoryType] : '') ||
    (isWeekend(dateTs) ? weekendCategoryKey : weekdayCategoryKey) ||
    '';

  const fileId = arg('--file-id') || '';

  // category default: inland-trip -> 省内出差补贴 ; otherwise weekend/weekday overtime categories
  const defaultCategoryKeyword =
    categoryType === 'inland-trip'
      ? '出差补贴-省内出差补贴'
      : isWeekend(dateTs)
        ? '周末加班'
        : '晚上加班';
  const categoryKeyword = arg('--category') || defaultCategoryKeyword;

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_SECRET;
  const userId = process.env.WECOM_DEFAULT_USER_ID;
  const templateId = process.env.WECOM_TEMPLATE_EXPENSE;

  for (const [k, v] of Object.entries({ corpId, secret, userId, templateId })) {
    if (!v) throw new Error(`missing env: ${k.replace(/[A-Z]/g, (m, i) => (i ? '_' : '') + m).toUpperCase()}`);
  }

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
      options: c.control === 'Selector' ? extractSelectorOptions(c) : undefined,
    }));
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (!purpose) {
    throw new Error('missing args: --purpose is required for submit/dry-run generation');
  }

  const applyDataContents: Array<{ control: string; id: string; value: any }> = [];

  for (const ctrl of controls) {
    const title = ctrl.title;
    const c = ctrl.control;

    if (/申请人/.test(title) && c === 'Contact') {
      applyDataContents.push({ control: c, id: ctrl.id, value: { members: [{ userid: userId }] } });
      continue;
    }

    if (/关联项目/.test(title) && c === 'Selector') {
      const options = extractSelectorOptions(ctrl);
      const hit = projectKey
        ? { key: projectKey, text: projectName }
        : chooseOption(options, projectName) || options[0];
      if (hit) {
        applyDataContents.push({
          control: c,
          id: ctrl.id,
          value: { selector: { type: 'single', options: [{ key: hit.key }] } },
        });
      }
      continue;
    }

    if (/产生日期|日期/.test(title) && c === 'Date') {
      applyDataContents.push({
        control: c,
        id: ctrl.id,
        value: { date: { type: 'day', s_timestamp: String(dateTs) } },
      });
      continue;
    }

    if (/关联审批单/.test(title) && c === 'RelatedApproval') {
      if (relatedSpNo) {
        applyDataContents.push({
          control: c,
          id: ctrl.id,
          value: { related_approval: [{ sp_no: relatedSpNo }] },
        });
      }
      continue;
    }

    if (/类别/.test(title) && c === 'Selector') {
      const options = extractSelectorOptions(ctrl);
      const hit = categoryKey
        ? { key: categoryKey, text: categoryKeyword }
        : chooseOption(options, categoryKeyword) || options[0];
      if (!hit) throw new Error('category selector has no options; pass --category-key or use --category-type (inland-trip/overtime-night/overtime-weekend/travel-transport/city-transport/lodging)');
      applyDataContents.push({
        control: c,
        id: ctrl.id,
        value: { selector: { type: 'single', options: [{ key: hit.key }] } },
      });
      continue;
    }

    if (/用途说明|用途/.test(title) && (c === 'Text' || c === 'Textarea')) {
      applyDataContents.push({ control: c, id: ctrl.id, value: { text: purpose } });
      continue;
    }

    if (/报销金额|金额/.test(title) && c === 'Money') {
      applyDataContents.push({ control: c, id: ctrl.id, value: { new_money: amount } });
      continue;
    }
    if (/报销金额|金额/.test(title) && c === 'Number') {
      applyDataContents.push({ control: c, id: ctrl.id, value: { new_number: amount } });
      continue;
    }

    if (/备注/.test(title) && (c === 'Text' || c === 'Textarea')) {
      applyDataContents.push({ control: c, id: ctrl.id, value: { text: remark } });
      continue;
    }

    if (/报销证明|证明图片|附件/.test(title) && c === 'File') {
      if (!fileId) {
        // leave it to required-check diagnostics
        continue;
      }
      applyDataContents.push({
        control: c,
        id: ctrl.id,
        value: { files: [{ file_id: fileId }] },
      });
      continue;
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

  const payload = {
    creator_userid: userId,
    template_id: templateId,
    use_template_approver: 1,
    apply_data: { contents: applyDataContents },
    summary_list: [
      { summary_info: [{ text: trim20(`类别:${categoryKeyword}`), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`用途:${purpose}`), lang: 'zh_CN' }] },
      { summary_info: [{ text: trim20(`日期:${formatCN(dateTs)} 金额:${amount}`), lang: 'zh_CN' }] },
    ],
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
