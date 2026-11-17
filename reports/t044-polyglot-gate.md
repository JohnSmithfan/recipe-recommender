# T-044 · 第二实现语言准入登记（`polyglot-gate`）

> [AIGC] 本报告由 AI 依据 `tasks.md T-044` / `SPEC.md A-10` / `E-18` / `NFR-015` / `P-16` / `plan.md §11` / `constitution.md §5` / `docs/decisions.md ADR-003 §4.4` 生成 · 审计追踪 ID：`RR-T044-20261117-0001` · **待人工审查（P-10）** · 许可：GPL-3.0-only
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。
> **本报告是本机可复跑的登记取证记录，不构成启用第二实现语言的许可，也不代表 GitHub Actions 已运行或 CI 已绿。**

## 1. 任务口径

`tasks.md:134`（T-044）要求：`polyglot-gate` **登记** ADR-003 G-01～G-06 检查结果；v1 **恒为拒绝**（默认关闭），不引入任何第二实现语言工具链；产出「CI 中的 `polyglot-gate` 登记项」；映射 `A-10 / E-18 / NFR-015 / P-16 / ADR-003 §4.4`。依赖 T-043，是 T-046（Phase 3 门禁）的前置之一。

**本任务是登记型任务**：`polyglot-gate` 是**登记器，不是准入裁决器**。ci.yml 头部在 T-006 骨架期已预留说明「T-044 polyglot-gate（默认关闭、仅登记，不引入第二实现语言工具链）」，`constitution.md §5` 标注该门禁「M4 起登记」，`plan.md §11` 标注「仅登记不执行」。因此本任务**不改 P0、不改 ci.yml、不改 A-10 / E-18 / ADR-003 规格原文**，只在 `scripts/` 增加登记器并把结论写进报告与 CHANGELOG。

## 2. 产出（1 新增脚本 + 1 新增单测 + 1 修改）

| 文件 | 变更 | 内容 |
|---|---|---|
| `scripts/polyglot-gate.mjs` | 新增 | 只读、零写盘、零网络、零第三方依赖**登记器**，纯 ASCII `key=value`、`status=` 收尾、exit 0/1 |
| `tests/unit/t044-polyglot-gate.test.js` | 新增 | 13 条 ATDD 断言（RED `5/13` → GREEN `13/13`），**零 `spawnSync`** |
| `CHANGELOG.md` | 修改 | `Added` 补录 T-044 条目；`[Unreleased]` / `0.1.0-dev` 保持 |

**六项登记**（GATE_IDS，顺序固定，源自 ADR-003 §4.4）：
- `G-01` 候选语言须为现行 ISO/IEC 或 GB 标准（标准号 / 版本 / 核实日期），在研或已撤销不合格；
- `G-02` 须提交可度量基准证明主实现语言无法满足 NFR-003（5 s / 30 s）或某项 MUST 能力；
- `G-03` 只能经 stdio / JSON 端口接入，不得进入核心域，不得改 Canonical ID 契约与 FR-044；
- `G-04` 全部语言源码 / 构建 / 测试脚本随 Release 提供，满足 GPL-3.0 Corresponding Source；
- `G-05` CI 矩阵扩展为新工具链 × 3 OS，跑同一组 AC-01～19 且结果一致；
- `G-06` **默认关闭**：须用户书面确认 + 新增 ADR + 重做 plan.md，且不改任何 FR / AC / SC。

**防假绿设计**：
- `evaluatePolyglotGate(evidence)` 为可注入纯函数。六项 `approved` 恒为 `false`，`verdict=REJECTED`、`polyglot_enabled=false` 是 v1 硬约束；单项 `approve_G-0X` 与部分证据（`writtenConsent` / `newAdr` / `planRebuilt` 全真）**均不得绕过**（非恒假）。
- 现场若出现第二语言实现源码（`.ts/.py/.go/.rs/...`，排除 `tests/` 与 `reports/`）或工具链（`tsconfig.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `Makefile` 等），登记 `anomaly=true` / `verdict=ANOMALY` / `status=error` / exit 1（非恒真、非假绿）。
- 登记器**不接入 CI 必跑门禁**（与 p1-gate / p2-gate / T-043 language-source 同口径），只在 ci.yml 头部预留文字登记；不复用 `--allow-green` / `continue-on-error` 等弱化开关。

## 3. 校验结果（全部本机可复跑）

| 项目 | 结果 |
|---|---|
| T-044 单测 | RED **5/13** → **GREEN 13/13** |
| `npm test` | **608/608**（T-043 基线 595 + T-044 新增 13） |
| `node scripts/polyglot-gate.mjs` | **exit 0** / `gates=6` / 六项全 `rejected` / `verdict=REJECTED` / `polyglot_enabled=false` / `second_language_toolchains=0` / `anomaly=false` / `status=ok` |
| `npm run lint` | **PASS 10/10**（新增脚本 SPDX / 零第三方依赖 / `node --check` 全过） |
| `npm run spec-check` | **PASS**（编号连续、追溯矩阵无孤儿、澄清标记 0） |
| `node scripts/coverage.mjs` | **PASS** · `coverage.tests_green` 608 pass / 0 fail · line `94.97%` / branch `85.42%` / functions `98.36%` |
| `npm run acceptance` | **19/19 RED · 0 GREEN**，exit 0 仅代表红态基线完整 |
| 四个静态扫描 + 离线集成 | 各 `status=ok` |
| `p1-gate.mjs` / `p2-gate.mjs` | 仍 `status=blocked`（取 `verdict=BLOCKED` / exit 2，本报告 `tail` 管道末位退出码不代表门禁退出码） |
| 不变量 | 19/19 AC RED、`tasks.md 39 [ ] / 0 [x]`、P0 基线 + A-10 / E-18 / ADR-003 规格原文 diff **0**、探针注入文件零残留、零第二语言工具链 / 实现源码 |

**关于 `ISSUE-20261114-T042-COVERAGE-TIMEOUT`**：本次 `coverage.mjs` 全量重跑**未触发** 120s flaky 超时（`coverage.tests_green` 608 pass）。与「负载相关间歇性失败」定性一致，但**该 Issue 未修复、仍待裁决**；AI 未调 timeout、未拆用例、未改判定、未改 `coverage.mjs` / `ci.yml`。

## 4. 独立负向探针（`/tmp/t044-probe.mjs`，仓库外不入库）

18 条 = 13 条纯函数 / 静态正向 + 5 条**改写仓库文件**的负向注入。护栏：后台运行避 SIGTERM、开跑前基线全绿（前置 `[BASE]` gate）、注册 `exit` / `SIGINT` / `SIGTERM` 字节还原、**每条注入独立还原**、按每文件首份备份逐字节比对。

| 注入 | 预期并实测 |
|---|---|
| 注入 `src/core/_probe.py` 第二语言实现源码 | `anomaly=true` / `verdict=ANOMALY` / exit 1 ✅ |
| 注入根 `tsconfig.json` 工具链 | `anomaly=true` / exit 1 ✅ |
| 注入根 `pyproject.toml` 工具链 | `anomaly=true` / exit 1 ✅ |
| 注入 `scripts/_probe.go` 第二语言源码 | `anomaly=true` / exit 1 ✅ |
| 注入 `tests/_probe.py`（应排除，不算实现主体） | `anomaly=false` / `verdict=REJECTED` / exit 0 ✅ |

正向侧另证：逐项 `approve_G-0X` 与部分证据全真均不得绕过恒拒绝（非恒假）、异常第二语言源码 / 工具链被识别为 `ANOMALY`（非恒真）、G-06 理由含「默认关闭 / 书面确认 / ADR / plan」、未接 CI 必跑门禁、CI 头部仅登记默认关闭。

终态 **18/18 PASS**、`[RESTORE-OK]`，工作树仅剩 3 个 T-044 文件、无探针残留。

## 5. 边界与未决裁决（AI 不自行处理）

- **本任务未 commit / 未 push**，停下等审查。提交需用户显式给出 `commit`；本轮前面的 `commit` 已用于提交 T-043（`3ee9a37`，6 文件，本地 `ahead 11`）。
- **第二语言仍恒拒绝**：v1 维持 ECMAScript / ISO/IEC 22275:2018 单一主实现语言（ADR-002 / A-10 / E-18）。若未来确有可举证能力缺口，须 G-01～G-06 **全通过** + 用户书面确认 + 新增 ADR + 重做 `plan.md`，且**不改任何 FR / AC / SC 业务语义**；本任务不代为裁决启用。
- **不接 CI 必跑门禁**：`polyglot-gate` 与 p1/p2 gate / T-043 language-source 同为登记 / 取证器，不进 required jobs；是否接线由 T-046 / 人工裁决。
- 19/19 AC 仍 RED；T-044 本身映射 A-10 / E-18（非任何 AC 的主责任务），不触发 AC 转绿。AC-13 / AC-18 / AC-19 转绿与 §10 100% 归 T-046。
- 既有 ISSUE（`ISSUE-20261109-T030-GATE`、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、`ISSUE-20261113-T041-NOTICE-SCOPE`、`ISSUE-20261114-T042-COVERAGE-TIMEOUT`）、T-022 四选一、T-043 结构性矛盾（D 口径）、AC-15 快照位、T-014 双张力、`unit_system` / `units` / 回退文案键缺口、`README.md` 滞后文字与历史远端链接（P0）、`tsc --checkJs` 张力，均待书面裁决。
- T-043 新登记：`CHANGELOG.md:50` 历史说明行文字滞后（仍写「后续 T-043～T-046 追加」），本任务**只登记未改**（非本任务范围）。
- 本报告、登记器脚本与 CHANGELOG T-044 条目均为 `[AIGC]` 候选文本 / 待人工审查（P-10）；矩阵本地仅 1/9 可实测，报告为**本机输出，非 CI 已绿**；微信 `channel=unavailable`。

## 6. 结论

T-044 交付 `scripts/polyglot-gate.mjs` 只读登记器（G-01～G-06 六项、v1 恒拒绝、默认关闭、异常检测）与 13 条 ATDD 断言，并补齐 CHANGELOG。**关键判定未放宽**：六项全 `rejected`、`verdict=REJECTED`、`polyglot_enabled=false`，不引入任何第二实现语言工具链，不接 CI 必跑门禁，不改 P0 与 A-10 / E-18 / ADR-003 规格原文，19/19 AC 仍 RED、`tasks.md 39 [ ] / 0 [x]`。第二实现语言的启用须经 G-01～G-06 全通过 + 用户书面确认 + 新增 ADR + 重做 plan.md，归人工 / T-046 裁决。所有产物为 `[AIGC]` 候选文本，待人工审查（P-10）。
