// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-033 · 区域映射表加载与语义校验（FR-003 / FR-014 / FR-045 / AC-16 / E-14 / SC-012）。
 *
 * 数据落在 `data/region/`；本模块是唯一加载入口，只经**注入的 FsPort** 读取，
 * 核心域不直接 import 内置模块、不联网、不携带任何时令日期或指南原文。
 *
 * 校验层次：
 * 1. 形状：复用 T-032 `assertRegionMappings()` 的固定键集 / ISO 3166-1 / 地区级标注契约；
 * 2. 语义：`guideline_id` 必须有可通过 T-011 契约的适配器，`calendar_id` 必须在 T-014
 *    `CALENDAR_KIND` 内，`unit_system` / `language_tag` 必须在既有白名单内；
 * 3. 基线：`schema.baseline` 必须与 T-032 `NEUTRAL_BASELINE` 一致，
 *    `calendar_contract` 必须声明 `gregorian-season` 与 `solar-terms` 同等约束；
 * 4. 地区表述：中国香港 / 中国澳门 / 中国台湾是中国的地区级 ISO 3166-1 条目，
 *    不是独立国家（SPEC §6.9 / E-14）。
 *
 * 加载成功只表示「示例映射表可用」，**不代表**任何真实指南适用性已审校，
 * 也不自动接线到 `rr plan`（T-019 零兜底定案不变）。
 */
import {
  assertRegionMappings,
  NEUTRAL_BASELINE,
  SUBNATIONAL_REGION_CODES,
  createLocalePolicyResolver,
} from '../locale/index.js';
import { BUILTIN_TAGS } from '../locale/fallback.js';
import { CALENDAR_KIND, FALLBACK_LABEL } from '../calendar/index.js';
import { GUIDELINE_ID_RE, validateGuidelineAdapter } from './contract.js';
import { loadGuidelineAdapter } from './loader.js';

export const REGION_ROOT = 'data/region';
export const MAPPINGS_PATH = 'data/region/mappings.json';
export const SCHEMA_PATH = 'data/region/schema.json';

/** @type {Readonly<Record<string, string>>} */
export const REGION_ERROR = Object.freeze({
  INVALID: 'ERR_REGION_INVALID',
  FS: 'ERR_REGION_FS',
  MAPPINGS: 'ERR_REGION_MAPPINGS',
  SCHEMA: 'ERR_REGION_SCHEMA',
  GUIDELINE: 'ERR_REGION_GUIDELINE',
  CALENDAR: 'ERR_REGION_CALENDAR',
  UNITS: 'ERR_REGION_UNITS',
  LANGUAGE: 'ERR_REGION_LANGUAGE',
  SUBNATIONAL: 'ERR_REGION_SUBNATIONAL',
  BASELINE: 'ERR_REGION_BASELINE',
});

/** 单位系统白名单；核心域只登记，不擅自扩 T-019 的 CLI 覆盖键集。 */
export const UNIT_SYSTEMS = Object.freeze(['metric', 'us-customary']);

/**
 * 两种历法同等遵守的年刷新 / 下层只读 / FALLBACK 契约（SPEC §6.3 注、plan.md §8 步骤 4）。
 * 与 T-014 的 `CALENDAR_KIND` / `FALLBACK_LABEL` / `validateCalendarAdapter` 逐项对齐。
 */
export const CALENDAR_CONTRACT = Object.freeze({
  yearly_refresh: true,
  lower_layers_read_only: true,
  fallback_label: FALLBACK_LABEL,
  approximate_table_forbidden: true,
  min_independent_sources: 2,
});

/** schema.json 固定键集；多余键 / 缺键一律拒绝（FR-032 口径）。 */
export const SCHEMA_KEYS = Object.freeze([
  'schema_version', 'mapping_file', 'source', 'review_status', 'notice_key',
  'baseline', 'calendar_contract', 'subnational_codes', 'coverage', 'codes',
]);

/** 错误只回传稳定码 + Canonical ID，不插值文件正文（FR-049）。 */
export class RegionError extends Error {
  /**
   * @param {string} code
   * @param {ReadonlyArray<Readonly<{code: string, key: string}>>} [issues]
   */
  constructor(code, issues = []) {
    super(code);
    this.name = 'RegionError';
    this.code = code;
    this.issues = Object.freeze([...issues]);
  }
}

/** @param {unknown} value @returns {boolean} */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** @param {string} code @returns {never} */
function fail(code) {
  throw new RegionError(code);
}

/** @param {unknown} a @param {unknown} b @returns {boolean} */
function sameValue(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(/** @type {object} */ (a)).sort();
    const kb = Object.keys(/** @type {object} */ (b)).sort();
    return ka.length === kb.length
      && ka.every((k, i) => k === kb[i] && sameValue(/** @type {any} */ (a)[k], /** @type {any} */ (b)[k]));
  }
  return false;
}

/**
 * 校验 schema 元数据；基线 / 历法契约 / 地区级清单任一漂移都拒绝加载，
 * 避免「示例表被悄悄换成近似值或放宽 FALLBACK」而无人察觉（防假绿）。
 * @param {unknown} schema
 * @param {Record<string, unknown>} mappings
 * @returns {void}
 * @throws {RegionError}
 */
function assertSchema(schema, mappings) {
  if (!isRecord(schema)) fail(REGION_ERROR.SCHEMA);
  const s = /** @type {Record<string, unknown>} */ (schema);
  const keys = Object.keys(s);
  if (keys.length !== SCHEMA_KEYS.length || !keys.every((k) => SCHEMA_KEYS.includes(k))) {
    fail(REGION_ERROR.SCHEMA);
  }
  if (s.schema_version !== '1.0.0' || s.mapping_file !== 'mappings.json') fail(REGION_ERROR.SCHEMA);
  if (typeof s.source !== 'string' || typeof s.review_status !== 'string'
    || typeof s.notice_key !== 'string' || typeof s.coverage !== 'string') fail(REGION_ERROR.SCHEMA);
  if (!Array.isArray(s.codes)) fail(REGION_ERROR.SCHEMA);
  if (!sameValue([.../** @type {unknown[]} */ (s.codes)].sort(), Object.keys(mappings).sort())) {
    fail(REGION_ERROR.SCHEMA);
  }
  if (!sameValue(s.baseline, NEUTRAL_BASELINE)) fail(REGION_ERROR.BASELINE);
  if (!sameValue(s.calendar_contract, CALENDAR_CONTRACT)) fail(REGION_ERROR.BASELINE);
  if (!sameValue(s.subnational_codes, SUBNATIONAL_REGION_CODES)) fail(REGION_ERROR.SUBNATIONAL);
}

/**
 * 逐条语义校验；T-032 只校形状，本层校「指向的东西确实存在且合法」。
 * @param {Record<string, any>} mappings
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @returns {Promise<void>}
 * @throws {RegionError}
 */
async function assertSemantics(mappings, fsPort) {
  const kinds = Object.values(CALENDAR_KIND);
  const guidelineIds = new Set();
  for (const [code, entry] of Object.entries(mappings)) {
    if (!kinds.includes(entry.calendar_id)) fail(REGION_ERROR.CALENDAR);
    if (!UNIT_SYSTEMS.includes(entry.unit_system)) fail(REGION_ERROR.UNITS);
    if (!BUILTIN_TAGS.includes(entry.language_tag)) fail(REGION_ERROR.LANGUAGE);
    if (typeof entry.guideline_id !== 'string' || !GUIDELINE_ID_RE.test(entry.guideline_id)) {
      fail(REGION_ERROR.GUIDELINE);
    }
    if (SUBNATIONAL_REGION_CODES.includes(code) && entry.region_level !== 'subnational') {
      fail(REGION_ERROR.SUBNATIONAL);
    }
    guidelineIds.add(entry.guideline_id);
  }
  // 基线适配器也必须存在，否则「中立通用基线回退」只是一句口号。
  for (const id of [...guidelineIds, NEUTRAL_BASELINE.guideline_id]) {
    try {
      const adapter = await loadGuidelineAdapter(fsPort, id);
      if (validateGuidelineAdapter(adapter).length > 0) fail(REGION_ERROR.GUIDELINE);
    } catch {
      fail(REGION_ERROR.GUIDELINE);
    }
  }
}

/**
 * 加载并校验区域映射表；只读、零写入、零网络。
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @returns {Promise<Readonly<{
 *   mappings: Readonly<Record<string, Readonly<Record<string, string>>>>,
 *   schema: Readonly<Record<string, unknown>>,
 * }>>}
 * @throws {RegionError}
 */
export async function loadRegionMappings(fsPort) {
  if (!fsPort || typeof fsPort.readJson !== 'function') fail(REGION_ERROR.FS);
  /** @type {unknown} */
  let mappings;
  /** @type {unknown} */
  let schema;
  try {
    mappings = await fsPort.readJson(MAPPINGS_PATH);
  } catch {
    fail(REGION_ERROR.MAPPINGS);
  }
  try {
    schema = await fsPort.readJson(SCHEMA_PATH);
  } catch {
    fail(REGION_ERROR.SCHEMA);
  }
  if (!isRecord(mappings)) fail(REGION_ERROR.MAPPINGS);
  const table = /** @type {Record<string, any>} */ (mappings);
  // 形状校验必须先于元数据校验：多余 / 非 ISO 的映射键应报 MAPPINGS，
  // 否则会被 schema 的 codes 一致性检查抢先报成 SCHEMA，掩盖真正的畸形点。
  try {
    assertRegionMappings(table);
  } catch {
    fail(REGION_ERROR.MAPPINGS);
  }
  assertSchema(schema, table);
  await assertSemantics(table, /** @type {import('../../io/ports.js').FsPort} */ (fsPort));
  return Object.freeze({
    mappings: Object.freeze({ ...table }),
    schema: Object.freeze({ .../** @type {Record<string, unknown>} */ (schema) }),
  });
}

/**
 * 组合根便捷端口：加载示例映射表并注入 T-032 的策略解析器。
 * 仍需宿主**显式**放进 `deps.resolveLocalePolicy`；本函数不自动接线。
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @returns {Promise<(profile: unknown, overrides: unknown) => Readonly<Record<string, string>>>}
 * @throws {RegionError}
 */
export async function createLocalePolicyResolverFromFs(fsPort) {
  const { mappings } = await loadRegionMappings(fsPort);
  return createLocalePolicyResolver({ regionMappings: mappings });
}
