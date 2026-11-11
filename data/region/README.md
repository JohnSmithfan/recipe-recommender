# data/region/ · 区域映射表（T-033）

> [AIGC] 审计追踪 ID：`RR-T033-20261110-0001` · 待人工审查（P-10）
> 依据：`tasks.md` T-033；`SPEC.md` FR-003 / FR-014 / FR-045、AC-16、E-14、SC-012、§6.3 注、§6.9 地区表述合规；`plan.md §4 / §8`。

## 1. 范围与审校状态

本目录是**最小示例集**，只登记规格明确点名的中国（`CN`）与美国（`US`），
以及必须作为地区级选项处理的中国香港（`HK`）/ 中国澳门（`MO`）/ 中国台湾（`TW`）。
**其它 ISO 3166-1 地区码一律未登记 → 回退中立通用基线**（E-14 / AC-16 场景 3），
不声称覆盖全球，也不伪造未核实区域的指南适用性。

| 项 | 状态 |
|----|------|
| `mappings.json` | 纯 `ISO alpha-2 → 策略` 键值，形状由 T-032 `assertRegionMappings()` 校验 |
| `schema.json` | 元数据（版本 / 来源 / 基线 / 历法契约 / 地区级码清单 / 已登记码） |
| 译文与参数 | **AI 候选稿，待人工审校**（`review_status=ai-candidate-unreviewed`） |
| 指南适配器 | `data/guideline/region-{cn,us}-example.json`，`source=synthetic-neutral-example` |

> ⚠️ **这不是任何真实膳食指南的实现。** 两个区域适配器沿用 T-011「系数自撰中立」定案，
> 参数与任何真实权威指南的量化指标无关，仅在膳食纤维 / 饮水系数上体现 FR-014 的
> 「按居住地调整取向」结构性示例；`SPEC.md` FR-003 明确 **MUST NOT** 复制指南原文或图表。
> 区域 → 指南的对应关系是**结构性示例**，须由贡献者按当地权威资料审校后替换，
> 才能作为正式发布内容（口径同 T-031 的 497 条候选译文）。

## 2. 地区表述合规（SPEC §6.9 / E-14）

中国香港、中国澳门、中国台湾是**中国的一部分**，按 ISO 3166-1 作为**地区级选项**处理，
绝不列为独立国家：

- 三条映射的 `region_level` 均为 `subnational`，并复用与 `CN` 相同的指南 / 历法 / 单位 / 语言；
- T-032 `resolveLocalePolicy` 对这三条码作为**声明国籍**时不做国家解析，
  显式回退并标注 `locale.fallback.subnational`；作为**声明居住地**时允许命中；
- 复用 T-010 的 `isIso3166Alpha2()` 249 项只读常量，不另建地区表。

## 3. 中立通用基线（FR-045 / AC-16 场景 3）

`schema.json` 的 `baseline` 与 T-032 的 `NEUTRAL_BASELINE` 逐字一致：
`{ language_tag: en, guideline_id: generic-guideline, calendar_id: gregorian-season, unit_system: metric }`。
基线**不是**区域条目，因此 `mappings.json` 中不存在「通用基线码」；
未匹配时由 T-032 回退并输出 `locale.fallback.unmatched`，加载器会复验基线声明未漂移。

## 4. 历法同等约束（SPEC §6.3 注 / plan.md §8 步骤 4）

`calendar_contract` 声明 `solar-terms` 与 `gregorian-season` **同等**遵守：
年计划时刷新并落盘、下层只读缓存、失败标注 `FALLBACK / 未校验`、
禁止内置或静默套用近似日期、≥2 个独立来源。该声明与 T-014 的
`CALENDAR_KIND` / `FALLBACK_LABEL` / `validateCalendarAdapter` 常量对齐，
并由 `tests/unit/region.test.js` 真实调用 `refreshCalendarData()` 取证：
两种历法走同一流程，通用季节历成功时 `verified`、离线时 `FALLBACK`，**不豁免**。

本目录**不含任何时令日期、精确时刻、黄经或近似数值**（FR-012）；
缓存由 T-014 经注入端口按年刷新，路径可注入，仓库内不预置缓存文件。

## 5. 接线与边界

- `src/core/guideline/region.js` 的 `loadRegionMappings(fsPort)` 是唯一加载入口，
  经注入 FsPort 读这两个 JSON 并逐项校验；`createLocalePolicyResolverFromFs(fsPort)`
  把映射表注入 T-032 的 `createLocalePolicyResolver()`，得到可直接放进
  `deps.resolveLocalePolicy` 的端口。
- **零兜底定案不变**：`rr plan` 默认 `deps` 仍缺该端口，缺端口即 `ERR_CLI_PORT`；
  T-033 不自动装配、不改 `src/cli/` 与 `src/mcp/` 实现代码。
- `unit_system` 目前只参与策略解析，尚未接到 T-018 / T-019 的格式化器（FR-043 接线缺口）。
- **AC-16 仍 RED**：场景 1 还要求联网下载精确时刻，属 T-014 net 端口与 T-042 CI 接线；
  本目录只提供策略层与数据结构取证，不代表端到端验收通过。
- 不改任何 P0 基线、`ac-*.md` 状态、`tasks.md` 勾选项，不改 P1 门禁 `verdict=BLOCKED`。
