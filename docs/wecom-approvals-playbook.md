# WeCom 审批自动化说明（kyflow）

> 目标：通过自然语言或命令，快速提交「加班」与「报销」审批，并支持加班+报销联动。

## 1. 已支持能力

### A) 连通性检查
- 命令：`pnpm wecom:check`
- 作用：检查 token / user / overtime-template / expense-template 是否可用。
- 输出仅显示 `ok/fail`，不打印密钥。

### B) 加班提交流程
- 命令：`pnpm wecom:overtime`
- 支持：
  - 自动计算时长
  - 适配 `Attendance`（`smart-time`）控件
  - 提交成功返回 `sp_no`

示例：
```bash
pnpm wecom:overtime \
  --reason "附一医图像调阅问题处理" \
  --start "2026-02-11 19:00" \
  --end "2026-02-11 23:59" \
  --submit
```

### C) 报销提交流程
- 命令：`pnpm wecom:expense`
- 支持：
  - 报销模板 inspect
  - 关联审批单（可选）
  - 类别 key / 项目 key 传入
  - 省内出差、加班补贴等类别快捷映射

示例（省内出差）：
```bash
pnpm wecom:expense \
  --date "2026-02-11" \
  --category-type "inland-trip" \
  --purpose "附一医出差" \
  --remark "附一医出差" \
  --amount "30" \
  --submit
```

### D) 一键联动（先加班再报销）
- 命令：`pnpm wecom:workflow`
- 逻辑：
  1) 提交加班
  2) 获取加班 `sp_no`
  3) 自动将该 `sp_no` 填入报销的关联审批单
  4) 提交报销

### E) 电子发票报销
- 命令：`pnpm wecom:invoice`
- 能力：
  - 自动上传 PDF/JPG/PNG
  - 自动识别发票号码（PDF 走文本提取；图片走 OCR，可手动覆盖）
  - 支持手动填写开票金额

示例：
```bash
pnpm wecom:invoice \
  --pdf ./invoice.pdf \
  --amount 98 \
  --submit
```
手动发票号：
```bash
pnpm wecom:invoice \
  --pdf ./invoice.pdf \
  --amount 98 \
  --invoice-no 25957000000162986380 \
  --submit
```

示例：
```bash
pnpm wecom:workflow \
  --date "2026-02-11" \
  --reason "开会沟通公司PPT事宜；温岭市人民医院数据库归档问题处理" \
  --purpose "开会沟通公司PPT事宜；温岭市人民医院数据库归档问题处理" \
  --remark "开会沟通公司PPT事宜；温岭市人民医院数据库归档问题处理" \
  --amount "150" \
  --submit
```

---

## 2. 自动时间规则（wecom:workflow）

### 工作日
- 自动开始时间：18:30 或 19:00（随机）
- 自动结束时间：当天 23:59
- 不跨天

### 周末
- 自动使用白天时段（默认较长时段）

> 若传入 `--start` 和 `--end`，则优先使用手动时间。

---

## 3. 已学习并固化的 key

### 关联项目
- 温州天铭信息技术有限公司
  - `option-1735096088613`

### 报销类别
- 省内出差补贴：`option-1735096198796`
- 晚上加班补贴：`option-1735096198799`
- 周末加班补贴：`option-1735096198800`
- 差旅费-交通费：`option-1735096198793`
- 市内交通（推断）：`option-1735096198794`
- 出差住宿（推断）：`option-1735096198795`

---

## 4. 推荐交互方式（自然语言）

### 场景 1：加班+报销联动
用户说：
- “记昨天加班报销，主要是附一医图像调阅问题处理。”

系统应补问（若缺）：
- 日期（默认昨天）
- 金额（默认 150）
- 是否按默认晚间时段

### 场景 2：省内出差报销
用户说：
- “记一笔省内报销，去了附一医出差。”

系统应补问（若缺）：
- 日期
- 金额（可默认 30 或用户指定）
- 是否备注同用途

---

## 5. 常见错误与处理

- `301025 has no require control ...`
  - 某必填控件未传，需 inspect 模板后补齐。

- `301079 Attendence Has Intersection`
  - 时间与已有假勤冲突，改时间段重试。

- `category selector has no options`
  - 模板详情无法返回动态 options，需使用 `--category-key` 或内置 `--category-type`。

- `Missing required env vars`
  - 当前执行 shell 无可见环境变量，需 `source ~/.zshrc` 或在同会话导出后执行。

---

## 6. 相关脚本清单

- `scripts/wecom-health-check.ts`
- `scripts/wecom-overtime-submit.ts`
- `scripts/wecom-expense-submit.ts`
- `scripts/wecom-overtime-expense-submit.ts`
- `scripts/wecom-upload-file.ts`
- `scripts/wecom-approval-detail.ts`
- `scripts/wecom-approval-list.ts`

对应 npm scripts：
- `wecom:check`
- `wecom:overtime`
- `wecom:expense`
- `wecom:workflow`
- `wecom:upload-file`
- `wecom:detail`
- `wecom:list`
