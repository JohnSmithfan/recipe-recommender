# `src/core/guideline/` · 指南适配器与区域映射（T-011 / T-033）

> [AIGC] 审计追踪 ID：`RR-T033-20261110-0001` · 待人工审查（P-10）
> 依据：`tasks.md` T-011 / T-033；`SPEC.md` FR-003 / FR-014 / FR-032 / FR-045、AC-16、E-09 / E-14、SC-012；`plan.md §4 / §6.1 / §8`。

## 1. 文件职责

| 路径 | 职责 | 任务 |
|------|------|------|
| `contract.js` | `GUIDELINE_KEYS` 8 键固定白名单、`validateGuidelineAdapter()`、6 个 `RX_ERROR` 稳定码 | T-011 |
| `loader.js` | `loadGuidelineAdapter(fsPort, id)`，只经注入 FsPort 读 `data/guideline/<id>.json` | T-011 |
| `region.js` | 区域映射表加载与语义校验（本任务新增） | T-033 |
| `index.js` | 统一出口 | T-011 / T-033 |
| `data/guideline/*.json` | 适配器数据：中立基线 1 份 + 区域示例 2 份 | T-011 / T-033 |
| `data/region/` | 区域映射表 + 元数据 + 定案说明 | T-033 |

## 2. 为什么「区域映射」放在这一层

`tasks.md` T-033 的产出写明 `data/region/` **与** `src/core/guideline/` 映射，
`plan.md §4` 把本目录登记为「指南适配器（可插拔，FR-003）」。
T-032 的 `resolveLocalePolicy` 只负责**优先级与来源**，绝不内置映射；
T-033 负责**映射数据与其加载校验**，两者用 `regionMappings` 注入口衔接，
不新增架构层、不把 IO 塞进纯函数（沿用 T-011 `loader.js` 的注入 FsPort 先例）。

## 3. `region.js` 的四层校验

1. **形状**：复用 T-032 `assertRegionMappings()` —— ISO 3166-1 alpha-2、四必填键、
   可选 `region_level`，地区级码 MUST 带 `subnational`。
2. **语义**：`guideline_id` 指向的适配器 MUST 存在且通过 T-011
   `validateGuidelineAdapter()`；`calendar_id` MUST 属于 T-014 `CALENDAR_KIND`；
   `unit_system` ∈ `UNIT_SYSTEMS`；`language_tag` ∈ T-031 `BUILTIN_TAGS`。
3. **基线与历法契约**：`schema.baseline` MUST 与 T-032 `NEUTRAL_BASELINE` 逐字一致；
   `calendar_contract` MUST 声明 `solar-terms` / `gregorian-season` **同等**遵守
   年刷新 / 下层只读 / `FALLBACK / 未校验` / 禁内置近似值 / ≥2 独立来源。
   任一漂移即 `ERR_REGION_BASELINE`，防止「示例表被悄悄放宽」而无人察觉。
4. **地区表述**：中国香港 / 中国澳门 / 中国台湾是中国的地区级 ISO 3166-1 条目，
   不是独立国家；清单与 T-032 `SUBNATIONAL_REGION_CODES` 一致，否则
   `ERR_REGION_SUBNATIONAL`。

10 个 `REGION_ERROR` 稳定码与 `RegionError` 只回传稳定码 + Canonical ID，
不插值文件正文（FR-049）。加载过程**零写入、零网络、零内置模块导入**。

## 4. 与 T-032 / T-019 的接线

```
loadRegionMappings(fsPort)
  → createLocalePolicyResolverFromFs(fsPort)
  → deps.resolveLocalePolicy（宿主显式注入）
  → rr plan / rr validate
```

`rr plan` 默认 `deps` 仍缺该端口，缺端口即 `ERR_CLI_PORT`（T-019 **零兜底**定案不变）。
本任务**不改 `src/cli/` 与 `src/mcp/` 任何一行实现代码**，也不改命令集 / 覆盖键集。

## 5. 数据状态与边界（勿解读为已验收）

- `data/region/` 是**最小示例集**（`CN` / `US` + `HK` / `MO` / `TW`）；
  其它 ISO 码未登记即回退中立通用基线（E-14 / AC-16 场景 3）。
- 两个 `region-*-example` 适配器的系数是**自撰中立示例参数**，
  `source=synthetic-neutral-example`、`review_status=ai-candidate-unreviewed`，
  **不代表任何真实膳食指南的适用性或数值**，须人工审校后替换；
  FR-003 明确禁止复制指南原文或图表。
- `unit_system` 目前只在策略层登记，尚未接到 T-018 / T-019 的区域格式化（FR-043 接线缺口）。
- **AC-16 仍 RED**：场景 1 的联网下载精确时刻属 T-014 net 端口 + T-042 CI 接线；
  T-033 只提供策略与数据的可执行取证，不代表端到端验收通过。
- 不改 P0 基线 / `ac-*.md` / `tasks.md` 勾选项，不改 P1 门禁 `verdict=BLOCKED`。
