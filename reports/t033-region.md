# T-033 报告 · 区域映射表与中立通用基线回退

> 日期：2026-11-10 · 基线提交：`1f01a52`（T-032，仅本地 commit、未 push，本地 `main...origin/main [ahead 2]`）
> 映射：FR-003 / FR-014 / FR-045、AC-16、E-14、SC-012、NFR-012、SPEC §6.3 注 / §6.9 地区表述合规 · `tasks.md §4.2 T-033`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T033-20261110-0001`

---

## 0. 结论摘要

T-033 按 ATDD 先红后绿完成：24 条新单测，全量 `407/407`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.61 / 84.37 / 98.40`（三列均 ≥80）、独立负向探针 `20/20`。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / `status=blocked` / exit 2，
`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。
本次交付**不代表 P1 出口达成、不代表 M3/M4 验收通过、不代表 AC-16 转绿**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-033」分两步执行：

1. 按 P-10 把 T-032 的 6 个文件提交为 `1f01a52`（`6 files changed, +1053 −8`），
   工作树归零、身份 `r4fpsdmyr7-blip` 未变、**仅本地 commit，未 push**。
2. T-033 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `tasks.md:113` | 区域映射表（ISO 3166-1 → 指南 / 历法 / 单位）+ 中立通用基线回退；`gregorian-season` **同等**遵守「年刷新 / 下层只读 / FALLBACK」；中国香港 / 中国澳门 / 中国台湾作**地区级选项** |
| `SPEC.md` FR-003 | 可插拔指南适配器按区域解析（中国 / 美国 / 无匹配 → 中立基线）；**MUST NOT 复制任何指南原文或图表** |
| `SPEC.md` §6.3 注 | 历法可插拔；通用季节历同受「年刷新 / 下层只读 / 失败 FALLBACK / 禁静默套近似值」约束 |
| `SPEC.md` §6.9 | **地区表述合规**：中国香港、中国澳门、中国台湾为中国的一部分，作为地区级选项，不得列为独立国家 |
| `E-14` | 区域无匹配 → 回退中立通用基线并标注；严禁列为独立国家 |
| `plan.md §8` | 步骤 3「无匹配 → 中立通用指南 + `gregorian-season`」、步骤 4「两种历法同等约束」 |
| T-032 | `assertRegionMappings()` 定义映射表形状契约；`createLocalePolicyResolver({regionMappings})` 是唯一注入口 |
| T-014 | `CALENDAR_KIND` / `FALLBACK_LABEL` / `validateCalendarAdapter` / `refreshCalendarData` 已实现通用季节历同等约束 |
| `AC-16` | 仍是 P0 登记的 RED 基线；主责任务 T-032 / T-033 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/region.test.js` → `ERR_MODULE_NOT_FOUND: src/core/guideline/region.js` |
| 首次 GREEN 尝试 | `22/24`；两条失败：① 畸形 mappings 被 schema 的 `codes` 一致性检查抢先报 `ERR_REGION_SCHEMA`，掩盖真正畸形点 → **调整实现校验顺序**（形状先于元数据）；② 测试把 `run.js` 注释中出现的端口名误判为「已接线」→ **改为断言组合根不自动装配 `createLocalePolicyResolverFromFs` / `loadRegionMappings`** |
| GREEN | `24/24 pass`；**未删测试、未放宽任何断言** |

`AC-16` 本身一行未改，**仍为 RED**；T-033 只提供策略层 + 数据结构的可执行取证。

---

## 3. 产出

### 3.1 数据（全部新增）

| 文件 | 内容 |
|------|------|
| `data/region/mappings.json` | 纯 `ISO 3166-1 alpha-2 → 策略` 键值，5 个码：`CN` / `US` / `HK` / `MO` / `TW`；形状直接满足 T-032 `assertRegionMappings()` |
| `data/region/schema.json` | 元数据 10 键：版本 / 来源 / 审校状态 / 中立基线 / 历法同等约束 / 地区级清单 / 覆盖度 / 已登记码 |
| `data/region/README.md` | 定案：最小示例集、审校状态、地区表述合规、历法同等约束、零兜底与边界 |
| `data/guideline/region-cn-example.json` / `region-us-example.json` | 自撰中立适配器，`source=synthetic-neutral-example`，沿用 T-011 固定 8 键与 `validateGuidelineAdapter()` 契约 |

> ⚠️ **这不是任何真实膳食指南的实现。** 映射是**结构性示例**，仅登记规格点名的
> 中国 / 美国与中国地区级选项；两个区域适配器的系数是自撰中立示例参数
> （仅在膳食纤维 / 饮水系数上体现 FR-014「按居住地调整取向」），
> 与任何真实权威指南的量化指标无关，`review_status=ai-candidate-unreviewed`。
> 须由贡献者按当地权威资料人工审校后替换，才能作为正式发布内容。
> **其它 ISO 码未登记即回退中立通用基线**，不声称覆盖全球、不伪造适用性判定。

### 3.2 实现与定案

| 文件 | 内容 |
|------|------|
| `src/core/guideline/region.js` | 10 个 `REGION_ERROR` 稳定码、`UNIT_SYSTEMS`、`CALENDAR_CONTRACT`、`SCHEMA_KEYS`、`RegionError`、`loadRegionMappings(fsPort)`、`createLocalePolicyResolverFromFs(fsPort)`；只读、零写入、零网络、零内置模块导入 |
| `src/core/guideline/index.js` | 追加导出（原 T-011 契约 / loader 出口不变） |
| `src/core/guideline/README.md` | 模块定案（四层校验、接线、数据状态与边界） |
| `src/core/locale/README.md` | §7.1 / §7.6 口径订正（T-032 时点「`data/region/` 不存在」已过时） |
| `src/cli/README.md` | 追加 §11 订正（示例映射表已提供，仍不自动接线） |
| `tests/unit/region.test.js` | 24 条红→绿单测 |
| `reports/t033-region.md` | 本报告 |

**`src/cli/` 与 `src/mcp/` 的实现代码一行未动**；`COMMANDS` / `P2_COMMANDS` / `OVERRIDE_KEYS` 全部保持。

---

## 4. 关键定案

1. **四层校验，防假绿**：① 形状复用 T-032 `assertRegionMappings()`（ISO alpha-2、四必填键、地区级标注）；② 语义 —— 每个 `guideline_id` 指向的适配器 MUST 存在且通过 T-011 契约，`calendar_id` ∈ T-014 `CALENDAR_KIND`，`unit_system` ∈ `UNIT_SYSTEMS`，`language_tag` ∈ T-031 `BUILTIN_TAGS`；③ `schema.baseline` MUST 与 `NEUTRAL_BASELINE` 逐字一致、`calendar_contract` MUST 声明同等约束，任一漂移 `ERR_REGION_BASELINE`；④ 地区级清单与 T-032 常量一致，否则 `ERR_REGION_SUBNATIONAL`。基线适配器 `generic-guideline` 也在加载时复验存在，避免「回退」只是口号。
2. **历法同等约束有可执行取证**：`CALENDAR_CONTRACT` 与 `FALLBACK_LABEL` / `CALENDAR_KIND` / `validateCalendarAdapter` 逐项对齐；单测**真实调用** `refreshCalendarData()` 验证 `gregorian-season` 成功时 `verified`、离线时 `FALLBACK / 未校验`，并验证单源 / 重复源适配器一律被拒。数据目录**不含任何时令日期、精确时刻、黄经或近似数值**（FR-012）。
3. **地区表述合规**：`HK` / `MO` / `TW` 是中国香港 / 中国澳门 / 中国台湾的**地区级 ISO 3166-1 条目**，不是独立国家。三条映射 `region_level:'subnational'` 且复用与 `CN` 相同的策略；作国籍时 T-032 不按国家解析、显式回退并标注 `locale.fallback.subnational`，作居住地时允许命中。复用 T-010 的 249 项只读常量，不另建地区表。
4. **中立通用基线**：`{ en, generic-guideline, gregorian-season, metric }`。基线**不是**区域条目，`mappings.json` 中不存在「通用基线码」；未登记码（如 `JP`）由 T-032 回退并输出 `locale.fallback.unmatched` + `inferred=false`。
5. **零兜底定案不变**：`createLocalePolicyResolverFromFs(fsPort)` 只产出可注入 `deps.resolveLocalePolicy` 的端口工厂；`rr plan` 默认 deps 仍缺该端口，缺端口即 `ERR_CLI_PORT` / exit 3（T-019）。T-033 不自动装配、不改 CLI 配置键集。
6. **T-032 端到端接线取证**（AC-16 三场景，策略层）：场景 1 `CN` 国籍 → `auto:nationality` + `region-cn-example` + `solar-terms` + `zh-Hans`；场景 2 显式覆盖 → `user` 优先；场景 3 未登记区域 → `auto:fallback` + `unmatched` + 基线四值。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/region.test.js` | RED（模块缺失）→ `22/24`（修实现顺序 + 修测试口径）→ **24/24 pass** |
| `npm test` | **407/407 pass, 0 fail**（T-032 基线 383 + T-033 新增 24） |
| `npm run lint` | PASS · 10/10 · `@param/@returns/@typedef` 651 处 / 71 文件 · 已实现公共出口 10 · `预留占位=[]` · `boundary.cli_no_node_imports=PASS` · `boundary.render_ascii=PASS` |
| `npm run spec-check` | PASS · FR 53/53 · AC 19/19 · SC 15/15 · NFR 15/15 · `[NEEDS CLARIFICATION]=0` · 扫描 45 份 md |
| `node scripts/coverage.mjs` | PASS · line 94.61% / branch 84.37% / functions 98.40%（均 ≥80） |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=114` / `independent_count=114` · `offline_checks=14 failed=0` · `gate.static_privacy=ok` |
| 独立负向探针 `/tmp/t033-probe.mjs` | **20/20 pass**（全仓令牌重扫、P0 基线、19/19 AC RED、命令集/覆盖键集/零兜底、映射形状、基线与历法契约、≥2 源约束、日期近似常量静态扫描、零 IO 源码扫描、3 类防假绿、地区级合规、加载冻结幂等、AC-16 三场景、适配器契约、文档防假绿、Git 状态、探针只读） |
| P0 基线 diff | `none` |
| AC / 勾选 | 19/19 RED · `39 [ ] / 0 [x]` |
| Git | HEAD `1f01a52` · T-032 已提交 · **T-033 未 commit / 未 push**（`[ahead 2]`） |

> 探针两处 MISS 均定性为**探针自身取证口径缺口**：Git 默认折叠未跟踪目录，导致逐文件断言失效；
> 改用 `--untracked-files=all` 展开后逐文件比对，**判定更严**，未放宽。

---

## 6. 边界与未决

- **AC-16 仍 RED**：场景 1 还要求「联网下载精确交节时刻」，属 T-014 net 端口与 T-042 CI 接线；本次只做策略层与数据结构取证，不代表端到端验收通过。
- **数据是 AI 候选稿，待人工审校**：最小示例集（5 个码）+ 2 个自撰中立适配器，不代表任何真实指南适用性；`review_status=ai-candidate-unreviewed`。不得把「映射表已落」解读为「区域数据已验收」。
- **`unit_system` 接线缺口**：目前只在策略层登记，尚未接到 T-018 / T-019 的区域格式化（FR-043）；`units` 的 CLI 覆盖入口仍未暴露（T-032 遗留）。
- **「未匹配，已回退」的自然语言标注**仍缺落点：T-018 的 71 键 Canonical ID 键集已冻结，新增语言包键会破坏 SC-011 键集一致性，须先走规格变更；当前以 `locale_source=auto:fallback` + `fallback_reason` 稳定码表达。
- `rr plan` 默认 deps 仍缺 `resolveLocalePolicy`（零兜底）；CI 门禁接入留 T-042。
- T-022 报告登记的三组规格张力与四选一裁决**仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 D 解释仍待用户复核或撤销。
- **Git 状态说明**：提交 T-032 后本地 `main...origin/main [ahead 2]`，`origin/main` 停在 `0e506db`。远端服务器实际状态**未联网核实**，本轮未执行 fetch / push / update-ref，也不得据此断言已推送。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 含「`locales/` 未预置」这一 P1 阶段断言，Round 15 证据冻结在 `ac2a28d`；本次**未修改、未放宽** P1 审查器，P2 复审应另建审查器。
- 既有遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040；微信通道 `channel=unavailable`。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-034」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-032）；
- 若用户否决 §1 的门槛解释 → T-033 工作树未提交、可无痕回滚，回到 T-022 裁决点。
