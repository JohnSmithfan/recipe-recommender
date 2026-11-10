# T-031 报告 · Canonical ID 键集与七语言包

> 日期：2026-11-09 · 基线提交：`0e506db`（T-030，未 push，`main...origin/main [ahead 3]`）
> 映射：FR-040 / FR-041 / FR-042 / FR-043 / FR-044 / AC-15 / SC-011 / NFR-011 / P-11 · `tasks.md §4.2 T-031`
> 状态：**实现完成、未提交、待人工审查（P-10）**
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T031-20261109-0001`

---

## 0. 结论摘要

T-031 按 ATDD 先红后绿完成：21 条新单测，全量 `358/358`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.37 / 83.84 / 98.32`（三列均 ≥80）、独立负向探针 `16/16`。

**P1 出口没有被改动**：门禁仍 `verdict=BLOCKED` / `status=blocked` / exit 2，
`AC-01～19` 仍 19/19 RED，`tasks.md` 仍 `39 [ ] / 0 [x]`，P0 基线零改动。
本次交付**不代表 P1 出口达成、不代表 M3/M4 验收通过、不代表 AC-15 转绿**。

---

## 1. 本轮起点与门槛

用户指令「commit，然后继续 T-031」：

1. 先按 P-10 把 T-030 的 12 个文件提交为 `0e506db`（`12 files changed, +1140 −5`），
   工作树归零、身份 `r4fpsdmyr7-blip` 未变、**未 push**（ahead 3）。
2. T-031 沿用 `ISSUE-20261109-T030-GATE` 的处理：用户「推进p2」按 T-022 §4 选项
   **D** 解释（维持 BLOCKED + P2 并行推进 + 回头补转绿）。该解释及 T-022 四选一裁决
   **仍待用户书面复核**，本次同样不改任何 P0 基线 / `ac-*.md` / `tasks.md` / P1 verdict。

规格核查要点：

| 锚点 | 结论 |
|------|------|
| `src/core/render/contract.js` | `LANGUAGE_PACK_KEYS` = **71** 个 Canonical ID（已冻结、排序、去重） |
| `src/core/render/README.md §2/§3` | **「语言包与回退链归 T-031」，渲染层不加载、不解析 BCP 47、不选择默认语言** |
| `src/cli/README.md §4` | `loadLanguagePack` 端口明确登记归 **T-031** |
| `plan.md §5.4` | `locales/<tag>/strings.json` 纯键值；`_schema/keys.json` 定义键集；`rr locales --verify` 保证 100% 一致 |
| `SPEC.md` FR-042 | 回退链「请求语言 → 基础标签 → 配置默认 → `en`」；缺失键须标注、**不得静默混排** |
| `AC-15` | 仍是 P0 登记的 RED 基线；主责任务 T-031 / T-036 / T-045 |

---

## 2. ATDD 红→绿记录（P-02 / AC-14）

| 阶段 | 取证 |
|------|------|
| RED | 先写 `tests/unit/locales.test.js` → `ERR_MODULE_NOT_FOUND: src/core/locale/fallback.js`，确认实现存在前为红 |
| GREEN | 落盘数据 + 回退链 + IO + CLI 后重跑 `21/21 pass` |
| 防假绿 | 负向探针对缺键 / 缺包 / 空值 / 多余键 / 非法标签全部要求明确失败；FR-044 取证断言规范数据区非空且七语言深度相等 |

`AC-15` 本身一行未改，**仍为 RED**；T-031 只是它的映射任务之一。

---

## 3. 产出

### 3.1 数据（全部新增）

| 文件 | 内容 |
|------|------|
| `locales/_schema/keys.json` | `schema_version` / `base_tag=en` / 七个 `tags` / `key_count=71` / `keys` 与 T-018 冻结契约逐字一致 |
| `locales/{zh-Hans,en,fr,de,es,ru,la}/strings.json` | 每份恰好 71 键，**合计 497 条译文**；非空、单行、UTF-8、不含 `|` / 反引号 / 控制字符 |

七份由仓库外生成器一次性产出，写入前自检：行数 == `LANGUAGE_PACK_KEYS.length`、
行顺序逐字比对、每行列数、值形状、五个抽查键七语言互异。生成器不入库，
JSON 本身即是 Corresponding Source。

> **译文状态**：这是 **AI 候选译文**，按 FR-041 补注 / ADR-003 §4.6 尚需**人工审校**
> 才能作为正式发布内容。本任务不宣称术语质量已验收，运行期不调用任何在线翻译 / LLM。

### 3.2 实现（新增）

| 文件 | 职责 |
|------|------|
| `src/core/locale/fallback.js` | `BUILTIN_TAGS` / `BASE_TAG` / 7 个 `LOCALE_ERROR` 稳定码；`baseTagChain` / `buildFallbackChain` / `resolveLanguagePack` / `verifyLanguagePacks`；**纯函数、零 IO、零 `node:` 导入** |
| `src/io/language-pack.js` | 唯一知道 `locales/<tag>/strings.json` 路径的适配器；`loadBuiltinLanguagePacks` / `createLanguagePackLoader` / `createListLocalesPort` |
| `src/cli/locales.js` | `rr locales [--verify]`，缺 `fsPort` 即 `ERR_CLI_PORT` / exit 3 |
| `src/core/locale/README.md` | 模块定案（含目录归属、键集契约、回退链、仍红原因） |
| `tests/unit/locales.test.js` | 21 条红→绿单测 |

### 3.3 修改（P1/P2 产物，非 P0 基线）

`src/cli/args.js`（`P2_COMMANDS` 追加 `locales`、`FLAG_KEYS` 追加 `verify`、
`COMMAND_OPTIONS.locales`）、`src/cli/errors.js`（`CLI_ERROR.LOCALES`）、
`src/cli/run.js` / `index.js`（注册与导出）、`src/io/index.js`（导出端口）、
`src/cli/README.md`（追加 §9）、`src/mcp/README.md`（追加 §7 口径订正）、
`tests/unit/mcp.test.js`（T-030 三条命令集断言按新口径更新）。

---

## 4. 关键定案

1. **不新增架构层**：`plan.md §4` 把「回退链」登记在 `src/core/locale/`，而 T-032 负责
   该目录的 `resolveLocalePolicy`。本任务只放 `fallback.js`，**刻意不建 `index.js`**，
   目录在 lint 中仍登记为 T-032 预留占位；`.gitkeep` 按既有裁决留 T-040。
2. **不静默混排的可执行口径**：`resolveLanguagePack` 四态 `direct` / `base-tag` /
   `default` / `fallback`。命中请求标签或基础标签时只标注真正缺键的项；落到配置默认或
   英文兜底时**整包 71 键全部进入 `fallback_keys`**，由 T-018 `label()` 逐行加
   `render.marker.fallback` 前缀。链上仍找不到的键记入 `missing_keys`，渲染层输出
   `render.marker.untranslated` + 原始 Canonical ID，绝不拿别的语言顶替。
3. **命令集分层继续有效**：`COMMANDS` 保持 P1 七条快照一字不改；
   `P2_COMMANDS = ['serve-mcp', 'locales']`、`ALL_COMMANDS` 共 9 条。
   `cli.test.js` / `privacy.test.js` / `reviews/agent-p1.mjs` 的 P1 判定**未改写、未放宽**，
   `feedback` 仍越界。仅 `mcp.test.js` 的 T-030 命令集断言按阶段推进更新。
4. **T-030 定案未被改写**：`rr_list_locales` 默认仍返回 `ERR_MCP_PORT`；
   `src/mcp/` 与 `src/cli/serve-mcp.js` 一行未改。T-031 只提供可选端口
   `createListLocalesPort()`，由宿主显式注入 `mcpPorts.listLocales` 才返回七标签。
5. **拉丁语并列（FR-043 / E-12）**：现代营养 / 技术术语统一采用
   「规范译名 + 原文」并列。键集本身**不含食材键**，因此这只是术语层机制；
   AC-15 的「现代食材译名 + 学名并列」端到端取证仍待 T-035 数据源 + T-036 快照。
6. **FR-044 / SC-011 可执行证据**：同一合成计划对象 + 同一格式化器，七种语言包分别
   `render()` → 七份可见输出逐字节不同，而 `extractRenderData()` 的规范数据区
   **深度相等且非空**（不是口头约定）。
7. `rr locales --verify` 失败一律 `ERR_CLI_LOCALES` + 稳定码 + Canonical ID；
   单次最多回传 12 条 issue，错误输出不膨胀成信息泄漏面。

---

## 5. 校验结果

| 命令 | 结果 |
|------|------|
| `node --test tests/unit/locales.test.js` | RED（模块缺失）→ **21/21 pass** |
| `npm test` | **358/358 pass, 0 fail**（T-030 基线 337 + T-031 新增 21） |
| `npm run lint` | PASS · 10/10 · **109** 个源码文件 · `boundary.cli_no_node_imports=PASS` · `boundary.render_ascii=PASS` · `types.jsdoc_contracts` 预留占位仍为 `[locale]` |
| `npm run spec-check` | PASS · FR 53/53 · AC 19/19 · SC 15/15 · `[NEEDS CLARIFICATION]=0` |
| `node scripts/coverage.mjs` | PASS · line 94.37% / branch 83.84% / functions 98.32%（均 ≥80） |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · `status=blocked` · `checks=6 failed=0` · `baseline_touched=0` · `scanned_files=109` / `independent_count=109` · `offline_checks=14 failed=0` · `gate.static_privacy=ok` |
| 独立负向探针 `/tmp/t031-probe.mjs` | **16/16 pass**（全仓令牌重扫、P1-32 口径、七包键集独立复算、FR-044 规范数据区、回退链注入矩阵、防假绿、7 类 `--verify` 失败场景、MCP 端口、`verifyLanguagePacks` 稳定码） |
| P0 基线 diff | `none` |
| AC / 勾选 | 19/19 RED · `39 [ ] / 0 [x]` |
| Git | HEAD 仍 `0e506db` · **未 commit / 未 push** |

---

## 6. 边界与未决

- **译文档案**：497 条为 AI 候选稿，需人工审校（FR-041 补注）；未做术语质量验收。
- **AC-15 仍 RED**：缺 T-036 七语言真实日计划快照、T-045 中文 GB 18030-2022 级别 1
  静态校验、T-035 食材数据源与「现代食材译名 + 学名并列」端到端取证。
  T-031 的中文译文均用常用汉字，但**不把「编码合规通过」记为已达成**。
- `src/core/locale/` 的 `resolveLocalePolicy`（FR-045/046）、区域映射（T-033）、
  `locales/` 与 `rr plan` 的**完整端到端接线**（T-032/T-036）均未完成；
  `createLanguagePackLoader` 已可作为 `loadLanguagePack` 端口注入，但 `rr plan` 默认
  `deps` 仍缺该端口（T-019 零兜底定案不变）。
- `ci.yml` 未接入语言包键集门禁（P0 已跟踪基线，P-10）；CI 接入留 T-042。
- T-022 报告登记的三组规格张力与四选一裁决**仍待人工书面决定**；
  `ISSUE-20261109-T030-GATE` 的 D 解释仍待用户复核或撤销。
- P1 审查器 `reviews/agent-p1.mjs` 的 `P1-32` 含「`locales/` 未预置」这一 **P1 阶段断言**，
  Round 15 证据冻结在 `ac2a28d`；P2 起 `locales/` 已存在，若重跑 P1 审查器该条会 FAIL。
  本次**未修改、未放宽** P1 审查器；P2 若需复审应另建 P2 审查器。
- 既有遗留不变：`docs/competitive-research.md:172` M0 滞后文字留 T-040；`.gitkeep` 留 T-040。

---

## 7. 下一步（等审查）

按项目节奏，本任务到此停下，等用户审查「产出 / 校验结果 / 边界」。

- 审查通过并要继续 → 用户说「继续 T-032」再推进；
- 提交 / push 须用户**另行显式授权**（P-10，本轮「commit」授权已用于 T-030）；
- 若用户否决 §1 的门槛解释 → 工作树未提交、可无痕回滚，回到 T-022 裁决点。
