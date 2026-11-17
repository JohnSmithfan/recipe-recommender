// SPDX-License-Identifier: GPL-3.0-only
/**
 * `src/core/locale/` 统一出口 · T-031 回退链 + T-032 区域策略解析。
 *
 * T-031 刻意不建本文件（把目录留给 T-032 作为预留占位）；T-032 落地时补齐。
 * 两层都是核心域纯函数：零 IO、零网络、零第三方依赖；语言包读取归 `src/io/`，
 * 区域映射数据归 T-033 的 `data/region/`，CLI / MCP 组合根只做端口注入。
 */
export {
  BUILTIN_TAGS,
  BASE_TAG,
  LOCALE_ERROR,
  LocaleError,
  baseTagChain,
  buildFallbackChain,
  resolveLanguagePack,
  verifyLanguagePacks,
} from './fallback.js';

export {
  LOCALE_SOURCES,
  POLICY_FIELDS,
  OVERRIDE_FIELDS,
  SUBNATIONAL_REGION_CODES,
  NEUTRAL_BASELINE,
  POLICY_ERROR,
  POLICY_FALLBACK,
  POLICY_STEP,
  LocalePolicyError,
  assertRegionMappings,
  explainLocalePolicy,
  resolveLocalePolicy,
  createLocalePolicyResolver,
} from './policy.js';
