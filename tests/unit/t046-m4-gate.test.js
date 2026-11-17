// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-046 · Phase 3 门禁取证断言（先红后绿，P-02） · 审计追踪 ID: RR-T046-20261117-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 `scripts/m4-gate.mjs`、报告与 CHANGELOG T-046 条目落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-046 / SPEC.md §10 / §17 / AC-13 / AC-18 / AC-19 / SC-007 / SC-014 / SC-015 /
 * constitution.md §3.3 / §4）：
 * - §10 标注「必需」文件 100% 存在且非空（动态解析，21 项）——此项静态可证。
 * - SC-007 静态可证；SC-014 / SC-015 静态层可证，但 Release 归档、三平台实测、全量回归
 *   均排在后序 M5 任务（T-050～T-054），端到端未证。
 * - AC-13 / AC-18 / AC-19 的 Given 均为「仓库 / 产物处于可发布状态」，前置不成立，
 *   不得转绿；按 T-030 / T-037 / T-041 / T-043 同构 D 口径：只交付取证器与审计报告，
 *   登记新 ISSUE，把「红→绿」留给人工裁决。
 * - 取证器不接 CI 必跑门禁，不改 P0、不改三条 AC 文件、不勾 tasks.md。
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

export const T046_SCRIPT = 'scripts/m4-gate.mjs';
export const T046_CHECKS = Object.freeze([
  'spec10_required', 'ac13_static', 'ac18_static', 'ac19_static',
  'sc007_static', 'sc014_static', 'sc015_static',
  'prereq_evidence', 'honest_boundary',
]);
export const T046_AC = Object.freeze(['ac-13', 'ac-18', 'ac-19']);

const FROZEN = Object.freeze([
  'SPEC.md', 'plan.md', 'constitution.md', 'tasks.md', 'README.md', 'LICENSE', '.gitignore',
  'run.mjs', 'scripts/acceptance.mjs', 'scripts/spec-check.mjs', 'scripts/lint.mjs',
  'scripts/coverage.mjs', 'src/cli/args.js', 'src/cli/index.js',
  'tests/acceptance/offline-integration.mjs', '.github/workflows/ci.yml',
]);

const executableCi = () => read('.github/workflows/ci.yml')
  .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---------------------------------------------------------------- A · 脚本与纯函数

test('T-046 · 取证脚本存在、非空、SPDX / [AIGC] / 待人工审查齐备', () => {
  assert.ok(exists(T046_SCRIPT), `${T046_SCRIPT} 缺失`);
  assert.ok(sizeOf(T046_SCRIPT) > 1600, '脚本过短，疑似占位');
  const t = read(T046_SCRIPT);
  assert.ok(t.startsWith('// SPDX-License-Identifier: GPL-3.0-only'), '缺 SPDX 头');
  assert.match(t, /\[AIGC\]/, '缺 [AIGC] 标注');
  assert.match(t, /待人工审查|人工审查/, '缺待人工审查标注');
  for (const k of ['T-046', 'AC-13', 'AC-18', 'AC-19', 'SC-007', 'SC-014', 'SC-015', 'M4']) {
    assert.ok(t.includes(k), `缺映射 ${k}`);
  }
});

test('T-046 · 脚本零第三方依赖、只读、零写盘 API、零网络、零 spawnSync', () => {
  const t = read(T046_SCRIPT);
  for (const m of t.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    assert.ok(spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('file:'),
      `${T046_SCRIPT} 引入外部包 ${spec}`);
  }
  for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync',
    'copyFileSync', 'renameSync', 'createWriteStream', 'spawnSync', 'execFileSync', 'execSync']) {
    assert.equal(t.includes(api), false, `含禁用 API ${api}`);
  }
  assert.equal(/\bfetch\s*\(|node:https?/.test(t), false, '含网络出口');
});

test('T-046 · 判定逻辑为可注入纯函数，干净证据全绿且 AC 一律不转绿', async () => {
  const mod = await import(`file://${join(ROOT, T046_SCRIPT)}`);
  assert.equal(typeof mod.evaluateM4Gate, 'function', '未导出判定纯函数');
  assert.equal(typeof mod.collectM4Evidence, 'function', '未导出现场取证函数');
  assert.deepEqual([...mod.CHECK_IDS], [...T046_CHECKS], '检查项 ID 与口径不符');
  const good = mod.evaluateM4Gate(mod.CLEAN_FIXTURE);
  assert.equal(good.failed, 0, `正向证据存在失败项: ${good.failed}`);
  assert.equal(good.verdict, 'STATIC_ONLY', '正向证据未得到 STATIC_ONLY');
  for (const id of ['ac13', 'ac18', 'ac19']) {
    assert.equal(good[`${id}_green`], false, `${id} 被取证器声称转绿`);
  }
  assert.equal(good.m4_exit, false, '取证器不得声称 M4 出口达成');
  assert.equal(good.publishable_state, false, '取证器不得声称可发布状态成立');
  assert.equal(good.end_to_end, 'unverified', '端到端未如实登记');
  assert.equal(good.release_artifacts, 0, 'v1 未发布却登记了产物');
  assert.ok(good.checks.every((c) => c.ok === true), '正向应有全绿检查项');
});

test('T-046 · 逐项负向注入证明非恒真、非恒假', async () => {
  const mod = await import(`file://${join(ROOT, T046_SCRIPT)}`);
  for (const id of T046_CHECKS) {
    const bad = mod.evaluateM4Gate({ ...mod.CLEAN_FIXTURE, [`break_${id}`]: true });
    assert.equal(bad.checks.find((c) => c.id === id)?.ok, false, `${id} 判定恒真，无法打红`);
    assert.notEqual(bad.verdict, 'STATIC_ONLY', `${id} 打红后整体仍 STATIC_ONLY`);
  }
  assert.equal(mod.evaluateM4Gate(mod.CLEAN_FIXTURE).failed, 0, '缺少可判全绿的输入（恒假）');
});

test('T-046 · 真阳性注入：可发布状态 / 转绿 AC / 机器码 / 真实数据令牌均须打红', async () => {
  const mod = await import(`file://${join(ROOT, T046_SCRIPT)}`);
  const cases = [
    [{ publishableState: true }, 'honest_boundary'],
    [{ acGreenCount: 1 }, 'honest_boundary'],
    [{ machineMagicHits: ['elf'] }, 'ac19_static'],
    [{ tokenHits: ['fake-hit'] }, 'ac18_static'],
    [{ bundleHits: ['package-lock.json'] }, 'sc014_static'],
    [{ spec10Missing: ['SUPPORT.md'] }, 'spec10_required'],
    [{ prereqMissing: ['scripts/m4-gate.mjs'] }, 'prereq_evidence'],
  ];
  for (const [injection, id] of cases) {
    const bad = mod.evaluateM4Gate({ ...mod.CLEAN_FIXTURE, ...injection });
    assert.equal(bad.checks.find((c) => c.id === id)?.ok, false,
      `注入 ${JSON.stringify(injection)} 未打红 ${id}`);
    assert.equal(bad.verdict, 'BLOCKED', `注入 ${JSON.stringify(injection)} 未整体转 BLOCKED`);
  }
});

// ---------------------------------------------------------------- B · 现场取证

test('T-046 · §10 必需文件 100% 存在且非空（动态解析，防漂移）', () => {
  const required = safeRead('SPEC.md').match(/^\| `([^`]+)` \| 必需/gm)
    ?.map((l) => l.match(/`([^`]+)`/)[1]) ?? [];
  assert.ok(required.length >= 20, `§10 必需项解析异常: ${required.length}`);
  const missing = required.filter((rel) => {
    if (rel.endsWith('/')) {
      const dir = join(ROOT, rel.replace(/\/$/, ''));
      return !existsSync(dir) || readdirSync(dir).length === 0;
    }
    return !exists(rel) || sizeOf(rel) === 0;
  });
  assert.deepEqual(missing, [], `§10 必需项缺失: ${missing.join(',')}`);
});

test('T-046 · 现场取证：AC 静态层 / SC 静态层均成立，边界如实登记', async () => {
  const mod = await import(`file://${join(ROOT, T046_SCRIPT)}`);
  const ev = mod.collectM4Evidence();
  assert.equal(ev.spec10Missing.length, 0, '§10 现场存在缺失项');
  assert.deepEqual(ev.tokenHits, [], '现场命中真实数据令牌');
  assert.deepEqual(ev.bundleHits, [], '现场出现包管理器产物');
  assert.deepEqual(ev.machineMagicHits, [], '现场命中机器码魔数');
  assert.deepEqual(ev.prereqMissing, [], '前置取证器缺失');
  assert.equal(ev.publishableState, false, 'v1 未发布却判可发布状态');
  assert.equal(ev.matrixCells, 1, '本机矩阵格数应为 1');
  assert.equal(ev.matrixTotal, 9, '全矩阵格数应为 9');
  const r = mod.evaluateM4Gate(ev);
  assert.equal(r.failed, 0, `现场证据存在失败项: ${r.failed}`);
  assert.equal(r.verdict, 'STATIC_ONLY', '现场未得到 STATIC_ONLY');
});

test('T-046 · 前置取证器（T-042～T-045）实体齐备且 SC-007 静态可证', () => {
  for (const rel of ['scripts/community-files.mjs', 'scripts/language-source.mjs',
    'scripts/polyglot-gate.mjs', 'scripts/encoding-check.mjs']) {
    assert.ok(sizeOf(rel) > 800, `${rel} 前置取证器缺失或过短`);
  }
  const exec = executableCi();
  assert.match(exec, /community-files\.mjs/, 'SC-007 的 CI 文件检查未实接（剥注释后）');
  const cf = safeRead('scripts/community-files.mjs');
  assert.match(cf, /spec10_required/, 'community-files 未动态解析 §10 必需项');
});

// ---------------------------------------------------------------- C · 不转绿与不变量

test('T-046 · AC-13 / AC-18 / AC-19 仍 RED，19/19 RED、tasks.md 零勾选', () => {
  for (const id of T046_AC) {
    const t = read(`tests/acceptance/${id}.md`);
    assert.match(t, /\| 状态 \| \*\*RED\*\*/, `${id} 被转绿`);
    assert.match(t, /可发布状态/, `${id} 的 Given 文本丢失（P0 不可改）`);
  }
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19, 'AC 文件数被改动');
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
});

test('T-046 · 取证器不接入 CI 必跑门禁，CI 头部仅登记', () => {
  const exec = executableCi();
  assert.equal(exec.includes(T046_SCRIPT), false,
    'm4-gate 不得接入 CI required jobs（仅登记不执行）');
  assert.equal(exec.includes('m4-gate'), false, 'CI 执行区不得出现 m4-gate');
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /T-046/, 'CI 头部未登记 T-046');
  for (const forbidden of ['--allow-green', 'continue-on-error', 'skip-scenario', 'ac-green']) {
    assert.equal(exec.includes(forbidden), false, `${forbidden} 弱化门禁`);
  }
});

test('T-046 · P0 基线 + 三条 AC 文件零 diff', () => {
  let out = '';
  try {
    out = execFileSync('git', ['diff', '--name-only', 'HEAD', '--',
      ...FROZEN, ...T046_AC.map((id) => `tests/acceptance/${id}.md`)],
    { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch { out = 'ERR_GIT_DIFF'; }
  assert.equal(out, '', `P0 / AC 文件被改动: ${out}`);
});

test('T-046 · 报告落盘并记录 D 口径、新 ISSUE 与端到端边界', () => {
  const report = safeRead('reports/t046-m4-gate.md');
  assert.ok(report.length > 1800, '报告缺失或过短');
  for (const k of ['ISSUE-20261117-T046-M4-GATE', 'STATIC_ONLY', 'm4_exit=false',
    'AC-13', 'AC-18', 'AC-19', 'T-052', 'D 口径']) {
    assert.ok(report.includes(k), `报告缺 ${k}`);
  }
});

test('T-046 · CHANGELOG 补录 T-046 且保持 [Unreleased] 未发布口径', () => {
  const t = read('CHANGELOG.md');
  assert.match(t, /T-046/, 'CHANGELOG 缺 T-046 条目');
  assert.match(t, /ISSUE-20261117-T046-M4-GATE/, 'CHANGELOG 未登记新 Issue');
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /0\.1\.0-dev/);
  assert.equal(/npm publish|已发布 Release|Published on/i.test(t), false);
});
