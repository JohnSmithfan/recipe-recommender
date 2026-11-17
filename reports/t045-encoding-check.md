# T-045 · 中文编码静态校验（`encoding-check`）

> [AIGC] 本报告由 AI 依据 `tasks.md T-045` / `SPEC.md FR-043` / `AC-15` / `SC-011` / `ADR-003 §4.7` / `plan.md §11` 生成 · 审计追踪 ID：`RR-T045-20261117-0001` · **待人工审查（P-10）** · 许可：GPL-3.0-only
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。
> **本报告是本机可复跑的静态取证记录，不构成 AC-15 端到端通过，也不代表 GitHub Actions 已运行或 CI 已绿。**

## 1. 任务口径

`tasks.md:136`（T-045）要求：`encoding-check` 校验中文输出汉字满足 **GB 18030-2022 实现级别 1** 覆盖范围（落盘编码仍 UTF-8）；产出 `scripts/` 编码校验、AC-15 附加断言；映射 `FR-043 / AC-15 / SC-011 / ADR-003 §4.7`。依赖 T-031 / T-042。

`SPEC.md FR-043`：输出 MUST 为 UTF-8；面向中国市场发行时中文输出所用汉字 MUST 落在 GB 18030-2022 实现级别 1 覆盖范围内；**落盘编码不改为 GB18030，仍统一 UTF-8**（`SPEC.md:255` 编码合规口径）。`ADR-003 §4.7`：AC-15 增加一条中文编码断言，由 CI 校验；§4.8 缓解项「纳入 lint-typecheck / 语言包检查，纯静态脚本，无运行期依赖」。

**接线边界**：T-042 定案把 `encoding-check` 列为**只登记不接 CI 必跑门禁**；`ci.yml` 头部在 T-006 骨架期已预留「T-045 encoding-check（中文 GB 18030-2022 实现级别 1 静态校验）」；`scripts/i18n-keys.mjs` 头部明确「本脚本不做 GB 18030-2022 级别 1 覆盖判定（归 T-045）」。因此本任务**不改 ci.yml、不改 P0、不改 `ac-15.md` 场景文本**，只新增独立静态脚本与 AC-15 附加可执行断言。

## 2. 判据来源（单一实现，零内置清单）

关键决策：**不内置、不伪造任何汉字清单**。`GB 18030-2022` 实现级别 1 的权威码表若以字面量硬编码，既无法零依赖核实，又违反「单一实现 / 零真实本体」边界。T-036 已定案并实现了权威判据：`tests/snapshots/i18n/fixture.mjs` 的 `gb18030Level1Chars()` 由 Node full-ICU 的 `gb18030` 解码器**动态枚举双字节区**（`0x81..0xFE × 0x40..0xFE`，排除 `0x7F`），零内置清单、零伪造映射；四字节区字符一律判为未覆盖（级别 2 才要求）。

本任务**复用该单一实现**：`scripts/encoding-check.mjs` 从 `fixture.mjs` 导入并重新导出 `gb18030Level1Chars()` / `uncoveredCjk()` / `cjkChars()`，不复制任何码表逻辑。判据修改只需改 T-036 一处；探针 POS-10 验证两处 `uncoveredCjk` 结论一致。

## 3. 产出（1 新增脚本 + 1 新增单测 + 1 修改）

| 文件 | 变更 | 内容 |
|---|---|---|
| `scripts/encoding-check.mjs` | 新增 | 只读、零写盘、零网络、零第三方依赖**静态校验器**，6 项检查，纯 ASCII `key=value`、`status=` 收尾、exit 0/1 |
| `tests/unit/t045-encoding-check.test.js` | 新增 | 12 条 ATDD 断言（RED `3/12` → GREEN `12/12`），含 **AC-15 附加断言**，零 `spawnSync` |
| `CHANGELOG.md` | 修改 | `Added` 补录 T-045 条目；`[Unreleased]` / `0.1.0-dev` 保持 |

**六项检查**（`CHECK_IDS`）：
1. `utf8_valid` — 语言包 / 快照全部合法 UTF-8（fatal 解码器逐字节判定）；
2. `language_pack_coverage` — zh-Hans 71 键中文值去重汉字零未覆盖（现场 156 字）；
3. `snapshot_coverage` — 8 份真实 `render()` 快照中文正文零未覆盖（现场 416 字）；
4. `manifest_consistent` — manifest 各 entry 的 `cjk_count` / `gb18030_l1_uncovered` 与现场重算一致（8 份，zh-Hans `cjk_count=142` 为**快照正文**去重 CJK，非语言包值 156）；
5. `four_byte_honest` — 四字节区字符（如 U+20000）如实判未覆盖，不假称级别 1 覆盖；
6. `fictional_no_real_data` — 真实身体数据令牌规则零命中（唯一权威在 ci.yml，经 `tokenRule()` 动态读取、零复制）。

**防假绿设计**：`evaluateEncodingCheck(evidence)` 为可注入纯函数，逐项 `break_<id>` 可打红、`uncoveredHanzi` 可注入真阳性四字节未覆盖汉字；`ac15_green=false` / `end_to_end=unverified` 常量化；`verdict=STATIC_ONLY` 仅表示静态检查零命中。校验器**不接入 CI 必跑门禁**（与 p1/p2 gate / T-043 / T-044 同口径），只登记。

## 4. 实现期取证修正（判定未放宽）

首次独立执行时 `manifest_consistent=fail`（`exit 1`）。定位为**判据对象错误**，非仓库缺陷：T-036 manifest 的 `entry.cjk_count` 是**该快照正文**的 CJK 去重数（`zh-Hans.md = 142`），初版误用 zh-Hans 语言包值去重数（156）去对照，导致假红。修正为逐 entry 用 `SNAPSHOT_DIR/<file>` 正文重算 `cjkChars()` 去重数对照 `cjk_count`，并保留 `gb18030_l1_uncovered === 0` 与全局零未覆盖判据；修正后校验器 6/6 ok。**只修判据对象，不放宽任何判定**（未删检查项、未跳过、未改为恒真）。

## 5. 校验结果（全部本机可复跑）

| 项目 | 结果 |
|---|---|
| T-045 单测 | RED **3/12** → **GREEN 12/12** |
| `npm test` | **620/620**（T-044 基线 608 + T-045 新增 12） |
| `node scripts/encoding-check.mjs` | **exit 0** / `checks=6` / `failed=0` / 六项全 ok / `verdict=STATIC_ONLY` / `ac15_green=false` / `uncovered_total=0` / `level1_table=dynamic-enum` / `on_disk_encoding=UTF-8` |
| `npm run lint` | **PASS 10/10**（新脚本 SPDX / 零第三方依赖 / `node --check` 全过） |
| `npm run spec-check` | **PASS**（编号连续、追溯矩阵无孤儿、澄清标记 0） |
| `node scripts/coverage.mjs` | **PASS** · 620 pass / 0 fail · line `94.97%` / branch `85.42%` / functions `98.36%` |
| `npm run acceptance` | **19/19 RED · 0 GREEN**，exit 0 仅代表红态基线完整 |
| 五个静态扫描（含 encoding-check）+ 离线集成 | 各 `status=ok` |
| `p1-gate.mjs` / `p2-gate.mjs` | 仍 `status=blocked`（`verdict=BLOCKED`） |
| 不变量 | 19/19 AC RED、`tasks.md 39 [ ] / 0 [x]`、P0 基线 + `ac-15.md` diff **0**、探针注入文件零残留 |

**关于 `ISSUE-20261114-T042-COVERAGE-TIMEOUT`**：本次 `coverage.mjs` 全量重跑**未触发** 120s flaky 超时（`coverage.tests_green` 620 pass）。与「负载相关间歇性失败」定性一致，但**该 Issue 未修复、仍待裁决**；AI 未调 timeout、未拆用例、未改判定、未改 `coverage.mjs` / `ci.yml`。

## 6. 独立负向探针（`/tmp/t045-probe.mjs`，仓库外不入库）

18 条 = 13 条纯函数 / 静态正向 + 5 条**改写仓库文件**的负向注入。护栏：后台运行避 SIGTERM、开跑前基线全绿（前置 `[BASE]` gate）、注册 `exit` / `SIGINT` / `SIGTERM` 字节还原、**每条注入独立还原**、按每文件首份备份逐字节比对。

| 注入 | 预期并实测 |
|---|---|
| zh-Hans 语言包注入四字节区汉字 | `status=error` / `verdict=BLOCKED` / exit 1 ✅ |
| 篡改 manifest `cjk_count` | `BLOCKED` / exit 1 ✅ |
| 篡改 manifest `gb18030_l1_uncovered` | `BLOCKED` / exit 1 ✅ |
| zh-Hans 快照注入四字节区汉字 | `BLOCKED` / exit 1 ✅ |
| 语言包注入非法 UTF-8 字节 | `BLOCKED` / exit 1 ✅ |

正向侧另证：逐项 `break_` 单独打红（非恒真）、四字节未覆盖真阳性、复用 T-036 判据且与 `uncoveredCjk` 结论一致、零内置汉字清单、未接 CI 必跑门禁、CI 头部登记 T-045。

首轮探针在 POS-10 因探针自身把 `new Set(...).replace(...)` 误写（Set 无 replace）而崩溃，按铁律「探针自身耦合只修探针、判定不放宽」修正该行后 **18/18 PASS**、`[RESTORE-OK]`、工作树零残留。

## 7. 边界与未决裁决（AI 不自行处理）

- **本任务未 commit / 未 push**，停下等审查。提交需用户显式给出 `commit`；本轮前面的 `commit` 已用于提交 T-044（`a087850`，4 文件，本地 `ahead 12`）。
- **AC-15 仍 RED**：校验器只做静态取证，`verdict=STATIC_ONLY` 不等于 AC-15 端到端通过；AC-15 转绿归 **T-046** 人工裁决。未改 `ac-15.md` 场景文本（P0 基线）。
- **不接 CI 必跑门禁**：`encoding-check` 与 p1/p2 gate / T-043 / T-044 同为取证器，不进 required jobs；ADR-003 §4.8 的「纳入 lint-typecheck」仅为缓解项表述，本任务按 T-042 定案只登记不接线，是否接线由 T-046 / 人工裁决。
- **判据边界**：动态枚举双字节区覆盖 GB 18030-2022 实现级别 1 的双字节汉字；四字节区一律判未覆盖（级别 2 要求），故本校验仅对「所用汉字落在双字节区」给出静态结论，**不构成对标准全文逐字比对的独立法律符合性认证**。面向中国市场的正式发行符合性须人工以标准全文复核。
- 既有 ISSUE（`ISSUE-20261109-T030-GATE`、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、`ISSUE-20261113-T041-NOTICE-SCOPE`、`ISSUE-20261114-T042-COVERAGE-TIMEOUT`）、T-022 四选一、T-043 结构性矛盾（D 口径）、T-044 第二语言恒拒绝、AC-15 快照位、T-014 双张力、`unit_system` / `units` / 回退文案键缺口、`README.md` 滞后文字与历史远端链接（P0）、`tsc --checkJs` 张力，均待书面裁决。
- 本报告、校验器脚本与 CHANGELOG T-045 条目均为 `[AIGC]` 候选文本 / 待人工审查（P-10）；矩阵本地仅 1/9 可实测，报告为**本机输出，非 CI 已绿**；微信 `channel=unavailable`。

## 8. 结论

T-045 交付 `scripts/encoding-check.mjs` 静态校验器（6 项检查、复用 T-036 单一判据、零内置清单）与 12 条 ATDD 断言（含 AC-15 附加断言），并补齐 CHANGELOG。**关键判定未放宽**：六项全 ok、`verdict=STATIC_ONLY`、`ac15_green=false`，不把 AC-15 转绿，不接 CI 必跑门禁，不改 P0 与 `ac-15.md` 场景文本，19/19 AC 仍 RED、`tasks.md 39 [ ] / 0 [x]`。实现期修正一处判据对象错误（manifest CJK 数应对照快照正文而非语言包值），只修判据不放宽判定。所有产物为 `[AIGC]` 候选文本，待人工审查（P-10）。
