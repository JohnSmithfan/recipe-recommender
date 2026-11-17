// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · 许可与 Corresponding Source 静态扫描（FR-032 / FR-037 / FR-052 / AC-13 / AC-18 / P-07 / P-16） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * CI `license-scan` job 的实体实现；`node scripts/license-scan.mjs` 可独立复跑。
 *
 * 六项静态取证：LICENSE 为 GPL-3.0 全文、THIRD_PARTY_NOTICES 逐项对齐数据源目录、
 * 零真实第三方本体（bundled=false）、无受版权保护指南原文、实现主体为人类可读源码
 * 且无机器码绑定二进制、全仓源码 SPDX 头齐备。
 *
 * 本脚本**不做法律意见判定**：T-035 定案「零真实第三方数据本体」下，
 * `THIRD_PARTY_NOTICES.md` 只是元数据候选声明清单；AC-18 的三项数据源边界仍待
 * 人工许可审计与 T-046 裁决（ISSUE-20261113-T041-NOTICE-SCOPE）。
 *
 * 令牌规则由 scan-common.mjs 的 tokenRule() 统一读取，本脚本不接触令牌字面量。
 * 不写盘、不联网、不引入第三方依赖。
 *
 * 用法：`node scripts/license-scan.mjs` → 纯 ASCII key=value 报告，exit 0/1。
 */
import {
  walk, read, safeRead, exists, SPDX_HEADER, check, emitReport,
} from './scan-common.mjs';

/** @type {Array<{id: string, ok: boolean, detail: string}>} */
const checks = [];
const add = (id, ok, detail) => checks.push(check(id, ok, detail));

// 1. LICENSE 必须是 GPL-3.0 全文且随 clone 分发（FR-037 / AC-13 / SC-014）。
const licenseText = safeRead('LICENSE');
add('license_full', licenseText.length > 30000
  && /GNU GENERAL PUBLIC LICENSE/.test(licenseText)
  && /Version 3, 29 June 2007/.test(licenseText)
  && /TERMS AND CONDITIONS/.test(licenseText), `LICENSE 字节数=${licenseText.length}`);

// 2. NOTICES 逐项对齐 data/source/catalog.json 五条 descriptor（唯一权威，防漂移）。
const catalog = JSON.parse(read('data/source/catalog.json'));
const notices = safeRead('THIRD_PARTY_NOTICES.md');
const fields = ['id', 'license', 'version', 'source_url', 'review_status'];
const missing = catalog.sources.flatMap((s) => fields
  .filter((f) => !notices.includes(String(s[f]))).map((f) => `${s.id}.${f}`));
add('notices_catalog', notices.length > 200 && catalog.sources.length === 5 && missing.length === 0,
  `缺失字段=${missing.join(',') || 'none'}`);

// 3. 零真实第三方本体：四条外部 / 用户源 bundled=false + payload_path=null，
//    唯一可载源是完全虚构的 synthetic-demo（T-035 定案）。
const external = catalog.sources.filter((s) => s.id !== 'synthetic-demo');
const demo = catalog.sources.find((s) => s.id === 'synthetic-demo');
add('bundled_sources', external.length === 4
  && external.every((s) => s.bundled === false && s.payload_path === null)
  && Boolean(demo) && demo.bundled === true && typeof demo.payload_path === 'string'
  && exists(demo.payload_path) && /example\.invalid/.test(demo.source_url),
`外部源=${external.length} / 虚构源可载=${Boolean(demo)}`);

// 4. 不复制受版权保护的指南原文 / 图表（FR-032 / AC-13）：
//    data/guideline 与 data/source 目录内不得出现显著版权标识；generic-guideline
//    必须是自撰中立系数，社区准则不得复制 Contributor Covenant 原文。
const guideline = JSON.parse(read('data/guideline/generic-guideline.json'));
const dataFiles = walk().filter((rel) => /^data\/(guideline|source)\//.test(rel) && /\.(json|md)$/.test(rel));
const MARKERS = /版权所有翻印必究|All rights reserved\.|Dietary Guidelines for Americans|中国居民膳食指南（|Contributor Covenant 全文/;
const copied = dataFiles.filter((rel) => {
  try { return MARKERS.test(read(rel)); } catch { return false; }
});
add('copyrighted_guideline', guideline.id === 'generic-guideline'
  && guideline.source === 'neutral-baseline' && copied.length === 0
  && !/Our Pledge/.test(safeRead('CODE_OF_CONDUCT.md')),
`扫描 ${dataFiles.length} 份数据文件；版权标识命中=${copied.length}`);

// 5. Corresponding Source：实现主体是人类可读的 .js/.json/.md 文本，
//    仓库内无机器码 / ISA 绑定二进制作为实现主体（P-16 / AC-19 / NFR-015）。
const impl = walk().filter((rel) => rel.startsWith('src/')
  && !rel.endsWith('.gitkeep') && !rel.endsWith('.DS_Store'));
const nonText = impl.filter((rel) => !/\.(js|json|md)$/.test(rel));
const binaries = walk().filter((rel) => /\.(wasm|exe|so|dll|class|o|bin|pyc|jar)$/i.test(rel));
add('corresponding_source', impl.length > 0 && nonText.length === 0
  && binaries.length === 0 && exists('LICENSE'),
`实现文件=${impl.length} / 非文本=${nonText.length} / 二进制=${binaries.length}`);

// 6. 全仓 JS / MJS 源码 SPDX 头齐备（FR-037 / P-07）。
const sources = walk().filter((rel) => /\.(js|mjs)$/.test(rel));
const noSpdx = sources.filter((rel) => {
  try { return !read(rel).startsWith(SPDX_HEADER); } catch { return true; }
});
add('spdx_headers', sources.length > 0 && noSpdx.length === 0,
  `源码=${sources.length} / 缺 SPDX=${noSpdx.slice(0, 3).join(',') || 'none'}`);

emitReport('license-scan', checks);
