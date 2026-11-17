# Plan journalier `2026-11-12`

> Ce plan est une référence de démonstration et non un avis médical ou nutritionnel
> Les valeurs des tableaux sont des estimations; pesez les portions et lisez les étiquettes
> [AIGC] Contenu généré avec une assistance IA

<!-- rr-render v=1 lang=fr level=day period=2026-11-12 -->

## Métadonnées d en-tête

| Champ | Valeur |
| --- | --- |
| Niveau | `day` |
| Identifiant de période | `2026-11-12` |
| Nom de fichier | `2026-11-12.md` |
| Date de génération | d:2026-11-11 |
| Généré le | `2026-11-11T20:00:00+08:00` |
| Date d exécution | d:2026-11-11 |
| Déclencheur | `plan.trigger.period_first_day` |
| Étiquette de langue | `xx` |
| Source de la locale | `user` |
| Identifiant de guide | `generic-guideline` |

## Versions des données

| Champ | Valeur |
| --- | --- |
| Version des données corporelles | `fixture-body-v1` |
| Version de la prescription | `fixture-rx-v1` |
| Version de la politique locale | `fixture-loc-v1` |
| Version des termes solaires | `fixture-st-v1` |
| Version des règles | `fixture-rule-v1` |

## Liens amont et aval

| Niveau | Identifiant de période | Nom de fichier | Clé |
| --- | --- | --- | --- |
| `null` | `null` | `null` | Aucun |

## Prescription nutritionnelle

| Champ | Borne basse | Borne haute | Unité |
| --- | --- | --- | --- |
| Énergie | n:100:render.unit.kcal | n:200:render.unit.kcal | kcal (kilocalorie) |
| Protéines | n:101:render.unit.g | n:201:render.unit.g | g (gramme) |
| Lipides | n:102:render.unit.g | n:202:render.unit.g | g (gramme) |
| Glucides | n:103:render.unit.g | n:203:render.unit.g | g (gramme) |
| Fibres alimentaires | n:104:render.unit.g | n:204:render.unit.g | g (gramme) |
| Eau | n:105:render.unit.ml | n:205:render.unit.ml | ml (millilitre) |
| Sel | n:106:render.unit.g | n:206:render.unit.g | g (gramme) |
| Huile de cuisson | n:107:render.unit.g | n:207:render.unit.g | g (gramme) |
| Sucres ajoutés | n:108:render.unit.g | n:208:render.unit.g | g (gramme) |

## Garde-fous stricts

| Champ | Valeur | Unité |
| --- | --- | --- |
| Seuil énergétique | `1200` | kcal (kilocalorie) |
| Seuil protéique | `60` | g (gramme) |

## Saison et calendrier

| Champ | Valeur |
| --- | --- |
| État du calendrier | `fallback` |
| Identifiant de cache | `calendar-fixture-placeholder` |
| Terme solaire actif | `null` |
| Fenêtre d exécution | `1` |

## Planning quotidien

| Date du plan | Nom de fichier | Niveau |
| --- | --- | --- |
| d:2026-11-12 | `2026-11-12.md` | `day` |

## Avis et marqueurs

| Champ | État |
| --- | --- |
| `plan.notice.disclaimer` | `direct` |
| `plan.notice.estimated` | `direct` |
| `plan.marker.aigc` | `direct` |

## Planning quotidien

| Date du plan | Nom de fichier | Valeur |
| --- | --- | --- |
| `2026-11-12` | `meal.fixture_breakfast` | `111g` |
| `2026-11-12` | `meal.fixture_lunch` | `122g` |
| `2026-11-12` | `meal.fixture_dinner` | `133g` |
| `2026-11-12` | `meal.fixture_snack` | `144g` |

## Bloc de données canoniques

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
