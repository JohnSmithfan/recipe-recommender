# 多语言输出快照（T-036）

> 日期：2026-11-12 · 基线提交：`c5618d2`（T-035） · [AIGC] 审计追踪 ID：`RR-T036-20261112-0001`
> 映射：FR-040～044、AC-15、SC-011、E-12 · `tasks.md §4.2 T-036` · `plan.md §4 / §5.4 / §9`

## 1. 本目录是什么

`tests/snapshots/i18n/` 存放**七语言 + 回退**共 8 份真实 `render()` 输出快照，以及配套
清单、术语表、共用夹具与确定性生成器。全部产物由 `generate.mjs --write` 从仓库内
`locales/<tag>/strings.json` 与一份**完全虚构**的合成计划对象生成，不是预填的占位文本
（`tests/snapshots/README.md` / P-02 / P-09）。

**与父目录 19 个 `ac-XX.txt` 的关系**：那 19 个文件是 P0 红态基线占位，本任务
**一个字节都不改**（包括 `ac-15.txt`）。AC-15 仍为 RED，其「快照位」不填充产品输出；
真实多语言快照按 `plan.md §4` 的目录语义落在本子目录。这处口径差异在
`reports/t036-i18n-snapshots.md §6` 如实登记，待人工复核。

## 2. 文件清单

| 文件 | 内容 |
|------|------|
| `{zh-Hans,en,fr,de,es,ru,la,xx-Zzzz}.md` | 8 份 UTF-8 Markdown 快照；LF 结尾、可 diff |
| `manifest.json` | 8 条固定键集记录：sha256 / 字节数 / 规范数据区哈希 / 语言包哈希 / 回退键数 / 汉字覆盖 / 指纹 / 台账哈希 |
| `glossary.json` | 拉丁语 71 键「规范译名 + 学名/原文」逐键并列 + 6 条完全虚构现代食材术语示例 |
| `fixture.mjs` | 共用夹具：合成计划、语言包加载、固定格式化器、GB 18030 判定、指纹 / 台账、结构摘要 |
| `generate.mjs` | 确定性生成器；默认 `--check` 只读逐字节复验，`--write` 供人工重建 |

## 3. 关键定案（勿重开）

1. **FR-044 严格口径**：八份快照使用**同一个 plan 对象 + 同一个 intlFormatter**，
   只替换语言包。`plan.header.language_tag` 固定为合成占位 `xx`，不随输出语言改写——
   否则规范数据区本身就会变化，取证失效。实际请求语言由 `manifest.entries[].requested_tag`
   记录，`generated_by` / `plan_header_language_tag` 明示该口径。
2. **快照必须等于实时渲染**：单测逐字节比对 `render()` 输出与落盘快照，并复验
   manifest 的 sha256 / bytes；任何伪造、预填或陈旧快照都会失败（防假绿）。
3. **GB 18030-2022 实现级别 1 判定**：运行时从 Node full-ICU 的 `gb18030` 解码器
   **动态枚举双字节区**（首字节 `0x81..0xFE`，次字节 `0x40..0xFE` 且排除 `0x7F`）
   生成可编码字符集，**不内置、不伪造任何汉字清单**。四字节区字符一律判为未覆盖
   （属实现级别 2 要求），单测含 `U+20000` 负例。落盘编码仍统一 UTF-8（FR-043）。
   独立 CI 静态脚本归 T-045 `encoding-check`，本任务不抢跑。
4. **拉丁语并列（E-12）**：`glossary.json` 从 `locales/la/strings.json` 逐键抽取，
   71/71 命中「规范译名 (原文)」；`structuredShape()` 证明 `la` 与 `en` 的章节数、
   表格行数、Canonical ID 集合、`rr-data` 规范数据区完全一致——只改字符串，不改菜谱结构。
5. **语言无关不变量**：`comboFingerprint()` 只由两个虚构 Canonical ID 决定；台账行
   `renderLedgerLine()` 是纯 ASCII；八份 manifest 的 `combo_fp` / `ledger_sha256` /
   `rr_data_sha256` 全部相同。营养处方、护栏、四餐克数逐键比对一致。
6. **回退链**：`xx-Zzzz` 落到 `en`，71 键全部进入 `fallback_keys`，渲染层逐条输出
   `Fallback` 前缀；规范数据区仍与七语言一致；输出含判别译文不跨语言出现的断言。
7. **零写盘 / 零在线调用**：`generate.mjs` 默认 `--check` 只读，输出 `disk_writes=0`；
   语言包从本地读取，运行期不联网、不调用翻译或 LLM，不新增第三方依赖。
8. **完全虚构（P-14 / FR-053）**：所有日期、版本 ID、处方数值、食材 ID 与克数均为
   自撰中立虚构值；快照 / 清单 / 术语表经 `ci.yml` 唯一权威 `TOKENS` 规则重扫为零命中，
   不含任何真实身体数据、真实档案副本或受版权保护的指南原文（FR-032）。

## 4. 边界与未决

- **AC-15 仍 RED**：本任务只提供可执行取证，不把 `ac-*.md` 改为 GREEN、不勾 `tasks.md`、
  不改写 P1 门禁 `verdict=BLOCKED`。AC-15 转绿还需 T-045 的 `encoding-check` 与 T-042
  的 CI 门禁接线，以及端到端生成链补齐。
- **`sections` 是渲染层合成夹具**：四餐克数来自 `buildFixturePlan()` 注入的 `sections`
  （T-019 钩子），`manifest.sections_source = synthetic-render-fixture`、
  `product_e2e = unwired`。它**不代表** T-013 / T-016 端到端接线，AC-03 仍 RED，
  T-016 零内置食材表定案不变。
- **术语待人工审校**：语言包译文与拉丁并列形态均为 `ai-candidate-unreviewed`；
  6 条现代食材术语示例 `wired = false`，未接入冻结的 71 键集。任何接入都属行为变更，
  须先走规格变更流程（P-01 / P-04）。语言学纯度「只使用所请求语言」是判别译文级的
  可执行近似，不等价于人工术语审校。
- **地区表述**：`HK` / `MO` / `TW` 是 ISO 3166-1 中国地区级条目，本目录不涉及国籍解析。
- **P1 审查器** `P1-32` 口径滞后，本任务未修改、未放宽；P2 复审应另建审查器。

## 5. 复验与重建

```text
node tests/snapshots/i18n/generate.mjs            # 只读复验，期望 snapshot_check=ok disk_writes=0
node --test tests/unit/i18n-snapshot.test.js      # 25 条红→绿单测
node tests/snapshots/i18n/generate.mjs --write    # 仅在人工审查后重建快照
```

`--write` 会落到磁盘，重建产物须重新经人工审查（P-10）；CI 与常规校验只用 `--check`。
