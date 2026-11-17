// SPDX-License-Identifier: GPL-3.0-only
/** Core domain "pluggable data source" public surface (tasks.md T-035; FR-031/032/037; plan.md 4 / R-04). */

export {
  SOURCE_ROOT,
  CATALOG_PATH,
  SCHEMA_PATH,
  SOURCE_ERROR,
  SOURCE_KINDS,
  SOURCE_LICENSES,
  SOURCE_REVIEW_STATES,
  SOURCE_KEYS,
  CATALOG_KEYS,
  SCHEMA_KEYS,
  PAYLOAD_KEYS,
  RECORD_KEYS,
  LICENSE_EXPECTATIONS,
  SourceError,
  assertSourceSchema,
  assertSourceMetadata,
  assertSourceCatalog,
  assertSourcePayload,
} from './contract.js';
export {
  loadSourceCatalog,
  loadDataSource,
  createDataSourcePort,
} from './loader.js';
