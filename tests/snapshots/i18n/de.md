# Tagesplan `2026-11-12`

> Dieser Plan ist eine Demoreferenz und kein medizinischer oder ernährungswissenschaftlicher Rat
> Tabellenwerte sind Schätzungen; Portionen wiegen und Etiketten lesen
> [AIGC] Mit KI-Unterstützung erstellt

<!-- rr-render v=1 lang=de level=day period=2026-11-12 -->

## Kopfmetadaten

| Feld | Wert |
| --- | --- |
| Ebene | `day` |
| Perioden-ID | `2026-11-12` |
| Dateiname | `2026-11-12.md` |
| Erstellungsdatum | d:2026-11-11 |
| Erstellt am | `2026-11-11T20:00:00+08:00` |
| Laufdatum | d:2026-11-11 |
| Auslöser | `plan.trigger.period_first_day` |
| Sprachkennung | `xx` |
| Herkunft der Locale | `user` |
| Richtlinien-ID | `generic-guideline` |

## Datenversionen

| Feld | Wert |
| --- | --- |
| Version der Körperdaten | `fixture-body-v1` |
| Vorgabenversion | `fixture-rx-v1` |
| Version der Locale-Richtlinie | `fixture-loc-v1` |
| Version der Sonnenbegriffe | `fixture-st-v1` |
| Regelversion | `fixture-rule-v1` |

## Über- und Unterordnung

| Ebene | Perioden-ID | Dateiname | Schlüssel |
| --- | --- | --- | --- |
| `null` | `null` | `null` | Keine |

## Ernährungsvorgabe

| Feld | Untergrenze | Obergrenze | Einheit |
| --- | --- | --- | --- |
| Energie | n:100:render.unit.kcal | n:200:render.unit.kcal | kcal (Kilokalorie) |
| Eiweiß | n:101:render.unit.g | n:201:render.unit.g | g (Gramm) |
| Fett | n:102:render.unit.g | n:202:render.unit.g | g (Gramm) |
| Kohlenhydrate | n:103:render.unit.g | n:203:render.unit.g | g (Gramm) |
| Ballaststoffe | n:104:render.unit.g | n:204:render.unit.g | g (Gramm) |
| Wasser | n:105:render.unit.ml | n:205:render.unit.ml | ml (Milliliter) |
| Salz | n:106:render.unit.g | n:206:render.unit.g | g (Gramm) |
| Speiseöl | n:107:render.unit.g | n:207:render.unit.g | g (Gramm) |
| Zuckerzusatz | n:108:render.unit.g | n:208:render.unit.g | g (Gramm) |

## Harte Schutzgrenzen

| Feld | Wert | Einheit |
| --- | --- | --- |
| Energiegrenzwert | `1200` | kcal (Kilokalorie) |
| Eiweißgrenzwert | `60` | g (Gramm) |

## Saison und Kalender

| Feld | Wert |
| --- | --- |
| Kalenderstatus | `fallback` |
| Cache-ID | `calendar-fixture-placeholder` |
| Aktiver Sonnenbegriff | `null` |
| Ausführungsfenster | `1` |

## Tagesplanung

| Plandatum | Dateiname | Ebene |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Hinweise und Marker

| Feld | Zustand |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Tagesplanung

| Plandatum | Dateiname | Wert |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Kanonischer Datenblock

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
