# T-041 · 合规文档（PRIVACY / SECURITY / THIRD_PARTY_NOTICES）

> 映射：`tasks.md §4.3 T-041` · `SPEC.md FR-037 / FR-047～051 / AC-13 / AC-17 / AC-18 / §10` · `constitution.md P-06 / P-07 / P-14 / P-15` · `SC-010 / SC-013` · 审计追踪 ID：`RR-T041-20261113-0001` · [AIGC] 待人工审查（P-10）
> 前置提交：`70c718b`（T-040，13 文件）；`HEAD=70c718b` / `[ahead 8]`，本任务产物**未提交、未 push**。

---

## 1. 结论先行

T-041 交付三份 §10「必需」合规文档、26 条 T-041 断言与 1 条门禁订正断言，全量校验 `npm test 557/557`、lint `10/10`、spec-check `PASS`、coverage `PASS`、两道门禁如实 `BLOCKED` / exit 2、独立负向探针 `20/20`。

**本任务同时发现并修复了一处 T-037 遗留的假绿缺陷**：三份文档落地后，`p2-gate` 把 AC-17 误判为 `E2E_PASS`。已按铁律**收紧**判据并补独立断言，AC-17 回到 `CORE_ONLY`，`e2e_pass=0 / core_only=3 / gap=1` 与 T-037 定案一致。

**AC 仍 19/19 RED**；本任务不代表 AC-13 / AC-17 / AC-18 转绿、不代表许可审计完成、不代表 CI 已绿、不代表 M4 出口达成。

---

## 2. 规格核查与四处口径张力（待人工书面裁决）

| # | 张力 | 依据 | 本任务处置 |
|---|---|---|---|
| 1 | **AC-18 要求 `THIRD_PARTY_NOTICES.md` 列明 HowToCook(Unlicense)、USDA FDC(CC0)、用户自建数据的边界**，但 T-035 定案 `data/source/` 是**元数据目录、零真实第三方本体**，4 个外部 / 用户源 `bundled=false`、`payload_path=null`、`review_status=ai-candidate-unreviewed`，加载器一律拒绝 | `ac-18.md:20`；`data/source/README.md §1`；`reports/t035-source.md` | 逐项列明 5 条 descriptor 的许可 / 版本 / 来源 URL / 审校状态与使用边界，明确 AC-18 三项**仅作元数据候选声明**，并写明「未内置、不代表许可审计完成」。**不擅自引入任何真实数据本体、不把任何外部源标为已审校** |
| 2 | `SECURITY.md` 被 T-040 与 T-041 **重复点名** | `ISSUE-20261113-T040-OVERLAP`；`reports/t040-community-files.md §2` | T-040 的 §1～§5 **只追加不删改**（`git diff` 删除行 = 0），新增 §6 法律合规与数据主体权利；§5 张力登记原文保留 |
| 3 | `CHANGELOG.md` 补录被 T-040 / T-042 重复点名，T-041 亦产生新文档 | `tasks.md:130`；`ISSUE-20261113-T040-OVERLAP` | **不改 `CHANGELOG.md`**：Phase 3 条目统一归 T-042 补录，避免制造第三处重复点名；本任务只在报告中登记 |
| 4 | `ci.yml 完整版` / 静态扫描点名于 T-040 但属 P0 且归 T-042 | `ISSUE-20261113-T040-OVERLAP` | 不碰 `ci.yml`、不产 `scripts/license-scan.mjs`；T-041 文档与单测均明确把静态扫描归 T-042 |

**新登记 `ISSUE-20261113-T041-NOTICE-SCOPE`**：第 1 项「AC-18 字面要求 vs 零内置定案」的语义口径、以及 §3 对 `p2-gate.mjs`（T-037 已提交取证器）的收紧订正，均需用户书面复核或撤销；AI 未改 `tasks.md` / `SPEC.md` / 任何 P0 基线。

---

## 3. 全量校验暴露的假绿缺陷与订正（本任务最重要发现）

### 3.1 现象

首次 GREEN 后跑全量校验，`npm test` 为 `554/555`，唯一失败是：

```text
T-037 · 四条 AC 均不得被声明为端到端通过，且每条给出具体缺口
AssertionError: AC-17 当前不具备端到端证据 · expected 'E2E_PASS' actual 'E2E_PASS'
```

### 3.2 根因

`tests/acceptance/gates/p2-gate.mjs` 的 `collectE2e()` 原判据：

```js
ac17_compliance_docs: exists('PRIVACY.md') && exists('THIRD_PARTY_NOTICES.md')
  && /license-scan|third.party/i.test(ci),
```

`ci.yml` **第 9 行头部注释**如实登记 T-042 待办时含 `license-scan` 字样，因此第三项恒为 `true`；T-041 之前只有「两份文档不存在」在挡着。文档一落地，AC-17 立刻被判 `E2E_PASS`。**合规声明文本不是 AC-17 场景要求的端到端证据**（场景要求断网五级计划、静态与运行时检查证明零上传、导出 / 删除端到端可用、未同意不外传）。

### 3.3 订正（收紧，非放宽）

- 新增 `ciExecWired(ci, command)`：剥离 `#` 注释行后只匹配**实际执行命令**，沿用 T-040 已定案的同类口径，杜绝「注释里提到门禁」被当作「CI 已接线」。
- `ac17_compliance_docs` 收紧为**五条件合取**：`PRIVACY.md` + `THIRD_PARTY_NOTICES.md` + `SECURITY.md` 齐备 **且** CI 实际执行 `scripts/license-scan.mjs` **且** 该脚本实体存在 **且** `ac.statuses['17'] === 'GREEN'`（与 `ac14_ci_green` 的 AC 全绿口径一致）。
- 订正 `rowDetail` 的 AC-17 gaps 与 `blockers`：原文「T-041 未产出」在文档落地后已成假话，改为「已产出但属 `[AIGC]` 候选声明文本、未经人工审查、不构成端到端证据」。
- **补两条独立取证断言**锁死该缺口：
  - `tests/unit/compliance-files.test.js` 断言门禁判据含 `ciExecWired` / 扫描脚本实体 / 人工转绿门槛，且 `scripts/license-scan.mjs` 不得提前产出。
  - `tests/unit/p2-gate.test.js` 断言三份文档齐备时 `e2e.ac17_compliance_docs === false`、AC-17 非 E2E、gaps 仍登记 T-042；并用负向注入证明判定**非恒假**（仅放开该项时 AC-17 转 E2E 但出口仍 `BLOCKED`）。

### 3.4 订正后取证

```text
p2_exit=2 · e2e_pass=0 · core_only=3 · gap=1 · checks=10 · failed=0
ac.14=CORE_ONLY  ac.15=CORE_ONLY  ac.16=GAP  ac.17=CORE_ONLY
verdict=BLOCKED · baseline_touched=0 · status=blocked
```

`scanned_files=127`（新增 1 个单测文件），`acceptance_assertions=58` 不变。**判定绝不放宽**：没有任何 AC 因本任务转绿。

---

## 4. ATDD 过程

| 阶段 | 结果 |
|---|---|
| 红态单测先落盘 | `tests/unit/compliance-files.test.js` 25 条 → `5 pass / 20 fail`（RED 确认） |
| 产出文档后 | `25/25`（GREEN） |
| 全量校验暴露假绿 | `554/555`，定位为 T-037 门禁判据缺陷，非文档内容问题 |
| 收紧门禁 + 补 2 条独立断言 | 终态 `npm test 557/557`（530 基线 + 26 条 T-041 + 1 条 p2-gate 订正） |

单测为**文本级结构断言 + 与实现常量的动态逐项比对**，零第三方依赖：
- `PRIVACY.md` 的 7 个根文件 / 5 个目录动态取自 `src/cli/inventory.js` 的 `DATA_ROOT_FILES` / `DATA_DIRS`；
- `THIRD_PARTY_NOTICES.md` 的 5 条 descriptor 逐项核对 `data/source/catalog.json` 的 `id` / `license` / `version` / `source_url` / `review_status`；
- 真实数据令牌正则动态取自 `.github/workflows/ci.yml` 的唯一权威规则，绝不复制字面量。

---

## 5. 产出清单（4 新增 + 3 修改）

| 文件 | 变更 | 内容 |
|---|---|---|
| `PRIVACY.md` | 新增 | 纯本地四零、数据最小化 / 目的限定 / 本地处理 / 默认不采集敏感个人信息、未成年人提示、适用法律（PIPL / 数据安全法 / 网络安全法 / GDPR / 美国州级隐私法）、数据主体权利四项与删除后无残留、**存放位置 7 文件 + 5 目录**、逐次同意 / 节气下载无个人参数 / LLM 默认关闭 / MCP 不回传、日志与发布物脱敏、非医疗免责 |
| `THIRD_PARTY_NOTICES.md` | 新增 | GPL-3.0-only 全文与随 clone 分发、零第三方运行时依赖、标准规范引用边界、**5 条 descriptor 逐项清单**、零真实第三方本体与 `ERR_SOURCE_REVIEW` / `ERR_SOURCE_BUNDLED` 拒绝、`ERR_SOURCE_CONFLICT` 冲突即拒、AC-18 三项边界、自撰 / AI 生成内容清单、v1 分发口径、未完成事项归 T-042 / T-046 |
| `SECURITY.md` | 追加 §6 | 法律合规与数据主体权利；§1～§5 一字未删（diff 删除行 = 0） |
| `tests/unit/compliance-files.test.js` | 新增 | 26 条断言 |
| `tests/acceptance/gates/p2-gate.mjs` | 修改 | `ciExecWired` + AC-17 判据收紧 + gaps / blockers 文字订正 |
| `tests/unit/p2-gate.test.js` | 修改 | 新增 1 条防假绿独立取证断言 |
| `reports/t041-compliance-docs.md` | 新增 | 本报告 |

三份文档均带 `[AIGC]` / 待人工审查（P-10）/ GPL-3.0-only / 非医疗免责 / **不是法律意见** 标注；不含真实个人邮箱、账号、真实档案路径字面量或真实身体数据。

---

## 6. §10「必需」覆盖矩阵（SC-007）

| §10 必需项 | 状态 | 归属 |
|---|---|---|
| `README.md` / `LICENSE` / `.gitignore` / `docs/` / `constitution.md` / `plan.md` / `examples/profiles/` / `locales/` | ✅ 已存在且非空 | 既有基线 |
| `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` / `SUPPORT.md` / `CHANGELOG.md` / Issue / PR 模板 / `CODEOWNERS` | ✅ T-040 已产出，本任务仅追加 `SECURITY.md §6` | T-040 + T-041 |
| `PRIVACY.md` / `THIRD_PARTY_NOTICES.md` | ✅ **本次产出** | T-041 |
| `.github/workflows/ci.yml` **完整版** | ⏳ 仍是 T-006 六 job 骨架 | T-042（P0 基线冻结） |

因此 **AC-13 仍 RED**：场景还要求 CI 全绿、许可静态扫描、§10 必需 100%，转绿归 T-046。**AC-18 仍 RED**：许可审计需人工逐项核对上游实际许可文本与版本，本任务只完成「列明边界」的声明层。**AC-17 仍 RED**：导出 / 删除端到端验收驱动与静态扫描门禁未统一执行。

---

## 7. 全量校验结果

| 项 | 结果 |
|---|---|
| `npm test` | **557/557**（530 + 26 + 1） |
| `npm run lint` | **PASS 10 项**，`safety.gates_readonly` 越界 = 0 |
| `npm run spec-check` | **PASS**（编号连续、追溯矩阵无孤儿、澄清标记 0、规格不含实现关键字） |
| `node scripts/coverage.mjs` | **PASS** · line `94.97%` / branch `85.42%` / functions `98.36%` |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `BLOCKED` · `failed=0` · `baseline_touched=0` |
| `node tests/acceptance/gates/p2-gate.mjs` | exit **2** · `BLOCKED` · `e2e_pass=0` · `core_only=3` · `gap=1` · `failed=0` · `baseline_touched=0` · `scanned_files=127` |
| `npm run acceptance` | exit 0 · **19/19 RED / 0 GREEN**（红态基线有效，非验收通过） |
| 独立负向探针 `/tmp/t041-probe.mjs` | **20/20**（仓库外、零写盘、不入库） |
| P0 基线 | `SPEC.md` / `tasks.md` / `constitution.md` / `plan.md` / `ci.yml` / `ac-*.md` / `run.mjs` / `scripts/acceptance.mjs` / `README.md` / `CHANGELOG.md` 零改动；`src/**` / `data/**` / `locales/**` 零改动 |
| 任务勾选 | `39 [ ] / 0 [x]` |
| `git diff --check` | OK |
| Git | 前置 `HEAD=70c718b` · `[ahead 8]`；本任务 4 新增 + 3 修改**未提交、未 push**，远端实际状态未联网核实 |

> 探针首轮 `18/20`：两处 FAILED 均为探针自身耦合（`git()` 包装的 `trim()` 吃掉 porcelain 前导空格；新增章节行数阈值过高），按铁律**只修探针、判定不放宽**，NEG-15 改为逐项内容断言后复跑 `20/20`。

---

## 8. 边界与定案（勿重开）

- **三份文档是 `[AIGC]` 候选文本**，不是法律意见；审查通过前不代表维护者已正式采纳，也不代表已完成法律适用分析或许可审计。
- **零真实第三方本体**不变：`THIRD_PARTY_NOTICES.md` 是元数据声明清单，四个外部 / 用户源仍 `bundled=false` / `ai-candidate-unreviewed` / `version=unverified`，唯一可加载仍是完全虚构的 `synthetic-demo`。AI 未把任何源标为已审校或已内置。
- **只追加不削弱 `SECURITY.md`**：T-040 的社区规范版 §1～§5 逐字保留，避免重复点名演变成内容覆盖。
- **零兜底 / 零依赖 / 单一实现语言 / 完全虚构**不变；`package.json` 保持 `"private": true`，无 `publishConfig` / `files`，仓库无 `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `.npmrc`。
- **不提前假绿**：`ci.yml` 仍六 job 骨架，`scripts/license-scan.mjs` 未产出；P1 / P2 仍 `BLOCKED`，19/19 AC RED。
- **地区表述**：`THIRD_PARTY_NOTICES.md §2` 明确中国香港 / 中国澳门 / 中国台湾为中国的一部分、作为地区级条目、不得列为独立国家。
- **`CHANGELOG.md` 的 `[Unreleased]` / `0.1.0-dev`「尚未发布」口径不得改写**，除非用户逐次显式授权。

---

## 9. 待人工裁决与下一步

1. **新登记 `ISSUE-20261113-T041-NOTICE-SCOPE`**：AC-18「列明 HowToCook / USDA FDC / 用户自建边界」与 T-035「零真实本体」的语义口径，以及本任务对 `p2-gate.mjs` 的收紧订正，需用户书面复核或撤销。
2. 既有未决仍在：T-022 四选一、`ISSUE-20261109-T030-GATE` 的 D 解释、`ISSUE-20261112-T037-GATE`、`ISSUE-20261113-T040-OVERLAP`、AC-15 快照位张力、T-014 缓存路径 / 交节下载张力、`unit_system` / `units` / 回退文案键缺口；P1 审查器 `P1-32` 口径滞后未改；微信 `channel=unavailable`。
3. 后续依赖：T-042（`ci.yml` 完整版 + 静态扫描 + Phase 3 CHANGELOG 补录）、T-043 / T-044（实现语言与 polyglot-gate）、T-045（`encoding-check`）、T-046（Phase 3 门禁与 AC-13 / 18 / 19 转绿）。
4. 本次产物**停下等审查**；提交与 push 须用户另行逐次显式授权（P-10）。
