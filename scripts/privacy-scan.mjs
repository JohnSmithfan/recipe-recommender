// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · 隐私 / 离线静态扫描（FR-047～049 / FR-052 / FR-053 / AC-12 / AC-18 / SC-014） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * CI `privacy-scan` job 的实体实现；`node scripts/privacy-scan.mjs` 可独立复跑。
 *
 * 七项静态取证：真实身体数据令牌、diet-plan 数据目录、包管理器清单、发布字段、
 * 核心源码网络出口 / LLM / 在线翻译、日志脱敏契约、完全虚构示例档案。
 *
 * 令牌规则由 scan-common.mjs 的 tokenRule() 从 `.github/workflows/ci.yml` 唯一权威声明
 * 动态读取，本脚本绝不复制任何真实数据字面量；`ci.yml` 自身含规则声明，扫描时排除，
 * 与 T-006 / T-021 / T-037 既有口径一致。
 *
 * 边界：静态扫描**不能**证明运行期零上传，运行期证据由
 * `tests/acceptance/offline-integration.mjs` 的缺席 / 哨兵双模式提供（CI `offline` job）。
 * 本脚本不写盘、不联网、不引入第三方依赖。
 *
 * 用法：`node scripts/privacy-scan.mjs` → 纯 ASCII key=value 报告，exit 0/1。
 */
import {
  CI_SELF, walk, read, safeRead, exists, codeOnly, tokenRule, check, emitReport,
} from './scan-common.mjs';

/** @type {Array<{id: string, ok: boolean, detail: string}>} */
const checks = [];
const add = (id, ok, detail) => checks.push(check(id, ok, detail));

// 1. 真实身体数据令牌：全仓（排除规则声明自身与扫描器自身）零命中。
const tokens = tokenRule();
const excluded = new Set([CI_SELF, 'scripts/privacy-scan.mjs']);
const tokenHits = walk().filter((rel) => !excluded.has(rel)).filter((rel) => {
  try { return tokens.test(read(rel)); } catch { return false; }
});
add('tokens', tokenHits.length === 0,
  `命中文件数=${tokenHits.length} 例=${tokenHits.slice(0, 3).join(',')}`);

// 2. `../diet-plan/` 的真实数据目录一律不得进入仓库（FR-053 / P-14）。
const dietDirs = ['diet-plan', '_diet-plan', 'diet-plan-import'].filter((d) => exists(d));
add('diet_plan_dirs', dietDirs.length === 0, `目录命中=${dietDirs.join(',') || 'none'}`);

// 3. v1 分发口径：无包管理器清单、无发布流水线（FR-039 / FR-052 / AC-18 / SC-014）。
const manifests = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', '.npmrc',
  '.github/workflows/publish.yml', '.github/workflows/npm-publish.yml',
  '.github/workflows/release.yml',
].filter((f) => exists(f));
add('package_manifests', manifests.length === 0, `清单命中=${manifests.join(',') || 'none'}`);

// 4. package.json 禁止出现任何发布字段，且保持零第三方依赖 / private / GPL-3.0-only。
const pkg = JSON.parse(read('package.json'));
const banned = ['publishConfig', 'files', 'bin', 'prepack', 'postpack'];
const badFields = banned.filter((k) => k in pkg || k in (pkg.scripts ?? {}));
add('publish_fields', badFields.length === 0 && pkg.private === true
  && pkg.license === 'GPL-3.0-only' && pkg.dependencies === undefined
  && pkg.devDependencies === undefined, `越界字段=${badFields.join(',') || 'none'}`);

// 5. 网络出口 / LLM / 在线翻译：剥整行注释后扫描核心实现源码（FR-048 / FR-051 / NFR-009）。
//    唯一对外出口在 src/io/net.js，且受 assertSafeCalendarUrl 约束，不在本次扫描范围内。
const sourceDirs = ['src/core', 'src/cli', 'src/mcp'];
const implFiles = walk().filter((rel) => sourceDirs.some((d) => rel.startsWith(`${d}/`)) && /\.js$/.test(rel));
const NET = /\bfetch\s*\(|globalThis\.fetch|from\s+['"]node:https?['"]|XMLHttpRequest\b|https?\.(?:get|request)\s*\(/;
const LLM = /\bllmPort\b|\bopenai\b|\banthropic\b|\bllm\.(?:complete|generate)\s*\(/;
const TRANSLATE = /\.translate\s*\(|\btranslationPort\b/;
const netHits = implFiles.filter((rel) => NET.test(codeOnly(read(rel))));
const llmHits = implFiles.filter((rel) => LLM.test(codeOnly(read(rel))));
const translateHits = implFiles.filter((rel) => TRANSLATE.test(codeOnly(read(rel))));
add('network_exits', implFiles.length > 0 && netHits.length === 0
  && llmHits.length === 0 && translateHits.length === 0,
`扫描 ${implFiles.length} 个实现文件；网络=${netHits.length} / LLM=${llmHits.length} / 在线翻译=${translateHits.length}`);

// 6. 日志脱敏：固定键集白名单 + 类型层拒绝数值，零时间戳 / 零环境 / 零身体字段。
const logText = safeRead('src/io/log.js');
const logCode = codeOnly(logText);
const privateFields = /body_fat|weight_kg|height_cm|birth_date|blood_pressure/;
add('log_redaction', logText.length > 0 && /LOG_KEYS/.test(logText)
  && /'code', 'event', 'field'/.test(logText)
  && /typeof event !== 'string'/.test(logText)
  && !privateFields.test(logText)
  && !/Date\.now|Math\.random|process\.env|fetch\s*\(/.test(logCode),
'日志固定键集 / 类型层拒数值 / 零时间戳 / 零身体字段');

// 7. 示例档案恰为两份完全虚构值，且个人档案目录被版本控制忽略（FR-034 / FR-035 / AC-12）。
const profiles = walk().filter((rel) => /^examples\/profiles\/[^/]+\.json$/.test(rel));
const fictional = profiles.length === 2
  && profiles.every((rel) => JSON.parse(read(rel)).fictional === true);
const ignored = /^\/profiles\/$/m.test(safeRead('.gitignore'));
add('fixtures_fictional', fictional && ignored,
  `虚构档案=${profiles.length} / .gitignore 忽略 profiles=${ignored}`);

emitReport('privacy-scan', checks);
