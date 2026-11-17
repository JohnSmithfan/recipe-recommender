# Consilium diurnum (day plan) `2026-11-12`

> Hoc consilium exempli gratia est, non praeceptum medicum (disclaimer / demo only)
> Numeri in tabulis aestimati sunt (estimated / approximatum); pondera portiones
> [AIGC] Ab intelligentia artificiali adiutum (AI / AIGC)

<!-- rr-render v=1 lang=la level=day period=2026-11-12 -->

## Metadatarum capitis (metadata)

| Campus (field) | Valor (value) |
| --- | --- |
| Gradus (level) | `day` |
| Index periodi (period_id) | `2026-11-12` |
| Nomen fasciculi (file_name) | `2026-11-12.md` |
| Dies generationis (generated_date) | d:2026-11-11 |
| Tempus generationis (generated_at) | `2026-11-11T20:00:00+08:00` |
| Dies executionis (run_date) | d:2026-11-11 |
| Impulsus (trigger) | `plan.trigger.period_first_day` |
| Nota linguae (language_tag, BCP 47) | `xx` |
| Fons locale (locale_source) | `user` |
| Index normae (guideline_id) | `generic-guideline` |

## Versiones datorum (versions)

| Campus (field) | Valor (value) |
| --- | --- |
| Versio datorum corporis (body) | `fixture-body-v1` |
| Versio praescripti (rx) | `fixture-rx-v1` |
| Versio normae loci (loc) | `fixture-loc-v1` |
| Versio terminorum solarium (st) | `fixture-st-v1` |
| Versio regularum (rule) | `fixture-rule-v1` |

## Nexus parentis et filiorum (links)

| Gradus (level) | Index periodi (period_id) | Nomen fasciculi (file_name) | Clavis (key) |
| --- | --- | --- | --- |
| `null` | `null` | `null` | Nullus (none) |

## Praescriptum nutritionis (prescription)

| Campus (field) | Minimum (min) | Maximum (max) | Unitas (unit) |
| --- | --- | --- | --- |
| Vis energetica (energy_kcal, kcal) | n:100:render.unit.kcal | n:200:render.unit.kcal | kcal (caloria maior) |
| Proteinum (protein_g) | n:101:render.unit.g | n:201:render.unit.g | g (gramma) |
| Adeps (fat_g) | n:102:render.unit.g | n:202:render.unit.g | g (gramma) |
| Carbohydrata (carb_g) | n:103:render.unit.g | n:203:render.unit.g | g (gramma) |
| Fibra alimentaria (fiber_g) | n:104:render.unit.g | n:204:render.unit.g | g (gramma) |
| Aqua (water_ml) | n:105:render.unit.ml | n:205:render.unit.ml | ml (millilitrum) |
| Sal (salt_g) | n:106:render.unit.g | n:206:render.unit.g | g (gramma) |
| Oleum coquinarium (oil_g) | n:107:render.unit.g | n:207:render.unit.g | g (gramma) |
| Saccharum additum (added_sugar_g) | n:108:render.unit.g | n:208:render.unit.g | g (gramma) |

## Saepimenta severa (guardrails)

| Campus (field) | Valor (value) | Unitas (unit) |
| --- | --- | --- |
| Limes energiae inferior (energy_floor_kcal) | `1200` | kcal (caloria maior) |
| Limes proteinorum inferior (protein_floor_g) | `60` | g (gramma) |

## Tempestas et calendarium (calendar)

| Campus (field) | Valor (value) |
| --- | --- |
| Status calendarii (calendar_status) | `fallback` |
| Index cellae (cache_id) | `calendar-fixture-placeholder` |
| Terminus solaris praesens (active_term_id) | `null` |
| Fenest executionis (execution_window) | `1` |

## Ordo diurnus (days)

| Dies consilii (plan_date) | Nomen fasciculi (file_name) | Gradus (level) |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Notae et signa (notices)

| Campus (field) | Status (state) |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Ordo diurnus (days)

| Dies consilii (plan_date) | Nomen fasciculi (file_name) | Valor (value) |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Campus datorum canonicorum (rr-data / canonical_data)

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
