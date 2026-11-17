// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-035 - pluggable data source port unit tests (ATDD red -> green).
 *
 * Spec: tasks.md T-035; SPEC.md FR-031/032/037, AC-13, AC-18, SC-010,
 * NFR-008, E-15; plan.md section 4 / R-04; constitution.md P-14.
 *
 * No real third-party data is bundled. All records in the fixture are
 * synthetic. Everything is offline: the loader only reads through an
 * injected FsPort, never through a network port.
 *
 * Boundary: AC-13 / AC-18 stay RED. THIRD_PARTY_NOTICES.md and community
 * files belong to T-040 / T-041; CI wiring belongs to T-042.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
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
  CATALOG_PATH,
  SCHEMA_PATH,
  SourceError,
  assertSourceSchema,
  assertSourceMetadata,
  assertSourceCatalog,
  assertSourcePayload,
  loadSourceCatalog,
  loadDataSource,
  createDataSourcePort,
} from '../../src/core/source/index.js';
import { createMemoryFs } from '../fixtures/memory-fs.js';
import { COMMANDS, P2_COMMANDS, OVERRIDE_KEYS } from '../../src/cli/index.js';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const str = (v) => JSON.stringify(v);
const DEMO = 'synthetic-demo';
const EXTERNALS = ['howtocook-recipes', 'usda-fdc-nutrition', 'cn-ingredient-subset', 'user-defined'];

const realFiles = () => ({
  [CATALOG_PATH]: read(CATALOG_PATH),
  [SCHEMA_PATH]: read(SCHEMA_PATH),
  'data/source/synthetic-demo.json': read('data/source/synthetic-demo.json'),
});
const fsOf = (over = {}) => createMemoryFs({ files: { ...realFiles(), ...over } });
const catalog = () => json(CATALOG_PATH);
const schema = () => json(SCHEMA_PATH);
const payload = () => json('data/source/synthetic-demo.json');
const demoEntry = () => catalog().sources.find((s) => s.id === DEMO);
const withSource = (id, patch) => {
  const c = catalog();
  c.sources = c.sources.map((s) => (s.id === id ? { ...s, ...patch } : s));
  return str(c);
};
const withCatalog = (patch) => str({ ...catalog(), ...patch });
const withPayload = (patch) => str({ ...payload(), ...patch });
const codeOf = (fn, code) => assert.throws(fn, (e) => e instanceof SourceError && e.code === code, `expect ${code}`);
const rejectsWith = async (fn, code) => {
  await assert.rejects(fn, (e) => e instanceof SourceError && e.code === code, `expect ${code}`);
};

// ------------------------------------------------------------- key sets

test('T-035 - constants are frozen, canonical and complete', () => {
  for (const set of [SOURCE_ERROR, SOURCE_KINDS, SOURCE_LICENSES, SOURCE_REVIEW_STATES,
    SOURCE_KEYS, CATALOG_KEYS, SCHEMA_KEYS, PAYLOAD_KEYS, RECORD_KEYS, LICENSE_EXPECTATIONS]) {
    assert.ok(Object.isFrozen(set));
  }
  assert.ok(Object.values(SOURCE_ERROR).every((v) => /^ERR_SOURCE_[A-Z_]+$/.test(v)));
  assert.equal(new Set(Object.values(SOURCE_ERROR)).size, Object.values(SOURCE_ERROR).length);
  assert.deepEqual([...SOURCE_KINDS], ['recipe', 'nutrition']);
  assert.deepEqual([...SOURCE_LICENSES], ['Unlicense', 'CC0-1.0', 'user-owned', 'synthetic-neutral-example']);
  assert.ok(SOURCE_REVIEW_STATES.includes('approved'));
  assert.ok(SOURCE_REVIEW_STATES.includes('ai-candidate-unreviewed'));
  assert.deepEqual({ ...LICENSE_EXPECTATIONS }, {
    'howtocook-recipes': 'Unlicense',
    'usda-fdc-nutrition': 'CC0-1.0',
    'cn-ingredient-subset': 'CC0-1.0',
  });
  assert.equal(CATALOG_PATH, 'data/source/catalog.json');
  assert.equal(SCHEMA_PATH, 'data/source/schema.json');
});

// -------------------------------------------------------------- static data

test('T-035 - catalog lists five metadata-only sources; no external data is bundled', () => {
  const c = catalog();
  assert.deepEqual(Object.keys(c).sort(), [...CATALOG_KEYS].sort());
  assert.deepEqual(c.sources.map((s) => s.id), [...EXTERNALS, DEMO]);
  assert.equal(c.review_status, 'ai-candidate-unreviewed');
  for (const s of c.sources.filter((x) => x.id !== DEMO)) {
    assert.equal(s.bundled, false, s.id);
    assert.equal(s.payload_path, null, s.id);
    assert.equal(s.review_status, 'ai-candidate-unreviewed', s.id);
    assert.ok(s.source_url.startsWith('https://'), s.id);
    assert.ok(s.license.length > 0 && s.version.length > 0, s.id);
  }
  assert.equal(c.sources.find((s) => s.id === DEMO).bundled, true);
});

test('T-035 - schema declares the strict policy and matches the frozen contracts', () => {
  const s = schema();
  assert.deepEqual(Object.keys(s).sort(), [...SCHEMA_KEYS].sort());
  assert.equal(s.coverage, 'metadata-only');
  assert.deepEqual(s.license_allowlist, [...SOURCE_LICENSES]);
  assert.deepEqual(s.kind_allowlist, [...SOURCE_KINDS]);
  assert.deepEqual(s.review_status_allowlist, [...SOURCE_REVIEW_STATES]);
  assert.deepEqual(s.license_expectations, { ...LICENSE_EXPECTATIONS });
  for (const [k, v] of Object.entries(s.policy)) assert.equal(v, true, k);
  assert.equal(s.policy.no_network_download, true);
  assert.deepEqual(s.bundled_sources, [DEMO]);
  assert.deepEqual(s.external_candidates, EXTERNALS);
  assert.doesNotThrow(() => assertSourceSchema(s));
});

test('T-035 - the only bundled payload is fully fictional with valid records', () => {
  const p = payload();
  assert.deepEqual(Object.keys(p).sort(), [...PAYLOAD_KEYS].sort());
  assert.equal(p.fictional, true);
  assert.equal(p.id, DEMO);
  assert.ok(p.records.length >= 3);
  for (const r of p.records) {
    assert.deepEqual(Object.keys(r).sort(), [...RECORD_KEYS].sort());
    assert.match(r.id, /^[a-z][a-z0-9._-]*$/);
    assert.ok(Number.isFinite(r.energy_kcal_per_100g) && r.energy_kcal_per_100g >= 0);
    assert.ok(Number.isFinite(r.protein_g_per_100g) && r.protein_g_per_100g >= 0);
  }
  const ids = new Set(p.records.map((r) => r.id));
  for (const r of p.records) {
    for (const sub of r.substitute_ids) assert.ok(ids.has(sub), `dangling substitute ${sub}`);
  }
});

// -------------------------------------------------------- contract: metadata

test('T-035 - assertSourceMetadata accepts the bundled synthetic source', () => {
  const v = assertSourceMetadata(demoEntry(), schema());
  assert.equal(v.id, DEMO);
  assert.equal(v.license, 'synthetic-neutral-example');
  assert.ok(Object.isFrozen(v));
});

test('T-035 - assertSourceMetadata rejects license drift, unknown license and unknown kind', () => {
  const s = schema();
  codeOf(() => assertSourceMetadata({ ...demoEntry(), id: 'howtocook-recipes', license: 'CC0-1.0' }, s), SOURCE_ERROR.CONFLICT);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), license: 'GPL-3.0-only' }, s), SOURCE_ERROR.LICENSE);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), kind: 'unknown' }, s), SOURCE_ERROR.CATALOG);
});

test('T-035 - assertSourceMetadata rejects bad urls, versions, ids and key sets', () => {
  const s = schema();
  for (const url of ['http://example.org/a', 'https://example.org/a?q=1', 'https://example.org/a#f',
    'https://u:p@example.org/a', 'not-a-url', 42, null]) {
    codeOf(() => assertSourceMetadata({ ...demoEntry(), source_url: url }, s), SOURCE_ERROR.URL);
  }
  for (const version of ['', '../x', 1, null]) {
    codeOf(() => assertSourceMetadata({ ...demoEntry(), version }, s), SOURCE_ERROR.VERSION);
  }
  codeOf(() => assertSourceMetadata({ ...demoEntry(), id: 'Bad_ID' }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), injected: 1 }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), bundled: 'yes' }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), payload_path: 'data/../escape.json' }, s), SOURCE_ERROR.CATALOG);
});

test('T-035 - assertSourceMetadata enforces bundled <-> payload_path shape', () => {
  const s = schema();
  assert.doesNotThrow(() => assertSourceMetadata({ ...demoEntry(), bundled: false, payload_path: null }, s));
  codeOf(() => assertSourceMetadata({ ...demoEntry(), bundled: true, payload_path: null }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), bundled: false, payload_path: 'data/source/synthetic-demo.json' }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceMetadata({ ...demoEntry(), payload_path: 'data/source/../escape.json' }, s), SOURCE_ERROR.CATALOG);
});

test('T-035 - assertSourceSchema rejects allowlist / policy / expectations drift', () => {
  const s = schema();
  codeOf(() => assertSourceSchema({ ...s, license_allowlist: ['Unlicense'] }), SOURCE_ERROR.SCHEMA);
  codeOf(() => assertSourceSchema({ ...s, review_status_allowlist: ['approved'] }), SOURCE_ERROR.SCHEMA);
  codeOf(() => assertSourceSchema({ ...s, policy: { ...s.policy, require_approved_review: false } }), SOURCE_ERROR.SCHEMA);
  codeOf(() => assertSourceSchema({ ...s, license_expectations: {} }), SOURCE_ERROR.SCHEMA);
  codeOf(() => assertSourceSchema({ ...s, coverage: 'full' }), SOURCE_ERROR.SCHEMA);
  codeOf(() => assertSourceSchema({ ...s, injected: 1 }), SOURCE_ERROR.SCHEMA);
});

test('T-035 - assertSourceCatalog rejects duplicate ids and bundled-set drift', () => {
  const s = schema();
  const c = catalog();
  codeOf(() => assertSourceCatalog({ ...c, sources: [...c.sources, c.sources[0]] }, s), SOURCE_ERROR.CONFLICT);
  codeOf(() => assertSourceCatalog({ ...c, sources: c.sources.map((x) => (x.id === 'howtocook-recipes'
    ? { ...x, bundled: true, payload_path: 'data/source/synthetic-demo.json' } : x)) }, s),
  SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceCatalog({ ...c, sources: [] }, s), SOURCE_ERROR.CATALOG);
  codeOf(() => assertSourceCatalog({ ...c, schema_version: '9.9.9' }, s), SOURCE_ERROR.CATALOG);
});

// ---------------------------------------------------------- contract: payload

test('T-035 - assertSourcePayload accepts the bundled fictional payload', () => {
  const v = assertSourcePayload(payload(), demoEntry());
  assert.equal(v.fictional, true);
  assert.ok(Object.isFrozen(v) && Object.isFrozen(v.records));
  assert.ok(Object.isFrozen(v.records[0]));
});

test('T-035 - assertSourcePayload rejects metadata drift and non-fictional data', () => {
  const m = demoEntry();
  codeOf(() => assertSourcePayload({ ...payload(), id: 'other-source' }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...payload(), license: 'CC0-1.0' }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...payload(), version: '9.9.9' }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...payload(), fictional: false }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...payload(), fictional: undefined }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...payload(), injected: 1 }, m), SOURCE_ERROR.PAYLOAD);
});

test('T-035 - assertSourcePayload rejects malformed / dangling / private records', () => {
  const m = demoEntry();
  const base = payload();
  codeOf(() => assertSourcePayload({ ...base, records: [] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [{ ...base.records[0], injected: 1 }] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [{ ...base.records[0], id: 'Bad_ID' }] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [{ ...base.records[0], substitute_ids: ['missing'] }] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [{ ...base.records[0], energy_kcal_per_100g: -1 }] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [base.records[0], base.records[0]] }, m), SOURCE_ERROR.PAYLOAD);
  codeOf(() => assertSourcePayload({ ...base, records: [{ ...base.records[0], weight_kg: 70 }] }, m), SOURCE_ERROR.PAYLOAD);
});

// ------------------------------------------------------------------ loader

test('T-035 - loadSourceCatalog is read-only, frozen and idempotent', async () => {
  const fs = fsOf();
  const a = await loadSourceCatalog(fs);
  const b = await loadSourceCatalog(fs);
  assert.deepEqual(a, b);
  assert.equal(a.sources.length, 5);
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.sources) && Object.isFrozen(a.schema));
  assert.deepEqual(fs.writes(), []);
});

test('T-035 - loadSourceCatalog fails closed on missing / malformed inputs', async () => {
  await rejectsWith(() => loadSourceCatalog(fsOf({ [CATALOG_PATH]: '{bad json' })), SOURCE_ERROR.CATALOG);
  await rejectsWith(() => loadSourceCatalog(fsOf({ [SCHEMA_PATH]: '{bad json' })), SOURCE_ERROR.SCHEMA);
  await rejectsWith(() => loadSourceCatalog(fsOf({ [CATALOG_PATH]: withCatalog({ sources: [] }) })), SOURCE_ERROR.CATALOG);
  await rejectsWith(() => loadSourceCatalog(fsOf({ [SCHEMA_PATH]: str({ ...schema(), coverage: 'full' }) })), SOURCE_ERROR.SCHEMA);
  await rejectsWith(() => loadSourceCatalog(null), SOURCE_ERROR.FS);
});

test('T-035 - loadDataSource succeeds only for the bundled synthetic source', async () => {
  const r = await loadDataSource(fsOf(), DEMO);
  assert.equal(r.metadata.id, DEMO);
  assert.equal(r.metadata.license, 'synthetic-neutral-example');
  assert.ok(r.records.length >= 3);
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.metadata) && Object.isFrozen(r.records));
});

test('T-035 - loadDataSource refuses every unverified / unbundled source', async () => {
  for (const id of EXTERNALS) {
    await rejectsWith(() => loadDataSource(fsOf(), id), SOURCE_ERROR.REVIEW);
  }
});

test('T-035 - loadDataSource refuses even an approved external source while not bundled', async () => {
  const fs = fsOf({ [CATALOG_PATH]: withSource('howtocook-recipes', { review_status: 'approved' }) });
  await rejectsWith(() => loadDataSource(fs, 'howtocook-recipes'), SOURCE_ERROR.BUNDLED);
});

test('T-035 - loadDataSource refuses unknown ids, license conflicts and missing payloads', async () => {
  await rejectsWith(() => loadDataSource(fsOf(), 'no-such-source'), SOURCE_ERROR.NOT_FOUND);
  await rejectsWith(() => loadDataSource(fsOf({ [CATALOG_PATH]: withSource('usda-fdc-nutrition', { license: 'Unlicense' }) }), DEMO),
    SOURCE_ERROR.CONFLICT);
  await rejectsWith(() => loadDataSource(fsOf({ 'data/source/synthetic-demo.json': '{bad json' }), DEMO), SOURCE_ERROR.PAYLOAD);
  const empty = fsOf();
  await empty.remove('data/source/synthetic-demo.json');
  await rejectsWith(() => loadDataSource(empty, DEMO), SOURCE_ERROR.PAYLOAD);
});

test('T-035 - loadDataSource refuses payload drift / private fields / non-fictional records', async () => {
  for (const text of [
    withPayload({ license: 'CC0-1.0' }),
    withPayload({ fictional: false }),
    withPayload({ records: [] }),
    withPayload({ records: [{ ...payload().records[0], substitute_ids: ['missing'] }] }),
    withPayload({ records: [{ ...payload().records[0], weight_kg: 70 }] }),
  ]) {
    await rejectsWith(() => loadDataSource(fsOf({ 'data/source/synthetic-demo.json': text }), DEMO),
      SOURCE_ERROR.PAYLOAD);
  }
});

test('T-035 - createDataSourcePort lists sources, loads the demo and describes the policy', async () => {
  const port = await createDataSourcePort(fsOf());
  assert.ok(Object.isFrozen(port));
  assert.deepEqual(await port.listSources(), [...EXTERNALS, DEMO]);
  const loaded = await port.loadSource(DEMO);
  assert.equal(loaded.metadata.id, DEMO);
  await assert.rejects(() => port.loadSource('howtocook-recipes'), SourceError);
  assert.equal(port.describePolicy().require_approved_review, true);
  assert.equal(port.describePolicy().no_network_download, true);
  assert.ok(Object.isFrozen(port.describePolicy()));
});

// ---------------------------------------------------------- AC / boundaries

test('T-035 - zero fallback: CLI never auto-wires the data source port', () => {
  for (const rel of ['src/cli/run.js', 'src/cli/plan.js', 'src/cli/index.js', 'src/cli/config.js']) {
    const text = read(rel);
    assert.equal(text.includes('createDataSourcePort'), false, rel);
    assert.equal(text.includes('loadDataSource'), false, rel);
  }
  assert.deepEqual([...COMMANDS].sort(),
    ['acceptance', 'delete-data', 'export-data', 'init', 'ledger', 'plan', 'validate']);
  assert.deepEqual([...P2_COMMANDS], ['serve-mcp', 'locales']);
  assert.deepEqual([...OVERRIDE_KEYS], ['lang', 'guideline', 'calendar', 'country']);
  assert.match(read('src/cli/plan.js'), /requirePort\(deps, 'resolveLocalePolicy'/);
});

test('T-035 - core/source is pure ESM, zero IO imports, zero network exits', () => {
  const files = readdirSync(new URL('../../src/core/source/', import.meta.url)).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 2);
  for (const file of files) {
    const src = read(`src/core/source/${file}`);
    assert.match(src.split('\n')[0], /^\/\/ SPDX-License-Identifier: GPL-3\.0-only$/);
    assert.equal(/from\s+['"]node:/.test(src), false, file);
    assert.equal(/require\(/.test(src), false, file);
    const code = src.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.equal(/\bfetch\s*\(|XMLHttpRequest|https?\.(?:get|request)\s*\(/.test(code), false, file);
  }
});

test('T-035 - data/source contains no real-data tokens and no real source payloads', () => {
  const rule = new RegExp(/const TOKENS = \/(.+?)\/;/.exec(read('.github/workflows/ci.yml'))[1]);
  const files = readdirSync(new URL('../../data/source/', import.meta.url));
  assert.equal(files.filter((f) => f.endsWith('.json')).length, 3);
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    assert.equal(rule.test(read(`data/source/${file}`)), false, file);
  }
  assert.equal(json('data/source/synthetic-demo.json').fictional, true);
  assert.equal(json('data/source/catalog.json').coverage ?? 'metadata-only', 'metadata-only');
});

test('T-035 - AC-13 / AC-18 / P1 gate remain RED-BLOCKED', () => {
  assert.match(read('tests/acceptance/ac-13.md'), /\| 状态 \| \*\*RED\*\* \|/);
  assert.match(read('tests/acceptance/ac-18.md'), /\| 状态 \| \*\*RED\*\* \|/);
  const lines = read('tasks.md').split('\n');
  assert.equal(lines.filter((l) => /^- \[ \]/.test(l)).length, 39);
  assert.equal(lines.filter((l) => /^- \[x\]/.test(l)).length, 0);
});
