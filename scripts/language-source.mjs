// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-043 · 实现语言与 Corresponding Source 静态取证器（NFR-015 / NFR-004 / FR-037 / AC-19 / SC-015 / P-16） · 审计追踪 ID: RR-T043-20261117-0001 · 待人工审查（P-10） · 许可：GPL-3.0-only
/**
 * `node scripts/language-source.mjs` 可独立复跑，输出纯 ASCII `key=value`，`status=` 收尾。
 *
 * 定位：**取证器，不是出口裁决器**（与 p1-gate / p2-gate 同口径）。本脚本只回答
 * 「仓库当前静态证据是否满足 AC-19 的源码层与声明层条件」，**绝不**声称 AC-19 已转绿。
 *
 * 结构性矛盾（如实登记，见 `docs/release-audit.md` / `reports/t043-language-source.md`）：
 * - AC-19 要求「每个 Release 产物均附 Corresponding Source 且一一对应」，但 v1 明令
 *   尚未发布、不发 Release（`package.json private=true`、无发布字段、无 release.yml）。
 *   因此**产物集合为空**，一一对应只能以「规则可证 + 空集」取证，属 vacuous truth，
 *   **不构成端到端证据**；真实发布归档归 T-052。
 * - AC-19 要求「三平台 AC 结果一致」，但 ci.yml matrix 为 3 OS × 3 Node = 9 格，
 *   本机仅 macOS 1 格可实测，GitHub Actions 未联网核实，19/19 AC 仍 RED。
 *   故 `ci_runs=unverified`，不得把配置存在当成结果一致。
 * - AC-19 转绿归 T-046 人工裁决；本任务不改 `ac-19.md`、不勾 `tasks.md`、不接 CI 必跑门禁。
 *
 * 判定逻辑抽成 `evaluateLanguageSource(evidence)` 纯函数，支持逐项负向注入，
 * 证明非恒真非恒假；单测零子进程，避免加剧 T-042 覆盖率并发超时缺口。
 *
 * 零第三方依赖、只读取证、零写盘、零网络；真实身体数据令牌规则由 scan-common.mjs
 * 的 tokenRule() 从 ci.yml 唯一权威声明反向读取，本脚本零复制字面量。
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import {
  ROOT, walk, read, safeRead, exists, tokenRule, check,
} from './scan-common.mjs';

/** 机器语言 / ISA 绑定产物的文件头魔数（十六进制前缀）。 */
export const MACHINE_MAGICS = Object.freeze({
  elf: '7f454c46',           // ELF (Linux / Unix)
  macho_le: 'feedface',      // Mach-O 32-bit little
  macho_be: 'cefaedfe',      // Mach-O 32-bit big
  macho64_le: 'cffaedfe',    // Mach-O 64-bit little
  pe_mz: '4d5a',             // DOS / PE (Windows)
  wasm: '0061736d',          // WebAssembly 二进制
  java_class: 'cafebabe',    // JVM class
});

/** 仅允许人类可读、可修改的现行标准化实现语言源码（ECMAScript / ISO/IEC 22275:2018）。 */
const IMPL_SOURCE = /\.(?:js|mjs)$/;
/** 第二实现语言源码（v1 默认拒绝，ADR-003 G-06 / A-10）。 */
const SECOND_LANGUAGE = /\.(?:ts|tsx|py|go|rs|java|kt|c|cc|cpp|h|rb|php|cs|swift|scala|lua)$/;
/** 机器码 / 字节码 / 原生库扩展名（作为实现主体时一律拒绝）。 */
const BINARY_EXT = /\.(?:wasm|exe|so|dll|dylib|class|o|a|lib|bin|pyc|jar|node)$/i;
/** 操作系统元数据，非实现主体、未被 Git 跟踪且被 .gitignore 忽略。 */
const OS_METADATA = /(?:^|\/)(?:\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX(?:\/|$))/i;

/** @param {string} rel @returns {boolean} 是否为应排除的 OS 元数据 */
export function isOsMetadata(rel) {
  return OS_METADATA.test(rel);
}

/** 现行 ISO 标准号（SPEC.md §14.3 / ADR-002）；已撤销的 16262:2011 不得作为现行。 */
export const ISO_CURRENT = 'ISO/IEC 22275:2018';
export const ISO_WITHDRAWN = 'ISO/IEC 16262:2011';

/** 检查项 ID（与 tests/unit/t043-language-source.test.js 的 T043_CHECKS 一一对应）。 */
export const CHECK_IDS = Object.freeze([
  'iso_language', 'human_readable', 'no_machine_code', 'single_language',
  'archive_mapping', 'matrix_contract', 'contributor_no_real_data', 'release_audit_record',
]);

/**
 * 规范化「干净证据」。所有判定项都由字段推导，没有任何一项恒为 true。
 * 真实现场由 collectLanguageEvidence() 采集；本 fixture 供单测做正向 / 负向注入。
 */
export const COLLECTED_CLEAN_FIXTURE = Object.freeze({
  isoCurrentFound: true,
  isoWithdrawnAsCurrent: false,
  languageFiles: Object.freeze([
    'src/core/render/index.js', 'src/cli/run.js', 'run.mjs', 'scripts/lint.mjs',
  ]),
  unreadableFiles: Object.freeze([]),
  machineHits: Object.freeze([]),
  secondLanguageFiles: Object.freeze([]),
  binaryArtifacts: Object.freeze([]),
  metadataFiles: Object.freeze(['src/.DS_Store']),
  metadataIgnored: true,
  metadataTracked: false,
  releaseArtifacts: Object.freeze([]),
  mappingRulePresent: true,
  mappingConsistent: true,
  matrixOs: Object.freeze(['ubuntu-latest', 'macos-latest', 'windows-latest']),
  matrixNode: Object.freeze(['20', '22', '24']),
  localMatrixCells: 1,
  ciRuns: 'unverified',
  tokenHits: Object.freeze([]),
  fixturesFictional: true,
  auditRecordExists: true,
  auditRecordUnreleased: true,
  auditRecordNoE2E: true,
  ac19Status: 'RED',
  injectedMagic: null,
});

/**
 * 产物 → Corresponding Source 的一一对应规则（纯函数）。
 * 空产物集返回 vacuous=true；调用方**必须**把 vacuous 登记为「非端到端证据」。
 * @param {ReadonlyArray<{id: string, source_id?: string}>} artifacts
 * @param {ReadonlyArray<{id: string}>} sources
 */
export function evaluateMapping(artifacts, sources) {
  const seen = new Set();
  let consistent = true;
  for (const a of artifacts) {
    if (!a.source_id || seen.has(a.source_id) || !sources.some((s) => s.id === a.source_id)) {
      consistent = false;
    }
    seen.add(a.source_id);
  }
  return Object.freeze({
    consistent,
    vacuous: artifacts.length === 0,
    artifacts: artifacts.length,
    sources: sources.length,
  });
}

/**
 * 判定纯函数：注入证据 → 8 项检查 + verdict。
 * `break_<id>` 可逐项打红；`injectedMagic` 可模拟任一机器码魔数命中。
 * @param {object} evidence
 */
export function evaluateLanguageSource(evidence) {
  const ev = { ...COLLECTED_CLEAN_FIXTURE, ...evidence };
  const broken = (id) => ev[`break_${id}`] === true;
  const magic = ev.injectedMagic;
  const machineHits = magic ? [...ev.machineHits, magic] : ev.machineHits;
  const mapping = evaluateMapping(ev.releaseArtifacts, [
    { id: 'source-archive' }, { id: 'license' }, { id: 'notices' },
  ]);

  const checks = [
    check('iso_language',
      ev.isoCurrentFound && ev.isoWithdrawnAsCurrent === false
      && ev.languageFiles.length > 0 && !broken('iso_language'),
      `现行标准=${ISO_CURRENT} / 撤销标准被当作现行=${ev.isoWithdrawnAsCurrent}`),

    check('human_readable',
      ev.unreadableFiles.length === 0 && ev.languageFiles.length > 0
      && ev.languageFiles.every((f) => IMPL_SOURCE.test(f)) && !broken('human_readable'),
      `实现源码=${ev.languageFiles.length} / 不可读=${ev.unreadableFiles.length}`),

    check('no_machine_code',
      machineHits.length === 0 && ev.binaryArtifacts.length === 0
      && ev.metadataTracked === false && ev.metadataIgnored === true
      && !broken('no_machine_code'),
      `魔数命中=${machineHits.length} / 二进制产物=${ev.binaryArtifacts.length} / 元数据未跟踪=${!ev.metadataTracked}`),

    check('single_language',
      ev.secondLanguageFiles.length === 0 && !broken('single_language'),
      `第二实现语言源码=${ev.secondLanguageFiles.length}`),

    check('archive_mapping',
      ev.mappingRulePresent && mapping.consistent && ev.auditRecordNoE2E
      && ev.releaseArtifacts.length === 0 && !broken('archive_mapping'),
      `产物=${mapping.artifacts} / 一一对应=${mapping.consistent} / 空集=${mapping.vacuous} / 已声明非端到端=${ev.auditRecordNoE2E}`),

    check('matrix_contract',
      ev.matrixOs.length === 3 && ev.matrixNode.length === 3
      && ev.localMatrixCells === 1 && ev.ciRuns === 'unverified'
      && !broken('matrix_contract'),
      `OS=${ev.matrixOs.length} / Node=${ev.matrixNode.length} / 本机=${ev.localMatrixCells}/9 / CI=${ev.ciRuns}`),

    check('contributor_no_real_data',
      ev.tokenHits.length === 0 && ev.fixturesFictional && !broken('contributor_no_real_data'),
      `令牌命中=${ev.tokenHits.length} / 示例完全虚构=${ev.fixturesFictional}`),

    check('release_audit_record',
      ev.auditRecordExists && ev.auditRecordUnreleased && ev.ac19Status === 'RED'
      && !broken('release_audit_record'),
      `审计记录=${ev.auditRecordExists} / 未发布=${ev.auditRecordUnreleased} / AC-19=${ev.ac19Status}`),
  ];

  const failed = checks.filter((c) => !c.ok).length;
  return Object.freeze({
    checks: Object.freeze(checks),
    failed,
    verdict: failed === 0 ? 'STATIC_ONLY' : 'BLOCKED',
    ac19_green: false,
    release_artifacts: ev.releaseArtifacts.length,
    archive_vacuous: mapping.vacuous,
    end_to_end: 'unverified',
    ci_runs: ev.ciRuns,
    local_matrix_cells: ev.localMatrixCells,
    metadata_note: '未跟踪 OS 元数据（.DS_Store 等）已排除，不计入机器码实现主体',
  });
}

/** 从真实仓库只读取证，返回与 COLLECTED_CLEAN_FIXTURE 同构的证据对象。 */
export function collectLanguageEvidence() {
  const spec = safeRead('SPEC.md');
  const decisions = safeRead('docs/decisions.md');
  const ci = safeRead('.github/workflows/ci.yml');
  const audit = safeRead('docs/release-audit.md');
  const gitignore = safeRead('.gitignore');
  const tasks = safeRead('tasks.md');
  const files = walk();

  const languageFiles = [];
  const unreadableFiles = [];
  const secondLanguageFiles = [];
  const binaryArtifacts = [];
  const metadataFiles = [];
  const machineHits = [];

  for (const rel of files) {
    if (isOsMetadata(rel)) { metadataFiles.push(rel); continue; }
    if (SECOND_LANGUAGE.test(rel)) secondLanguageFiles.push(rel);
    if (BINARY_EXT.test(rel)) binaryArtifacts.push(rel);
    if (!IMPL_SOURCE.test(rel)) continue;
    let buf;
    try { buf = readFileSync(join(ROOT, rel)); } catch { unreadableFiles.push(rel); continue; }
    const hex = buf.subarray(0, 4).toString('hex');
    for (const [name, magic] of Object.entries(MACHINE_MAGICS)) {
      if (hex.startsWith(magic)) machineHits.push(`${rel}:${name}`);
    }
    const text = buf.toString('utf8');
    if (text.includes('\u0000') || !text.startsWith('// SPDX-License-Identifier')) {
      unreadableFiles.push(rel);
    }
    languageFiles.push(rel);
  }

  const tokens = tokenRule();
  const tokenHits = files.filter((rel) => rel !== '.github/workflows/ci.yml')
    .filter((rel) => { try { return tokens.test(read(rel)); } catch { return false; } });

  // 元数据是否被 Git 跟踪：以 git ls-files 实际输出为准，不硬编码 false。
  let tracked = [];
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  } catch {
    tracked = [];
  }
  const metadataTracked = tracked.some(isOsMetadata);

  const profiles = files.filter((rel) => /^examples\/profiles\/[^/]+\.json$/.test(rel));
  const fixturesFictional = profiles.length === 2
    && profiles.every((rel) => { try { return JSON.parse(read(rel)).fictional === true; } catch { return false; } });

  const executableCi = ci.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const osLine = /os:\s*\[([^\]]+)\]/.exec(executableCi)?.[1] ?? '';
  const nodeLine = /node:\s*\[([^\]]+)\]/.exec(executableCi)?.[1] ?? '';
  const matrixOs = osLine.split(',').map((s) => s.trim()).filter(Boolean);
  const matrixNode = nodeLine.split(',').map((s) => s.trim()).filter(Boolean);

  const releaseArtifacts = files.filter((rel) => /^(?:dist|release|releases|build|artifacts)\//.test(rel)
    || /\.(?:zip|tar\.gz|tgz|dmg|msi|deb|rpm)$/i.test(rel));

  const ac19 = safeRead('tests/acceptance/ac-19.md');
  const ac19Status = /^\| 状态 \| \*\*RED\*\*/m.test(ac19) ? 'RED' : 'UNKNOWN';

  return {
    isoCurrentFound: (spec + decisions).includes(ISO_CURRENT),
    isoWithdrawnAsCurrent: /16262:2011[^\n]{0,40}现行/.test(spec + decisions),
    languageFiles,
    unreadableFiles,
    machineHits,
    secondLanguageFiles,
    binaryArtifacts,
    metadataFiles,
    metadataIgnored: /\.DS_Store/m.test(gitignore),
    metadataTracked,
    releaseArtifacts,
    mappingRulePresent: typeof evaluateMapping === 'function',
    mappingConsistent: evaluateMapping(releaseArtifacts, [{ id: 'source-archive' }]).consistent,
    matrixOs,
    matrixNode,
    localMatrixCells: 1,
    ciRuns: 'unverified',
    tokenHits,
    fixturesFictional,
    auditRecordExists: exists('docs/release-audit.md') && audit.length > 0,
    auditRecordUnreleased: /尚未发布|未发布|不发 Release/.test(audit),
    auditRecordNoE2E: /不构成|不等价|非端到端|不是端到端/.test(audit),
    ac19Status,
    injectedMagic: null,
    tasksUnchecked: /\*\*T-043\*\*/.test(tasks)
      && tasks.split('\n').find((l) => l.includes('**T-043**'))?.startsWith('- [ ]'),
  };
}

/** 纯 ASCII 报告；`status=` 收尾，exit 0/1。 */
function emit(result) {
  const lines = [
    'tool=language-source',
    `checks=${result.checks.length}`,
    `failed=${result.failed}`,
    ...result.checks.map((c) => `check.${c.id}=${c.ok ? 'ok' : 'fail'}`),
    `release_artifacts=${result.release_artifacts}`,
    `archive_vacuous=${result.archive_vacuous}`,
    `end_to_end=${result.end_to_end}`,
    `ci_runs=${result.ci_runs}`,
    `local_matrix_cells=${result.local_matrix_cells}`,
    `ac19_green=${result.ac19_green}`,
    `verdict=${result.verdict}`,
    `status=${result.failed === 0 ? 'ok' : 'error'}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  for (const c of result.checks.filter((x) => !x.ok)) {
    process.stderr.write(`[FAIL] ${c.id}: ${c.detail}\n`);
  }
  process.exitCode = result.failed === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  emit(evaluateLanguageSource(collectLanguageEvidence()));
}
