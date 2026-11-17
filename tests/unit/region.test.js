// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-033 · 区域映射表与中立通用基线回退单测
 * （FR-003 / FR-014 / FR-045 / AC-16 / E-14 / SC-012 / NFR-012）。
 *
 * ATDD 先红后绿：本文件先于 `data/region/` 与 `src/core/guideline/region.js` 落盘，初态必须为 RED。
 * 口径：
 * - 映射表是**最小示例集**（规格点名的中国 / 美国 + 中国地区级选项），
 *   自撰中立适配器，不代表任何真实膳食指南的适用性或数值，待人工审校。
 * - `gregorian-season` 与 `solar-terms` 同等遵守「年刷新 / 下层只读 / FALLBACK」。
 * - 中国香港 / 中国澳门 / 中国台湾是中国的地区级 ISO 3166-1 条目，不作独立国家。
 * - 真实数据令牌不写入测试正文（ci.yml 全仓静态扫描唯一定案）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import { createFixedClock, createMemoryFs, createStubNet } from '../fixtures/index.js';
import {
  REGION_ROOT,
  MAPPINGS_PATH,
  SCHEMA_PATH,
  REGION_ERROR,
  UNIT_SYSTEMS,
  CALENDAR_CONTRACT,
  SCHEMA_KEYS,
  RegionError,
  loadRegionMappings,
  createLocalePolicyResolverFromFs,
} from '../../src/core/guideline/region.js';
import {
  assertRegionMappings, NEUTRAL_BASELINE, SUBNATIONAL_REGION_CODES,
  POLICY_FALLBACK, explainLocalePolicy,
} from '../../src/core/locale/index.js';
import { isIso3166Alpha2 } from '../../src/core/profile/index.js';
import { BUILTIN_TAGS } from '../../src/core/locale/fallback.js';
import { GUIDELINE_KEYS, validateGuidelineAdapter } from '../../src/core/guideline/contract.js';
import {
  CALENDAR_KIND, FALLBACK_LABEL, CalendarError,
  validateCalendarAdapter, refreshCalendarData,
} from '../../src/core/calendar/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const realFiles = () => ({
  'data/region/mappings.json': read('data/region/mappings.json'),
  'data/region/schema.json': read('data/region/schema.json'),
  'data/guideline/generic-guideline.json': read('data/guideline/generic-guideline.json'),
  'data/guideline/region-cn-example.json': read('data/guideline/region-cn-example.json'),
  'data/guideline/region-us-example.json': read('data/guideline/region-us-example.json'),
});
const fsOf = (over = {}) => createMemoryFs({ files: { ...realFiles(), ...over } });
const profileOf = (lp = {}) => ({ locale_policy: lp });
const patch = (changes) => {
  const m = json('data/region/mappings.json');
  for (const [code, fields] of Object.entries(changes)) Object.assign(m[code], fields);
  return JSON.stringify(m);
};
const patchSchema = (changes) => JSON.stringify({ ...json('data/region/schema.json'), ...changes });

test('T-033 · 区域映射表是纯 ISO 3166-1 映射，无元数据键混入', () => {
  const m = json('data/region/mappings.json');
  assert.equal(MAPPINGS_PATH, 'data/region/mappings.json');
  assert.equal(REGION_ROOT, 'data/region');
  assert.ok(Object.keys(m).length >= 5);
  for (const code of Object.keys(m)) assert.equal(isIso3166Alpha2(code), true, code);
  for (const code of Object.keys(m)) assert.ok(/^[A-Z]{2}$/.test(code));
  assert.doesNotThrow(() => assertRegionMappings(m), '必须通过 T-032 的映射表契约');
});

test('T-033 · schema 固定键集与 codes / mappings 一致', () => {
  const s = json('data/region/schema.json');
  assert.equal(SCHEMA_PATH, 'data/region/schema.json');
  assert.deepEqual(Object.keys(s).sort(), [...SCHEMA_KEYS].sort());
  const m = json('data/region/mappings.json');
  assert.deepEqual([...s.codes].sort(), Object.keys(m).sort());
  assert.equal(s.mapping_file, 'mappings.json');
  assert.equal(s.coverage, 'minimal-example');
  assert.equal(s.review_status, 'ai-candidate-unreviewed');
});

test('T-033 · 中立通用基线与 T-032 的 NEUTRAL_BASELINE 逐字一致', () => {
  assert.deepEqual(json('data/region/schema.json').baseline, { ...NEUTRAL_BASELINE });
  assert.equal(NEUTRAL_BASELINE.guideline_id, 'generic-guideline');
  assert.equal(NEUTRAL_BASELINE.calendar_id, 'gregorian-season');
});

test('T-033 · 历法同等约束声明与 T-014 契约常量一致', () => {
  const c = json('data/region/schema.json').calendar_contract;
  assert.deepEqual(c, { ...CALENDAR_CONTRACT });
  assert.equal(c.fallback_label, FALLBACK_LABEL);
  assert.equal(c.min_independent_sources, 2);
  assert.equal(Object.values(CALENDAR_KIND).includes('gregorian-season'), true);
  assert.equal(Object.values(CALENDAR_KIND).includes('solar-terms'), true);
});

test('T-033 · 地区级码清单与 T-032 一致', () => {
  assert.deepEqual(json('data/region/schema.json').subnational_codes, [...SUBNATIONAL_REGION_CODES]);
  assert.deepEqual([...SUBNATIONAL_REGION_CODES], ['HK', 'MO', 'TW']);
});

test('T-033 · CN / US 条目取值符合规格示例方向', () => {
  const m = json('data/region/mappings.json');
  assert.equal(m.CN.guideline_id, 'region-cn-example');
  assert.equal(m.CN.calendar_id, CALENDAR_KIND.SOLAR_TERMS);
  assert.equal(m.CN.unit_system, 'metric');
  assert.equal(m.CN.language_tag, 'zh-Hans');
  assert.equal(m.US.guideline_id, 'region-us-example');
  assert.equal(m.US.calendar_id, CALENDAR_KIND.SEASON);
  assert.equal(m.US.unit_system, 'us-customary');
  assert.equal(m.US.language_tag, 'en');
  assert.deepEqual([...UNIT_SYSTEMS], ['metric', 'us-customary']);
});

test('T-033 · 中国香港/澳门/台湾是地区级选项，与 CN 共享策略且不列为独立国家', () => {
  const m = json('data/region/mappings.json');
  for (const code of SUBNATIONAL_REGION_CODES) {
    const e = m[code];
    assert.equal(e.region_level, 'subnational', code);
    assert.equal(e.guideline_id, m.CN.guideline_id, code);
    assert.equal(e.calendar_id, m.CN.calendar_id, code);
    assert.equal(e.unit_system, m.CN.unit_system, code);
    assert.equal(e.language_tag, 'zh-Hans', code);
  }
  assert.equal(read('data/region/README.md').includes('中国的一部分'), true);
});

test('T-033 · 每个 guideline_id 都有对应适配器且通过 T-011 契约', () => {
  const m = json('data/region/mappings.json');
  const ids = new Set(Object.values(m).map((e) => e.guideline_id).concat(['generic-guideline']));
  for (const id of ids) {
    const a = json(`data/guideline/${id}.json`);
    assert.equal(a.id, id);
    assert.deepEqual(Object.keys(a).sort(), [...GUIDELINE_KEYS].sort());
    assert.deepEqual(validateGuidelineAdapter(a), []);
    assert.equal(a.source, id === 'generic-guideline' ? 'neutral-baseline' : 'synthetic-neutral-example');
  }
});

test('T-033 · 每个历法 / 单位 / 语言都在既有白名单内', () => {
  const m = json('data/region/mappings.json');
  const kinds = Object.values(CALENDAR_KIND);
  for (const [code, e] of Object.entries(m)) {
    assert.ok(kinds.includes(e.calendar_id), code);
    assert.ok(UNIT_SYSTEMS.includes(e.unit_system), code);
    assert.ok(BUILTIN_TAGS.includes(e.language_tag), code);
  }
});

test('T-033 · gregorian-season 同等受 ≥2 独立来源约束（validateCalendarAdapter）', () => {
  const season = {
    id: 'gregorian-season', version: '1.0.0', kind: CALENDAR_KIND.SEASON,
    expected_count: 4, notice_key: 'calendar.gregorian_season.notice',
    sources: [
      { id: 'source.a', url: 'https://season-a.example.org/2027.txt' },
      { id: 'source.b', url: 'https://season-b.example.org/2027.txt' },
    ],
  };
  assert.doesNotThrow(() => validateCalendarAdapter(season));
  assert.throws(() => validateCalendarAdapter({ ...season, sources: [season.sources[0]] }), CalendarError);
  assert.throws(() => validateCalendarAdapter({ ...season, sources: [season.sources[0], season.sources[0]] }), CalendarError);
});

test('T-033 · gregorian-season 同等走年刷新 + 失败 FALLBACK（真实调用 T-014）', async () => {
  const year = 2027;
  const clock = () => createFixedClock('2027-01-01T08:00:00+08:00');
  const urls = ['https://season-a.example.org/2027.txt', 'https://season-b.example.org/2027.txt'];
  const rows = ['03', '06', '09', '12'].map((mm, i) => {
    const at = `${year}-${mm}-01T${i % 2 === 0 ? '10:00:00+08:00' : '02:00:00Z'}`;
    return `term id=season.fixture_${i + 1} longitude_deg=${i * 90}.0 at=${at}`;
  }).join('\n');
  const adapter = {
    id: 'gregorian-season', version: '1.0.0', kind: CALENDAR_KIND.SEASON,
    expected_count: 4, notice_key: 'calendar.gregorian_season.notice',
    sources: [{ id: 'source.a', url: urls[0] }, { id: 'source.b', url: urls[1] }],
  };
  const fs = createMemoryFs();
  const ctx = { fsPort: fs, clock: clock(), cachePath: 'data/region/season-fixture-2027.md' };
  const net = createStubNet({ responses: { [urls[0]]: rows, [urls[1]]: rows }, clock: clock() });
  const verified = await refreshCalendarData(year, adapter, net, ctx);
  assert.equal(verified.status, 'verified');
  assert.equal(verified.terms.length, 4);
  const offline = await refreshCalendarData(year, adapter, createStubNet({ offline: true, clock: clock() }), ctx);
  assert.equal(offline.status, 'FALLBACK');
  assert.equal(offline.status_label, FALLBACK_LABEL);
});

test('T-033 · loadRegionMappings 成功、结果冻结、零写入', async () => {
  const fs = fsOf();
  const result = await loadRegionMappings(fs);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.mappings));
  assert.deepEqual(Object.keys(result.mappings).sort(), [...result.schema.codes].sort());
  assert.deepEqual(fs.writes(), []);
});

test('T-033 · 缺 fsPort / 缺文件 / JSON 损坏一律稳定码拒绝', async () => {
  const isRegionError = (code) => (e) => e instanceof RegionError && e.code === code && e.message === code;
  await assert.rejects(() => loadRegionMappings(null), isRegionError(REGION_ERROR.FS));
  await assert.rejects(() => loadRegionMappings({}), isRegionError(REGION_ERROR.FS));
  await assert.rejects(() => loadRegionMappings(createMemoryFs({ files: {} })), isRegionError(REGION_ERROR.MAPPINGS));
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/mappings.json': '{broken' })),
    isRegionError(REGION_ERROR.MAPPINGS),
  );
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/schema.json': '{broken' })),
    isRegionError(REGION_ERROR.SCHEMA),
  );
});

test('T-033 · 畸形 mappings 一律 ERR_REGION_MAPPINGS', async () => {
  const isMapping = (e) => e instanceof RegionError && e.code === REGION_ERROR.MAPPINGS;
  const bad = [
    JSON.stringify({ ZZ: json('data/region/mappings.json').CN }),
    JSON.stringify({ ...json('data/region/mappings.json'), schema_version: 'x' }),
    patch({ CN: { injected: 'x' } }),
    patch({ CN: { guideline_id: 'Bad_ID' } }),
  ];
  for (const text of bad) {
    await assert.rejects(() => loadRegionMappings(fsOf({ 'data/region/mappings.json': text })), isMapping);
  }
});

test('T-033 · 指南适配器缺失 / 未知历法 / 单位 / 语言各自独立拒绝', async () => {
  const is = (code) => (e) => e instanceof RegionError && e.code === code;
  const cases = [
    [patch({ CN: { guideline_id: 'no-such-adapter' } }), REGION_ERROR.GUIDELINE],
    [patch({ CN: { calendar_id: 'unknown-calendar' } }), REGION_ERROR.CALENDAR],
    [patch({ CN: { unit_system: 'unknown-units' } }), REGION_ERROR.UNITS],
    [patch({ CN: { language_tag: 'xx' } }), REGION_ERROR.LANGUAGE],
  ];
  for (const [text, code] of cases) {
    await assert.rejects(() => loadRegionMappings(fsOf({ 'data/region/mappings.json': text })), is(code));
  }
});

test('T-033 · 地区级条目未标 subnational 一律拒绝', async () => {
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/mappings.json': patch({ HK: { region_level: 'country' } }) })),
    (e) => e instanceof RegionError && e.code === REGION_ERROR.MAPPINGS,
  );
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/schema.json': patchSchema({ subnational_codes: ['HK'] }) })),
    (e) => e instanceof RegionError && e.code === REGION_ERROR.SUBNATIONAL,
  );
});

test('T-033 · baseline / 历法契约漂移一律 ERR_REGION_BASELINE', async () => {
  const is = (e) => e instanceof RegionError && e.code === REGION_ERROR.BASELINE;
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/schema.json': patchSchema({ baseline: { ...NEUTRAL_BASELINE, unit_system: 'imperial' } }) })), is,
  );
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/schema.json': patchSchema({ calendar_contract: { ...CALENDAR_CONTRACT, approximate_table_forbidden: false } }) })), is,
  );
  await assert.rejects(
    () => loadRegionMappings(fsOf({ 'data/region/schema.json': patchSchema({ schema_version: '9.9.9' }) })),
    (e) => e instanceof RegionError && e.code === REGION_ERROR.SCHEMA,
  );
});

test('T-033 · AC-16 场景 1：声明国籍 CN → 真实映射 auto:nationality', async () => {
  const resolver = await createLocalePolicyResolverFromFs(fsOf());
  const r = explainLocalePolicy(profileOf({ declared_nationality: 'CN' }), {}, {});
  const viaPort = resolver(profileOf({ declared_nationality: 'CN' }), {});
  const { regionMappings } = { regionMappings: (await loadRegionMappings(fsOf())).mappings };
  const direct = explainLocalePolicy(profileOf({ declared_nationality: 'CN' }), {}, { regionMappings });
  assert.equal(r.policy.guideline_id, 'generic-guideline', '未注入映射时仍按零兜底回退');
  assert.equal(direct.policy.locale_source, 'auto:nationality');
  assert.equal(direct.policy.guideline_id, 'region-cn-example');
  assert.equal(direct.policy.calendar_id, 'solar-terms');
  assert.equal(direct.policy.language_tag, 'zh-Hans');
  assert.equal(direct.fallback_reason, null);
  assert.equal(viaPort.locale_source, 'auto:nationality', '端口工厂与 T-032 组合根接线成功');
  assert.equal(viaPort.guideline_id, 'region-cn-example');
});

test('T-033 · AC-16 场景 2：显式覆盖优先于真实映射', async () => {
  const resolver = await createLocalePolicyResolverFromFs(fsOf());
  const policy = resolver(
    profileOf({ declared_nationality: 'CN', declared_residence: 'US' }),
    { guideline: 'generic-guideline', lang: 'de' },
  );
  assert.equal(policy.locale_source, 'user');
  assert.equal(policy.guideline_id, 'generic-guideline');
  assert.equal(policy.language_tag, 'de');
  assert.equal(policy.calendar_id, 'solar-terms', '未覆盖项仍取国籍解析结果');
});

test('T-033 · AC-16 场景 3：未登记区域 → 中立基线 + 显式回退标注', async () => {
  const resolver = await createLocalePolicyResolverFromFs(fsOf());
  const r = explainLocalePolicy(profileOf({ declared_nationality: 'JP', declared_residence: 'FR' }), {},
    { regionMappings: (await loadRegionMappings(fsOf())).mappings });
  assert.equal(r.policy.locale_source, 'auto:fallback');
  assert.equal(r.fallback_reason, POLICY_FALLBACK.UNMATCHED);
  assert.deepEqual({ ...r.policy }, { ...NEUTRAL_BASELINE, locale_source: 'auto:fallback' });
  assert.equal(r.inferred, false);
  const empty = resolver(profileOf(), {});
  assert.equal(empty.locale_source, 'auto:fallback');
});

test('T-033 · 地区级码作居住地可命中，作国籍仍回退', async () => {
  const { regionMappings } = { regionMappings: (await loadRegionMappings(fsOf())).mappings };
  const asResidence = explainLocalePolicy(profileOf({ declared_residence: 'HK' }), {}, { regionMappings });
  assert.equal(asResidence.policy.locale_source, 'auto:residence');
  assert.equal(asResidence.policy.guideline_id, 'region-cn-example');
  const asNationality = explainLocalePolicy(profileOf({ declared_nationality: 'TW' }), {}, { regionMappings });
  assert.equal(asNationality.policy.locale_source, 'auto:fallback');
  assert.equal(asNationality.fallback_reason, POLICY_FALLBACK.SUBNATIONAL);
});

test('T-033 · 区域内无任何节气 / 季节日期常量（FR-012 禁止内置近似表）', () => {
  const text = read('data/region/mappings.json') + read('data/region/schema.json') + read('data/region/README.md');
  assert.ok(!/\b(?:term|season)\.fixture|longitude_deg|交节时刻|spring|summer|autumn|winter/i.test(text));
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(text), '不得含精确时刻');
  assert.equal(read('src/core/calendar/README.md').includes('不内置任何节气名称或日期常量'), true);
});

test('T-033 · region.js 零内置模块导入 / 零网络 / 零真实数值字面量', () => {
  const src = read('src/core/guideline/region.js');
  for (const bad of ['node:', 'fetch(', 'process.env', 'Math.random', 'XMLHttpRequest']) {
    assert.ok(!src.includes(bad), bad);
  }
  const m = /const TOKENS = \/(.+?)\/;/.exec(read('.github/workflows/ci.yml'));
  assert.ok(!new RegExp(m[1]).test(src));
  assert.ok(!new RegExp(m[1]).test(read('data/region/mappings.json') + read('data/region/schema.json')));
});

test('T-033 · 不自动接线：rr plan 缺 resolveLocalePolicy 仍 ERR_CLI_PORT', () => {
  const plan = read('src/cli/plan.js');
  assert.match(plan, /requirePort\(deps, 'resolveLocalePolicy'/);
  assert.match(plan, /ERR_CLI_PORT/);
  // 组合根不得自动装配映射表；run.js 注释里出现端口名只是注入契约说明，不是接线。
  for (const rel of ['src/cli/run.js', 'src/cli/plan.js', 'src/cli/index.js']) {
    assert.equal(read(rel).includes('createLocalePolicyResolverFromFs'), false, rel);
    assert.equal(read(rel).includes('loadRegionMappings'), false, rel);
  }
  assert.equal(read('src/cli/run.js').includes("'resolveLocalePolicy':"), false);
});
