# CHANGELOG.md · 变更记录

> [AIGC] 本文件由 AI 依据 `SPEC.md §10` / `constitution.md` 生成 · 审计追踪 ID：`RR-T040-20261113-0001` · **待人工审查（P-10）**
> 许可：本仓库采用 **GPL-3.0-only**；`LICENSE` 全文随 clone 分发，本文件随源码一同分发。
> 免责声明：本项目不构成医疗或营养建议，所有数值为估算值（非医疗处方，P-08 / FR-033）。

格式基于 **Keep a Changelog**，版本号遵循 **SemVer（语义化版本）**。
当前版本 `0.1.0-dev`；**尚未发布任何 GitHub Release 或包管理器产物**，本文件只记录源码变更，**不代表**存在已发布版本或可直接安装的分发物（`SPEC.md §10` v1 分发口径 / FR-052 / FR-039）。

---

## [Unreleased]

> 按 `constitution.md` P-01 与 `tasks.md` T-040 补录 M1～M2 基线条目，并订正 `docs/competitive-research.md` 的 M0 滞后文字。以下条目均为源码仓库内的变更记录，不是发布说明。

### Added

- **M1 · P0 骨架与红态基线（2026-11-06～07，基线提交 `4914e3d`）**
  - 新增 `SPEC.md`（FR / AC / SC / NFR 与追溯矩阵）、`plan.md`、`constitution.md`（P-01～P-16 与 DoD）、`tasks.md` 与 `docs/decisions.md`（ADR-002 实现语言、ADR-003 方案 A）。
  - 新增 19 条 `tests/acceptance/ac-*.md` **红态基线**、验收驱动 `run.mjs` / `scripts/acceptance.mjs`、`scripts/spec-check.mjs` 与 `.github/workflows/ci.yml` 六 job 骨架。
  - 新增 `LICENSE`（GPL-3.0 全文）、`README.md`、`.gitignore`、两份完全虚构的示例档案与端口层 `src/io/`。
  - 定案：实现语言 ECMAScript / ISO/IEC 22275:2018（纯 ESM、Node ≥20）、GPL-3.0-only、零第三方依赖、核心不依赖 LLM、示例完全虚构。
- **M2 · P1 核心域与离线门禁（2026-11-07～08，提交 `ac2a28d`）**
  - 新增 `src/core/` 八个域（profile / rx / planner / calendar / dedup / purchase / feedback / render）、`src/cli/` 与 `src/io/` 适配器；CLI 零 `node:` 导入、端口注入零兜底（T-019）。
  - 新增 `tests/acceptance/offline-integration.mjs` 断网集成、`tests/acceptance/gates/p1-gate.mjs` Phase 1 门禁取证器、`scripts/lint.mjs` 与 `scripts/coverage.mjs`。
  - 结论如实登记：P1 出口 `verdict=BLOCKED` / exit 2，`AC-01～12` 未全部转绿；四选一裁决待人工书面决定（`reports/t022-gate.md §4`）。
- **M3 · P2 适配层、i18n 与区域策略（2026-11-09～12，`0e506db` … `4d270ce`）**
  - 新增零依赖 stdio MCP Server（`src/mcp/`，4 个 `rr_` 工具与类型层隐私护栏）、七语言包（`locales/`，71 键 × 7）、`resolveLocalePolicy` 与区域映射 `data/region/`、LLM 可选增强门（默认关闭）、可插拔数据源端口与元数据目录 `data/source/`、八份真实多语言渲染快照 `tests/snapshots/i18n/`。
  - 新增 `tests/acceptance/gates/p2-gate.mjs` Phase 2 出口门禁取证器：十项门禁全过但四条 AC 无 E2E_PASS，结论 `verdict=BLOCKED` / exit 2（`reports/t037-p2-gate.md`）。
- **T-040 · `SPEC.md §10` 社区规范文件**：新增 `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`SUPPORT.md`、`CHANGELOG.md`、Issue / PR 模板与 `config.yml`、`CODEOWNERS`；建议 / 可选文件按登记处理（v1 不产出实体文件）。

### Changed

- 按 P-01 订正 `docs/competitive-research.md` 的 M0 阶段滞后文字：宿主平台、实现语言、许可证三项已定案，不再表述为待确认；历史决策依据保留在 `docs/decisions.md`。
- 逐任务维护 `src/cli/README.md §8～15` 与各模块 README，记录各阶段口径订正与未接线边界。

### Notes

- 门禁结论保持 **BLOCKED**：P1 / P2 取证器均 `baseline_touched=0`，19/19 AC 仍 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`；`ci.yml` 仍是 T-006 骨架，完整门禁归 T-042。
- 已登记待人工裁决：`T-022` 四选一、`ISSUE-20261109-T030-GATE` 的 D 解释、`ISSUE-20261112-T037-GATE`、AC-15 快照位张力、T-014 缓存路径与交节下载张力，以及 T-040 / T-041 / T-042 之间三处任务表重复点名。
- 建议 / 可选文件（`FUNDING.yml` / `GOVERNANCE.md` / `CITATION.cff` / `dependabot.yml` / `release.yml` / `CONTRIBUTORS.md` / `AUTHORS.md`）在 `CONTRIBUTING.md §5` 登记，v1 不产出；包管理器发布配置按 FR-052 禁止出现。

---

本文件由 AI 生成，**待人工审查（P-10）**；T-042 补录 Phase 3 条目时须保持「未发布」口径，不得把 `[Unreleased]` 改写成已发布版本。
