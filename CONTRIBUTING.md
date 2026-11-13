# CONTRIBUTING.md · 贡献指南

> [AIGC] 本文件由 AI 依据 `SPEC.md §10` / `constitution.md` 生成 · 审计追踪 ID：`RR-T040-20261113-0001` · **待人工审查（P-10）**
> 许可：本仓库采用 **GPL-3.0-only**，`LICENSE` 全文随 clone 分发；本文件为仓库文档，随源码一同分发。
> 免责声明：本项目是膳食规划参考工具，所有数值为估算值，**不构成医疗或营养建议**（非医疗处方，P-08 / FR-033）。

---

## 0. 开发范式与效力顺序

本项目采用 **SDD（Spec-Driven Development）+ ATDD（Acceptance Test Driven Development）**，逐任务推进：

- `constitution.md` 的 **P-01 ～ P-16** 是不可协商原则；**Definition of Done（DoD）** 见其 §3.1（单条 FR）、§3.2（单个 PR）、§3.3（单个 Release）。
- `SPEC.md` 是行为与验收的唯一权威（FR / AC / SC / NFR）；`plan.md` 只写技术选型、架构与接口契约；`docs/decisions.md` 记录 ADR。
- 冲突裁决顺序：**宪法原则 → 规格 → 方案 → 实现**。规格与原则冲突时，先提议修订并经用户书面确认，不得由贡献者或 AI 单方面绕过（constitution §1 / §4）。
- **P-01 Spec first**：任何行为变更先改 `SPEC.md`（含版本号）与追溯矩阵，再改实现；**P-02 先红后绿**：实现前先有 Given/When/Then 场景并确认为红，实现后转绿；**P-03 可追溯**：FR ↔ AC ↔ SC ↔ 任务 ↔ 提交全链路可查。
- **P-04 规格不含实现**：技术栈、框架、目录、接口签名一律写进 `plan.md`，不写进 `SPEC.md`。

---

## 1. 开发环境

- **Node.js ≥ 20**（CI 使用 22）；纯 ESM JavaScript，主实现语言为 **ECMAScript / ISO/IEC 22275:2018**（ADR-002）。v1 维持单一主实现语言（ADR-003 方案 A）。
- **零第三方依赖**：无需 `npm install` / `npm ci`；仓库没有 lock 文件，也**不得引入**包管理器清单（FR-052）。不新增任何运行时依赖。
- 所有命令从仓库根目录执行：

| 命令 | 作用 |
|---|---|
| `npm test`（等价 `node --test`） | 全量单元测试 |
| `npm run lint` | 10 项静态检查（`scripts/lint.mjs`） |
| `npm run spec-check` | 编号连续性、追溯矩阵、澄清标记、规格不含实现关键字 |
| `npm run acceptance` | 19 条 AC 红→绿状态与基线完整性 |
| `node scripts/coverage.mjs` | 三列覆盖率 ≥80%（Node 内置 coverage，零第三方） |
| `node tests/acceptance/gates/p1-gate.mjs` | Phase 1 出口门禁取证 |
| `node tests/acceptance/gates/p2-gate.mjs` | Phase 2 出口门禁取证 |

**当前状态如实说明**：P1 / P2 门禁均为 `verdict=BLOCKED` / **exit 2**（取证完成但出口未达成，不是取证失败）；`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`；`.github/workflows/ci.yml` 仍是 T-006 六 job 骨架，完整门禁接线归 T-042。**不得为了让 CI 变绿而删除、跳过或弱化任何 AC 场景**（P-09 / RK-03），也不得把红态基线提前改成 GREEN（P-02）。

---

## 2. 新增 FR / AC 的流程

1. 先改 `SPEC.md` **并递增版本号**（P-01）；新增 `FR-xxx` / `AC-xx` / `SC-xxx` 编号时同步 §12 追溯矩阵，确保无孤儿项（P-03）。
2. 写 Given/When/Then 验收场景并**确认为红**（P-02 / AC-14）；在 `tests/unit/` 写红态单测并先跑一次确认 RED。
   - 命名护栏：`tests/acceptance/` 下**禁止** `*.test.js` / `*.test.mjs`；验收驱动与门禁用例放 `tests/acceptance/`，单测放 `tests/unit/`。
3. 实现使断言转绿；只改满足场景所需的最小范围，不得顺手放宽断言或删测试。
4. 跑 §1 的全套校验；更新相关 README、`CHANGELOG.md` 与追溯矩阵；逐条核对 DoD §3.1 六项。
5. 所有 `[AIGC]` 产出**须经人工审查**后方可作为基线（P-10）；**commit / push 须用户逐次显式授权**。
6. 按逐任务节奏汇报「产出 / 校验结果 / 边界」后停下等审查，不自行推进下一任务。
7. 每任务配一份独立负向探针（仓库外、只读、零写盘）：证明门禁不是恒真总开关，也不是写死的恒假结论。

---

## 3. 提交与 PR 规范

- PR 必须关联 `FR-xxx` / `AC-xx` / `SC-xxx`，并说明改了 `SPEC.md` 的哪一节（若有）；使用 `.github/PULL_REQUEST_TEMPLATE.md`。
- 新增 / 修改的行为都要有验收场景；PR 模板中的测试结果与「[AIGC] 已人工审查」勾选必须齐全（constitution §3.2）。
- 禁止包含真实个人身体数据、个人可识别数据、另一任务的真实身体档案，以及受版权保护的指南原文或图表（P-06 / P-14 / FR-032）。
- 提交信息不得声称「CI 全绿」「AC 已转绿」「已发布」；当前 P0 基线（`SPEC.md` / `plan.md` / `constitution.md` / `tasks.md` / `tests/acceptance/ac-*.md` / `ci.yml` 等）**不得再改**，除非用户逐次书面授权。
- 地区表述：中国香港 / 中国澳门 / 中国台湾是中国的地区级条目，绝不作为独立国家表述。

---

## 4. 数据、隐私与语言包

- 示例档案与食谱**必须完全虚构**（P-14）；内部只用 Canonical ID，所有人可读字符串放 `locales/` 的七语言包（71 键冻结），缺键显式标注不静默混排（P-11）。
- 区域策略按声明国籍 → 声明居住地解析，用户覆盖优先，来源可追溯；**禁止** IP / 定位 / 静默推断（P-12）。
- LLM 增强默认关闭、逐次显式同意、断网或异常一律降级到规则 / 模板引擎（P-13）；运行期不调用在线翻译或 LLM。
- 面向用户的输出统一带「非医疗处方 / 估算值」免责声明与 `[AIGC]` 标注（P-08 / FR-033）。

---

## 5. `SPEC.md §10` 建议 / 可选文件登记（v1 不产出实体文件）

| 文件 | 级别 | 处置与理由 |
|---|---|---|
| `.github/FUNDING.yml` | 可选 | **不产出**：v1 未确定赞助渠道，不伪造收款账号 |
| `GOVERNANCE.md` | 可选 | **不产出**：当前为单人 + AI 协作，治理角色待人工确认 |
| `CITATION.cff` | 建议 | **不产出**：FR-039 为 SHOULD 非 MUST，版本 `0.1.0-dev` 未发布，引用元数据待人工填写 |
| `.github/dependabot.yml` | 建议 | **不产出**：零第三方依赖，无自动更新对象 |
| `.github/workflows/release.yml` | 建议 | **不产出**：v1 不建发布流水线（FR-052 / §10 v1 分发口径） |
| `CONTRIBUTORS.md` / `AUTHORS.md` | 可选 | **不产出**：致谢名单需人工确认 |

依据：`SPEC.md §10` 的 v1 分发口径明确「标注建议 / 可选的 FUNDING / GOVERNANCE / CITATION **不阻塞 v1**」，且包管理器发布配置 **不得出现**；FR-039 是 SHOULD。**本节只做登记，不产出这些文件**；是否补齐、何时补齐由人工裁决。`ci.yml 完整版` 的接线属于 T-042，不在本登记范围内。

---

## 6. 任务表张力登记（待人工裁决，AI 不自行处理）

- `tasks.md` T-040 点名「`ci.yml` 完整版」，但 `ci.yml` 属 P0 基线且 T-042 明确以 `.github/workflows/ci.yml` 为产出 → 本任务**不改 ci.yml**，只登记依赖。
- `SECURITY.md` 在 T-040 与 T-041 重复点名：T-040 按 §10「必需」交付社区规范版，T-041 后续补充合规法律细节。
- `CHANGELOG.md` 补录 M1～M2 在 T-040 / T-042 重复点名：本任务补录 M1～M2 基线条目，T-042 再补 Phase 3 条目。
- `README.md` 的状态段与远端链接是 M1 历史文字，且属 P0 基线；本任务不改，登记待人工裁决。
- `THIRD_PARTY_NOTICES.md` / `PRIVACY.md` 归 T-041，`encoding-check` 归 T-045，本任务不越界产出。

---

## 7. 许可与文档边界

- **GPL-3.0-only**；`LICENSE` 为 GPL-3.0 全文并随 clone 分发（FR-037 / P-07）。任何内置数据源须声明许可、版本与来源 URL，冲突一律拒绝引入（FR-031 / FR-032）。
- 本文件由 AI 生成，**待人工审查**（P-10）；其中「当前状态」段落反映的是 T-040 时点，后续任务推进后须同步更新，但不得为了美观而弱化 `BLOCKED` 结论。
