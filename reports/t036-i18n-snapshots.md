# T-036 报告 · 多语言输出快照与术语

> 日期：2026-11-12 · 基线提交：`c5618d2`（T-035，仅本地 commit、未 push，本地 `main...origin/main [ahead 5]`）
> 映射：FR-040～044、AC-15、SC-011、E-12 · `tasks.md §4.2 T-036` · `plan.md §4 / §5.4 / §9`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T036-20261112-0001`

---

## 0. 结论摘要

T-036 按 ATDD 先红后绿完成：25 条新单测，全量 `481/481`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.95 / 85.32 / 98.36`（三列均 ≥80）、独立负向探针 `20/20`。

产出落在 `tests/snapshots/i18n/`：**七语言 + 一回退共 8 份真实 `render()` 输出快照**、
`manifest.json`、`glossary.json`、共用夹具与确定性生成器。快照与实时渲染逐字节一致，
不是预填占位文本（P-02 / P-09）。语言切换后营养数值、四餐克数、去重指纹、台账哈希、
`rr-data` 规范数据区全部恒定；中文汉字落在 GB 18030-2022 实现级别 1 双字节区；
拉丁语 71/71 条「规范译名 + 学名/原文」并列且菜谱结构不变。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / exit 2，`AC-01～19` 仍 19/19 RED，
`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。本次交付**不代表 AC-15 转绿、
不代表许可审计完成、不代表产品端到端接线**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-036」分两步执行：

1. 按 P-10 把 T-035 的 11 个文件提交为 `c5618d2`，工作树归零、身份
   `r4fpsdmyr7-blip` 未变、**仅本地 commit，未 push**，本地 `[ahead 5]`。
2. T-036 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `tasks.md:119` | 七语言输出快照、切换语言后营养数值 / 去重指纹 / 台账哈希不变；拉丁语「规范译名 + 学名/原文」并列，不改变菜谱结构；中文输出汉字落在 GB 18030-2022 实现级别 1 覆盖范围；产出 `tests/snapshots/` |
| `SPEC.md` FR-043 | 输出 UTF-8；数值 / 日期 / 单位按区域格式化；拉丁语允许译名 + 原文并列且不得改变营养数值、食材克数或菜谱结构；中文汉字满足 GB 18030-2022 实现级别 1，落盘仍 UTF-8 |
| `SPEC.md` FR-044 | 切换输出语言 MUST NOT 改变任何营养计算、去重指纹、反馈台账、时间线护栏与计划文件语义；仅改变渲染字符串 |
| `SPEC.md` AC-15 | 七份输出合法 UTF-8、各用所请求语言（回退键单独标注）；中文汉字在级别 1 内；七份克数 / 热量 / 蛋白 / 去重指纹 / 台账一致；拉丁语并列且结构不变；`xx-Zzzz` 回退英文不失败且显式标注 |
| `SPEC.md` SC-011 / E-12 | 七语言键集 100% 完整；语言切换后营养数值与去重指纹哈希不变；现代食材缺术语时译名 + 学名/原文并列 |
| `plan.md §4 / §9 / R-06` | `tests/snapshots/` 是多语言快照与历史计划哈希基线；`encoding-check` 独立脚本归 T-045；七语言术语须人工审校，运行期不调用 LLM |
| `tasks.md:178` | FR-043 的 GB 18030-2022 声明由 **T-036 / T-045** 共同覆盖；AC-15 附加断言在 T-004 已登记红态 |
| T-016 / T-013 | 零内置食材表、计划正文不重算；T-036 的 `sections` 只是渲染层合成夹具 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/i18n-snapshot.test.js`（23 条）→ `ERR_MODULE_NOT_FOUND: tests/snapshots/i18n/fixture.mjs` |
| GREEN | 实现后首次 `23/23 pass`；随后**追加** 2 条更严断言（规范数据区字节级一致、生成器 `--check` 零写盘），终态 **25/25 pass**。全程**未删测试、未放宽任何断言** |
| 测试自身口径修正（红态写完后） | ① 中文汉字集合由「与整包相等」订正为「快照 ⊆ 语言包」并补「整包汉字亦全覆盖」断言（日计划只渲染部分键，原断言语义不成立）；② 回退标记由误写的拉丁语值改为动态取 `en` 包并断言 ≥71 处标注；③ 判别键 `render.field.protein_g` 与 `la` 的 `Proteinum` 存在子串冲突，换成实测合格的 `render.col.field`；④ 台账行断言改为逐语言排除译文。均属**修正 / 加严**，不是放宽 |
| 既有回归 | `npm test` 由 `456/456` 升至 `481/481`，T-031 七语言包、T-033 区域映射、T-034 增强门、T-035 数据源用例全部保持通过 |

`AC-15` 本身一行未改，**仍为 RED**；T-036 只提供语言层的可执行取证，不代替端到端验收。

---

## 3. 产出

工作树 **1 改 + 15 新增（含本报告）**，`HEAD=c5618d2`，T-036 **未 commit / 未 push**：

| 文件 | 内容 |
|------|------|
| `tests/snapshots/i18n/fixture.mjs` | 共用夹具：完全虚构的合成日计划、语言包加载、固定格式化器、GB 18030 判定、去指纹 / 台账、结构摘要 |
| `tests/snapshots/i18n/generate.mjs` | 确定性生成器；默认 `--check` 只读逐字节复验（`disk_writes=0`），`--write` 供人工重建 |
| `tests/snapshots/i18n/{zh-Hans,en,fr,de,es,ru,la,xx-Zzzz}.md` | 8 份真实 UTF-8 Markdown 快照，LF 结尾、可 diff |
| `tests/snapshots/i18n/manifest.json` | 8 条固定键集记录：sha256 / bytes / 规范数据区哈希 / 语言包哈希 / 回退键数 / 汉字覆盖 / 指纹 / 台账哈希 |
| `tests/snapshots/i18n/glossary.json` | 拉丁语 71 键逐条并列 + 6 条完全虚构现代食材术语示例（`wired=false`） |
| `tests/snapshots/i18n/README.md` | 目录定案、复验命令与边界 |
| `tests/unit/i18n-snapshot.test.js` | 25 条红→绿单测 |
| `src/cli/README.md §14` | 口径订正：快照是测试层取证，未接入 CLI |
| `reports/t036-i18n-snapshots.md` | 本报告 |

**`src/cli/` / `src/mcp/` / `src/core/render/` 实现代码与 `locales/` 七语言包一行未动**；
`COMMANDS` / `P2_COMMANDS` / `ALL_COMMANDS` / `FLAG_KEYS` / `OVERRIDE_KEYS` 全部保持。
P0 的 19 个 `tests/snapshots/ac-XX.txt` 占位文件与 `tests/snapshots/README.md` 零改动。

---

## 4. 关键定案

1. **FR-044 严格口径**：八份快照用**同一个 plan 对象 + 同一个 intlFormatter**，只换语言包。
   `plan.header.language_tag` 固定为合成占位 `xx`，不随输出语言改写 —— 否则规范数据区
   本身就会变化，取证失效；实际请求语言由 `manifest.entries[].requested_tag` 记录。
   这是渲染层取证的口径，**不等于**「端到端按语言重新生成计划并改写头部」。
2. **防伪造 / 防假绿**：单测逐字节比对 `render()` 实时输出与落盘快照，复验 manifest 的
   sha256 / bytes；生成器 `--check` 再独立复验一次；探针含「快照 +1 字节哈希必变」的内存负例。
   快照不是预填占位文本，也不是靠哈希恒真断言蒙混。
3. **GB 18030-2022 实现级别 1 可执行判定**：运行时从 Node full-ICU 的 `gb18030` 解码器
   **动态枚举双字节区**（`0x81..0xFE` × `0x40..0xFE`，排除 `0x7F`，实测 23,939 个可编码字符）
   生成覆盖集，**不内置、不伪造任何汉字清单**；四字节区字符（`U+20000`）一律判未覆盖。
   `zh-Hans` 整包 156 个汉字与中文快照全部落在覆盖内，落盘编码仍 UTF-8。
   该判定是**可执行近似**，不等价于标准全文的人工符合性核验；独立 CI 静态脚本归 T-045。
4. **拉丁语并列（E-12 / FR-043）**：`glossary.json` 从 `locales/la/strings.json` 逐键抽取，
   71/71 命中「规范译名 (原文)」；`structuredShape()` 证明 `la` 与 `en` 的章节数、表格行数、
   Canonical ID 集合、`rr-data` 区块全等 —— 只改字符串，不改菜谱结构。
   6 条现代食材术语示例 `fictional=true` / `review_status=ai-candidate-unreviewed` / `wired=false`，
   **未接入冻结的 71 键集**，不冒充已完成术语审校。
5. **语言无关不变量**：`comboFingerprint()` 只由两个虚构 Canonical ID 决定；`renderLedgerLine()`
   是纯 ASCII 台账行；八份 manifest 的 `combo_fp` / `ledger_sha256` / `rr_data_sha256` 全相同。
   九项处方 × 2 + 两条护栏共 ≥20 个数值键、四餐克数逐份比对一致。
6. **回退链**：`xx-Zzzz` 落到 `en`，71 键全部进 `fallback_keys`，渲染层逐条输出 `Fallback`
   前缀（实测 ≥71 处），规范数据区仍与七语言一致；判别译文不跨语言出现的断言覆盖 3 个键 × 7 语言。
7. **运行期零在线调用 / 零写盘**：语言包从本地读取；新增源码零 `fetch` / `node:http(s)` /
   `WebSocket` / 在线翻译入口；生成器默认 `--check` 只读。零第三方依赖、单一实现语言。
8. **完全虚构（P-14 / FR-032 / FR-053）**：日期、版本 ID、处方数值、食材 ID 与克数全部自撰中立；
   快照 / 清单 / 术语表经 `ci.yml` 唯一权威 `TOKENS` 规则全仓重扫零命中，不含真实身体数据、
   真实档案副本或受版权保护的指南原文。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/i18n-snapshot.test.js` | RED（模块缺失）→ 首次 23/23 → 追加 2 条后 **25/25 pass** |
| `npm test` | **481/481 pass, 0 fail**（T-035 基线 456 + T-036 新增 25） |
| `npm run lint` | PASS · 10/10 · 123 个源码文件 · `@param/@returns/@typedef` 729 处 / 74 文件 · `cli_no_node_imports` / `render_ascii` / `acceptance_naming` / `no_third_party` 全 PASS |
| `npm run spec-check` | PASS · 扫描 **62 份 md** · 真实未决标记 0 · 规格不含实现关键字 |
| `node scripts/coverage.mjs` | PASS · line 94.95% / branch **85.32%**（较 T-035 的 84.81% 提升）/ functions 98.36%，均 ≥80 |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=123 = independent_count` · `offline_checks=14 failed=0` |
| `node tests/acceptance/run.mjs` | **19/19 RED · 0 GREEN** · 红态基线有效（exit 0 仅代表基线完整） |
| `node tests/snapshots/i18n/generate.mjs` | `snapshot_check=ok tags=8 files=10 disk_writes=0` |
| 独立负向探针 `/tmp/t036-probe.mjs` | **20/20 pass**（全仓令牌重扫、P0 基线、19/19 AC RED、命令集实取值、实现零改动、零在线调用、SPDX/命名、哈希一致、防假绿 A/B、GB18030 独立重算、rr-data 字节、营养/指纹/台账、克数、拉丁结构、术语并列、回退标注、生成器只读、lint/门禁口径、Git 状态与探针只读） |
| P0 基线 diff / AC / 勾选 | `none` · 19/19 RED · `39 [ ] / 0 [x]` · `git diff --check` OK |
| Git | HEAD `c5618d2` · T-035 已提交 · **T-036 未 commit / 未 push**（`[ahead 5]`） |

> 探针在仓库外 `/tmp`，**只读**。首轮 NEG-04 因探针正则耦合 `src/cli/args.js` 的**多行数组排版**
> 误报 MISS；按铁律未改仓库、未放宽门禁，改为**直接运行真实模块读取冻结数组**（判定更严），
> 复跑 20/20。

---

## 6. 边界与未决

- **AC-15 仍 RED**：不把 `ac-*.md` 改为 GREEN、不勾 `tasks.md`、不改写 P1 verdict。
  转绿还需 T-045 `encoding-check`、T-042 CI 门禁接线与端到端生成链补齐。
- **新增一处口径张力（待人工复核）**：`ac-15.md` 的「快照位」字段指向 P0 占位
  `tests/snapshots/ac-15.txt`，而真实多语言快照按 `plan.md §4` 落在
  `tests/snapshots/i18n/`。占位文件属 P0 基线且 AC-15 未转绿，本任务**不填充、不改写**；
  两者如何合并登记，建议留 T-037 / T-050 由人工裁决，AI 不擅自改基线。
- **GB 18030 判定是近似**：双字节区枚举由运行时 ICU 版本决定（本轮 ICU 78.2 /
  Node v22.22.2），三 OS × 三 Node 矩阵下的一致性由 T-053 复核；标准全文符合性须人工核验。
- **术语待人工审校**：七语言译文与拉丁并列形态均为 `ai-candidate-unreviewed`；
  「各自只使用所请求语言」是判别译文级的可执行近似，不等价于人工语言学审校（R-06）。
- **`sections` 是渲染层合成夹具**：`manifest.sections_source = synthetic-render-fixture`、
  `product_e2e = unwired`；**不代表** T-013 / T-016 端到端接线，AC-03 仍 RED，
  T-016 零内置食材表、T-019 零兜底定案不变。
- **T-022 报告登记的三组规格张力与四选一裁决仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 **D** 解释仍待用户复核或撤销。
- **既有遗留不变**：`unit_system` 未接 T-018 / T-019 格式化器；`units` CLI 覆盖键仍缺；
  「未匹配，已回退」自然语言标注缺冻结 71 键集之外的语言包键；AC-13 / AC-16 / AC-17 / AC-18 仍 RED。
- **Git 状态说明**：提交 T-035 后本地 `main...origin/main [ahead 5]`，`origin/main` 停在
  `0e506db`。远端服务器实际状态**未联网核实**，本轮未执行 fetch / push / update-ref，
  也不得据此断言已推送。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 口径滞后，Round 15 证据冻结在 `ac2a28d`；
  本次**未修改、未放宽** P1 审查器，P2 复审应另建审查器。
- 其余遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040；
  微信通道 `channel=unavailable`。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-037」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-035）；
- 若用户否决 §1 的门槛解释 → T-036 工作树未提交、可无痕回滚，回到 T-022 裁决点。
