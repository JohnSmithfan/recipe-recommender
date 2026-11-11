# T-034 报告 · LLM 可选增强适配点与离线降级

> 日期：2026-11-11 · 基线提交：`2a08e3b`（T-033，仅本地 commit、未 push，本地 `main...origin/main [ahead 3]`）
> 映射：FR-041 补注 / FR-047～051、AC-17、E-16、SC-013、NFR-001 / NFR-009、P-11 / P-13 · `tasks.md §4.2 T-034` · `plan.md §9`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T034-20261111-0001`

---

## 0. 结论摘要

T-034 按 ATDD 先红后绿完成：24 条新单测，全量 `431/431`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.77 / 84.81 / 98.29`（三列均 ≥80）、独立负向探针 `20/20`。

交付的是**默认关闭的可选增强「门」与适配点**，不是任何在线服务客户端：
本仓库运行期不调用在线翻译或远端模型；适配器契约是**同步本地纯函数**，
任何未授权、不可用、断网、异常或不安全输出都降级为**规则 / 模板引擎原文**。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / `status=blocked` / exit 2，
`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。
本次交付**不代表 P1 出口达成、不代表 M3/M4 验收通过、不代表 AC-17 转绿**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-034」分两步执行：

1. 按 P-10 把 T-033 的 12 个文件提交为 `2a08e3b`（`12 files changed, +986 −2`），
   工作树归零、身份 `r4fpsdmyr7-blip` 未变、**仅本地 commit，未 push**。
2. T-034 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `tasks.md:115` | LLM 可选增强：默认关闭、启用需逐次显式同意并明确范围、不可用或断网自动降级为规则 / 模板引擎；**运行期不得调用在线翻译或 LLM**；产出 `src/core/render/` 增强适配点、配置开关 |
| `SPEC.md` FR-051 | 核心规则引擎 MUST NOT 依赖 LLM；LLM 仅默认关闭的可选增强（菜名润色、解释文本），不可用 / 未启用 MUST 自动离线降级，AC-01～14 仍可通过 |
| `SPEC.md` FR-041 补注 | 开发期可用 LLM 生成候选译文，但须人工审校静态入库；**运行期 MUST NOT 调用翻译服务或 LLM**，MUST NOT 把身体数据 / 计划 / 台账发往外部 |
| `SPEC.md` FR-047 / FR-048 | 零上传、零遥测；**逐次显式同意 + 明确范围**之前不得向外部服务传输身体数据或个人数据 |
| `SPEC.md` AC-17 | 断网且未启用时五级计划全部成功、零对外请求；未逐次同意时不得传输个人数据 |
| `SPEC.md` E-16 / NFR-001 / NFR-009 / P-13 | 增强开启但不可用 / 断网 → 自动降级；离线优先、供应商中立、LLM 可选 |
| `plan.md §9` | 「LLM 增强」控制点：默认关闭、逐次显式同意并明确范围、不可用时自动降级 |
| T-021 | 已提供「断网 + 增强关闭 + 网络端口禁用」的离线集成取证（`llmEnabled=false`、哨兵端口零触碰、`scanSources()` 零外部出口） |
| T-018 | `render(planObject, languagePack, intlFormatter)` 三参纯函数、`rr-data` 规范数据区是语言无关的机器锚点 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/enhance.test.js` → `ERR_MODULE_NOT_FOUND: src/core/render/enhance.js` |
| GREEN | 首次运行 **24/24 pass**；**未删测试、未放宽任何断言**。实现按测试契约定下「成功时 `fallback_reason=null`」与稳定码单复数拼写，均属**实现对齐测试**，非测试让步 |
| 既有回归 | `npm test` 由 `407/407` 升至 `431/431`，T-021 离线集成与 T-018 渲染用例全部保持通过 |

`AC-17` 本身一行未改，**仍为 RED**；T-034 只提供策略层 + 适配点的可执行取证。

---

## 3. 产出

| 文件 | 内容 |
|------|------|
| `src/core/render/enhance.js` | 新增：`ENHANCE_ERROR` 8 码、`ENHANCEMENT_SCOPES` / `ENHANCE_CONFIG_KEYS` / `DEFAULT_ENHANCE_CONFIG`、`ENHANCE_DECISION` / `ENHANCE_STEP` / `ENHANCE_ENGINE` 稳定 ID；`parseEnhanceConfig()` / `assertEnhanceConsent()` / `resolveEnhanceDecision()` / `applyEnhancement()` / `enhanceRenderedText()` / `createEnhanceGate()` |
| `src/core/render/index.js` | 追加统一出口导出（T-018 既有导出不变） |
| `src/core/render/README.md §8` | 模块定案：八条关键决策、范围与边界 |
| `src/cli/README.md §12` | 口径订正：配置开关未接入 CLI、零兜底不变 |
| `tests/unit/enhance.test.js` | 24 条红→绿单测（含真实 `render()` 输出的端到端取证） |
| `reports/t034-enhance.md` | 本报告 |

**`src/cli/` 与 `src/mcp/` 的实现代码一行未动**；`render.js` / `contract.js` / `data.js` / `errors.js`
一行未动；`COMMANDS` / `P2_COMMANDS` / `COMMAND_OPTIONS` / `FLAG_KEYS` / `OVERRIDE_KEYS` 全部保持。

---

## 4. 关键定案

1. **默认关闭**：`DEFAULT_ENHANCE_CONFIG = { enabled: false, scope: null }`；
   `enhanceRenderedText(text)` 空选项 → 零适配器调用、模板输出**逐字节相同**（AC-17 场景 1）。
2. **逐次显式同意**：同意对象固定四键 `{granted, scope, consent_id, request_id}`；
   `granted === true`；`scope` 必须与配置声明范围逐字一致且在
   `ENHANCEMENT_SCOPES`（菜名润色 / 解释文本）白名单内；`consent_id` 一次性——
   `createEnhanceGate()` 记录已消费 ID，复用即降级并留 `enhance.decision.reuse`。
   **无 IP / 定位 / 环境变量 / 静默推断**。
3. **可用性由宿主显式给出**：`availability = {available, offline}` 是纯数据，
   核心域不调用任何探测方法、不 `import node:*`；`offline` 或 `!available` 一律降级（E-16）。
   形状非法则失败关闭（`ERR_ENHANCE_PORT`）。
4. **失败即降级**：适配器缺失 / 非函数 / 抛错 / 返回 Promise / 返回非法字符串 →
   返回**未改动的模板正文**并记录 `fallback_reason` 稳定码；核心计划照常产出（FR-051）。
   异步结果被拒是刻意的：远端调用无法同步返回，因此不可能通过默认路径生效。
5. **输出不变量护栏**：增强结果 MUST 保留 `rr-data` 规范数据区**逐字节不变**、
   `<!-- rr-render` 头行与 `[AIGC]` 标记，且不得引入控制字符或私有字段 token；
   任一违反即拒绝增强并降级（FR-044 / FR-047 / FR-033）。
6. **运行期零在线调用**：本仓库**不内置任何远端适配器**；源码纯 ASCII、零 `node:` 导入、
   零网络出口、零在线翻译入口，可被 T-021 `scanSources()` 直接取证。若宿主自行注入
   外部适配器，须自行满足 FR-048 逐次同意与范围告知，且不得由默认路径触发。
7. **配置开关**：`ENHANCE_CONFIG_KEYS = ['enabled','scope']` + `parseEnhanceConfig(text)`；
   固定键集、未知键拒绝、类型失败关闭、默认关闭。**未接入 `rr plan`**：`runCli` 默认 deps
   不含增强端口，CLI 不读取任何 `rr.enhance.json`；与 T-032 / T-033 的「端口工厂只供显式注入」
   一致，**零兜底定案不变**。
8. **可追溯**：决策链 `enhance.step.*` 与结论 `enhance.decision.*` 全为 Canonical ID，
   不含自然语言、身体数值或个人数据（NFR-012）。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/enhance.test.js` | RED（模块缺失）→ **24/24 pass** |
| `npm test` | **431/431 pass, 0 fail**（T-033 基线 407 + T-034 新增 24） |
| `npm run lint` | PASS · 10/10 · `@param/@returns/@typedef` 690 处 / 72 文件 · 已实现公共出口 10 · `预留占位=[]` · `boundary.cli_no_node_imports=PASS` · `boundary.render_ascii=PASS` |
| `npm run spec-check` | PASS · FR 53/53 · AC 19/19 · SC 15/15 · NFR 15/15 · `[NEEDS CLARIFICATION]=0` · 扫描 49 份 md |
| `node scripts/coverage.mjs` | PASS · line 94.77% / branch 84.81% / functions 98.29%（均 ≥80） |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=116` / `independent_count=116` · `offline_checks=14 failed=0` · `gate.static_privacy=ok` |
| 独立负向探针 `/tmp/t034-probe.mjs` | **20/20 pass**（全仓令牌重扫、P0 基线、19/19 AC RED、命令集/覆盖键集/零兜底、源码纯 ASCII 与零外部出口、默认关闭零触碰、防假绿 A～D、E-16 降级、不变量护栏、逐次同意、CLI 零改动、T-021 静态口径、文档防假绿、AC-17 场景 1、Git 状态、探针只读） |
| P0 基线 diff | `none` |
| AC / 勾选 | 19/19 RED · `39 [ ] / 0 [x]` |
| Git | HEAD `2a08e3b` · T-033 已提交 · **T-034 未 commit / 未 push**（`[ahead 3]`） |

> 本轮无需「探针 MISS 修补」：20 项首次全检出。探针在仓库外 `/tmp`，**只读**，
> 用 `--untracked-files=all` 展开未跟踪文件后逐项比对，不写仓库任何文件。

---

## 6. 边界与未决

- **AC-17 仍 RED**：T-021 已提供断网 + 增强关闭的离线集成取证，T-034 只补「增强门 + 自动降级」
  的策略层可执行断言。`PRIVACY.md` / `SECURITY.md` 合规文档归 T-041、CI 静态扫描门禁接线归 T-042；
  本次不改任何 `ac-*.md` 状态、不勾 `tasks.md`、不改写 P1 verdict。
- **不实现任何在线服务客户端**：适配器契约是同步本地纯函数；本仓库默认路径永远零外部请求。
  宿主若注入外部适配器，其合规责任（FR-048 逐次同意、范围告知、不传身体数据）不在本仓库取证范围。
- **配置开关未接 CLI**：`rr plan` 默认 deps 不含增强端口；端口只供宿主显式注入（零兜底定案不变）。
- **`unit_system` 接线缺口**：仍只在策略层登记，未接 T-018 / T-019 区域格式化；
  `units` 的 CLI 覆盖入口仍未暴露（T-032 遗留）。
- **「未匹配，已回退」的自然语言标注**仍缺落点：T-018 的 71 键 Canonical ID 键集已冻结，
  新增语言包键须先走规格变更；当前以 `locale_source=auto:fallback` + `fallback_reason` 稳定码表达。
- **T-022 报告登记的三组规格张力与四选一裁决仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 D 解释仍待用户复核或撤销。
- **Git 状态说明**：提交 T-033 后本地 `main...origin/main [ahead 3]`，`origin/main` 停在 `0e506db`。
  远端服务器实际状态**未联网核实**，本轮未执行 fetch / push / update-ref，也不得据此断言已推送。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 含「`locales/` 未预置」这一 P1 阶段断言，
  Round 15 证据冻结在 `ac2a28d`；本次**未修改、未放宽** P1 审查器，P2 复审应另建审查器。
- 既有遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040；
  微信通道 `channel=unavailable`。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-035」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-033）；
- 若用户否决 §1 的门槛解释 → T-034 工作树未提交、可无痕回滚，回到 T-022 裁决点。
