// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-031 · `rr locales [--verify]`（FR-040 / FR-041 / SC-011 / NFR-011）。
 *
 * - 不加 `--verify`：列出七个内置 BCP 47 标签，供 `rr_list_locales` 等调用方取证；
 * - 加 `--verify`：读 `locales/_schema/keys.json` 与七份 `strings.json`，
 *   逐包校验 Canonical ID 键集 100% 一致，缺键 / 多余键 / 非法值 / 缺包一律
 *   `ERR_CLI_LOCALES` 并附稳定码与 Canonical ID，**不假绿**。
 *
 * `src/cli` 继续保持零 `node:` 导入：文件读取经注入的 `fsPort`，缺失即
 * `CliError(ERR_CLI_PORT)` → `runCli` exit 3（T-019 端口口径）。
 * 输出只有 `key=value` 稳定计数与稳定码，不含任何译文正文、异常文本或身体数值。
 */
import { CLI_ERROR, CliError, cliIssue } from './errors.js';
import { line, requirePort } from './shared.js';
import { loadBuiltinLanguagePacks } from '../io/language-pack.js';
import { BUILTIN_TAGS, verifyLanguagePacks } from '../core/locale/fallback.js';

/** 单次最多回传的 issue 条数，避免错误输出膨胀成信息泄漏面。 */
const MAX_ISSUES = 12;

/**
 * @param {Readonly<Record<string, unknown>>} options
 * @param {Record<string, any>} [deps] 需注入 `fsPort`
 * @returns {Promise<string[]>}
 * @throws {CliError} 端口缺失 / 语言包键集漂移
 */
export async function runLocales(options, deps = {}) {
  const fsPort = requirePort(deps, 'fsPort', 'action.cli.port.fs');

  if (options.verify !== true) {
    return Object.freeze([
      line('command', 'locales'),
      line('tags', String(BUILTIN_TAGS.length)),
      ...BUILTIN_TAGS.map((tag, index) => line(
        `tag.${String(index + 1).padStart(2, '0')}`,
        tag,
      )),
      line('status', 'ok'),
    ]);
  }

  /** @type {Awaited<ReturnType<typeof loadBuiltinLanguagePacks>>} */
  let loaded;
  try {
    loaded = await loadBuiltinLanguagePacks(fsPort);
  } catch {
    throw new CliError([cliIssue(CLI_ERROR.LOCALES, '(locales).schema', 'action.cli.locale_schema')]);
  }

  const report = verifyLanguagePacks(loaded.sources, loaded.schema.keys);
  if (!report.ok) {
    throw new CliError(report.issues.slice(0, MAX_ISSUES).map((issue) => cliIssue(
      CLI_ERROR.LOCALES,
      `locales/${issue.tag}/${issue.code}`,
      issue.key,
    )));
  }

  return Object.freeze([
    line('command', 'locales'),
    line('key_count', String(report.key_count)),
    line('tags', String(report.tags)),
    line('verified', String(report.tags)),
    line('status', 'ok'),
  ]);
}
