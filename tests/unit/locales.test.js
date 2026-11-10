// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-031 · Canonical ID 键集 / 七语言包 / 回退链单测
 * （FR-040 / FR-041 / FR-042 / FR-043 / FR-044 / AC-15 / SC-011 / NFR-011 / P-11）。
 *
 * ATDD 先红后绿：本文件先于 `locales/` 与 `src/core/locale/fallback.js` 落盘，初态必须为 RED。
 * 口径与 P1 一致：真实数据令牌正则动态取自 `ci.yml` 唯一权威规则，测试内不复制字面量；
 * 负向探针主动构造缺键 / 缺包，确认被拒绝而不是被静默混排。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  LANGUAGE_PACK_KEYS,
  REQUIRED_NOTICE_KEYS,
  RX_FIELDS,
  VERSION_KEYS,
  validateLanguagePack,
  resolvePackKey,
  render,
  extractRenderData,
} from '../../src/core/render/index.js';
import {
  BUILTIN_TAGS,
  BASE_TAG,
  LOCALE_ERROR,
  baseTagChain,
  buildFallbackChain,
  resolveLanguagePack,
  verifyLanguagePacks,
} from '../../src/core/locale/fallback.js';
import { loadBuiltinLanguagePacks, createLanguagePackLoader, createListLocalesPort } from '../../src/io/language-pack.js';
import { COMMANDS, P2_COMMANDS, ALL_COMMANDS, parseArgs } from '../../src/cli/args.js';
import { EXIT, runCli } from '../../src/cli/run.js';
import { createMcpServer } from '../../src/mcp/index.js';
import { handleRequest } from '../../src/mcp/jsonrpc.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

/** 真实文件只读端口；负向探针用 `makeFsPort` 覆盖。 */
const realFsPort = { readJson: async (p) => readJson(p) };
/** @param {Record<string, unknown>} overrides */
const makeFsPort = (overrides = {}) => ({
  readJson: async (p) => (Object.hasOwn(overrides, p) ? overrides[p] : readJson(p)),
});

/** CI 唯一权威规则，源码内不落真实数据字面量。 */
const TOKEN_RULE = /const TOKENS = \/(.+?)\/;/.exec(read('.github/workflows/ci.yml'))?.[1] ?? '';
const bodyTokens = () => new RegExp(TOKEN_RULE);

const SCHEMA = () => readJson('locales/_schema/keys.json');
const SOURCES = async () => (await loadBuiltinLanguagePacks(realFsPort)).sources;
const asPack = (tag, strings) => ({ tag, strings, fallback_keys: [] });
const linesOf = (result) => result.lines.join('\n');

// ------------------------------------------------- FR-041 / SC-011 · 键集与语言包

test('T-031 · _schema/keys.json 与 T-018 冻结键集逐字一致（FR-041 / P-11）', () => {
  const schema = SCHEMA();
  assert.equal(schema.base_tag, BASE_TAG);
  assert.deepEqual([...schema.tags], [...BUILTIN_TAGS]);
  assert.deepEqual([...schema.keys], [...LANGUAGE_PACK_KEYS]);
  assert.equal(schema.keys.length, 71);
  assert.equal(new Set(schema.keys).size, schema.keys.length);
  for (const key of schema.keys) {
    assert.match(key, /^[a-z][a-z0-9._-]{0,63}$/, `${key} 必须是 Canonical ID`);
  }
});

test('T-031 · 七个内置语言包落盘且键集 100% 一致（SC-011 / NFR-011）', async () => {
  assert.deepEqual([...BUILTIN_TAGS], ['zh-Hans', 'en', 'fr', 'de', 'es', 'ru', 'la']);
  const schema = SCHEMA();
  const sources = await SOURCES();
  for (const tag of BUILTIN_TAGS) {
    assert.ok(existsSync(join(ROOT, 'locales', tag, 'strings.json')), `${tag} 语言包缺失`);
    const strings = sources[tag];
    assert.ok(strings, `${tag} 语言包不可读`);
    assert.deepEqual(Object.keys(strings).sort(), [...schema.keys].sort(), `${tag} 键集不一致`);
    assert.equal(Object.keys(strings).length, 71);
  }
});

test('T-031 · 全部译文非空、单行、表格安全、UTF-8 合法（FR-041 / NFR-006）', async () => {
  const sources = await SOURCES();
  for (const tag of BUILTIN_TAGS) {
    for (const [key, value] of Object.entries(sources[tag])) {
      assert.equal(typeof value, 'string', `${tag}/${key} 必须是字符串`);
      assert.ok(value.length > 0, `${tag}/${key} 不得为空`);
      assert.ok(!/[\x00-\x1F\x7F|`]/.test(value), `${tag}/${key} 含控制字符或表格分隔符`);
      assert.equal(Buffer.from(value, 'utf8').toString('utf8'), value, `${tag}/${key} 非合法 UTF-8`);
      assert.ok(!bodyTokens().test(value), `${tag}/${key} 命中真实数据令牌`);
    }
    validateLanguagePack(asPack(tag, sources[tag]));
  }
});

test('T-031 · 七份语言包是各自语言而非复制粘贴（FR-040 / FR-044）', async () => {
  const sources = await SOURCES();
  const probes = [
    'render.title.day', 'render.section.prescription', 'render.field.energy_kcal',
    'plan.notice.disclaimer', 'render.marker.untranslated',
  ];
  for (const key of probes) {
    const texts = BUILTIN_TAGS.map((tag) => sources[tag][key]);
    assert.equal(new Set(texts).size, 7, `${key} 七语言译文不得重复`);
  }
});

test('T-031 · 拉丁语现代术语「规范译名 + 原文」并列（FR-043 / E-12 / AC-15）', async () => {
  const sources = await SOURCES();
  const modern = [
    'render.field.energy_kcal', 'render.field.protein_g', 'render.guardrail.energy_floor_kcal',
    'render.section.canonical_data', 'render.unit.kcal', 'render.meta.language_tag',
  ];
  for (const key of modern) {
    const text = sources.la[key];
    assert.ok(text.includes('(') && text.includes(')'), `${key} 缺原文并列`);
    assert.ok(/[A-Za-z]/.test(text.slice(text.indexOf('('))), `${key} 并列段缺原文`);
  }
  assert.ok(/[\u4e00-\u9fff]/.test(sources['zh-Hans']['render.title.day']), '中文包必须含汉字');
});

// ------------------------------------------------- FR-042 · 回退链

test('T-031 · BCP 47 基础标签逐级截断（FR-042）', () => {
  assert.deepEqual(baseTagChain('zh-Hant-TW'), ['zh-Hant-TW', 'zh-Hant', 'zh']);
  assert.deepEqual(baseTagChain('zh-Hans'), ['zh-Hans', 'zh']);
  assert.deepEqual(baseTagChain('en'), ['en']);
  assert.deepEqual(baseTagChain('xx-Zzzz'), ['xx-Zzzz', 'xx']);
  assert.throws(() => baseTagChain(''), (e) => e.code === LOCALE_ERROR.TAG);
});

test('T-031 · 回退链顺序：请求 → 基础标签 → 配置默认 → en（FR-042）', async () => {
  const sources = await SOURCES();
  const available = Object.keys(sources);
  const chain = buildFallbackChain('zh-Hans-CN', { availableTags: available, defaultTag: 'de' });
  assert.deepEqual(chain, ['zh-Hans', 'de', 'en']);
  const missing = buildFallbackChain('xx-Zzzz', { availableTags: available, defaultTag: 'de' });
  assert.deepEqual(missing, ['de', 'en']);
  assert.equal(missing.at(-1), BASE_TAG);
  const unknownDefault = buildFallbackChain('xx-Zzzz', { availableTags: available, defaultTag: 'en' });
  assert.deepEqual(unknownDefault, ['en'], '未配置默认语言时只余英文兜底');
});

test('T-031 · 未知标签回退英文，71 键全部显式标注为回退（AC-15 / FR-042）', async () => {
  const sources = await SOURCES();
  const result = resolveLanguagePack('xx-Zzzz', sources);
  assert.equal(result.tag, BASE_TAG);
  assert.equal(result.resolved_by, 'fallback');
  assert.equal(result.missing_keys.length, 0);
  assert.deepEqual([...result.fallback_keys].sort(), [...LANGUAGE_PACK_KEYS].sort());
  const pack = validateLanguagePack({
    tag: result.tag, strings: result.strings, fallback_keys: result.fallback_keys,
  });
  assert.equal(resolvePackKey(pack, 'render.title.day').state, 'fallback');
  assert.equal(pack.strings['render.title.day'], sources.en['render.title.day']);
});

test('T-031 · 配置默认语言生效时同样整包标注，不静默混排（FR-042 / FR-046）', async () => {
  const sources = await SOURCES();
  const result = resolveLanguagePack('xx-Zzzz', sources, { defaultTag: 'de' });
  assert.equal(result.tag, 'de');
  assert.equal(result.resolved_by, 'default');
  assert.equal(result.fallback_keys.length, LANGUAGE_PACK_KEYS.length);
  assert.equal(result.strings['render.title.day'], sources.de['render.title.day']);
});

test('T-031 · 区域子标签经基础标签命中，不静默改用默认语言（FR-042 / FR-046）', async () => {
  const sources = await SOURCES();
  const result = resolveLanguagePack('zh-Hans-CN', sources, { defaultTag: 'de' });
  assert.equal(result.tag, 'zh-Hans');
  assert.equal(result.resolved_by, 'base-tag');
  assert.equal(result.fallback_keys.length, 0);
  assert.equal(result.strings['render.title.day'], sources['zh-Hans']['render.title.day']);
});

test('T-031 · 自定义语言包缺键由 en 回退并逐键标注，绝不静默混排（FR-042）', async () => {
  const sources = await SOURCES();
  const partial = { 'render.title.day': 'Eigenes Wort' };
  const result = resolveLanguagePack('custom', { ...sources, custom: partial }, { defaultTag: 'en' });
  assert.equal(result.tag, 'custom');
  assert.equal(result.strings['render.title.day'], 'Eigenes Wort');
  assert.equal(result.strings['render.title.year'], sources.en['render.title.year']);
  assert.ok(result.fallback_keys.includes('render.title.year'));
  assert.ok(!result.fallback_keys.includes('render.title.day'));
  assert.equal(result.fallback_keys.length, LANGUAGE_PACK_KEYS.length - 1);
  const pack = validateLanguagePack({
    tag: result.tag, strings: result.strings, fallback_keys: result.fallback_keys,
  });
  assert.equal(resolvePackKey(pack, 'render.title.day').state, 'direct');
  assert.equal(resolvePackKey(pack, 'render.title.year').state, 'fallback');
});

test('T-031 · verifyLanguagePacks 检出缺键 / 缺包 / 多余键（SC-011）', async () => {
  const sources = await SOURCES();
  const keys = SCHEMA().keys;
  assert.equal(verifyLanguagePacks(sources, keys).ok, true);
  const dropped = { ...sources, fr: Object.fromEntries(
    Object.entries(sources.fr).filter(([k]) => k !== 'render.title.day'),
  ) };
  const bad = verifyLanguagePacks(dropped, keys);
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i) => i.tag === 'fr' && i.key === 'render.title.day'));
  const noPack = verifyLanguagePacks({ ...sources, de: null }, keys);
  assert.equal(noPack.ok, false);
  assert.ok(noPack.issues.some((i) => i.tag === 'de' && i.code === LOCALE_ERROR.PACK_MISSING));
  const extra = verifyLanguagePacks({ ...sources, es: { ...sources.es, 'render.extra.key': 'x' } }, keys);
  assert.equal(extra.ok, false);
});

// ------------------------------------------------- CLI · rr locales --verify

test('T-031 · 命令集分层：P1 七条快照不变，P2 追加 locales（FR-029 / P-02）', () => {
  assert.deepEqual([...COMMANDS].sort(),
    ['acceptance', 'delete-data', 'export-data', 'init', 'ledger', 'plan', 'validate']);
  assert.deepEqual([...P2_COMMANDS], ['serve-mcp', 'locales']);
  assert.equal(ALL_COMMANDS.length, 9);
  assert.deepEqual(parseArgs(['locales', '--verify']).options, { verify: true });
  assert.deepEqual(parseArgs(['locales']).options, {});
  assert.throws(() => parseArgs(['locales', '--confirm']), /ERR_CLI_OPTION/);
  assert.throws(() => parseArgs(['feedback']), /ERR_CLI_COMMAND/);
});

test('T-031 · rr locales --verify 端到端通过且只输出稳定计数（SC-011）', async () => {
  const result = await runCli(['locales', '--verify'], { fsPort: realFsPort });
  assert.equal(result.exit, EXIT.OK);
  const text = linesOf(result);
  assert.ok(text.includes('key_count=71'));
  assert.ok(text.includes('tags=7'));
  assert.ok(text.includes('verified=7'));
  assert.ok(text.endsWith('status=ok'));
  assert.ok(!bodyTokens().test(text));
});

test('T-031 · rr locales 无 --verify 时列出七个 BCP 47 标签（FR-040）', async () => {
  const result = await runCli(['locales'], { fsPort: realFsPort });
  assert.equal(result.exit, EXIT.OK);
  const text = linesOf(result);
  assert.ok(text.includes('zh-Hans') && text.includes('la'));
  assert.ok(text.includes('tags=7'));
  assert.ok(text.endsWith('status=ok'));
});

test('T-031 · rr locales --verify 缺 fsPort 即 exit 3 / ERR_CLI_PORT（T-019 口径）', async () => {
  const result = await runCli(['locales', '--verify'], {});
  assert.equal(result.exit, EXIT.PORT);
  assert.ok(linesOf(result).includes('ERR_CLI_PORT'));
  assert.ok(linesOf(result).endsWith('status=error'));
});

test('T-031 · 负向探针：缺键语言包使 --verify 失败而非假绿（SC-011）', async () => {
  const broken = makeFsPort({
    'locales/fr/strings.json': Object.fromEntries(
      Object.entries(readJson('locales/fr/strings.json')).filter(([k]) => k !== 'render.title.day'),
    ),
  });
  const result = await runCli(['locales', '--verify'], { fsPort: broken });
  assert.equal(result.exit, EXIT.DOMAIN);
  const text = linesOf(result);
  assert.ok(text.includes('ERR_CLI_LOCALES'));
  assert.ok(text.includes('render.title.day'));
  assert.ok(text.endsWith('status=error'));
  assert.ok(!bodyTokens().test(text));
});

// ------------------------------------------------- T-019 端口接线

test('T-031 · createLanguagePackLoader 产出可被 render 消费的三键包（FR-040 / T-019）', async () => {
  const loader = createLanguagePackLoader(realFsPort);
  for (const tag of BUILTIN_TAGS) {
    const pack = await loader(tag);
    assert.equal(pack.tag, tag);
    assert.equal(Object.keys(pack.strings).length, 71);
    assert.deepEqual([...pack.fallback_keys], []);
    assert.equal(resolvePackKey(pack, 'render.title.day').state, 'direct');
  }
  const fallback = await loader('xx-Zzzz');
  assert.equal(fallback.tag, BASE_TAG);
  assert.equal(fallback.fallback_keys.length, 71);
});

test('T-031 · 语言包目录零真实数据令牌、零机器码（FR-041 / P-16）', () => {
  const files = readdirSync(join(ROOT, 'locales'), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory()
      ? readdirSync(join(ROOT, 'locales', e.name)).map((f) => `locales/${e.name}/${f}`)
      : []));
  assert.ok(files.length >= 7);
  for (const p of files) {
    assert.ok(!bodyTokens().test(read(p)), `${p} 命中真实数据令牌`);
    assert.ok(p.endsWith('.json'), `${p} 必须是可读文本`);
  }
});

// ------------------------------------------------- FR-044 / SC-011 · 语言切换不改数值

/** 与 render.test.js 同构的最小合成计划对象；数值全为纯合成，绝非身体数据（P-14）。 */
const CALENDAR = Object.freeze({
  cache_id: 'calendar-fixture-2026', year: 2026, status: 'verified',
  term_ids: Object.freeze(['term.fixture_a']), active_term_id: 'term.fixture_a',
  manual_review_key: null,
});

function minimalPlan() {
  return {
    level: 'week',
    period_id: '2026-W45',
    file_name: '2026-W45.md',
    header: {
      level: 'week', period_id: '2026-W45', title: 'render.title.week', file_name: '2026-W45.md',
      generated_date: '2026-11-06', generated_at: '2026-11-06T20:00:00+08:00',
      run_date: '2026-11-06', trigger: 'plan.trigger.period_first_day',
      version_ids: Object.fromEntries(VERSION_KEYS.map((k) => [k, `${k}-v1`])),
      parent: null, children: [], link_references: [],
      language_tag: 'xx', locale_source: 'user', guideline_id: 'generic-guideline',
      calendar: CALENDAR,
      execution_window: Object.freeze({
        start_date: '2026-11-09', end_date: '2026-11-15',
        total_days: 7, executed_days: 4, remaining_days: 3,
      }),
      notice_keys: [...REQUIRED_NOTICE_KEYS],
    },
    prescription: Object.fromEntries(RX_FIELDS.map((k, i) => [k, [100 + i, 200 + i]])),
    guardrails: Object.freeze({ energy_floor_kcal: 120, protein_floor_g: 60 }),
    calendar: CALENDAR,
    days: [Object.freeze({ plan_date: '2026-11-09', file_name: '2026-11-09.md' })],
  };
}

/** 固定格式化器：让可见输出差异只可能来自语言包（FR-044）。 */
const fixedIntl = Object.freeze({
  number: (value, unitKey) => `n:${value}:${unitKey}`,
  date: (value) => `d:${value}`,
});

test('T-031 · 七语言渲染的规范数据区完全一致，可见输出各不相同（FR-044 / SC-011）', async () => {
  const sources = await SOURCES();
  const plan = minimalPlan();
  const outputs = BUILTIN_TAGS.map((tag) => render(
    plan,
    validateLanguagePack(asPack(tag, sources[tag])),
    fixedIntl,
  ));
  assert.equal(new Set(outputs).size, 7, '七份可见输出必须逐字节不同');
  const records = outputs.map((md) => extractRenderData(md));
  assert.ok(Object.keys(records[0]).length > 0, '规范数据区不得为空（防假绿）');
  for (const record of records) assert.deepEqual(record, records[0]);
});

test('T-031 · 可选 listLocales 端口让 rr_list_locales 取到七标签（FR-040 / plan.md §6.3）', async () => {
  const ctx = createMcpServer({ listLocales: createListLocalesPort() }).context;
  const res = await handleRequest({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'rr_list_locales', arguments: {} },
  }, ctx);
  assert.equal(res.result.isError, false);
  const payload = JSON.parse(res.result.content[0].text);
  assert.deepEqual(payload.locales, [...BUILTIN_TAGS]);
  assert.ok(!bodyTokens().test(JSON.stringify(res)));
});
