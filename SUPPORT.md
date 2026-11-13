# SUPPORT.md · 获取帮助

> [AIGC] 本文件由 AI 依据 `SPEC.md §10` / `constitution.md` 生成 · 审计追踪 ID：`RR-T040-20261113-0001` · **待人工审查（P-10）**
> 许可：本仓库采用 **GPL-3.0-only**；本文件为仓库文档，随源码一同分发。
> **免责声明**：本项目是膳食规划参考工具，所有营养数值为估算值，**不构成医疗或营养建议**（非医疗处方）；如有健康需求请咨询专业人士（P-08 / FR-033）。[AIGC] 相关输出须经人工审查。

---

## 1. 提问路径

| 场景 | 路径 |
|---|---|
| 缺陷 / 可复现的异常 | `.github/ISSUE_TEMPLATE/bug_report.yml`（Issue 分类：`bug`） |
| 新功能 / 需求提案 | `.github/ISSUE_TEMPLATE/feature_request.yml`（须关联 FR / AC） |
| 用法、理解、方案讨论 | **Discussions / 讨论** 入口（待维护者启用；占位配置见 `.github/ISSUE_TEMPLATE/config.yml`） |
| 疑似安全漏洞 | **不要**用公开 Issue，按 `SECURITY.md` 的私有报告渠道 |
| 社区行为相关 | 按 `CODE_OF_CONDUCT.md` 的私有报告渠道 |

当前 Discussions 入口与私有报告渠道的启用状态**需维护者人工确认**；本文件不填写任何真实个人邮箱、账号或外部链接（占位 URL 均为虚构）。

## 2. Issue 分类与提交前自查

- `bug`：能稳定复现、已脱敏、附版本与最小步骤；**不要**贴真实身体数据、本地计划 / 台账 / 日志原文或真实个人档案（P-06 / P-14 / FR-053）。
- `feature`：写清 Given/When/Then 场景，并关联 `FR-xxx` / `AC-xx` / `SC-xxx`（P-02 / P-03）。
- `question`：先查 `README.md`、`SPEC.md`、`CONTRIBUTING.md`、`plan.md` 与各模块 README。
- 提交前确认：不是医疗或营养咨询问题；不是让 AI 绕过 `constitution.md` 原则的请求；不是要求提前把红态基线改成 GREEN 的请求。

## 3. 当前状态（提问前请先读）

- 本项目处于 **SDD / ATDD 逐任务推进**阶段：P1 / P2 出口门禁均为 `verdict=BLOCKED` / exit 2，`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`。
- `.github/workflows/ci.yml` 仍是 T-006 六 job 骨架；「CI 绿」只表示骨架可运行 + 红态基线完整，**不代表验收通过**（P-02 / AC-14）。
- 因此**没有**可供终端用户安装运行的稳定版本，也**没有**已发布 Release；当前可复跑的是 `npm test` / `npm run lint` / `npm run spec-check` / `npm run acceptance` 与两个门禁取证器（见 `CONTRIBUTING.md §1`）。

## 4. 我们不提供什么

- 不提供个性化医疗、营养诊断或处方；不解读真实身体数据。
- 不提供在线服务、账号、云端同步或托管后端；所有计划与台账纯本地。
- 不通过 IP / 定位 / 静默推断解析国籍或居住地（P-12）。
- 不提供包管理器安装方式；v1 分发仅为 GitHub Releases 源码归档 + 校验和与 Git 源码（FR-052）。

---

本文件由 AI 生成，**待人工审查（P-10）**；审查通过前仅作为候选支持路径说明。
