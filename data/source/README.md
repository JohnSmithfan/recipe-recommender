# `data/source/` · 数据源元数据目录（T-035）

> [AIGC] 审计追踪 ID：`RR-T035-20261111-0001` · 待人工审查（P-10）
> 依据：`tasks.md` T-035；`SPEC.md` FR-031 / FR-032 / FR-037 / FR-047 / FR-053、AC-13 / AC-18、E-15、SC-010、NFR-008；`plan.md §4 / §9 / R-04`；`constitution.md` P-14。

## 1. 这是元数据目录，不是数据库

**本目录不内置任何真实第三方数据本体。** 三份 JSON 只描述「有哪些候选数据源、各自声明什么许可 / 版本 / 来源、是否允许加载」，
以及一份**完全虚构**的结构示例。按 `plan.md R-04` 与 `SPEC.md §10` 的合规硬约束：

> 存疑数据一律不内置，降级为用户自建适配器；受版权保护的指南 / 成分表原文不得复制进仓库。

因此 `HowToCook(Unlicense)` / `USDA FDC(CC0)` / 「人工校验的中国食材子集」/ 「用户自建」四类**都只是元数据声明**，
`review_status = ai-candidate-unreviewed`、`bundled = false`、`payload_path = null`，
加载器对它们**一律拒绝**（`ERR_SOURCE_REVIEW`；即便改写成 `approved`，仍因未内置报 `ERR_SOURCE_BUNDLED`）。

| 文件 | 内容 |
|------|------|
| `catalog.json` | 5 条 descriptor，固定 9 键；每条都有 `license` / `version` / `source_url` / `review_status` / `bundled` / `payload_path`（FR-031） |
| `schema.json` | 固定 16 键：许可 / 种类 / 审校状态白名单、许可期望表、三类键集、六条拒绝策略、已内置与外部候选清单、`coverage = metadata-only` |
| `synthetic-demo.json` | **唯一可加载**的示例，3 条完全虚构记录；`fictional: true`、`license = synthetic-neutral-example`、数值全为自撰中立值 |

## 2. 声明的性质与边界

- **`version = "unverified"`**：四个外部 / 用户条目的版本号**未经核实**，是占位声明，不代表已锁定任何上游版本。
- **`source_url`**：HowToCook 与 USDA FDC 填的是其公开项目 / 站点地址，仅作许可与来源**声明**，
  **不代表已完成许可审计，也不代表运行期会访问**。另两条用 `https://example.invalid/...`——
  RFC 2606 保留域，明确表示「无真实下载端点」。所有 URL 必须是纯 HTTPS、无 query / fragment / userinfo / 端口。
- **许可期望表**（`license_expectations`）把规格点名的 `Unlicense` / `CC0-1.0` 固定为期望值；
  descriptor 与期望不一致即 `ERR_SOURCE_CONFLICT`，这是「README 与包元数据不一致」的可执行近似。
- **零真实数据**：不复制任何受版权保护指南原文或成分表（FR-032）；不含任何真实个人身体数据、
  计划、台账或 `diet-plan` 副本（FR-047 / FR-053 / P-14）；示例记录的名称与营养数值全部自撰虚构。
- **零网络、零写入**：加载只经注入的 `FsPort.readJson`，本目录不含任何下载脚本或缓存。

## 3. 接入真实数据源的前提（不在本任务范围）

1. 由贡献者逐项核对 HowToCook / USDA FDC 的**实际许可文本与包元数据**、版本号、来源 URL；
2. 「人工校验中国食材子集」须由具备资质的人员审校，并记录审校者与依据；
3. 在 `THIRD_PARTY_NOTICES.md` 中列明边界（归 T-040 / T-041），通过 CI 许可扫描门禁（归 T-042）；
4. 审校通过后才能由人工把 `review_status` 改为 `approved`、提供 `bundled = true` 的 payload 并更新 `schema.json` 的清单。
   **AI 不得自行把任何外部源标记为已审校或已内置。**

## 4. 状态

`review_status = ai-candidate-unreviewed`、`coverage = metadata-only`。
**AC-13 / AC-18 仍为 RED**：本任务只提供数据源端口与元数据的可执行取证，
不代表许可审计完成、不代表 `THIRD_PARTY_NOTICES.md` 齐备、不代表 M4 验收通过。
`plan.md §4` 的目录树未列 `data/source/`，属实现层细化，**P0 基线一字未改**。
