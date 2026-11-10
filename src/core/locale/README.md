# `src/core/locale/` · T-031 回退链定案（T-032 目录预占说明）

> [AIGC] 审计追踪 ID：`RR-T031-20261109-0001` · 待人工审查（P-10）
> 依据：`tasks.md` T-031；`SPEC.md` FR-040 / FR-041 / FR-042 / FR-043 / FR-044、AC-15、SC-011、NFR-011；`plan.md §5.4`；T-018 `src/core/render/README.md §2`。

## 0. 目录归属（重要边界）

`plan.md §4` 把 `src/core/locale/` 登记为「LocalePolicy 解析 + 回退链（FR-045/046）」，
`tasks.md` 把 **T-032** 的产出写为 `src/core/locale/`。本目录的 `resolveLocalePolicy`
（国籍 → 居住地 → 用户覆盖 → 回退）仍归 T-032，**本任务不实现**。

T-031 只把 `fallback.js` 放在这里，因为 `plan.md §4` 明确写了「回退链」在这一层，
而 T-018 定案又明确「语言包与回退链归 T-031、渲染层不实现」。为避免擅自新增架构层
（`tasks.md §1`），本任务**刻意不创建 `index.js`**：目录在 lint 的
`types.jsdoc_contracts` 中仍登记为 T-032 的预留占位，T-032 落地时再补统一出口。
`.gitkeep` 按用户 2026-11-08 裁决留 T-040 统一清理，本任务不删。

## 1. 范围

| 落点 | 职责 |
|------|------|
| `src/core/locale/fallback.js` | BCP 47 基础标签截断、回退链构造、逐键来源标注、`verifyLanguagePacks` 纯校验 |
| `src/io/language-pack.js` | 唯一知道 `locales/<tag>/strings.json` 路径的 IO 适配器；产出 T-018 可消费的三键包 |
| `src/cli/locales.js` | `rr locales [--verify]` 命令 |
| `locales/` | 数据：`_schema/keys.json` + 七份 `strings.json`（本 README 不在数据目录内） |
| `tests/unit/locales.test.js` | 21 条先红后绿单测 |

**不加载文件、不联网、不调用在线翻译 / LLM、不生成菜谱、不计算营养数值**（FR-041 / NFR-001）。

## 2. 键集契约

`locales/_schema/keys.json` 的 `keys` 与 T-018 冻结的 `LANGUAGE_PACK_KEYS`
**逐字一致：71 个 Canonical ID**（`render.*` 68 个 + `plan.*` 通知 3 个），排序、去重。
七个内置语言包 `zh-Hans / en / fr / de / es / ru / la` 每份恰好 71 键、无缺键、无多余键，
`validateLanguagePack()` 全部通过。生成器自检在写入前比对键集，避免手误造成静默漂移。

译文形态：非空、单行、UTF-8、不含 `|` / 反引号 / 控制字符（表格安全，NFR-006）。
`en` 是唯一保证 100% 覆盖的回退终点。

> **译文状态**：七份 `strings.json` 是 AI 生成的**候选译文**，按 FR-041 补注 /
> ADR-003 §4.6 尚需**人工审校**后才可作为正式发布内容；本任务不宣称译文质量已验收。
> 运行期不调用任何翻译服务，也不因翻译困难改变营养数值或菜谱结构（FR-043 / FR-044）。

## 3. 回退链（FR-042）

```
请求语言 → 逐级基础标签 → 配置默认 → en（内置完整基准）
```

- `baseTagChain('zh-Hant-TW')` → `['zh-Hant-TW', 'zh-Hant', 'zh']`。
- `buildFallbackChain()` 产出**有序、去重、且确实可用**的标签数组；
  `xx-Zzzz` 在默认配置为 `en` 时只余 `['en']`，与 AC-15「按回退链输出英文」一致。
- `resolved_by` 四态：`direct` / `base-tag` / `default` / `fallback`。
  - `zh-Hans-CN` → 基础标签 `zh-Hans` → `base-tag`；
  - `xx-Zzzz` + 配置默认 `de` → `default`；`xx-Zzzz` + 默认 `en` → `fallback`。

**「不得静默混入另一语言」的可执行口径**：

| 情形 | 标注 |
|------|------|
| 命中请求标签本身 / 基础标签 | 只把「主包缺键、由后续包补齐」的键放进 `fallback_keys` |
| 落到配置默认 / 英文兜底 | **整包 71 键全部**放进 `fallback_keys` |
| 链上仍找不到 | 记入 `missing_keys`，不塞入 `strings` |

`src/io/language-pack.js` 把结果组装为 T-018 要求的固定三键
`{tag, strings, fallback_keys}`，`render()` 的 `label()` 据此输出
`render.marker.fallback` 前缀或 `render.marker.untranslated` + 原始 Canonical ID。
因此「回退」在每一行都可见，不是摘要里的一句声明。

自定义语言包（FR-040）：`resolveLanguagePack` 的 `sources` 参数即注入点；
`createLanguagePackLoader` 对非内置标签额外尝试读 `locales/<tag>/strings.json`。

## 4. `rr locales --verify`（SC-011）

- `rr locales`：列出七个内置 BCP 47 标签，只输出 `key=value` 稳定计数。
- `rr locales --verify`：读 schema + 七包，`verifyLanguagePacks()` 逐包比对，
  缺包 / 缺键 / 多余键 / 非法 Canonical ID / 空值 / 表格不安全值一律
  `ERR_CLI_LOCALES`（附稳定码与 Canonical ID），**exit 2，不假绿**。
- 缺 `fsPort` → `ERR_CLI_PORT` / exit 3（T-019 端口口径）；本目录零 `node:` 导入。
- 成功输出 `key_count=71` / `tags=7` / `verified=7` / `status=ok`。

## 5. 与既有任务的接线

- `P2_COMMANDS = ['serve-mcp', 'locales']`，`P1` 的 `COMMANDS` 七条快照**一字未改**；
  `cli.test.js` / `privacy.test.js` 的 P1 判定未改写未放宽，`feedback` 仍越界。
  `mcp.test.js` 中 T-030 的三条命令集断言按 T-031 口径更新（`locales` 已注册）。
- `createLanguagePackLoader(fsPort)` 就是 `src/cli/README.md §4` 登记的
  `loadLanguagePack` 端口实现，可直接注入 `runCli(['plan'], deps)`。
- `createListLocalesPort()` 可显式注入 T-030 的 `mcpPorts.listLocales`，使
  `rr_list_locales` 返回七个标签；**`src/mcp/` 与 `src/cli/serve-mcp.js` 未改**，
  T-030「端口注入、零兜底」定案保持有效，默认无端口时仍返回 `ERR_MCP_PORT`。
- `rr_list_locales` 的其它三个 MCP 工具端口、区域策略、数据源、GB 18030 编码校验
  分别归 T-032 / T-035 / T-045，**本任务不预置、不伪造**。

## 6. 仍红的原因（P-02）

T-031 只产出语言包数据与回退链能力。AC-15 的端到端断言还缺：七份**真实日计划**
快照（T-036）、中文 GB 18030-2022 级别 1 静态校验（T-045）、食材数据源与「现代食材
译名 + 学名并列」的端到端取证（T-035）。拉丁语包已在**术语层**提供「规范译名 + 原文」
并列，但键集本身不含食材键，不能据此宣称 AC-15 转绿。

`AC-15` 仍是 P0 登记的 **RED** 基线；本任务不改任何 `ac-*.md`、不改 `tasks.md` 勾选项、
不改 P1 门禁 `verdict=BLOCKED`。
