# T-043 · 实现语言与 Corresponding Source 门禁

> [AIGC] 本报告由 AI 依据 `tasks.md T-043` / `SPEC.md §8 AC-19` / `NFR-015` / `NFR-004` / `FR-037` / `P-16` / `SC-015` / `constitution.md §3.3` / `plan.md §11` / `SPEC.md §14.3` / `ADR-002` 生成 · 审计追踪 ID：`RR-T043-20261117-0001` · **待人工审查（P-10）** · 许可：GPL-3.0-only
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。
> **本报告是本机可复跑的静态取证记录，不是端到端发布证据，也不代表 GitHub Actions 已运行或 CI 已绿。**

## 1. 任务口径

`tasks.md:131`（T-043）要求：校验实现源码为人类可读、可修改的**现行 ISO/IEC 标准化语言**文本，仓库与 Release **无机器码 / ISA 绑定二进制作为实现主体**，归档与产物一一对应，三平台 AC 结果一致；产出 `scripts/` 语言与归档检查、`docs/` 发布审计记录；映射 `NFR-015 / AC-19 / SC-015 / P-16`（并涉 `NFR-004 / FR-037`）。

## 2. 结构性矛盾（与 T-037 / T-041 同构，登记待裁决）

| # | 矛盾 | 本任务处理 |
|---|---|---|
| 1 | AC-19 要求「每个 Release 产物均附 Corresponding Source 且一一对应」，但 v1 明令**尚未发布、不发 Release**（`package.json private=true`、无 `publishConfig/files/bin/prepack/postpack`、无 `release.yml` / 包管理器清单）→ 产物集合为空 | 只交付**一一对应规则**（`evaluateMapping` 纯函数 + 空集取证），如实登记 `release_artifacts=0` / `archive_vacuous=true`，**显式声明 vacuous truth 不构成端到端证据**；真实归档归 **T-052** |
| 2 | AC-19 要求「三平台 AC 结果一致」，但 `ci.yml` matrix 为 3 OS × 3 Node = 9 格，本机仅 macOS / Node 22 **1 格**可实测，GitHub Actions 未联网核实 | 只登记**矩阵配置契约**（`os` 3 / `node` 3）与取证边界，`ci_runs=unverified` / `local_matrix_cells=1`，不把配置存在当成结果一致 |
| 3 | 19/19 AC 仍 RED，`acceptance` job 以「19/19 全红基线完整」为通过条件；P1 / P2 出口仍 `BLOCKED` | **不把 `ac-19.md` 转绿、不勾 `tasks.md`、不改 P0 基线、不把取证器接入 CI 必跑门禁**；AC-19 转绿归 **T-046** 人工裁决 |

按 constitution §4 与既有节奏，AI 不自行选 B/C 修订出口，采用与 T-037 / T-041 同构的 **D 口径**：维持 `BLOCKED` / RED，交付取证器 + 发布审计记录，登记待用户书面裁决。

## 3. 产出（3 新增 + 2 修改）

| 文件 | 变更 | 内容 |
|---|---|---|
| `scripts/language-source.mjs` | 新增 | 只读、零写盘、零网络、零第三方依赖的**静态取证器**，8 项检查，纯 ASCII `key=value`、`status=` 收尾、exit 0/1 |
| `docs/release-audit.md` | 新增 | 发布审计记录（8 节），如实登记空产物集 / 未发布 / 非端到端 / 1/9 矩阵 / AC-19 仍 RED / 待裁决 6 项 |
| `tests/unit/t043-language-source.test.js` | 新增 | 16 条 ATDD 断言（RED `6/16` → GREEN `16/16`），**零 `spawnSync`**（避免加剧 `ISSUE-20261114-T042-COVERAGE-TIMEOUT` 并发耦合） |
| `CHANGELOG.md` | 修改 | `Added` 补录 T-043 条目；`Changed` 的章节引用由 `§8～16` 订正为 `§8～17`；`[Unreleased]` / `0.1.0-dev` 保持 |
| `src/cli/README.md` | 修改 | 追加 `## 17. T-043 口径订正`；**未改 `src/cli/` 任何一行实现代码** |

**8 项检查**（`CHECK_IDS`）：`iso_language`（现行 22275:2018 / 撤销 16262:2011 不得写成现行）、`human_readable`（实现源码为人类可读 `.js/.mjs` 文本、含 SPDX 头、无 NUL）、`no_machine_code`（文件头魔数 + 二进制扩展名 + OS 元数据排除）、`single_language`（ADR-003 G-06 默认拒绝第二语言）、`archive_mapping`（空产物集 + 一一对应规则 + 已声明非端到端）、`matrix_contract`（3 OS × 3 Node 契约 + 本机 1/9 + CI 未核实）、`contributor_no_real_data`（令牌零命中 + 两份虚构 fixture）、`release_audit_record`（审计记录存在 + 未发布 + AC-19 仍 RED）。

**机器码识别按文件头魔数而非仅扩展名**：ELF `7f454c46`、Mach-O 32/64 大小端 `feedface` / `cefaedfe` / `cffaedfe`、PE/MZ `4d5a`、WASM `0061736d`、JVM class `cafebabe`；并扫描 `.wasm/.exe/.so/.dll/.dylib/.class/.o/.a/.lib/.bin/.pyc/.jar/.node` 等扩展名。

**防假绿设计**：`evaluateLanguageSource(evidence)` 与 `evaluateMapping(artifacts, sources)` 为可注入纯函数，每个检查项支持 `break_<id>` 打红、`injectedMagic` 注入魔数命中；`ac19_green=false` 为常量，`verdict=STATIC_ONLY` 仅表示静态检查零命中，`end_to_end=unverified` / `ci_runs=unverified` 常量化；`metadataTracked` 由 `git ls-files` 实取而非硬编码。真实身体数据令牌规则仍以 `.github/workflows/ci.yml` 为**唯一权威**，经 `scan-common.mjs` 的 `tokenRule()` 反向读取，新脚本零复制字面量。

## 4. 校验结果（全部本机可复跑）

| 项目 | 结果 |
|---|---|
| RED → GREEN | `node --test tests/unit/t043-language-source.test.js` RED **6/16** → **GREEN 16/16** |
| `npm test` | **595/595**（T-042 基线 579 + T-043 新增 16） |
| `node scripts/language-source.mjs` | **exit 0** / `checks=8` / `failed=0` / 8 项全 ok / `verdict=STATIC_ONLY` / `ac19_green=false` / `archive_vacuous=true` / `end_to_end=unverified` / `ci_runs=unverified` / `local_matrix_cells=1` / `release_artifacts=0` |
| `npm run lint` | **PASS 10/10**（135 个源码文件、SPDX 0 缺失、`node --check` 135/135、零第三方依赖、`src/cli` 零 `node:` 导入） |
| `npm run spec-check` | **PASS**（FR 53 / NFR 15 / AC 19 / P 16 / SC 15 编号连续、追溯矩阵无孤儿、澄清标记 0） |
| `node scripts/coverage.mjs` | **PASS** · `coverage.tests_green` 595 pass / 0 fail · line `94.97%` / branch `85.42%` / functions `98.36%`（三列 ≥80%） |
| `npm run acceptance` | **19/19 RED · 0 GREEN**，exit 0 仅代表红态基线完整 |
| 四个静态扫描脚本 | `privacy-scan` / `license-scan` / `community-files` / `i18n-keys` 各 exit 0 / `status=ok`（合计 21 项检查） |
| `node tests/acceptance/offline-integration.mjs` | exit 0 / `status=ok`（断网 / LLM 关闭 / 零对外请求） |
| `p1-gate.mjs` / `p2-gate.mjs` | 仍 **exit 2** / `verdict=BLOCKED` / `status=blocked` / `baseline_touched=0` |
| 不变量 | 19/19 AC RED、`tasks.md 39 [ ] / 0 [x]`、P0 基线（含 `ci.yml` 与 19 份 `ac-*.md`）工作树 diff **0**、探针注入文件零残留 |

**关于 `ISSUE-20261114-T042-COVERAGE-TIMEOUT`**：本次 `coverage.mjs` 全量重跑**未触发** 120s flaky 超时，`coverage.tests_green` PASS（595/595）。这与「负载相关的间歇性失败」定性一致，但**不构成该 Issue 已修复**的结论；AI 未调 timeout、未拆用例、未改判定、未改 `coverage.mjs` / `ci.yml`，Issue 仍待用户裁决（A 移出并发域 / D 维持登记）。

## 5. 独立负向探针（`/tmp/t043-probe.mjs`，仓库外不入库）

20 条 = 15 条静态正向 + 5 条**改写仓库文件**的负向注入。护栏：后台运行避 SIGTERM、开跑前基线全绿（前置 `[BASE]` gate）、注册 `exit` / `SIGINT` / `SIGTERM` 字节还原、**每条注入独立还原**（避免累积注入互相掩盖归因）、按每文件首份备份逐字节比对。

| 注入 | 预期并实测 |
|---|---|
| 注入 ELF 魔数 `.mjs`（按文件头识别） | `no_machine_code=fail` / `verdict=BLOCKED` / exit 1 ✅ |
| 注入第二实现语言 `.py` | `single_language=fail` ✅ |
| 伪造 `dist/*.zip` 发布产物（破坏空产物集） | `archive_mapping=fail` ✅ |
| 注入 `.wasm` 二进制产物 | `no_machine_code=fail` ✅ |
| 篡改审计记录抹掉「非端到端」声明（只改这一个条件） | `archive_mapping=fail` ✅ |

正向侧另证：8 项检查逐项 `break_` 单独打红（非恒真）、7 个魔数全部拦截、`evaluateMapping` 重复 / 悬空 `source_id` 判不一致而空集 `vacuous=true`（非恒假）、`isOsMetadata` 正反两面。

首轮设计曾把 5 条注入**累积**在同一工作树上，会削弱 NEG-05 的归因（前面注入未还原时 `archive_mapping` 已红）。按铁律「探针自身耦合只修探针、判定不放宽」改为每条 `try/finally` 独立还原后，终态 **20/20 PASS**、`[RESTORE-OK]`、工作树仅剩 5 个 T-043 文件、无探针残留。

## 6. 边界与未决裁决（AI 不自行处理）

- **本任务未 commit / 未 push**，停下等审查。上一轮 `commit,继续 T-043` 中的「commit」经核对无可提交对象（工作树 / 暂存区均空），按 P-10 **未伪造空提交**；提交 T-043 需用户另行显式给出 `commit`。
- **AC 一条未转绿**：AC-19 仍 RED —— 静态取证不等于端到端发布证据；转绿归 **T-046** 人工裁决，真实归档归 **T-052**。`scripts/language-source.mjs` 当前**不接 CI 必跑门禁**（与 p1-gate / p2-gate 取证器同口径），是否接线待裁决。
- T-022 四选一、`ISSUE-20261109-T030-GATE`（D 解释）、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、`ISSUE-20261113-T041-NOTICE-SCOPE`、`ISSUE-20261114-T042-COVERAGE-TIMEOUT`、AC-15 快照位张力、T-014 缓存路径 / 交节下载张力、`unit_system` / `units` / 回退文案键缺口、`README.md` 滞后文字与历史远端链接（P0）均待用户书面裁决。
- **本次新登记**：`CHANGELOG.md:50` 说明行仍写「Phase 3 条目（T-041 / T-042）已于 2026-11-13 补录…后续 T-043～T-046 条目按同口径追加」，与 T-043 已补录的事实略有滞后；属历史说明文字，按 P0 相邻文档不擅改原则**只登记、不修改**，待人工裁决是否订正。
- `docs/release-audit.md` / `src/cli/README.md §17` / `CHANGELOG.md` T-043 条目 / 本报告的 `[AIGC]` 文本均为**候选文本、非法律意见**，占位渠道未启用，待人工审查（P-10）。
- 本机 `src/.DS_Store` 为 macOS Finder 元数据，未被 Git 跟踪且被 `.gitignore` 忽略；取证器显式排除，**不声称「仓库零二进制」**；发布前应由维护者清理，归档以 `git ls-files` 为准。
- `plan.md §11` 的 `tsc --checkJs --noEmit` 需外部 TypeScript，与零第三方依赖冲突；`lint.mjs` 以 `node --check` + JSDoc 契约替代并明确**不等价**（待人工裁决）。
- 矩阵本地仅 1/9 组合可实测；本报告所有输出均为**本机可复跑结果，不代表 GitHub Actions 已运行或 CI 已绿**。微信 `channel=unavailable`（IM 被宿主阻断、连接器待装），不得谎报已发送。

## 7. 结论

T-043 交付 `scripts/language-source.mjs` 静态取证器（8 项检查、机器码魔数识别、可负向注入纯函数）、`docs/release-audit.md` 发布审计记录与 16 条 ATDD 断言，并补齐 `CHANGELOG.md` / `src/cli/README.md §17`。**关键判定未放宽**：`verdict=STATIC_ONLY` 仅代表静态检查零命中，AC-19 仍 RED，19/19 AC 全红，P1 / P2 出口仍 `BLOCKED` / exit 2，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零 diff，`src/cli/` 实现代码零改动。v1 未发布 → 产物↔源码一一对应为**空集上的规则可证**，不构成端到端证据；三平台一致性待 CI 实际运行 + T-046 人工签署。所有产物为 `[AIGC]` 候选文本，待人工审查（P-10）。
