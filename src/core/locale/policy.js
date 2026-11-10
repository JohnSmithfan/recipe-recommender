// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-032 · LocalePolicy 区域策略解析（FR-003 / FR-045 / FR-046 / AC-16 / SC-012 / NFR-012 / P-12）。
 *
 * 核心域纯函数：零 IO、零网络、零第三方依赖、零内置模块导入、零自然语句硬编码。
 * 映射表（ISO 3166-1 → 指南 / 历法 / 单位 / 语言）属 T-033 的 `data/region/`，
 * 本模块**不内置任何真实区域映射**，只接受调用方显式注入 `options.regionMappings`。
 *
 * 优先级：显式覆盖（CLI > 档案内覆盖）> 声明国籍 > 声明居住地 > 中立通用基线。
 * 全程**不得**通过 IP / 定位 / 宿主环境 / 静默推断取得国籍或位置（FR-045 / P-12）。
 *
 * 中国香港 `HK` / 中国澳门 `MO` / 中国台湾 `TW` 是中国的地区级 ISO 3166-1 条目（E-14）：
 * 作为国籍声明时不按独立国家解析，显式回退并标注；作为居住地时允许命中映射，
 * 但映射条目必须显式标注 `region_level: 'subnational'`。
 */
import { isIso3166Alpha2 } from '../profile/iso3166-1.js';

/** FR-046 来源枚举；与 cli/plan.js、cli/validate.js、core/planner/plan.js 逐字一致。 */
export const LOCALE_SOURCES = Object.freeze([
  'user', 'auto:nationality', 'auto:residence', 'auto:fallback',
]);

/** `rr plan` 的 assertPolicy 固定五键白名单，顺序即契约。 */
export const POLICY_FIELDS = Object.freeze([
  'language_tag', 'guideline_id', 'calendar_id', 'unit_system', 'locale_source',
]);

/** 可被显式覆盖的键；`units` 由核心域支持，CLI 覆盖键集仍由 T-019 冻结（见 README §7）。 */
export const OVERRIDE_FIELDS = Object.freeze(['lang', 'guideline', 'calendar', 'country', 'units']);

/** 中国的地区级 ISO 3166-1 条目，严禁作为独立国家解析。 */
export const SUBNATIONAL_REGION_CODES = Object.freeze(['HK', 'MO', 'TW']);

/** 中立通用基线（FR-045 / E-14 / AC-16 场景 3）；与两份虚构 fixture 的 expected_resolution 一致。 */
export const NEUTRAL_BASELINE = Object.freeze({
  language_tag: 'en',
  guideline_id: 'generic-guideline',
  calendar_id: 'gregorian-season',
  unit_system: 'metric',
});

/** @type {Readonly<Record<string, string>>} */
export const POLICY_ERROR = Object.freeze({
  INVALID: 'ERR_LOCALE_POLICY_INVALID',
  PROFILE: 'ERR_LOCALE_POLICY_PROFILE',
  REGION: 'ERR_LOCALE_POLICY_REGION',
  LANGUAGE: 'ERR_LOCALE_POLICY_LANGUAGE',
  GUIDELINE: 'ERR_LOCALE_POLICY_GUIDELINE',
  CALENDAR: 'ERR_LOCALE_POLICY_CALENDAR',
  UNITS: 'ERR_LOCALE_POLICY_UNITS',
  OVERRIDE: 'ERR_LOCALE_POLICY_OVERRIDE',
  MAPPING: 'ERR_LOCALE_POLICY_MAPPING',
});

/** 回退理由以稳定 Canonical ID 表达，不写自然语句（FR-041）。 */
export const POLICY_FALLBACK = Object.freeze({
  NO_DECLARATION: 'locale.fallback.no_declaration',
  UNMATCHED: 'locale.fallback.unmatched',
  SUBNATIONAL: 'locale.fallback.subnational',
});

/** 决策链步骤，供计划头部 / 报告追溯（NFR-012）。 */
export const POLICY_STEP = Object.freeze({
  NATIONALITY: 'locale.step.nationality',
  RESIDENCE: 'locale.step.residence',
  OVERRIDE: 'locale.step.override',
  FALLBACK: 'locale.step.fallback',
});

const LP_KEYS = Object.freeze([
  'declared_nationality', 'declared_residence', 'guideline_override',
  'calendar_override', 'output_language', 'expected_resolution', 'expected_source',
]);
const MAPPING_KEYS = Object.freeze(['guideline_id', 'calendar_id', 'unit_system', 'language_tag']);
const BCP47 = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/;
const SLUG_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ALPHA2 = /^[A-Z]{2}$/;

/** 错误对象只含稳定码 + Canonical ID，绝不插值输入正文（FR-049）。 */
export class LocalePolicyError extends Error {
  /**
   * @param {string} code
   * @param {ReadonlyArray<Readonly<{code: string, key: string}>>} [issues]
   */
  constructor(code, issues = []) {
    super(code);
    this.name = 'LocalePolicyError';
    this.code = code;
    this.issues = Object.freeze([...issues]);
  }
}

/** @param {unknown} value @returns {boolean} */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** @param {string} code @param {ReadonlyArray<{code: string, key: string}>} [issues] @returns {never} */
function fail(code, issues = []) {
  throw new LocalePolicyError(code, issues);
}

/**
 * 校验注入的区域映射表形状；不校验其「真实性」（T-033 职责），也不内置任何表。
 * @param {unknown} mappings
 * @returns {Readonly<Record<string, Readonly<Record<string, string>>>>}
 * @throws {LocalePolicyError} `ERR_LOCALE_POLICY_MAPPING`
 */
export function assertRegionMappings(mappings) {
  if (!isRecord(mappings)) {
    fail(POLICY_ERROR.MAPPING, [{ code: POLICY_ERROR.MAPPING, key: '(mappings)' }]);
  }
  const table = /** @type {Record<string, unknown>} */ (mappings);
  /** @type {{code: string, key: string}[]} */
  const issues = [];
  for (const [code, raw] of Object.entries(table)) {
    if (!ALPHA2.test(code) || !isIso3166Alpha2(code) || !isRecord(raw)) {
      issues.push({ code: POLICY_ERROR.MAPPING, key: code });
      continue;
    }
    const entry = /** @type {Record<string, unknown>} */ (raw);
    const keys = Object.keys(entry);
    if (MAPPING_KEYS.some((k) => !keys.includes(k))
      || keys.some((k) => !MAPPING_KEYS.includes(k) && k !== 'region_level')) {
      issues.push({ code: POLICY_ERROR.MAPPING, key: code });
      continue;
    }
    const okValues = ['guideline_id', 'calendar_id', 'unit_system']
      .every((k) => typeof entry[k] === 'string' && SLUG_ID.test(/** @type {string} */ (entry[k])))
      && typeof entry.language_tag === 'string' && BCP47.test(entry.language_tag);
    const level = entry.region_level;
    const okLevel = level === undefined || level === 'country' || level === 'subnational';
    const okSubnational = !SUBNATIONAL_REGION_CODES.includes(code) || level === 'subnational';
    if (!okValues || !okLevel || !okSubnational) {
      issues.push({ code: POLICY_ERROR.MAPPING, key: code });
    }
  }
  if (issues.length > 0) fail(POLICY_ERROR.MAPPING, issues);
  return Object.freeze({ ...table });
}

/** @param {string} key @returns {string} */
const overrideErrorCode = (key) => ({
  lang: POLICY_ERROR.LANGUAGE,
  guideline: POLICY_ERROR.GUIDELINE,
  calendar: POLICY_ERROR.CALENDAR,
  units: POLICY_ERROR.UNITS,
  country: POLICY_ERROR.REGION,
}[key] ?? POLICY_ERROR.OVERRIDE);

/** @param {string} key @param {string} value @returns {boolean} */
const overrideValid = (key, value) => {
  if (key === 'country') return ALPHA2.test(value) && isIso3166Alpha2(value);
  if (key === 'lang') return BCP47.test(value);
  return SLUG_ID.test(value);
};

/**
 * 读取档案中的区域声明与档案级覆盖；固定键集、缺失不拒绝、非法值失败关闭。
 * @param {unknown} profile
 * @returns {Readonly<{nationality: string|null, residence: string|null, guideline: string|null,
 *   calendar: string|null, language: string|null}>}
 * @throws {LocalePolicyError}
 */
function readProfile(profile) {
  if (!isRecord(profile)) fail(POLICY_ERROR.PROFILE);
  const p = /** @type {Record<string, unknown>} */ (profile);
  const lp = p.locale_policy;
  if (lp === undefined || lp === null) {
    return Object.freeze({ nationality: null, residence: null, guideline: null, calendar: null, language: null });
  }
  if (!isRecord(lp)) fail(POLICY_ERROR.PROFILE);
  const l = /** @type {Record<string, unknown>} */ (lp);
  if (Object.keys(l).some((k) => !LP_KEYS.includes(k))) fail(POLICY_ERROR.PROFILE);

  /** @param {unknown} v @param {string} code @returns {string|null} */
  const region = (v, code) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string' || !ALPHA2.test(v) || !isIso3166Alpha2(v)) fail(code);
    return v;
  };
  /** @param {unknown} v @param {string} code @param {RegExp} re @returns {string|null} */
  const text = (v, code, re) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string' || !re.test(v)) fail(code);
    return v;
  };
  return Object.freeze({
    nationality: region(l.declared_nationality, POLICY_ERROR.REGION),
    residence: region(l.declared_residence, POLICY_ERROR.REGION),
    guideline: text(l.guideline_override, POLICY_ERROR.GUIDELINE, SLUG_ID),
    calendar: text(l.calendar_override, POLICY_ERROR.CALENDAR, SLUG_ID),
    language: text(l.output_language, POLICY_ERROR.LANGUAGE, BCP47),
  });
}

/**
 * 读取显式覆盖；未知键、空串、非法值一律拒绝，不静默忽略（T-019 失败关闭口径）。
 * @param {unknown} overrides
 * @returns {Readonly<Record<string, string>>}
 * @throws {LocalePolicyError}
 */
function readOverrides(overrides) {
  if (overrides === undefined || overrides === null) return Object.freeze({});
  if (!isRecord(overrides)) fail(POLICY_ERROR.OVERRIDE);
  const raw = /** @type {Record<string, unknown>} */ (overrides);
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!OVERRIDE_FIELDS.includes(key)) fail(POLICY_ERROR.OVERRIDE);
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || value.length === 0 || !overrideValid(key, value)) {
      fail(overrideErrorCode(key));
    }
    out[key] = value;
  }
  return Object.freeze(out);
}

/**
 * 解析并解释最终生效的区域策略；除固定五键 `policy` 外提供逐字段来源与决策链。
 * @param {unknown} profile 档案（可含 `locale_policy`）
 * @param {unknown} overrides `resolveOverrides().values` 形态的覆盖对象
 * @param {{regionMappings?: Readonly<Record<string, unknown>>}} [options] 映射表由宿主注入（T-033）
 * @returns {Readonly<{
 *   policy: Readonly<Record<string, string>>,
 *   fields: Readonly<Record<string, string>>,
 *   region: Readonly<Record<string, string|null>>,
 *   chain: string[], fallback_reason: string|null,
 *   subnational_handled: boolean, inferred: boolean,
 * }>}
 * @throws {LocalePolicyError}
 */
export function explainLocalePolicy(profile, overrides, options = {}) {
  const lp = readProfile(profile);
  const ov = readOverrides(overrides);
  const opts = options ?? {};
  const mappings = assertRegionMappings(opts.regionMappings ?? {});

  const base = { ...NEUTRAL_BASELINE };
  /** @type {Record<string, string>} */
  const fields = {
    language_tag: 'baseline', guideline_id: 'baseline',
    calendar_id: 'baseline', unit_system: 'baseline',
  };
  /** @type {string[]} */
  const chain = [];
  let regionSource = 'auto:fallback';
  let matched = /** @type {string|null} */ (null);
  let fallbackReason = /** @type {string|null} */ (POLICY_FALLBACK.NO_DECLARATION);
  let subnationalHandled = false;
  let declaredAny = false;

  /**
   * @param {string} code @param {string} step
   * @returns {boolean}
   */
  const applyRegion = (code, step) => {
    const entry = mappings[code];
    if (!isRecord(entry)) return false;
    base.guideline_id = /** @type {string} */ (entry.guideline_id);
    base.calendar_id = /** @type {string} */ (entry.calendar_id);
    base.unit_system = /** @type {string} */ (entry.unit_system);
    base.language_tag = /** @type {string} */ (entry.language_tag);
    for (const key of Object.keys(fields)) fields[key] = 'region';
    matched = code;
    fallbackReason = null;
    chain.push(step);
    return true;
  };

  if (ov.country !== undefined) {
    declaredAny = true;
    regionSource = 'user';
    if (!applyRegion(ov.country, POLICY_STEP.OVERRIDE)) {
      chain.push(POLICY_STEP.OVERRIDE, POLICY_STEP.FALLBACK);
      fallbackReason = POLICY_FALLBACK.UNMATCHED;
    }
  } else {
    if (lp.nationality !== null) {
      declaredAny = true;
      if (SUBNATIONAL_REGION_CODES.includes(lp.nationality)) {
        subnationalHandled = true;
        fallbackReason = POLICY_FALLBACK.SUBNATIONAL;
      } else if (applyRegion(lp.nationality, POLICY_STEP.NATIONALITY)) {
        regionSource = 'auto:nationality';
      }
    }
    if (matched === null && lp.residence !== null) {
      declaredAny = true;
      if (applyRegion(lp.residence, POLICY_STEP.RESIDENCE)) regionSource = 'auto:residence';
    }
    if (matched === null) {
      regionSource = 'auto:fallback';
      if (!subnationalHandled) {
        fallbackReason = declaredAny ? POLICY_FALLBACK.UNMATCHED : POLICY_FALLBACK.NO_DECLARATION;
      }
      chain.push(POLICY_STEP.FALLBACK);
    }
  }

  // 档案级声明 / 覆盖先于 CLI 覆盖；每一步都留逐字段来源，不静默混排。
  if (lp.language !== null) { base.language_tag = lp.language; fields.language_tag = 'profile'; }
  if (lp.guideline !== null) { base.guideline_id = lp.guideline; fields.guideline_id = 'profile'; }
  if (lp.calendar !== null) { base.calendar_id = lp.calendar; fields.calendar_id = 'profile'; }
  if (ov.lang !== undefined) { base.language_tag = ov.lang; fields.language_tag = 'cli'; }
  if (ov.guideline !== undefined) { base.guideline_id = ov.guideline; fields.guideline_id = 'cli'; }
  if (ov.calendar !== undefined) { base.calendar_id = ov.calendar; fields.calendar_id = 'cli'; }
  if (ov.units !== undefined) { base.unit_system = ov.units; fields.unit_system = 'cli'; }

  const hasUserOverride = lp.guideline !== null || lp.calendar !== null
    || OVERRIDE_FIELDS.some((key) => ov[key] !== undefined);
  // 字段级覆盖同样必须在决策链留痕，否则「部分覆盖」在头部不可追溯（NFR-012）。
  if (hasUserOverride && !chain.includes(POLICY_STEP.OVERRIDE)) chain.push(POLICY_STEP.OVERRIDE);
  const localeSource = hasUserOverride ? 'user' : regionSource;
  if (!LOCALE_SOURCES.includes(localeSource)) fail(POLICY_ERROR.INVALID);

  return Object.freeze({
    policy: Object.freeze({
      language_tag: base.language_tag,
      guideline_id: base.guideline_id,
      calendar_id: base.calendar_id,
      unit_system: base.unit_system,
      locale_source: localeSource,
    }),
    fields: Object.freeze({ ...fields }),
    region: Object.freeze({
      nationality: lp.nationality,
      residence: lp.residence,
      country_override: ov.country ?? null,
      matched,
      source: regionSource,
    }),
    chain: Object.freeze(chain),
    fallback_reason: fallbackReason,
    subnational_handled: subnationalHandled,
    inferred: false,
  });
}

/**
 * 返回 `rr plan` 可直接消费的固定五键策略对象。
 * @param {unknown} profile
 * @param {unknown} overrides
 * @param {{regionMappings?: Readonly<Record<string, unknown>>}} [options]
 * @returns {Readonly<Record<string, string>>}
 * @throws {LocalePolicyError}
 */
export function resolveLocalePolicy(profile, overrides, options = {}) {
  return explainLocalePolicy(profile, overrides, options).policy;
}

/**
 * 组合根用端口工厂：映射表在创建时校验一次，随后可注入 `deps.resolveLocalePolicy`。
 * 保持 T-019 零兜底定案 —— 本模块**不**自动接线到 `rr plan` 默认 deps。
 * @param {{regionMappings?: Readonly<Record<string, unknown>>}} [options]
 * @returns {(profile: unknown, overrides: unknown) => Readonly<Record<string, string>>}
 */
export function createLocalePolicyResolver(options = {}) {
  const opts = options ?? {};
  const frozen = Object.freeze({ regionMappings: assertRegionMappings(opts.regionMappings ?? {}) });
  return Object.freeze((profile, overrides) => resolveLocalePolicy(profile, overrides, frozen));
}
