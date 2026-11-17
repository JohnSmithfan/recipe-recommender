// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · 全量 CI 门禁与静态扫描可执行断言（先红后绿，P-02） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于四个 scripts/ 扫描脚本、`.github/workflows/ci.yml` 完整版、
 * `CHANGELOG.md` Phase 3 条目落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-042 / SPEC.md FR-036～039 / FR-047～053 / AC-12 / AC-13 / AC-18 /
 * §10 / plan.md §11 / constitution.md §3 DoD / SC-001 / SC-002 / SC-007 / SC-014）：
 * - `ci.yml` 在 P0 由 T-006 产出骨架，但 `tasks.md T-042` 明确把「ci.yml 完整版」列入
 *   本任务产出（ISSUE-20261113-T040-OVERLAP）。本任务按 P0 自身规划升级 CI，
 *   不改 SPEC / plan / constitution / tasks / README / ac-*.md / run.mjs / acceptance.mjs。
 * - **CI 绿 ≠ AC 转绿**：`acceptance` job 仍以「19/19 红态基线完整」为通过条件，
 *   绝不接 `--allow-green` / `continue-on-error` / 跳过场景；p1-gate / p2-gate 恒
 *   `BLOCKED` / exit 2，是取证器而非出口裁决器，不接入 required jobs。出口裁决归
 *   T-022 四选一与 T-046 人工决定（P-02 / P-09 / RK-03）。
 * - `polyglot-gate`（T-044）/ `encoding-check`（T-045）只登记、不接线，不得提前假绿。
 * - 真实身体数据令牌规则**唯一权威仍在 `.github/workflows/ci.yml`**：四处既有消费方
 *   （offline-integration.mjs / p2-gate.mjs / T-040 / T-041 单测）动态提取；四个新扫描脚本
 *   一律反向读取该声明，**绝不复制令牌字面量**，否则会被全仓扫描自命中（FR-053 / P-14）。
 * - 四个脚本是零依赖、只读、可独立执行的取证器，输出纯 ASCII `key=value` 且 `status=` 收尾。
 * - 所有文档 / 脚本均为 `[AIGC]` 候选文本，待人工审查（P-10）；AC 转绿归 T-046。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const safeRead = (rel) => (existsSync(join(ROOT, rel)) ? read(rel) : '');
const sizeOf = (rel) => (existsSync(join(ROOT, rel)) ? statSync(join(ROOT, rel)).size : 0);

/** T-042 本次应产出的四个静态扫描脚本（单一职责、可独立执行）。 */
export const T042_SCRIPTS = Object.freeze([
  'scripts/privacy-scan.mjs',
  'scripts/license-scan.mjs',
  'scripts/community-files.mjs',
  'scripts/i18n-keys.mjs',
]);

/** T-006 六个骨架 job 名一个都不能被削弱（T-040 取证口径）。 */
export const T042_BASE_JOBS = Object.freeze([
  'spec-consistency', 'unit', 'acceptance', 'lint-typecheck', 'privacy-scan', 'matrix',
]);

/** T-042 新增的三个实际执行门禁（encoding-check / polyglot-gate 归 T-044 / T-045）。 */
export const T042_NEW_JOBS = Object.freeze([
  'license-scan', 'community-files', 'offline',
]);

/** 剥注释（含头部待办登记）后必须真实出现在可执行命令中的十项门禁。 */
export const T042_REQUIRED_COMMANDS = Object.freeze([
  'npm run spec-check',
  'npm test',
  'node scripts/coverage.mjs',
  'npm run acceptance',
  'node scripts/lint.mjs',
  'node scripts/i18n-keys.mjs',
  'node scripts/privacy-scan.mjs',
  'node scripts/license-scan.mjs',
  'node scripts/community-files.mjs',
  'node tests/acceptance/offline-integration.mjs',
]);

const ci = () => safeRead('.github/workflows/ci.yml');
/** 与 p2-gate.mjs 的 ciExecWired 同口径：注释里出现门禁名不算接线。 */
const executableCi = () => ci().split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
const tokenRule = () => {
  const m = /const TOKENS = \/(.+?)\/;/.exec(ci());
  assert.ok(m, 'ci.yml 的唯一权威令牌规则缺失');
  return new RegExp(m[1]);
};
const runScript = (rel) => spawnSync(process.execPath, [join(ROOT, rel)], {
  cwd: ROOT, encoding: 'utf8', timeout: 120000,
});
const gitDiffNames = (paths) => {
  try {
    return execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...paths], {
      cwd: ROOT, encoding: 'utf8',
    }).trim();
  } catch {
    return 'ERR_GIT_DIFF';
  }
};
/** 全仓 POSIX 相对路径（与 CI 骨架 / lint.mjs 同口径）。 */
function allFiles() {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '.git' || e.name === 'node_modules') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  return walk(ROOT).map((p) => p.slice(ROOT.length + 1).replace(/\\/g, '/'));
}

// ---------------------------------------------------------------- A · 扫描脚本

test('T-042 · 四个静态扫描脚本存在、非空、SPDX / [AIGC] / 待人工审查齐备', () => {
  for (const rel of T042_SCRIPTS) {
    assert.ok(existsSync(join(ROOT, rel)), `${rel} 缺失`);
    assert.ok(sizeOf(rel) > 800, `${rel} 内容过短，疑似占位`);
    const t = read(rel);
    assert.ok(t.startsWith('// SPDX-License-Identifier: GPL-3.0-only'), `${rel} 缺 SPDX 头`);
    assert.match(t, /\[AIGC\]/, `${rel} 缺 [AIGC] 标注`);
    assert.match(t, /待人工审查|人工审查/, `${rel} 缺待人工审查标注`);
    assert.match(t, /T-042/, `${rel} 缺任务标识`);
  }
});

test('T-042 · 四个脚本可独立执行、exit 0、纯 ASCII key=value 且 status=ok 收尾', () => {
  for (const rel of T042_SCRIPTS) {
    const r = runScript(rel);
    assert.equal(r.status, 0, `${rel} 执行失败: ${String(r.stderr ?? r.error).slice(0, 200)}`);
    const lines = String(r.stdout).trim().split('\n');
    assert.ok(lines.length >= 4, `${rel} 报告过短`);
    assert.ok(lines.every((l) => /^[a-z][a-z0-9._-]*=[\x20-\x7E]*$/.test(l)), `${rel} 报告含非法行`);
    assert.equal(lines.at(-1), 'status=ok', `${rel} 未以 status=ok 收尾`);
    assert.ok(!/check\.[a-z0-9._-]+=fail/.test(lines.join('\n')), `${rel} 存在 fail 检查项`);
  }
});

test('T-042 · 四个脚本绝不复制真实数据令牌字面量（动态取 ci.yml 唯一权威）', () => {
  const tokens = tokenRule();
  for (const rel of T042_SCRIPTS) {
    const t = read(rel);
    assert.equal(tokens.test(t), false, `${rel} 复制了真实数据令牌字面量，会自命中`);
    assert.match(t, /const TOKENS = \\\/\(\.\+\?\)\\\/\;|TOKEN_RULE|tokenRule/, `${rel} 未动态读取唯一权威规则`);
  }
});

test('T-042 · 四个脚本零第三方依赖、只读、无写盘 API', () => {
  for (const rel of T042_SCRIPTS) {
    const t = read(rel);
    for (const m of t.matchAll(/^\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      assert.ok(spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('file:'),
        `${rel} 引入外部包 ${spec}`);
    }
    assert.ok(!/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync/.test(t), `${rel} 含写盘 API`);
  }
});

// ---------------------------------------------------------------- B · ci.yml 完整版

test('T-042 · 六个 T-006 骨架 job 名仍各恰好出现一次（基线未被削弱）', () => {
  const t = ci();
  for (const job of T042_BASE_JOBS) {
    assert.equal((t.match(new RegExp(`^  ${job}:\\s*$`, 'gm')) ?? []).length, 1,
      `${job} 应恰好作为一个顶层 job 出现`);
  }
});

test('T-042 · 新增 license-scan / community-files / offline 三个 job，均含 runs-on 与 steps', () => {
  const t = ci();
  for (const job of T042_NEW_JOBS) {
    assert.equal((t.match(new RegExp(`^  ${job}:\\s*$`, 'gm')) ?? []).length, 1,
      `${job} 应恰好作为一个顶层 job 出现`);
  }
  const blocks = t.split(/^  (?=\w[\w-]*:\s*$)/m);
  for (const job of T042_NEW_JOBS) {
    const block = blocks.find((b) => b.startsWith(`${job}:`));
    assert.ok(block, `${job} job 块缺失`);
    assert.match(block, /runs-on:/, `${job} 缺 runs-on`);
    assert.match(block, /steps:/, `${job} 缺 steps`);
  }
});

test('T-042 · 十项门禁在实际执行命令中真实接线（剥注释，注释不等于接线）', () => {
  const exec = executableCi();
  for (const cmd of T042_REQUIRED_COMMANDS) {
    assert.ok(exec.includes(cmd), `CI 实际命令缺 ${cmd}`);
  }
  // 与 p2-gate.mjs 的 ciExecWired 同口径：许可扫描实体必须真正被 CI 调用。
  assert.ok(exec.includes('scripts/license-scan.mjs'), 'CI 未实际执行许可扫描脚本');
  assert.ok(existsSync(join(ROOT, 'scripts/license-scan.mjs')), '许可扫描脚本实体缺失');
});

test('T-042 · 不提前接线 T-044 / T-045 / 出口裁决器，不弱化任何 AC 场景', () => {
  const exec = executableCi();
  for (const forbidden of [
    '--allow-green', 'continue-on-error', 'skip-scenario',
    'node scripts/encoding-check.mjs', 'node scripts/polyglot-gate.mjs',
    'gates/p1-gate.mjs', 'gates/p2-gate.mjs',
  ]) {
    assert.equal(exec.includes(forbidden), false, `${forbidden} 不得出现在实际执行命令中`);
  }
  const t = ci();
  assert.equal(t.includes('\t'), false, 'YAML 不得含 tab 缩进');
  assert.match(t, /19\/19|全红|红态基线/, 'CI 须如实登记红态基线口径');
});

test('T-042 · ci.yml 头部如实登记：CI 绿不等于 AC 转绿、门禁仍 BLOCKED、后续待办', () => {
  const t = ci();
  assert.match(t, /CI 绿|CI 全绿/, '未登记 CI 绿的含义');
  assert.match(t, /不等于|不代表|非验收/, '未声明 CI 绿不等于验收通过');
  assert.match(t, /BLOCKED/, '未登记 P1 / P2 门禁仍 BLOCKED');
  assert.match(t, /T-044/, '未登记 polyglot-gate 待办');
  assert.match(t, /T-045/, '未登记 encoding-check 待办');
  assert.match(t, /T-046/, '未登记 AC 转绿归 T-046');
});

test('T-042 · 令牌规则仍以 ci.yml 为唯一权威，且全仓除其自身外零复制', () => {
  const m = /const TOKENS = (\/.+?\/);/.exec(ci());
  assert.ok(m, 'ci.yml 的唯一权威令牌声明缺失');
  const literal = m[1];
  for (const rel of allFiles()) {
    if (rel === '.github/workflows/ci.yml') continue;
    let text = '';
    try { text = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; }
    assert.equal(text.includes(literal), false, `${rel} 复制了唯一权威令牌字面量`);
  }
});

// ---------------------------------------------------------------- C · 扫描覆盖项（报告级取证）

test('T-042 · privacy-scan 覆盖令牌 / diet-plan / 包管理器清单 / 网络出口 / 日志脱敏', () => {
  const out = String(runScript('scripts/privacy-scan.mjs').stdout);
  for (const key of ['check.tokens', 'check.diet_plan_dirs', 'check.package_manifests',
    'check.publish_fields', 'check.network_exits', 'check.log_redaction']) {
    assert.match(out, new RegExp(`^${key.replace('.', '\\.')}=ok$`, 'm'), `privacy-scan 缺 ${key}`);
  }
});

test('T-042 · license-scan 覆盖 GPL 全文 / NOTICES 清单 / 内置源 / 版权原文 / Corresponding Source', () => {
  const out = String(runScript('scripts/license-scan.mjs').stdout);
  for (const key of ['check.license_full', 'check.notices_catalog', 'check.bundled_sources',
    'check.copyrighted_guideline', 'check.corresponding_source', 'check.spdx_headers']) {
    assert.match(out, new RegExp(`^${key.replace('.', '\\.')}=ok$`, 'm'), `license-scan 缺 ${key}`);
  }
});

test('T-042 · community-files 动态解析 SPEC.md §10 的必需项，并校验 Issue forms', () => {
  const spec = read('SPEC.md');
  const rows = [...spec.matchAll(/^\| `([^`]+)` \| 必需/gm)].map((m) => m[1]);
  assert.ok(rows.length >= 20, `§10 必需项解析数=${rows.length}，疑似解析失效`);
  const out = String(runScript('scripts/community-files.mjs').stdout);
  assert.match(out, /^check\.spec10_required=ok$/m);
  assert.match(out, /^check\.issue_forms=ok$/m);
  assert.match(out, /^check\.optional_not_built=ok$/m);
});

test('T-042 · i18n-keys 覆盖语言包键集 / 区域来源 / 免责快照三项', () => {
  const out = String(runScript('scripts/i18n-keys.mjs').stdout);
  for (const key of ['check.keyset_uniform', 'check.region_subnational',
    'check.disclaimer_snapshots', 'check.no_inferred_source']) {
    assert.match(out, new RegExp(`^${key.replace('.', '\\.')}=ok$`, 'm'), `i18n-keys 缺 ${key}`);
  }
});

// ---------------------------------------------------------------- D · CHANGELOG Phase 3

test('T-042 · CHANGELOG 补录 T-041 / T-042 与 Phase 3 条目', () => {
  const t = read('CHANGELOG.md');
  for (const key of ['T-041', 'T-042', 'Phase 3', 'M1', 'M2']) {
    assert.ok(t.includes(key), `CHANGELOG 缺 ${key}`);
  }
  assert.match(t, /静态扫描|CI 门禁/);
});

test('T-042 · CHANGELOG 仍为 [Unreleased] 未发布口径，不声称 Release / 包管理器产物', () => {
  const t = read('CHANGELOG.md');
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /0\.1\.0-dev/);
  assert.match(t, /尚未发布|未发布|不代表/);
  assert.ok(!/npm publish|已发布 Release|Published on/i.test(t));
});

// ---------------------------------------------------------------- E · 不变量与防假绿

test('T-042 · AC 仍 19/19 RED、tasks.md 零勾选、T-042 行未勾选', () => {
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  assert.ok(tasks.split('\n').find((l) => l.includes('**T-042**')).startsWith('- [ ]'));
});

test('T-042 · P0 基线与 19 条 AC、CLI 命令快照工作树零 diff', () => {
  const acFiles = readdirSync(join(ROOT, 'tests/acceptance'))
    .filter((f) => /^ac-\d{2}\.md$/.test(f)).map((f) => `tests/acceptance/${f}`);
  const frozen = [
    'SPEC.md', 'plan.md', 'constitution.md', 'tasks.md', 'README.md', 'LICENSE', '.gitignore',
    'run.mjs', 'scripts/acceptance.mjs', 'scripts/spec-check.mjs', 'scripts/lint.mjs',
    'scripts/coverage.mjs', 'src/cli/args.js', 'src/cli/index.js',
    'tests/acceptance/offline-integration.mjs', ...acFiles,
  ];
  assert.equal(gitDiffNames(frozen), '', `P0 基线被改动:\n${gitDiffNames(frozen)}`);
});

test('T-042 · p1-gate / p2-gate 仍 BLOCKED / exit 2 / 零基线改动 / 零 E2E_PASS', () => {
  for (const rel of ['tests/acceptance/gates/p1-gate.mjs', 'tests/acceptance/gates/p2-gate.mjs']) {
    const r = runScript(rel);
    assert.equal(r.status, 2, `${rel} 不再是 BLOCKED / exit 2`);
    const out = String(r.stdout);
    assert.match(out, /^verdict=BLOCKED$/m, `${rel} verdict 被放宽`);
    assert.match(out, /^baseline_touched=0$/m, `${rel} 触碰了基线`);
    if (rel.includes('p2-gate')) assert.match(out, /^e2e_pass=0$/m, 'AC-14～17 出现假绿');
  }
});

test('T-042 · package.json 仍是零依赖 / private / GPL-3.0-only / 无发布字段', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, 'GPL-3.0-only');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  for (const k of ['publishConfig', 'files', 'bin', 'prepack', 'postpack']) {
    assert.equal(k in pkg, false, `package.json 含禁止字段 ${k}`);
    assert.equal(k in (pkg.scripts ?? {}), false, `scripts 含禁止字段 ${k}`);
  }
});

test('T-042 · T-040 / T-041 历史阶段断言按 T-042 口径订正，判定不放宽', () => {
  const t040 = read('tests/unit/community-files.test.js');
  const t041 = read('tests/unit/compliance-files.test.js');
  assert.match(t040, /T-042 口径订正/, 'T-040 单测未订正「不得提前接线」历史断言');
  assert.match(t041, /T-042 口径订正/, 'T-041 单测未订正「脚本不得存在」历史断言');
  // 订正后仍是更严的判定：AC 全红、零勾选、令牌动态取权威，一条都不能少。
  for (const t of [t040, t041]) {
    assert.match(t, /19\/19|files\.length, 19/, '订正后丢了 AC 红态不变量');
    assert.match(t, /\^\\\| 状态 \\\| \\\*\\\*RED\\\*\\\*|状态 \| \\\*\\\*RED/, '订正后丢了 RED 断言');
    assert.match(t, /39/, '订正后丢了 tasks.md 零勾选断言');
  }
});

test('T-042 · p2-gate 取证文字按 T-042 订正，但判定逻辑与 verdict 未放宽', () => {
  const gate = read('tests/acceptance/gates/p2-gate.mjs');
  assert.ok(!/仍是 T-006 六 job 骨架/.test(gate), 'p2-gate 仍把 CI 陈述为六 job 骨架');
  assert.ok(!/未接入 CI/.test(gate), 'p2-gate 仍陈述静态扫描未接入 CI');
  assert.match(gate, /ac\.statuses\['17'\] === 'GREEN'/, 'AC-17 人工转绿门槛被放宽');
  assert.match(gate, /ciExecWired\(ci, 'scripts\/license-scan\.mjs'\)/, 'CI 实接判据被放宽');
  assert.match(gate, /T-042/, '订正后仍须如实登记 T-042 缺口');
});
