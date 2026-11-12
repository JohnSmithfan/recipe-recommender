// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-036 · 多语言快照与术语单测（ATDD 先红后绿）。
 *
 * 规格：tasks.md T-036；SPEC.md FR-040～044、AC-15、SC-011、E-12；
 * plan.md §4 / §5.4 / §9；constitution.md P-02 / P-09 / P-11 / P-14。
 *
 * 取证对象全部是**完全虚构**的合成计划对象与仓库内语言包；快照必须是真实
 * render() 输出，不得预填伪造文本（tests/snapshots/README.md / P-02 / P-09）。
 * AC-15 仍为 RED：本任务只提供可执行取证，不转绿、不改 tasks.md、不改 P0 基线。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  BUILTIN_TAGS,
  FALLBACK_TAG,
  SNAPSHOT_TAGS,
  SNAPSHOT_DIR,
  MANIFEST_PATH,
  GLOSSARY_PATH,
  MANIFEST_KEYS,
  GLOSSARY_KEYS,
  sha256,
  loadPacks,
  buildFixturePlan,
  fixedIntl,
  makePack,
  renderFor,
  uncoveredCjk,
  cjkChars,
  comboFp,
  ledgerLine,
  ledgerLineSha256,
  latinGlossary,
  structuredShape,
} from '../../tests/snapshots/i18n/fixture.mjs';
import {
  render,
  extractRenderData,
  extractCanonicalBlock,
  LANGUAGE_PACK_KEYS,
} from '../../src/core/render/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const manifest = () => readJson(MANIFEST_PATH);
const glossary = () => readJson(GLOSSARY_PATH);
const snapshot = (tag) => read(`${SNAPSHOT_DIR}/${tag}.md`);

/** 真实数据令牌规则动态取自 ci.yml 唯一权威，避免本文件自命中（T-021 口径）。 */
const TOKEN_RE = (() => {
  const m = /const TOKENS = \/(.+?)\/;/.exec(read('.github/workflows/ci.yml'));
  assert.ok(m, 'ci.yml 必须保留 TOKENS 唯一权威规则');
  return new RegExp(m[1]);
})();

/** 判别键须两两互不为子串（实测 71 键中有 61 个合格；protein_g 与 la 的 Proteinum 冲突）。 */
const DISCRIMINATORS = Object.freeze([
  'render.title.day',
  'render.section.prescription',
  'render.col.field',
]);

// ---------------------------------------------------------------- 快照契约

test('T-036 · 七语言 + 回退共 8 份真实快照齐备，清单与术语表存在', () => {
  assert.deepEqual([...BUILTIN_TAGS], ['zh-Hans', 'en', 'fr', 'de', 'es', 'ru', 'la']);
  assert.equal(FALLBACK_TAG, 'xx-Zzzz');
  assert.deepEqual([...SNAPSHOT_TAGS], [...BUILTIN_TAGS, FALLBACK_TAG]);
  for (const tag of SNAPSHOT_TAGS) {
    assert.ok(existsSync(new URL(`${SNAPSHOT_DIR}/${tag}.md`, ROOT)), `${tag} 快照必须存在`);
    assert.ok(snapshot(tag).length > 0, `${tag} 快照不得为空占位`);
  }
  assert.ok(existsSync(new URL(MANIFEST_PATH, ROOT)));
  assert.ok(existsSync(new URL(GLOSSARY_PATH, ROOT)));
  assert.notEqual(snapshot(FALLBACK_TAG).length, 158, '不得沿用 P0 占位文件内容');
});

test('T-036 · manifest 固定键集、8 条记录、标签顺序与防假绿标记', () => {
  const m = manifest();
  const keys = Object.keys(m);
  assert.deepEqual([...keys].sort(), [...MANIFEST_KEYS].sort());
  assert.equal(m.schema_version, '1.0.0');
  assert.equal(m.fictional, true);
  assert.equal(m.review_status, 'ai-candidate-unreviewed');
  assert.equal(m.product_e2e, 'unwired');
  assert.equal(m.sections_source, 'synthetic-render-fixture');
  assert.equal(m.key_count, LANGUAGE_PACK_KEYS.length);
  assert.deepEqual(m.tags, [...SNAPSHOT_TAGS]);
  assert.equal(m.entries.length, 8);
  assert.deepEqual(m.entries.map((e) => e.tag), [...SNAPSHOT_TAGS]);
});

test('T-036 · manifest 每条 sha256 与落盘快照字节一致（防伪造哈希）', () => {
  const m = manifest();
  for (const e of m.entries) {
    const body = snapshot(e.tag);
    assert.equal(sha256(body), e.sha256, `${e.tag} 哈希必须与正文一致`);
    assert.equal(Buffer.byteLength(body, 'utf8'), e.bytes, `${e.tag} 字节数必须一致`);
    assert.equal(e.file, `${e.tag}.md`);
  }
});

test('T-036 · 每份快照与实时 render() 逐字节一致（不得预填伪造输出）', () => {
  const sources = loadPacks();
  const plan = buildFixturePlan();
  for (const tag of SNAPSHOT_TAGS) {
    const live = render(plan, makePack(tag, sources), fixedIntl);
    assert.equal(snapshot(tag), live, `${tag} 快照必须等于实时渲染`);
    assert.equal(sha256(live), manifest().entries.find((e) => e.tag === tag).sha256);
  }
});

test('T-036 · 七份可见输出逐字节互不相同（FR-040 / SC-011）', () => {
  const texts = BUILTIN_TAGS.map(snapshot);
  assert.equal(new Set(texts).size, 7);
});

test('T-036 · 八份快照均为合法 UTF-8，零替换字符 / 零控制字符', () => {
  for (const tag of SNAPSHOT_TAGS) {
    const body = snapshot(tag);
    assert.equal(Buffer.from(body, 'utf8').toString('utf8'), body, `${tag} 必须是合法 UTF-8`);
    assert.ok(!body.includes('\uFFFD'), `${tag} 不得含替换字符`);
    assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(body), `${tag} 不得含控制字符`);
    assert.ok(!body.includes('\r'), `${tag} 必须 LF 结尾`);
  }
});

// ---------------------------------------------------------------- FR-044 不变量

test('T-036 · 八份规范数据区深度相等且非空（FR-044 / SC-011）', () => {
  const records = SNAPSHOT_TAGS.map((tag) => extractRenderData(snapshot(tag)));
  assert.ok(Object.keys(records[0]).length > 20, '规范数据区不得为空（防假绿）');
  for (const r of records) assert.deepEqual(r, records[0]);
  const m = manifest();
  assert.equal(m.rr_data_sha256, sha256(JSON.stringify(records[0])));
  for (const e of m.entries) assert.equal(e.rr_data_sha256, m.rr_data_sha256);
});

test('T-036 · 七份营养处方与护栏数值完全一致', () => {
  const base = extractRenderData(snapshot('en'));
  const numeric = Object.keys(base).filter((k) => k.startsWith('rx.') || k.startsWith('guardrail.'));
  assert.ok(numeric.length >= 20, '营养数值键必须存在（防假绿）');
  for (const tag of BUILTIN_TAGS) {
    const r = extractRenderData(snapshot(tag));
    for (const k of numeric) assert.equal(r[k], base[k], `${tag} 的 ${k} 不得随语言变化`);
  }
});

test('T-036 · 七份四餐食材克数完全一致（FR-043）', () => {
  const grams = (tag) => [...snapshot(tag).matchAll(/`(\d+(?:\.\d+)?)g`/g)].map((m) => m[1]);
  const base = grams('en');
  assert.ok(base.length >= 4, '食材克数不得少于四餐（防假绿）');
  for (const tag of BUILTIN_TAGS) assert.deepEqual(grams(tag), base, `${tag} 克数不得变化`);
});

test('T-036 · 去重指纹与台账哈希在八份快照中恒定（FR-044）', () => {
  const m = manifest();
  assert.match(m.combo_fp, /^fp-[0-9a-f]{8}$/);
  assert.equal(m.combo_fp, comboFp());
  assert.equal(m.ledger_sha256, ledgerLineSha256());
  for (const e of m.entries) {
    assert.equal(e.combo_fp, m.combo_fp, `${e.tag} 指纹不得变化`);
    assert.equal(e.ledger_sha256, m.ledger_sha256, `${e.tag} 台账哈希不得变化`);
  }
  const line = ledgerLine();
  assert.ok(/^[\x20-\x7E]+$/.test(line), '台账行必须纯 ASCII Canonical ID');
  const sources = loadPacks();
  for (const tag of BUILTIN_TAGS) {
    for (const key of DISCRIMINATORS) {
      assert.ok(!line.includes(sources[tag][key]), `台账行不得混入 ${tag} 译文`);
    }
  }
});

// ---------------------------------------------------------------- FR-043 编码与拉丁术语

test('T-036 · 中文快照汉字全部落在 GB 18030-2022 实现级别 1 覆盖内', () => {
  const zh = snapshot('zh-Hans');
  const chars = cjkChars(zh);
  assert.ok(chars.length > 50, '中文快照必须含足量汉字（防假绿）');
  assert.deepEqual(uncoveredCjk(zh), [], '不得出现双字节区外汉字');
  const entry = manifest().entries.find((e) => e.tag === 'zh-Hans');
  assert.equal(entry.gb18030_l1_uncovered, 0);
  assert.equal(entry.cjk_count, new Set(chars).size);
});

test('T-036 · GB 18030 判定有防假绿负例：四字节区汉字被检出', () => {
  assert.deepEqual(uncoveredCjk('日常 \u{20000}'), ['\u{20000}']);
  assert.deepEqual(uncoveredCjk('日常营养'), []);
});

test('T-036 · 中文快照汉字只来自语言包，且整包汉字亦全部覆盖（不漏扫）', () => {
  const zhPack = loadPacks()['zh-Hans'];
  const packChars = new Set(cjkChars(JSON.stringify(zhPack)));
  const snapChars = new Set(cjkChars(snapshot('zh-Hans')));
  assert.ok(packChars.size > 100, '语言包汉字规模必须充足（防假绿）');
  assert.ok(snapChars.size > 50);
  for (const c of snapChars) assert.ok(packChars.has(c), `${c} 不得来自语言包之外`);
  assert.deepEqual(uncoveredCjk(JSON.stringify(zhPack)), [], '整包汉字均须在级别 1 内');
});

test('T-036 · 术语表固定键集且逐键覆盖冻结 71 键', () => {
  const g = glossary();
  assert.deepEqual([...Object.keys(g)].sort(), [...GLOSSARY_KEYS].sort());
  assert.equal(g.fictional, true);
  assert.equal(g.review_status, 'ai-candidate-unreviewed');
  assert.equal(g.source, 'locales/la/strings.json');
  assert.equal(g.key_count, LANGUAGE_PACK_KEYS.length);
  assert.equal(g.entries.length, LANGUAGE_PACK_KEYS.length);
  assert.deepEqual(g.entries.map((e) => e.key), [...LANGUAGE_PACK_KEYS]);
  assert.equal(g.paired_count, LANGUAGE_PACK_KEYS.length);
});

test('T-036 · 拉丁语每条术语均为「规范译名 + 学名/原文」并列（E-12）', () => {
  const g = glossary();
  for (const e of g.entries) {
    assert.equal(e.paired, true, `${e.key} 必须并列`);
    assert.ok(e.norm_name.length > 0 && /^[A-Za-z]/.test(e.norm_name), `${e.key} 缺规范译名`);
    assert.ok(/^[A-Za-z0-9._ ,/-]+$/.test(e.source_form), `${e.key} 原文必须是 ASCII 稳定标识`);
    assert.equal(e.pair_form, `${e.norm_name} (${e.source_form})`);
  }
  const built = latinGlossary(loadPacks());
  assert.deepEqual(built, g.entries);
});

test('T-036 · 拉丁语现代食材术语表为完全虚构且未宣称已接线', () => {
  const g = glossary();
  assert.ok(g.modern_food_terms.length >= 4);
  for (const t of g.modern_food_terms) {
    assert.equal(t.fictional, true);
    assert.equal(t.review_status, 'ai-candidate-unreviewed');
    assert.equal(t.wired, false);
    assert.match(t.id, /^[a-z][a-z0-9._-]*$/);
    assert.equal(t.pair_form, `${t.latin_name} (${t.source_form})`);
  }
});

test('T-036 · 拉丁语快照菜谱结构与 en 完全一致，只改字符串', () => {
  const la = structuredShape(snapshot('la'));
  const en = structuredShape(snapshot('en'));
  assert.deepEqual(la, en, '章节数 / 表格行数 / 规范数据区 / Canonical ID 集合不得变化');
  assert.ok(la.tableRows > 10, '结构摘要不得为空（防假绿）');
  assert.ok(!snapshot('la').includes('render.marker.untranslated'));
  assert.ok(snapshot('la').includes('Consilium diurnum (day plan)'));
});

// ---------------------------------------------------------------- 回退链与语言纯度

test('T-036 · 七语言包各自只使用所请求语言（判别译文不跨语言出现）', () => {
  const sources = loadPacks();
  for (const tag of BUILTIN_TAGS) {
    const body = snapshot(tag);
    for (const key of DISCRIMINATORS) {
      const own = sources[tag][key];
      assert.ok(body.includes(`${own}`), `${tag} 必须含本语言 ${key} 译文`);
      for (const other of BUILTIN_TAGS.filter((t) => t !== tag)) {
        assert.ok(!body.includes(`${sources[other][key]}`),
          `${tag} 不得混入 ${other} 的 ${key} 译文`);
      }
    }
  }
});

test('T-036 · 七份 direct 命中零回退键、零缺失键', () => {
  for (const e of manifest().entries.filter((x) => x.tag !== FALLBACK_TAG)) {
    assert.equal(e.resolved_by, 'direct', `${e.tag} 必须直接命中`);
    assert.equal(e.resolved_tag, e.tag);
    assert.equal(e.fallback_keys, 0);
    assert.equal(e.missing_keys, 0);
  }
});

test('T-036 · 无语言包标签按回退链落到 en，71 键逐条标注且不静默混排', () => {
  const e = manifest().entries.find((x) => x.tag === FALLBACK_TAG);
  assert.equal(e.resolved_tag, 'en');
  assert.equal(e.resolved_by, 'fallback');
  assert.equal(e.fallback_keys, LANGUAGE_PACK_KEYS.length);
  assert.equal(e.missing_keys, 0);
  const body = snapshot(FALLBACK_TAG);
  const marker = loadPacks().en['render.marker.fallback'];
  assert.equal(marker, 'Fallback');
  const hits = body.split(`${marker} `).length - 1;
  assert.ok(hits >= LANGUAGE_PACK_KEYS.length,
    `整包回退须逐键标注（期望 ≥${LANGUAGE_PACK_KEYS.length}，实测 ${hits}）`);
  assert.ok(!body.includes(loadPacks().la['render.title.day']), '不得静默混入拉丁语');
});

test('T-036 · 回退快照规范数据区与七语言一致（回退不改数值）', () => {
  const base = extractRenderData(snapshot('en'));
  assert.deepEqual(extractRenderData(snapshot(FALLBACK_TAG)), base);
});

// ---------------------------------------------------------------- 隐私与状态边界

test('T-036 · 快照 / 清单 / 术语表零真实身体数据令牌（P-14 / FR-053）', () => {
  for (const tag of SNAPSHOT_TAGS) assert.ok(!TOKEN_RE.test(snapshot(tag)), `${tag} 不得含真实令牌`);
  assert.ok(!TOKEN_RE.test(JSON.stringify(manifest())));
  assert.ok(!TOKEN_RE.test(JSON.stringify(glossary())));
});

test('T-036 · 八份规范数据区字节完全一致（不只是解析后相等）', () => {
  const base = extractCanonicalBlock(snapshot('en'));
  assert.ok(base.length > 500, '规范数据区不得为空（防假绿）');
  for (const tag of SNAPSHOT_TAGS) assert.equal(extractCanonicalBlock(snapshot(tag)), base);
});

test('T-036 · 生成器 --check 逐字节复验通过且零写盘', () => {
  const before = SNAPSHOT_TAGS.map((tag) => sha256(snapshot(tag)));
  const manifestBefore = sha256(read(MANIFEST_PATH));
  const glossaryBefore = sha256(read(GLOSSARY_PATH));
  const script = fileURLToPath(new URL(`${SNAPSHOT_DIR}/generate.mjs`, ROOT));
  const out = execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.match(out, /snapshot_check=ok/);
  assert.match(out, /disk_writes=0/);
  assert.deepEqual(SNAPSHOT_TAGS.map((tag) => sha256(snapshot(tag))), before);
  assert.equal(sha256(read(MANIFEST_PATH)), manifestBefore);
  assert.equal(sha256(read(GLOSSARY_PATH)), glossaryBefore);
});

test('T-036 · AC-15 仍 RED、tasks.md 未勾选、P0 占位快照未填充', () => {
  assert.match(read('tests/acceptance/ac-15.md'), /\| 状态 \| \*\*RED\*\* \|/);
  assert.ok(!read('tests/acceptance/ac-15.md').includes('| GREEN |'));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  const placeholder = read('tests/snapshots/ac-15.txt');
  assert.ok(placeholder.length < 400, 'P0 占位文件不得被填充为产品输出');
});
