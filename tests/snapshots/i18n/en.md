# Daily plan `2026-11-12`

> This plan is a demo reference and is not medical or nutritional advice
> Values in the tables are estimates; weigh portions and read labels for actual values
> [AIGC] Generated with AI assistance

<!-- rr-render v=1 lang=en level=day period=2026-11-12 -->

## Header metadata

| Field | Value |
| --- | --- |
| Level | `day` |
| Period ID | `2026-11-12` |
| File name | `2026-11-12.md` |
| Generated date | d:2026-11-11 |
| Generated at | `2026-11-11T20:00:00+08:00` |
| Run date | d:2026-11-11 |
| Trigger | `plan.trigger.period_first_day` |
| Language tag | `xx` |
| Locale source | `user` |
| Guideline ID | `generic-guideline` |

## Data versions

| Field | Value |
| --- | --- |
| Body data version | `fixture-body-v1` |
| Prescription version | `fixture-rx-v1` |
| Locale policy version | `fixture-loc-v1` |
| Solar term data version | `fixture-st-v1` |
| Rule version | `fixture-rule-v1` |

## Parent and child links

| Level | Period ID | File name | Key |
| --- | --- | --- | --- |
| `null` | `null` | `null` | None |

## Nutrition prescription

| Field | Minimum | Maximum | Unit |
| --- | --- | --- | --- |
| Energy | n:100:render.unit.kcal | n:200:render.unit.kcal | kcal |
| Protein | n:101:render.unit.g | n:201:render.unit.g | g |
| Fat | n:102:render.unit.g | n:202:render.unit.g | g |
| Carbohydrate | n:103:render.unit.g | n:203:render.unit.g | g |
| Dietary fiber | n:104:render.unit.g | n:204:render.unit.g | g |
| Water | n:105:render.unit.ml | n:205:render.unit.ml | ml |
| Salt | n:106:render.unit.g | n:206:render.unit.g | g |
| Cooking oil | n:107:render.unit.g | n:207:render.unit.g | g |
| Added sugar | n:108:render.unit.g | n:208:render.unit.g | g |

## Hard guardrails

| Field | Value | Unit |
| --- | --- | --- |
| Energy floor | `1200` | kcal |
| Protein floor | `60` | g |

## Season and calendar

| Field | Value |
| --- | --- |
| Calendar status | `fallback` |
| Cache ID | `calendar-fixture-placeholder` |
| Active solar term | `null` |
| Execution window | `1` |

## Daily schedule

| Plan date | File name | Level |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Notices and markers

| Field | State |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Daily schedule

| Plan date | File name | Value |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Canonical data block

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
