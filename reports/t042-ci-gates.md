# T-042 · 全量 CI 门禁与静态扫描

> [AIGC] 本报告由 AI 依据 `tasks.md T-042` / `SPEC.md` / `plan.md §11` / `constitution.md §3 DoD` 生成 · 审计追踪 ID：`RR-T042-20261113-0001` · **待人工审查（P-10）** · 许可：GPL-3.0-only
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。

## 1. 任务口径与规格依据

`tasks.md:130` 要求 T-042 交付「全量 CI 门禁与静态扫描：规格一致性、单元、验收、lint、语言包键集、区域来源、断网、免责快照、许可、真实身体数据令牌 / `diet-plan` 数据 / 包管理器清单 / 受版权保护指南原文扫描；`CHANGELOG.md` 补录 M1～M2 变更条目」，产出 `.github/workflows/ci.yml`、`scripts/` 扫描脚本、`CHANGELOG.md`；映射 `FR-038 / FR-053 / AC-12 / AC-13 / AC-18 / SC-001 / SC-002 / SC-014`。

核查过的权威文件：`SPEC.md §10`（必需文件表，21 条）、`§8 AC-12/13/18`、`§6 FR-036～039 / FR-047～053`、`plan.md §11`（10 个 CI job）、`constitution.md §3 DoD`（单条 FR / 单个 PR / 单个 Release 完成条件）、`scripts/{lint,spec-check,coverage,acceptance}.mjs` 的既有入口、`tests/acceptance/offline-integration.mjs` 的断网取证器、`gates/p2-gate.mjs` 的 `ciExecWired()` 判定。

## 2. 结构性张力与登记（不自行裁决）

| # | 张力 | 本任务处理 |
|---|---|---|
| 1 | `ci.yml` 长期按 **P0 基线冻结**，但 `tasks.md T-040` 与 `T-042` 都明确把「`ci.yml` 完整版」列为产出（`ISSUE-20261113-T040-OVERLAP` 第 ① 项） | 按 **P0 任务表自身规划**升级 CI，其余 P0 文件（`SPEC.md` / `plan.md` / `constitution.md` / `tasks.md` / `README.md` / `run.mjs` / `scripts/acceptance.mjs` / 19 份 `ac-*.md`）**一行未改**；单测以 `git diff --name-only HEAD` 逐项锁定 |
| 2 | T-042 要求「`CHANGELOG.md` 补录 M1～M2」，但 M1～M2（及 M3、T-040）已由 T-040 补录（`ISSUE-20261113-T040-OVERLAP` 第 ③ 项） | 不重复补录，改为补 **Phase 3 条目（T-041 / T-042）**，并把 Notes 中「`ci.yml` 仍是骨架」的时点陈述订正为当前事实；`[Unreleased]` / `0.1.0-dev`「尚未发布」口径不变 |
| 3 | `plan.md §11` 列 10 个 job，其中 `polyglot-gate`（T-044）/ `encoding-check`（T-045）本任务规格未授权接线 | 只在 `ci.yml` 头部**登记**待办，不产出脚本、不接入可执行命令；单测断言可执行行不得出现这两项 |
| 4 | `p1-gate` / `p2-gate` 恒 `BLOCKED` / exit 2，若接入 required jobs 会让 CI 必红；接入又属「出口裁决」语义 | 保持为**取证器**，不接入 required jobs；CI 头部如实说明「CI 绿不等于 AC 转绿」，出口裁决归 T-022 四选一与 T-046 |
| 5 | 四处既有消费方（T-021 离线集成、T-037 p2-gate、T-040 / T-041 单测）都从 `ci.yml` 用 `/const TOKENS = \/(.+?)\/;/` 动态提取唯一权威令牌规则 | 令牌声明**仍留在 `ci.yml`**（改为头部注释行的声明性元数据），四个新脚本一律反向读取、零复制字面量；不改动任何既有消费方 |

历史 `reports/t037-*.md` / `t040-*.md` / `t041-*.md` 中的「`ci.yml` 仍是六 job 骨架」属**时点快照**，按项目惯例保留不动；`src/cli/README.md §15` 同理保留，另追加 §16 订正。

## 3. ATDD：先红后绿

- 先写 `tests/unit/ci-gates.test.js`（22 条），**初始 RED：`8 pass / 14 fail`**。14 条失败精确对应待产出项：四个脚本、CI 接线、CHANGELOG Phase 3、三处口径订正；8 条通过的是既有不变量（六骨架 job、防假绿、AC 红态、P0 零 diff、gate `BLOCKED`、`package.json` 零依赖）。
- 实现后 **GREEN：`22/22`**。
- 过程中修过一处**断言计数口径**：`SPEC.md §10` 的「必需」条目实测为 21 条（不是 22），脚本与单测的阈值从 `>=22` 改为 `>=20`；真实判定「零缺失」与「逐项存在且非空」**未放宽**（`missing.length === 0`）。这属于把解析数写死造成的测试耦合，不是门禁缺口。

## 4. 产出清单

**新增 7 个文件**

| 文件 | 作用 |
|---|---|
| `scripts/scan-common.mjs` | 四个扫描器唯一的公共只读层：`walk` / `read` / `codeOnly` / `tokenRule` / `spec10Required` / `emitReport`；零写盘、零联网、报告纯 ASCII `key=value` 且 `status=` 收尾 |
| `scripts/privacy-scan.mjs` | 7 项：令牌、真实档案目录、包管理器清单、发布字段、网络出口 / LLM / 在线翻译、日志脱敏、虚构示例档案 |
| `scripts/license-scan.mjs` | 6 项：LICENSE 全文、NOTICES 与 `catalog.json` 逐项对齐、零真实本体、版权原文、Corresponding Source、SPDX 头 |
| `scripts/community-files.mjs` | 4 项：动态解析 §10 必需项（21 条）、Issue/PR 模板文本结构、建议/可选登记、[AIGC] 标注 |
| `scripts/i18n-keys.mjs` | 4 项：71 键 × 7 语言包与 `LANGUAGE_PACK_KEYS` 逐项一致、地区级码 `subnational`、无 `auto:inferred`、八份免责快照 |
| `tests/unit/ci-gates.test.js` | 22 条可执行断言 |
| `reports/t042-ci-gates.md` | 本报告 |

**修改 10 个文件**：`.github/workflows/ci.yml`（完整版）、`CHANGELOG.md`（Phase 3）、`CONTRIBUTING.md` / `SUPPORT.md` / `SECURITY.md` / `PRIVACY.md`（时点陈述订正，各 1 行）、`src/cli/README.md`（追加 §16）、`tests/unit/community-files.test.js`、`tests/unit/compliance-files.test.js`、`tests/acceptance/gates/p2-gate.mjs`（两处 gap 文字 + 头部注释，判定逻辑未改）。

## 5. `ci.yml` 完整版：9 个 job

保留 T-006 六个骨架 job 名（各恰好出现一次，未被削弱）：`spec-consistency` / `unit` / `acceptance` / `lint-typecheck` / `privacy-scan` / `matrix`；新增 `license-scan` / `community-files` / `offline` 三个实际执行门禁。

剥除 `#` 注释行后，实际执行的十项命令：`npm run spec-check`、`npm test`、`node scripts/coverage.mjs --json`、`npm run acceptance`、`node scripts/lint.mjs`、`node scripts/i18n-keys.mjs`、`node scripts/privacy-scan.mjs`、`node scripts/license-scan.mjs`、`node scripts/community-files.mjs`、`node tests/acceptance/offline-integration.mjs`。

`matrix` 仍是三 OS × 三 Node（20/22/24），追加 `node scripts/i18n-keys.mjs` 做跨平台键集一致性。

## 6. 防假绿设计（本任务核心）

1. **`acceptance` 仍以 19/19 全红基线为通过条件**（`npm run acceptance`，exit 0 只代表基线完整）。不接全绿开关、不用 `continue-on-error`、不跳过或弱化任何 AC 场景（P-09 / RK-03 / AC-14）。
2. **CI 绿 ≠ AC 转绿**：头部注释明确写出这一句，`CHANGELOG` / `CONTRIBUTING` / `SUPPORT` / `SECURITY` / `PRIVACY` 五处同步订正。
3. **`p2-gate` 的 AC-17 判据接线后仍不假绿**：`ciExecWired(ci, 'scripts/license-scan.mjs')` 与脚本实体两项现已满足，但第四道门槛 `ac.statuses['17'] === 'GREEN'` 仍为 false → `e2e.ac17_compliance_docs=false`、`ac.17=CORE_ONLY`、`e2e_pass=0`、`verdict=BLOCKED` / exit 2。静态扫描与文档声明**不是** AC-17 的端到端证据。
4. **注释不等于接线**：单测与探针都按 `ci.yml` 剥注释后的可执行行取证；头部登记的 T-044 / T-045 待办不会被误判为已接入。
5. **令牌唯一权威**：规则声明只在 `ci.yml`；四个新脚本、T-021、p2-gate、T-040 / T-041 单测全部动态读取。扫描器排除 `ci.yml` 自身（它只含检测规则，不含个人数据），并排除自身以免误命中。
6. **零复制 / 零写盘 / 零第三方依赖**：四个脚本只 import `node:` 与相对路径，无任何写盘 API；`scripts/lint.mjs` 的 `spdx.all_sources` / `boundary.no_third_party` / `safety.no_dynamic_eval` 全程 PASS。

## 7. 校验结果（全部本机可复跑）

| 项目 | 结果 |
|---|---|
| `npm test` | **579/579**（T-041 基线 557 + T-042 新增 22） |
| `node --test tests/unit/ci-gates.test.js` | RED `8/22` → **GREEN 22/22** |
| `npm run lint` | **PASS 10/10**（含新脚本 SPDX / 零第三方依赖 / gates 只读白名单） |
| `npm run spec-check` | **PASS**（编号连续、追溯矩阵无孤儿、澄清标记 0） |
| `node scripts/coverage.mjs` | **PASS** · line `94.97%` / branch `85.42%` / functions `98.36%`（三列 ≥80%） |
| `npm run acceptance` | **19/19 RED · 0 GREEN**，exit 0 仅代表红态基线完整 |
| 四个静态扫描脚本 | 各 `exit 0` / `status=ok`，合计 **21 项检查全 ok**（7+6+4+4），纯 ASCII `key=value` |
| `node tests/acceptance/offline-integration.mjs` | `exit 0` / `status=ok`（断网 / LLM 关闭 / 零对外请求） |
| `p1-gate.mjs` | `exit 2` / `verdict=BLOCKED` / `baseline_touched=0` |
| `p2-gate.mjs` | `exit 2` / `verdict=BLOCKED` / `e2e_pass=0` / `core_only=3` / `gap=1` / `baseline_touched=0` |
| 不变量 | 19/19 AC RED、`tasks.md 39 [ ] / 0 [x]`、P0 基线工作树 diff 0、`src/cli` 实现代码零改动、`COMMANDS` 七条快照未改 |

## 8. 独立负向探针（`/tmp/t042-probe.mjs`，仓库外不入库）

20 条 = 15 条静态正向 + 5 条**改写仓库文件**的负向注入。按铁律：后台运行避 SIGTERM、开跑前先确认四个相关单测全绿、注册 `exit` / `SIGINT` / `SIGTERM` 字节还原、同文件多补丁 `finally` **逆序**写回、按每文件首份备份逐字节比对。

负向注入逐项证明门禁不是恒真：

| 注入 | 预期并实测 |
|---|---|
| `ci.yml` 注入全绿开关 | `community-files.test.js` 转红 ✅ |
| 摘掉 `node scripts/license-scan.mjs` 接线 | `ci-gates.test.js` 转红 ✅ |
| 破坏 `license-scan.mjs` 的 SPDX 判据 | 报告 `check.spdx_headers=fail` / `status=error` ✅ |
| 在非 `ci.yml` 文件复制令牌字面量 | `privacy-scan` 的 `check.tokens=fail` / `status=error` ✅ |
| 把 HK 的 `region_level` 改成 `country` | `i18n-keys` 的 `check.region_subnational=fail` ✅ |

首轮 **19/20**：唯一失败 POS-08 是探针自身用 `out.split('\n')` 未先 `trim()`，脚本输出以换行结尾产生的空尾行被「纯 ASCII key=value」判据误判；与 T-041 时 `git()` 的 `trim()` 吃掉前导空格同类，属**探针自身耦合**。按铁律只修探针、判定不放宽（改为 `out.trim().split('\n')`），复跑 **20/20 PASS**，四处注入痕迹与工作树清单均确认字节还原。

## 9. 边界与未决裁决（勿自行处理）

- **本任务未 commit / 未 push**，停下等审查。按 P-10，本轮「commit」授权已用于提交 T-041（`bf40fe0`）；提交 T-042 需用户另行显式给出 `commit`。
- **AC 一条未转绿**：AC-13 / AC-17 / AC-18 仍 RED —— 静态扫描不等于端到端许可审计与导出/删除验收驱动；转绿归 T-046 人工裁决。AC-15 / AC-16 仍待 T-045 / T-014 与区域示例人工审校。
- `ISSUE-20261109-T030-GATE`（D 解释）、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、`ISSUE-20261113-T041-NOTICE-SCOPE`、T-022 四选一、AC-15 快照位张力、T-014 缓存路径 / 交节下载张力、`unit_system` / `units` / 回退文案键缺口、`README.md` 滞后文字与历史远端链接（P0）均待用户书面裁决。
- `plan.md §11` 的 `tsc --checkJs --noEmit` 需外部 TypeScript，与零第三方依赖冲突；`scripts/lint.mjs` 以 `node --check` + JSDoc 契约替代并**明确不等价**，CI 未把「完整类型检查通过」记为达成（待人工裁决）。
- Issue forms 仍只做**文本级**结构断言（零第三方依赖，不引 YAML 解析器）；完整 YAML 语法校验由 GitHub Actions 运行时解析与人工审查承担，不假称等价。
- 矩阵本地仅 1/9 组合可实测；本报告与四个脚本的输出均为**本机可复跑结果，不代表 GitHub Actions 已运行或 CI 已绿**。
- 微信 `channel=unavailable`（IM 被宿主阻断、连接器待装），不得谎报已发送。

## 10. 结论

T-042 按 P0 任务表把 T-006 六 job 骨架升级为九 job 完整版，交付四个可独立复跑的静态扫描脚本（21 项检查）与 22 条 ATDD 断言，并补齐 Phase 3 变更记录。**关键判定未放宽**：CI 绿仍不等于 AC 转绿，19/19 AC 仍 RED，P1 / P2 出口仍 `BLOCKED` / exit 2，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。所有产物为 `[AIGC]` 候选文本，待人工审查（P-10）。
