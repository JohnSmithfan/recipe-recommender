// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-045 · 中文 GB 18030-2022 实现级别 1 静态编码校验（FR-043 / AC-15 / SC-011 / ADR-003 §4.7） · 审计追踪 ID: RR-T045-20261117-0001 · 待人工审查（P-10） · 许可：GPL-3.0-only
/**
 * `node scripts/encoding-check.mjs` 可独立复跑，输出纯 ASCII `key=value`，`status=` 收尾。
 *
 * 定位：**静态取证器，不是 AC 转绿裁决器**（与 p1/p2 gate / T-043 / T-044 同口径）。
 * 校验 FR-043：面向中国市场发行时中文输出的汉字落在 GB 18030-2022 实现级别 1
 * 覆盖范围内，落盘编码仍统一 UTF-8。本脚本只回答「当前仓库的中文输出静态证据
 * 是否满足该约束」，**不**把 `ac-15.md` 转绿（归 T-046 人工裁决）。
 *
 * 判据复用 T-036 的单一实现：`tests/snapshots/i18n/fixture.mjs` 的
 * `gb18030Level1Chars()` 由 full-ICU gb18030 解码器**动态枚举双字节区**
 * （0x81..0xFE × 0x40..0xFE，排除 0x7F），零内置清单、零伪造映射；四字节区
 * 字符一律判为未覆盖（级别 2 才要求）。本脚本**不复制码表、不内置汉字清单**，
 * 只重新导出该函数以保证单一实现（修改判据只需改 T-036 一处）。
 *
 * 六项检查：`utf8_valid`（语言包 / 快照均合法 UTF-8）、`language_pack_coverage`
 * （zh-Hans 71 键中文值零未覆盖）、`snapshot_coverage`（8 份真实 render() 快照
 * 中文正文零未覆盖）、`manifest_consistent`（manifest 的 cjk_count /
 * gb18030_l1_uncovered 与现场重算一致）、`four_byte_honest`（四字节区如实判未覆盖）、
 * `fictional_no_real_data`（令牌规则零命中，零真实身体数据）。
 *
 * 判定逻辑抽成 `evaluateEncodingCheck(evidence)` 纯函数，支持逐项 `break_<id>`
 * 负向注入与 `uncoveredHanzi` 真阳性注入；单测零子进程，避免加剧
 * ISSUE-20261114-T042-COVERAGE-TIMEOUT 的并发耦合。零第三方依赖、只读、零写盘、
 * 零网络；令牌规则由 scan-common.mjs 的 tokenRule() 从 ci.yml 唯一权威读取。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { ROOT, walk, read, safeRead, exists, check, tokenRule } from './scan-common.mjs';
import {
  gb18030Level1Chars, uncoveredCjk, cjkChars,
} from '../tests/snapshots/i18n/fixture.mjs';

/** 重新导出 T-036 判据，保证单一实现（不复制、不内置清单）。 */
export { gb18030Level1Chars };

/** 检查项 ID（与 tests/unit/t045-encoding-check.test.js 的 T045_CHECKS 一一对应）。 */
export const CHECK_IDS = Object.freeze([
  'utf8_valid', 'language_pack_coverage', 'snapshot_coverage',
  'manifest_consistent', 'four_byte_honest', 'fictional_no_real_data',
]);

/** 快照目录与语言包路径（相对仓库根）。 */
const SNAPSHOT_DIR = 'tests/snapshots/i18n';
const ZH_PACK = 'locales/zh-Hans/strings.json';
const MANIFEST = `${SNAPSHOT_DIR}/manifest.json`;
/** 四字节区代表字符（级别 2 才要求，v1 必须如实判未覆盖）。 */
const FOUR_BYTE_SAMPLE = '\u{20000}';

/**
 * 规范化「干净证据」。所有判定项都由字段推导，没有任何一项恒为 true。
 * 真实现场由 collectEncodingEvidence() 采集；本 fixture 供单测正/负向注入。
 */
export const CLEAN_FIXTURE = Object.freeze({
  utf8Valid: true,
  languagePackUncovered: Object.freeze([]),
  snapshotUncovered: Object.freeze([]),
  manifestConsistent: true,
  fourByteHonest: true,
  tokenHits: Object.freeze([]),
  uncoveredHanzi: Object.freeze([]),
  languagePackHanziCount: 156,
  snapshotHanziCount: 416,
});

/**
 * 判定纯函数：注入证据 → 六项检查 + verdict。
 * `break_<id>` 逐项打红；`uncoveredHanzi` 模拟级别 1 未覆盖汉字（真阳性）。
 * @param {object} evidence
 */
export function evaluateEncodingCheck(evidence) {
  const ev = { ...CLEAN_FIXTURE, ...evidence };
  const broken = (id) => ev[`break_${id}`] === true;
  const packMiss = [...ev.languagePackUncovered, ...ev.uncoveredHanzi];

  const checks = [
    check('utf8_valid',
      ev.utf8Valid === true && !broken('utf8_valid'),
      `语言包与快照均合法 UTF-8=${ev.utf8Valid}`),

    check('language_pack_coverage',
      packMiss.length === 0 && ev.languagePackHanziCount > 0
      && !broken('language_pack_coverage'),
      `zh-Hans 汉字=${ev.languagePackHanziCount} / 未覆盖=${packMiss.length}`),

    check('snapshot_coverage',
      ev.snapshotUncovered.length === 0 && ev.snapshotHanziCount > 0
      && !broken('snapshot_coverage'),
      `快照汉字=${ev.snapshotHanziCount} / 未覆盖=${ev.snapshotUncovered.length}`),

    check('manifest_consistent',
      ev.manifestConsistent === true && !broken('manifest_consistent'),
      `manifest 字段与现场重算一致=${ev.manifestConsistent}`),

    check('four_byte_honest',
      ev.fourByteHonest === true && !broken('four_byte_honest'),
      `四字节区如实判未覆盖=${ev.fourByteHonest}`),

    check('fictional_no_real_data',
      ev.tokenHits.length === 0 && !broken('fictional_no_real_data'),
      `真实数据令牌命中=${ev.tokenHits.length}`),
  ];

  const failed = checks.filter((c) => !c.ok).length;
  return Object.freeze({
    checks: Object.freeze(checks),
    failed,
    verdict: failed === 0 ? 'STATIC_ONLY' : 'BLOCKED',
    ac15_green: false,
    language_pack_hanzi: ev.languagePackHanziCount,
    snapshot_hanzi: ev.snapshotHanziCount,
    uncovered_total: packMiss.length + ev.snapshotUncovered.length,
    end_to_end: 'unverified',
  });
}

/** 合法 UTF-8 判定：fatal 解码器遇非法字节抛错。 */
function isUtf8(buf) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

/** 从真实仓库只读取证，返回与 CLEAN_FIXTURE 同构的证据对象。 */
export function collectEncodingEvidence() {
  const covered = gb18030Level1Chars();
  const files = walk();

  // UTF-8 合法性：语言包全部 + 快照 markdown 全部
  const textFiles = files.filter((rel) => /^locales\/[^/]+\/strings\.json$/.test(rel)
    || new RegExp(`^${SNAPSHOT_DIR}/[^/]+\\.md$`).test(rel));
  const utf8Valid = textFiles.length > 0 && textFiles.every((rel) => {
    try { return isUtf8(readFileSync(join(ROOT, rel))); } catch { return false; }
  });

  // 语言包中文值覆盖
  const pack = JSON.parse(read(ZH_PACK));
  const packText = Object.values(pack).filter((v) => typeof v === 'string').join('');
  const languagePackHanzi = [...new Set(cjkChars(packText))];
  const languagePackUncovered = [...new Set(languagePackHanzi)].filter((c) => !covered.has(c));

  // 快照中文正文覆盖
  const snapshots = files.filter((rel) => new RegExp(`^${SNAPSHOT_DIR}/[^/]+\\.md$`).test(rel));
  const snapHanzi = new Set();
  for (const rel of snapshots) {
    for (const c of cjkChars(read(rel))) snapHanzi.add(c);
  }
  const snapshotHanziCount = snapHanzi.size;
  const snapshotUncovered = [...snapHanzi].filter((c) => !covered.has(c));

  // manifest 字段与现场重算一致。注意 T-036 口径：entry.cjk_count 是**该快照正文**
  // 的 CJK 去重数（zh-Hans.md = 142），不是语言包值去重数（156）。逐 entry 校验。
  let manifestConsistent = false;
  if (exists(MANIFEST)) {
    const manifest = JSON.parse(read(MANIFEST));
    const entries = manifest.entries ?? [];
    const perEntry = entries.every((e) => {
      const body = e.file ? safeRead(`${SNAPSHOT_DIR}/${e.file}`) : '';
      const count = new Set(cjkChars(body)).size;
      return count === e.cjk_count && e.gb18030_l1_uncovered === 0;
    });
    const zh = entries.find((e) => e.tag === 'zh-Hans');
    manifestConsistent = entries.length === 8 && perEntry
      && Boolean(zh) && zh.cjk_count === 142
      && languagePackUncovered.length === 0 && snapshotUncovered.length === 0;
  }

  // 四字节区如实判未覆盖（判据来自 T-036 动态枚举集合）
  const fourByteHonest = covered.has(FOUR_BYTE_SAMPLE) === false;

  // 令牌零命中：唯一权威在 ci.yml，动态读取、零复制
  const tokens = tokenRule();
  const tokenHits = files.filter((rel) => rel !== '.github/workflows/ci.yml')
    .filter((rel) => { try { return tokens.test(read(rel)); } catch { return false; } });

  return {
    utf8Valid,
    languagePackUncovered,
    snapshotUncovered,
    manifestConsistent,
    fourByteHonest,
    tokenHits,
    uncoveredHanzi: Object.freeze([]),
    languagePackHanziCount: languagePackHanzi.length,
    snapshotHanziCount,
  };
}

/** 纯 ASCII 报告；`status=` 收尾，exit 0/1。 */
function emit(result) {
  const lines = [
    'tool=encoding-check',
    `checks=${result.checks.length}`,
    `failed=${result.failed}`,
    ...result.checks.map((c) => `check.${c.id}=${c.ok ? 'ok' : 'fail'}`),
    `language_pack_hanzi=${result.language_pack_hanzi}`,
    `snapshot_hanzi=${result.snapshot_hanzi}`,
    `uncovered_total=${result.uncovered_total}`,
    `level1_table=dynamic-enum`,
    `on_disk_encoding=UTF-8`,
    `end_to_end=${result.end_to_end}`,
    `ac15_green=${result.ac15_green}`,
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
  emit(evaluateEncodingCheck(collectEncodingEvidence()));
}
