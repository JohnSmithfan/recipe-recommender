// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-046 · Phase 3（M4）门禁分层取证（SPEC §10 / §17 / AC-13 / AC-18 / AC-19 / SC-007 / SC-014 / SC-015） · 审计追踪 ID: RR-T046-20261117-0001 · 待人工审查（P-10）
/**
 * `node scripts/m4-gate.mjs` 可独立复跑，输出纯 ASCII key=value，status= 收尾，exit 0/1。
 *
 * 定位：**M4 静态分层取证器，不是 AC 转绿裁决器**（与 p1/p2 gate / T-043 / T-044 /
 * T-045 同构 D 口径）。九项检查只回答「当前仓库的静态证据是否满足 M4 的各层判据」，
 * 并把「静态可证」与「端到端未证」显式分层：
 *   - SC-007（§10 必需文件 100% 存在且非空）：**静态可证**。
 *   - SC-014 / SC-015：静态层（GPL 全文、零真实数据、无包管理器产物、人类可读源码、
 *     无机器码、一一对应规则）可证；但 Release 归档、三平台实测、全量回归均排在后序
 *     M5 任务（T-050～T-054），故 `end_to_end=unverified`。
 *   - AC-13 / AC-18 / AC-19 的 Given 均为「仓库 / 产物处于可发布状态」，该前置尚未
 *     成立（v1 未发布、产物集为空、本机矩阵仅 1/9），故 ac*_green 恒为 false；
 *     m4_exit 恒为 false。转绿归人工裁决 + T-052 实体归档。
 *
 * 判据复用单一实现：机器码魔数 / OS 元数据排除来自 T-043 `language-source.mjs`，
 * §10 必需清单 / 令牌唯一权威来自 T-042 `scan-common.mjs`，本脚本不复制任何清单或字面量。
 * 判定抽成 evaluateM4Gate(evidence) 纯函数，支持逐项 break_<id> 负向注入；
 * 现场由 collectM4Evidence() 只读取证。零第三方依赖、零写盘、零网络、零子进程
 * （避免加剧 ISSUE-20261114-T042-COVERAGE-TIMEOUT 的并发耦合）。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import {
  ROOT, walk, read, safeRead, exists, sizeOf, dirNonEmpty,
  spec10Required, tokenRule, check,
} from './scan-common.mjs';
import { MACHINE_MAGICS, isOsMetadata } from './language-source.mjs';

/** 检查项 ID（与 tests/unit/t046-m4-gate.test.js 的 T046_CHECKS 一一对应）。 */
export const CHECK_IDS = Object.freeze([
  'spec10_required', 'ac13_static', 'ac18_static', 'ac19_static',
  'sc007_static', 'sc014_static', 'sc015_static',
  'prereq_evidence', 'honest_boundary',
]);

const PREREQ = Object.freeze([
  'scripts/community-files.mjs', 'scripts/language-source.mjs',
  'scripts/polyglot-gate.mjs', 'scripts/encoding-check.mjs',
]);
const LICENSE_MIN = 30000;
const LOCAL_MATRIX_CELLS = 1;
const MATRIX_TOTAL_CELLS = 9;

/**
 * 规范化「干净证据」。所有判定项都由字段推导，没有任何一项恒为 true；
 * `honest_boundary` 以 publishableState=false / acGreenCount=0 为成立前提，
 * 一旦有人注入「可发布状态成立」或「已有 AC 转绿」即转红，防止假绿。
 */
export const CLEAN_FIXTURE = Object.freeze({
  spec10Missing: Object.freeze([]),
  spec10Count: 21,
  licenseGplFull: true,
  privacyPresent: true,
  noticesCovered: true,
  disclaimerOk: true,
  aigcMarked: true,
  fictionalProfiles: true,
  isoCurrentFound: true,
  sourceReadable: true,
  mappingRuleOk: true,
  ciCommunityWired: true,
  noRealBundledData: true,
  prereqMissing: Object.freeze([]),
  tokenHits: Object.freeze([]),
  bundleHits: Object.freeze([]),
  machineMagicHits: Object.freeze([]),
  acGreenCount: 0,
  publishableState: false,
  releaseArtifacts: 0,
  matrixCells: LOCAL_MATRIX_CELLS,
  matrixTotal: MATRIX_TOTAL_CELLS,
  endToEnd: 'unverified',
  ciRuns: 'unverified',
});

/**
 * 判定纯函数：注入证据 → 九项检查 + 分层 verdict。
 * `break_<id>` 逐项打红；真阳性字段（tokenHits / bundleHits / machineMagicHits /
 * publishableState / acGreenCount）模拟门禁缺口与假绿注入。
 * @param {object} evidence
 */
export function evaluateM4Gate(evidence) {
  const ev = { ...CLEAN_FIXTURE, ...evidence };
  const broken = (id) => ev[`break_${id}`] === true;
  const specOk = ev.spec10Count >= 20 && ev.spec10Missing.length === 0;
  const licOk = ev.licenseGplFull === true;

  const checks = [
    check('spec10_required', specOk && !broken('spec10_required'),
      `§10 必需项=${ev.spec10Count} / 缺失=${ev.spec10Missing.join(',') || 'none'}`),

    check('ac13_static', specOk && licOk && ev.privacyPresent === true
      && ev.noticesCovered === true && ev.disclaimerOk === true
      && ev.aigcMarked === true && ev.tokenHits.length === 0
      && !broken('ac13_static'),
    `社区规范齐备=${specOk} / GPL=${licOk} / PRIVACY=${ev.privacyPresent} / NOTICES=${ev.noticesCovered} / 令牌命中=${ev.tokenHits.length}`),

    check('ac18_static', licOk && ev.fictionalProfiles === true
      && ev.noRealBundledData === true && ev.tokenHits.length === 0
      && ev.bundleHits.length === 0 && !broken('ac18_static'),
    `GPL=${licOk} / 虚构档案=${ev.fictionalProfiles} / 真实数据=${!ev.noRealBundledData} / 包管理器产物=${ev.bundleHits.length}`),

    check('ac19_static', ev.isoCurrentFound === true && ev.sourceReadable === true
      && ev.machineMagicHits.length === 0 && !broken('ac19_static'),
    `现行 ISO=${ev.isoCurrentFound} / 可读源码=${ev.sourceReadable} / 机器码命中=${ev.machineMagicHits.length}`),

    check('sc007_static', specOk && ev.ciCommunityWired === true && !broken('sc007_static'),
      `§10 100%=${specOk} / CI 实接 community-files=${ev.ciCommunityWired}`),

    check('sc014_static', licOk && ev.noRealBundledData === true
      && ev.tokenHits.length === 0 && ev.bundleHits.length === 0
      && !broken('sc014_static'),
    `GPL=${licOk} / 零真实数据=${ev.noRealBundledData} / 令牌命中=${ev.tokenHits.length} / 产物=${ev.bundleHits.length}`),

    check('sc015_static', ev.isoCurrentFound === true && ev.sourceReadable === true
      && ev.mappingRuleOk === true && ev.machineMagicHits.length === 0
      && !broken('sc015_static'),
    `可读源码=${ev.sourceReadable} / 一一对应规则=${ev.mappingRuleOk} / 机器码命中=${ev.machineMagicHits.length} / 三平台=${LOCAL_MATRIX_CELLS}/${MATRIX_TOTAL_CELLS}`),

    check('prereq_evidence', ev.prereqMissing.length === 0 && !broken('prereq_evidence'),
      `前置取证器缺失=${ev.prereqMissing.join(',') || 'none'}`),

    check('honest_boundary', ev.publishableState === false && ev.acGreenCount === 0
      && ev.releaseArtifacts === 0 && !broken('honest_boundary'),
    `可发布状态=${ev.publishableState} / AC 转绿数=${ev.acGreenCount} / Release 产物=${ev.releaseArtifacts} / 端到端=${ev.endToEnd}`),
  ];

  const failed = checks.filter((c) => !c.ok).length;
  return Object.freeze({
    checks: Object.freeze(checks),
    failed,
    verdict: failed === 0 ? 'STATIC_ONLY' : 'BLOCKED',
    // 三条 AC 与 M4 出口均不由本取证器转绿（D 口径，转绿归人工裁决 + T-052）。
    ac13_green: false,
    ac18_green: false,
    ac19_green: false,
    m4_exit: false,
    publishable_state: ev.publishableState,
    release_artifacts: ev.releaseArtifacts,
    local_matrix: `${ev.matrixCells}/${ev.matrixTotal}`,
    end_to_end: ev.endToEnd,
    ci_runs: ev.ciRuns,
  });
}

/** 机器码魔数命中：逐文件读文件头，复用 T-043 的魔数表与 OS 元数据排除判据。 */
function machineMagicHits() {
  const hits = [];
  for (const rel of walk()) {
    if (isOsMetadata(rel) || rel.endsWith('.gitkeep')) continue;
    let head;
    try { head = readFileSync(join(ROOT, rel)).subarray(0, 4).toString('hex'); } catch { continue; }
    // 只判「文件头前缀是否等于已知魔数」；不可反向用 magic.startsWith(head)，
    // 否则空文件 head='' 会对每个魔数恒命中（假阳性）。魔数最长 4 字节，读 4 字节足够。
    if (head.length < 4) continue;
    for (const [name, magic] of Object.entries(MACHINE_MAGICS)) {
      if (head.startsWith(magic)) hits.push(`${rel}:${name}`);
    }
  }
  return hits;
}

/** 包管理器产物 / 发布归档命中：与 v1「仅源码归档 + 校验和」分发口径相对。 */
function bundleHits() {
  const locks = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'bun.lockb'];
  const hits = locks.filter((rel) => exists(rel) && sizeOf(rel) > 0);
  if (dirNonEmpty('dist')) hits.push('dist/');
  for (const rel of walk()) {
    if (/\.(?:tgz|vsix|whl|deb|rpm|msi|dmg)$/i.test(rel)) hits.push(rel);
  }
  return hits;
}

/** 从真实仓库只读取证，返回与 CLEAN_FIXTURE 同构的证据对象。 */
export function collectM4Evidence() {
  const files = walk();
  const required = spec10Required();
  const spec10Missing = required.filter((rel) => (rel.endsWith('/')
    ? !dirNonEmpty(rel.replace(/\/$/, ''))
    : (!exists(rel) || sizeOf(rel) === 0)));

  const lic = safeRead('LICENSE');
  const licenseGplFull = lic.length > LICENSE_MIN
    && /GNU GENERAL PUBLIC LICENSE/.test(lic)
    && /Version 3, 29 June 2007/.test(lic)
    && /TERMS AND CONDITIONS/.test(lic);

  const privacyText = safeRead('PRIVACY.md');
  const privacyPresent = privacyText.length > 200
    && /个人信息|personal data|数据最小化|data minimization/i.test(privacyText);

  const notices = safeRead('THIRD_PARTY_NOTICES.md');
  let noticesCovered = notices.length > 200;
  try {
    const catalog = JSON.parse(read('data/source/catalog.json'));
    noticesCovered = noticesCovered && catalog.sources.length === 5
      && catalog.sources.every((s) => notices.includes(String(s.id)));
  } catch { noticesCovered = false; }

  // 免责声明的真实载体：仓库 README + 两份虚构档案 JSON 的 notice/usage + 真实渲染快照。
  // AC-01 是红态场景基线（P0，不得改），不承载产物免责声明，故不作为取证样本。
  const sampleTexts = ['README.md',
    'examples/profiles/global-average-male.json',
    'examples/profiles/global-average-female.json',
    'tests/snapshots/i18n/zh-Hans.md'];
  const disclaimerOk = sampleTexts.length > 0 && sampleTexts.every((rel) => {
    const t = safeRead(rel);
    return t.length > 0 && /非医疗|not medical|估算值|estimate/i.test(t);
  });
  const aigcMarked = ['CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md',
    'SUPPORT.md', 'CHANGELOG.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md']
    .every((rel) => /\[AIGC\]/.test(safeRead(rel)));

  const profiles = files.filter((rel) => /^examples\/profiles\/[^/]+\.json$/.test(rel));
  const fictionalProfiles = profiles.length === 2 && profiles.every((rel) => {
    try { return JSON.parse(read(rel)).fictional === true; } catch { return false; }
  });

  const decisions = safeRead('docs/decisions.md');
  const isoCurrentFound = /ISO\/IEC 22275:2018/.test(decisions)
    && !/ISO\/IEC 16262:2011[^。\n]*现行/.test(decisions);
  const impl = files.filter((rel) => rel.startsWith('src/')
    && !rel.endsWith('.gitkeep') && !rel.endsWith('.DS_Store'));
  const sourceReadable = impl.length > 0
    && impl.every((rel) => /\.(?:js|json|md)$/.test(rel));
  const mappingRuleOk = exists('docs/release-audit.md')
    && /vacuous|空产物集|一一对应/.test(safeRead('docs/release-audit.md'));

  const executableCi = read('.github/workflows/ci.yml')
    .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const ciCommunityWired = executableCi.includes('community-files.mjs')
    && executableCi.includes('spec-consistency');

  const catalog = JSON.parse(read('data/source/catalog.json'));
  const external = catalog.sources.filter((s) => s.id !== 'synthetic-demo');
  const noRealBundledData = external.length === 4
    && external.every((s) => s.bundled === false && s.payload_path === null);

  const prereqMissing = PREREQ.filter((rel) => !exists(rel) || sizeOf(rel) < 800);

  const tokens = tokenRule();
  const tokenHits = files.filter((rel) => rel !== '.github/workflows/ci.yml')
    .filter((rel) => { try { return tokens.test(read(rel)); } catch { return false; } });

  const acFiles = files.filter((rel) => /^tests\/acceptance\/ac-\d{2}\.md$/.test(rel));
  const acGreenCount = acFiles.filter((rel) => /status \| \*\*GREEN\*\*/.test(read(rel))).length;

  // 可发布状态从不硬编码：须 Release workflow 存在 + 19 AC 全绿 + 有 Release 产物；
  // 当前三项均不成立，故现场推导为 false（D 口径的客观依据）。
  const publishableState = exists('.github/workflows/release.yml')
    && acGreenCount === 19 && acFiles.length === 19
    && files.some((rel) => /\.(?:tar\.gz|zip)$/.test(rel));

  return {
    spec10Missing,
    spec10Count: required.length,
    licenseGplFull,
    privacyPresent,
    noticesCovered,
    disclaimerOk,
    aigcMarked,
    fictionalProfiles,
    isoCurrentFound,
    sourceReadable,
    mappingRuleOk,
    ciCommunityWired,
    noRealBundledData,
    prereqMissing,
    tokenHits,
    bundleHits: bundleHits(),
    machineMagicHits: machineMagicHits(),
    acGreenCount,
    publishableState,
    releaseArtifacts: 0,
    matrixCells: LOCAL_MATRIX_CELLS,
    matrixTotal: MATRIX_TOTAL_CELLS,
    endToEnd: 'unverified',
    ciRuns: 'unverified',
  };
}

/** 纯 ASCII 报告；status= 收尾，exit 0/1。 */
function emit(result) {
  const lines = [
    'tool=m4-gate',
    `checks=${result.checks.length}`,
    `failed=${result.failed}`,
    ...result.checks.map((c) => `check.${c.id}=${c.ok ? 'ok' : 'fail'}`),
    `ac13_green=${result.ac13_green}`,
    `ac18_green=${result.ac18_green}`,
    `ac19_green=${result.ac19_green}`,
    `m4_exit=${result.m4_exit}`,
    `publishable_state=${result.publishable_state}`,
    `release_artifacts=${result.release_artifacts}`,
    `local_matrix=${result.local_matrix}`,
    `ci_runs=${result.ci_runs}`,
    `end_to_end=${result.end_to_end}`,
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
  emit(evaluateM4Gate(collectM4Evidence()));
}
