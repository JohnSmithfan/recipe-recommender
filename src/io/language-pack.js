// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-031 · 语言包 IO 适配器（`locales/` 读取 + 组合 T-018 可消费的三键包）。
 *
 * 核心域 `src/core/locale/fallback.js` 是纯函数，不知道文件在哪里；本模块是唯一
 * 知道 `locales/<tag>/strings.json` 路径的地方，且**不 `import node:*`**：
 * 文件读取全部经注入的 `fsPort.readJson`，离线门禁可用内存替身复现。
 *
 * 两条边界：
 * - `en` 是回退终点，缺它即 `ERR_LOCALE_PACK_MISSING`，绝不拿别的语言顶替基准；
 * - 任何原生异常文本 / 文件正文都不回传，只折叠为稳定码（FR-048）。
 */
import {
  BUILTIN_TAGS,
  LOCALE_ERROR,
  LocaleError,
  resolveLanguagePack,
} from '../core/locale/fallback.js';import { validateLanguagePack } from '../core/render/index.js';

export const LOCALES_ROOT = 'locales';
export const SCHEMA_PATH = 'locales/_schema/keys.json';

/** @param {string} tag @returns {string} */
export const packPath = (tag) => `${LOCALES_ROOT}/${tag}/strings.json`;

/** @param {string} tag @returns {boolean} */
export const isBuiltinTag = (tag) => BUILTIN_TAGS.includes(tag);

/**
 * 读取键集定义 + 七个内置语言包；可选再读一个自定义语言包（FR-040）。
 * 单个语言包不可读时记为该 tag → `null`，由 `verifyLanguagePacks` 汇总，不中断整批。
 * @param {{readJson: (path: string) => Promise<unknown>}} fsPort
 * @param {string} [extraTag] 自定义语言包标签
 * @returns {Promise<{
 *   schema: {keys: string[], base_tag: string, tags: string[]},
 *   sources: Record<string, Record<string, string> | null>,
 *   tags: string[],
 *   missing: string[],
 * }>}
 * @throws {LocaleError} `ERR_LOCALE_PACK_MISSING`（键集定义不可读）
 */
export async function loadBuiltinLanguagePacks(fsPort, extraTag) {
  if (!fsPort || typeof fsPort.readJson !== 'function') {
    throw new LocaleError(LOCALE_ERROR.PACK_MISSING);
  }
  /** @type {any} */
  let schema;
  try {
    schema = await fsPort.readJson(SCHEMA_PATH);
  } catch {
    throw new LocaleError(LOCALE_ERROR.PACK_MISSING);
  }
  if (!schema || !Array.isArray(schema.keys)) {
    throw new LocaleError(LOCALE_ERROR.PACK_MISSING);
  }

  /** @type {Record<string, Record<string, string> | null>} */
  const sources = {};
  /** @type {string[]} */
  const missing = [];
  const tags = typeof extraTag === 'string' && !isBuiltinTag(extraTag)
    ? [...BUILTIN_TAGS, extraTag]
    : [...BUILTIN_TAGS];

  for (const tag of tags) {
    try {
      const value = await fsPort.readJson(packPath(tag));
      sources[tag] = value && typeof value === 'object' && !Array.isArray(value)
        ? /** @type {Record<string, string>} */ (value)
        : null;
    } catch {
      sources[tag] = null;
    }
    if (sources[tag] === null) missing.push(tag);
  }

  return { schema, sources, tags: [...BUILTIN_TAGS], missing };
}

/**
 * 创建 T-019 `runPlan` 所需的 `loadLanguagePack(tag)` 端口。
 * @param {{readJson: (path: string) => Promise<unknown>}} fsPort
 * @param {{defaultTag?: string}} [options]
 * @returns {(requestTag: string) => Promise<ReturnType<typeof validateLanguagePack>>}
 */
export function createLanguagePackLoader(fsPort, options = {}) {
  return async function loadLanguagePack(requestTag) {
    const { sources } = await loadBuiltinLanguagePacks(fsPort, requestTag);
    if (!sources.en) throw new LocaleError(LOCALE_ERROR.PACK_MISSING);
    const result = resolveLanguagePack(requestTag, sources, options ?? {});
    if (result.missing_keys.length > 0) {
      throw new LocaleError(LOCALE_ERROR.KEY_MISMATCH);
    }
    return validateLanguagePack({
      tag: result.tag,
      strings: result.strings,
      fallback_keys: [...result.fallback_keys],
    });
  };
}

/**
 * 供 T-030 `rr_list_locales` 工具注入的可选端口（plan.md §6.3 / FR-040）。
 * 只返回内置语言标签，不含译文、路径或任何身体数据。
 * `src/mcp/` 与 `src/cli/serve-mcp.js` 的「端口注入、零兜底」定案**未被改写**：
 * 调用方必须显式把它放进 `mcpPorts.listLocales`，否则工具仍返回 `ERR_MCP_PORT`。
 * @returns {() => Readonly<{status: string, locales: ReadonlyArray<string>}>}
 */
export function createListLocalesPort() {
  return () => Object.freeze({
    status: 'ok',
    locales: Object.freeze([...BUILTIN_TAGS]),
  });
}
