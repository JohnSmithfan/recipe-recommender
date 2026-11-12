// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-036 · 多语言快照共用夹具（合成计划 / 语言包 / 编码判定 / 不变量哈希）。
 *
 * 纯 ESM、零第三方依赖；只import node: 内置与仓库内模块。所有数值、食材、
 * 日期、版本 ID 都是**完全虚构**的合成值（P-14 / FR-053），不含任何真实身体数据。
 *
 * 边界（勿重开）：
 * - 快照取 FR-044 严格口径：同一 plan 对象 + 同一 intlFormatter，只换语言包；
 *   plan.header.language_tag 固定为合成占位 `xx`，不随输出语言改写，否则规范
 *   数据区本身就会变化，取证失效。输出语言由 manifest 的 requested_tag 记录。
 * - plan.sections 是 T-019 渲染钩子的**合成夹具**，用于取证四餐食材克数；
 *   不代表 T-013 / T-016 端到端接线，AC-03 仍 RED，product_e2e=unwired。
 * - GB 18030-2022 实现级别 1 判定：运行时从 Node full-ICU 的 gb18030 解码器
 *   枚举**双字节区**（0x81..0xFE × 0x40..0xFE，排除 0x7F）动态生成可编码字符集，
 *   不内置也不伪造任何汉字清单；四字节区字符一律判为未覆盖（级别 2 才要求）。
 *   完整独立的 CI 静态校验脚本归 T-045 encoding-check。
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { BUILTIN_TAGS, resolveLanguagePack } from '../../../src/core/locale/fallback.js';
import {
  LANGUAGE_PACK_KEYS,
  RX_FIELDS,
  VERSION_KEYS,
  REQUIRED_NOTICE_KEYS,
  validateLanguagePack,
  render,
  extractRenderData,
  extractCanonicalBlock,
} from '../../../src/core/render/index.js';
import { comboFingerprint } from '../../../src/core/dedup/contract.js';
import { renderLedgerLine } from '../../../src/core/dedup/ledger.js';

export { BUILTIN_TAGS };

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../../..');

/** 八个快照标签：七个内置语言 + 一个无对应语言包的回退标签（AC-15 场景 2）。 */
export const FALLBACK_TAG = 'xx-Zzzz';
export const SNAPSHOT_TAGS = Object.freeze([...BUILTIN_TAGS, FALLBACK_TAG]);
export const SNAPSHOT_DIR = 'tests/snapshots/i18n';
export const MANIFEST_PATH = `${SNAPSHOT_DIR}/manifest.json`;
export const GLOSSARY_PATH = `${SNAPSHOT_DIR}/glossary.json`;

export const MANIFEST_KEYS = Object.freeze([
  'schema_version', 'generated_by', 'fictional', 'review_status',
  'product_e2e', 'sections_source', 'plan_header_language_tag',
  'key_count', 'tags', 'combo_fp', 'ledger_sha256', 'rr_data_sha256', 'entries',
]);
export const GLOSSARY_KEYS = Object.freeze([
  'schema_version', 'review_status', 'fictional', 'source',
  'key_count', 'paired_count', 'entries', 'modern_food_terms',
]);
export const ENTRY_KEYS = Object.freeze([
  'tag', 'requested_tag', 'resolved_tag', 'resolved_by', 'file',
  'sha256', 'bytes', 'rr_data_sha256', 'pack_sha256',
  'fallback_keys', 'missing_keys', 'cjk_count', 'gb18030_l1_uncovered',
  'combo_fp', 'ledger_sha256',
]);

export const FIXTURE_MAIN_ID = 'dish.fixture_main_a';
export const FIXTURE_STAPLE_ID = 'dish.fixture_staple_a';
const VERSION_IDS = Object.freeze(
  Object.fromEntries(VERSION_KEYS.map((k) => [k, `fixture-${k}-v1`])),
);

/** @param {string} text @returns {string} */
export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** 读取七个内置语言包；文件 IO 只发生在测试夹具层，核心域保持零 IO。 */
export function loadPacks() {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const tag of BUILTIN_TAGS) {
    out[tag] = JSON.parse(readFileSync(
      join(ROOT, 'locales', tag, 'strings.json'), 'utf8',
    ));
  }
  return out;
}

/** 与 T-031 FR-044 单测同构的固定格式化器：可见差异只可能来自语言包。 */
export const fixedIntl = Object.freeze({
  number: (value, unitKey) => `n:${value}:${unitKey}`,
  date: (value) => `d:${value}`,
});

const CALENDAR = Object.freeze({
  cache_id: 'calendar-fixture-placeholder',
  year: 2026,
  status: 'fallback',
  term_ids: Object.freeze([]),
  active_term_id: null,
  manual_review_key: 'season.demo.placeholder',
});

/**
 * 完全虚构的日计划对象（T-013 形状），带四餐食材克数的合成 sections。
 * 数值全为自撰中立值，绝非身体数据或任何真实处方（P-14 / FR-032）。
 */
export function buildFixturePlan() {
  return {
    level: 'day',
    period_id: '2026-11-12',
    file_name: '2026-11-12.md',
    header: {
      level: 'day',
      period_id: '2026-11-12',
      title: 'render.title.day',
      file_name: '2026-11-12.md',
      generated_date: '2026-11-11',
      generated_at: '2026-11-11T20:00:00+08:00',
      run_date: '2026-11-11',
      trigger: 'plan.trigger.period_first_day',
      version_ids: { ...VERSION_IDS },
      parent: null,
      children: [],
      link_references: [],
      language_tag: 'xx',
      locale_source: 'user',
      guideline_id: 'generic-guideline',
      calendar: CALENDAR,
      execution_window: Object.freeze({
        start_date: '2026-11-12', end_date: '2026-11-12',
        total_days: 1, executed_days: 0, remaining_days: 1,
      }),
      notice_keys: [...REQUIRED_NOTICE_KEYS],
    },
    prescription: Object.fromEntries(RX_FIELDS.map((k, i) => [k, [100 + i, 200 + i]])),
    guardrails: Object.freeze({ energy_floor_kcal: 1200, protein_floor_g: 60 }),
    calendar: CALENDAR,
    days: [Object.freeze({ plan_date: '2026-11-12', file_name: '2026-11-12.md' })],
    sections: [Object.freeze({
      id: 'section.fixture_meals',
      title_key: 'render.section.days',
      columns: Object.freeze(['render.col.plan_date', 'render.col.file_name', 'render.col.value']),
      rows: Object.freeze([
        Object.freeze(['2026-11-12', 'meal.fixture_breakfast', '111g']),
        Object.freeze(['2026-11-12', 'meal.fixture_lunch', '122g']),
        Object.freeze(['2026-11-12', 'meal.fixture_dinner', '133g']),
        Object.freeze(['2026-11-12', 'meal.fixture_snack', '144g']),
      ]),
    })],
  };
}

/** T-031 回退链 + T-018 语言包校验；xx-Zzzz 落到 en 且 71 键全部标注。 */
export function makePack(tag, sources) {
  const r = resolveLanguagePack(tag, sources, { defaultTag: 'en' });
  return validateLanguagePack({
    tag: r.tag,
    strings: { ...r.strings },
    fallback_keys: [...r.fallback_keys],
  });
}

/** @returns {{markdown: string, pack: object, data: object, resolved: object}} */
export function renderFor(tag, plan, sources) {
  const resolved = resolveLanguagePack(tag, sources, { defaultTag: 'en' });
  const pack = makePack(tag, sources);
  const markdown = render(plan, pack, fixedIntl);
  return { markdown, pack, data: extractRenderData(markdown), resolved };
}

// ------------------------------------------------- GB 18030-2022 实现级别 1

const isCjk = (cp) => (cp >= 0x3400 && cp <= 0x9FFF)
  || (cp >= 0xF900 && cp <= 0xFAFF)
  || (cp >= 0x20000 && cp <= 0x323AF);

/** @param {string} text @returns {string[]} */
export const cjkChars = (text) => [...text].filter((c) => isCjk(c.codePointAt(0)));

/** 由 full-ICU 解码器动态枚举双字节区；零内置清单、零伪造映射。 */
export function gb18030Level1Chars() {
  const decoder = new TextDecoder('gb18030', { fatal: true });
  /** @type {Set<string>} */
  const set = new Set();
  for (let b1 = 0x81; b1 <= 0xFE; b1 += 1) {
    for (let b2 = 0x40; b2 <= 0xFE; b2 += 1) {
      if (b2 === 0x7F) continue;
      try {
        const decoded = decoder.decode(Uint8Array.of(b1, b2));
        if ([...decoded].length === 1 && decoded !== '\uFFFD') set.add(decoded);
      } catch {
        // 未定义双字节序列：不计入可编码字符集。
      }
    }
  }
  return set;
}

/** @param {string} text @returns {string[]} 不在实现级别 1 覆盖内的汉字（去重、稳定序） */
export function uncoveredCjk(text) {
  const covered = gb18030Level1Chars();
  return [...new Set(cjkChars(text))].filter((c) => !covered.has(c));
}

// ------------------------------------------------- 语言无关不变量

export const comboFp = () => comboFingerprint(FIXTURE_MAIN_ID, FIXTURE_STAPLE_ID);

/** 完全虚构的一行去重台账：只含 ASCII Canonical ID，语言切换后逐字节不变。 */
export function ledgerLine() {
  return renderLedgerLine({
    date: '2026-11-12',
    level: 'day',
    period_id: '2026-11-12',
    main_id: FIXTURE_MAIN_ID,
    staple_id: FIXTURE_STAPLE_ID,
    combo_fp: comboFp(),
    version_ids: { ...VERSION_IDS },
    cycle_key: null,
    source: 'daily',
  });
}

export const ledgerLineSha256 = () => sha256(ledgerLine());

// ------------------------------------------------- 拉丁语并列术语

const PAIR_RE = /^(.*?)\s+\(([^()]*)\)/;

/** 逐键抽取 la 语言包的「规范译名 + 学名/原文」并列片段（真实来源，不伪造译文）。 */
export function latinGlossary(sources) {
  const la = sources.la;
  return LANGUAGE_PACK_KEYS.map((key) => {
    const text = la[key];
    const m = PAIR_RE.exec(text);
    const norm = m ? m[1] : '';
    const source = m ? m[2] : '';
    return Object.freeze({
      key,
      norm_name: norm,
      source_form: source,
      pair_form: m ? `${norm} (${source})` : '',
      tail: m ? text.slice(m[0].length).trim() : text,
      paired: Boolean(m) && norm.length > 0 && source.length > 0,
    });
  });
}

/** 完全虚构的现代食材术语并列示例；仅登记，未接入 71 键冻结集。 */
export const MODERN_FOOD_TERMS = Object.freeze([
  { id: 'food.fixture_grain_a', latin_name: 'Frumentum fictum', source_form: 'fixture-grain-a' },
  { id: 'food.fixture_legume_b', latin_name: 'Legumen fictum', source_form: 'fixture-legume-b' },
  { id: 'food.fixture_leaf_c', latin_name: 'Folium fictum', source_form: 'fixture-leaf-c' },
  { id: 'food.fixture_oil_d', latin_name: 'Oleum fictum', source_form: 'fixture-oil-d' },
  { id: 'food.fixture_fruit_e', latin_name: 'Fructus fictus', source_form: 'fixture-fruit-e' },
  { id: 'food.fixture_protein_f', latin_name: 'Proteinum fictum', source_form: 'fixture-protein-f' },
].map((t) => Object.freeze({
  ...t,
  pair_form: `${t.latin_name} (${t.source_form})`,
  fictional: true,
  review_status: 'ai-candidate-unreviewed',
  wired: false,
})));

// ------------------------------------------------- 结构摘要（语言无关）

/** 只提取与语言无关的结构量，用于证明「翻译不改变菜谱结构」（E-12 / FR-043）。 */
export function structuredShape(markdown) {
  const lines = markdown.split('\n');
  return Object.freeze({
    headings: lines.filter((l) => l.startsWith('## ')).length,
    tableRows: lines.filter((l) => l.startsWith('| ')).length,
    canonicalIds: Object.freeze([...markdown.matchAll(/`([^`]*)`/g)].map((m) => m[1])),
    dataBlock: extractCanonicalBlock(markdown),
  });
}
