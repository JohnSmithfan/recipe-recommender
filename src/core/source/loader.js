// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-035 - pluggable data source loader (FR-031 / FR-032 / FR-037; plan.md R-04).
 *
 * Read-only: every file goes through the injected FsPort. No network download,
 * no disk writes, no dynamic evaluation, no built-in module imports.
 *
 * Rejection order is deliberate (fail closed):
 *   catalog/schema shape -> descriptor semantics -> review status -> bundled
 *   payload -> payload/record invariants.
 * An unverified, conflicting or non-bundled source is NEVER loaded. The only
 * loadable entry in this repository is the fully synthetic demonstration
 * source; real HowToCook / USDA FDC data must be audited by a human first.
 */
import {
  SOURCE_ERROR,
  CATALOG_PATH,
  SCHEMA_PATH,
  SourceError,
  assertSourceSchema,
  assertSourceCatalog,
  assertSourcePayload,
} from './contract.js';

/** @param {string} code @returns {never} */
function fail(code) {
  throw new SourceError(code);
}

/** @param {unknown} error @param {string} code @returns {never} */
function rethrow(error, code) {
  if (error instanceof SourceError) throw error;
  fail(code);
}

/**
 * Load and validate the metadata catalog. Success means ONLY that the
 * metadata is well formed; it does not approve any external dataset.
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @returns {Promise<Readonly<{catalog: Readonly<Record<string, any>>, sources: ReadonlyArray<Readonly<Record<string, any>>>, schema: Readonly<Record<string, any>>}>>}
 */
export async function loadSourceCatalog(fsPort) {
  if (!fsPort || typeof fsPort.readJson !== 'function') fail(SOURCE_ERROR.FS);
  /** @type {unknown} */
  let catalogRaw;
  /** @type {unknown} */
  let schemaRaw;
  try {
    catalogRaw = await fsPort.readJson(CATALOG_PATH);
  } catch {
    fail(SOURCE_ERROR.CATALOG);
  }
  try {
    schemaRaw = await fsPort.readJson(SCHEMA_PATH);
  } catch {
    fail(SOURCE_ERROR.SCHEMA);
  }
  /** @type {Readonly<Record<string, any>>} */
  let schemaView;
  try {
    schemaView = assertSourceSchema(schemaRaw);
  } catch (error) {
    rethrow(error, SOURCE_ERROR.SCHEMA);
  }
  /** @type {Readonly<Record<string, any>>} */
  let catalogView;
  try {
    catalogView = assertSourceCatalog(catalogRaw, schemaView);
  } catch (error) {
    rethrow(error, SOURCE_ERROR.CATALOG);
  }
  return Object.freeze({
    catalog: catalogView,
    sources: catalogView.sources,
    schema: schemaView,
  });
}

/**
 * Load one data source. Rejects unverified / conflicting / non-bundled sources
 * with a stable code, and validates the bundled payload before returning it.
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @param {string} id
 * @returns {Promise<Readonly<{metadata: Readonly<Record<string, any>>, records: ReadonlyArray<Readonly<Record<string, any>>>}>>}
 */
export async function loadDataSource(fsPort, id) {
  const { sources, schema } = await loadSourceCatalog(fsPort);
  const entry = sources.find((s) => s.id === id);
  if (!entry) fail(SOURCE_ERROR.NOT_FOUND);
  if (schema.policy.require_approved_review && entry.review_status !== 'approved') {
    fail(SOURCE_ERROR.REVIEW);
  }
  if (schema.policy.require_bundled_payload && entry.bundled !== true) {
    fail(SOURCE_ERROR.BUNDLED);
  }
  if (typeof entry.payload_path !== 'string') fail(SOURCE_ERROR.PAYLOAD);
  /** @type {unknown} */
  let payloadRaw;
  try {
    payloadRaw = await fsPort.readJson(entry.payload_path);
  } catch {
    fail(SOURCE_ERROR.PAYLOAD);
  }
  /** @type {Readonly<Record<string, any>>} */
  let payloadView;
  try {
    payloadView = assertSourcePayload(payloadRaw, entry);
  } catch (error) {
    rethrow(error, SOURCE_ERROR.PAYLOAD);
  }
  return Object.freeze({ metadata: entry, records: payloadView.records });
}

/**
 * Composition-root convenience port. The host MUST inject it explicitly;
 * `rr plan` does not auto-wire any data source (zero-fallback decision).
 * @param {import('../../io/ports.js').FsPort} fsPort
 * @returns {Promise<Readonly<{listSources: Function, loadSource: Function, describePolicy: Function}>>}
 */
export async function createDataSourcePort(fsPort) {
  const { sources, schema } = await loadSourceCatalog(fsPort);
  return Object.freeze({
    /** @returns {Promise<ReadonlyArray<string>>} */
    listSources: async () => Object.freeze(sources.map((s) => s.id)),
    /**
     * @param {string} id
     * @returns {Promise<Readonly<{metadata: Readonly<Record<string, any>>, records: ReadonlyArray<Readonly<Record<string, any>>>}>>}
     */
    loadSource: async (id) => loadDataSource(fsPort, id),
    /** @returns {Readonly<Record<string, boolean>>} */
    describePolicy: () => Object.freeze({ ...schema.policy }),
  });
}
