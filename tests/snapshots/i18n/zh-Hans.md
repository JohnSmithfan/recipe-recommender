# 日计划 `2026-11-12`

> 本计划仅为演示参考，不构成医疗或营养建议
> 表中数值为估算值，实际以称量与标签为准
> [AIGC] 本内容由人工智能辅助生成

<!-- rr-render v=1 lang=zh-Hans level=day period=2026-11-12 -->

## 头部元数据

| 项目 | 数值 |
| --- | --- |
| 层级 | `day` |
| 周期标识 | `2026-11-12` |
| 文件名 | `2026-11-12.md` |
| 生成日期 | d:2026-11-11 |
| 生成时刻 | `2026-11-11T20:00:00+08:00` |
| 运行日期 | d:2026-11-11 |
| 触发方式 | `plan.trigger.period_first_day` |
| 语言标签 | `xx` |
| 区域来源 | `user` |
| 指南标识 | `generic-guideline` |

## 数据版本

| 项目 | 数值 |
| --- | --- |
| 身体数据版本 | `fixture-body-v1` |
| 处方版本 | `fixture-rx-v1` |
| 区域策略版本 | `fixture-loc-v1` |
| 节气数据版本 | `fixture-st-v1` |
| 规则版本 | `fixture-rule-v1` |

## 上承下接

| 层级 | 周期标识 | 文件名 | 键 |
| --- | --- | --- | --- |
| `null` | `null` | `null` | 无 |

## 营养处方

| 项目 | 下限 | 上限 | 单位 |
| --- | --- | --- | --- |
| 能量 | n:100:render.unit.kcal | n:200:render.unit.kcal | 千卡 |
| 蛋白质 | n:101:render.unit.g | n:201:render.unit.g | 克 |
| 脂肪 | n:102:render.unit.g | n:202:render.unit.g | 克 |
| 碳水化合物 | n:103:render.unit.g | n:203:render.unit.g | 克 |
| 膳食纤维 | n:104:render.unit.g | n:204:render.unit.g | 克 |
| 饮水 | n:105:render.unit.ml | n:205:render.unit.ml | 毫升 |
| 食盐 | n:106:render.unit.g | n:206:render.unit.g | 克 |
| 食用油 | n:107:render.unit.g | n:207:render.unit.g | 克 |
| 添加糖 | n:108:render.unit.g | n:208:render.unit.g | 克 |

## 硬护栏

| 项目 | 数值 | 单位 |
| --- | --- | --- |
| 能量下限 | `1200` | 千卡 |
| 蛋白下限 | `60` | 克 |

## 时令与历法

| 项目 | 数值 |
| --- | --- |
| 历法状态 | `fallback` |
| 缓存标识 | `calendar-fixture-placeholder` |
| 当前节气 | `null` |
| 执行窗口 | `1` |

## 每日安排

| 计划日期 | 文件名 | 层级 |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## 声明与标注

| 项目 | 状态 |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## 每日安排

| 计划日期 | 文件名 | 数值 |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## 规范数据区

```rr-data
calendar.active_term_id=null
calendar.cache_id=calendar-fixture-placeholder
calendar.status=fallback
calendar.term_count=0
calendar.year=2026
days.count=1
execution_window.end_date=2026-11-12
execution_window.executed_days=0
execution_window.remaining_days=1
execution_window.start_date=2026-11-12
execution_window.total_days=1
file_name=2026-11-12.md
generated_at=2026-11-11T20:00:00+08:00
generated_date=2026-11-11
guardrail.energy_floor_kcal=1200
guardrail.protein_floor_g=60
guideline_id=generic-guideline
language_tag=xx
level=day
locale_source=user
notices.count=3
period_id=2026-11-12
recalc.needs_recalc=false
run_date=2026-11-11
rx.added_sugar_g.max=208
rx.added_sugar_g.min=108
rx.carb_g.max=203
rx.carb_g.min=103
rx.energy_kcal.max=200
rx.energy_kcal.min=100
rx.fat_g.max=202
rx.fat_g.min=102
rx.fiber_g.max=204
rx.fiber_g.min=104
rx.oil_g.max=207
rx.oil_g.min=107
rx.protein_g.max=201
rx.protein_g.min=101
rx.salt_g.max=206
rx.salt_g.min=106
rx.water_ml.max=205
rx.water_ml.min=105
sections.count=1
trigger=plan.trigger.period_first_day
version.body=fixture-body-v1
version.loc=fixture-loc-v1
version.rule=fixture-rule-v1
version.rx=fixture-rx-v1
version.st=fixture-st-v1
```
