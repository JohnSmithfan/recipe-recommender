# T-032 报告 · `resolveLocalePolicy(profile, overrides)` 区域策略解析

> 日期：2026-11-10 · 基线提交：`6772704`（T-031，仅本地 commit、未 push，本地 `main...origin/main [ahead 1]`）
> 映射：FR-003 / FR-045 / FR-046、AC-16、SC-012、NFR-012、P-12、E-13 / E-14 · `tasks.md §4.2 T-032`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T032-20261110-0001`

---

## 0. 结论摘要

T-032 按 ATDD 先红后绿完成：25 条新单测，全量 `383/383`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.56 / 84.23 / 98.37`（三列均 ≥80）、独立负向探针 `20/20`。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / `status=blocked` / exit 2，
`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。
本次交付**不代表 P1 出口达成、不代表 M3/M4 验收通过、不代表 AC-16 转绿**。

---

## 1. 本轮起点与门槛

用户指令「commit, 继续 T-032」分两步执行：

1. 按 P-10 把 T-031 的 22 个文件提交为 `6772704`（`22 files changed, +1661 −7`），
   工作树归零、身份 `r4fpsdmyr7-blip` 未变、**仅本地 commit，未 push**。
2. T-032 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `tasks.md:111` | T-032 = `resolveLocalePolicy(profile, overrides)`；国籍 → 居住地 → 用户覆盖 → 回退；头部记录 `auto:nationality` / `auto:residence` / `user` / `auto:fallback`；**禁止 IP / 定位 / 静默推断** |
| `SPEC.md` FR-045 | 默认按**声明国籍**解析，缺失或不足时按**声明居住地**；无法解析回退中立通用基线并明确标注 |
| `SPEC.md` FR-046 | 用户可显式覆盖指南 / 历法 / 语言 / 单位，覆盖优先；计划头部 MUST 记录最终策略及来源 |
| `plan.md §5.1` | `locale_policy` 七项（两份虚构 fixture 的 `expected_source=auto:fallback`） |
| `src/cli/plan.js` | `assertPolicy` 只接受**固定五键** `language_tag / guideline_id / calendar_id / unit_system / locale_source` |
| `src/cli/README.md §4` | `resolveLocalePolicy` 是 `plan` 的**注入端口**，归 T-032；缺端口即 `ERR_CLI_PORT` |
| `tasks.md:113` | 区域映射表 `data/region/` 属 **T-033**，本任务不预置 |
| `AC-16` | 仍是 P0 登记的 RED 基线；主责任务 T-032 / T-033 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/locale-policy.test.js` → `ERR_MODULE_NOT_FOUND: src/core/locale/index.js`，确认实现存在前为红 |
| 首次 GREEN 尝试 | `24/25`；唯一失败是「部分字段覆盖时决策链未记录 `locale.step.override`」——**修实现补留痕，未改测试、未放宽断言** |
| GREEN | 重跑 `25/25 pass` |
| 防假绿 | 负向探针对畸形映射表 / 未知覆盖键 / 伪造 `auto:inferred` / 地区级条目 / 网络与环境哨兵全部要求明确失败 |

`AC-16` 本身一行未改，**仍为 RED**；T-032 只提供策略层的可执行取证。

---

## 3. 产出

| 文件 | 内容 |
|------|------|
| `src/core/locale/policy.js` | `LOCALE_SOURCES` / `POLICY_FIELDS` / `OVERRIDE_FIELDS` / `SUBNATIONAL_REGION_CODES` / `NEUTRAL_BASELINE`；9 个 `POLICY_ERROR` 稳定码；`POLICY_FALLBACK` / `POLICY_STEP` Canonical ID；`assertRegionMappings` / `explainLocalePolicy` / `resolveLocalePolicy` / `createLocalePolicyResolver`。纯函数、零 IO、零网络、零真实映射 |
| `src/core/locale/index.js` | T-031 回退链 + T-032 策略的统一出口（T-031 刻意留给 T-032 补建，lint 预留占位由此自然清空，**未改 lint 脚本、未放宽判定**） |
| `tests/unit/locale-policy.test.js` | 25 条红→绿单测 |
| `src/core/locale/README.md` | 追加 §7 定案；§0 补 T-032 时点订正 |
| `src/cli/README.md` | 追加 §10 端口口径订正（**未改 `src/cli/` 任何一行代码**） |
| `reports/t032-locale-policy.md` | 本报告 |

`src/cli/` 与 `src/mcp/` 的实现代码一行未动；`COMMANDS` 七条 P1 快照、`P2_COMMANDS`
（`['serve-mcp','locales']`）、`config.js` 的 `OVERRIDE_KEYS` 四键均保持原样。

---

## 4. 关键定案

1. **不内置真实区域映射**：`data/region/` 归 T-033，仓库内该目录**仍不存在**。
   `options.regionMappings` 是唯一注入口，缺省为空表，此时所有区域都判「未匹配」并
   回退中立通用基线。单测中的 `CN/FR/JP/HK/MO/TW` 映射是**合成映射**，只用于验证解析链，
   不含任何真实指南 / 历法 / 区域数据。
2. **优先级链**：`CLI 覆盖 > 档案内覆盖 > 声明国籍 > 声明居住地 > 中立通用基线`。
   国籍「不足」（注入表无该码）即退到居住地；两者都无匹配即 `auto:fallback` +
   `locale.fallback.unmatched`。`overrides.country` 是显式区域声明，优先于档案国籍。
3. **来源与可追溯性**：`LOCALE_SOURCES` 与 `cli/plan.js` / `cli/validate.js` /
   `core/planner/plan.js` 三处消费者**逐字一致**，无 `auto:inferred`。
   `explainLocalePolicy()` 另返回逐字段取值层 `cli/profile/region/baseline`、
   `region` 声明与命中、`locale.step.*` 决策链、`locale.fallback.*` 回退理由、
   `subnational_handled` 与恒为 `false` 的 `inferred`，使 NFR-012 有可执行断言。
4. **档案 `output_language` 的口径**：取值优先于映射语言，但**不改变** `locale_source`
   —— 否则两份虚构 fixture 的 `expected_source=auto:fallback` 会被误改写为 `user`。
   这是对 FR-046 的边界解释，已写入模块 README §7.2，供人工审查。
5. **中立通用基线**：`{ en, generic-guideline, gregorian-season, metric }`，与 fixture
   的 `expected_resolution` 一致；回退理由一律用 Canonical ID，不硬编码自然语句（FR-041）。
6. **中国的地区级 ISO 3166-1 条目（E-14）**：`HK` / `MO` / `TW` 作为中国香港 / 中国澳门 /
   中国台湾的地区级条目，**不作独立国家解析**。作为国籍出现时回退并标注
   `locale.fallback.subnational`；作为居住地可命中，但映射条目 MUST 显式带
   `region_level:'subnational'`，否则 `ERR_LOCALE_POLICY_MAPPING`。复用 T-010 的
   `isIso3166Alpha2()` 249 项只读常量，不另建地区表。
7. **零兜底定案不变**：`createLocalePolicyResolver()` 只提供可注入
   `deps.resolveLocalePolicy` 的端口工厂；`rr plan` 默认 deps 仍缺该端口，
   缺端口即 `ERR_CLI_PORT` / exit 3（T-019）。T-032 不自动装配。
8. **固定键集 + 稳定码**：映射表与覆盖对象都走固定键集白名单，多余键 / 缺键 /
   非法值一律 `ERR_LOCALE_POLICY_*`；`LocalePolicyError` 只回传稳定码 + Canonical ID，
   不插值输入正文（FR-049）。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/locale-policy.test.js` | RED（模块缺失）→ `24/25`（补实现留痕）→ **25/25 pass** |
| `npm test` | **383/383 pass, 0 fail**（T-031 基线 358 + T-032 新增 25） |
| `npm run lint` | PASS · 10/10 · `@param/@returns/@typedef` 632 处 / 70 文件 · 已实现公共出口 **10** · **预留占位=[]**（`locale` 由 T-032 补齐，判定未放宽）· `boundary.cli_no_node_imports=PASS` · `boundary.render_ascii=PASS` |
| `npm run spec-check` | PASS · FR 53/53 · AC 19/19 · SC 15/15 · NFR 15/15 · `[NEEDS CLARIFICATION]=0` · 扫描 44 份 md |
| `node scripts/coverage.mjs` | PASS · line 94.56% / branch 84.23% / functions 98.37%（均 ≥80） |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=112` / `independent_count=112` · `offline_checks=14 failed=0` · `gate.static_privacy=ok` |
| 独立负向探针 `/tmp/t032-probe.mjs` | **20/20 pass**（全仓令牌重扫、P0 基线、19/19 AC RED、命令集/覆盖键集、零 IO 静态扫描、`data/region/` 未预置、来源枚举、五键契约、宿主环境 + 网络哨兵、3 类防假绿、地区级合规、回退标注、冻结幂等、端口零兜底、T-031 回退链回归、文档防假绿、Git 状态、探针只读） |
| P0 基线 diff | `none` |
| AC / 勾选 | 19/19 RED · `39 [ ] / 0 [x]` |
| Git | HEAD `6772704` · T-031 已提交 · **T-032 未 commit / 未 push** |

> 探针 NEG-01 首轮 MISS 已定性为**探针自身口径缺口**：`ci.yml` 承载 TOKENS 唯一权威规则，
> 全仓扫描必须排除其自身（仓库既有 `privacy-scan` 定案）。修探针时补了「`ci.yml` 确实
> 是该规则所在」的依据断言，除自身外仍要求零命中，**判定未放宽**。

---

## 6. 边界与未决

- **AC-16 仍 RED**：场景 1 还要求「联网下载精确交节时刻」，属 T-014 net 端口与 T-042
  CI 接线；本次只做策略层取证（合成映射，不含真实区域数据、不联网）。
- **真实区域映射未落**（T-033）：`data/region/` 不存在，不得把合成映射解读为区域数据已验收。
- **「未匹配，已回退」的自然语言标注**尚缺落点：T-018 的 71 键 Canonical ID 键集已冻结，
  新增语言包键会破坏 SC-011 键集一致性，须先走规格变更；当前以
  `locale_source=auto:fallback` 稳定码 + `fallback_reason` Canonical ID 表达，
  **不宣称**自然语言提示已在计划头部渲染。
- **`units` 接线缺口**：核心域已支持显式覆盖 `units`（FR-046），但 T-019 冻结的
  `OVERRIDE_KEYS` 只有 `lang/guideline/calendar/country`，CLI 未暴露该键。
  本任务**未扩 P1 配置键集**，留后续任务 / 人工裁决。
- `rr plan` 默认 `deps` 仍缺 `resolveLocalePolicy`（零兜底）；CI 门禁接入留 T-042。
- T-022 报告登记的三组规格张力与四选一裁决**仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 D 解释仍待用户复核或撤销。
- **Git 状态说明**：提交 T-031 后本地 `main...origin/main [ahead 1]`，
  `origin/main` 停在 `0e506db`。此前记录的「未 push / `[ahead 3]`」与本地观察不符；
  远端服务器实际状态**未联网核实**，本轮未执行 fetch / push / update-ref，也不得据此断言已推送。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 含「`locales/` 未预置」这一 P1 阶段断言，
  Round 15 证据冻结在 `ac2a28d`；本次**未修改、未放宽** P1 审查器，P2 复审应另建审查器。
- 既有遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040；
  微信通道 `channel=unavailable`。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-033」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-031）；
- 若用户否决 §1 的门槛解释 → T-032 工作树未提交、可无痕回滚，回到 T-022 裁决点。
