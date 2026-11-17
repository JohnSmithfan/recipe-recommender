// SPDX-License-Identifier: GPL-3.0-only
// [AIGC] T-042 · §10 社区规范文件静态门禁（FR-036 / FR-039 / AC-13 / SC-007 / P-09） · 审计追踪 ID: RR-T042-20261113-0001 · 待人工审查（P-10）
/**
 * CI `community-files` job 的实体实现；`node scripts/community-files.mjs` 可独立复跑。
 *
 * 与 T-040 单测的差别：那里锁定的是 T-040 责任子集的十条固定清单；这里**动态解析**
 * `SPEC.md §10` 表格中级别以「必需」开头的全部条目（含目录项），因此规格表若新增
 * 必需文件而仓库未补齐，本门禁会立即转红，不依赖人工同步清单（防漂移）。
 *
 * 边界：零第三方依赖，故 Issue forms 只做文本级结构断言；完整 YAML 语法校验由
 * GitHub Actions 运行时解析与人工审查承担，本脚本不假称等价。建议 / 可选文件按
 * §10 v1 分发口径「登记不产出」。§10 100% + AC-13/18/19 转绿仍归 T-046。
 *
 * 令牌规则由 scan-common.mjs 的 tokenRule() 统一读取，本脚本不接触令牌字面量。
 * 不写盘、不联网。
 *
 * 用法：`node scripts/community-files.mjs` → 纯 ASCII key=value 报告，exit 0/1。
 */
import {
  safeRead, exists, sizeOf, dirNonEmpty, spec10Required, check, emitReport,
} from './scan-common.mjs';

/** @type {Array<{id: string, ok: boolean, detail: string}>} */
const checks = [];
const add = (id, ok, detail) => checks.push(check(id, ok, detail));

// 1. 动态解析 §10「必需」条目：文件存在且非空，目录存在且非空。
const required = spec10Required();
const missing = required.filter((rel) => (rel.endsWith('/')
  ? !dirNonEmpty(rel.replace(/\/$/, ''))
  : (!exists(rel) || sizeOf(rel) === 0)));
add('spec10_required', required.length >= 20 && missing.length === 0,
  `必需项=${required.length} / 缺失=${missing.join(',') || 'none'}`);

// 2. Issue / PR 模板与 CODEOWNERS 文本级结构断言（零依赖，不引 YAML 解析器）。
const forms = [
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/CODEOWNERS',
];
const formsOk = forms.every((rel) => {
  const t = safeRead(rel);
  return t.length > 0 && !t.includes('\t');
})
  && ['name:', 'description:', 'body:', 'id:'].every((k) => safeRead(forms[0]).includes(k))
  && ['name:', 'description:', 'body:', 'FR-', 'AC-'].every((k) => safeRead(forms[1]).includes(k))
  && ['blank_issues_enabled:', 'contact_links:'].every((k) => safeRead(forms[2]).includes(k))
  && ['FR-', 'AC-', 'SC-', 'SPEC.md'].every((k) => safeRead(forms[3]).includes(k))
  && safeRead(forms[4]).includes('* @');
add('issue_forms', formsOk, `模板数=${forms.length} / 文本级结构齐备=${formsOk}`);

// 3. 建议 / 可选文件按登记处理，v1 不产出实体文件（§10 / FR-039 / FR-052）。
const optional = [
  '.github/FUNDING.yml', 'GOVERNANCE.md', 'CITATION.cff', '.github/dependabot.yml',
  '.github/workflows/release.yml', 'CONTRIBUTORS.md', 'AUTHORS.md',
];
const built = optional.filter(exists);
const contributing = safeRead('CONTRIBUTING.md');
add('optional_not_built', built.length === 0
  && ['FUNDING.yml', 'GOVERNANCE.md', 'CITATION.cff'].every((n) => contributing.includes(n)),
`误产出=${built.join(',') || 'none'}`);

// 4. 社区 / 合规文档均带 [AIGC] 与待人工审查标注（P-10）。
const docs = [
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md',
  'CHANGELOG.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md',
];
const unmarked = docs.filter((rel) => !/\[AIGC\]/.test(safeRead(rel))
  || !/人工审查|待人工|人工确认/.test(safeRead(rel)));
add('aigc_markers', unmarked.length === 0, `未标注=${unmarked.join(',') || 'none'}`);

emitReport('community-files', checks);
