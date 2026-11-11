// SPDX-License-Identifier: GPL-3.0-only
/** 可插拔膳食指南适配器统一出口（plan.md §4 / §6.1 / FR-003）。 */

export {
  RX_ERROR,
  RxValidationError,
  GUIDELINE_ID_RE,
  GUIDELINE_KEYS,
  issue,
  validateGuidelineAdapter,
} from './contract.js';
export { loadGuidelineAdapter } from './loader.js';
export {
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
} from './region.js';
