// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-044 · polyglot-gate 准入登记断言（先红后绿，P-02） · 审计追踪 ID: RR-T044-20261117-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 `scripts/polyglot-gate.mjs` 与 CHANGELOG T-044 条目落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-044 / SPEC.md A-10 / E-18 / NFR-015 / P-16 /
 * plan.md §11 / constitution.md §5 / docs/decisions.md ADR-003 §4.4）：
 * - `polyglot-gate` 是**登记器，不是准入裁决器**：登记 ADR-003 G-01～G-06 六项检查结果，
 *   v1 **恒为拒绝**（默认关闭），不引入任何第二实现语言工具链。
 * - G-06 默认关闭须「用户书面确认 + 新增 ADR + 重做 plan.md」且不改任何 FR / AC / SC；
 *   v1 三者皆无 → 六项全拒、`polyglot_enabled=false`、`verdict=REJECTED`。
 * - 判定逻辑抽成可注入纯函数：既证明「恒拒绝不被单项 / 部分证据绕过」（非恒假），
 *   又能识别异常第二语言产物并报警（非恒真 / 非假绿）。
 * - 取证器**不接入 CI 必跑门禁**（与 p1/p2 gate / T-043 同口径），只在 ci.yml 头部登记；
 *   不改 P0、不改 A-10 / E-18 / ADR-003 规格原文、19/19 AC 仍 RED。
 * - 单测零 spawnSync（避免加剧 ISSUE-20261114-T042-COVERAGE-TIMEOUT 的并发耦合）。
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

export const T044_SCRIPT = 'scripts/polyglot-gate.mjs';
export const T044_GATES = Object.freeze(['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06']);

/** P0 基线 + 规格原文（T-044 不得改动 A-10 / E-18 / ADR-003 §4.4）。 */
const FROZEN = Object.freeze([
  'SPEC.md', 'plan.md', 'constitution.md', 'tasks.md', 'README.md', 'LICENSE', '.gitignore',
  'run.mjs', 'scripts/acceptance.mjs', 'scripts/spec-check.mjs', 'scripts/lint.mjs',
  'scripts/coverage.mjs', 'src/cli/args.js', 'src/cli/index.js',
  'tests/acceptance/offline-integration.mjs', '.github/workflows/ci.yml', 'docs/decisions.md',
]);

const executableCi = () => read('.github/workflows/ci.yml')
  .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---------------------------------------------------------------- A · 脚本与纯函数

test('T-044 · 登记脚本存在、非空、SPDX / [AIGC] / 待人工审查齐备', () => {
  assert.ok(exists(T044_SCRIPT), `${T044_SCRIPT} 缺失`);
  assert.ok(sizeOf(T044_SCRIPT) > 1200, '脚本过短，疑似占位');
  const t = read(T044_SCRIPT);
  assert.ok(t.startsWith('// SPDX-License-Identifier: GPL-3.0-only'), '缺 SPDX 头');
  assert.match(t, /\[AIGC\]/, '缺 [AIGC] 标注');
  assert.match(t, /待人工审查|人工审查/, '缺待人工审查标注');
  assert.match(t, /T-044/, '缺任务标识');
  for (const k of ['A-10', 'E-18', 'ADR-003', 'G-01', 'G-06']) {
    assert.ok(t.includes(k), `缺映射 ${k}`);
  }
});

test('T-044 · 登记脚本零第三方依赖、只读、零写盘 API、零网络', () => {
  const t = read(T044_SCRIPT);
  for (const m of t.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    assert.ok(spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('file:'),
      `${T044_SCRIPT} 引入外部包 ${spec}`);
  }
  for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync',
    'copyFileSync', 'renameSync', 'createWriteStream']) {
    assert.equal(t.includes(api), false, `含写盘 API ${api}`);
  }
  assert.equal(/\bfetch\s*\(|node:https?/.test(t), false, '含网络出口');
});

test('T-044 · G-01～G-06 六项登记 ID 完整且顺序固定', async () => {
  const mod = await import(`file://${join(ROOT, T044_SCRIPT)}`);
  assert.ok(mod.GATE_IDS, '未导出 GATE_IDS');
  assert.deepEqual([...mod.GATE_IDS], [...T044_GATES], 'G-01～G-06 登记项不完整或顺序错');
});

test('T-044 · 判定逻辑为可注入纯函数，v1 正向证据六项恒拒绝', async () => {
  const mod = await import(`file://${join(ROOT, T044_SCRIPT)}`);
  assert.equal(typeof mod.evaluatePolyglotGate, 'function', '未导出判定纯函数');
  assert.equal(typeof mod.collectPolyglotEvidence, 'function', '未导出现场登记函数');

  const r = mod.evaluatePolyglotGate(mod.CLEAN_FIXTURE);
  assert.equal(r.gates.length, 6, '登记项数量不符');
  assert.ok(r.gates.every((g) => g.approved === false), 'v1 存在被放行的门禁');
  assert.equal(r.verdict, 'REJECTED', 'v1 应恒为 REJECTED');
  assert.equal(r.polyglot_enabled, false, 'v1 不得启用第二实现语言');
  assert.equal(r.second_language_toolchains, 0, 'v1 不得有第二语言工具链');
});

test('T-044 · 恒拒绝不可被单项 / 部分证据绕过（非恒假）', async () => {
  const mod = await import(`file://${join(ROOT, T044_SCRIPT)}`);
  // 逐项注入「声称通过」，整体仍须 REJECTED / 不启用
  for (const id of T044_GATES) {
    const r = mod.evaluatePolyglotGate({ ...mod.CLEAN_FIXTURE, [`approve_${id}`]: true });
    assert.equal(r.verdict, 'REJECTED', `${id} 单项通过就放开了整体门禁`);
    assert.equal(r.polyglot_enabled, false, `${id} 单项通过就启用了第二语言`);
  }
  // 注入 G-06 的书面确认 + ADR + plan 重做（但仍有其它项不满足）→ 仍拒绝
  const partial = mod.evaluatePolyglotGate({
    ...mod.CLEAN_FIXTURE, writtenConsent: true, newAdr: true, planRebuilt: true,
  });
  assert.equal(partial.verdict, 'REJECTED', '部分证据齐全不得放开 v1 默认关闭');
  assert.equal(partial.polyglot_enabled, false);
});

test('T-044 · 能识别异常第二语言产物并报警（非恒真 / 非假绿）', async () => {
  const mod = await import(`file://${join(ROOT, T044_SCRIPT)}`);
  const r = mod.evaluatePolyglotGate({
    ...mod.CLEAN_FIXTURE, secondLanguageFiles: ['src/core/extra.py'],
  });
  assert.equal(r.anomaly, true, '注入第二语言实现源码未被识别为异常');
  assert.notEqual(r.verdict, 'REJECTED', '异常态不得仍报干净的 REJECTED 登记');
  const toolchain = mod.evaluatePolyglotGate({
    ...mod.CLEAN_FIXTURE, secondLanguageToolchains: ['tsconfig.json'],
  });
  assert.equal(toolchain.anomaly, true, '注入第二语言工具链未被识别');
});

test('T-044 · G-06 登记理由含默认关闭 / 书面确认 / ADR / plan 口径', async () => {
  const mod = await import(`file://${join(ROOT, T044_SCRIPT)}`);
  const r = mod.evaluatePolyglotGate(mod.CLEAN_FIXTURE);
  const g06 = r.gates.find((g) => g.id === 'G-06');
  assert.ok(g06, '缺 G-06 登记项');
  for (const k of ['默认关闭', '书面确认', 'ADR', 'plan']) {
    assert.ok(g06.reason.includes(k), `G-06 理由缺 ${k}`);
  }
});

// ---------------------------------------------------------------- B · 不接线与不变量

test('T-044 · 登记器不接入 CI 必跑门禁，CI 头部仅登记默认关闭', () => {
  const exec = executableCi();
  assert.equal(exec.includes(T044_SCRIPT), false,
    'polyglot-gate 不得接入 CI required jobs（仅登记不执行）');
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /T-044/, 'CI 头部未登记 T-044');
  assert.match(ci, /polyglot-gate/, 'CI 头部未登记 polyglot-gate');
  assert.match(ci, /默认关闭|仅登记/, 'CI 头部未标注默认关闭 / 仅登记');
  for (const forbidden of ['--allow-green', 'continue-on-error', 'skip-scenario']) {
    assert.equal(exec.includes(forbidden), false, `${forbidden} 弱化门禁`);
  }
});

test('T-044 · 19/19 AC RED、tasks.md 零勾选、T-044 行未勾选', () => {
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))),
    '有 AC 被转绿');
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  assert.ok(tasks.split('\n').find((l) => l.includes('**T-044**')).startsWith('- [ ]'));
});

test('T-044 · P0 基线与 A-10 / E-18 / ADR-003 规格原文零 diff', () => {
  const acFiles = readdirSync(join(ROOT, 'tests/acceptance'))
    .filter((f) => /^ac-\d{2}\.md$/.test(f)).map((f) => `tests/acceptance/${f}`);
  let out = '';
  try {
    out = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...FROZEN, ...acFiles], {
      cwd: ROOT, encoding: 'utf8',
    }).trim();
  } catch {
    out = 'ERR_GIT_DIFF';
  }
  assert.equal(out, '', `P0 / 规格原文被改动: ${out}`);
});

test('T-044 · 不引入任何第二实现语言工具链与实现源码', () => {
  const toolchains = ['tsconfig.json', 'jsconfig.json', 'pyproject.toml', 'setup.py',
    'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'Makefile',
    'CMakeLists.txt', 'Gemfile', 'composer.json'];
  for (const f of toolchains) assert.equal(exists(f), false, `出现第二语言工具链 ${f}`);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, 'GPL-3.0-only');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  // 核心域 / CLI / MCP 实现主体仍是 .js / .mjs 单一语言
  for (const dir of ['src/core', 'src/cli', 'src/mcp', 'src/io', 'scripts']) {
    if (!exists(dir)) continue;
    const foreign = readdirSync(join(ROOT, dir))
      .filter((f) => /\.(ts|tsx|py|go|rs|java|kt|c|cc|cpp|rb|php|cs|swift|scala)$/.test(f));
    assert.equal(foreign.length, 0, `${dir} 出现第二语言源码 ${foreign.join(',')}`);
  }
});

test('T-044 · CHANGELOG 补录 T-044 且保持 [Unreleased] 未发布口径', () => {
  const t = read('CHANGELOG.md');
  assert.match(t, /T-044/, 'CHANGELOG 缺 T-044 条目');
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /0\.1\.0-dev/);
  assert.equal(/npm publish|已发布 Release|Published on/i.test(t), false, '声称已发布');
});

test('T-044 · scripts/language-source.mjs 仍单一语言、无机器码实现主体', async () => {
  const mod = await import(`file://${join(ROOT, 'scripts/language-source.mjs')}`);
  const r = mod.evaluateLanguageSource(mod.COLLECTED_CLEAN_FIXTURE);
  assert.equal(r.checks.find((c) => c.id === 'single_language')?.ok, true,
    'T-044 破坏单一实现语言判定');
  assert.equal(r.checks.find((c) => c.id === 'no_machine_code')?.ok, true,
    'T-044 引入机器码实现主体');
  assert.equal(mod.isOsMetadata('src/.DS_Store'), true);
});
