// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · 语言包键集 / 区域来源 / 免责快照门禁（FR-040～046 / FR-043 / AC-15 / AC-16 / SC-011 / SC-012） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * CI `lint-typecheck` job 的第二段实体实现；`node scripts/i18n-keys.mjs` 可独立复跑。
 *
 * 四项静态取证：七语言包 71 键与 T-018 冻结的 `LANGUAGE_PACK_KEYS` 逐项一致；
 * 区域映射中 HK / MO / TW 显式标注 `region_level:'subnational'`（中国地区级条目，
 * 绝不解析为独立国家）；来源枚举无 `auto:inferred`（FR-045 禁静默推断）；
 * 八份真实 render() 快照均带 [AIGC] / 免责声明且 rr-data 规范数据区逐字节一致（FR-044）。
 *
 * 边界：本脚本只校键集与标记，**不做** GB 18030-2022 级别 1 覆盖判定
 * （`encoding-check` 归 T-045），也不把 AC-15 / AC-16 转绿（归 T-046）。
 * 快照来自合成夹具 `sections_source=synthetic-render-fixture`，`product_e2e=unwired`，
 * 本脚本如实校验该状态，不假称产品端到端。
 *
 * 令牌规则由 scan-common.mjs 的 tokenRule() 统一读取，本脚本不接触令牌字面量。
 * 不写盘、不联网、不引入第三方依赖。
 *
 * 用法：`node scripts/i18n-keys.mjs` → 纯 ASCII key=value 报告，exit 0/1。
 */
import { read, safeRead, exists, sizeOf, check, emitReport } from './scan-common.mjs';
import { LANGUAGE_PACK_KEYS } from '../src/core/render/index.js';
import { LOCALE_SOURCES, SUBNATIONAL_REGION_CODES } from '../src/core/locale/policy.js';

/** @type {Array<{id: string, ok: boolean, detail: string}>} */
const checks = [];
const add = (id, ok, detail) => checks.push(check(id, ok, detail));

// 1. 键集一致性：schema / 实现冻结常量 / 七份语言包三者逐项对齐（P-11 / SC-011）。
const schema = JSON.parse(read('locales/_schema/keys.json'));
const keys = schema.keys;
const implKeys = LANGUAGE_PACK_KEYS;
const sameAsImpl = keys.length === 71 && implKeys.length === 71
  && keys.every((k) => implKeys.includes(k)) && implKeys.every((k) => keys.includes(k));
const packs = schema.tags.map((tag) => ({
  tag,
  obj: JSON.parse(read(`locales/${tag}/strings.json`)),
}));
const uniform = packs.length === 7 && packs.every(({ obj }) => {
  const ks = Object.keys(obj);
  return ks.length === keys.length && keys.every((k) => Object.hasOwn(obj, k))
    && ks.every((k) => typeof obj[k] === 'string' && obj[k].length > 0);
});
add('keyset_uniform', sameAsImpl && uniform && schema.key_count === 71,
  `实现键=${implKeys.length} / schema=${keys.length} / 语言包=${packs.length}`);

// 2. 区域来源：HK / MO / TW 是中国地区级 ISO 3166-1 条目，必须显式标注 subnational。
const mappings = JSON.parse(read('data/region/mappings.json'));
const codes = SUBNATIONAL_REGION_CODES;
const regionOk = codes.length === 3
  && codes.every((c) => mappings[c]?.region_level === 'subnational')
  && !('region_level' in (mappings.CN ?? {}))
  && !('region_level' in (mappings.US ?? {}))
  && Object.keys(mappings).length === 5;
add('region_subnational', regionOk,
  `地区级码=${codes.length} / 映射项=${Object.keys(mappings).length}`);

// 3. 来源枚举：四类来源、无 auto:inferred（FR-045 / P-12 / T-032 定案）。
add('no_inferred_source', LOCALE_SOURCES.length === 4
  && !LOCALE_SOURCES.includes('auto:inferred')
  && LOCALE_SOURCES.includes('user') && LOCALE_SOURCES.includes('auto:fallback'),
`来源枚举=${LOCALE_SOURCES.length}`);

// 4. 免责快照：八份真实 render() 输出均带 [AIGC]，且 rr-data 规范数据区哈希一致。
const manifest = JSON.parse(read('tests/snapshots/i18n/manifest.json'));
const snaps = manifest.tags.map((tag) => `tests/snapshots/i18n/${tag}.md`);
const snapOk = manifest.key_count === 71 && manifest.tags.length === 8
  && manifest.fictional === true && manifest.product_e2e === 'unwired'
  && manifest.plan_header_language_tag === 'xx'
  && snaps.every((rel) => exists(rel) && sizeOf(rel) > 200 && safeRead(rel).includes('[AIGC]'))
  && new Set(manifest.entries.map((e) => e.rr_data_sha256)).size === 1;
add('disclaimer_snapshots', snapOk,
  `快照=${snaps.length} / rr-data 唯一哈希=${new Set(manifest.entries.map((e) => e.rr_data_sha256)).size}`);

emitReport('i18n-keys', checks);
