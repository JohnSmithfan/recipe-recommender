// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · CI 静态扫描公共层（零依赖 / 只读 / 单一实现） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * 四个 `scripts/*-scan.mjs` 门禁共用的只读工具层，避免在四处复制遍历 / 令牌提取 /
 * 报告输出逻辑（单一实现原则）。本模块**不写盘、不联网、不读环境变量**。
 *
 * 关键口径：真实身体数据令牌规则**唯一权威仍在 `.github/workflows/ci.yml`**。
 * 本模块 `tokenRule()` 反向读取该声明，任何脚本都不得复制令牌字面量，否则会被
 * 全仓扫描自命中（FR-053 / P-14 / T-021 `offline-integration.mjs` 同口径）。
 *
 * 报告格式：纯 ASCII `key=value`，`status=` 收尾，exit `0/1`。
 * 失败明细写 stderr（可含中文），不污染 stdout 的稳定可 diff 报告。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CI_SELF = '.github/workflows/ci.yml';
export const SPDX_HEADER = '// SPDX-License-Identifier: GPL-3.0-only';

/** @param {string} [from] @returns {string[]} 相对仓库根的 POSIX 路径 */
export function walk(from = ROOT) {
  const visit = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '.git' || e.name === 'node_modules') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? visit(p) : [p];
  });
  return visit(from).map((p) => p.slice(ROOT.length + 1).replace(/\\/g, '/'));
}

/** @param {string} rel */
export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
/** @param {string} rel */
export const safeRead = (rel) => (existsSync(join(ROOT, rel)) ? read(rel) : '');
/** @param {string} rel */
export const exists = (rel) => existsSync(join(ROOT, rel));
/** @param {string} rel */
export const sizeOf = (rel) => (exists(rel) ? statSync(join(ROOT, rel)).size : 0);
/** @param {string} rel 目录存在且非空 */
export const dirNonEmpty = (rel) => exists(rel)
  && statSync(join(ROOT, rel)).isDirectory() && readdirSync(join(ROOT, rel)).length > 0;

/** 去掉整行注释后再扫描，避免把「不得依赖 LLM」这类约束文字误判为实现。 */
export function codeOnly(text) {
  return text.split('\n').filter((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line)).join('\n');
}

/** @returns {RegExp} 从 ci.yml 唯一权威声明动态提取，绝不复制字面量 */
export function tokenRule() {
  const matched = /const TOKENS = \/(.+?)\/;/.exec(read(CI_SELF));
  if (!matched) throw new Error('ERR_T042_TOKEN_RULE_MISSING');
  return new RegExp(matched[1]);
}

/** @returns {string[]} 动态解析 `SPEC.md §10` 表格中级别以「必需」开头的条目 */
export function spec10Required() {
  return [...read('SPEC.md').matchAll(/^\| `([^`]+)` \| 必需/gm)].map((m) => m[1]);
}

/** @param {string} id @param {unknown} ok @param {string} detail */
export const check = (id, ok, detail) => Object.freeze({ id, ok: Boolean(ok), detail });

/**
 * 输出稳定报告并设定 exit code。
 * @param {string} tool
 * @param {ReadonlyArray<{id: string, ok: boolean, detail: string}>} checks
 */
export function emitReport(tool, checks) {
  const failed = checks.filter((c) => !c.ok);
  const lines = [
    `tool=${tool}`,
    `checks=${checks.length}`,
    `failed=${failed.length}`,
    ...checks.map((c) => `check.${c.id}=${c.ok ? 'ok' : 'fail'}`),
    `status=${failed.length === 0 ? 'ok' : 'error'}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  for (const c of failed) process.stderr.write(`[FAIL] ${c.id}: ${c.detail}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}
