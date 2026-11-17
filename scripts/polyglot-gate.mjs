// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-044 · 第二实现语言准入登记器（A-10 / E-18 / NFR-015 / P-16 / ADR-003 §4.4） · 审计追踪 ID: RR-T044-20261117-0001 · 待人工审查（P-10） · 许可：GPL-3.0-only
/**
 * `node scripts/polyglot-gate.mjs` 可独立复跑，输出纯 ASCII `key=value`，`status=` 收尾。
 *
 * 定位：**登记器，不是准入裁决器**（与 p1-gate / p2-gate / T-043 language-source 同口径）。
 * 本脚本登记 ADR-003 §4.4 的 G-01～G-06 六项准入门禁检查结果；v1 **恒为拒绝**
 * （默认关闭），不引入任何第二实现语言工具链。它**不启用**第二语言、不修改任何
 * FR / AC / SC / P，也不接入 CI 必跑门禁（只在 ci.yml 头部登记）。
 *
 * G-06 默认关闭的启用前提是「用户书面确认 + 新增 ADR + 重做 plan.md」且不改
 * 任何 FR / AC / SC 业务语义；v1 三者皆无，故六项全拒、`polyglot_enabled=false`、
 * `verdict=REJECTED`。即使注入单项 / 部分通过证据（`approve_G-0X` /
 * `writtenConsent` / `newAdr` / `planRebuilt`），整体仍恒拒绝（非恒假）。
 * 但若现场出现第二语言实现源码或工具链，则登记为 `anomaly=true` / `verdict=ANOMALY`
 * 并报警，避免恒真假绿。
 *
 * 判定逻辑抽成 `evaluatePolyglotGate(evidence)` 纯函数，支持逐项负向注入；
 * 单测零子进程，避免加剧 ISSUE-20261114-T042-COVERAGE-TIMEOUT 的并发耦合。
 * 零第三方依赖、只读取证、零写盘、零网络。
 */
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { walk, safeRead } from './scan-common.mjs';

/** ADR-003 §4.4 六项准入门禁（顺序固定，与单测 T044_GATES 一一对应）。 */
export const GATE_IDS = Object.freeze(['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06']);

/** 六项门禁的可读检查口径（登记文本，不作为通过依据）。 */
const GATE_TEXT = Object.freeze({
  'G-01': '候选语言须为现行 ISO/IEC 或 GB 标准（标准号 / 版本 / 核实日期），在研或已撤销不合格',
  'G-02': '须提交可度量基准证明主实现语言无法满足 NFR-003 或某项 MUST 能力',
  'G-03': '只能经 stdio / JSON 端口接入，不得进入核心域，不得改 Canonical ID 与 FR-044',
  'G-04': '全部语言源码 / 构建 / 测试脚本随 Release 提供，满足 GPL-3.0 Corresponding Source',
  'G-05': 'CI 矩阵扩展为新工具链 × 3 OS，跑同一组 AC-01～19 且结果一致',
  'G-06': '默认关闭：须用户书面确认 + 新增 ADR + 重做 plan.md，且不改任何 FR / AC / SC',
});

/**
 * 规范化「干净证据」：v1 默认单语言、无候选语言、无书面确认 / 新 ADR / plan 重做。
 * 真实现场由 collectPolyglotEvidence() 采集；本 fixture 供单测正向 / 负向注入。
 */
export const CLEAN_FIXTURE = Object.freeze({
  candidateLanguage: null,
  writtenConsent: false,
  newAdr: false,
  planRebuilt: false,
  benchmarkReport: false,
  matrixExtended: false,
  stdioJsonOnly: true,
  coreDomainUntouched: true,
  correspondingSource: true,
  secondLanguageFiles: Object.freeze([]),
  secondLanguageToolchains: Object.freeze([]),
});

/** 第二实现语言源码扩展名（v1 不得作为实现主体）。 */
const SECOND_LANGUAGE_SRC = /\.(?:ts|tsx|py|go|rs|java|kt|c|cc|cpp|h|rb|php|cs|swift|scala)$/;
/** 第二实现语言工具链文件。 */
const SECOND_LANGUAGE_TOOLCHAIN = /^(?:tsconfig\.json|jsconfig\.json|pyproject\.toml|setup\.py|requirements\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle|Makefile|CMakeLists\.txt|Gemfile|composer\.json)$/;

/**
 * 判定纯函数：注入证据 → 六项登记 + 恒拒绝结论 + 异常探测。
 * v1 恒拒绝不被单项 / 部分证据绕过；出现第二语言源码或工具链则报 anomaly。
 * @param {object} evidence
 */
export function evaluatePolyglotGate(evidence) {
  const ev = { ...CLEAN_FIXTURE, ...evidence };
  const approve = (id) => ev[`approve_${id}`] === true;

  // 单项证据：仅在「用户书面确认 + 新 ADR + plan 重做」三项全真时才可能被标记，
  // 但 v1 的 G-06 默认关闭语义是硬约束——即便三项皆真，整体仍恒拒绝（启用需人工裁决）。
  const gates = GATE_IDS.map((id) => {
    const reason = GATE_TEXT[id];
    // 登记项恒为 not approved；approve_* 只影响登记说明，不放行门禁。
    const claimed = approve(id);
    return Object.freeze({
      id,
      approved: false,
      claimed: Boolean(claimed),
      reason: `${reason}；v1 默认拒绝${claimed ? '（收到启用主张，仍须人工裁决）' : ''}`,
    });
  });

  const anomalyFiles = [...ev.secondLanguageFiles];
  const anomalyTools = [...ev.secondLanguageToolchains];
  const anomaly = anomalyFiles.length > 0 || anomalyTools.length > 0;

  // 恒拒绝：v1 不因任何单项 / 部分证据而启用第二实现语言。
  const verdict = anomaly ? 'ANOMALY' : 'REJECTED';
  return Object.freeze({
    gates: Object.freeze(gates),
    verdict,
    polyglot_enabled: false,
    second_language_toolchains: anomalyTools.length,
    second_language_files: anomalyFiles.length,
    anomaly,
    written_consent: Boolean(ev.writtenConsent),
    new_adr: Boolean(ev.newAdr),
    plan_rebuilt: Boolean(ev.planRebuilt),
  });
}

/** 从真实仓库只读取证，返回与 CLEAN_FIXTURE 同构的证据对象。 */
export function collectPolyglotEvidence() {
  const files = walk();
  const secondLanguageFiles = files.filter((rel) => SECOND_LANGUAGE_SRC.test(rel)
    && !rel.startsWith('tests/') && !rel.startsWith('reports/'));
  const secondLanguageToolchains = files.filter((rel) => SECOND_LANGUAGE_TOOLCHAIN.test(rel));

  // 用户书面确认 / 新 ADR / plan 重做均无常设文件；以显式标记文件为准，默认无。
  const writtenConsent = safeRead('docs/decisions.md').includes('用户书面确认启用第二实现语言');
  const newAdr = /ADR-00[4-9]|ADR-01\d/.test(safeRead('docs/decisions.md'));
  const planRebuilt = safeRead('plan.md').includes('第二实现语言已启用');

  return {
    candidateLanguage: null,
    writtenConsent,
    newAdr,
    planRebuilt,
    benchmarkReport: false,
    matrixExtended: false,
    stdioJsonOnly: true,
    coreDomainUntouched: true,
    correspondingSource: true,
    secondLanguageFiles,
    secondLanguageToolchains,
  };
}

/** 纯 ASCII 报告；`status=` 收尾，exit 0/1。 */
function emit(result) {
  const lines = [
    'tool=polyglot-gate',
    `gates=${result.gates.length}`,
    ...result.gates.map((g) => `gate.${g.id}=${g.approved ? 'approved' : 'rejected'}`),
    `verdict=${result.verdict}`,
    `polyglot_enabled=${result.polyglot_enabled}`,
    `second_language_toolchains=${result.second_language_toolchains}`,
    `second_language_files=${result.second_language_files}`,
    `anomaly=${result.anomaly}`,
    `status=${result.anomaly ? 'error' : 'ok'}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  if (result.anomaly) {
    process.stderr.write('[ANOMALY] 检测到第二实现语言源码或工具链，v1 默认拒绝并报警\n');
  }
  process.exitCode = result.anomaly ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  emit(evaluatePolyglotGate(collectPolyglotEvidence()));
}
