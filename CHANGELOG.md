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
- **T-041 · 合规文档**：新增 `PRIVACY.md`、`THIRD_PARTY_NOTICES.md`，并只追加 `SECURITY.md §6`；两份新文档与 `src/cli/inventory.js` 的 7 个根文件 / 5 个目录、`data/source/catalog.json` 的 5 条 descriptor 动态逐项对齐。同时收紧 `p2-gate` 的 AC-17 判据，修复「合规文档齐备即误判 E2E_PASS」的假绿缺陷（新增 CI 实接剥注释判定 + 脚本实体 + 人工转绿门槛）。
- **T-042 · Phase 3 全量 CI 门禁与静态扫描**：`.github/workflows/ci.yml` 由 T-006 六 job 骨架升级为九 job 完整版，新增 `license-scan` / `community-files` / `offline` 三个 job，并接入覆盖率阈值、零依赖 lint、语言包键集、区域来源、免责快照与断网集成。新增 `scripts/scan-common.mjs` 公共只读层，以及 `privacy-scan.mjs` / `license-scan.mjs` / `community-files.mjs` / `i18n-keys.mjs` 四个可独立复跑的静态扫描脚本（合计 21 项检查）。
- **T-043 · 实现语言与 Corresponding Source 门禁（AC-19）**：新增 `scripts/language-source.mjs` 静态取证器（8 项检查：现行 ISO/IEC 22275:2018 语言、人类可读源码、无机器码 / ISA 绑定二进制、单一实现语言、产物一一对应规则、三平台矩阵契约、贡献者零真实数据、发布审计记录），按文件头魔数识别 ELF / Mach-O / PE / WASM / JVM class；判定逻辑抽成可负向注入的纯函数。新增 `docs/release-audit.md` 发布审计记录与 `tests/unit/t043-language-source.test.js`。**如实登记**：v1 `release_artifacts=0`（尚未发布）、一一对应为空集上的规则可证、**不构成端到端证据**；本机仅 1/9 矩阵格可实测、CI 未联网核实；`verdict=STATIC_ONLY` 仅表示静态检查零命中，AC-19 仍 RED，转绿归 T-046、真实归档归 T-052。取证器不接入 CI 必跑门禁。

### Changed

- 按 P-01 订正 `docs/competitive-research.md` 的 M0 阶段滞后文字：宿主平台、实现语言、许可证三项已定案，不再表述为待确认；历史决策依据保留在 `docs/decisions.md`。
- 逐任务维护 `src/cli/README.md §8～17` 与各模块 README，记录各阶段口径订正与未接线边界。
- 按 T-042 口径订正 `tests/unit/community-files.test.js` / `compliance-files.test.js` 中「不得提前接线 / 脚本不得存在」的历史阶段断言，改为「必须接线且不得假绿」的正向取证；判定未放宽（19/19 RED、零勾选、令牌动态取唯一权威三条不变量保留）。
- 订正 `tests/acceptance/gates/p2-gate.mjs` 中关于 CI 骨架与静态扫描未接线的时点文字，判定逻辑与 `verdict=BLOCKED` 均未改。

### Notes

- 门禁结论保持 **BLOCKED**：P1 / P2 取证器均 `baseline_touched=0`，19/19 AC 仍 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`。T-042 已把 `ci.yml` 升级为九 job 完整版并接入静态扫描，但 **CI 绿不等于 AC 转绿**：`acceptance` 仍以 19/19 全红基线为通过条件，p1-gate / p2-gate 仍 `BLOCKED` / exit 2 且不接入 required jobs；出口裁决归 T-022 四选一与 T-046。
- 已登记待人工裁决：`T-022` 四选一、`ISSUE-20261109-T030-GATE` 的 D 解释、`ISSUE-20261112-T037-GATE`、AC-15 快照位张力、T-014 缓存路径与交节下载张力，以及 T-040 / T-041 / T-042 之间三处任务表重复点名。
- 建议 / 可选文件（`FUNDING.yml` / `GOVERNANCE.md` / `CITATION.cff` / `dependabot.yml` / `release.yml` / `CONTRIBUTORS.md` / `AUTHORS.md`）在 `CONTRIBUTING.md §5` 登记，v1 不产出；包管理器发布配置按 FR-052 禁止出现。

---

本文件由 AI 生成，**待人工审查（P-10）**；Phase 3 条目（T-041 / T-042）已于 2026-11-13 补录，仍保持「尚未发布」口径，不得把 `[Unreleased]` 改写成已发布版本。后续 T-043～T-046 条目按同口径追加。
