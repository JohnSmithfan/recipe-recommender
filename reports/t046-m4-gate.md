# T-046 · Phase 3（M4）门禁分层取证报告

> [AIGC] 本报告由 AI 依据 `tasks.md` T-046 / `SPEC.md §10 / §17` / `constitution.md §3.3 / §4` 生成 · 审计追踪 ID：`RR-T046-20261117-0001` · **待人工审查（P-10）**
> 许可：GPL-3.0-only。本报告是本机取证输出，**不是 CI 已绿、不是 Release 审计、不是 AC 转绿裁决**。

## 1. 任务定义与结构性矛盾

`tasks.md` T-046 原文要求：「§10『必需』文件 100% 存在且非空；AC-13 / AC-18 / AC-19 转绿；SC-007 / SC-014 / SC-015 达成」，依赖 T-042～T-045，产出「CI 报告、文件清单审计」。

核查后存在与 T-030 / T-037 / T-041 / T-043 同构的**结构性矛盾**：

- AC-13 / AC-18 / AC-19 三条的 `Given` 均为「仓库 / 产物**处于可发布状态**」，其 `Then` 进一步要求「单元/验收/lint/规格一致性全部通过」「Release 归档不含真实数据」「每个 Release 产物附 Corresponding Source 且三平台 AC 一致」。
- 但 v1 **尚未发布**：`private=true`、无发布字段、无 `release.yml`、`CHANGELOG.md` 保持 `[Unreleased]` / `0.1.0-dev`；产物集为空（T-043 `release_artifacts=0` / `archive_vacuous=true`）；本机矩阵仅 1/9 格可实测；19/19 AC 仍 RED。
- `constitution.md §4`：临时豁免 / 放宽判定**不允许**由 AI 自行决定，必须记录 Issue 并经用户书面确认。

据此按既有 **D 口径**推进：**维持 RED / 不放宽任何判定**，只交付分层取证器与审计报告，把「红→绿」状态改写留给人工裁决 + T-052 实体归档。登记 `ISSUE-20261117-T046-M4-GATE`。

## 2. 产出

| 文件 | 说明 |
|---|---|
| `scripts/m4-gate.mjs` | M4 分层取证器，九项检查 + `evaluateM4Gate(evidence)` 可注入纯函数 + `collectM4Evidence()` 只读取证 |
| `tests/unit/t046-m4-gate.test.js` | 13 条 ATDD 断言（RED `5/13` → GREEN `13/13`），**零 `spawnSync`** |
| `reports/t046-m4-gate.md` | 本报告 |
| `CHANGELOG.md` | 补录 T-046 条目与新 Issue 登记（保持 `[Unreleased]` 未发布口径） |

九项检查：

| ID | 判据 | 现场结论 |
|---|---|---|
| `spec10_required` | `SPEC.md §10` 动态解析「必需」项全部存在且非空（21 项） | ok |
| `ac13_static` | §10 齐备 + GPL-3.0 全文 + PRIVACY + NOTICES 覆盖数据源 + 免责声明 + `[AIGC]` + 令牌零命中 | ok（静态层） |
| `ac18_static` | GPL-3.0 + 两份完全虚构档案 + 零真实数据 + 零包管理器产物 | ok（静态层） |
| `ac19_static` | 现行 ISO/IEC 22275:2018 + 人类可读源码 + 无机器码魔数 | ok（静态层） |
| `sc007_static` | §10 100% + `ci.yml` 实接 `community-files`（剥注释后） | ok（静态可证） |
| `sc014_static` | GPL-3.0 + 零真实数据 + 令牌零命中 + 零包管理器产物 | ok（静态层） |
| `sc015_static` | 可读源码 + Corresponding Source 规则 + 无机器码 + 三平台矩阵 1/9 | ok（静态层） |
| `prereq_evidence` | T-042～T-045 四个前置取证器实体齐备 | ok |
| `honest_boundary` | 可发布状态 = false、AC 转绿数 = 0、Release 产物 = 0（防止假绿注入） | ok |

关键输出：`checks=9` / `failed=0` / `verdict=STATIC_ONLY` / `ac13_green=false` / `ac18_green=false` / `ac19_green=false` / `m4_exit=false` / `publishable_state=false` / `release_artifacts=0` / `local_matrix=1/9` / `ci_runs=unverified` / `end_to_end=unverified`。

## 3. 分层结论：静态可证 vs 端到端未证

| 目标 | 静态证据 | 端到端证据 | 本任务判定 |
|---|---|---|---|
| SC-007 | 21/21 必需文件非空，`ci.yml` 实接 `community-files` | CI 实跑（本机输出非 CI） | 静态可证；CI 侧以实测 workflow 为准 |
| SC-014 | LICENSE GPL-3.0 全文、令牌规则零命中、无 lock / `dist/` / 归档产物 | Release 归档审计（T-052） | 静态层达成；端到端未证 |
| SC-015 | 人类可读 ESM 源码、无机器码魔数、一一对应规则登记、本机 1/9 矩阵 | 三平台同组 AC 通过 + Release 产物↔源码一一对应（T-050/T-052/T-053） | 静态层达成；端到端未证 |
| AC-13 | Given「可发布状态」不成立 | 需可发布状态 + 全量 CI 绿 | 仍 RED |
| AC-18 | 虚构档案与零真实数据静态可证 | Release 归档含零真实数据 + 校验和 | 仍 RED |
| AC-19 | 静态语言 / 源码层合规（T-043） | 空产物集 vacuous、三平台 1/9 | 仍 RED |

**`verdict=STATIC_ONLY` 不等于 M4 出口达成，更不等于 AC-13/18/19 转绿。** 本取证器不接 CI 必跑门禁，只在 `ci.yml` 头部登记 T-046（与 T-043～T-045 同口径）。

## 4. 判据复用与零复制

- §10 必需清单：复用 `scan-common.mjs:spec10Required()` 动态解析，规格新增必需项而仓库未补齐会立即转红。
- 令牌唯一权威：复用 `scan-common.mjs:tokenRule()` 从 `ci.yml` 头部读取，脚本不接触字面量、不复制。
- 机器码魔数 / OS 元数据排除：复用 T-043 `language-source.mjs` 的 `MACHINE_MAGICS` 与 `isOsMetadata()`，不改判据。
- 与 T-045 相同，判定逻辑抽成纯函数并支持 `break_<id>` 逐项负向注入；真阳性注入（`tokenHits` / `bundleHits` / `machineMagicHits` / `publishableState: true` / `acGreenCount > 0` / `spec10Missing` / `prereqMissing`）全部实测转红，证明非恒真、非恒假、不能假绿。

## 4.1 实现期修正（探针暴露的判据缺陷，不放宽判定）

独立负向探针首轮在「置空 `SUPPORT.md`」注入时，除预期的 `spec10_required=fail` 外还出现 `machineMagicHits=7` 的**假阳性**：`machineMagicHits()` 原用 `magic.startsWith(head)` 反向匹配，空文件 `head=''` 时该式对每个魔数恒真。按铁律「探针自身问题只修探针、取证判据缺陷只修判据、判定不放宽」，删除反向匹配并加 `head.length < 4` 短路（魔数最长 4 字节，读 4 字节足够）；修正后空文件零命中、真实基线 `machineMagicHits=0`、13/13 单测仍绿。探针自身另一问题（`execFileSync` 遇 exit 1 抛错而未读 stdout）只修探针的返回值捕获。复跑 **8/8 PASS**、`[RESTORE-OK]`。

## 5. 校验结果

| 命令 | 结果（最终实测） |
|---|---|
| `node --test tests/unit/t046-m4-gate.test.js` | RED `5/13` → GREEN **`13/13`** |
| `node scripts/m4-gate.mjs` | exit 0 / `checks=9` / `failed=0` / 九项全 ok / `verdict=STATIC_ONLY` / 三 AC `green=false` / `m4_exit=false` / `publishable_state=false` / `local_matrix=1/9` |
| `npm test` | **633/633** PASS（T-045 基线 620 + T-046 新增 13） |
| `npm run lint` | PASS **10/10**（141 源码文件 SPDX / 语法 / 边界 / 类型契约 / 安全全过） |
| `npm run spec-check` | PASS（FR 53/53、AC 19/19、SC 15/15、NFR 15/15，澄清标记 0、无孤儿） |
| `node scripts/coverage.mjs --json` | PASS · 633 pass / 0 fail · line `94.97%` / branch `85.42%` / functions `98.36%` |
| `npm run acceptance` | **19/19 RED · 0 GREEN**，exit 0 仅代表红态基线完整 |
| 五扫描（privacy/license/community/i18n-keys/encoding）+ 离线集成 | 各 `status=ok` / exit 0 |
| `p1-gate.mjs` / `p2-gate.mjs` | 各 `exit=2` / `verdict=BLOCKED` / `baseline_touched=0` / `status=blocked` |
| 独立负向探针（`/tmp/t046-probe.mjs`，仓库外） | **8/8 PASS**、`[RESTORE-OK]`、工作树零残留 |
| 不变量 | 19/19 AC RED、`tasks.md 39 [ ] / 0 [x]`、P0 基线 + 全部验收目录 diff 0、未 push |

## 6. 边界与未决裁决（AI 不自行处理）

- 本报告落盘于提交前，记录当时「未 commit / 未 push」；经用户 `commit` 授权后 T-046 四文件已于本地提交 `c49d7dd`（`ahead 14`），**仍未 push**。本句保留落盘时点原貌，不改写历史。
- AC-13 / AC-18 / AC-19 转绿归人工裁决 + T-052 实体归档；`tasks.md` T-046 不勾选，`tests/acceptance/ac-13.md` / `ac-18.md` / `ac-19.md` 不改状态（P0 基线）。
- 新登记 `ISSUE-20261117-T046-M4-GATE`：AC 转绿的「可发布状态」前置与 M5 任务顺序矛盾，建议 A（T-052 后转绿）或 D（维持登记），B/C 须用户书面裁决（constitution §4）。
- 既有 ISSUE（`ISSUE-20261109-T030-GATE`、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、`ISSUE-20261113-T041-NOTICE-SCOPE`、`ISSUE-20261114-T042-COVERAGE-TIMEOUT`）、T-022 四选一、T-015 双张力、`README.md` 滞后文字与历史远端链接（P0）、`tsc --checkJs` 张力、AC-15 快照位，均待书面裁决。
- T-042 flaky 超时 Issue 未修复：本任务未调 timeout、未拆用例、未改判定、未改 `coverage.mjs` / `ci.yml`。
- 本报告、取证器与 CHANGELOG 条目均为 `[AIGC]` 候选文本 / 待人工审查（P-10）；矩阵本地仅 1/9 可实测，报告为**本机输出，非 CI 已绿**。

## 7. 结论

T-046 交付 `scripts/m4-gate.mjs` 分层取证器（九项检查、判据全部复用单一实现）与 13 条 ATDD 断言。**关键判定未放宽**：九项全 ok、`verdict=STATIC_ONLY`，但 `ac13_green=false`、`ac18_green=false`、`ac19_green=false`、`m4_exit=false`、`publishable_state=false`、`end_to_end=unverified`；不转绿、不接 CI 必跑门禁、不改 P0 与三条 AC 文件，19/19 AC 仍 RED、`tasks.md 39 [ ] / 0 [x]`。登记 `ISSUE-20261117-T046-M4-GATE` 待人工裁决。
