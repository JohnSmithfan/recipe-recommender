// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-040 · §10 社区规范文件可执行断言（先红后绿，P-02） · 审计追踪 ID: RR-T040-20261113-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 §10 社区规范文件落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-040 / SPEC.md §10 / FR-036 / FR-039 / FR-052 / AC-13 / SC-007 / SC-014）：
 * - 只做**文本级结构断言**：零第三方依赖，本仓库不得引入 YAML 解析器；
 *   Issue forms 完整语法校验归 T-042 全量 CI 与人工审查。
 * - `ci.yml 完整版` 归 T-042（P0 基线冻结），本任务只登记依赖、绝不提前假绿改 CI。
 * - `THIRD_PARTY_NOTICES.md` / `PRIVACY.md` 归 T-041，本任务不越界产出。
 * - `SECURITY.md` 在 T-040 / T-041 被重复点名：T-040 按 §10「必需」产出社区规范版，
 *   T-041 后续补充合规细节，属任务表张力，需人工裁决，不改 tasks.md。
 * - 建议 / 可选文件按「登记不产出」处理（§10 v1 分发口径 + FR-052）。
 * - 真实数据令牌正则动态取自 ci.yml 唯一权威规则，绝不复制字面量（FR-053 / P-14）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const safeRead = (rel) => (existsSync(join(ROOT, rel)) ? read(rel) : '');
const sizeOf = (rel) => (existsSync(join(ROOT, rel)) ? statSync(join(ROOT, rel)).size : 0);

/** T-040 本次应产出的 §10「必需」文件（其余必需项已存在或归 T-041 / T-042）。 */
export const T040_REQUIRED = Object.freeze([
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/CODEOWNERS',
]);

/** §10 中已存在、本任务不得改动的必需项。 */
const EXISTING_REQUIRED = Object.freeze([
  'README.md', 'LICENSE', '.gitignore', 'constitution.md', 'plan.md',
  'docs/competitive-research.md', 'examples/profiles/README.md',
  'locales/_schema/keys.json', '.github/workflows/ci.yml',
]);

/** §10 建议 / 可选：v1 只登记、不产出实体文件。 */
const OPTIONAL_NOT_BUILT = Object.freeze([
  '.github/FUNDING.yml', 'GOVERNANCE.md', 'CITATION.cff',
  '.github/dependabot.yml', '.github/workflows/release.yml',
  'CONTRIBUTORS.md', 'AUTHORS.md',
]);

/** FR-052：v1 不得出现任何包管理器清单或发布流水线。 */
const FORBIDDEN_DISTRIBUTION = Object.freeze([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json',
  '.npmrc', '.github/workflows/publish.yml', '.github/workflows/npm-publish.yml',
]);

const NEW_FILES = T040_REQUIRED;
const allNewText = () => NEW_FILES.map((f) => safeRead(f)).join('\n');
const tokenRule = () => {
  const ci = read('.github/workflows/ci.yml');
  const m = /const TOKENS = \/(.+?)\/;/.exec(ci);
  assert.ok(m, 'ci.yml 的唯一权威令牌规则缺失');
  return new RegExp(m[1]);
};

test('T-040 · §10 中本任务负责的必需文件 100% 存在且非空', () => {
  for (const f of T040_REQUIRED) {
    assert.ok(existsSync(join(ROOT, f)), `${f} 缺失`);
    assert.ok(sizeOf(f) > 200, `${f} 内容过短，疑似占位`);
  }
});

test('T-040 · 既有 §10 必需文件仍存在且非空（P0 基线未被削弱）', () => {
  for (const f of EXISTING_REQUIRED) {
    assert.ok(existsSync(join(ROOT, f)), `${f} 缺失`);
    assert.ok(sizeOf(f) > 0, `${f} 为空`);
  }
  assert.ok(sizeOf('LICENSE') > 30000, 'LICENSE 必须是 GPL-3.0 全文');
});

test('T-040 · 每个新文件都有 [AIGC] 与待人工审查标注（P-10）', () => {
  for (const f of NEW_FILES) {
    const text = safeRead(f);
    assert.match(text, /\[AIGC\]/, `${f} 缺 [AIGC] 标注`);
    assert.match(text, /人工审查|人工确认|待人工/, `${f} 缺待人工审查标注`);
  }
});

test('T-040 · 每个新文件都声明 GPL-3.0-only 许可口径（FR-037 / P-07）', () => {
  for (const f of NEW_FILES) assert.match(safeRead(f), /GPL-3\.0/, `${f} 缺许可声明`);
});

test('T-040 · 建议 / 可选文件按登记处理，v1 不产出实体文件（FR-039 / FR-052）', () => {
  for (const f of OPTIONAL_NOT_BUILT) {
    assert.equal(existsSync(join(ROOT, f)), false, `${f} 不应在 v1 产出`);
  }
  const contributing = safeRead('CONTRIBUTING.md');
  for (const name of ['FUNDING.yml', 'GOVERNANCE.md', 'CITATION.cff']) {
    assert.ok(contributing.includes(name), `建议/可选登记缺 ${name}`);
  }
  assert.match(contributing, /建议|可选/);
  assert.match(contributing, /不阻塞|不产出|不进 v1/);
});

test('T-040 · CONTRIBUTING 含开发环境与可复跑的校验命令', () => {
  const t = safeRead('CONTRIBUTING.md');
  for (const cmd of ['npm test', 'npm run lint', 'npm run spec-check', 'npm run acceptance',
    'scripts/coverage.mjs', 'p1-gate.mjs', 'p2-gate.mjs', 'node --test']) {
    assert.ok(t.includes(cmd), `开发环境缺 ${cmd}`);
  }
  assert.match(t, /Node|node/);
  assert.match(t, /零第三方依赖|不安装依赖|无需安装/);
});

test('T-040 · CONTRIBUTING 含 SDD / ATDD、P-01～P-16、DoD、新增 FR/AC 与 PR 规范', () => {
  const t = safeRead('CONTRIBUTING.md');
  for (const key of ['SDD', 'ATDD', '先红后绿', 'P-01', 'P-16', 'DoD', 'Definition of Done',
    'FR-', 'AC-', 'SC-', 'SPEC.md', '追溯矩阵', 'PR']) {
    assert.ok(t.includes(key), `贡献指南缺 ${key}`);
  }
  assert.match(t, /constitution\.md/);
});

test('T-040 · CODE_OF_CONDUCT 含行为准则要点且不复制受版权保护的原文（FR-032 / FR-037）', () => {
  const t = safeRead('CODE_OF_CONDUCT.md');
  for (const key of ['行为准则', '报告', '处理', '范围', '尊重']) {
    assert.ok(t.includes(key), `准则缺 ${key}`);
  }
  assert.ok(!/Our Pledge|In the interest of fostering an open and welcoming environment|Contributor Covenant 全文/i.test(t),
    '不得复制 Contributor Covenant 原文');
  assert.match(t, /不复制|未复制|自撰/);
});

test('T-040 · SECURITY 含支持版本、私有报告渠道与响应流程，不鼓励公开披露未修复漏洞', () => {
  const t = safeRead('SECURITY.md');
  for (const key of ['支持版本', '漏洞', '报告', '响应']) assert.ok(t.includes(key), `SECURITY 缺 ${key}`);
  assert.match(t, /不要|不得|避免/);
  assert.ok(!/body_fat|weight_kg|height_cm/.test(t), '安全文档不得出现身体字段名');
});

test('T-040 · SUPPORT 含提问路径、Issue 分类与非医疗免责声明', () => {
  const t = safeRead('SUPPORT.md');
  assert.match(t, /Issue/);
  assert.match(t, /Discussions|讨论/);
  assert.match(t, /非医疗|不构成医疗/);
  assert.match(t, /\[AIGC\]/);
});

test('T-040 · CHANGELOG 遵循 Keep a Changelog / SemVer 并补录 M1～M2', () => {
  const t = safeRead('CHANGELOG.md');
  assert.match(t, /Keep a Changelog/);
  assert.match(t, /SemVer|语义化版本/);
  assert.match(t, /\[Unreleased\]/);
  assert.match(t, /M1/);
  assert.match(t, /M2/);
  assert.match(t, /Added|新增/);
  assert.match(t, /0\.1\.0-dev/);
});

test('T-040 · CHANGELOG 不得声称已发布 Release 或包管理器产物（FR-052）', () => {
  const t = safeRead('CHANGELOG.md');
  assert.match(t, /未发布|尚未发布|不代表/);
  assert.ok(!/npm publish|已发布 Release|Published on/i.test(t));
});

test('T-040 · bug_report.yml 是结构化 Issue form，且不索取任何身体数据', () => {
  const t = safeRead('.github/ISSUE_TEMPLATE/bug_report.yml');
  for (const key of ['name:', 'description:', 'labels:', 'body:', 'type: textarea', 'id:']) {
    assert.ok(t.includes(key), `bug_report 缺 ${key}`);
  }
  assert.ok(!/body_fat|weight_kg|height_cm|birth_date|blood_pressure/.test(t));
  assert.ok(!/\t/.test(t), 'YAML 不得含 tab 缩进');
});

test('T-040 · feature_request.yml 强制关联 FR / AC（P-03 可追溯）', () => {
  const t = safeRead('.github/ISSUE_TEMPLATE/feature_request.yml');
  for (const key of ['name:', 'description:', 'body:', 'FR-', 'AC-']) {
    assert.ok(t.includes(key), `feature_request 缺 ${key}`);
  }
  assert.match(t, /required: true/);
});

test('T-040 · config.yml 含 blank_issues_enabled 与 Discussions 入口，且 URL 为虚构占位', () => {
  const t = safeRead('.github/ISSUE_TEMPLATE/config.yml');
  assert.match(t, /blank_issues_enabled:/);
  assert.match(t, /contact_links:/);
  assert.match(t, /placeholder|占位|example\.invalid/);
  assert.ok(!/JohnSmithfan|github\.com\/[A-Za-z0-9_-]+\/recipe-recommender/.test(t),
    '不得写入真实仓库 / 个人账号');
});

test('T-040 · PR 模板关联 FR/AC/SC、SPEC 章节、测试结果与 AI 人工审查勾选（constitution §3.2）', () => {
  const t = safeRead('.github/PULL_REQUEST_TEMPLATE.md');
  for (const key of ['FR-', 'AC-', 'SC-', 'SPEC.md', '测试结果', '- [ ]']) {
    assert.ok(t.includes(key), `PR 模板缺 ${key}`);
  }
  assert.match(t, /AIGC/);
  assert.match(t, /人工审查/);
});

test('T-040 · CODEOWNERS 含规则草案与待人工填写占位，不指向真实个人账号', () => {
  const t = safeRead('.github/CODEOWNERS');
  assert.match(t, /\* @/);
  assert.match(t, /待人工|占位|PLACEHOLDER/);
  assert.ok(!/@[A-Za-z0-9_-]+\s*#\s*真实/.test(t));
  assert.ok(!/JohnSmithfan|privaterelay\.appleid\.com/.test(t), '不得写入真实个人身份');
});

test('T-040 · FR-052：仓库无包管理器清单 / publishConfig / 发布流水线', () => {
  for (const f of FORBIDDEN_DISTRIBUTION) {
    assert.equal(existsSync(join(ROOT, f)), false, `${f} 不应存在`);
  }
  const pkg = read('package.json');
  assert.ok(!/publishConfig|"files"\s*:/.test(pkg));
  assert.match(pkg, /"private": true/);
});

// [T-042 口径订正] 原断言锁定「ci.yml 仍是 T-006 六 job 骨架、不得提前接线」，
// 属 T-040 阶段的时点快照。T-042 已按 P0 任务表产出 ci.yml 完整版，故改为
// **更严**的正向取证：六骨架 job 一个不少、门禁必须真实接线、且不得假绿。
// 判定未放宽：AC 红态、tasks.md 零勾选、令牌动态取唯一权威三条不变量均保留。
test('T-042 口径订正 · ci.yml 已升级为完整版，六骨架 job 未被削弱且不得假绿', () => {
  const t = read('.github/workflows/ci.yml');
  const sixJobs = ['spec-consistency', 'unit', 'acceptance', 'lint-typecheck', 'privacy-scan', 'matrix'];
  for (const job of sixJobs) {
    assert.equal((t.match(new RegExp(`^  ${job}:\\s*$`, 'gm')) ?? []).length, 1,
      `${job} 应恰好作为一个顶层键出现`);
  }
  // 只看**实际执行命令**：头部注释会如实登记 T-044 / T-045 待办，
  // 注释里出现门禁名称不等于接线；把注释误判为接线反而会掩盖真正的假绿。
  const executable = t.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
  for (const cmd of [
    'node scripts/lint.mjs', 'node scripts/license-scan.mjs',
    'node scripts/privacy-scan.mjs', 'node scripts/i18n-keys.mjs',
    'node scripts/coverage.mjs',
  ]) {
    assert.ok(executable.includes(cmd), `${cmd} 未真正接入 CI 执行`);
  }
  for (const forbidden of ['--allow-green', 'continue-on-error', 'node scripts/encoding-check.mjs']) {
    assert.equal(executable.includes(forbidden), false, `${forbidden} 会弱化门禁或提前接线`);
  }
  assert.ok(existsSync(join(ROOT, 'scripts/license-scan.mjs')), 'T-042 扫描脚本实体缺失');
  assert.match(t, /T-045/, 'ci.yml 头部须如实登记后续门禁待办');
});

test('T-040 · P-01 遗留订正：competitive-research 不再把已定案项写成待确认', () => {
  const t = read('docs/competitive-research.md');
  assert.ok(!/\[NEEDS CLARIFICATION\]/.test(t), 'M0 滞后文字未订正');
  assert.ok(!/⚠️ \*\*待用户确认\*\*/.test(t), '仍残留待确认标记');
  assert.match(t, /ECMAScript/);
  assert.match(t, /GPL-3\.0-only/);
  assert.match(t, /MCP|stdio/);
  assert.match(t, /已定案|已关闭|已确认/);
});

test('T-040 · LICENSE 为 GPL-3.0 全文且随 clone 分发（FR-037 / SC-014）', () => {
  const t = read('LICENSE');
  assert.match(t, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(t, /Version 3, 29 June 2007/);
  assert.match(t, /TERMS AND CONDITIONS/);
  assert.ok(t.length > 30000);
});

test('T-040 · 所有新文件不含真实身体数据令牌，也不含真实档案路径（FR-053 / P-14）', () => {
  const tokens = tokenRule();
  for (const f of NEW_FILES) {
    const t = safeRead(f);
    assert.equal(tokens.test(t), false, `${f} 命中真实数据令牌`);
    assert.equal(t.includes('diet-plan'), false, `${f} 含真实档案路径`);
  }
  assert.equal(tokens.test(allNewText()), false);
});

test('T-040 · AC 仍 19/19 RED、tasks.md 零勾选、T-040 行未勾选', () => {
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  assert.ok(tasks.split('\n').find((l) => l.includes('**T-040**')).startsWith('- [ ]'));
});
