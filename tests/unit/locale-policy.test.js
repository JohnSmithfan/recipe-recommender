// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-032 · LocalePolicy 区域策略解析单测
 * （FR-003 / FR-045 / FR-046 / AC-16 / SC-012 / NFR-012 / P-12 / E-13 / E-14）。
 *
 * ATDD 先红后绿：本文件先于 `src/core/locale/policy.js` 与 `index.js` 落盘，初态必须为 RED。
 * 口径：
 * - 映射表属 T-033；本测试只注入**合成映射**验证解析链，绝不内置真实国家 → 指南映射。
 * - 真实数据令牌不写入测试正文（ci.yml 全仓静态扫描唯一定案）。
 * - 中国香港 / 中国澳门 / 中国台湾是中国的地区级 ISO 3166-1 条目，不作独立国家解析。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import {
  LOCALE_SOURCES,
  POLICY_FIELDS,
  OVERRIDE_FIELDS,
  SUBNATIONAL_REGION_CODES,
  NEUTRAL_BASELINE,
  POLICY_ERROR,
  POLICY_FALLBACK,
  POLICY_STEP,
  LocalePolicyError,
  assertRegionMappings,
  explainLocalePolicy,
  resolveLocalePolicy,
  createLocalePolicyResolver,
} from '../../src/core/locale/index.js';
import { isIso3166Alpha2 } from '../../src/core/profile/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 合成映射：只用于验证解析链，不是真实区域数据（T-033 才落 data/region/）。 */
const mapping = (over = {}) => Object.freeze({
  guideline_id: 'demo-guideline-a',
  calendar_id: 'demo-calendar-a',
  unit_system: 'metric-demo',
  language_tag: 'fr',
  ...over,
});
const MAPPINGS = Object.freeze({
  CN: mapping({ guideline_id: 'demo-guideline-cn', calendar_id: 'demo-solar-terms', language_tag: 'zh-Hans' }),
  FR: mapping(),
  JP: mapping({ guideline_id: 'demo-guideline-jp', calendar_id: 'demo-calendar-jp' }),
  HK: mapping({ region_level: 'subnational' }),
  MO: mapping({ region_level: 'subnational' }),
  TW: mapping({ region_level: 'subnational' }),
});
const profileOf = (lp = {}) => Object.freeze({ locale_policy: lp });

test('T-032 · 五键契约与 rr plan 的 assertPolicy 白名单逐字一致', () => {
  const src = read('src/cli/plan.js');
  const m = /const POLICY_KEYS = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(src);
  assert.ok(m, 'cli/plan.js 必须保留 POLICY_KEYS 唯一权威定义');
  const keys = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual([...POLICY_FIELDS], keys);
});

test('T-032 · 来源枚举与三处消费者逐字一致（拒绝静默推断）', () => {
  const expected = ['user', 'auto:nationality', 'auto:residence', 'auto:fallback'];
  assert.deepEqual([...LOCALE_SOURCES], expected);
  for (const rel of ['src/cli/plan.js', 'src/cli/validate.js', 'src/core/planner/plan.js']) {
    const m = /const LOCALE_SOURCES = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(read(rel));
    assert.ok(m, `${rel} 必须保留来源枚举`);
    assert.deepEqual([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), expected);
  }
  assert.ok(!expected.includes('auto:inferred'));
});

test('T-032 · 中立通用基线与 fixture 的 expected_resolution 一致', () => {
  assert.deepEqual({ ...NEUTRAL_BASELINE }, {
    language_tag: 'en',
    guideline_id: 'generic-guideline',
    calendar_id: 'gregorian-season',
    unit_system: 'metric',
  });
  const fixture = JSON.parse(read('examples/profiles/global-average-male.json'));
  assert.equal(fixture.locale_policy.expected_source, 'auto:fallback');
  assert.match(fixture.locale_policy.expected_resolution, /generic-guideline/);
  assert.match(fixture.locale_policy.expected_resolution, /gregorian-season/);
  const policy = resolveLocalePolicy(profileOf(fixture.locale_policy), {}, { regionMappings: {} });
  assert.equal(policy.guideline_id, 'generic-guideline');
  assert.equal(policy.calendar_id, 'gregorian-season');
  assert.equal(policy.locale_source, 'auto:fallback');
});

test('T-032 · 无任何声明 / 覆盖 / 映射 → 五键冻结、基线值、显式回退理由', () => {
  const result = explainLocalePolicy(profileOf(), {});
  assert.deepEqual({ ...result.policy }, { ...NEUTRAL_BASELINE, locale_source: 'auto:fallback' });
  assert.ok(Object.isFrozen(result.policy));
  assert.equal(result.fallback_reason, POLICY_FALLBACK.NO_DECLARATION);
  assert.ok(result.chain.includes(POLICY_STEP.FALLBACK));
  assert.equal(result.inferred, false);
  assert.equal(result.region.matched, null);
  assert.equal(result.subnational_handled, false);
});

test('T-032 · 国籍命中映射 → auto:nationality', () => {
  const policy = resolveLocalePolicy(
    profileOf({ declared_nationality: 'CN', declared_residence: 'FR' }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.guideline_id, 'demo-guideline-cn');
  assert.equal(policy.calendar_id, 'demo-solar-terms');
  assert.equal(policy.language_tag, 'zh-Hans');
  assert.equal(policy.locale_source, 'auto:nationality');
});

test('T-032 · 国籍与居住地指向不同映射时国籍优先（FR-045）', () => {
  const { region, chain } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN', declared_residence: 'FR' }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(region.matched, 'CN');
  assert.ok(chain.includes(POLICY_STEP.NATIONALITY));
  assert.ok(!chain.includes(POLICY_STEP.RESIDENCE));
});

test('T-032 · 国籍缺失 → 按居住地 auto:residence', () => {
  const { policy, region } = explainLocalePolicy(
    profileOf({ declared_residence: 'FR' }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.locale_source, 'auto:residence');
  assert.equal(region.matched, 'FR');
  assert.equal(policy.guideline_id, 'demo-guideline-a');
});

test('T-032 · 国籍「不足」（映射表无该码）→ 退到居住地 auto:residence', () => {
  const partial = Object.freeze({ FR: mapping() });
  const { policy, region } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN', declared_residence: 'FR' }),
    {},
    { regionMappings: partial },
  );
  assert.equal(policy.locale_source, 'auto:residence');
  assert.equal(region.matched, 'FR');
});

test('T-032 · 国籍与居住地都无匹配 → auto:fallback 且标注 unmatched', () => {
  const { policy, fallback_reason, region } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN', declared_residence: 'JP' }),
    {},
    { regionMappings: {} },
  );
  assert.equal(policy.locale_source, 'auto:fallback');
  assert.equal(fallback_reason, POLICY_FALLBACK.UNMATCHED);
  assert.equal(region.matched, null);
  assert.equal(policy.guideline_id, 'generic-guideline');
});

test('T-032 · 用户覆盖 guideline / calendar → user 且值生效', () => {
  const policy = resolveLocalePolicy(
    profileOf({ declared_nationality: 'CN' }),
    { guideline: 'demo-guideline-user', calendar: 'demo-calendar-user' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.locale_source, 'user');
  assert.equal(policy.guideline_id, 'demo-guideline-user');
  assert.equal(policy.calendar_id, 'demo-calendar-user');
  assert.equal(policy.language_tag, 'zh-Hans', '未覆盖的语言仍来自区域解析');
});

test('T-032 · 用户覆盖 lang 优先于映射语言', () => {
  const policy = resolveLocalePolicy(
    profileOf({ declared_nationality: 'CN' }),
    { lang: 'de' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.language_tag, 'de');
  assert.equal(policy.locale_source, 'user');
});

test('T-032 · 用户覆盖 units（FR-046 单位可覆盖；CLI 未暴露该键另作登记）', () => {
  const policy = resolveLocalePolicy(
    profileOf({ declared_nationality: 'FR' }),
    { units: 'imperial-demo' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.unit_system, 'imperial-demo');
  assert.equal(policy.locale_source, 'user');
  assert.ok(OVERRIDE_FIELDS.includes('units'));
});

test('T-032 · country 覆盖是显式区域声明，优先于档案国籍', () => {
  const { policy, region } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN' }),
    { country: 'FR' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.locale_source, 'user');
  assert.equal(region.matched, 'FR');
  assert.equal(region.country_override, 'FR');
  assert.equal(policy.guideline_id, 'demo-guideline-a');
});

test('T-032 · country 覆盖无匹配时仍为 user，但显式标注 unmatched 并回退基线', () => {
  const { policy, fallback_reason, region } = explainLocalePolicy(
    profileOf(),
    { country: 'JP' },
    { regionMappings: {} },
  );
  assert.equal(policy.locale_source, 'user');
  assert.equal(fallback_reason, POLICY_FALLBACK.UNMATCHED);
  assert.equal(region.matched, null);
  assert.equal(policy.guideline_id, 'generic-guideline');
});

test('T-032 · 档案内 guideline_override / calendar_override 属于用户覆盖', () => {
  const policy = resolveLocalePolicy(
    profileOf({
      declared_nationality: 'CN',
      guideline_override: 'demo-guideline-profile',
      calendar_override: 'demo-calendar-profile',
    }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.locale_source, 'user');
  assert.equal(policy.guideline_id, 'demo-guideline-profile');
  assert.equal(policy.calendar_id, 'demo-calendar-profile');
});

test('T-032 · CLI 覆盖优先于档案覆盖（FR-046 / E-13）', () => {
  const policy = resolveLocalePolicy(
    profileOf({ guideline_override: 'demo-guideline-profile' }),
    { guideline: 'demo-guideline-cli' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.guideline_id, 'demo-guideline-cli');
  assert.equal(policy.locale_source, 'user');
});

test('T-032 · profile.output_language 优先于映射语言，但不改变 locale_source', () => {
  const { policy, fields } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN', output_language: 'en' }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.language_tag, 'en');
  assert.equal(policy.locale_source, 'auto:nationality');
  assert.equal(fields.language_tag, 'profile');
});

test('T-032 · 部分覆盖时逐字段来源可追溯', () => {
  const { fields, chain } = explainLocalePolicy(
    profileOf({ declared_nationality: 'CN' }),
    { guideline: 'demo-guideline-user' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(fields.guideline_id, 'cli');
  assert.equal(fields.calendar_id, 'region');
  assert.equal(fields.language_tag, 'region');
  assert.equal(fields.unit_system, 'region');
  assert.ok(chain.includes(POLICY_STEP.OVERRIDE));
});

test('T-032 · 中国香港 / 澳门 / 台湾作为国籍不作独立国家解析，显式回退', () => {
  for (const code of SUBNATIONAL_REGION_CODES) {
    const { policy, subnational_handled, fallback_reason, region } = explainLocalePolicy(
      profileOf({ declared_nationality: code }),
      {},
      { regionMappings: MAPPINGS },
    );
    assert.equal(policy.locale_source, 'auto:fallback', code);
    assert.equal(subnational_handled, true, code);
    assert.equal(fallback_reason, POLICY_FALLBACK.SUBNATIONAL, code);
    assert.equal(region.matched, null, code);
    assert.equal(policy.guideline_id, 'generic-guideline', code);
  }
  assert.deepEqual([...SUBNATIONAL_REGION_CODES], ['HK', 'MO', 'TW']);
});

test('T-032 · 地区级条目可作为居住地命中（须显式 region_level=subnational）', () => {
  const { policy, region, subnational_handled } = explainLocalePolicy(
    profileOf({ declared_residence: 'HK' }),
    {},
    { regionMappings: MAPPINGS },
  );
  assert.equal(policy.locale_source, 'auto:residence');
  assert.equal(region.matched, 'HK');
  assert.equal(subnational_handled, false);
});

test('T-032 · 非 ISO 3166-1 地区码 / 非法语言 / 非法覆盖值一律稳定码拒绝', () => {
  assert.equal(isIso3166Alpha2('ZZ'), false);
  const cases = [
    [profileOf({ declared_nationality: 'ZZ' }), {}, POLICY_ERROR.REGION],
    [profileOf({ output_language: 'not a tag' }), {}, POLICY_ERROR.LANGUAGE],
    [profileOf({ guideline_override: 'Bad_ID' }), {}, POLICY_ERROR.GUIDELINE],
    [profileOf({ calendar_override: 'Bad_ID' }), {}, POLICY_ERROR.CALENDAR],
    [profileOf(), { lang: 'bad tag' }, POLICY_ERROR.LANGUAGE],
    [profileOf(), { guideline: 'Bad_ID' }, POLICY_ERROR.GUIDELINE],
    [profileOf(), { calendar: 'Bad_ID' }, POLICY_ERROR.CALENDAR],
    [profileOf(), { units: 'Bad_ID' }, POLICY_ERROR.UNITS],
    [profileOf(), { country: 'zz' }, POLICY_ERROR.REGION],
    [profileOf(), { unknown_key: 'x' }, POLICY_ERROR.OVERRIDE],
    [null, {}, POLICY_ERROR.PROFILE],
  ];
  for (const [profile, overrides, code] of cases) {
    assert.throws(
      () => resolveLocalePolicy(profile, overrides, { regionMappings: MAPPINGS }),
      (err) => err instanceof LocalePolicyError && err.code === code
        && /^ERR_LOCALE_POLICY_[A-Z]+$/.test(err.message),
      `期望 ${code}`,
    );
  }
});

test('T-032 · 映射表形状校验：缺键 / 多余键 / 非法值 / 地区级未标注一律拒绝', () => {
  const bad = [
    Object.freeze({ CN: { guideline_id: 'demo-a' } }),
    Object.freeze({ CN: { ...mapping(), unexpected: 'x' } }),
    Object.freeze({ CN: { ...mapping(), guideline_id: 'Bad_ID' } }),
    Object.freeze({ CN: { ...mapping(), language_tag: 'bad tag' } }),
    Object.freeze({ ZZ: mapping() }),
    Object.freeze({ HK: mapping() }),
    Object.freeze({ HK: { ...mapping(), region_level: 'country' } }),
  ];
  for (const m of bad) {
    assert.throws(
      () => assertRegionMappings(m),
      (err) => err instanceof LocalePolicyError && err.code === POLICY_ERROR.MAPPING,
    );
  }
  assert.doesNotThrow(() => assertRegionMappings(MAPPINGS));
  assert.doesNotThrow(() => assertRegionMappings({}));
});

test('T-032 · AC-16 三场景的策略层取证（合成映射，不含联网交节下载）', () => {
  const s1 = resolveLocalePolicy(
    profileOf({ declared_nationality: 'CN' }), {}, { regionMappings: MAPPINGS },
  );
  assert.equal(s1.locale_source, 'auto:nationality');
  assert.equal(s1.guideline_id, 'demo-guideline-cn');
  assert.equal(s1.calendar_id, 'demo-solar-terms');

  const s2 = resolveLocalePolicy(
    profileOf({ declared_nationality: 'CN', declared_residence: 'FR' }),
    { guideline: 'demo-guideline-user', calendar: 'demo-calendar-user', lang: 'de' },
    { regionMappings: MAPPINGS },
  );
  assert.equal(s2.locale_source, 'user');
  assert.equal(s2.guideline_id, 'demo-guideline-user');
  assert.equal(s2.language_tag, 'de');

  const s3 = explainLocalePolicy(profileOf(), {}, { regionMappings: {} });
  assert.equal(s3.policy.locale_source, 'auto:fallback');
  assert.equal(s3.policy.calendar_id, 'gregorian-season');
  assert.equal(s3.inferred, false, '全程不得通过 IP / 定位 / 静默推断');
});

test('T-032 · createLocalePolicyResolver 可作为 rr plan 的注入端口，零兜底', () => {
  const resolver = createLocalePolicyResolver({ regionMappings: MAPPINGS });
  assert.equal(typeof resolver, 'function');
  const policy = resolver(profileOf({ declared_nationality: 'CN' }), {});
  assert.equal(policy.locale_source, 'auto:nationality');
  const empty = createLocalePolicyResolver();
  assert.equal(empty(profileOf(), {}).locale_source, 'auto:fallback');
  assert.throws(() => createLocalePolicyResolver({ regionMappings: { ZZ: mapping() } }),
    (err) => err instanceof LocalePolicyError);
});

test('T-032 · 纯函数：零 IO / 零推断 / 同输入幂等 / 不内置真实映射', () => {
  const src = read('src/core/locale/policy.js');
  for (const forbidden of ['node:', 'fetch(', 'process.env', 'globalThis.navigator', 'Intl.', 'Math.random']) {
    assert.ok(!src.includes(forbidden), `policy.js 不得包含 ${forbidden}`);
  }
  const a = resolveLocalePolicy(profileOf({ declared_nationality: 'CN' }), { lang: 'de' }, { regionMappings: MAPPINGS });
  const b = resolveLocalePolicy(profileOf({ declared_nationality: 'CN' }), { lang: 'de' }, { regionMappings: MAPPINGS });
  assert.deepEqual(a, b);
  assert.equal(Object.keys(a).length, POLICY_FIELDS.length);
  assert.ok(Object.keys(a).every((k) => POLICY_FIELDS.includes(k)));
});
