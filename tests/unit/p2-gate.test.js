// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-037 · Phase 2 出口门禁取证（先红后绿，P-02） · 审计追踪 ID: RR-T037-20261112-0001 · 待人工审查（P-10）
/**
 * 红态阶段：本文件先于 tests/acceptance/gates/p2-gate.mjs 落盘，初态必须为 RED。
 *
 * 口径：T-037 要求 AC-14～17 转绿，但 P0 基线（ac-*.md / tasks.md / ci.yml）不可改，
 * P1 出口仍 BLOCKED，T-041 / T-042 / T-045 未落地。因此本任务只交付**取证器**：
 * 逐条跑可执行断言、如实给 BLOCKED，绝不把 ac-*.md 改成 GREEN、绝不勾 tasks.md。
 *
 * 与 T-022 的差异：门禁的判定逻辑抽成纯函数 evaluateP2Gate(evidence)，
 * 以便对每项 check 做**负向注入**，证明它不是恒真总开关，也不是写死的恒假结论。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  P2_AC_IDS,
  P2_AC_STATUS,
  P2_GATE_CHECK_IDS,
  collectP2Evidence,
  evaluateP2Gate,
  runP2Gate,
  formatGateReport,
} from '../acceptance/gates/p2-gate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const GATE_PATH = join(ROOT, 'tests/acceptance/gates/p2-gate.mjs');
const SOURCE = readFileSync(GATE_PATH, 'utf8');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// 顶层只取证一次：门禁真实跑一遍离线集成与七个能力模块，不在每条用例里重复装配。
// runP2Gate(provided) 允许复用现场证据，避免重复取证，同时验证两个入口的一致性。
const evidence = await collectP2Evidence();
const report = await runP2Gate(evidence);
const lines = formatGateReport(report).split('\n');
const checkOf = (r, id) => r.checks.find((c) => c.id === id);
const broken = (mutate) => {
  const copy = structuredClone(runEvidence());
  mutate(copy);
  return evaluateP2Gate(copy);
};
/** evaluateP2Gate 的入参必须是纯数据；用报告携带的证据做基线，避免重复取证。 */
function runEvidence() {
  return structuredClone(report.evidence);
}

test('T-037 · P2 门禁覆盖恰好 AC-14～17，ID 连续且唯一', () => {
  assert.deepEqual([...P2_AC_IDS], ['14', '15', '16', '17']);
  assert.deepEqual(report.rows.map((r) => r.id), [...P2_AC_IDS]);
  assert.equal(new Set(report.rows.map((r) => r.id)).size, 4);
});

test('T-037 · 十项门禁 ID 固定、唯一，且逐项有取证结论与明细', () => {
  assert.deepEqual([...P2_GATE_CHECK_IDS], [
    'gate.scenarios_faithful',
    'gate.mcp_redaction',
    'gate.language_key_sets',
    'gate.region_provenance',
    'gate.offline_degradation',
    'gate.source_compliance',
    'gate.i18n_snapshots',
    'gate.acceptance_assertions',
    'gate.no_silent_green',
    'gate.traceability',
  ]);
  assert.equal(report.checks.length, P2_GATE_CHECK_IDS.length);
  assert.equal(new Set(report.checks.map((c) => c.id)).size, report.checks.length);
  assert.deepEqual(report.checks.map((c) => c.id), [...P2_GATE_CHECK_IDS]);
  for (const c of report.checks) {
    assert.equal(typeof c.ok, 'boolean');
    assert.ok(c.detail.length > 10, `${c.id} 无取证明细`);
  }
});

test('T-037 · 每条 AC 的状态、证据、缺口、来源四项齐备', () => {
  for (const row of report.rows) {
    assert.ok(Object.values(P2_AC_STATUS).includes(row.status), `${row.id} 状态非法`);
    assert.ok(Array.isArray(row.evidence) && row.evidence.length >= 2, `${row.id} 证据不足`);
    assert.ok(row.evidence.every((e) => typeof e === 'string' && e.length > 0));
    assert.ok(Array.isArray(row.gaps), `${row.id} 缺 gaps 数组`);
    assert.ok(Array.isArray(row.sources) && row.sources.length > 0, `${row.id} 来源不可追溯`);
    assert.ok(row.sources.every((s) => typeof s === 'string' && s.length > 0));
  }
});

test('T-037 · 场景文本逐字取自 SPEC.md §8，不得删改 / 跳过 / 弱化（P-09 / RK-03）', () => {
  const spec = read('SPEC.md');
  for (const row of report.rows) {
    assert.ok(typeof row.scenario === 'string' && row.scenario.length > 40, `${row.id} 场景缺失`);
    assert.ok(spec.includes(row.scenario.trim()), `${row.id} 场景与 SPEC §8 不逐字一致`);
    assert.ok(!/SKIP|skip\s*=\s*true/i.test(row.scenario), `${row.id} 出现跳过标记`);
  }
  assert.equal(report.scenarioCount, 4);
  assert.equal(Object.keys(evidence.scenarios).length, 4);
});

test('T-037 · 防假绿：verdict 恒等于「四条全 E2E_PASS 且十项门禁全过」', () => {
  const allGreen = report.rows.every((r) => r.status === P2_AC_STATUS.E2E);
  const checksOk = report.checks.every((c) => c.ok);
  assert.equal(report.verdict, allGreen && checksOk ? 'PASS' : 'BLOCKED');
  assert.equal(report.ok, allGreen && checksOk);
  assert.equal(report.verdict, 'BLOCKED');
  assert.equal(report.checks.filter((c) => !c.ok).length, 0, '取证本身不得失败（exit 1）');
});

test('T-037 · 四条 AC 均不得被声明为端到端通过，且每条给出具体缺口', () => {
  for (const row of report.rows) {
    assert.notEqual(row.status, P2_AC_STATUS.E2E, `AC-${row.id} 当前不具备端到端证据`);
    assert.ok(row.gaps.length > 0, `AC-${row.id} 未给出缺口`);
    assert.ok(row.gaps.every((g) => typeof g === 'string' && g.length > 8));
  }
  assert.equal(report.rows.filter((r) => r.status === P2_AC_STATUS.E2E).length, 0);
});

test('T-041 订正 · 合规文档齐备不得让 AC-17 假绿为 E2E_PASS（门禁缺口独立取证）', () => {
  // T-041 落地 PRIVACY.md / SECURITY.md / THIRD_PARTY_NOTICES.md 后，
  // T-037 原判据「文档存在 + ci.yml 注释含 license-scan」会把 AC-17 误判为 E2E_PASS。
  // 合规声明文本不是 AC-17 场景要求的端到端证据，故判据已收紧为：
  // 文档 + T-042 静态扫描真正接线并存在实体脚本 + AC-17 由人工裁决转绿。
  for (const f of ['PRIVACY.md', 'SECURITY.md', 'THIRD_PARTY_NOTICES.md']) {
    assert.ok(existsSync(join(ROOT, f)), `${f} 应已由 T-041 产出`);
  }
  assert.equal(evidence.e2e.ac17_compliance_docs, false, '文档齐备本身不构成端到端证据');
  const row = report.rows.find((r) => r.id === '17');
  assert.notEqual(row.status, P2_AC_STATUS.E2E);
  assert.ok(row.gaps.some((g) => g.includes('T-042')), '须如实登记 T-042 静态扫描缺口');
  // 判定仍非恒假：仅放开 AC-17 一项端到端条件时应出现 E2E，但出口仍 BLOCKED。
  const partial = broken((e) => { e.e2e.ac17_compliance_docs = true; });
  assert.equal(partial.rows.find((r) => r.id === '17').status, P2_AC_STATUS.E2E);
  assert.equal(partial.verdict, 'BLOCKED');
});

test('T-037 · AC-16 联网刷新交节时刻未接线，必须记为 GAP 而非 CORE_ONLY', () => {
  assert.equal(evidence.offline.calendarStatus, 'verified', '本地缓存校验通过不等于联网下载');
  assert.equal(evidence.offline.calendarNetworkWired, false, 'CLI 未接 refreshCalendarData 联网刷新');
  const row = report.rows.find((r) => r.id === '16');
  assert.equal(row.status, P2_AC_STATUS.GAP);
  assert.ok(row.evidence.some((e) => e.includes('calendar.network_wired=false')));
  assert.ok(lines.some((l) => /^gap=[1-9]/.test(l)));
});

test('T-037 · runP2Gate 复用现场证据，不替换成声明式数据', () => {
  assert.equal(report.evidence, evidence);
  assert.equal(report.scannedFiles, evidence.files.scanned);
  assert.equal(formatGateReport(report).includes(`scanned_files=${evidence.files.scanned}`), true);
});

test('T-037 · 报告为纯 ASCII key=value、status= 收尾、baseline_touched=0', () => {
  assert.ok(lines.every((l) => /^[\x20-\x7E]*$/.test(l)), '报告含非 ASCII');
  assert.ok(lines.slice(0, -1).every((l) => /^[a-z][a-z0-9._-]*=/.test(l)), '行格式不是 key=value');
  assert.match(lines.at(-1), /^status=(ok|blocked|error)$/);
  assert.equal(lines.at(-1), 'status=blocked');
  assert.ok(lines.includes('verdict=BLOCKED'));
  assert.ok(lines.includes('baseline_touched=0'));
  assert.ok(lines.includes('scenario=p2_gate') && lines.includes('ac=4'));
  for (const id of P2_AC_IDS) assert.ok(lines.some((l) => l.startsWith(`ac.${id}=`)));
  for (const id of P2_GATE_CHECK_IDS) assert.ok(lines.some((l) => l === `check.${id}=ok`));
});

test('T-037 · 门禁模块零磁盘写入、零第三方依赖、零真实身体数据字面量', () => {
  assert.ok(!/\b(writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|createWriteStream)\b/.test(SOURCE));
  assert.ok(!/from ['"](?!node:|\.\.?\/)[a-z@]/i.test(SOURCE), '出现第三方包导入');
  const ci = read('.github/workflows/ci.yml');
  const matched = /const TOKENS = \/(.+?)\/;/.exec(ci);
  assert.ok(matched, 'ci.yml 的唯一权威令牌规则缺失');
  assert.ok(!new RegExp(matched[1]).test(SOURCE), '门禁源码复制了真实数据令牌字面量');
  assert.ok(!new RegExp(matched[1]).test(read('tests/unit/p2-gate.test.js')), '单测复制了真实数据令牌字面量');
});

test('T-037 · MCP 工具脱敏：四个工具、描述安全、隐私护栏拒绝、端口失败关闭（AC-14 / FR-048）', () => {
  const m = evidence.mcp;
  assert.deepEqual(m.toolNames, [
    'rr_generate_plan', 'rr_validate_plan', 'rr_query_ledger', 'rr_list_locales',
  ]);
  assert.equal(m.protocolVersion, '2024-11-05');
  assert.equal(m.descriptionsSafe, true);
  assert.ok(m.privacyRejects >= 4, '隐私拒绝样本不足');
  assert.equal(m.portFailures, 4, '四个工具缺端口必须全部失败关闭');
  assert.equal(m.payloadEchoes, 0, '失败响应不得回显注入值');
  assert.equal(checkOf(report, 'gate.mcp_redaction').ok, true);
});

test('T-037 · 七语言键集：71 键 × 7 包、键集一致、四态回退链齐备（AC-15 / SC-011）', () => {
  const i = evidence.i18n;
  assert.equal(i.tags.length, 7);
  assert.deepEqual(i.tags, ['zh-Hans', 'en', 'fr', 'de', 'es', 'ru', 'la']);
  assert.equal(i.keyCount, 71);
  assert.equal(i.verifiedTags, 7);
  assert.equal(i.verifyIssues, 0);
  assert.deepEqual([...i.fallbackStates].sort(), ['base-tag', 'default', 'direct', 'fallback']);
  assert.equal(checkOf(report, 'gate.language_key_sets').ok, true);
});

test('T-037 · 区域来源标注：四类来源、无静默推断、覆盖优先、地区级清单（AC-16 / SC-012）', () => {
  const r = evidence.region;
  assert.deepEqual([...r.sources].sort(), [
    'auto:fallback', 'auto:nationality', 'auto:residence', 'user',
  ]);
  assert.equal(r.inferredSource, false);
  assert.equal(r.noInferredEnum, true);
  assert.equal(r.overridesWin, true);
  assert.deepEqual([...r.subnationalCodes].sort(), ['HK', 'MO', 'TW']);
  assert.equal(r.mappingsReviewStatus, 'ai-candidate-unreviewed');
  assert.equal(checkOf(report, 'gate.region_provenance').ok, true);
});

test('T-037 · 断网降级：T-021 十四项检查全过、零对外请求、零写盘、五级计划（AC-17 / SC-013）', () => {
  const o = evidence.offline;
  assert.equal(o.ok, true);
  assert.equal(o.checks, 14);
  assert.equal(o.failed, 0);
  assert.equal(o.requests, 0);
  assert.equal(o.diskWrites, 0);
  assert.equal(o.levels, 5);
  assert.equal(checkOf(report, 'gate.offline_degradation').ok, true);
});

test('T-037 · LLM 增强门：默认关闭、无同意即拒、离线/异常降级、运行期零在线调用', () => {
  const e = evidence.enhance;
  assert.equal(e.defaultDisabled, true);
  assert.equal(e.defaultCalls, 0);
  assert.equal(e.consentRequired, true);
  assert.ok(e.degradeCases >= 3, '降级取证样本不足');
  assert.equal(e.byteIdenticalDegrades, e.degradeCases, '每次降级必须逐字节等于模板原文');
  assert.equal(e.onlineCalls, 0);
});

test('T-037 · 数据源合规：四条外部源全未核验、零内置本体、许可漂移拒绝、唯一可加载（AC-13 / AC-18）', () => {
  const s = evidence.source;
  assert.equal(s.externalCount, 4);
  assert.equal(s.allUnverified, true);
  assert.equal(s.allUnbundled, true);
  assert.equal(s.allPayloadNull, true);
  assert.equal(s.conflictRejected, true);
  assert.equal(s.loadableCount, 1);
  assert.equal(s.loadableId, 'synthetic-demo');
  assert.equal(checkOf(report, 'gate.source_compliance').ok, true);
});

test('T-037 · 多语言快照：八份哈希逐字节可复算、rr-data 恒定、GB18030 全覆盖、拉丁并列（AC-15）', () => {
  const i = evidence.snapshots;
  assert.equal(i.entries, 8);
  assert.equal(i.hashesMatch, true);
  assert.equal(i.bytesMatch, true);
  assert.equal(i.rrDataUniform, true);
  assert.equal(i.gb18030Uncovered, 0);
  assert.equal(i.glossaryPaired, 71);
  assert.equal(i.productE2e, 'unwired', '快照是合成夹具，不得冒充端到端产物');
  assert.equal(checkOf(report, 'gate.i18n_snapshots').ok, true);
});

test('T-037 · AC-14～17 各有可执行断言，且断言来自真实运行计数而非硬编码', () => {
  const a = evidence.assertions;
  assert.deepEqual(Object.keys(a).sort(), ['14', '15', '16', '17']);
  for (const [id, n] of Object.entries(a)) {
    assert.ok(Number.isInteger(n) && n >= 2, `AC-${id} 可执行断言不足`);
  }
  assert.ok(Object.values(a).reduce((x, y) => x + y, 0) >= 12);
  assert.equal(checkOf(report, 'gate.acceptance_assertions').ok, true);
});

test('T-037 · 静态扫描不是空扫：源码文件数与独立清点一致、令牌命中为零', () => {
  assert.ok(evidence.files.scanned > 20, '扫描文件数过少，疑似空扫');
  assert.equal(evidence.files.scanned, evidence.files.independentlyCounted);
  assert.equal(evidence.files.tokenHits, 0);
  assert.deepEqual([...evidence.files.fsImports].sort(), [
    'existsSync', 'readFileSync', 'readdirSync',
  ]);
  assert.equal(checkOf(report, 'gate.traceability').ok, true);
});

test('T-037 · 未静默转绿：AC-14～17 仍 RED、tasks.md 零勾选、门禁零写盘能力可证', () => {
  assert.deepEqual(Object.values(evidence.ac.statuses), ['RED', 'RED', 'RED', 'RED']);
  assert.equal(evidence.ac.unchecked, 39);
  assert.equal(evidence.ac.checked, 0);
  assert.equal(report.baselineTouched, 0);
  assert.equal(checkOf(report, 'gate.no_silent_green').ok, true);
});

test('T-037 · 负向注入 · 十项门禁每项都绑定独立取证变量，破坏后必定转 fail', () => {
  const cases = [
    ['gate.scenarios_faithful', (e) => { e.scenarios['AC-16'] = 'SKIP'; }],
    ['gate.mcp_redaction', (e) => { e.mcp.portFailures = 3; }],
    ['gate.language_key_sets', (e) => { e.i18n.keyCount = 70; }],
    ['gate.region_provenance', (e) => { e.region.sources = ['user']; }],
    ['gate.offline_degradation', (e) => { e.offline.requests = 1; }],
    ['gate.source_compliance', (e) => { e.source.allUnbundled = false; }],
    ['gate.i18n_snapshots', (e) => { e.snapshots.hashesMatch = false; }],
    ['gate.acceptance_assertions', (e) => { e.assertions['17'] = 0; }],
    ['gate.no_silent_green', (e) => { e.ac.statuses['14'] = 'GREEN'; }],
    ['gate.traceability', (e) => { e.files.independentlyCounted = e.files.scanned - 1; }],
  ];
  assert.equal(cases.length, P2_GATE_CHECK_IDS.length);
  for (const [id, mutate] of cases) {
    const r = broken(mutate);
    assert.equal(checkOf(r, id).ok, false, `${id} 被弱化后仍恒真`);
    assert.equal(r.checks.filter((c) => !c.ok).length >= 1, true);
    assert.equal(r.verdict, 'BLOCKED');
  }
});

test('T-037 · 负向注入 · 判定不是写死的恒假：四项端到端条件齐备时 verdict 转 PASS', () => {
  const r = broken((e) => {
    for (const key of Object.keys(e.e2e)) e.e2e[key] = true;
  });
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.ok, true);
  assert.equal(r.rows.every((row) => row.status === P2_AC_STATUS.E2E), true);
  assert.equal(formatGateReport(r).split('\n').at(-1), 'status=ok');
});

test('T-037 · 负向注入 · 只满足部分端到端条件仍如实 BLOCKED', () => {
  const r = broken((e) => { e.e2e.ac15_cli_wired = true; });
  assert.equal(r.verdict, 'BLOCKED');
  assert.equal(r.ok, false);
  assert.ok(r.rows.some((row) => row.status === P2_AC_STATUS.E2E));
  assert.ok(r.rows.some((row) => row.status !== P2_AC_STATUS.E2E));
});

test('T-037 · collectP2Evidence 是独立可复跑的纯数据取证入口', () => {
  assert.equal(typeof collectP2Evidence, 'function');
  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(evidence.scenarios['AC-17'], report.rows.find((r) => r.id === '17').scenario);
});

test('T-037 · 取证证据是纯数据且可序列化，evaluateP2Gate 不修改入参', () => {
  const clone = structuredClone(report.evidence);
  assert.doesNotThrow(() => structuredClone(evidence));
  const before = JSON.stringify(clone);
  evaluateP2Gate(clone);
  assert.equal(JSON.stringify(clone), before);
  assert.equal(JSON.stringify(evaluateP2Gate(clone)), JSON.stringify(evaluateP2Gate(clone)), '判定须确定');
});

test('T-037 · 结构性矛盾如实登记为待人工裁决，不擅自转绿基线', () => {
  assert.ok(Array.isArray(report.blockers) && report.blockers.length >= 4);
  const text = report.blockers.join(' | ');
  for (const key of ['T-041', 'T-042', 'T-045', 'T-014', 'T-022']) {
    assert.ok(text.includes(key), `未登记 ${key} 相关缺口`);
  }
  assert.equal(report.baselineTouched, 0);
  for (const id of P2_AC_IDS) {
    assert.match(read(`tests/acceptance/ac-${id}.md`), /^\| 状态 \| \*\*RED\*\*/m);
  }
});
