// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-034 - optional enhancement gate unit tests (ATDD red -> green).
 *
 * Spec: tasks.md T-034; SPEC.md FR-041 note, FR-047..051, AC-17, E-16,
 * SC-013, NFR-001/009, P-11/P-13; plan.md section 9; constitution.md P-13.
 *
 * All values here are synthetic. No real body data, no network, no disk writes.
 * The gate is a pure decision layer: it NEVER calls an external service. The
 * optional adapter is injected by the host and is untouched on the default path.
 *
 * Boundary: AC-17 stays RED. This task provides the executable evidence for the
 * enhancement gate only; CI / compliance wiring belongs to T-041 / T-042.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
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
} from '../../src/core/render/enhance.js';
import {
  RenderError,
  LANGUAGE_PACK_KEYS,
  REQUIRED_NOTICE_KEYS,
  VERSION_KEYS,
  RX_FIELDS,
  render,
  extractCanonicalBlock,
  extractRenderData,
} from '../../src/core/render/index.js';
import { COMMANDS, P2_COMMANDS, OVERRIDE_KEYS } from '../../src/cli/index.js';

const DISH = 'enhance.scope.dish_name';
const EXPLAIN = 'enhance.scope.explanation';
const hasCode = (e, code) => e instanceof RenderError && e.issues.some((i) => i.code === code);
const throws = (fn, code) => assert.throws(fn, (e) => hasCode(e, code), `expect ${code}`);

const CANON = '```rr-data\nlevel=week\nperiod_id=2026-W45\n```';
/** @param {string} [body] @returns {string} */
function doc(body = 'template.body') {
  return `# plan\n\n<!-- rr-render v=1 lang=xx level=week period=2026-W45 -->\n\n`
    + `> [AIGC] notice\n\n| a | b |\n| --- | --- |\n| ${body} | x |\n\n${CANON}\n`;
}

/** @param {unknown} [scope] @param {string} [id] @param {string} [rid] */
function consent(scope = DISH, id = 'consent-001', rid = 'request-001', extra = {}) {
  return { granted: true, scope, consent_id: id, request_id: rid, ...extra };
}
const available = () => Object.freeze({ available: true, offline: false });
/** @param {string} text @returns {{ enhance: Function, calls: number }} */
function localAdapter(text) {
  const port = { calls: 0, enhance: ({ text: input }) => { port.calls += 1; return input.replace('template.body', text); } };
  return port;
}
const str = (v) => JSON.stringify(v);

// --------------------------------------------------------------- key sets

test('T-034 - constants are frozen, canonical and default OFF', () => {
  assert.ok(Object.isFrozen(ENHANCE_ERROR));
  assert.ok(Object.isFrozen(ENHANCEMENT_SCOPES));
  assert.ok(Object.isFrozen(ENHANCE_CONFIG_KEYS));
  assert.ok(Object.isFrozen(DEFAULT_ENHANCE_CONFIG));
  assert.deepEqual([...ENHANCEMENT_SCOPES], [DISH, EXPLAIN]);
  assert.deepEqual([...ENHANCE_CONFIG_KEYS], ['enabled', 'scope']);
  assert.deepEqual({ ...DEFAULT_ENHANCE_CONFIG }, { enabled: false, scope: null });
  for (const k of ENHANCEMENT_SCOPES) assert.match(k, /^[a-z][a-z0-9._-]{0,63}$/);
  assert.ok(Object.values(ENHANCE_ERROR).every((v) => /^ERR_ENHANCE_[A-Z_]+$/.test(v)));
  assert.equal(new Set(Object.values(ENHANCE_ERROR)).size, Object.values(ENHANCE_ERROR).length);
  assert.equal(ENHANCE_ENGINE.TEMPLATE, 'template');
  assert.equal(ENHANCE_ENGINE.ENHANCED, 'enhanced');
  assert.ok(Object.values(ENHANCE_DECISION).every((v) => /^enhance\.decision\.[a-z_]+$/.test(v)));
  assert.ok(Object.values(ENHANCE_STEP).every((v) => /^enhance\.step\.[a-z_]+$/.test(v)));
});

// ------------------------------------------------------------ config switch

test('T-034 - parseEnhanceConfig defaults to OFF and freezes its output', () => {
  const a = parseEnhanceConfig();
  const b = parseEnhanceConfig('{}');
  assert.deepEqual({ ...a }, { enabled: false, scope: null });
  assert.deepEqual({ ...b }, { enabled: false, scope: null });
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(b));
});

test('T-034 - parseEnhanceConfig accepts an explicit ON config with a declared scope', () => {
  const c = parseEnhanceConfig(str({ enabled: true, scope: DISH }));
  assert.deepEqual({ ...c }, { enabled: true, scope: DISH });
  assert.ok(Object.isFrozen(c));
});

test('T-034 - parseEnhanceConfig rejects unknown keys, wrong types and malformed JSON', () => {
  throws(() => parseEnhanceConfig(str({ enabled: true, scope: DISH, injected: 'x' })), ENHANCE_ERROR.CONFIG_KEY);
  throws(() => parseEnhanceConfig(str({ enabled: 'true', scope: DISH })), ENHANCE_ERROR.CONFIG);
  throws(() => parseEnhanceConfig(str({ enabled: 1, scope: DISH })), ENHANCE_ERROR.CONFIG);
  throws(() => parseEnhanceConfig('{bad json'), ENHANCE_ERROR.CONFIG);
  throws(() => parseEnhanceConfig('[]'), ENHANCE_ERROR.CONFIG);
  throws(() => parseEnhanceConfig('null'), ENHANCE_ERROR.CONFIG);
  throws(() => parseEnhanceConfig(42), ENHANCE_ERROR.CONFIG);
});

test('T-034 - parseEnhanceConfig rejects an undeclared / unknown scope', () => {
  throws(() => parseEnhanceConfig(str({ enabled: true })), ENHANCE_ERROR.SCOPE);
  throws(() => parseEnhanceConfig(str({ enabled: true, scope: null })), ENHANCE_ERROR.SCOPE);
  throws(() => parseEnhanceConfig(str({ enabled: true, scope: 'enhance.scope.unknown' })), ENHANCE_ERROR.SCOPE);
  throws(() => parseEnhanceConfig(str({ enabled: false, scope: 'enhance.scope.unknown' })), ENHANCE_ERROR.SCOPE);
});

// --------------------------------------------------------------- consent gate

test('T-034 - assertEnhanceConsent accepts a single explicit consent with matching scope', () => {
  const c = assertEnhanceConsent(consent(), DISH, []);
  assert.equal(c.granted, true);
  assert.equal(c.scope, DISH);
  assert.equal(c.consent_id, 'consent-001');
  assert.ok(Object.isFrozen(c));
});

test('T-034 - assertEnhanceConsent rejects missing / false / extra fields and bad ids', () => {
  throws(() => assertEnhanceConsent(null, DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent({ granted: false, scope: DISH, consent_id: 'a', request_id: 'b' }, DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent({ granted: true, scope: DISH, consent_id: 'a' }, DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent(consent(DISH, 'a', 'b', { extra: 'x' }), DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent(consent(DISH, 'bad id', 'b'), DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent(consent(DISH, 'a', '../b'), DISH, []), ENHANCE_ERROR.CONSENT);
  throws(() => assertEnhanceConsent(consent(DISH, 'a', 'b'), undefined, []), ENHANCE_ERROR.SCOPE);
});

test('T-034 - assertEnhanceConsent rejects a scope mismatch and a reused consent id', () => {
  throws(() => assertEnhanceConsent(consent(EXPLAIN), DISH, []), ENHANCE_ERROR.SCOPE);
  throws(() => assertEnhanceConsent(consent(), DISH, ['consent-001']), ENHANCE_ERROR.REUSE);
});

// ------------------------------------------------------------- decision layer

test('T-034 - resolveEnhanceDecision stays OFF by default with a traceable chain', () => {
  const d = resolveEnhanceDecision({});
  assert.equal(d.enabled, false);
  assert.equal(d.engine, ENHANCE_ENGINE.TEMPLATE);
  assert.equal(d.reason, ENHANCE_DECISION.OFF);
  assert.ok(d.chain.includes(ENHANCE_STEP.CONFIG));
  assert.deepEqual([...d.seen_ids], []);
  assert.ok(Object.isFrozen(d));
  assert.equal(str(d).includes('weight_kg'), false);
});

test('T-034 - resolveEnhanceDecision degrades when consent is missing, mismatched or reused', () => {
  const cfg = parseEnhanceConfig(str({ enabled: true, scope: DISH }));
  const noConsent = resolveEnhanceDecision({ config: cfg, availability: available() });
  assert.equal(noConsent.reason, ENHANCE_DECISION.NO_CONSENT);
  assert.equal(noConsent.enabled, false);
  const mismatch = resolveEnhanceDecision({ config: cfg, consent: consent(EXPLAIN), availability: available() });
  assert.equal(mismatch.reason, ENHANCE_DECISION.SCOPE_MISMATCH);
  const reused = resolveEnhanceDecision({
    config: cfg, consent: consent(), availability: available(), seenIds: ['consent-001'],
  });
  assert.equal(reused.reason, ENHANCE_DECISION.REUSE);
  assert.equal(reused.enabled, false);
});

test('T-034 - resolveEnhanceDecision degrades when offline or unavailable (E-16)', () => {
  const cfg = parseEnhanceConfig(str({ enabled: true, scope: DISH }));
  const offline = resolveEnhanceDecision({ config: cfg, consent: consent(), availability: { available: true, offline: true } });
  assert.equal(offline.reason, ENHANCE_DECISION.OFFLINE);
  assert.equal(offline.enabled, false);
  const unavailable = resolveEnhanceDecision({ config: cfg, consent: consent(), availability: { available: false, offline: false } });
  assert.equal(unavailable.reason, ENHANCE_DECISION.UNAVAILABLE);
  assert.equal(unavailable.enabled, false);
  const both = resolveEnhanceDecision({ config: cfg, consent: consent(), availability: { available: false, offline: true } });
  assert.equal(both.engine, ENHANCE_ENGINE.TEMPLATE);
});

test('T-034 - resolveEnhanceDecision enables only with config + consent + availability', () => {
  const cfg = parseEnhanceConfig(str({ enabled: true, scope: DISH }));
  const d = resolveEnhanceDecision({ config: cfg, consent: consent(), availability: available() });
  assert.equal(d.enabled, true);
  assert.equal(d.reason, ENHANCE_DECISION.ENABLED);
  assert.equal(d.scope, DISH);
  assert.deepEqual([...d.seen_ids], ['consent-001']);
  for (const s of [ENHANCE_STEP.CONFIG, ENHANCE_STEP.CONSENT, ENHANCE_STEP.SCOPE,
    ENHANCE_STEP.AVAILABILITY, ENHANCE_STEP.ENABLED]) {
    assert.ok(d.chain.includes(s), `chain must include ${s}`);
  }
});

test('T-034 - resolveEnhanceDecision rejects malformed availability / config (fail closed)', () => {
  const cfg = parseEnhanceConfig(str({ enabled: true, scope: DISH }));
  throws(() => resolveEnhanceDecision({ config: cfg, consent: consent(), availability: null }), ENHANCE_ERROR.PORT);
  throws(() => resolveEnhanceDecision({ config: cfg, consent: consent(), availability: { available: 'yes', offline: false } }), ENHANCE_ERROR.PORT);
  throws(() => resolveEnhanceDecision({ config: cfg, consent: consent(), availability: { available: true } }), ENHANCE_ERROR.PORT);
  throws(() => resolveEnhanceDecision({ config: { enabled: true, scope: 'enhance.scope.unknown' } }), ENHANCE_ERROR.SCOPE);
});

// ------------------------------------------------------------- apply / degrade

test('T-034 - applyEnhancement never touches the adapter on the default path', () => {
  const text = doc();
  let calls = 0;
  const sentinel = { enhance: () => { calls += 1; throw new Error('ERR_T034_TOUCHED'); } };
  const d = resolveEnhanceDecision({});
  const r = applyEnhancement(text, sentinel, d);
  assert.equal(calls, 0);
  assert.equal(r.text, text);
  assert.equal(r.engine, ENHANCE_ENGINE.TEMPLATE);
  assert.equal(r.calls, 0);
  assert.equal(r.fallback_reason, ENHANCE_DECISION.OFF);
  assert.ok(Object.isFrozen(r));
});

test('T-034 - applyEnhancement uses a valid local adapter and keeps rr-data byte-identical', () => {
  const text = doc();
  const before = extractCanonicalBlock(text);
  const adapter = localAdapter('polished.body');
  const d = resolveEnhanceDecision({
    config: parseEnhanceConfig(str({ enabled: true, scope: DISH })),
    consent: consent(), availability: available(),
  });
  const r = applyEnhancement(text, adapter, d);
  assert.equal(adapter.calls, 1);
  assert.equal(r.engine, ENHANCE_ENGINE.ENHANCED);
  assert.equal(r.calls, 1);
  assert.equal(r.fallback_reason, null);
  assert.ok(r.text.includes('polished.body'));
  assert.equal(extractCanonicalBlock(r.text), before);
  assert.deepEqual({ ...extractRenderData(r.text) }, { ...extractRenderData(text) });
  assert.ok(r.text.includes('[AIGC]'));
  assert.ok(r.text.includes('<!-- rr-render '));
});

test('T-034 - applyEnhancement degrades when adapter throws, is absent or returns junk', () => {
  const text = doc();
  const d = resolveEnhanceDecision({
    config: parseEnhanceConfig(str({ enabled: true, scope: DISH })),
    consent: consent(), availability: available(),
  });
  const cases = [
    { enhance: () => { throw new Error('ERR_T034_UNAVAILABLE'); } },
    { enhance: () => '' },
    { enhance: () => 42 },
    null,
    {},
  ];
  for (const adapter of cases) {
    const r = applyEnhancement(text, adapter, d);
    assert.equal(r.text, text, 'degraded output must be the template output');
    assert.equal(r.engine, ENHANCE_ENGINE.TEMPLATE);
    assert.ok(r.fallback_reason !== null, 'a fallback reason must be recorded');
  }
});

test('T-034 - applyEnhancement rejects an adapter that rewrites canonical data / notices / structure', () => {
  const text = doc();
  const d = resolveEnhanceDecision({
    config: parseEnhanceConfig(str({ enabled: true, scope: DISH })),
    consent: consent(), availability: available(),
  });
  const bad = [
    (s) => s.replace('period_id=2026-W45', 'period_id=2099-W45'),
    (s) => s.replace('[AIGC] notice', 'notice'),
    (s) => s.replace('<!-- rr-render ', '<!-- rr-other '),
    (s) => s.replace('```rr-data', '```rr-tampered'),
    (s) => `${s}\nweight_kg=70.5`,
    (s) => `${s}\n\x00`,
  ];
  for (const mutate of bad) {
    const r = applyEnhancement(text, { enhance: (input) => mutate(input.text) }, d);
    assert.equal(r.text, text, 'tampered enhancement must be rejected and degraded');
    assert.equal(r.engine, ENHANCE_ENGINE.TEMPLATE);
  }
});

// --------------------------------------------------------------- top-level API

test('T-034 - enhanceRenderedText defaults to the template with zero calls', () => {
  const text = doc();
  const r = enhanceRenderedText(text);
  assert.equal(r.text, text);
  assert.equal(r.engine, ENHANCE_ENGINE.TEMPLATE);
  assert.equal(r.calls, 0);
  assert.equal(r.reason, ENHANCE_DECISION.OFF);
  assert.deepEqual([...r.seen_ids], []);
  assert.ok(Object.isFrozen(r));
});

test('T-034 - enhanceRenderedText accepts a JSON config text and a single consent', () => {
  const text = doc();
  const adapter = localAdapter('polished.body');
  const r = enhanceRenderedText(text, {
    config: str({ enabled: true, scope: DISH }),
    consent: consent(), availability: available(), adapter,
  });
  assert.equal(r.engine, ENHANCE_ENGINE.ENHANCED);
  assert.equal(r.calls, 1);
  assert.deepEqual([...r.seen_ids], ['consent-001']);
  assert.ok(r.chain.includes(ENHANCE_STEP.ENABLED));
});

test('T-034 - createEnhanceGate enforces per-invocation consent (no token reuse)', () => {
  const text = doc();
  const gate = createEnhanceGate({ config: str({ enabled: true, scope: DISH }), adapter: localAdapter('polished.body') });
  const first = gate.decide(text, { consent: consent(), availability: available() });
  assert.equal(first.engine, ENHANCE_ENGINE.ENHANCED);
  const second = gate.decide(text, { consent: consent(DISH, 'consent-001', 'request-002'), availability: available() });
  assert.equal(second.reason, ENHANCE_DECISION.REUSE);
  assert.equal(second.engine, ENHANCE_ENGINE.TEMPLATE);
  assert.equal(second.text, text);
  const third = gate.decide(text, { consent: consent(DISH, 'consent-002', 'request-003'), availability: available() });
  assert.equal(third.engine, ENHANCE_ENGINE.ENHANCED);
});

// ------------------------------------------------------- real render() output

/** @returns {{ plan: unknown, pack: unknown, fmt: unknown }} */
function realRenderInputs() {
  const strings = {};
  for (const k of LANGUAGE_PACK_KEYS) strings[k] = `LA:${k}`;
  for (const k of REQUIRED_NOTICE_KEYS) strings[k] = `LA:${k}`;
  const pack = { tag: 'xx', strings, fallback_keys: [] };
  const fmt = { number: (v, u) => `F:n:${v}:${u}`, date: (v) => `F:d:${v}` };
  const brief = {
    level: 'month', period_id: '2026-11', title: 'plan.title.month',
    file_name: '2026-11.md', start_date: '2026-11-01', end_date: '2026-11-30',
  };
  const calendar = {
    cache_id: 'calendar-fixture-2026', year: 2026, status: 'verified',
    term_ids: ['term.fixture_a'], active_term_id: 'term.fixture_a', manual_review_key: null,
  };
  const plan = {
    level: 'week', period_id: '2026-W45', file_name: '2026-W45.md',
    header: {
      level: 'week', period_id: '2026-W45', title: 'plan.title.week', file_name: '2026-W45.md',
      generated_date: '2026-11-06', generated_at: '2026-11-06T20:00:00+08:00',
      run_date: '2026-11-06', trigger: 'plan.trigger.period_first_day',
      version_ids: Object.fromEntries(VERSION_KEYS.map((k) => [k, `${k}-v1`])),
      parent: brief, children: [], link_references: [],
      language_tag: 'xx', locale_source: 'user', guideline_id: 'generic-guideline',
      calendar, execution_window: {
        start_date: '2026-11-09', end_date: '2026-11-15',
        total_days: 7, executed_days: 4, remaining_days: 3,
      },
      notice_keys: [...REQUIRED_NOTICE_KEYS],
    },
    prescription: Object.fromEntries(RX_FIELDS.map((k, i) => [k, [100 + i, 200 + i]])),
    comparison: { adapter_id: 'generic-guideline', compliant: true },
    guardrails: { energy_floor_kcal: 1450, protein_floor_g: 78 },
    calendar,
    days: [{ plan_date: '2026-11-09', file_name: '2026-11-09.md' }],
    recalc: null,
  };
  return { plan, pack, fmt };
}

test('T-034 - real render() output is byte-identical when enhancement is OFF (AC-17 scenario 1)', () => {
  const { plan, pack, fmt } = realRenderInputs();
  const baseline = render(plan, pack, fmt);
  let calls = 0;
  const sentinel = { enhance: () => { calls += 1; throw new Error('ERR_T034_TOUCHED'); } };
  const r = enhanceRenderedText(baseline, {
    config: str({ enabled: false }), consent: consent(),
    availability: { available: false, offline: true }, adapter: sentinel,
  });
  assert.equal(calls, 0);
  assert.equal(r.text, baseline);
  assert.equal(r.engine, ENHANCE_ENGINE.TEMPLATE);
  assert.equal(r.reason, ENHANCE_DECISION.OFF);
  assert.equal(r.text.includes('```rr-data'), true);
  assert.ok(r.text.includes('[AIGC]'));
});

test('T-034 - real render() output keeps rr-data invariant when a local adapter runs', () => {
  const { plan, pack, fmt } = realRenderInputs();
  const baseline = render(plan, pack, fmt);
  const r = enhanceRenderedText(baseline, {
    config: str({ enabled: true, scope: DISH }),
    consent: consent(), availability: available(),
    adapter: { enhance: ({ text }) => text.replace('LA:render.title.week', 'LA:render.title.week (local)') },
  });
  assert.equal(r.engine, ENHANCE_ENGINE.ENHANCED);
  assert.equal(extractCanonicalBlock(r.text), extractCanonicalBlock(baseline));
  assert.deepEqual({ ...extractRenderData(r.text) }, { ...extractRenderData(baseline) });
});

// ------------------------------------------------------------ static evidence

test('T-034 - enhance.js is pure ASCII, has no node: import and no external exits', () => {
  const src = readFileSync(new URL('../../src/core/render/enhance.js', import.meta.url), 'utf8');
  assert.equal(/[^\x00-\x7F]/.test(src), false, 'source must be pure ASCII');
  assert.equal(/from\s+['"]node:/.test(src), false);
  assert.equal(/require\(/.test(src), false);
  const code = src.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.equal(/\bfetch\s*\(|globalThis\.fetch|XMLHttpRequest\b|https?\.(?:get|request)\s*\(/.test(code), false);
  assert.equal(/\bllmPort\b|\bopenai\b|\banthropic\b|\bllm\.(?:complete|generate)\s*\(/.test(code), false);
  assert.equal(/\.translate\s*\(|\btranslationPort\b/.test(code), false);
});

test('T-034 - P1 command / override snapshots are untouched', () => {
  assert.deepEqual([...COMMANDS].sort(),
    ['acceptance', 'delete-data', 'export-data', 'init', 'ledger', 'plan', 'validate']);
  assert.deepEqual([...P2_COMMANDS], ['serve-mcp', 'locales']);
  assert.deepEqual([...OVERRIDE_KEYS], ['lang', 'guideline', 'calendar', 'country']);
});
