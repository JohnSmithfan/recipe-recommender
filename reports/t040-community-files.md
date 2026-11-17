# T-040 报告 · §10 社区规范文件与模板

> 日期：2026-11-13 · 基线提交：`4d270ce`（T-037，仅本地 commit、未 push，本地 `main...origin/main [ahead 7]`）
> 映射：`tasks.md §4.3 T-040` · `SPEC.md §10` / FR-036 / FR-039 / FR-052 / FR-037 / AC-13 / SC-007 / SC-014
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T040-20261113-0001`

---

## 0. 结论摘要

T-040 按 ATDD 先红后绿完成：新增 23 条可执行断言，全量 `npm test 530/530`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.97 / 85.42 / 98.36`、独立负向探针 `20/20`。

产出 `SPEC.md §10` 标注「必需」而本任务负责的 **10 份社区规范文件与模板**，补录
`CHANGELOG.md` 的 M1～M2 基线条目，并按 **P-01** 订正 `docs/competitive-research.md:172`
的 M0 滞后文字。建议 / 可选文件按「登记不产出」处理，v1 不引入包管理器清单或发布流水线。

**未越界**：`ci.yml` 未改（完整版归 T-042）、`THIRD_PARTY_NOTICES.md` / `PRIVACY.md` 未产出（归 T-041）、
`ac-*.md` 仍 19/19 RED、`tasks.md` 仍 `39 [ ] / 0 [x]`、P1 / P2 门禁仍 `verdict=BLOCKED` / exit 2。
本任务**不代表 AC-13 转绿、不代表 M4 出口达成、不代表已发布**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-040」分两步：

1. 按 P-10 把 T-037 的 4 个文件提交为 `4d270ce`（仅本地、未 push），工作树归零，
   `HEAD=4d270ce` / `[ahead 7]`，身份 `r4fpsdmyr7-blip` 未变；远端实际状态未联网核实。
2. 推进 T-040。`tasks.md:102` 写「T-022 未绿不得进入 Phase 2」，而 P1 出口仍 `BLOCKED`；
   `ISSUE-20261109-T030-GATE` 的 D 解释与 T-022 四选一裁决仍待用户书面复核。本任务沿用 D 口径
   （维持 BLOCKED + 并行推进 + 回头补转绿），不擅自转绿任何基线。

---

## 2. 规格核查与四处口径张力（登记 `ISSUE-20261113-T040-OVERLAP`）

| # | 张力 | 事实 | 本任务处置 |
|---|---|---|---|
| 1 | T-040 点名「`ci.yml` 完整版」 | `ci.yml` 属 P0 基线不得再改；`tasks.md` T-042 明确以 `.github/workflows/ci.yml` 为产出；记忆定案「`ci.yml` 仍未接入，留 T-042」 | **不改 ci.yml**，在 `CONTRIBUTING.md §5/§6` 与本报告登记依赖；T-042 才接线，不提前假绿 |
| 2 | `SECURITY.md` 被 T-040 与 T-041 **重复点名** | §10 列为必需；T-041 写「合规文档：SECURITY.md（漏洞渠道与响应）」 | T-040 按 §10 交付社区规范版（支持版本 / 私有报告渠道 / 响应流程）；T-041 后续补合规法律细节 |
| 3 | `CHANGELOG.md` 补录 M1～M2 被 T-040 / T-042 **重复点名** | T-040 §10 要求 CHANGELOG；T-042 写「补录 M1～M2 变更条目」 | 本任务补录 M1～M2 基线；T-042 再补 Phase 3 条目 |
| 4 | `README.md` 状态段与远端链接滞后 | 仍写「M1/M2 审查通过 → M3 Implement（P0 骨架）进行中」「npm test 11/11」「尚无 CLI / MCP」，且含历史远端链接；属 P0 基线 | **不改**，登记待人工裁决（与 P-01 同类）；§10 只要求其存在且非空，当前已满足 |

另按 **P-01** 既定安排订正 `docs/competitive-research.md:172`：该行是 M0 阶段把宿主平台、
实现语言、许可证三项写成「待用户确认 / `[NEEDS CLARIFICATION]`」的滞后文字，而
`SPEC.md` CL-01～CL-11 已全部关闭。订正为「已定案：本地 CLI + 零依赖 MCP stdio /
ECMAScript (ISO/IEC 22275:2018) / GPL-3.0-only」，并在 `CHANGELOG.md` 记录本次订正。

---

## 3. ATDD 红→绿

| 阶段 | 证据 |
|---|---|
| RED | 先写 `tests/unit/community-files.test.js`（23 条），首跑 `5 pass / 18 fail`，主因是 10 份必需文件与 P-01 订正均不存在 |
| GREEN 初版 | 产出全部文件后 `22/23` |
| 口径收紧 | 唯一失败是测试把 `ci.yml` **头部注释**里登记的 `encoding-check`（T-042～T-045 待办）误判为「已接线」。按铁律只修测试、判定不放宽：改为只检查**实际执行命令**是否出现新门禁，并新增「头部须如实登记 T-042」与「六个骨架 job 名各恰好出现一次」两项更严断言，终态 `23/23` |

单测为**文本级结构断言**：零第三方依赖，本仓库不引入 YAML 解析器；Issue forms 的完整语法校验
归 T-042 全量 CI 与人工审查（已在 `CONTRIBUTING.md` 与本报告注明，不冒充已完整校验）。

---

## 4. 产出清单

| 文件 | 作用 |
|---|---|
| `CONTRIBUTING.md` | 开发范式（SDD/ATDD、P-01～P-16、DoD）、开发环境与 8 条校验命令、新增 FR/AC 流程、PR 规范、**建议/可选登记**、任务表张力登记 |
| `CODE_OF_CONDUCT.md` | 自撰中立行为准则（范围 / 期望 / 不可接受 / 报告 / 处理），**未复制**任何受版权保护的准则原文（FR-032 / FR-037） |
| `SECURITY.md` | 支持版本、私有漏洞报告渠道、响应流程、范围边界、T-041 分工登记 |
| `SUPPORT.md` | Issue 分类 / Discussions 入口、当前 BLOCKED 状态说明、非医疗免责声明 |
| `CHANGELOG.md` | Keep a Changelog + SemVer、`[Unreleased]`、补录 M1 / M2 / M3 与 T-040 条目、P-01 订正记录；保持「尚未发布」口径 |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | 结构化缺陷表单，强制脱敏与 [AIGC] 人工审查勾选，不索取任何身体数据 |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | 需求提案表单，强制关联 `FR-xxx` / `AC-xx` 与 Given/When/Then 场景 |
| `.github/ISSUE_TEMPLATE/config.yml` | `blank_issues_enabled: false` + 两条 Discussions / 安全入口**虚构占位**链接 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 关联 FR/AC/SC、SPEC 章节、7 条校验结果、合规边界与 P-10 人工审查勾选 |
| `.github/CODEOWNERS` | 通配规则**占位草案** + 待人工填写说明，不写入任何真实个人身份 |
| `tests/unit/community-files.test.js` | 23 条红→绿可执行断言 |
| `docs/competitive-research.md:172` | P-01 授权的单行订正（M0 滞后文字 → 已定案） |
| `reports/t040-community-files.md` | 本报告 |

**未产出**：`ci.yml` 完整版、`THIRD_PARTY_NOTICES.md`、`PRIVACY.md`、`scripts/encoding-check.mjs`、
任何 Release / 包管理器发布配置，以及下节列出的建议 / 可选实体文件。

---

## 5. §10「必需」覆盖矩阵（SC-007）

| §10 必需项 | 状态 | 归属 |
|---|---|---|
| `README.md` / `LICENSE` / `.gitignore` / `docs/` / `constitution.md` / `plan.md` / `examples/profiles/` / `locales/` | ✅ 已存在且非空（P0 / T-031 产物） | 既有基线 |
| `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` / `SUPPORT.md` / `CHANGELOG.md` | ✅ 本次产出 | T-040 |
| Issue 模板 ×2 + `config.yml` / PR 模板 / `CODEOWNERS` | ✅ 本次产出 | T-040 |
| `THIRD_PARTY_NOTICES.md` / `PRIVACY.md` | ⏳ 未产出 | T-041（AC-13 / AC-18） |
| `.github/workflows/ci.yml` **完整版** | ⏳ 仍是 T-006 六 job 骨架 | T-042（P0 基线冻结） |

因此 **AC-13 仍 RED**：场景还要求 `THIRD_PARTY_NOTICES.md` 覆盖所有内置数据源、PRIVACY.md 非空、
CI 全绿与许可扫描，本任务只补齐了社区规范文件这一子集。T-046 才是 §10 必需文件 100% 且
AC-13 / AC-18 / AC-19 转绿的 Phase 3 门禁。

### 建议 / 可选：登记但不产出（FR-039 / FR-052 / §10 v1 分发口径）

| 文件 | 级别 | 理由 |
|---|---|---|
| `.github/FUNDING.yml` | 可选 | 未确定赞助渠道，不伪造收款账号 |
| `GOVERNANCE.md` | 可选 | 单人 + AI 协作，治理角色待人工确认 |
| `CITATION.cff` | 建议 | FR-039 是 SHOULD；版本 `0.1.0-dev` 未发布，引用元数据待人工填写 |
| `.github/dependabot.yml` | 建议 | 零第三方依赖，无自动更新对象 |
| `.github/workflows/release.yml` | 建议 | v1 不建发布流水线（FR-052 / 铁律「不发 Release」） |
| `CONTRIBUTORS.md` / `AUTHORS.md` | 可选 | 致谢名单需人工确认 |

`package.json` 保持 `"private": true`，无 `publishConfig` / `files`，仓库无
`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `.npmrc`。

---

## 6. 全量校验结果

| 项 | 结果 |
|---|---|
| `npm test` | **530/530**（T-037 基线 507 + 新增 23） |
| `npm run lint` | **PASS 10 项**，`safety.gates_readonly` 越界=0 |
| `npm run spec-check` | **PASS**（编号连续、追溯矩阵无孤儿、澄清标记 0、规格不含实现关键字） |
| `node scripts/coverage.mjs` | **PASS** · line `94.97%` / branch `85.42%` / functions `98.36%` |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `BLOCKED` · `failed=0` · `baseline_touched=0` · `scanned_files=126` |
| `node tests/acceptance/gates/p2-gate.mjs` | exit **2** · `BLOCKED` · `failed=0` · `baseline_touched=0` · `acceptance_assertions=58` |
| `npm run acceptance` | exit 0 · **19/19 RED / 0 GREEN**（红态基线有效，非验收通过） |
| 独立负向探针 `/tmp/t040-probe.mjs` | **20/20**（仓库外、零写盘、不入库） |
| P0 基线 | tracked diff 仅 `docs/competitive-research.md` 一行（P-01 授权的订正）；`SPEC.md` / `tasks.md` / `constitution.md` / `plan.md` / `ci.yml` / `ac-*.md` / `run.mjs` / `scripts/acceptance.mjs` 零改动 |
| 任务勾选 / 实现代码 | `39 [ ] / 0 [x]`；`src/**` 零改动 |
| `git diff --check` | OK |
| Git | `HEAD=4d270ce` · `[ahead 7]` · 本任务产物**未提交、未 push**；远端实际状态未联网核实 |

---

## 7. 边界与定案（勿重开）

- **社区规范文件是候选文本**：每份都带 `[AIGC]` 与「待人工审查（P-10）」标注，审查通过前
  不代表维护者已正式采纳；`CODEOWNERS` 的 owner、 Discussions 与私有漏洞报告入口均为**占位**，
  本任务不填写任何真实个人邮箱、账号或组织，也不声称这些渠道已启用。
- **零第三方依赖 / 单一实现语言 / 完全虚构**不变：新文档不含真实身体数据令牌、不含真实档案路径，
  不复制受版权保护的指南或准则原文；地区表述遵守国家主权与领土完整立场。
- **零兜底不变**：`COMMANDS` 七条 P1 快照、`P2_COMMANDS=['serve-mcp','locales']`、
  `feedback` 越界；`rr plan` 默认 deps 未改。
- **不放宽门禁**：P1 / P2 仍 `BLOCKED`，19/19 AC RED；`ci.yml` 仍六 job 骨架，
  「CI 绿」只表示骨架可运行 + 红态基线完整。
- **T-040 不产出 Release / 包管理器配置**；`CHANGELOG.md` 的 `[Unreleased]` 不得被后续任务
  改写成已发布版本，除非用户逐次显式授权。

---

## 8. 待人工裁决与下一步

1. **新登记 `ISSUE-20261113-T040-OVERLAP`**：§2 的四处任务表 / 基线张力（`ci.yml` 完整版归属、
   `SECURITY.md` 与 `CHANGELOG.md` 重复点名、`README.md` 滞后文字）如何处置，需用户书面决定；
   AI 未改 `tasks.md` / `SPEC.md` / P0 基线。
2. **T-022 四选一裁决**、`ISSUE-20261109-T030-GATE` 的 D 解释、`ISSUE-20261112-T037-GATE`
   仍待用户书面复核或撤销。
3. 后续依赖：T-041（`PRIVACY.md` / `THIRD_PARTY_NOTICES.md` / `SECURITY.md` 合规补充）、
   T-042（`ci.yml` 完整版 + 静态扫描 + Phase 3 CHANGELOG 条目）、T-045 `encoding-check`、
   T-046 Phase 3 门禁；以及 AC-15 快照位张力、T-014 缓存路径 / 交节下载张力。
4. 本次产物**停下等审查**；提交与 push 须用户另行逐次显式授权（P-10）。
