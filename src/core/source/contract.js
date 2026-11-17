// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-035 - data source metadata contracts (tasks.md T-035; SPEC.md FR-031/032/037,
 * AC-13, AC-18, SC-010, NFR-008, E-15; plan.md R-04; constitution.md P-14).
 *
 * Metadata ONLY. This module never reads a file, never opens a network socket
 * and never bundles third-party data. Every source descriptor MUST declare a
 * license, a version and an HTTPS source URL; a descriptor that contradicts the
 * declared license expectation, the review policy or the bundled-source set is
 * rejected with a stable code (FR-031 "reject on doubt or conflict").
 *
 * Human-readable strings are Canonical IDs. Rejections carry stable codes and
 * no file contents (FR-049). The real HowToCook / USDA FDC datasets are NOT
 * bundled and are NOT downloaded here; see data/source/README.md.
 */
export const SOURCE_ROOT = 'data/source';
export const CATALOG_PATH = 'data/source/catalog.json';
export const SCHEMA_PATH = 'data/source/schema.json';

/** Stable rejection codes; SourceError.code is always one of these. */
export const SOURCE_ERROR = Object.freeze({
  INVALID: 'ERR_SOURCE_INVALID',
  FS: 'ERR_SOURCE_FS',
  SCHEMA: 'ERR_SOURCE_SCHEMA',
  CATALOG: 'ERR_SOURCE_CATALOG',
  NOT_FOUND: 'ERR_SOURCE_NOT_FOUND',
  LICENSE: 'ERR_SOURCE_LICENSE',
  CONFLICT: 'ERR_SOURCE_CONFLICT',
  VERSION: 'ERR_SOURCE_VERSION',
  URL: 'ERR_SOURCE_URL',
  REVIEW: 'ERR_SOURCE_REVIEW',
  BUNDLED: 'ERR_SOURCE_BUNDLED',
  PAYLOAD: 'ERR_SOURCE_PAYLOAD',
});

/** Fixed source kinds (FR-031: recipes vs nutrition). */
export const SOURCE_KINDS = Object.freeze(['recipe', 'nutrition']);

/** Declared license statements. The last two are local/synthetic, not SPDX. */
export const SOURCE_LICENSES = Object.freeze([
  'Unlicense', 'CC0-1.0', 'user-owned', 'synthetic-neutral-example',
]);

/** Review states. Only `approved` may ever reach the payload loader. */
export const SOURCE_REVIEW_STATES = Object.freeze([
  'approved', 'ai-candidate-unreviewed', 'rejected', 'conflict',
]);

/** Expected license per externally declared source (conflict detection). */
export const LICENSE_EXPECTATIONS = Object.freeze({
  'howtocook-recipes': 'Unlicense',
  'usda-fdc-nutrition': 'CC0-1.0',
  'cn-ingredient-subset': 'CC0-1.0',
});

export const SOURCE_KEYS = Object.freeze([
  'id', 'kind', 'license', 'version', 'source_url', 'review_status',
  'bundled', 'payload_path', 'notice_key',
]);
export const CATALOG_KEYS = Object.freeze([
  'schema_version', 'catalog_id', 'source', 'review_status', 'notice_key', 'sources',
]);
export const SCHEMA_KEYS = Object.freeze([
  'schema_version', 'catalog_file', 'source', 'review_status', 'notice_key',
  'license_allowlist', 'kind_allowlist', 'review_status_allowlist', 'license_expectations',
  'source_keys', 'payload_keys', 'record_keys', 'policy', 'bundled_sources',
  'external_candidates', 'coverage',
]);
export const PAYLOAD_KEYS = Object.freeze([
  'id', 'kind', 'license', 'version', 'fictional', 'notice_key', 'records',
]);
export const RECORD_KEYS = Object.freeze([
  'id', 'name_key', 'category_key', 'energy_kcal_per_100g',
  'protein_g_per_100g', 'substitute_ids',
]);

const POLICY_KEYS = Object.freeze([
  'require_approved_review', 'require_bundled_payload', 'reject_unverified_license',
  'require_https_source_url', 'forbid_query_fragment_userinfo', 'no_network_download',
]);
const CANONICAL_ID = /^[a-z][a-z0-9._-]{0,63}$/;
const VERSION_RE = /^[a-z0-9][a-z0-9._+-]{0,31}$/;
const PAYLOAD_PATH_RE = /^data\/source\/[a-z0-9][a-z0-9._-]{0,63}\.json$/;
const HOST_RE = /^[a-z0-9.-]+$/;
const PRIVATE_TOKENS = Object.freeze([
  'weight_kg', 'body_mass', 'bmr_kcal', 'height_cm', 'body_fat_pct', 'diet-plan',
]);

/** @param {unknown} value @returns {boolean} */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** @param {string} code @returns {never} */
function fail(code) {
  throw new SourceError(code);
}

/** Errors carry only stable codes + optional Canonical ID issues (FR-049). */
export class SourceError extends Error {
  /**
   * @param {string} code
   * @param {ReadonlyArray<Readonly<{code: string, key: string}>>} [issues]
   */
  constructor(code, issues = []) {
    super(code);
    this.name = 'SourceError';
    this.code = code;
    this.issues = Object.freeze([...issues]);
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {ReadonlyArray<string>} keys
 * @param {string} code
 */
function assertKeys(value, keys, code) {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((k) => !keys.includes(k))) fail(code);
}

/**
 * @param {unknown} value
 * @param {ReadonlyArray<string>} expected
 * @param {string} code
 */
function assertArrayEquals(value, expected, code) {
  if (!Array.isArray(value) || value.length !== expected.length
    || value.some((v, i) => v !== expected[i])) fail(code);
}

/** Pure HTTPS URL, no query / fragment / userinfo / port (FR-048 hygiene). */
function assertHttpsUrl(value) {
  if (typeof value !== 'string' || value.length === 0) fail(SOURCE_ERROR.URL);
  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(SOURCE_ERROR.URL);
  }
  if (parsed.protocol !== 'https:' || parsed.search !== '' || parsed.hash !== ''
    || parsed.username !== '' || parsed.password !== '' || parsed.port !== ''
    || !HOST_RE.test(parsed.hostname)) {
    fail(SOURCE_ERROR.URL);
  }
}

/**
 * Validate the schema contract against the frozen constants; any drift is a
 * failure, never a silent relaxation.
 * @param {unknown} schema
 * @returns {Readonly<Record<string, any>>}
 */
export function assertSourceSchema(schema) {
  if (!isRecord(schema)) fail(SOURCE_ERROR.SCHEMA);
  const s = /** @type {Record<string, any>} */ (schema);
  assertKeys(s, SCHEMA_KEYS, SOURCE_ERROR.SCHEMA);
  if (s.schema_version !== '1.0.0' || s.catalog_file !== 'catalog.json'
    || s.coverage !== 'metadata-only'
    || typeof s.source !== 'string' || !CANONICAL_ID.test(s.source)
    || typeof s.review_status !== 'string' || typeof s.notice_key !== 'string') {
    fail(SOURCE_ERROR.SCHEMA);
  }
  assertArrayEquals(s.license_allowlist, SOURCE_LICENSES, SOURCE_ERROR.SCHEMA);
  assertArrayEquals(s.kind_allowlist, SOURCE_KINDS, SOURCE_ERROR.SCHEMA);
  assertArrayEquals(s.review_status_allowlist, SOURCE_REVIEW_STATES, SOURCE_ERROR.SCHEMA);
  assertArrayEquals(s.source_keys, SOURCE_KEYS, SOURCE_ERROR.SCHEMA);
  assertArrayEquals(s.payload_keys, PAYLOAD_KEYS, SOURCE_ERROR.SCHEMA);
  assertArrayEquals(s.record_keys, RECORD_KEYS, SOURCE_ERROR.SCHEMA);
  if (!isRecord(s.license_expectations)
    || JSON.stringify(s.license_expectations) !== JSON.stringify(LICENSE_EXPECTATIONS)) {
    fail(SOURCE_ERROR.SCHEMA);
  }
  if (!isRecord(s.policy)) fail(SOURCE_ERROR.SCHEMA);
  assertKeys(/** @type {Record<string, unknown>} */ (s.policy), POLICY_KEYS, SOURCE_ERROR.SCHEMA);
  for (const key of POLICY_KEYS) {
    if (s.policy[key] !== true) fail(SOURCE_ERROR.SCHEMA);
  }
  if (!Array.isArray(s.bundled_sources) || !Array.isArray(s.external_candidates)) {
    fail(SOURCE_ERROR.SCHEMA);
  }
  return Object.freeze({ ...s });
}

/**
 * Validate one source descriptor. Shape first, then semantics: a malformed
 * descriptor must not be masked by a policy-level rejection.
 * @param {unknown} entry
 * @param {unknown} schema
 * @returns {Readonly<Record<string, any>>}
 */
export function assertSourceMetadata(entry, schema) {
  if (!isRecord(entry)) fail(SOURCE_ERROR.CATALOG);
  if (!isRecord(schema)) fail(SOURCE_ERROR.SCHEMA);
  const e = /** @type {Record<string, any>} */ (entry);
  assertKeys(e, SOURCE_KEYS, SOURCE_ERROR.CATALOG);
  if (typeof e.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(e.id)) fail(SOURCE_ERROR.CATALOG);
  if (!SOURCE_KINDS.includes(e.kind)) fail(SOURCE_ERROR.CATALOG);
  if (!SOURCE_LICENSES.includes(e.license)) fail(SOURCE_ERROR.LICENSE);
  if (LICENSE_EXPECTATIONS[e.id] !== undefined && e.license !== LICENSE_EXPECTATIONS[e.id]) {
    fail(SOURCE_ERROR.CONFLICT);
  }
  if (typeof e.version !== 'string' || !VERSION_RE.test(e.version)) fail(SOURCE_ERROR.VERSION);
  assertHttpsUrl(e.source_url);
  if (!SOURCE_REVIEW_STATES.includes(e.review_status) || typeof e.bundled !== 'boolean'
    || typeof e.notice_key !== 'string' || !CANONICAL_ID.test(e.notice_key)) {
    fail(SOURCE_ERROR.CATALOG);
  }
  if (e.bundled === true) {
    if (typeof e.payload_path !== 'string' || !PAYLOAD_PATH_RE.test(e.payload_path)) {
      fail(SOURCE_ERROR.CATALOG);
    }
  } else if (e.payload_path !== null) {
    fail(SOURCE_ERROR.CATALOG);
  }
  return Object.freeze({ ...e });
}

/**
 * Validate the whole catalog: descriptors, unique ids and the declared
 * bundled / external sets must agree (anti-false-green).
 * @param {unknown} catalog
 * @param {unknown} schema
 * @returns {Readonly<Record<string, any>>}
 */
export function assertSourceCatalog(catalog, schema) {
  const s = assertSourceSchema(schema);
  if (!isRecord(catalog)) fail(SOURCE_ERROR.CATALOG);
  const c = /** @type {Record<string, any>} */ (catalog);
  assertKeys(c, CATALOG_KEYS, SOURCE_ERROR.CATALOG);
  if (c.schema_version !== s.schema_version || typeof c.catalog_id !== 'string'
    || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(c.catalog_id)
    || !Array.isArray(c.sources) || c.sources.length === 0) {
    fail(SOURCE_ERROR.CATALOG);
  }
  /** @type {string[]} */
  const ids = [];
  /** @type {Array<Readonly<Record<string, any>>>} */
  const entries = [];
  for (const raw of c.sources) {
    const entry = assertSourceMetadata(raw, s);
    if (ids.includes(entry.id)) fail(SOURCE_ERROR.CONFLICT);
    ids.push(entry.id);
    entries.push(entry);
  }
  assertArrayEquals(entries.filter((e) => e.bundled).map((e) => e.id),
    s.bundled_sources, SOURCE_ERROR.CATALOG);
  assertArrayEquals(entries.filter((e) => !e.bundled).map((e) => e.id),
    s.external_candidates, SOURCE_ERROR.CATALOG);
  return Object.freeze({ ...c, sources: Object.freeze(entries) });
}

/**
 * Validate a bundled payload against its descriptor. Payload metadata MUST
 * match the catalog, records MUST be fictional, canonical and free of private
 * fields. Substitute ids MUST resolve inside the same payload.
 * @param {unknown} payload
 * @param {unknown} metadata
 * @returns {Readonly<Record<string, any>>}
 */
export function assertSourcePayload(payload, metadata) {
  if (!isRecord(payload) || !isRecord(metadata)) fail(SOURCE_ERROR.PAYLOAD);
  const p = /** @type {Record<string, any>} */ (payload);
  const m = /** @type {Record<string, any>} */ (metadata);
  assertKeys(p, PAYLOAD_KEYS, SOURCE_ERROR.PAYLOAD);
  if (p.id !== m.id || p.kind !== m.kind || p.license !== m.license || p.version !== m.version) {
    fail(SOURCE_ERROR.PAYLOAD);
  }
  if (p.fictional !== true || typeof p.notice_key !== 'string'
    || !CANONICAL_ID.test(p.notice_key) || !Array.isArray(p.records)
    || p.records.length === 0) {
    fail(SOURCE_ERROR.PAYLOAD);
  }
  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Array<Readonly<Record<string, any>>>} */
  const records = [];
  for (const raw of p.records) {
    if (!isRecord(raw)) fail(SOURCE_ERROR.PAYLOAD);
    const r = /** @type {Record<string, any>} */ (raw);
    assertKeys(r, RECORD_KEYS, SOURCE_ERROR.PAYLOAD);
    if (typeof r.id !== 'string' || !CANONICAL_ID.test(r.id) || ids.has(r.id)) fail(SOURCE_ERROR.PAYLOAD);
    ids.add(r.id);
    if (typeof r.name_key !== 'string' || !CANONICAL_ID.test(r.name_key)
      || typeof r.category_key !== 'string' || !CANONICAL_ID.test(r.category_key)) {
      fail(SOURCE_ERROR.PAYLOAD);
    }
    for (const numeric of ['energy_kcal_per_100g', 'protein_g_per_100g']) {
      if (typeof r[numeric] !== 'number' || !Number.isFinite(r[numeric]) || r[numeric] < 0) {
        fail(SOURCE_ERROR.PAYLOAD);
      }
    }
    if (!Array.isArray(r.substitute_ids)) fail(SOURCE_ERROR.PAYLOAD);
    records.push(Object.freeze({
      ...r,
      substitute_ids: Object.freeze([...r.substitute_ids]),
    }));
  }
  for (const r of records) {
    for (const sub of r.substitute_ids) {
      if (typeof sub !== 'string' || !CANONICAL_ID.test(sub) || !ids.has(sub) || sub === r.id) {
        fail(SOURCE_ERROR.PAYLOAD);
      }
    }
  }
  if (PRIVATE_TOKENS.some((token) => JSON.stringify(p).includes(token))) fail(SOURCE_ERROR.PAYLOAD);
  return Object.freeze({ ...p, records: Object.freeze(records) });
}
