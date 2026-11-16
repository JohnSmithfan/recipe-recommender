# 发布审计记录 · 实现语言与 Corresponding Source

> [AIGC] 本记录由 AI 依据 `tasks.md T-043` / `SPEC.md §8 AC-19` / `NFR-015` / `NFR-004` / `FR-037` / `P-16` / `SC-015` / `constitution.md §3.3` / `SPEC.md §14.3` / `ADR-002` 生成 · 审计追踪 ID：`RR-T043-20261117-0001` · **待人工审查（P-10）** · 许可：GPL-3.0-only
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。
> **本记录是静态取证与声明层文档，不是法律意见，也不是端到端发布证据。**

## 1. 审计范围与结论摘要

| 项 | 值 |
|---|---|
| 审计任务 | T-043（Phase 3 · M4 门禁） |
| 映射 | NFR-015、NFR-004、FR-037、AC-19、SC-015、P-16 |
| 取证器 | `scripts/language-source.mjs`（只读、零依赖、可独立复跑） |
| 判定 | `verdict=STATIC_ONLY`（静态检查零命中），**AC-19 仍 RED** |
| `release_artifacts=0` | **产物为空**：v1 尚未发布、不发 Release |
| `end_to_end=unverified` | 静态取证**不构成**端到端发布证据 |
| `ci_runs=unverified` | 本机结果 ≠ GitHub Actions 已运行 |
| `local_matrix_cells=1` | 本机仅 macOS 1 格 / 全矩阵 9 格（1/9） |
| AC-19 转绿 | 归 **T-046** 人工裁决；真实 Release 归档归 **T-052** |

**结论**：源码层与声明层的静态条件全部可证；但 AC-19 场景中的「每个 Release 产物附 Corresponding Source 且一一对应」与「三平台 AC 结果一致」两项**当前不具备端到端取证条件**，因此本任务**不把 AC-19 转绿**、不勾 `tasks.md`、不改 `tests/acceptance/ac-19.md`、不把取证器接入 CI 必跑门禁。CI 绿不等于 AC 转绿（T-042 定案）。

## 2. 实现语言：现行 ISO/IEC 标准化语言

- 主实现语言为 **ECMAScript 规范套件 / ISO/IEC 22275:2018**（`SPEC.md §14.3` / `ADR-002` 定案，2025 年复核确认现行）。
- 已撤销的 ISO/IEC 16262:2011 **不得**作为现行标准引用；`SPEC.md §14.3` 明确「已于 2018 年撤销、由 22275:2018 取代」。取证器检查该撤销号未被写成现行。
- 实现主体全部为 `.js` / `.mjs` 的人类可读、可修改 UTF-8 文本，含 SPDX 许可头；**不存在**仅靠反汇编才能维护的交付物。
- 单一实现语言（A-10 / ADR-003 G-06 默认拒绝第二实现语言）：仓库内无 `.ts/.py/.go/.rs/.java/.c/.cpp/.rb/.php` 等实现源码，也未引入任何第二语言工具链。`polyglot-gate` 归 T-044，本任务不接线。

## 3. 机器语言 / ISA 绑定二进制

取证器按**文件头魔数**而非仅按扩展名判定，覆盖 ELF、Mach-O 32/64 位（大小端）、PE/MZ、WebAssembly、JVM class，并扫描 `.wasm/.exe/.so/.dll/.dylib/.class/.o/.a/.lib/.bin/.pyc/.jar/.node` 等扩展名。

**如实登记**：本机工作区存在 `src/.DS_Store`（macOS Finder 元数据，含 NUL 字节），它**未被 Git 跟踪**且被 `.gitignore` 的 `.DS_Store` 规则忽略，**不是实现主体、不是机器码交付物**。取证器显式识别并排除此类 OS 元数据（`isOsMetadata()`），既不误判为假红，也不借此声称「仓库零二进制」。发布前应由维护者清理本机元数据目录，归档时以 `git archive` / `git ls-files` 为准。

## 4. Corresponding Source 与产物一一对应

- GPL-3.0 的 Corresponding Source 定义为「preferred form for making modifications」：完整可读源码树、语言包、数据描述符、构建与测试脚本、`LICENSE`（GPL-3.0 全文）、`THIRD_PARTY_NOTICES.md`、规格与 SDD 工件均随源码分发（`constitution.md §3.3`）。
- 一一对应规则由 `evaluateMapping(artifacts, sources)` 纯函数表达：每个产物必须有且仅有一个 `source_id`，且该 ID 在源码清单中存在；重复或悬空引用一律判不一致。该函数支持负向注入（单测逐项打红），证明非恒真非恒假。
- **当前 `release_artifacts=0`**：v1 分发口径仅 GitHub Releases（源码归档 + 校验和）与 Git 源码，`package.json` 为 `private=true`、无 `publishConfig/files/bin/prepack/postpack` 发布字段、无包管理器清单、无 `release.yml`（`SPEC.md §10` / FR-052 / AC-18）。
- 因此一一对应当前为**空集上的 vacuous truth**：规则可证，但**不构成端到端证据**，`archive_vacuous=true` 显式登记。真实产物与校验和的一一对应须在 **T-052 Release 归档**时重新取证，并经人工审查。
- 包管理器发布配置按 FR-052 禁止出现；本记录不声称任何产物已生成或已分发。

## 5. 三平台 AC 结果一致

- `.github/workflows/ci.yml` 的 `matrix` job 配置为 **3 OS × 3 Node = 9 格**（Windows / macOS / Linux × Node 20 / 22 / 24），执行同一组 `npm test`、`npm run acceptance`、`npm run spec-check`、`node scripts/i18n-keys.mjs`。
- **本机仅 macOS / Node 22 的 1 格可实测（1/9）**；GitHub Actions 未在联网环境核实，**本机结果 ≠ CI 已运行**，不得把配置存在当成「三平台 AC 结果一致」已达成。
- 19/19 AC 仍为 RED 基线；`acceptance` job 以「19/19 全红基线完整」为通过条件，**CI 绿不等于 AC 转绿**。
- 三平台一致性须由 CI 实际运行记录 + T-046 人工裁决共同签署；本任务只登记配置契约与取证边界。

## 6. 贡献者零真实身体数据边界

- 真实身体数据令牌规则**唯一权威**在 `.github/workflows/ci.yml` 头部声明；取证器经 `scan-common.mjs` 的 `tokenRule()` 反向读取，**零复制字面量**（FR-053 / P-14）。
- `examples/profiles/` 恰为两份完全虚构的全球平均档案（`fictional=true`），`../diet-plan/` 真实数据永不入库，个人档案目录被 `.gitignore` 忽略。
- 贡献者可在不接触任何个人真实身体数据的前提下 clone 源码、修改实现、跑通 `npm test` / `npm run acceptance` 等验收场景（US-08 / US-10）。静态扫描**不能**证明运行期零上传，运行期证据由 `tests/acceptance/offline-integration.mjs` 的缺席 / 哨兵双模式提供。
- 本记录不含任何真实身体数值、档案、计划或台账。

## 7. 待人工裁决事项（AI 不自行处理）

| # | 事项 | 归属 |
|---|---|---|
| 1 | AC-19 结构性矛盾：场景要求 Release 产物与三平台一致，但 v1 未发布、矩阵本地 1/9、19/19 AC RED。本任务按 T-037 / T-041 同构的 D 口径只交付取证器与本记录 | 用户书面裁决 / T-046 |
| 2 | `scripts/language-source.mjs` 是否接入 CI 必跑门禁（当前不接，与 p1-gate / p2-gate 取证器同口径） | T-046 / 人工 |
| 3 | 真实 Release 归档（源码 + 校验和 + Corresponding Source 一一对应） | T-052 |
| 4 | 7 份 `[AIGC]` 社区 / 合规文档与 497 条语言包候选译文的人工审校 | 人工（P-10） |
| 5 | `ISSUE-20261114-T042-COVERAGE-TIMEOUT` 覆盖率全量并发 flaky 超时 | 用户裁决（本任务未修复） |
| 6 | 本机未跟踪 OS 元数据清理；归档以 Git 跟踪文件为准 | 维护者 / 发布前 |

## 8. 不变量（本任务未触碰）

`19/19 AC RED`、`tasks.md 39 [ ] / 0 [x]`、P0 基线零 diff（含 `.github/workflows/ci.yml`）、`COMMANDS` 七条 P1 快照、`rr plan` 零兜底、p1-gate / p2-gate 恒 `verdict=BLOCKED` / exit 2、`baseline_touched=0`、`package.json` 零第三方依赖 / private / GPL-3.0-only / 无发布字段。

---

> [AIGC] 候选文本，待人工审查（P-10）；`verdict=STATIC_ONLY` 仅表示静态检查零命中，**不构成** AC-19 端到端通过或发布许可。
