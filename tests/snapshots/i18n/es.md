# Plan diario `2026-11-12`

> Este plan es una referencia de demostración y no constituye consejo médico ni nutricional
> Los valores de las tablas son estimaciones; pese las porciones y lea las etiquetas
> [AIGC] Generado con asistencia de IA

<!-- rr-render v=1 lang=es level=day period=2026-11-12 -->

## Metadatos de cabecera

| Campo | Valor |
| --- | --- |
| Nivel | `day` |
| ID de periodo | `2026-11-12` |
| Nombre de archivo | `2026-11-12.md` |
| Fecha de generación | d:2026-11-11 |
| Generado en | `2026-11-11T20:00:00+08:00` |
| Fecha de ejecución | d:2026-11-11 |
| Disparador | `plan.trigger.period_first_day` |
| Etiqueta de idioma | `xx` |
| Origen regional | `user` |
| ID de guía | `generic-guideline` |

## Versiones de datos

| Campo | Valor |
| --- | --- |
| Versión de datos corporales | `fixture-body-v1` |
| Versión de prescripción | `fixture-rx-v1` |
| Versión de política regional | `fixture-loc-v1` |
| Versión de términos solares | `fixture-st-v1` |
| Versión de reglas | `fixture-rule-v1` |

## Enlaces padre e hijo

| Nivel | ID de periodo | Nombre de archivo | Clave |
| --- | --- | --- | --- |
| `null` | `null` | `null` | Ninguno |

## Prescripción nutricional

| Campo | Mínimo | Máximo | Unidad |
| --- | --- | --- | --- |
| Energía | n:100:render.unit.kcal | n:200:render.unit.kcal | kcal (kilocaloría) |
| Proteína | n:101:render.unit.g | n:201:render.unit.g | g (gramo) |
| Grasa | n:102:render.unit.g | n:202:render.unit.g | g (gramo) |
| Carbohidratos | n:103:render.unit.g | n:203:render.unit.g | g (gramo) |
| Fibra dietética | n:104:render.unit.g | n:204:render.unit.g | g (gramo) |
| Agua | n:105:render.unit.ml | n:205:render.unit.ml | ml (mililitro) |
| Sal | n:106:render.unit.g | n:206:render.unit.g | g (gramo) |
| Aceite de cocina | n:107:render.unit.g | n:207:render.unit.g | g (gramo) |
| Azúcar añadido | n:108:render.unit.g | n:208:render.unit.g | g (gramo) |

## Límites estrictos

| Campo | Valor | Unidad |
| --- | --- | --- |
| Mínimo energético | `1200` | kcal (kilocaloría) |
| Mínimo de proteína | `60` | g (gramo) |

## Temporada y calendario

| Campo | Valor |
| --- | --- |
| Estado del calendario | `fallback` |
| ID de caché | `calendar-fixture-placeholder` |
| Término solar activo | `null` |
| Ventana de ejecución | `1` |

## Plan diario

| Fecha del plan | Nombre de archivo | Nivel |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Avisos y marcadores

| Campo | Estado |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Plan diario

| Fecha del plan | Nombre de archivo | Valor |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Bloque de datos canónicos

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
