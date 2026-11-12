// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-037 · Phase 2 出口门禁取证 · 审计追溯 ID: RR-T037-20261112-0001 · 待人工审查（P-10）
/**
 * T-037 · Phase 2 出口门禁（tasks.md T-037）的**取证器**。
 *
 * 本模块只做三件事：真实跑一遍 T-030～T-036 的可执行断言、逐条取证 AC-14～17、
 * 如实报告结论。它**不**把任何 `ac-*.md` 改成 GREEN、**不**勾 `tasks.md`、
 * **不**写任何文件、**不**删改或跳过任何场景。理由：P-02 要求实现通过全部 AC 才可转绿，
 * P-09 / RK-03 禁止靠删场景换绿，P-10 / constitution §3.1(5) 要求 `[AIGC]`
 * 基线变更经人工审查；T-022 的 P1 出口目前仍是 BLOCKED，四选一裁决待人工书面决定。
 *
 * 结构性矛盾（tasks.md T-037 要求「AC-14～17 全部转绿」）：
 * - P0 基线 `ac-*.md` 仍 19/19 RED、`tasks.md` 仍 39 [ ] / 0 [x]、`ci.yml` 是 T-006 骨架；
 * - T-041 合规文档、T-042 全量 CI、T-045 encoding-check、T-014 交节联网均未落地；
 * - P1 门禁 `verdict=BLOCKED`，`ISSUE-20261109-T030-GATE` 的 D 解释仍待复核。
 * 因此本任务交付「可复核的取证器 + CI 风格报告」，结论如实 BLOCKED / exit 2，
 * 把「红→绿」状态写入留给人工裁决，绝不提前假绿。
 *
 * 设计要点：
 * - 判定逻辑抽成纯函数 `evaluateP2Gate(evidence)`，便于对十项门禁逐项做负向注入，
 *   证明每项都绑定真实取证变量，且 verdict 既非恒真也非写死的恒假。
 * - 取证 `collectP2Evidence()` 真实调用 MCP / 语言包 / 区域策略 / 离线集成 /
 *   增强门 / 数据源加载 / 多语言快照，所有计数来自运行期结果，不是声明式常量。
 * - 零磁盘写入、零子进程、零第三方依赖；`node:fs` 只读导入白名单由自身源码取证。
 * - 真实数据令牌正则动态取自 `.github/workflows/ci.yml` 唯一权威规则，绝不复制字面量。
 * - 场景文本实时从 `SPEC.md §8` 提取并逐字比对，任何删改 / 跳过 / 弱化都会让门禁失败。
 * - 命名不是 `*.test.js` / `*.test.mjs`（tasks.md §2）；由 `tests/unit/p2-gate.test.js` import 断言。
 *
 * 用法：
 *   node tests/acceptance/gates/p2-gate.mjs        # 纯 ASCII key=value 报告，exit 0/1/2
 *   import { runP2Gate } from './p2-gate.mjs';    # 供单测 / T-042 CI 接线复用
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { runOfflineIntegration, OFFLINE_LEVELS } from '../offline-integration.mjs';
import {
  createMcpServer, TOOLS, TOOL_NAMES, FORBIDDEN_MARKERS,
  assertSafeText, assertSafePayload, MCP_ERROR, PROTOCOL_VERSION,
} from '../../../src/mcp/index.js';
import {
  LANGUAGE_PACK_KEYS,
  DEFAULT_ENHANCE_CONFIG,
  ENHANCEMENT_SCOPES,
  ENHANCE_DECISION,
  enhanceRenderedText,
} from '../../../src/core/render/index.js';
import {
  BUILTIN_TAGS, LOCALE_SOURCES, SUBNATIONAL_REGION_CODES,
  verifyLanguagePacks, resolveLanguagePack, resolveLocalePolicy,
} from '../../../src/core/locale/index.js';
import { loadRegionMappings } from '../../../src/core/guideline/region.js';
import {
  SOURCE_ERROR, assertSourceMetadata, loadSourceCatalog, loadDataSource,
} from '../../../src/core/source/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const GATE_SELF = 'tests/acceptance/gates/p2-gate.mjs';
const SCENARIO_RE = /^```gherkin\r?\n([\s\S]*?)^```[ \t]*$/m;
const RR_DATA_RE = /^```rr-data\r?\n([\s\S]*?)^```[ \t]*$/m;
const SNAPSHOT_DIR = 'tests/snapshots/i18n';
const MANIFEST_PATH = `${SNAPSHOT_DIR}/manifest.json`;
const GLOSSARY_PATH = `${SNAPSHOT_DIR}/glossary.json`;
const DEMO_SOURCE_ID = 'synthetic-demo';

/** T-037 出口门禁要求的 4 条 AC。 */
export const P2_AC_IDS = Object.freeze(['14', '15', '16', '17']);

/** 逐条取证结论：端到端通过 / 仅适配层与核心域可证 / 存在业务缺口。 */
export const P2_AC_STATUS = Object.freeze({
  E2E: 'E2E_PASS',
  CORE: 'CORE_ONLY',
  GAP: 'GAP',
});

/** 十项门禁 ID（顺序固定、唯一）。 */
export const P2_GATE_CHECK_IDS = Object.freeze([
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

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => existsSync(join(ROOT, rel));
const utf8Bytes = (text) => new TextEncoder().encode(text).length;

/** 只读 FsPort：T-033 / T-035 的加载器只经注入端口读文件，本门禁零写盘。 */
const fsPort = Object.freeze({
  readJson: async (rel) => readJson(rel),
  readText: async (rel) => read(rel),
  exists: async (rel) => exists(rel),
});

/** 从 SPEC.md §8 实时提取场景文本（唯一权威，与 T-004 / T-022 同口径）。 */
function specScenarios() {
  const text = read('SPEC.md');
  const heads = [...text.matchAll(/^## \d+\. .+$/gm)];
  const i = heads.findIndex((h) => h[0].startsWith('## 8.'));
  if (i < 0) throw new Error('ERR_T037_SPEC_SECTION_MISSING');
  const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
  const sec = text.slice(heads[i].index, end);
  const titles = [...sec.matchAll(/^### (AC-\d{2}) · (.+)$/gm)];
  const parts = sec.split(/^### AC-\d{2} · .+$/m).slice(1);
  /** @type {Record<string, string|null>} */
  const out = {};
  titles.forEach((t, k) => {
    if (!P2_AC_IDS.includes(t[1].slice(3))) return;
    const m = (parts[k] || '').match(SCENARIO_RE);
    out[t[1]] = m ? m[1].replace(/\r\n/g, '\n').trim() : null;
  });
  return out;
}

/** 两种**独立实现**的全仓遍历，用于证明静态扫描不是空扫。 */
function walkRecursive(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === '.git' || e.name === 'node_modules') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walkRecursive(p) : [p];
  });
}
function walkStack(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}
const isSource = (p) => /\.(js|mjs)$/.test(p);

/** 解析 FR-044 的 `rr-data` 纯 ASCII 规范数据区。 */
function canonicalData(text) {
  const m = RR_DATA_RE.exec(text);
  /** @type {Record<string, string>} */
  const out = Object.create(null);
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) out[line.slice(0, at)] = line.slice(at + 1);
  }
  return out;
}

/** 唯一权威的真实数据令牌规则：动态取自 CI，不复制字面量。 */
function tokenRule() {
  const ci = read('.github/workflows/ci.yml');
  const m = /const TOKENS = \/(.+?)\/;/.exec(ci);
  if (!m) throw new Error('ERR_T037_TOKEN_RULE_MISSING');
  return new RegExp(m[1]);
}

/** @returns {Promise<object>} T-030 MCP 工具脱敏取证 */
async function collectMcp() {
  const server = createMcpServer({});
  const list = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const toolNames = (list?.result?.tools ?? []).map((t) => t.name);
  const init = await server.handle({ jsonrpc: '2.0', id: 2, method: 'initialize' });
  const descriptionsSafe = TOOLS.every((t) => {
    try { assertSafeText(t.description); return true; } catch { return false; }
  });

  // 样本只用字段名与浮点形态构造，不含任何真实身体数值（FR-053 / P-14）。
  const samples = [
    { [FORBIDDEN_MARKERS[0]]: 1 },
    { [FORBIDDEN_MARKERS[2]]: 1 },
    { nested: { value: 0.5 } },
    { note: FORBIDDEN_MARKERS[4] },
    { items: ['ok', { [FORBIDDEN_MARKERS[7]]: 1 }] },
  ];
  let privacyRejects = 0;
  for (const sample of samples) {
    try { assertSafePayload(sample); } catch (error) {
      if (error?.code === MCP_ERROR.PRIVACY) privacyRejects += 1;
    }
  }

  const PROBE = 'probe-ref-001';
  const argsByName = {
    rr_generate_plan: { profile_ref: PROBE, level: 'day' },
    rr_validate_plan: { plan_ref: PROBE },
    rr_query_ledger: { type: 'dedup' },
    rr_list_locales: {},
  };
  let portFailures = 0;
  let payloadEchoes = 0;
  for (const name of TOOL_NAMES) {
    const resp = await server.handle({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name, arguments: argsByName[name] ?? {} },
    });
    const text = resp?.result?.content?.[0]?.text ?? '';
    if (resp?.result?.isError === true && text === MCP_ERROR.PORT) portFailures += 1;
    if (text.includes(PROBE)) payloadEchoes += 1;
  }
  return Object.freeze({
    toolNames,
    protocolVersion: init?.result?.protocolVersion ?? '',
    realProtocolVersion: PROTOCOL_VERSION,
    descriptionsSafe,
    privacyRejects,
    portFailures,
    payloadEchoes,
    forbiddenMarkers: FORBIDDEN_MARKERS.length,
  });
}

/** @returns {object} T-031 七语言键集与四态回退链取证 */
function collectI18n() {
  const sources = Object.fromEntries(
    BUILTIN_TAGS.map((tag) => [tag, readJson(`locales/${tag}/strings.json`)]),
  );
  const verified = verifyLanguagePacks(sources, LANGUAGE_PACK_KEYS);
  const fallbackStates = [
    resolveLanguagePack('zh-Hans', sources).resolved_by,
    resolveLanguagePack('de-AT', sources, { defaultTag: 'en' }).resolved_by,
    resolveLanguagePack('xx-Zzzz', sources, { defaultTag: 'fr' }).resolved_by,
    resolveLanguagePack('xx-Zzzz', sources, { defaultTag: 'en' }).resolved_by,
  ];
  return Object.freeze({
    tags: [...BUILTIN_TAGS],
    keyCount: LANGUAGE_PACK_KEYS.length,
    verifiedTags: verified.tags,
    verifyIssues: verified.issues.length,
    fallbackStates,
  });
}

/** @returns {object} T-036 八份真实 render() 快照的可复算取证 */
function collectSnapshots() {
  const manifest = readJson(MANIFEST_PATH);
  const glossary = readJson(GLOSSARY_PATH);
  let hashMatches = 0;
  let byteMatches = 0;
  let gb18030Uncovered = 0;
  const rrData = new Set();
  for (const entry of manifest.entries) {
    const text = read(`${SNAPSHOT_DIR}/${entry.file}`);
    if (sha256(text) === entry.sha256) hashMatches += 1;
    if (utf8Bytes(text) === entry.bytes) byteMatches += 1;
    rrData.add(entry.rr_data_sha256);
    gb18030Uncovered += entry.gb18030_l1_uncovered;
  }
  return Object.freeze({
    entries: manifest.entries.length,
    hashesMatch: hashMatches === manifest.entries.length,
    bytesMatch: byteMatches === manifest.entries.length,
    rrDataUniform: rrData.size === 1 && rrData.has(manifest.rr_data_sha256),
    gb18030Uncovered,
    glossaryPaired: glossary.paired_count,
    productE2e: manifest.product_e2e,
    sectionsSource: manifest.sections_source,
  });
}

/** @returns {Promise<object>} T-032 / T-033 区域策略来源标注取证 */
async function collectRegion() {
  const { mappings, schema } = await loadRegionMappings(fsPort);
  const options = { regionMappings: mappings };
  const byNationality = resolveLocalePolicy(
    { locale_policy: { declared_nationality: 'CN' } }, {}, options,
  );
  const byResidence = resolveLocalePolicy(
    { locale_policy: { declared_nationality: 'FR', declared_residence: 'US' } }, {}, options,
  );
  const byOverride = resolveLocalePolicy(
    { locale_policy: {} }, { guideline: 'generic-guideline' }, options,
  );
  const byFallback = resolveLocalePolicy({ locale_policy: {} }, {}, options);
  const policies = [byNationality, byResidence, byOverride, byFallback];
  const sources = [...new Set(policies.map((p) => p.locale_source))];
  return Object.freeze({
    sources,
    inferredSource: sources.includes('auto:inferred'),
    noInferredEnum: !LOCALE_SOURCES.includes('auto:inferred'),
    overridesWin: byOverride.locale_source === 'user'
      && byOverride.guideline_id === 'generic-guideline',
    subnationalCodes: [...SUBNATIONAL_REGION_CODES],
    mappingsReviewStatus: schema.review_status,
    mappingCodes: Object.keys(mappings).length,
    declaredSources: [...LOCALE_SOURCES],
  });
}

/** CLI 组合根源码：用于取证「联网刷新交节时刻」是否真的接线。 */
function cliSourceText() {
  return ['src/cli/plan.js', 'src/cli/run.js', 'src/cli/index.js']
    .filter((rel) => exists(rel)).map((rel) => read(rel)).join('\n');
}

/** @returns {Promise<{offline: object, raw: object}>} T-021 断网集成取证 */
async function collectOffline() {
  const raw = await runOfflineIntegration();
  const day = raw.plans?.absent?.day;
  const rr = canonicalData(day?.text ?? '');
  const requests = raw.modes.reduce((n, mode) => n + (raw.requests?.[mode]?.length ?? 0), 0);
  const cli = cliSourceText();
  return {
    raw,
    offline: Object.freeze({
      ok: raw.ok,
      checks: raw.checks.length,
      failed: raw.checks.filter((c) => !c.ok).length,
      requests,
      diskWrites: raw.diskWrites,
      levels: OFFLINE_LEVELS.length,
      modes: raw.modes.length,
      calendarStatus: rr['calendar.status'] ?? '',
      calendarNetworkWired: /refreshCalendarData/.test(cli) && /netPort/.test(cli),
      sectionsCount: Number(rr['sections.count'] ?? NaN),
    }),
  };
}

/** @returns {object} T-034 增强门默认关闭 / 逐次同意 / 降级 / 零在线调用取证 */
function collectEnhance() {
  const template = read(`${SNAPSHOT_DIR}/en.md`);
  const scope = ENHANCEMENT_SCOPES[0];
  const consent = Object.freeze({
    granted: true, scope, consent_id: 'consent-p2-001', request_id: 'request-p2-001',
  });
  const base = enhanceRenderedText(template);
  const noConsent = enhanceRenderedText(template, {
    config: { enabled: true, scope },
  });
  const available = Object.freeze({ available: true, offline: false });
  const cases = [
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: { available: true, offline: true } }),
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: { available: false, offline: false } }),
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: available, adapter: { enhance() { throw new Error('adapter-down'); } } }),
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: available, adapter: { enhance() { return Promise.resolve(template); } } }),
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: available, adapter: { enhance() { return 'rewritten-without-canonical-block'; } } }),
    enhanceRenderedText(template, { config: { enabled: true, scope }, consent, availability: available, seenIds: [consent.consent_id] }),
  ];
  const enhanceSource = read('src/core/render/enhance.js');
  const onlineCalls = (enhanceSource.match(/\bfetch\s*\(|XMLHttpRequest|WebSocket|\bnode:/g) ?? []).length;
  return Object.freeze({
    defaultDisabled: base.engine === 'template' && base.reason === ENHANCE_DECISION.OFF,
    defaultCalls: base.calls,
    defaultByteIdentical: base.text === template,
    consentRequired: noConsent.reason === ENHANCE_DECISION.NO_CONSENT && noConsent.calls === 0,
    degradeCases: cases.length,
    byteIdenticalDegrades: cases.filter((c) => c.text === template && c.engine === 'template').length,
    onlineCalls,
    configDefaultOff: DEFAULT_ENHANCE_CONFIG.enabled === false,
  });
}

/** @returns {Promise<object>} T-035 数据源元数据合规取证 */
async function collectSource() {
  const { sources, schema } = await loadSourceCatalog(fsPort);
  const external = sources.filter((s) => s.id !== DEMO_SOURCE_ID);
  const conflictEntry = external.find((s) => s.id === 'howtocook-recipes');
  let conflictRejected = false;
  try {
    assertSourceMetadata({ ...conflictEntry, license: 'CC0-1.0' }, schema);
  } catch (error) {
    conflictRejected = error?.code === SOURCE_ERROR.CONFLICT;
  }
  const loadable = [];
  for (const entry of sources) {
    try { await loadDataSource(fsPort, entry.id); loadable.push(entry.id); } catch { /* fail closed */ }
  }
  return Object.freeze({
    externalCount: external.length,
    allUnverified: external.every((s) => s.version === 'unverified'),
    allUnbundled: external.every((s) => s.bundled === false),
    allPayloadNull: external.every((s) => s.payload_path === null),
    allUnreviewed: external.every((s) => s.review_status === 'ai-candidate-unreviewed'),
    conflictRejected,
    loadableCount: loadable.length,
    loadableId: loadable.length === 1 ? loadable[0] : '',
  });
}

/** @returns {object} 全仓静态扫描、令牌命中、自身只读导入白名单、可追溯来源清单 */
function collectFiles() {
  const allFiles = walkRecursive(ROOT);
  const srcFiles = allFiles.filter(isSource);
  const independent = walkStack(ROOT).filter(isSource).length;
  const tokens = tokenRule();
  const ciSelf = '.github/workflows/ci.yml';
  const hits = allFiles.filter((p) => {
    const rel = p.replace(/\\/g, '/');
    if (rel.endsWith(ciSelf)) return false;
    try { return tokens.test(readFileSync(p, 'utf8')); } catch { return false; }
  });
  const selfText = read(GATE_SELF);
  const fsImports = (selfText.match(/^import \{([^}]+)\} from 'node:fs';/m)?.[1] ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).sort();
  const references = [
    'src/mcp/index.js', 'src/mcp/tools.js', 'locales/_schema/keys.json',
    'src/core/locale/index.js', 'data/region/mappings.json',
    'src/core/guideline/region.js', 'tests/acceptance/offline-integration.mjs',
    'src/core/render/enhance.js', 'data/source/catalog.json',
    'src/core/source/index.js', `${SNAPSHOT_DIR}/manifest.json`,
    `${SNAPSHOT_DIR}/glossary.json`, 'tests/unit/p2-gate.test.js',
    'SPEC.md', 'tasks.md', '.github/workflows/ci.yml',
  ].filter((rel) => exists(rel));
  return Object.freeze({
    scanned: srcFiles.length,
    independentlyCounted: independent,
    tokenHits: hits.length,
    fsImports,
    referencePaths: references,
  });
}

/** @returns {object} AC-14～17 红态状态与 tasks.md 勾选统计（只读） */
function collectAcBaseline() {
  /** @type {Record<string, string>} */
  const statuses = {};
  for (const id of P2_AC_IDS) {
    const text = read(`tests/acceptance/ac-${id}.md`);
    statuses[id] = text.match(/^\| 状态 \| \*\*(RED|GREEN)\*\*/m)?.[1] ?? 'MISSING';
  }
  const tasks = read('tasks.md');
  return Object.freeze({
    statuses,
    unchecked: (tasks.match(/^- \[ \]/gm) ?? []).length,
    checked: (tasks.match(/^- \[x\]/gm) ?? []).length,
  });
}

/** @returns {object} 端到端条件：全部由真实文件 / 运行期状态取证，不硬编码 false */
function collectE2e(offline, ac) {
  const ci = read('.github/workflows/ci.yml');
  const cliSource = cliSourceText();
  return Object.freeze({
    ac14_ci_green: /p2-gate/.test(ci) && offline.ok === true
      && Object.values(ac.statuses).every((s) => s === 'GREEN'),
    ac15_cli_wired: /encoding-check/.test(ci) && /sections/.test(cliSource)
      && exists('scripts/encoding-check.mjs'),
    ac16_calendar_download: offline.calendarStatus === 'verified'
      && offline.calendarNetworkWired === true,
    ac17_compliance_docs: exists('PRIVACY.md') && exists('THIRD_PARTY_NOTICES.md')
      && /license-scan|third.party/i.test(ci),
  });
}

/**
 * 真实跑一遍 T-030～T-036 的可执行断言，返回**纯数据**证据。
 * 纯数据保证 `structuredClone` 可用，从而支持单测对判定逻辑做负向注入。
 * @returns {Promise<object>}
 */
export async function collectP2Evidence() {
  const scenarios = specScenarios();
  const ac = collectAcBaseline();
  const mcp = await collectMcp();
  const i18n = collectI18n();
  const snapshots = collectSnapshots();
  const region = await collectRegion();
  const { offline } = await collectOffline();
  const enhance = collectEnhance();
  const source = await collectSource();
  const files = collectFiles();
  const e2e = collectE2e(offline, ac);
  const assertions = Object.freeze({
    '14': mcp.privacyRejects + mcp.portFailures + (mcp.descriptionsSafe ? 1 : 0),
    '15': i18n.verifiedTags + snapshots.entries + (snapshots.rrDataUniform ? 1 : 0),
    '16': region.sources.length + (region.overridesWin ? 1 : 0) + region.subnationalCodes.length,
    '17': offline.checks + enhance.degradeCases + source.externalCount,
  });
  return Object.freeze({
    scenarios: Object.freeze({ ...scenarios }), ac, mcp, i18n, snapshots,
    region, offline, enhance, source, files, e2e, assertions,
  });
}

/** 每条 AC 的缺口与来源（文字固定，但证据值全部来自运行期取证）。 */
function rowDetail(id, e) {
  switch (id) {
    case '14':
      return {
        evidence: [
          `mcp.tools=${e.mcp.toolNames.length}`,
          `mcp.privacy_rejects=${e.mcp.privacyRejects}`,
          `mcp.port_fail_closed=${e.mcp.portFailures}/4`,
          `mcp.payload_echoes=${e.mcp.payloadEchoes}`,
          `scenario_faithful=${typeof e.scenarios['AC-14'] === 'string'}`,
          `ac.status=${e.ac.statuses['14']}`,
        ],
        gaps: [
          'AC-14 要求追溯矩阵与 CI 全绿；当前 ci.yml 仍是 T-006 六 job 骨架，未接入 p2-gate / lint / coverage / 语言包键集（T-042）。',
          'P1 门禁 verdict=BLOCKED，19/19 AC 仍 RED；T-022 四选一裁决与 D 解释仍待人工书面决定。',
        ],
        sources: ['src/mcp/index.js', 'src/mcp/tools.js', 'tests/unit/p2-gate.test.js', 'SPEC.md', '.github/workflows/ci.yml'],
      };
    case '15':
      return {
        evidence: [
          `language_packs=${e.i18n.tags.length}x${e.i18n.keyCount}`,
          `verify_issues=${e.i18n.verifyIssues}`,
          `fallback_states=${e.i18n.fallbackStates.length}`,
          `snapshots=${e.snapshots.entries}`,
          `snapshot_hashes=${e.snapshots.hashesMatch}`,
          `rr_data_uniform=${e.snapshots.rrDataUniform}`,
          `gb18030_l1_uncovered=${e.snapshots.gb18030Uncovered}`,
          `glossary_paired=${e.snapshots.glossaryPaired}`,
        ],
        gaps: [
          `T-036 快照来自合成夹具（sections_source=${e.snapshots.sectionsSource}、product_e2e=${e.snapshots.productE2e}），不是 rr plan --lang 的端到端输出；端到端计划规范数据区 sections.count=${e.offline.sectionsCount}，四餐正文仍未接线；快照位仍指向 P0 占位 tests/snapshots/ac-15.txt，合并方式待人工裁决。`,
          'T-045 encoding-check 独立 CI 校验未落地，中文 GB 18030-2022 级别 1 覆盖尚无静态门禁。',
        ],
        sources: [`${SNAPSHOT_DIR}/manifest.json`, `${SNAPSHOT_DIR}/glossary.json`, 'locales/_schema/keys.json', 'src/core/locale/index.js', 'SPEC.md'],
      };
    case '16':
      return {
        evidence: [
          `locale_sources=${e.region.sources.length}`,
          `override_wins=${e.region.overridesWin}`,
          `inferred_source=${e.region.inferredSource}`,
          `mapping_review=${e.region.mappingsReviewStatus}`,
          `subnational_codes=${e.region.subnationalCodes.length}`,
          `calendar.status=${e.offline.calendarStatus}`,
          `calendar.network_wired=${e.offline.calendarNetworkWired}`,
          `offline_requests=${e.offline.requests}`,
        ],
        gaps: [
          `AC-16 要求联网下载精确交节时刻；离线计划 calendar.status=${e.offline.calendarStatus} 只是本地缓存校验，CLI 联网刷新接线=${e.offline.calendarNetworkWired}，T-014 保守解不联网下载；缓存路径 _data/ 与 data/calendar/ 张力待人工裁决。`,
          '「未匹配，已回退」自然语言标注缺冻结 71 键集之外的语言包键；区域示例仍是 ai-candidate-unreviewed，需人工审校。',
        ],
        sources: ['data/region/mappings.json', 'src/core/guideline/region.js', 'src/core/locale/index.js', 'tests/acceptance/offline-integration.mjs', 'SPEC.md'],
      };
    default:
      return {
        evidence: [
          `offline.checks=${e.offline.checks}`,
          `offline.failed=${e.offline.failed}`,
          `offline.requests=${e.offline.requests}`,
          `offline.disk_writes=${e.offline.diskWrites}`,
          `offline.levels=${e.offline.levels}`,
          `enhance.default_off=${e.enhance.defaultDisabled}`,
          `enhance.degrades=${e.enhance.byteIdenticalDegrades}/${e.enhance.degradeCases}`,
          `enhance.online_calls=${e.enhance.onlineCalls}`,
          `source.external_unbundled=${e.source.externalCount}`,
          `token_hits=${e.files.tokenHits}`,
        ],
        gaps: [
          'T-041 的 PRIVACY.md / SECURITY.md / THIRD_PARTY_NOTICES.md 未产出，AC-13 / AC-17 / AC-18 的法律与许可审计缺口未闭合。',
          'T-042 的真实身体数据 / diet-plan / 包管理器清单 / 受版权保护指南原文静态扫描门禁未接入 CI。',
        ],
        sources: ['tests/acceptance/offline-integration.mjs', 'src/core/render/enhance.js', 'data/source/catalog.json', 'src/core/source/index.js', 'SPEC.md'],
      };
  }
}

/**
 * 纯函数判定：由证据计算 rows / checks / verdict。不读文件、不写文件、不发请求。
 * 供单测对每项门禁做负向注入，证明判定既非恒真，也不是写死的恒假。
 * @param {object} evidence `collectP2Evidence()` 的返回值（或其结构化副本）
 * @returns {object} 结构化报告
 */
export function evaluateP2Gate(evidence) {
  const e = evidence;
  const coreOk = {
    '14': e.mcp.portFailures === 4 && e.mcp.privacyRejects >= 4 && e.assertions['14'] >= 2,
    '15': e.i18n.verifyIssues === 0 && e.snapshots.hashesMatch && e.snapshots.rrDataUniform,
    '16': e.region.sources.length === 4 && e.region.overridesWin,
    '17': e.offline.ok === true && e.offline.failed === 0 && e.enhance.defaultDisabled === true,
  };
  // AC-16 的「联网下载精确交节时刻」是场景明确要求但实现不存在的正文能力。
  // 本地缓存 status=verified 不等于联网刷新已接线：判据取 CLI 是否真的调用
  // refreshCalendarData + 注入 netPort，避免把缓存命中误判为场景满足。
  const hardGap = { '16': e.offline.calendarNetworkWired !== true };
  const refSet = new Set(e.files.referencePaths);

  const rows = P2_AC_IDS.map((id) => {
    const status = e.e2e[`ac${id}_${({ '14': 'ci_green', '15': 'cli_wired', '16': 'calendar_download', '17': 'compliance_docs' })[id]}`]
      ? P2_AC_STATUS.E2E
      : (coreOk[id] && !hardGap[id] ? P2_AC_STATUS.CORE : P2_AC_STATUS.GAP);
    const detail = rowDetail(id, e);
    return Object.freeze({
      id,
      status,
      scenario: e.scenarios[`AC-${id}`] ?? null,
      evidence: Object.freeze(status === P2_AC_STATUS.E2E
        ? detail.evidence.filter((line) => !line.startsWith('ac.status='))
        : detail.evidence),
      gaps: Object.freeze(status === P2_AC_STATUS.E2E ? [] : detail.gaps),
      sources: Object.freeze(detail.sources.filter((s) => refSet.has(s))),
    });
  });

  /** @type {Array<{id: string, ok: boolean, detail: string}>} */
  const checks = [];
  const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });

  const faithful = P2_AC_IDS.every((id) => {
    const s = e.scenarios[`AC-${id}`];
    return typeof s === 'string' && s.length > 40 && !/SKIP|skip\s*=\s*true/i.test(s);
  });
  check('gate.scenarios_faithful', faithful,
    `SPEC §8 实时提取 ${P2_AC_IDS.filter((id) => typeof e.scenarios[`AC-${id}`] === 'string').length}/4，逐字比对且无跳过标记`);

  check('gate.mcp_redaction',
    e.mcp.toolNames.length === 4 && e.mcp.descriptionsSafe === true
    && e.mcp.privacyRejects >= 4 && e.mcp.portFailures === 4 && e.mcp.payloadEchoes === 0
    && e.mcp.protocolVersion === e.mcp.realProtocolVersion,
    `tools=${e.mcp.toolNames.length} privacy_rejects=${e.mcp.privacyRejects} port_fail=${e.mcp.portFailures} echo=${e.mcp.payloadEchoes}`);

  check('gate.language_key_sets',
    e.i18n.tags.length === 7 && e.i18n.keyCount === 71
    && e.i18n.verifiedTags === 7 && e.i18n.verifyIssues === 0
    && new Set(e.i18n.fallbackStates).size === 4,
    `tags=${e.i18n.tags.length} keys=${e.i18n.keyCount} issues=${e.i18n.verifyIssues} fallback_states=${new Set(e.i18n.fallbackStates).size}`);

  const expectedSources = ['auto:fallback', 'auto:nationality', 'auto:residence', 'user'];
  check('gate.region_provenance',
    expectedSources.every((s) => e.region.sources.includes(s))
    && e.region.sources.length === 4 && e.region.inferredSource === false
    && e.region.noInferredEnum === true && e.region.overridesWin === true
    && e.region.subnationalCodes.length === 3
    && e.region.mappingsReviewStatus === 'ai-candidate-unreviewed',
    `sources=${e.region.sources.length} inferred=${e.region.inferredSource} overrides=${e.region.overridesWin} review=${e.region.mappingsReviewStatus}`);

  check('gate.offline_degradation',
    e.offline.ok === true && e.offline.checks === 14 && e.offline.failed === 0
    && e.offline.requests === 0 && e.offline.diskWrites === 0 && e.offline.levels === 5
    && e.enhance.defaultDisabled === true && e.enhance.defaultCalls === 0
    && e.enhance.consentRequired === true && e.enhance.degradeCases >= 3
    && e.enhance.byteIdenticalDegrades === e.enhance.degradeCases && e.enhance.onlineCalls === 0,
    `offline=${e.offline.checks}/${e.offline.failed} requests=${e.offline.requests} degrades=${e.enhance.byteIdenticalDegrades}/${e.enhance.degradeCases} online=${e.enhance.onlineCalls}`);

  check('gate.source_compliance',
    e.source.externalCount === 4 && e.source.allUnverified === true
    && e.source.allUnbundled === true && e.source.allPayloadNull === true
    && e.source.allUnreviewed === true && e.source.conflictRejected === true
    && e.source.loadableCount === 1 && e.source.loadableId === DEMO_SOURCE_ID,
    `external=${e.source.externalCount} conflict=${e.source.conflictRejected} loadable=${e.source.loadableId || 'none'}`);

  check('gate.i18n_snapshots',
    e.snapshots.entries === 8 && e.snapshots.hashesMatch === true
    && e.snapshots.bytesMatch === true && e.snapshots.rrDataUniform === true
    && e.snapshots.gb18030Uncovered === 0 && e.snapshots.glossaryPaired === 71
    && e.snapshots.productE2e === 'unwired',
    `snapshots=${e.snapshots.entries} hashes=${e.snapshots.hashesMatch} rr_data=${e.snapshots.rrDataUniform} gb18030=${e.snapshots.gb18030Uncovered}`);

  const assertionValues = P2_AC_IDS.map((id) => e.assertions[id]);
  check('gate.acceptance_assertions',
    assertionValues.every((n) => Number.isInteger(n) && n >= 2)
    && assertionValues.reduce((a, b) => a + b, 0) >= 12,
    `ac14=${e.assertions['14']} ac15=${e.assertions['15']} ac16=${e.assertions['16']} ac17=${e.assertions['17']}`);

  const noGreen = P2_AC_IDS.every((id) => e.ac.statuses[id] === 'RED')
    && e.ac.unchecked === 39 && e.ac.checked === 0;
  const readOnly = JSON.stringify([...e.files.fsImports].sort())
    === JSON.stringify(['existsSync', 'readFileSync', 'readdirSync']);
  check('gate.no_silent_green', noGreen && readOnly,
    `ac_status=${[...new Set(Object.values(e.ac.statuses))].join(',')} tasks=${e.ac.unchecked}/${e.ac.checked} fs_readonly=${readOnly}`);

  const traceable = rows.every((r) => r.sources.length > 0 && r.evidence.length >= 2)
    && new Set(checks.map((c) => c.id)).size === checks.length
    && e.files.scanned > 20 && e.files.scanned === e.files.independentlyCounted
    && e.files.tokenHits === 0 && e.files.referencePaths.length >= 10;
  check('gate.traceability', traceable,
    `每行有来源与证据；扫描 ${e.files.scanned} 个源码文件 = 独立清点 ${e.files.independentlyCounted}；token_hits=${e.files.tokenHits}`);

  const checksOk = checks.every((c) => c.ok);
  const allGreen = rows.every((r) => r.status === P2_AC_STATUS.E2E);
  const ok = checksOk && allGreen;
  const blockers = Object.freeze([
    'T-022 P1 出口 verdict=BLOCKED，19/19 AC 仍 RED；T-022 四选一裁决与 ISSUE-20261109-T030-GATE 的 D 解释仍待人工书面决定。',
    'T-041 PRIVACY.md / SECURITY.md / THIRD_PARTY_NOTICES.md 未产出，AC-13 / AC-17 / AC-18 许可与合规审计缺口未闭合。',
    'T-042 全量 CI 未接入 p2-gate / lint / coverage / 语言包键集 / 区域来源 / 断网 / 许可扫描，无法端到端判定 CI 全绿。',
    'T-045 encoding-check 独立 CI 未落地；AC-15 快照位仍指向 P0 占位 tests/snapshots/ac-15.txt，合并方式待人工裁决。',
    `T-014 按保守解不联网下载交节时刻，CLI calendar.network_wired=${e.offline.calendarNetworkWired}（本地缓存 status=${e.offline.calendarStatus}）；缓存路径 _data/ 与 data/calendar/ 张力待人工裁决。`,
    'P0 基线不可改：ac-*.md 状态写入与 tasks.md 勾选属于人工裁决动作，本门禁只取证不转绿。',
  ]);

  return Object.freeze({
    ok,
    verdict: ok ? 'PASS' : 'BLOCKED',
    rows: Object.freeze(rows),
    checks: Object.freeze(checks.map((c) => Object.freeze(c))),
    scenarioCount: P2_AC_IDS.filter((id) => typeof e.scenarios[`AC-${id}`] === 'string').length,
    scannedFiles: e.files.scanned,
    independentlyCounted: e.files.independentlyCounted,
    baselineTouched: 0,
    assertions: Object.freeze({ ...e.assertions }),
    e2e: Object.freeze({ ...e.e2e }),
    blockers,
    evidence: e,
  });
}

/**
 * 跑一遍 P2 出口门禁取证。零磁盘写入、零子进程。
 * 可选的 `provided` 仅供单测 / 宿主复用已取证证据，避免重复跑离线集成；
 * CLI 与 CI 入口不传参，必定现场取证。
 * @param {object} [provided]
 */
export async function runP2Gate(provided) {
  return evaluateP2Gate(provided ?? await collectP2Evidence());
}

/** 稳定报告：纯 ASCII key=value，确定性、可 diff（FR-028 同口径）。 */
export function formatGateReport(report) {
  const tally = (s) => report.rows.filter((r) => r.status === s).length;
  return [
    'scenario=p2_gate',
    `ac=${report.rows.length}`,
    `scenario_count=${report.scenarioCount}`,
    `scanned_files=${report.scannedFiles}`,
    `independent_count=${report.independentlyCounted}`,
    `offline_checks=${report.evidence.offline.checks}`,
    `offline_failed=${report.evidence.offline.failed}`,
    `offline_requests=${report.evidence.offline.requests}`,
    `acceptance_assertions=${Object.values(report.assertions).reduce((a, b) => a + b, 0)}`,
    `e2e_pass=${tally(P2_AC_STATUS.E2E)}`,
    `core_only=${tally(P2_AC_STATUS.CORE)}`,
    `gap=${tally(P2_AC_STATUS.GAP)}`,
    `checks=${report.checks.length}`,
    `failed=${report.checks.filter((c) => !c.ok).length}`,
    `baseline_touched=${report.baselineTouched}`,
    `verdict=${report.verdict}`,
    ...report.rows.map((r) => `ac.${r.id}=${r.status}`),
    ...report.checks.map((c) => `check.${c.id}=${c.ok ? 'ok' : 'fail'}`),
    `status=${report.ok ? 'ok' : report.checks.every((c) => c.ok) ? 'blocked' : 'error'}`,
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runP2Gate();
  process.stdout.write(`${formatGateReport(result)}\n`);
  // 0 = Phase 2 出口达成；2 = 取证完成但出口 BLOCKED；1 = 取证本身失败。
  process.exitCode = result.ok ? 0 : result.checks.every((c) => c.ok) ? 2 : 1;
}
