# THIRD_PARTY_NOTICES.md · 第三方许可与来源声明

> [AIGC] 本文件由 AI 依据 `SPEC.md FR-031 / FR-032 / FR-037 / AC-13 / AC-18`、`constitution.md P-07`、`plan.md §4 / §9` 生成 · 审计追踪 ID：`RR-T041-20261113-0001` · **待人工审查（P-10）**
> 许可：本仓库采用 **GPL-3.0-only**；本文件随源码一同分发。
> 免责声明：本项目**不构成医疗或营养建议**，所有营养数值为估算值（非医疗处方，P-08 / FR-033）。
> 本文本为 AI 候选稿，**不是法律意见**；许可判定与来源 URL 须由人工逐项核对后方可作为审计依据（P-07 / P-10）。

---

## 1. 本项目许可与分发

| 项 | 声明 |
|---|---|
| 项目许可 | **GPL-3.0-only**（SPDX: `GPL-3.0-only`），见 `package.json` |
| 许可文本 | `LICENSE` 为 GNU GPL v3 **全文**（Version 3, 29 June 2007），随 **clone** / 源码归档分发；`LICENSE` 不能依赖 GitHub 默认文件机制，必须逐仓库添加（`SPEC.md §10`） |
| 源码头 | 每个 `.js` / `.mjs` 源文件首行为 `// SPDX-License-Identifier: GPL-3.0-only`，由 `npm run lint` 强制 |
| Corresponding Source | 主实现为人类可读、可修改的 ECMAScript / ISO/IEC 22275:2018 源码；每个 Release 产物须附对应源码（P-16 / AC-19，门禁归 T-043） |

**运行时依赖：零第三方**（`package.json` 无 `dependencies` / `devDependencies`，`"private": true`）。仅使用 Node.js（≥20）内置 `node:*` 模块；Node.js 本体及其许可不在本仓库分发物内，用户按自身环境自行安装。本仓库**不得出现**任何**包管理器清单**（`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `npm-shrinkwrap.json`）或 `publishConfig` / `files` / `bin` 等发布字段（FR-052）。

## 2. 规格点名的标准与规范引用

以下为公开标准 / 规范标识符的**引用**，用于说明格式与合规目标，**不构成需声明许可的第三方代码或数据本体**，也未复制任何标准全文：`ECMAScript / ISO/IEC 22275:2018`、`GB 18030-2022`（中文编码实现级别 1）、`BCP 47`（语言标签）、`ISO 3166-1`（国家 / 地区码）、`ISO 8601`（日期）、`Keep a Changelog` / `SemVer`（文档格式）。地区码按国家主权与领土完整立场处理：中国香港、中国澳门、中国台湾为中国的一部分，作为地区级条目，**不得列为独立国家**。

## 3. 数据源逐项清单（唯一权威：`data/source/catalog.json`）

> **本仓库零真实第三方数据本体。** 下表 5 条是 T-035 `data/source/` **元数据目录**中的 descriptor：`license` / `version` / `source_url` 均为**声明值**，不是已引入的内容。除最后一条完全虚构的演示源外，其余四条 `bundled=false`、`payload_path=null`，加载器**一律拒绝**（`ERR_SOURCE_REVIEW`；即便改为 `approved` 仍因未内置报 `ERR_SOURCE_BUNDLED`）。`coverage = metadata-only`、`review_status` 见各行。

| # | `id` | `kind` | `license` | `version` | `source_url` | `review_status` | `bundled` / `payload_path` | 使用边界 |
|---|---|---|---|---|---|---|---|---|
| 1 | `howtocook-recipes` | `recipe` | `Unlicense` | `unverified` | `https://github.com/Anduin2017/HowToCook` | `ai-candidate-unreviewed` | `bundled=false` / `null` | **AC-18 点名项**：仅声明菜谱来源与许可期望；**未内置**，不得据本表推定已引入任何菜谱原文 |
| 2 | `usda-fdc-nutrition` | `nutrition` | `CC0-1.0` | `unverified` | `https://fdc.nal.usda.gov` | `ai-candidate-unreviewed` | `bundled=false` / `null` | **AC-18 点名项（USDA FDC / CC0）**：仅声明营养数据来源与许可期望；**未内置**，不得据本表推定已引入任何成分表 |
| 3 | `cn-ingredient-subset` | `nutrition` | `CC0-1.0` | `unverified` | `https://example.invalid/cn-ingredient-subset` | `ai-candidate-unreviewed` | `bundled=false` / `null` | 人工校验的中国食材子集；无真实下载端点，须由具备资质人员审校并记录依据 |
| 4 | `user-defined` | `recipe` | `user-owned` | `unverified` | `https://example.invalid/user-defined` | `ai-candidate-unreviewed` | `bundled=false` / `null` | **AC-18 点名项**：用户自建数据，权利归用户；本项目不内置、不上传、不主张任何权利，边界见 `PRIVACY.md §3/§4` |
| 5 | `synthetic-demo` | `recipe` | `synthetic-neutral-example` | `1.0.0` | `https://example.invalid/synthetic-demo` | `approved` | `bundled=true` / `data/source/synthetic-demo.json` | **唯一可加载**条目：3 条**完全虚构**记录，`fictional: true`，名称与营养数值全部自撰中立值，不含任何真实第三方数据 |

**URL 口径**：`https://github.com/Anduin2017/HowToCook` 与 `https://fdc.nal.usda.gov` 是公开项目 / 站点地址，仅作许可与来源**声明**，**不代表已完成许可审计、不代表已锁定上游版本、运行期绝不访问**。`https://example.invalid/...` 为 RFC 2606 保留域，明确表示无真实下载端点。全部 URL 为纯 HTTPS、无 query / fragment / userinfo / 端口。

**许可期望表**（`data/source/schema.json` → `license_expectations`）固定 `howtocook-recipes → Unlicense`、`usda-fdc-nutrition → CC0-1.0`、`cn-ingredient-subset → CC0-1.0`；descriptor 与期望不一致即 `ERR_SOURCE_CONFLICT`（「README 与包元数据不一致」的可执行近似）。**许可冲突即拒，拒绝引入**任何存疑数据源（FR-032 / FR-037 / P-07）。

## 4. 本仓库自撰 / 生成内容（非第三方许可内容）

| 内容 | 性质 | 边界 |
|---|---|---|
| 指南系数（`data/guideline/`） | 自撰中立数值，非真实指南原文 | **不得复制受版权保护的指南 / 成分表原文或图表**（FR-032 / FR-037） |
| `CODE_OF_CONDUCT.md` | 自撰中立行为准则 | 参考分节思路，**未复制** Contributor Covenant 或任何受版权保护准则原文 |
| 语言包 `locales/` 候选译文 | AI 生成候选，71 键 × 7 语言 | 497 条译文**待人工审校**；`en` 为完整基准；运行期不调用翻译服务 / LLM（FR-041 补注） |
| 区域映射 `data/region/` | 最小示例集 | `ai-candidate-unreviewed`，不是真实指南适用性判定；扩展须人工审校 |
| 示例档案 `examples/profiles/` | 完全虚构合成数据 | 男女各一份，标注「完全虚构 / 非真实个人 / 非统计引用」 |
| 本文件与其余社区 / 合规文档 | `[AIGC]` 候选文本 | **待人工审查（P-10）**，审查通过前不代表维护者已正式采纳 |

## 5. v1 分发口径与审计状态

- v1 发布物**仅源码归档与校验和**（GitHub Releases 源码归档 + Git 源码），加上 `LICENSE` 全文、本文件与 `PRIVACY.md` / `SECURITY.md`；**不含包管理器清单或发布流水线**（FR-052 / AC-18）。
- **`CHANGELOG.md` 保持 `[Unreleased]` / `0.1.0-dev`「尚未发布」口径**；不得改写为已发布版本。
- **诚实边界（防假绿）**：本文件是**元数据声明清单**，**不代表许可审计已闭合、不代表任何外部源已审校或已内置、不代表 `AC-13 / AC-18` 转绿**。逐项核对上游实际许可文本与包元数据、版本号、来源 URL，以及中国食材子集的专业审校，均**未完成**；`AC-13 / AC-18` **仍 RED**。
- **后续归属**：CI 许可静态扫描、网络出口扫描、Issue form 完整 YAML 语法校验与 Phase 3 CHANGELOG 补录归 **T-042**；§10「必需」文件 100% 与 AC-13 / AC-18 / AC-19 转绿归 **T-046**；实现语言与归档审计归 **T-043 / T-044**。本任务不提前接线、不伪造 CI 已绿。

---

本文件由 AI 生成，**待人工审查（P-10）**；审查通过前仅作为候选许可声明，不构成法律意见，也不代表已完成第三方许可审计。
