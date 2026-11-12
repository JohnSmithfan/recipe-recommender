# Дневной план `2026-11-12`

> Этот план носит демонстрационный характер и не является медицинской или диетологической рекомендацией
> Значения в таблицах оценочные; взвешивайте порции и читайте этикетки
> [AIGC] Создано с помощью ИИ

<!-- rr-render v=1 lang=ru level=day period=2026-11-12 -->

## Метаданные заголовка

| Поле | Значение |
| --- | --- |
| Уровень | `day` |
| Идентификатор периода | `2026-11-12` |
| Имя файла | `2026-11-12.md` |
| Дата создания | d:2026-11-11 |
| Создано в | `2026-11-11T20:00:00+08:00` |
| Дата запуска | d:2026-11-11 |
| Триггер | `plan.trigger.period_first_day` |
| Языковая метка | `xx` |
| Источник локали | `user` |
| Идентификатор руководства | `generic-guideline` |

## Версии данных

| Поле | Значение |
| --- | --- |
| Версия данных тела | `fixture-body-v1` |
| Версия предписания | `fixture-rx-v1` |
| Версия региональной политики | `fixture-loc-v1` |
| Версия данных о солнечных терминах | `fixture-st-v1` |
| Версия правил | `fixture-rule-v1` |

## Связи родитель потомок

| Уровень | Идентификатор периода | Имя файла | Ключ |
| --- | --- | --- | --- |
| `null` | `null` | `null` | Нет |

## Пищевое предписание

| Поле | Минимум | Максимум | Единица |
| --- | --- | --- | --- |
| Энергия | n:100:render.unit.kcal | n:200:render.unit.kcal | ккал |
| Белок | n:101:render.unit.g | n:201:render.unit.g | г |
| Жиры | n:102:render.unit.g | n:202:render.unit.g | г |
| Углеводы | n:103:render.unit.g | n:203:render.unit.g | г |
| Пищевые волокна | n:104:render.unit.g | n:204:render.unit.g | г |
| Вода | n:105:render.unit.ml | n:205:render.unit.ml | мл |
| Соль | n:106:render.unit.g | n:206:render.unit.g | г |
| Растительное масло | n:107:render.unit.g | n:207:render.unit.g | г |
| Добавленный сахар | n:108:render.unit.g | n:208:render.unit.g | г |

## Жёсткие ограничения

| Поле | Значение | Единица |
| --- | --- | --- |
| Нижний предел энергии | `1200` | ккал |
| Нижний предел белка | `60` | г |

## Сезон и календарь

| Поле | Значение |
| --- | --- |
| Состояние календаря | `fallback` |
| Идентификатор кэша | `calendar-fixture-placeholder` |
| Текущий солнечный термин | `null` |
| Окно выполнения | `1` |

## Ежедневное расписание

| Дата плана | Имя файла | Уровень |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Уведомления и метки

| Поле | Состояние |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Ежедневное расписание

| Дата плана | Имя файла | Значение |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Канонический блок данных

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
