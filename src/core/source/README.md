# `src/core/source/` · 可插拔数据源端口（T-035）

> [AIGC] 审计追踪 ID：`RR-T035-20261111-0001` · 待人工审查（P-10）

**依据**：`tasks.md` T-035；`SPEC.md` FR-031 / FR-032 / FR-037、AC-13 / AC-18、SC-010、NFR-008、E-15；
`plan.md §4 / §9 / R-04`；`constitution.md` P-14。

**范围**：数据源**元数据契约 + 只读加载端口**。不下载数据、不内置真实第三方数据本体、
不写盘、不联网、不 `import node:*`。数据落在 `data/source/`，只经**注入的 `FsPort`** 读取。

## 文件职责

| 路径 | 职责 |
|------|------|
| `contract.js` | `SOURCE_ERROR` 12 码、`SourceError`、四类白名单 / 期望表、五个固定键集；`assertSourceSchema` / `assertSourceMetadata` / `assertSourceCatalog` / `assertSourcePayload` |
| `loader.js` | `loadSourceCatalog(fsPort)` / `loadDataSource(fsPort, id)` / `createDataSourcePort(fsPort)`；只读、冻结、幂等 |
| `index.js` | 统一出口 |
| `tests/unit/source.test.js` | 25 条红→绿单测 |

## 四层校验与拒绝顺序（失败关闭）

1. **形状**：catalog / schema / descriptor / payload / record 各自固定键集，多一键、少一键、类型错一律拒绝；
   `id` / `name_key` 等必须是 Canonical ID，`payload_path` 必须落在 `data/source/<slug>.json` 内（防路径穿越）。
2. **语义**：`kind` ∈ `{recipe, nutrition}`；`license` ∈ `{Unlicense, CC0-1.0, user-owned, synthetic-neutral-example}`；
   `version` 为稳定 ID；`source_url` 为纯 HTTPS 且无 query / fragment / userinfo / 端口；
   `license` 与 `LICENSE_EXPECTATIONS` 不一致即 `ERR_SOURCE_CONFLICT`。
3. **防假绿**：schema 的许可 / 种类 / 状态白名单、三类键集、六条策略与冻结常量逐字一致；
   catalog 的 `bundled_sources` / `external_candidates` 必须与 descriptor 实际状态一致；id 不得重复；
   payload 的 `id` / `kind` / `license` / `version` 必须与 catalog 条目一致（防止「批准 A、加载 B」）。
4. **策略**：`review_status !== 'approved'` → `ERR_SOURCE_REVIEW`；
   `bundled !== true` → `ERR_SOURCE_BUNDLED`；payload 缺失 / 畸形 / `fictional !== true` /
   悬空替换 ID / 私有字段 → `ERR_SOURCE_PAYLOAD`。**存疑或冲突一律拒绝加载**（FR-031）。

## 关键定案

1. **默认零内置**：四类外部 / 用户源全部 `ai-candidate-unreviewed` + `bundled = false`；
   唯一可加载的是 `synthetic-demo`（完全虚构、自撰中立数值）。加载成功只表示「示例元数据与 payload 形状合法」，
   **不代表任何真实数据源已通过许可审计**。
2. **许可声明不可放宽**：`LICENSE_EXPECTATIONS` 把规格点名的 `Unlicense` / `CC0-1.0` 固定为期望值；
   把 HowToCook 标成 CC0 或反向篡改都会冲突拒绝。AI 不得自行改 `approved` 状态或 `bundled` 清单。
3. **完全虚构**：payload `fictional: true`；记录只含 Canonical ID 与自撰中立数值；
   拒绝任何私有字段 token（`weight_kg` / `diet-plan` 等），不照搬任何真实处方或指南数值（FR-032 / FR-053）。
4. **零兜底定案不变**：`createDataSourcePort(fsPort)` 只产出可注入端口，
   `rr plan` 默认 deps 不含该端口，`src/cli/` 与 `src/mcp/` 实现代码一行未动。
   `COMMANDS` / `P2_COMMANDS` / `OVERRIDE_KEYS` 全部保持。
5. **目录约定**：`plan.md §4` 目录树未列 `data/source/`，属实现层细化；不改任何 P0 基线文件。

## 边界

- **AC-13 / AC-18 仍 RED**：`THIRD_PARTY_NOTICES.md` 与社区规范文件归 T-040 / T-041，
  CI 许可扫描门禁接线归 T-042；本任务不改 `ac-*.md`、不勾 `tasks.md`、不改写 P1 verdict。
- 不含任何真实 HowToCook / USDA FDC 数据，不联网下载，不解析上游格式；
  真实接入须按 `data/source/README.md §3` 由人工完成审校。
- T-022 四选一裁决与 `ISSUE-20261109-T030-GATE` 的 D 解释仍待人工书面复核；
  `unit_system` / `units` 接线缺口、「未匹配，已回退」语言包键缺口均未决。
