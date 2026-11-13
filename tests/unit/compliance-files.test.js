// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-041 · 合规文档可执行断言（先红后绿，P-02） · 审计追踪 ID: RR-T041-20261113-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 PRIVACY.md / THIRD_PARTY_NOTICES.md 落盘，初态必须为 RED。
 *
 * 口径（tasks.md T-041 / SPEC.md FR-037 / FR-047～051 / AC-13 / AC-17 / AC-18 / SC-010 / SC-013）：
 * - 本文档只做**文本级结构断言 + 与实现常量的动态逐项比对**，零第三方依赖；
 *   完整许可静态扫描 / 网络出口扫描归 T-042，CI 接线归 T-042，AC 转绿归 T-046。
 * - `THIRD_PARTY_NOTICES.md` 必须如实声明 T-035 定案：**零真实第三方数据本体**，
 *   四个外部 / 用户源 `bundled=false` + `ai-candidate-unreviewed` 且加载器一律拒绝；
 *   AC-18 点名的 HowToCook(Unlicense) / USDA FDC(CC0) / 用户自建只作**元数据候选声明**，
 *   不得假称已内置或已完成许可审计。
 * - 数据存放位置的唯一权威是 `src/cli/inventory.js`；许可清单的唯一权威是
 *   `data/source/catalog.json`。断言动态读取二者，避免文档与实现漂移。
 * - `SECURITY.md` 在 T-040 / T-041 重复点名：T-041 只**追加**法律合规章节，
 *   T-040 的 §1～§5 一字不改（ISSUE-20261113-T040-OVERLAP，待人工裁决）。
 * - 真实数据令牌正则动态取自 ci.yml 唯一权威规则，绝不复制字面量（FR-053 / P-14）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { DATA_ROOT_FILES, DATA_DIRS } from '../../src/cli/inventory.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const safeRead = (rel) => (existsSync(join(ROOT, rel)) ? read(rel) : '');
const sizeOf = (rel) => (existsSync(join(ROOT, rel)) ? statSync(join(ROOT, rel)).size : 0);

/** T-041 应产出 / 补充的三份合规文档。 */
export const T041_DOCS = Object.freeze([
  'PRIVACY.md',
  'THIRD_PARTY_NOTICES.md',
  'SECURITY.md',
]);

/** 取某个二级标题下的整节文本（到下一个二级标题为止），降低对编号的耦合。 */
function sectionByTitle(text, keyword) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && l.includes(keyword));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

const privacy = () => safeRead('PRIVACY.md');
const notices = () => safeRead('THIRD_PARTY_NOTICES.md');
const security = () => safeRead('SECURITY.md');
const catalog = () => JSON.parse(read('data/source/catalog.json'));
const tokenRule = () => {
  const ci = read('.github/workflows/ci.yml');
  const m = /const TOKENS = \/(.+?)\/;/.exec(ci);
  assert.ok(m, 'ci.yml 的唯一权威令牌规则缺失');
  return new RegExp(m[1]);
};

// ---------------------------------------------------------------- 存在与元信息

test('T-041 · 三份合规文档均存在且非空（§10 必需 / AC-13 / AC-18）', () => {
  for (const f of T041_DOCS) {
    assert.ok(existsSync(join(ROOT, f)), `${f} 缺失`);
    assert.ok(sizeOf(f) > 200, `${f} 内容过短，疑似占位`);
  }
});

test('T-041 · 每份文档都有 [AIGC]、待人工审查、GPL-3.0-only 与非医疗免责（P-10 / P-08 / FR-033）', () => {
  for (const f of T041_DOCS) {
    const t = f === 'PRIVACY.md' ? privacy() : f === 'THIRD_PARTY_NOTICES.md' ? notices() : security();
    assert.match(t, /\[AIGC\]/, `${f} 缺 [AIGC] 标注`);
    assert.match(t, /人工审查|人工确认|待人工/, `${f} 缺待人工审查标注`);
    assert.match(t, /GPL-3\.0/, `${f} 缺许可声明`);
    assert.match(t, /非医疗|不构成医疗/, `${f} 缺非医疗免责声明`);
  }
});

// ---------------------------------------------------------------- PRIVACY.md

test('T-041 · PRIVACY 声明纯本地四零：零上传 / 零遥测 / 零账号 / 零云同步（FR-047）', () => {
  const t = privacy();
  for (const key of ['本地', '零上传', '零遥测', '零账号', '零云同步']) {
    assert.ok(t.includes(key), `PRIVACY 缺 ${key}`);
  }
});

test('T-041 · PRIVACY 逐项列出适用法律（FR-050 / P-15）', () => {
  const t = privacy();
  for (const key of ['个人信息保护法', '数据安全法', '网络安全法', 'GDPR', '州级隐私法']) {
    assert.ok(t.includes(key), `PRIVACY 缺适用法律 ${key}`);
  }
});

test('T-041 · PRIVACY 声明四项设计基线与未成年人提示（FR-050）', () => {
  const t = privacy();
  for (const key of ['数据最小化', '目的限定', '本地处理', '不采集敏感个人信息', '未成年人']) {
    assert.ok(t.includes(key), `PRIVACY 缺 ${key}`);
  }
});

test('T-041 · PRIVACY 声明数据主体权利三项与删除后无残留（FR-049 / AC-17）', () => {
  const t = privacy();
  for (const key of ['导出', '删除', '查看', '导出全部', '无残留']) {
    assert.ok(t.includes(key), `PRIVACY 缺数据主体权利 ${key}`);
  }
  assert.match(t, /缓存|日志/, '删除范围须明确含缓存与日志');
});

test('T-041 · PRIVACY 存放位置章节与 inventory.js 的 7 个根文件逐项一致（FR-049）', () => {
  const section = sectionByTitle(privacy(), '存放位置');
  assert.ok(section.length > 0, '缺「存放位置」章节');
  assert.equal(DATA_ROOT_FILES.length, 7, '实现层根文件数应为 7');
  for (const f of DATA_ROOT_FILES) {
    assert.ok(section.includes(f), `存放位置章节缺根文件 ${f}`);
  }
});

test('T-041 · PRIVACY 存放位置章节与 inventory.js 的 5 个目录逐项一致（FR-049）', () => {
  const section = sectionByTitle(privacy(), '存放位置');
  assert.equal(DATA_DIRS.length, 5, '实现层目录数应为 5');
  for (const d of DATA_DIRS) {
    assert.ok(section.includes(d), `存放位置章节缺目录 ${d}`);
  }
});

test('T-041 · PRIVACY 指明清单唯一权威并声明程序数据不进清单（FR-049 / 防漂移）', () => {
  const section = sectionByTitle(privacy(), '存放位置');
  assert.match(section, /inventory\.js/, '未指向实现层唯一权威');
  assert.match(section, /程序数据|永不|不进/, '未说明程序数据边界');
  assert.match(section, /data\/guideline/, '未点明程序数据示例目录');
});

test('T-041 · PRIVACY 声明逐次显式同意、节气下载无个人参数、LLM 默认关闭与 MCP 不回传（FR-048 / FR-051 / FR-030）', () => {
  const t = privacy();
  for (const key of ['逐次', '同意', '节气', '默认关闭', '离线降级', 'MCP']) {
    assert.ok(t.includes(key), `PRIVACY 缺 ${key}`);
  }
  assert.match(t, /不含任何个人参数|不携带任何个人参数|不带个人参数/);
});

test('T-041 · PRIVACY 声明日志 / 示例 / CI fixtures / 发布物均不含真实身体数据（FR-047 / FR-053）', () => {
  const t = privacy();
  for (const key of ['日志', '示例', 'CI fixtures', '发布物']) {
    assert.ok(t.includes(key), `PRIVACY 缺 ${key}`);
  }
});

test('T-041 · PRIVACY 不含身体字段名、真实数据令牌、真实档案路径与真实个人身份（FR-053 / P-14）', () => {
  const t = privacy();
  assert.ok(!/body_fat|weight_kg|height_cm|birth_date|blood_pressure/.test(t), '含身体字段名');
  assert.equal(tokenRule().test(t), false, '命中真实数据令牌');
  assert.equal(t.includes('diet-plan'), false, '含真实档案路径字面量');
  assert.ok(!/@[A-Za-z0-9._-]+@|privaterelay\.appleid\.com|JohnSmithfan/.test(t), '含真实个人身份');
});

// ---------------------------------------------------------------- THIRD_PARTY_NOTICES.md

test('T-041 · NOTICES 声明 LICENSE 为 GPL-3.0 全文且随 clone 分发（FR-037 / SC-014）', () => {
  const t = notices();
  assert.match(t, /LICENSE/);
  assert.match(t, /GPL-3\.0/);
  assert.match(t, /全文/);
  assert.match(t, /clone|随仓库|随源码/);
});

test('T-041 · NOTICES 数据源清单覆盖 catalog.json 全部 5 条 id（FR-037 / AC-13）', () => {
  const section = sectionByTitle(notices(), '数据源');
  assert.ok(section.length > 0, '缺「数据源」章节');
  const sources = catalog().sources;
  assert.equal(sources.length, 5);
  for (const s of sources) {
    assert.ok(section.includes(s.id), `数据源清单缺 ${s.id}`);
  }
});

test('T-041 · NOTICES 对每条 descriptor 逐项列明许可 / 版本 / 来源 URL / 内置状态（FR-031 / FR-037）', () => {
  const section = sectionByTitle(notices(), '数据源');
  for (const s of catalog().sources) {
    assert.ok(section.includes(s.license), `${s.id} 缺许可 ${s.license}`);
    assert.ok(section.includes(s.version), `${s.id} 缺版本 ${s.version}`);
    assert.ok(section.includes(s.source_url), `${s.id} 缺来源 URL`);
    assert.ok(section.includes(s.review_status), `${s.id} 缺审校状态`);
  }
});

test('T-041 · NOTICES 列明 AC-18 点名的 HowToCook(Unlicense) / USDA FDC(CC0) / 用户自建边界', () => {
  const t = notices();
  for (const key of ['HowToCook', 'Unlicense', 'USDA', 'CC0', '用户自建']) {
    assert.ok(t.includes(key), `NOTICES 缺 AC-18 点名项 ${key}`);
  }
});

test('T-041 · NOTICES 如实声明零真实第三方本体：bundled=false / 未审校 / metadata-only / 唯一可载虚构源（T-035 定案）', () => {
  const t = notices();
  for (const key of ['bundled=false', 'ai-candidate-unreviewed', 'metadata-only', '未内置', 'synthetic-demo']) {
    assert.ok(t.includes(key), `NOTICES 缺如实声明 ${key}`);
  }
  assert.match(t, /ERR_SOURCE_REVIEW|ERR_SOURCE_BUNDLED|一律拒绝|拒绝加载/);
  assert.match(t, /虚构/, '唯一可载源须标明完全虚构');
});

test('T-041 · NOTICES 不得假绿：不得声称已内置真实第三方数据或许可审计已完成（P-07 / 防假绿）', () => {
  const t = notices();
  assert.ok(!/已内置真实第三方|许可审计已完成|审计已通过|全部审校完成/.test(t));
  assert.match(t, /不代表|未完成|待人工|仍为 RED|仍 RED/, '须登记未闭合状态');
});

test('T-041 · NOTICES 声明零第三方运行时依赖与 v1 分发口径（FR-052 / AC-18）', () => {
  const t = notices();
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies, undefined, 'package.json 不得含 dependencies');
  assert.equal(pkg.devDependencies, undefined, 'package.json 不得含 devDependencies');
  assert.equal(pkg.private, true);
  assert.match(t, /零第三方|无第三方依赖/);
  assert.match(t, /源码归档/, '未写 v1 分发口径');
  assert.match(t, /包管理器清单|不得出现/);
  for (const f of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json']) {
    assert.equal(existsSync(join(ROOT, f)), false, `${f} 不应存在`);
  }
});

test('T-041 · NOTICES 声明许可冲突即拒、不复制受版权保护原文、静态扫描归 T-042（FR-032 / FR-037 / SC-010）', () => {
  const t = notices();
  for (const key of ['ERR_SOURCE_CONFLICT', '受版权保护', 'T-042']) {
    assert.ok(t.includes(key), `NOTICES 缺 ${key}`);
  }
  assert.match(t, /拒绝引入|不得引入|冲突即拒/);
});

// ---------------------------------------------------------------- SECURITY.md 补充

test('T-041 · SECURITY 保留 T-040 的 §1～§5 全部标题，只追加不削弱（ISSUE-20261113-T040-OVERLAP）', () => {
  const t = security();
  for (const key of ['支持版本', '漏洞报告渠道', '响应流程', '范围与边界', '与 T-041 的分工']) {
    assert.ok(t.includes(key), `SECURITY 丢掉了 T-040 章节 ${key}`);
  }
  assert.match(t, /不要|不得|避免/, 'T-040 的公开披露禁令不得删除');
});

test('T-041 · SECURITY 新增法律合规章节，含适用法律、数据主体权利与存放位置指引（FR-050 / P-15）', () => {
  const section = sectionByTitle(security(), '法律合规');
  assert.ok(section.length > 0, '缺新增「法律合规」章节');
  for (const key of ['个人信息保护法', '数据安全法', '网络安全法', 'GDPR', '数据主体', 'PRIVACY.md']) {
    assert.ok(section.includes(key), `法律合规章节缺 ${key}`);
  }
  assert.ok(!/body_fat|weight_kg|height_cm/.test(section), '新增章节不得含身体字段名');
  assert.equal(section.includes('diet-plan'), false, '新增章节不得含真实档案路径');
});

// ---------------------------------------------------------------- 不变量与防假绿

test('T-041 · 不越界：未产出 T-042 的扫描脚本，未改 ci.yml 骨架，未接线新门禁', () => {
  assert.equal(existsSync(join(ROOT, 'scripts/license-scan.mjs')), false, '许可扫描脚本归 T-042');
  const ci = read('.github/workflows/ci.yml');
  for (const job of ['spec-consistency', 'unit', 'acceptance', 'lint-typecheck', 'privacy-scan', 'matrix']) {
    assert.ok(ci.includes(job), `CI 骨架缺 ${job}`);
  }
  for (const cmd of ['p2-gate.mjs', 'encoding-check.mjs', 'license-scan.mjs']) {
    assert.equal(ci.includes(cmd), false, `${cmd} 属 T-042+，不得提前接线`);
  }
});

test('T-041 · 三份文档均不含真实数据令牌、档案路径字面量与真实个人邮箱（FR-053 / P-14）', () => {
  const tokens = tokenRule();
  for (const t of [privacy(), notices(), security()]) {
    assert.equal(tokens.test(t), false, '命中真实数据令牌');
    assert.equal(t.includes('diet-plan'), false, '含真实档案路径字面量');
    assert.ok(!/privaterelay\.appleid\.com|JohnSmithfan/.test(t), '含真实个人身份');
  }
});

test('T-041 · 门禁已收紧：合规文档齐备不得单独把 AC-17 判为 E2E_PASS（防假绿）', () => {
  // T-041 落地三份文档后，T-037 原判据会被 ci.yml 头部注释里的 license-scan
  // 字样 + 文档存在触发误判。本断言锁定收紧后的口径：静态扫描真正接线并有
  // 实体脚本、且 AC-17 由人工裁决转绿，才允许端到端通过。
  const gate = read('tests/acceptance/gates/p2-gate.mjs');
  const clause = /ac17_compliance_docs:[\s\S]{0,600}?ac\.statuses\['17'\] === 'GREEN'/.exec(gate);
  assert.ok(clause, 'AC-17 端到端判据未包含人工转绿门槛');
  assert.ok(clause[0].includes('scripts/license-scan.mjs'), '未要求 T-042 扫描脚本实体');
  assert.ok(clause[0].includes('ciExecWired'), '未排除 ci.yml 头部注释的假接线');
  assert.ok(clause[0].includes("exists('SECURITY.md')"), '未校验 SECURITY.md');
  assert.equal(existsSync(join(ROOT, 'scripts/license-scan.mjs')), false, 'T-042 脚本不得提前产出');
});

test('T-041 · AC 仍 19/19 RED、tasks.md 零勾选、T-041 行未勾选（P-02 / AC-14）', () => {
  const files = readdirSync(join(ROOT, 'tests/acceptance')).filter((f) => /^ac-\d{2}\.md$/.test(f));
  assert.equal(files.length, 19);
  assert.ok(files.every((f) => /^\| 状态 \| \*\*RED\*\*/m.test(read(`tests/acceptance/${f}`))));
  const tasks = read('tasks.md');
  assert.equal((tasks.match(/^- \[ \]/gm) ?? []).length, 39);
  assert.equal((tasks.match(/^- \[x\]/gm) ?? []).length, 0);
  assert.ok(tasks.split('\n').find((l) => l.includes('**T-041**')).startsWith('- [ ]'));
});
