// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-034 optional enhancement gate (tasks.md T-034; SPEC.md FR-041 note,
 * FR-047..051, AC-17, E-16, SC-013, NFR-001/009, P-11/P-13; plan.md 9).
 *
 * Pure decision layer: no IO, no clock, no network, no mutation of inputs,
 * no natural-language literals. The optional adapter is injected by the host
 * and is NEVER touched on the default path. Every missing consent, scope
 * mismatch, unavailable service, offline host, adapter error or unsafe output
 * degrades to the rule/template engine output (FR-051 / E-16).
 *
 * This repository ships NO external adapter. The adapter contract is a
 * synchronous local pure function; anything asynchronous or remote is
 * rejected and degraded. Runtime calls to remote services are out of scope
 * (FR-041 note, FR-047/048, NFR-001). Decisions carry only Canonical IDs.
 */
import { RenderError, renderIssue } from './errors.js';
import { RENDER_PREFIX } from './contract.js';
import { extractCanonicalBlock } from './data.js';

/** Stable rejection codes carried inside RenderError.issues[].code. */
export const ENHANCE_ERROR = Object.freeze({
  CONFIG: 'ERR_ENHANCE_CONFIG',
  CONFIG_KEY: 'ERR_ENHANCE_CONFIG_KEY',
  CONSENT: 'ERR_ENHANCE_CONSENT',
  SCOPE: 'ERR_ENHANCE_SCOPE',
  REUSE: 'ERR_ENHANCE_REUSE',
  PORT: 'ERR_ENHANCE_PORT',
  OUTPUT: 'ERR_ENHANCE_OUTPUT',
  INVARIANT: 'ERR_ENHANCE_INVARIANT',
});

/** Explicit, enumerable enhancement ranges (Canonical IDs, FR-051 examples). */
export const ENHANCEMENT_SCOPES = Object.freeze([
  'enhance.scope.dish_name',
  'enhance.scope.explanation',
]);

/** Fixed switch key set. Unknown keys are rejected (fail closed). */
export const ENHANCE_CONFIG_KEYS = Object.freeze(['enabled', 'scope']);

/** Default OFF: no consent, no adapter, no network, no extra work. */
export const DEFAULT_ENHANCE_CONFIG = Object.freeze({ enabled: false, scope: null });

/** Decision / fallback reasons (Canonical IDs only, NFR-012). */
export const ENHANCE_DECISION = Object.freeze({
  OFF: 'enhance.decision.off',
  NO_CONSENT: 'enhance.decision.no_consent',
  SCOPE_MISMATCH: 'enhance.decision.scope_mismatch',
  REUSE: 'enhance.decision.reuse',
  UNAVAILABLE: 'enhance.decision.unavailable',
  OFFLINE: 'enhance.decision.offline',
  ENABLED: 'enhance.decision.enabled',
  ADAPTER: 'enhance.decision.adapter',
  OUTPUT: 'enhance.decision.output',
  INVARIANT: 'enhance.decision.invariant',
});

/** Decision-chain steps, so every outcome is traceable without prose. */
export const ENHANCE_STEP = Object.freeze({
  CONFIG: 'enhance.step.config',
  CONSENT: 'enhance.step.consent',
  SCOPE: 'enhance.step.scope',
  AVAILABILITY: 'enhance.step.availability',
  ENABLED: 'enhance.step.enabled',
  FALLBACK: 'enhance.step.fallback',
});

/** Which engine produced the final text. */
export const ENHANCE_ENGINE = Object.freeze({
  TEMPLATE: 'template',
  ENHANCED: 'enhanced',
});

const CONSENT_KEYS = Object.freeze(['granted', 'scope', 'consent_id', 'request_id']);
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const PRIVATE_TOKENS = Object.freeze([
  'weight_kg', 'body_mass', 'bmr_kcal', 'height_cm', 'body_fat_pct',
]);

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {string} code @param {string} field @param {string} hint */
function fail(code, field, hint) {
  throw new RenderError([renderIssue(code, field, hint)]);
}

/**
 * Validate an already parsed switch object.
 * @param {unknown} config
 * @returns {Readonly<{enabled: boolean, scope: string|null}>}
 */
function assertConfigObject(config) {
  if (config === undefined || config === null) return DEFAULT_ENHANCE_CONFIG;
  if (!isRecord(config)) fail(ENHANCE_ERROR.CONFIG, '(config)', 'action.enhance.config_shape');
  const record = /** @type {Record<string, unknown>} */ (config);
  for (const key of Object.keys(record)) {
    if (!ENHANCE_CONFIG_KEYS.includes(key)) {
      fail(ENHANCE_ERROR.CONFIG_KEY, `(config).${key}`, 'action.enhance.config_key');
    }
  }
  const enabled = record.enabled === undefined ? false : record.enabled;
  const scope = record.scope === undefined ? null : record.scope;
  if (typeof enabled !== 'boolean') fail(ENHANCE_ERROR.CONFIG, '(config).enabled', 'action.enhance.config_enabled');
  if (scope !== null && (typeof scope !== 'string' || !ENHANCEMENT_SCOPES.includes(scope))) {
    fail(ENHANCE_ERROR.SCOPE, '(config).scope', 'action.enhance.config_scope');
  }
  if (enabled === true && scope === null) {
    fail(ENHANCE_ERROR.SCOPE, '(config).scope', 'action.enhance.scope_required');
  }
  return Object.freeze({ enabled, scope });
}

/**
 * Parse the configuration switch from static JSON text. Default is OFF.
 * @param {unknown} text
 * @returns {Readonly<{enabled: boolean, scope: string|null}>}
 */
export function parseEnhanceConfig(text) {
  if (text === undefined) return DEFAULT_ENHANCE_CONFIG;
  if (typeof text !== 'string') fail(ENHANCE_ERROR.CONFIG, '(config)', 'action.enhance.config_text');
  /** @type {unknown} */
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    fail(ENHANCE_ERROR.CONFIG, '(config)', 'action.enhance.config_json');
  }
  if (!isRecord(raw)) fail(ENHANCE_ERROR.CONFIG, '(config)', 'action.enhance.config_object');
  return assertConfigObject(raw);
}

/**
 * Validate one explicit, single-use consent for one declared scope.
 * @param {unknown} consent
 * @param {unknown} scope expected scope from the switch
 * @param {ReadonlyArray<string>} [seenIds] already consumed consent ids
 * @returns {Readonly<{granted: boolean, scope: string, consent_id: string, request_id: string}>}
 */
export function assertEnhanceConsent(consent, scope, seenIds = []) {
  if (!isRecord(consent)) fail(ENHANCE_ERROR.CONSENT, '(consent)', 'action.enhance.consent_shape');
  const record = /** @type {Record<string, unknown>} */ (consent);
  const keys = Object.keys(record);
  if (keys.length !== CONSENT_KEYS.length || keys.some((k) => !CONSENT_KEYS.includes(k))) {
    fail(ENHANCE_ERROR.CONSENT, '(consent)', 'action.enhance.consent_keys');
  }
  if (record.granted !== true) fail(ENHANCE_ERROR.CONSENT, '(consent).granted', 'action.enhance.consent_granted');
  if (typeof record.consent_id !== 'string' || !SAFE_ID.test(record.consent_id)
    || typeof record.request_id !== 'string' || !SAFE_ID.test(record.request_id)) {
    fail(ENHANCE_ERROR.CONSENT, '(consent).id', 'action.enhance.consent_id');
  }
  if (typeof scope !== 'string' || !ENHANCEMENT_SCOPES.includes(scope) || record.scope !== scope) {
    fail(ENHANCE_ERROR.SCOPE, '(consent).scope', 'action.enhance.consent_scope');
  }
  if (Array.isArray(seenIds) && seenIds.includes(record.consent_id)) {
    fail(ENHANCE_ERROR.REUSE, '(consent).consent_id', 'action.enhance.consent_reuse');
  }
  return Object.freeze({
    granted: true,
    scope,
    consent_id: record.consent_id,
    request_id: record.request_id,
  });
}

/**
 * Decide whether the optional adapter may run. Pure function: consent and
 * availability are explicit inputs, never inferred from the environment.
 * @param {{config?: unknown, consent?: unknown, availability?: unknown, seenIds?: ReadonlyArray<string>}} [input]
 * @returns {Readonly<{enabled: boolean, engine: string, reason: string, scope: string|null, chain: ReadonlyArray<string>, seen_ids: ReadonlyArray<string>}>}
 */
export function resolveEnhanceDecision(input = {}) {
  const cfg = typeof input.config === 'string'
    ? parseEnhanceConfig(input.config)
    : assertConfigObject(input.config);
  /** @type {string[]} */
  const chain = [ENHANCE_STEP.CONFIG];
  /** @type {string[]} */
  const seen = Array.isArray(input.seenIds) ? [...input.seenIds] : [];

  /** @param {string} reason */
  const degrade = (reason) => Object.freeze({
    enabled: false,
    engine: ENHANCE_ENGINE.TEMPLATE,
    reason,
    scope: cfg.scope,
    chain: Object.freeze([...chain, ENHANCE_STEP.FALLBACK]),
    seen_ids: Object.freeze([...seen]),
  });

  if (cfg.enabled === false) return degrade(ENHANCE_DECISION.OFF);
  if (!isRecord(input.consent) || input.consent.granted !== true) {
    return degrade(ENHANCE_DECISION.NO_CONSENT);
  }
  chain.push(ENHANCE_STEP.CONSENT);

  /** @type {Readonly<{granted: boolean, scope: string, consent_id: string, request_id: string}>} */
  let granted;
  try {
    granted = assertEnhanceConsent(input.consent, cfg.scope, seen);
  } catch (error) {
    if (!(error instanceof RenderError)) throw error;
    const code = error.issues[0]?.code;
    if (code === ENHANCE_ERROR.SCOPE) return degrade(ENHANCE_DECISION.SCOPE_MISMATCH);
    if (code === ENHANCE_ERROR.REUSE) return degrade(ENHANCE_DECISION.REUSE);
    return degrade(ENHANCE_DECISION.NO_CONSENT);
  }
  chain.push(ENHANCE_STEP.SCOPE);

  const av = input.availability;
  if (!isRecord(av) || typeof av.available !== 'boolean' || typeof av.offline !== 'boolean') {
    fail(ENHANCE_ERROR.PORT, '(availability)', 'action.enhance.availability');
  }
  chain.push(ENHANCE_STEP.AVAILABILITY);
  if (av.offline === true) return degrade(ENHANCE_DECISION.OFFLINE);
  if (av.available === false) return degrade(ENHANCE_DECISION.UNAVAILABLE);

  chain.push(ENHANCE_STEP.ENABLED);
  return Object.freeze({
    enabled: true,
    engine: ENHANCE_ENGINE.ENHANCED,
    reason: ENHANCE_DECISION.ENABLED,
    scope: granted.scope,
    chain: Object.freeze([...chain]),
    seen_ids: Object.freeze([...seen, granted.consent_id]),
  });
}

/**
 * @param {string} text @param {string} engine @param {string|null} fallbackReason @param {number} calls
 * @returns {Readonly<{text: string, engine: string, fallback_reason: string|null, calls: number}>}
 */
function outcome(text, engine, fallbackReason, calls) {
  return Object.freeze({ text, engine, fallback_reason: fallbackReason, calls });
}

/**
 * @param {string} candidate @param {string} baseline @param {string} canonical
 * @param {string} headerLine @param {boolean} aigc
 * @returns {boolean}
 */
function safeEnhancedText(candidate, baseline, canonical, headerLine, aigc) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  if (CONTROL.test(candidate)) return false;
  /** @type {string} */
  let block;
  try {
    block = extractCanonicalBlock(candidate);
  } catch {
    return false;
  }
  if (block !== canonical) return false;
  if (headerLine.length > 0 && !candidate.includes(headerLine)) return false;
  if (aigc && !candidate.includes('[AIGC]')) return false;
  if (PRIVATE_TOKENS.some((token) => candidate.includes(token) && !baseline.includes(token))) return false;
  return true;
}

/**
 * Apply the optional adapter to a rule/template engine output. Any failure
 * degrades to the untouched baseline text.
 * @param {unknown} templateText output of the rule/template engine
 * @param {unknown} adapter injected adapter with a synchronous enhance() method
 * @param {unknown} decision output of resolveEnhanceDecision()
 * @returns {Readonly<{text: string, engine: string, fallback_reason: string|null, calls: number}>}
 */
export function applyEnhancement(templateText, adapter, decision) {
  if (typeof templateText !== 'string' || templateText.length === 0) {
    fail(ENHANCE_ERROR.INVARIANT, '(text)', 'action.enhance.text_shape');
  }
  const baseline = templateText;
  const canonical = extractCanonicalBlock(baseline);
  const decisionRecord = isRecord(decision) ? /** @type {Record<string, unknown>} */ (decision) : {};
  const reason = typeof decisionRecord.reason === 'string' ? decisionRecord.reason : ENHANCE_DECISION.OFF;
  if (decisionRecord.enabled !== true) {
    return outcome(baseline, ENHANCE_ENGINE.TEMPLATE, reason, 0);
  }
  if (!isRecord(adapter) || typeof adapter.enhance !== 'function') {
    return outcome(baseline, ENHANCE_ENGINE.TEMPLATE, ENHANCE_DECISION.ADAPTER, 0);
  }
  const headerLine = baseline.split('\n').find((line) => line.startsWith(RENDER_PREFIX)) ?? '';
  const aigc = baseline.includes('[AIGC]');
  /** @type {unknown} */
  let candidate;
  try {
    candidate = adapter.enhance(Object.freeze({ text: baseline, scope: decisionRecord.scope }));
  } catch {
    return outcome(baseline, ENHANCE_ENGINE.TEMPLATE, ENHANCE_DECISION.UNAVAILABLE, 1);
  }
  if (!safeEnhancedText(candidate, baseline, canonical, headerLine, aigc)) {
    return outcome(baseline, ENHANCE_ENGINE.TEMPLATE, ENHANCE_DECISION.INVARIANT, 1);
  }
  return outcome(/** @type {string} */ (candidate), ENHANCE_ENGINE.ENHANCED, null, 1);
}

/**
 * One-shot composition: decide, then apply. Empty options means default OFF,
 * zero adapter calls and byte-identical template output.
 * @param {string} templateText
 * @param {{config?: unknown, consent?: unknown, availability?: unknown, seenIds?: ReadonlyArray<string>, adapter?: unknown}} [options]
 * @returns {Readonly<{text: string, engine: string, reason: string, fallback_reason: string, calls: number, chain: ReadonlyArray<string>, seen_ids: ReadonlyArray<string>}>}
 */
export function enhanceRenderedText(templateText, options = {}) {
  const decision = resolveEnhanceDecision({
    config: options.config,
    consent: options.consent,
    availability: options.availability,
    seenIds: options.seenIds,
  });
  const applied = applyEnhancement(templateText, options.adapter, decision);
  return Object.freeze({
    text: applied.text,
    engine: applied.engine,
    reason: decision.reason,
    fallback_reason: applied.fallback_reason,
    calls: applied.calls,
    chain: decision.chain,
    seen_ids: decision.seen_ids,
  });
}

/**
 * Stateful convenience wrapper for hosts: remembers consumed consent ids so
 * the same token cannot authorize a second invocation (per-invocation consent).
 * @param {{config?: unknown, adapter?: unknown}} [options]
 * @returns {Readonly<{decide: Function, seen_ids: ReadonlyArray<string>}>}
 */
export function createEnhanceGate(options = {}) {
  /** @type {string[]} */
  let seen = [];
  return Object.freeze({
    /** @returns {ReadonlyArray<string>} */
    get seen_ids() { return Object.freeze([...seen]); },
    /**
     * @param {string} templateText
     * @param {{consent?: unknown, availability?: unknown}} [call]
     * @returns {Readonly<{text: string, engine: string, reason: string, fallback_reason: string, calls: number, chain: ReadonlyArray<string>, seen_ids: ReadonlyArray<string>}>}
     */
    decide(templateText, call = {}) {
      const result = enhanceRenderedText(templateText, {
        config: options.config,
        adapter: options.adapter,
        consent: call.consent,
        availability: call.availability,
        seenIds: seen,
      });
      if (result.engine === ENHANCE_ENGINE.ENHANCED) seen = [...result.seen_ids];
      return result;
    },
  });
}
