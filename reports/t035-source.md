# T-035 报告 · 可插拔数据源端口与元数据契约

> 日期：2026-11-11 · 基线提交：`7552aa1`（T-034，仅本地 commit、未 push，本地 `main...origin/main [ahead 4]`）
> 映射：FR-031 / FR-032 / FR-037 / FR-047 / FR-053、AC-13 / AC-18、E-15、SC-010、NFR-008 · `tasks.md §4.2 T-035` · `plan.md §4 / §9 / R-04`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T035-20261111-0001`

---

## 0. 结论摘要

T-035 按 ATDD 先红后绿完成：25 条新单测，全量 `456/456`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.95 / 85.26 / 98.36`（三列均 ≥80）、独立负向探针 `20/20`。

**本仓库不内置任何真实第三方数据本体。** `data/source/` 是**元数据目录**：四条外部 / 用户数据源
只登记许可声明、版本、来源 URL 与审校状态，且全部 `ai-candidate-unreviewed` + `bundled = false`，
加载器一律拒绝；唯一可加载的是完全虚构、自撰中立数值的 `synthetic-demo`。
这落实了 `plan.md R-04`「存疑数据一律不内置，降级为用户自建适配器」与 FR-031「许可存疑或冲突者一律不得内置」。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / `status=blocked` / exit 2，
`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。
本次交付**不代表 P1 出口达成、不代表许可审计完成、不代表 AC-13 / AC-18 转绿**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-035」分两步执行：

1. 按 P-10 把 T-034 的 6 个文件提交为 `7552aa1`（`6 files changed, +1020`），
   工作树归零、身份 `r4fpsdmyr7-blip` 未变、**仅本地 commit，未 push**。
2. T-035 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `tasks.md:117` | 数据源适配器：HowToCook(Unlicense) / USDA FDC(CC0) + 人工校验中国食材子集 / 用户自建；每个数据源带许可声明、版本号、来源 URL；**存疑或冲突一律拒绝加载**；产出 `src/core/` 端口 + `data/` 元数据 |
| `SPEC.md` FR-031 | 菜谱 / 营养 MUST 通过可插拔适配器接入；每个内置数据源 MUST 有明确许可声明、版本号与来源 URL；**许可存疑或冲突者一律不得内置** |
| `SPEC.md` FR-032 | MUST NOT 复制受版权保护出版物的原文或图表，仅引用原则与量化指标 |
| `SPEC.md` FR-037 / §10 | LICENSE 全文 + `THIRD_PARTY_NOTICES.md` 声明第三方数据与依赖许可；**内置数据源若存在许可证冲突（README 与包元数据不一致）不得引入** |
| `SPEC.md` FR-047 / FR-053 / E-15 | 零上传、仓库与发布物不得含真实个人身体数据 / `diet-plan` 副本；疑似真实数据一律拒绝合入 |
| `SC-010` / `NFR-008` | 所有内置数据源许可明确且无冲突；依赖与数据源许可显式登记 |
| `AC-13` / `AC-18` | 社区规范文件与许可审计；`THIRD_PARTY_NOTICES.md` 列明 HowToCook(Unlicense)、USDA FDC(CC0)、用户自建边界 |
| `plan.md §4` | 目录树中 `data/` 只列 `guideline/` 与 `region/`；新增 `data/source/` 属**实现层细化**，P0 基线一字未改 |
| `plan.md R-04` | HowToCook / USDA FDC 与中国食材子集的版权与准确性须在 M4 前逐项审计；**存疑数据一律不内置，降级为用户自建适配器** |
| T-016 | 核心域零内置食材表；T-035 只提供端口与元数据，不自动接线到日计划 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/source.test.js` → `ERR_MODULE_NOT_FOUND: src/core/source/index.js` |
| GREEN | 首次运行 **25/25 pass**；**未删测试、未放宽任何断言**。红态写完后曾修正两处测试自身的表达（bundled ↔ payload_path 形状断言、去掉恒真三元表达式），均属**测试口径收紧 / 清理**，不是放宽判定 |
| 既有回归 | `npm test` 由 `431/431` 升至 `456/456`，T-021 离线集成、T-033 区域映射、T-034 增强门用例全部保持通过 |

`AC-13` / `AC-18` 本身一行未改，**仍为 RED**；T-035 只提供数据源端口与元数据的可执行取证。

---

## 3. 产出

| 文件 | 内容 |
|------|------|
| `data/source/catalog.json` | 5 条 descriptor，固定 9 键；每条含 `license` / `version` / `source_url` / `review_status` / `bundled` / `payload_path` |
| `data/source/schema.json` | 固定 16 键：许可 / 种类 / 审校状态白名单、许可期望表、三类键集、六条拒绝策略、已内置与外部候选清单、`coverage = metadata-only` |
| `data/source/synthetic-demo.json` | **唯一可加载**示例：3 条完全虚构记录，`fictional: true`，数值自撰中立 |
| `data/source/README.md` | 数据目录定案：声明性质、零内置、零网络、真实接入的四个前提 |
| `src/core/source/contract.js` | `SOURCE_ERROR` 12 码、`SourceError`、四类白名单 / 期望表、五个固定键集；四个 `assert*` 纯函数 |
| `src/core/source/loader.js` | `loadSourceCatalog(fsPort)` / `loadDataSource(fsPort, id)` / `createDataSourcePort(fsPort)`；只读、冻结、幂等 |
| `src/core/source/index.js` | 统一出口 |
| `src/core/source/README.md` | 模块定案：四层校验、拒绝顺序、零兜底与边界 |
| `tests/unit/source.test.js` | 25 条红→绿单测 |
| `src/cli/README.md §13` | 口径订正：端口未接入 CLI、零兜底不变 |
| `reports/t035-source.md` | 本报告 |

**`src/cli/` 与 `src/mcp/` 的实现代码一行未动**；`COMMANDS` / `P2_COMMANDS` /
`COMMAND_OPTIONS` / `FLAG_KEYS` / `OVERRIDE_KEYS` 全部保持。

---

## 4. 关键定案

1. **零内置真实数据**：元数据目录而非数据库。四条外部 / 用户源
   （`howtocook-recipes` / `usda-fdc-nutrition` / `cn-ingredient-subset` / `user-defined`）
   全部 `review_status = ai-candidate-unreviewed`、`bundled = false`、`payload_path = null`；
   唯一 `bundled = true` 的是完全虚构的 `synthetic-demo`。加载成功只表示「示例元数据与 payload 形状合法」。
2. **四层校验，失败关闭**：① 形状（catalog / schema / descriptor / payload / record 各自固定键集，
   Canonical ID、`payload_path` 限定在 `data/source/` 内防路径穿越）；② 语义（kind / license / version /
   纯 HTTPS URL，无 query / fragment / userinfo / 端口）；③ 防假绿（schema 白名单、三类键集、六条策略
   与冻结常量逐字一致；`bundled_sources` / `external_candidates` 与 descriptor 实际状态一致；id 唯一；
   payload 的 `id` / `kind` / `license` / `version` 必须与 catalog 条目一致）；④ 策略拒载。
3. **许可冲突可执行**：`LICENSE_EXPECTATIONS` 把规格点名的 `Unlicense`（HowToCook）与 `CC0-1.0`
   （USDA FDC、中国食材子集）固定为期望值，descriptor 漂移即 `ERR_SOURCE_CONFLICT`；
   未知许可 `ERR_SOURCE_LICENSE`。这是「README 与包元数据不一致」的可执行近似。
4. **存疑一律拒载**：`review_status !== approved` → `ERR_SOURCE_REVIEW`；
   即便人工把某外部源改写成 `approved`，`bundled !== true` 仍导致 `ERR_SOURCE_BUNDLED`；
   把 `bundled` 改成 `true` 又会因 `bundled_sources` 清单不一致被 catalog 校验拒绝。**AI 不得自行改审校状态**。
5. **完全虚构与隐私**：payload `fictional: true`；记录只含 Canonical ID 与自撰中立数值；
   拒绝私有字段 token（`weight_kg` / `diet-plan` 等）；不复制任何指南原文 / 成分表（FR-032），
   不含真实身体数据（FR-047 / FR-053 / P-14）。
6. **声明性质**：外部源 `version = "unverified"` 明确表示版本未核实；`source_url` 仅为许可与来源**声明**，
   `https://example.invalid/...` 用 RFC 2606 保留域表示无真实下载端点；**运行期不访问任何来源 URL**，
   加载只经注入的 `FsPort.readJson`，零网络、零写入。
7. **真实接入的四个人工前提**（`data/source/README.md §3`）：逐项核对许可文本与包元数据 →
   中国食材子集由具备资质人员审校 → `THIRD_PARTY_NOTICES.md`（T-040 / T-041）与 CI 门禁（T-042）齐备 →
   才能由人工改 `approved` 并提供 payload。**本次一步未完成，也不声称完成许可审计**。
8. **零兜底定案不变**：`createDataSourcePort(fsPort)` 只产出可注入端口，`rr plan` 默认 deps 不含该端口；
   CLI 不自动接线，与 T-032 / T-033 / T-034 的「端口工厂只供显式注入」一致。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/source.test.js` | RED（模块缺失）→ **25/25 pass** |
| `npm test` | **456/456 pass, 0 fail**（T-034 基线 431 + T-035 新增 25） |
| `npm run lint` | PASS · 10/10 · `@param/@returns/@typedef` 729 处 / 74 文件 · 已实现公共出口 11 · `预留占位=[]` · `boundary.cli_no_node_imports=PASS` · `boundary.render_ascii=PASS` · `boundary.acceptance_naming=PASS` · `boundary.no_third_party=PASS` |
| `npm run spec-check` | PASS · FR 53/53 · AC 19/19 · SC 15/15 · NFR 15/15 · `[NEEDS CLARIFICATION]=0` · 扫描 52 份 md |
| `node scripts/coverage.mjs` | PASS · line 94.95% / branch 85.26% / functions 98.36%（均 ≥80） |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=120` / `independent_count=120` · `offline_checks=14 failed=0` · `gate.static_privacy=ok` |
| `node tests/acceptance/run.mjs` | **19/19 RED · 0 GREEN** · 红态基线有效（exit 0 仅代表基线完整） |
| 独立负向探针 `/tmp/t035-probe.mjs` | **20/20 pass**（全仓令牌重扫、P0 基线、19/19 AC RED、命令集/覆盖键集/零兜底、源码零 IO/零网络、catalog 与 schema 契约、数据零真实令牌、防假绿 A～D、拒载策略、加载只读冻结幂等、端口形态、CLI 零改动、T-021 静态口径、文档防假绿、Git 状态、探针只读） |
| P0 基线 diff | `none` |
| AC / 勾选 | 19/19 RED · `39 [ ] / 0 [x]` |
| Git | HEAD `7552aa1` · T-034 已提交 · **T-035 未 commit / 未 push**（`[ahead 4]`） |

> 探针在仓库外 `/tmp`，**只读**，用 `--untracked-files=all` 展开未跟踪文件后逐项比对，不写仓库任何文件。

---

## 6. 边界与未决

- **AC-13 / AC-18 仍 RED**：`THIRD_PARTY_NOTICES.md` 与社区规范文件归 T-040 / T-041，
  CI 许可扫描门禁接线归 T-042；本次不改任何 `ac-*.md` 状态、不勾 `tasks.md`、不改写 P1 verdict。
- **不代表许可审计完成**：`review_status = ai-candidate-unreviewed`、`coverage = metadata-only`、
  外部源 `version = unverified`。HowToCook / USDA FDC / 中国食材子集的真实接入须人工逐项审计。
- **零内置第三方数据**：仓库不含任何真实 HowToCook / USDA FDC 记录，不联网下载，不解析上游格式；
  唯一 payload 是 3 条完全虚构示例记录。
- **`plan.md §4` 目录树未列 `data/source/`**：属实现层细化，本任务不改 P0 基线；
  若后续需要文档化目录树，走规格 / 计划变更流程（P-04）。
- **端口未接 CLI**：`rr plan` 默认 deps 不含数据源端口（零兜底不变）；
  T-016 零内置食材表定案不变，日计划不会自动获得食材数据。
- **T-022 报告登记的三组规格张力与四选一裁决仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 D 解释仍待用户复核或撤销。
- **既有遗留**：`unit_system` 未接 T-018 / T-019 格式化器；`units` CLI 覆盖键仍缺；
  「未匹配，已回退」自然语言标注缺冻结 71 键集之外的语言包键；AC-16 待 T-014 / T-042 联网交节下载与区域示例人工审校。
- **Git 状态说明**：提交 T-034 后本地 `main...origin/main [ahead 4]`，`origin/main` 停在 `0e506db`。
  远端服务器实际状态**未联网核实**，本轮未执行 fetch / push / update-ref，也不得据此断言已推送。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 口径滞后，Round 15 证据冻结在 `ac2a28d`；
  本次**未修改、未放宽** P1 审查器，P2 复审应另建审查器。
- 其余遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040；
  微信通道 `channel=unavailable`。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-036」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-034）；
- 若用户否决 §1 的门槛解释 → T-035 工作树未提交、可无痕回滚，回到 T-022 裁决点。
