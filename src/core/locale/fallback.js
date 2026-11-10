// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-031 · Canonical ID 键集 / BCP 47 回退链（FR-040 / FR-042 / FR-044 / SC-011 / P-11）。
 *
 * 核心域纯函数：零 IO、零 `node:` 导入、零自然语句硬编码。
 * `locales/` 的读取归 `src/io/language-pack.js`，最终三键语言包交给 T-018 的
 * `validateLanguagePack()` 校验后再交给 `render()` 消费。
 *
 * 回退链（FR-042）：请求语言 → 该语言逐级基础标签 → 配置默认 → `en`（内置完整基准）。
 * 「不得静默混入另一语言」的可执行口径：
 * - 命中请求标签本身 = `direct`，只标注真正缺键的项；
 * - 命中基础标签 = `base-tag`，同上（同一语言的不同区域变体）；
 * - 落到配置默认 / 英文兜底 = `default` / `fallback`，**整包 71 键全部进入
 *   `fallback_keys`**，由渲染层逐条加 `render.marker.fallback` 前缀；
 * - 链上仍找不到的键记入 `missing_keys`，由渲染层输出 `render.marker.untranslated`
 *   + 原始 Canonical ID，绝不拿别的语言文本顶替。
 */
import { LANGUAGE_PACK_KEYS } from '../render/contract.js';

/** 七个 v1 内置语言包标签（顺序稳定，SC-011 以此为准）。 */
export const BUILTIN_TAGS = Object.freeze(['zh-Hans', 'en', 'fr', 'de', 'es', 'ru', 'la']);

/** 回退终点：唯一保证 100% 覆盖冻结键集的基准包。 */
export const BASE_TAG = 'en';

/** @type {Readonly<Record<string, string>>} */
export const LOCALE_ERROR = Object.freeze({
  INVALID: 'ERR_LOCALE_INVALID',
  TAG: 'ERR_LOCALE_TAG',
  CHAIN: 'ERR_LOCALE_CHAIN',
  PACK_MISSING: 'ERR_LOCALE_PACK_MISSING',
  KEY_MISMATCH: 'ERR_LOCALE_KEY_MISMATCH',
  KEY_EXTRA: 'ERR_LOCALE_KEY_EXTRA',
  KEY_VALUE: 'ERR_LOCALE_KEY_VALUE',
});

const BCP47 = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/;
const CANONICAL_ID = /^[a-z][a-z0-9._-]{0,63}$/;
const UNSAFE_TEXT = /[\x00-\x1F\x7F|`]/;

/** 与 CLI / 核心域同构：`message` 只拼稳定码，绝不插值输入正文。 */
export class LocaleError extends Error {
  /** @param {string} code */
  constructor(code) {
    super(code);
    this.name = 'LocaleError';
    this.code = code;
  }
}

/**
 * @typedef {Readonly<{tag: string, code: string, key: string}>} LocaleIssue
 */

/**
 * BCP 47 标签逐级截断：完整形式 → … → 基础语言。
 * @param {unknown} tag
 * @returns {string[]}
 * @throws {LocaleError} `ERR_LOCALE_TAG`
 */
export function baseTagChain(tag) {
  if (typeof tag !== 'string' || !BCP47.test(tag)) {
    throw new LocaleError(LOCALE_ERROR.TAG);
  }
  const parts = tag.split('-');
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('-'));
}

/**
 * 构造「有序、去重、且确实可用」的回退链。
 * @param {unknown} requestTag
 * @param {{availableTags?: ReadonlyArray<string>, defaultTag?: string}} [options]
 * @returns {string[]}
 */
export function buildFallbackChain(requestTag, options = {}) {
  const { availableTags = [], defaultTag = BASE_TAG } = options ?? {};
  const requested = baseTagChain(requestTag);
  const configured = BCP47.test(defaultTag) ? baseTagChain(defaultTag) : [BASE_TAG];
  const candidates = [...requested, defaultTag, ...configured, BASE_TAG];
  const available = new Set(availableTags);
  const seen = new Set();
  const chain = [];
  for (const candidate of candidates) {
    if (!available.has(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    chain.push(candidate);
  }
  return chain;
}

/** @param {unknown} value @returns {boolean} */
const isStrings = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 按回退链解析出一份完整键值与逐键来源标注。
 * @param {unknown} requestTag 请求标签（可为任意 BCP 47 标签或自定义包标签）
 * @param {Readonly<Record<string, Readonly<Record<string, string>> | null>>} sources
 *   标签 → 纯键值语言包；`null` 表示该包不可读。调用方可注入自定义语言包（FR-040）。
 * @param {{defaultTag?: string}} [options]
 * @returns {Readonly<{
 *   tag: string, requested_tag: string, resolved_by: string,
 *   chain: string[], strings: Readonly<Record<string, string>>,
 *   fallback_keys: string[], missing_keys: string[],
 * }>}
 * @throws {LocaleError} `ERR_LOCALE_CHAIN`（链上无任何可用包）
 */
export function resolveLanguagePack(requestTag, sources, options = {}) {
  if (typeof requestTag !== 'string' || !BCP47.test(requestTag)) {
    throw new LocaleError(LOCALE_ERROR.TAG);
  }
  const { defaultTag = BASE_TAG } = options ?? {};
  const availableTags = Object.entries(sources ?? {})
    .filter(([, value]) => isStrings(value))
    .map(([tag]) => tag);
  const chain = buildFallbackChain(requestTag, { availableTags, defaultTag });
  if (chain.length === 0) throw new LocaleError(LOCALE_ERROR.CHAIN);

  const primary = chain[0];
  const bases = baseTagChain(requestTag).slice(1);
  /** @type {string} */
  let resolvedBy;
  if (primary === requestTag) resolvedBy = 'direct';
  else if (bases.includes(primary)) resolvedBy = 'base-tag';
  else if (primary === defaultTag && defaultTag !== BASE_TAG) resolvedBy = 'default';
  else resolvedBy = 'fallback';
  const wholePackFallback = resolvedBy === 'default' || resolvedBy === 'fallback';

  /** @type {Record<string, string>} */
  const strings = { .../** @type {Record<string, string>} */ (sources[primary]) };
  /** @type {string[]} */
  const fallbackKeys = [];
  /** @type {string[]} */
  const missingKeys = [];

  for (const key of LANGUAGE_PACK_KEYS) {
    if (Object.hasOwn(strings, key)) {
      if (wholePackFallback) fallbackKeys.push(key);
      continue;
    }
    let found = false;
    for (const tag of chain.slice(1)) {
      const candidate = sources[tag];
      if (isStrings(candidate) && Object.hasOwn(/** @type {object} */ (candidate), key)) {
        strings[key] = /** @type {Record<string, string>} */ (candidate)[key];
        found = true;
        break;
      }
    }
    if (found) fallbackKeys.push(key);
    else missingKeys.push(key);
  }

  return Object.freeze({
    tag: primary,
    requested_tag: requestTag,
    resolved_by: resolvedBy,
    chain: Object.freeze(chain),
    strings: Object.freeze(strings),
    fallback_keys: Object.freeze(fallbackKeys),
    missing_keys: Object.freeze(missingKeys),
  });
}

/**
 * 校验七个内置语言包的 Canonical ID 键集 100% 一致（SC-011 / NFR-011）。
 * 纯函数、不抛错：所有问题以稳定码 + Canonical ID 汇总，供 `rr locales --verify` 输出。
 * @param {Readonly<Record<string, unknown>>} sources
 * @param {ReadonlyArray<string>} keys
 * @returns {Readonly<{ok: boolean, tags: number, key_count: number, issues: LocaleIssue[]}>}
 */
export function verifyLanguagePacks(sources, keys) {
  const expected = new Set(keys);
  /** @type {LocaleIssue[]} */
  const issues = [];
  for (const tag of BUILTIN_TAGS) {
    const pack = sources?.[tag];
    if (!isStrings(pack)) {
      issues.push(Object.freeze({ tag, code: LOCALE_ERROR.PACK_MISSING, key: '(pack)' }));
      continue;
    }
    /** @type {Record<string, unknown>} */
    const strings = /** @type {Record<string, unknown>} */ (pack);
    for (const key of keys) {
      if (!Object.hasOwn(strings, key)) {
        issues.push(Object.freeze({ tag, code: LOCALE_ERROR.KEY_MISMATCH, key }));
        continue;
      }
      const value = strings[key];
      if (typeof value !== 'string' || value.length === 0 || UNSAFE_TEXT.test(value)) {
        issues.push(Object.freeze({ tag, code: LOCALE_ERROR.KEY_VALUE, key }));
      }
    }
    for (const key of Object.keys(strings)) {
      if (!expected.has(key) || !CANONICAL_ID.test(key)) {
        issues.push(Object.freeze({ tag, code: LOCALE_ERROR.KEY_EXTRA, key }));
      }
    }
  }
  return Object.freeze({
    ok: issues.length === 0,
    tags: BUILTIN_TAGS.length,
    key_count: keys.length,
    issues: Object.freeze(issues),
  });
}
