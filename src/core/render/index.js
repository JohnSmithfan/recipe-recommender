// SPDX-License-Identifier: GPL-3.0-only
/** Core domain "Markdown render" public surface (plan.md 4 / 6.1, FR-006 / FR-028). */

export { RENDER_ERROR, RenderError, renderIssue } from './errors.js';
export {
  PLAN_LEVELS,
  RX_FIELDS,
  VERSION_KEYS,
  RENDER_VERSION,
  RENDER_PREFIX,
  DATA_FENCE,
  LANGUAGE_PACK_KEYS,
  REQUIRED_NOTICE_KEYS,
  RX_UNIT_KEYS,
  validateLanguagePack,
  validateIntlFormatter,
  validatePlanObject,
  resolvePackKey,
} from './contract.js';
export {
  buildRenderData,
  canonicalLines,
  extractCanonicalBlock,
  extractRenderData,
} from './data.js';
export { render } from './render.js';
/** T-034 optional enhancement gate: default OFF, explicit consent, offline fallback. */
export {
  ENHANCE_ERROR,
  ENHANCEMENT_SCOPES,
  ENHANCE_CONFIG_KEYS,
  DEFAULT_ENHANCE_CONFIG,
  ENHANCE_DECISION,
  ENHANCE_STEP,
  ENHANCE_ENGINE,
  parseEnhanceConfig,
  assertEnhanceConsent,
  resolveEnhanceDecision,
  applyEnhancement,
  enhanceRenderedText,
  createEnhanceGate,
} from './enhance.js';
