# `src/core/locale/` · T-031 回退链 + T-032 区域策略定案

> [AIGC] 审计追踪 ID：`RR-T031-20261109-0001`（T-031）/ `RR-T032-20261110-0001`（T-032）· 待人工审查（P-10）
> 依据：`tasks.md` T-031 / T-032；`SPEC.md` FR-040～046、AC-15 / AC-16、SC-011 / SC-012、NFR-011 / NFR-012、P-11 / P-12、E-13 / E-14；`plan.md §4 / §5.1 / §5.2 / §6.2`；T-018 `src/core/render/README.md §2`。

## 0. 目录归属（重要边界）

`plan.md §4` 把 `src/core/locale/` 登记为「LocalePolicy 解析 + 回退链（FR-045/046）」，
`tasks.md` 把 **T-032** 的产出写为 `src/core/locale/`。

> **§0 口径订正（T-032，2026-11-10）**：原文本写「`resolveLocalePolicy` 仍归 T-032，
> 本任务不实现」，描述的是 **T-031 时点**。T-032 已补齐 `policy.js` 与 `index.js`，
> 目录不再是预留占位；lint 的 `types.jsdoc_contracts` 无需改动即自然通过
> （`placeholders=[]` 时 `placeholderOk` 仍为真，判定未放宽）。

T-031 只把 `fallback.js` 放在这里，因为 `plan.md §4` 明确写了「回退链」在这一层，
而 T-018 定案又明确「语言包与回退链归 T-031、渲染层不实现」。为避免擅自新增架构层
（`tasks.md §1`），T-031 **刻意不创建 `index.js`**，把统一出口留给 T-032。
`.gitkeep` 按用户 2026-11-08 裁决留 T-040 统一清理，两个任务都未删。

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

---

## 7. T-032 · `resolveLocalePolicy(profile, overrides)` 定案

> 审计追踪 ID：`RR-T032-20261110-0001` · 映射：`tasks.md §4.2 T-032` / FR-003、FR-045、FR-046、AC-16、SC-012、NFR-012、P-12、E-13、E-14。

### 7.1 落点与边界

| 文件 | 职责 |
|------|------|
| `src/core/locale/policy.js` | 区域策略解析、覆盖优先级、来源标注、映射表形状校验；**纯函数、零 IO、零网络、零第三方依赖** |
| `src/core/locale/index.js` | 统一出口，同时导出 T-031 回退链与 T-032 策略 API |
| `tests/unit/locale-policy.test.js` | 25 条先红后绿单测 |
| `reports/t032-locale-policy.md` | 任务报告 |

**不内置任何真实区域映射**（`data/region/` 属 T-033）、不读取文件、不联网、不调用在线翻译 / LLM、
不生成计划正文、不计算营养数值、不自动接线 `rr plan`（T-019 零兜底定案不变）。
映射表只经 `options.regionMappings` 由宿主**显式注入**；缺省为空表，即所有区域都「未匹配」。
> **T-033 补充**：数据现由 `data/region/` 提供，加载与语义校验在
> `src/core/guideline/region.js`；本目录仍然**不内置**映射数据，注入契约未变。

### 7.2 优先级与来源

```
CLI 覆盖 > 档案内覆盖 > 声明国籍 > 声明居住地 > 中立通用基线（auto:fallback）
```

- `LOCALE_SOURCES = ['user','auto:nationality','auto:residence','auto:fallback']` 与
  `cli/plan.js` / `cli/validate.js` / `core/planner/plan.js` 三处消费者**逐字一致**；
  不存在 `auto:inferred` 之类的静默推断来源（P-12）。
- 国籍命中 → `auto:nationality`；国籍缺失或「不足」（注入表无该码）→ 退到居住地
  `auto:residence`；两者都无匹配 → `auto:fallback` + `locale.fallback.unmatched`。
- `overrides.country` 是**显式区域声明**，优先于档案国籍，`locale_source='user'`。
- `profile.locale_policy.output_language` 是档案内语言声明，取值优先于映射语言，
  但**不改变** `locale_source`（否则两份虚构 fixture 的 `expected_source=auto:fallback`
  会被误改写）；该口径是 T-032 对 FR-046 的解释，见 §7.5。
- `explainLocalePolicy()` 额外返回 `fields`（逐字段取值层 `cli/profile/region/baseline`）、
  `region`（声明 / 命中 / 来源）、`chain`（`locale.step.*`）、`fallback_reason`
  （`locale.fallback.*`）、`subnational_handled` 与恒为 `false` 的 `inferred`，
  使 NFR-012「100% 可追溯」有可执行断言，而不只是在头部写一句声明。

### 7.3 中立通用基线（FR-045 / E-14 / AC-16 场景 3）

`NEUTRAL_BASELINE = { language_tag:'en', guideline_id:'generic-guideline',
calendar_id:'gregorian-season', unit_system:'metric' }`，与两份虚构 fixture 的
`expected_resolution` / `expected_source` 一致。回退理由一律以 **Canonical ID** 表达
（`locale.fallback.no_declaration` / `unmatched` / `subnational`），不硬编码自然语句。

### 7.4 中国的地区级 ISO 3166-1 条目（E-14）

`HK` / `MO` / `TW` 是中国香港 / 中国澳门 / 中国台湾的**地区级**条目，不是独立国家：

- 作为 `declared_nationality` 出现 → **不按国家解析**，回退中立基线并标注
  `locale.fallback.subnational`、`subnational_handled=true`；
- 作为 `declared_residence` 出现 → 允许命中映射，但注入表条目 MUST 显式带
  `region_level:'subnational'`，否则 `ERR_LOCALE_POLICY_MAPPING`；
- 复用 T-010 的 `isIso3166Alpha2()`（249 项只读常量），不另建地区表。

### 7.5 映射表注入契约与错误码

`RegionMapping = { guideline_id, calendar_id, unit_system, language_tag, region_level? }`，
键必须是 ISO 3166-1 alpha-2 大写两字母；四个必填值按 `SLUG_ID` / BCP 47 校验，
固定键集白名单（多余键 / 缺键 / 非法值一律拒绝）。`assertRegionMappings()` 在
`createLocalePolicyResolver()` 创建时 fail fast。9 个 `POLICY_ERROR` 稳定码与
`LocalePolicyError` 只回传稳定码 + Canonical ID，不插值输入正文（FR-049）。

`units` 在**核心域**可被显式覆盖（FR-046 要求单位可覆盖），但 T-019 冻结的
`OVERRIDE_KEYS` 只有 `lang/guideline/calendar/country`，CLI 未暴露 `units`。
本任务**不改 P1 命令集 / 配置键集**，该接线缺口登记为待办（见 §7.6）。

### 7.6 仍红与未决（不得假绿）

1. **AC-16 仍 RED**：场景 1 还要求「联网下载精确交节时刻」，属 T-014 net 端口与
   T-042 CI 接线；T-032 只提供策略解析层取证（合成映射，不含任何真实区域数据）。
2. **口径订正（T-033，2026-11-10）**：原文写「真实区域映射表未落、`data/region/` 仍不存在」，
   描述的是 **T-032 时点**。T-033 已落 `data/region/{mappings,schema}.json` 与
   `src/core/guideline/region.js`，可由 `createLocalePolicyResolverFromFs(fsPort)`
   注入本层的 `createLocalePolicyResolver()`。但该表是**最小示例集 + AI 候选稿**
   （`CN` / `US` + `HK` / `MO` / `TW`，适配器系数自撰中立、待人工审校），
   **不是**真实指南适用性判定；`rr plan` 默认 deps 仍不自动装配（零兜底不变）。
3. **「未匹配，已回退」的自然语言标注**尚缺落点：T-018 的 71 个 Canonical ID
   键集已冻结，新增语言包键会破坏 SC-011 键集一致性，须先走规格变更；
   当前以 `locale_source=auto:fallback` 稳定码 + `fallback_reason` Canonical ID 表达，
   不宣称自然语言提示已在计划头部渲染。
4. `rr plan` 默认 `deps` 仍缺 `resolveLocalePolicy`，缺端口即 `ERR_CLI_PORT`
   （T-019 零兜底）；`createLocalePolicyResolver()` 只提供可注入端口，不自动接线。
5. `units` 的 CLI 覆盖入口、`ci.yml` 的 AC-16 门禁接入均留后续任务 / T-042。
6. P1 出口仍 `verdict=BLOCKED`，`AC-01～19` 仍 19/19 RED，`tasks.md` 仍
   `39 [ ] / 0 [x]`；T-022 四选一裁决与 `ISSUE-20261109-T030-GATE` 的 D 解释仍待人工书面复核。
