// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-043 · 实现语言与 Corresponding Source 门禁可执行断言（先红后绿，P-02） · 审计追踪 ID: RR-T043-20261117-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 `scripts/language-source.mjs`、`docs/release-audit.md`、
 * `CHANGELOG.md` T-043 条目落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-043 / SPEC.md AC-19 / NFR-015 / NFR-004 / FR-037 / P-16 /
 * SC-015 / constitution.md §3.3 / plan.md §11 / SPEC.md §14.3 ADR-002）：
 * - 实现主体必须是**现行 ISO/IEC 标准化语言**（ECMAScript / ISO/IEC 22275:2018）
 *   的人类可读、可修改源码；机器码 / ISA 绑定二进制不得作为实现主体。
 * - 每个 Release 产物须附 Corresponding Source 且一一对应；三平台 AC 结果一致。
 * - **结构性矛盾（与 T-037 / T-041 同构，登记待裁决）**：v1 明令不发 Release /
 *   不 npm publish（`package.json private=true`、无发布字段、无 release.yml），
 *   故「产物↔源码一一对应」当前只能以**空产物集**取证；ci.yml matrix 为
 *   3 OS × 3 Node，本机仅 macOS 1 格可实测；19/19 AC 仍 RED。因此本任务只交付
 *   **取证器 + 发布审计记录**，绝不把 AC-19 转绿、不勾 tasks.md、不改 P0。
 * - 真实身体数据令牌规则唯一权威仍在 ci.yml；本文件与所有新脚本反向读取、零复制。
 * - `src/.DS_Store` 是 macOS 元数据、未被 Git 跟踪且被 .gitignore 忽略，
 *   **不是**机器码实现主体；扫描须显式排除并如实登记，不得误判为假绿或假红。
 * - 判定逻辑抽成可注入纯函数，单测零 spawnSync（避免加剧
 *   `ISSUE-20261114-T042-COVERAGE-TIMEOUT` 的覆盖率并发超时耦合）。
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

export const T043_SCRIPT = 'scripts/language-source.mjs';
export const T043_AUDIT = 'docs/release-audit.md';
export const T043_CHECKS = Object.freeze([
  'iso_language', 'human_readable', 'no_machine_code', 'single_language',
  'archive_mapping', 'matrix_contract', 'contributor_no_real_data', 'release_audit_record',
]);
export const T043_MAGICS = Object.freeze([
  'elf', 'macho_le', 'macho_be', 'macho64_le', 'pe_mz', 'wasm', 'java_class',
]);

/** P0 基线（与 T-042 冻结清单一致，新增 ci.yml）。 */
const FROZEN = Object.freeze([
  'SPEC.md', 'plan.md', 'constitution.md', 'tasks.md', 'README.md', 'LICENSE', '.gitignore',
  'run.mjs', 'scripts/acceptance.mjs', 'scripts/spec-check.mjs', 'scripts/lint.mjs',
  'scripts/coverage.mjs', 'src/cli/args.js', 'src/cli/index.js',
  'tests/acceptance/offline-integration.mjs', '.github/workflows/ci.yml',
]);

const executableCi = () => read('.github/workflows/ci.yml')
  .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---------------------------------------------------------------- A · 脚本与纯函数

test('T-043 · 语言与归档检查脚本存在、非空、SPDX / [AIGC] / 待人工审查齐备', () => {
  assert.ok(exists(T043_SCRIPT), `${T043_SCRIPT} 缺失`);
  assert.ok(sizeOf(T043_SCRIPT) > 1200, '脚本过短，疑似占位');
  const t = read(T043_SCRIPT);
  assert.ok(t.startsWith('// SPDX-License-Identifier: GPL-3.0-only'), '缺 SPDX 头');
  assert.match(t, /\[AIGC\]/, '缺 [AIGC] 标注');
  assert.match(t, /待人工审查|人工审查/, '缺待人工审查标注');
  assert.match(t, /T-043/, '缺任务标识');
  assert.match(t, /AC-19/, '缺 AC-19 映射');
});

test('T-043 · 脚本零第三方依赖、只读、零写盘 API、零网络', () => {
  const t = read(T043_SCRIPT);
  for (const m of t.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    assert.ok(spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('file:'),
      `${T043_SCRIPT} 引入外部包 ${spec}`);
  }
  for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync',
    'copyFileSync', 'renameSync', 'createWriteStream']) {
    assert.equal(t.includes(api), false, `含写盘 API ${api}`);
  }
  assert.equal(/\bfetch\s*\(|node:https?/.test(t), false, '含网络出口');
});

test('T-043 · 脚本绝不复制真实数据令牌字面量（动态取 ci.yml 唯一权威）', () => {
  const ci = read('.github/workflows/ci.yml');
  const m = /const TOKENS = (\/.+?\/);/.exec(ci);
  assert.ok(m, 'ci.yml 的唯一权威令牌声明缺失');
  assert.equal(read(T043_SCRIPT).includes(m[1]), false, '脚本复制了令牌字面量，会自命中');
  assert.match(read(T043_SCRIPT), /tokenRule|scan-common/, '未复用公共层动态读取规则');
});

test('T-043 · 判定逻辑为可注入纯函数，且正向证据全绿、负向注入非恒真', async () => {
  const mod = await import(`file://${join(ROOT, T043_SCRIPT)}`);
  assert.equal(typeof mod.evaluateLanguageSource, 'function', '未导出判定纯函数');
  assert.equal(typeof mod.collectLanguageEvidence, 'function', '未导出现场取证函数');

  const good = mod.evaluateLanguageSource(mod.COLLECTED_CLEAN_FIXTURE);
  assert.equal(good.checks.length, T043_CHECKS.length, '检查项数量与口径不符');
  assert.equal(good.verdict, 'STATIC_ONLY', '正向证据未得到 STATIC_ONLY');
  assert.equal(good.failed, 0, `正向证据存在失败项: ${good.failed}`);
  assert.equal(good.ac19_green, false, '取证器不得声称 AC-19 已转绿');
  assert.equal(good.release_artifacts, 0, 'v1 发布产物必须为空集');

  // 逐项负向注入：每个检查项都必须能被单独打红，证明非恒真。
  for (const id of T043_CHECKS) {
    const bad = mod.evaluateLanguageSource({ ...mod.COLLECTED_CLEAN_FIXTURE, [`break_${id}`]: true });
    assert.equal(bad.checks.find((c) => c.id === id)?.ok, false, `${id} 判定恒真，无法负向注入`);
    assert.notEqual(bad.verdict, 'STATIC_ONLY', `${id} 打红后整体仍判 STATIC_ONLY`);
  }
  // 打红全部检查项，证明非恒假（存在全绿输入）。
  assert.equal(good.failed, 0, '缺少可判全绿的输入');
});

test('T-043 · 机器码魔数表完整覆盖 ELF / Mach-O / PE / WASM / Java class', async () => {
  const mod = await import(`file://${join(ROOT, T043_SCRIPT)}`);
  assert.ok(mod.MACHINE_MAGICS, '未导出魔数表');
  for (const key of T043_MAGICS) {
    assert.ok(mod.MACHINE_MAGICS[key], `魔数表缺 ${key}`);
  }
  // 逐魔数负向注入：把一个实现文件换成对应魔数，必须命中 no_machine_code。
  for (const key of T043_MAGICS) {
    const ev = { ...mod.COLLECTED_CLEAN_FIXTURE, injectedMagic: key };
    const r = mod.evaluateLanguageSource(ev);
    assert.equal(r.checks.find((c) => c.id === 'no_machine_code')?.ok, false,
      `${key} 魔数未被拦截`);
  }
});

// ---------------------------------------------------------------- B · 发布审计记录

test('T-043 · 发布审计记录存在、非空、[AIGC] / 待人工审查 / 未发布口径齐备', () => {
  assert.ok(exists(T043_AUDIT), `${T043_AUDIT} 缺失`);
  assert.ok(sizeOf(T043_AUDIT) > 1200, '审计记录过短，疑似占位');
  const t = read(T043_AUDIT);
  assert.match(t, /\[AIGC\]/, '缺 [AIGC] 标注');
  assert.match(t, /待人工审查|人工审查/, '缺待人工审查标注');
  assert.match(t, /T-043/, '缺任务标识');
  assert.match(t, /AC-19/, '缺 AC-19 映射');
});

test('T-043 · 发布审计记录如实声明空产物集 / 未发布 / 不构成端到端证据', () => {
  const t = read(T043_AUDIT);
  assert.match(t, /release_artifacts=0|产物为空|零个?产物/, '未声明产物空集');
  assert.match(t, /尚未发布|未发布|不发 Release/, '未声明 v1 未发布');
  assert.match(t, /不构成|不等价|非端到端|不是端到端/, '未声明不构成端到端证据');
  assert.equal(/已发布 Release|Published on|npm publish\s*成功/.test(t), false,
    '审计记录声称已发布，属假绿');
});

test('T-043 · 发布审计记录如实登记三平台取证边界与 AC-19 仍 RED', () => {
  const t = read(T043_AUDIT);
  assert.match(t, /1\/9|九格|9 格/, '未登记本机仅 1/9 矩阵可实测');
  assert.match(t, /本机.*≠|非 CI 已运行|不代表.*Actions|未运行/, '未声明本机结果 ≠ CI 已运行');
  assert.match(t, /AC-19.*RED|仍为红|仍 RED/, '未登记 AC-19 仍 RED');
  assert.match(t, /T-046/, '未登记 AC-19 转绿归 T-046');
  assert.match(t, /T-052/, '未登记 Release 归档归 T-052');
});

test('T-043 · 发布审计记录覆盖 Corresponding Source 一一对应规则与三平台 AC 场景', () => {
  const t = read(T043_AUDIT);
  for (const key of ['Corresponding Source', '一一对应', 'GPL-3.0', 'ISO/IEC 22275:2018',
    'Windows', 'macOS', 'Linux', '贡献者']) {
    assert.ok(t.includes(key), `审计记录缺 ${key}`);
  }
  assert.equal(t.includes('16262:2011 现行'), false, '把已撤销标准写成现行');
});

// ---------------------------------------------------------------- C · 不接线与不变量

test('T-043 · 新脚本不被提前接入 CI 必跑门禁，出口裁决仍归 T-046', () => {
  const exec = executableCi();
  assert.equal(exec.includes(T043_SCRIPT), false,
    'T-043 取证器不得提前接入 CI required jobs（AC-19 未转绿）');
  assert.match(read('.github/workflows/ci.yml'), /T-046/, 'CI 头部未登记 T-046 出口');
  for (const forbidden of ['--allow-green', 'continue-on-error', 'skip-scenario',
    'node scripts/encoding-check.mjs', 'node scripts/polyglot-gate.mjs']) {
    assert.equal(exec.includes(forbidden), false, `${forbidden} 弱化门禁或提前接线`);
  }
});

test('T-043 · AC 仍 19/19 RED、tasks.md 零勾选、T-043 行未勾选', () => {
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))),
    '有 AC 被转绿');
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  assert.ok(tasks.split('\n').find((l) => l.includes('**T-043**')).startsWith('- [ ]'));
});

test('T-043 · P0 基线与 ci.yml 工作树零 diff', () => {
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
  assert.equal(out, '', `P0 基线被改动: ${out}`);
});

test('T-043 · 19 份 AC 快照位未被 T-043 冒充为真实快照', () => {
  const manifest = safeRead('tests/snapshots/i18n/manifest.json');
  assert.ok(manifest.length > 0, '真实多语言快照清单缺失');
  assert.equal(read('tests/acceptance/ac-19.md').includes('GREEN'), false,
    'ac-19.md 出现 GREEN 字样');
});

test('T-043 · package.json 仍是零依赖 / private / GPL-3.0-only / 无发布字段', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, 'GPL-3.0-only');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  for (const k of ['publishConfig', 'files', 'bin', 'prepack', 'postpack']) {
    assert.equal(k in pkg || k in (pkg.scripts ?? {}), false, `出现发布字段 ${k}`);
  }
});

test('T-043 · CHANGELOG 补录 T-043 且保持 [Unreleased] 未发布口径', () => {
  const t = read('CHANGELOG.md');
  assert.match(t, /T-043/, 'CHANGELOG 缺 T-043 条目');
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /0\.1\.0-dev/);
  assert.equal(/npm publish|已发布 Release|Published on/i.test(t), false, '声称已发布');
});

test('T-043 · 未跟踪的 .DS_Store 不得被误报为机器码实现主体', async () => {
  const mod = await import(`file://${join(ROOT, T043_SCRIPT)}`);
  assert.equal(mod.isOsMetadata('src/.DS_Store'), true, '.DS_Store 未被识别为 OS 元数据');
  assert.equal(mod.isOsMetadata('src/core/render/index.js'), false, '实现源码被误判为元数据');
  const r = mod.evaluateLanguageSource(mod.COLLECTED_CLEAN_FIXTURE);
  assert.equal(r.checks.find((c) => c.id === 'no_machine_code')?.ok, true,
    'OS 元数据导致 no_machine_code 假红');
  assert.match(r.metadata_note ?? '', /DS_Store|OS 元数据|未跟踪/, '未如实登记元数据排除');
});
