// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-045 · 中文编码静态校验断言（先红后绿，P-02） · 审计追踪 ID: RR-T045-20261117-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 `scripts/encoding-check.mjs` 与 CHANGELOG T-045 条目落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-045 / SPEC.md FR-043 / AC-15 / SC-011 / ADR-003 §4.7 / plan.md §11）：
 * - 中文输出所用汉字 MUST 落在 GB 18030-2022 **实现级别 1** 覆盖范围内；落盘编码仍统一 UTF-8。
 * - 判据复用 T-036 `tests/snapshots/i18n/fixture.mjs` 的 `gb18030Level1Chars()`：
 *   full-ICU gb18030 解码器**动态枚举双字节区**（0x81..0xFE × 0x40..0xFE，排除 0x7F），
 *   零内置清单、零伪造映射；四字节区字符判未覆盖（级别 2 才要求）。单一实现，不复制。
 * - 校验对象：zh-Hans 语言包 71 键中文值 + 8 份真实 render() 快照中文正文 +
 *   manifest 的 `cjk_count` / `gb18030_l1_uncovered` 字段一致性。
 * - 判定抽成可注入纯函数（非恒真 / 非恒假）；脚本不接 CI 必跑门禁（与
 *   p1/p2 gate / T-043 / T-044 同口径），只在 ci.yml 头部登记；不改 P0、不改 ac-15.md。
 * - 单测零 spawnSync（避免加剧 ISSUE-20261114-T042-COVERAGE-TIMEOUT 并发耦合）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const safeRead = (rel) => (existsSync(join(ROOT, rel)) ? read(rel) : '');
const exists = (rel) => existsSync(join(ROOT, rel));
const sizeOf = (rel) => (exists(rel) ? readFileSync(join(ROOT, rel)).length : 0);

export const T045_SCRIPT = 'scripts/encoding-check.mjs';
export const T045_CHECKS = Object.freeze([
  'utf8_valid', 'language_pack_coverage', 'snapshot_coverage',
  'manifest_consistent', 'four_byte_honest', 'fictional_no_real_data',
]);

const FROZEN = Object.freeze([
  'SPEC.md', 'plan.md', 'constitution.md', 'tasks.md', 'README.md', 'LICENSE', '.gitignore',
  'run.mjs', 'scripts/acceptance.mjs', 'scripts/spec-check.mjs', 'scripts/lint.mjs',
  'scripts/coverage.mjs', 'src/cli/args.js', 'src/cli/index.js',
  'tests/acceptance/offline-integration.mjs', '.github/workflows/ci.yml',
]);

const executableCi = () => read('.github/workflows/ci.yml')
  .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---------------------------------------------------------------- A · 脚本与纯函数

test('T-045 · 编码校验脚本存在、非空、SPDX / [AIGC] / 待人工审查齐备', () => {
  assert.ok(exists(T045_SCRIPT), `${T045_SCRIPT} 缺失`);
  assert.ok(sizeOf(T045_SCRIPT) > 1200, '脚本过短，疑似占位');
  const t = read(T045_SCRIPT);
  assert.ok(t.startsWith('// SPDX-License-Identifier: GPL-3.0-only'), '缺 SPDX 头');
  assert.match(t, /\[AIGC\]/, '缺 [AIGC] 标注');
  assert.match(t, /待人工审查|人工审查/, '缺待人工审查标注');
  for (const k of ['T-045', 'GB 18030-2022', 'FR-043', 'AC-15', 'SC-011']) {
    assert.ok(t.includes(k), `缺映射 ${k}`);
  }
});

test('T-045 · 脚本零第三方依赖、只读、零写盘 API、零网络', () => {
  const t = read(T045_SCRIPT);
  for (const m of t.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    assert.ok(spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('file:'),
      `${T045_SCRIPT} 引入外部包 ${spec}`);
  }
  for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync',
    'copyFileSync', 'renameSync', 'createWriteStream']) {
    assert.equal(t.includes(api), false, `含写盘 API ${api}`);
  }
  assert.equal(/\bfetch\s*\(|node:https?/.test(t), false, '含网络出口');
});

test('T-045 · 复用 T-036 单一判据而非复制码表（动态枚举双字节区）', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  assert.equal(typeof mod.gb18030Level1Chars, 'function', '未复用 / 导出码表判据');
  const t = read(T045_SCRIPT);
  assert.match(t, /fixture\.mjs/, '未从 T-036 fixture 复用判定');
  assert.match(t, /0x81|0x40|0xFE/, '未见双字节区枚举口径');
  assert.equal(/6763|20902/.test(t), false, '疑似内置硬编码汉字清单，违反零内置判据');
  // 与 T-036 判据一致性：同一函数对同一文本的未覆盖结论必须相同
  const fx = await import(`file://${join(ROOT, 'tests/snapshots/i18n/fixture.mjs')}`);
  const sample = '本计划仅为演示参考不构成医疗建议';
  const a = [...fx.uncoveredCjk(sample)];
  const covered = mod.gb18030Level1Chars();
  const b = [...new Set([...sample].filter((c) => /[\u3400-\u9fff]/.test(c)))].filter((c) => !covered.has(c));
  assert.deepEqual(b, a, '与 T-036 判据结论不一致');
});

test('T-045 · 判定逻辑为可注入纯函数，正向干净证据全绿', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  assert.equal(typeof mod.evaluateEncodingCheck, 'function', '未导出判定纯函数');
  assert.equal(typeof mod.collectEncodingEvidence, 'function', '未导出现场取证函数');
  const good = mod.evaluateEncodingCheck(mod.CLEAN_FIXTURE);
  assert.equal(good.checks.length, T045_CHECKS.length, '检查项数量与口径不符');
  assert.equal(good.failed, 0, `正向证据存在失败项: ${good.failed}`);
  assert.equal(good.verdict, 'STATIC_ONLY', '正向证据未得到 STATIC_ONLY');
  assert.equal(good.ac15_green, false, '取证器不得声称 AC-15 已转绿');
  assert.ok(good.checks.every((c) => c.ok === true), '正向应有全绿检查项');
});

test('T-045 · 逐项负向注入证明非恒真、非恒假', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  for (const id of T045_CHECKS) {
    const bad = mod.evaluateEncodingCheck({ ...mod.CLEAN_FIXTURE, [`break_${id}`]: true });
    assert.equal(bad.checks.find((c) => c.id === id)?.ok, false, `${id} 判定恒真，无法打红`);
    assert.notEqual(bad.verdict, 'STATIC_ONLY', `${id} 打红后整体仍 STATIC_ONLY`);
  }
  const good = mod.evaluateEncodingCheck(mod.CLEAN_FIXTURE);
  assert.equal(good.failed, 0, '缺少可判全绿的输入（恒假）');
});

test('T-045 · 未覆盖汉字注入必须转红（真阳性探测）', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  // 四字节区汉字（如 U+20000 起）应被判为级别 1 未覆盖
  const rare = '\u{20000}';
  const r = mod.evaluateEncodingCheck({
    ...mod.CLEAN_FIXTURE,
    uncoveredHanzi: [rare],
  });
  assert.equal(r.checks.find((c) => c.id === 'language_pack_coverage')?.ok, false,
    '语言包未覆盖汉字未转红');
  assert.equal(r.failed > 0, true);
});

// ---------------------------------------------------------------- B · 现场取证

test('T-045 · zh-Hans 语言包与 8 份快照汉字均在级别 1 覆盖内（真实现场）', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  const ev = mod.collectEncodingEvidence();
  assert.equal(ev.utf8Valid, true, '存在非 UTF-8 文件');
  assert.deepEqual(ev.languagePackUncovered, [], 'zh-Hans 语言包出现未覆盖汉字');
  assert.deepEqual(ev.snapshotUncovered, [], '快照出现未覆盖汉字');
  assert.equal(ev.fourByteHonest, true, '四字节区未如实判未覆盖');
});

test('T-045 · 快照 manifest 的 cjk_count / gb18030_l1_uncovered 字段与现场一致', () => {
  const manifest = JSON.parse(read('tests/snapshots/i18n/manifest.json'));
  const zh = manifest.entries.find((e) => e.tag === 'zh-Hans');
  assert.ok(zh, 'manifest 缺 zh-Hans 条目');
  assert.equal(zh.cjk_count > 0, true, 'zh-Hans cjk_count 应 > 0');
  assert.equal(zh.gb18030_l1_uncovered, 0, 'manifest 登记了未覆盖汉字');
  for (const e of manifest.entries) {
    assert.equal(e.gb18030_l1_uncovered, 0, `${e.tag} 登记了未覆盖汉字`);
  }
});

// ---------------------------------------------------------------- C · 不接线与不变量

test('T-045 · 脚本不接入 CI 必跑门禁，CI 头部仅登记默认静态校验', () => {
  const exec = executableCi();
  assert.equal(exec.includes(T045_SCRIPT), false,
    'encoding-check 不得接入 CI required jobs（仅登记不执行）');
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /T-045/, 'CI 头部未登记 T-045');
  assert.match(ci, /encoding-check/, 'CI 头部未登记 encoding-check');
  for (const forbidden of ['--allow-green', 'continue-on-error', 'skip-scenario']) {
    assert.equal(exec.includes(forbidden), false, `${forbidden} 弱化门禁`);
  }
});

test('T-045 · AC-15 仍 RED、tasks.md 零勾选、P0 与 ac-15.md 零 diff', () => {
  const ac15 = read('tests/acceptance/ac-15.md');
  assert.match(ac15, /\| 状态 \| \*\*RED\*\*/, 'ac-15 被转绿');
  assert.equal(ac15.includes('GB 18030-2022'), true, 'ac-15 编码场景文本丢失');
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  let out = '';
  try {
    out = execFileSync('git', ['diff', '--name-only', 'HEAD', '--',
      ...FROZEN, 'tests/acceptance/ac-15.md'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch { out = 'ERR_GIT_DIFF'; }
  assert.equal(out, '', `P0 / ac-15.md 被改动: ${out}`);
});

test('T-045 · 附加断言：中文输出 UTF-8 合法且四字节区字符如实判未覆盖', async () => {
  const mod = await import(`file://${join(ROOT, T045_SCRIPT)}`);
  const covered = mod.gb18030Level1Chars();
  // 双字节可解码字符必在集合内；四字节区字符不在集合内（如实登记级别 2 边界）
  const decoder = new TextDecoder('gb18030', { fatal: true });
  const twoByte = decoder.decode(Uint8Array.of(0xD6, 0xD0)); // 中
  assert.equal(covered.has(twoByte), true, '双字节汉字未被判覆盖');
  assert.equal(covered.has('\u{20000}'), false, '四字节区字符被误判为级别 1 覆盖');
});

test('T-045 · CHANGELOG 补录 T-045 且保持 [Unreleased] 未发布口径', () => {
  const t = read('CHANGELOG.md');
  assert.match(t, /T-045/, 'CHANGELOG 缺 T-045 条目');
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /0\.1\.0-dev/);
  assert.equal(/npm publish|已发布 Release|Published on/i.test(t), false);
});
