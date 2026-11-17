# T-037 报告 · Phase 2 出口门禁取证（CI 报告）

> 日期：2026-11-12 · 基线提交：`8be4963`（T-036，仅本地 commit、未 push，本地 `main...origin/main [ahead 6]`）
> 映射：`tasks.md §4.2 T-037` · SC-001 / SC-002 / SC-009 / SC-011 / SC-012 / SC-013 / M4 出口 · AC-14～17
> 状态：**取证器实现完成、未提交、待人工审查（P-10）** · 结论 `verdict=BLOCKED` / exit 2
> [AIGC] 本报告由 AI 生成 · 审计追踪 ID：`RR-T037-20261112-0001`

---

## 0. 结论摘要

T-037 按 ATDD 先红后绿完成：新增 26 条单测，全量 `npm test 507/507`，lint `10/10`、
spec-check `PASS`、覆盖率 `94.97 / 85.42 / 98.36`（三列均 ≥80）、独立负向探针 `20/20`。

交付物是 `tests/acceptance/gates/p2-gate.mjs`——**单一实现两入口**的 Phase 2 出口门禁取证器：
真实调用 T-030 MCP、T-031 语言包、T-032/033 区域策略、T-034 增强门、T-035 数据源、
T-036 快照与 T-021 离线集成，逐条取证 AC-14～17，输出纯 ASCII `key=value` 报告。

**结论如实为 `BLOCKED` / exit 2**：十项门禁取证全部通过，但四条 AC 没有一条达到
`E2E_PASS`（`CORE_ONLY=3`、`GAP=1`）。P0 基线、`ac-*.md` 状态、`tasks.md` 勾选项、
P1 `verdict`、`ci.yml` 骨架**一字未改**；本报告**不代表 AC-14～17 转绿、不代表 M4 出口达成**。

---

## 1. 起点与结构性矛盾（登记 `ISSUE-20261112-T037-GATE`）

用户指令「commit, 继续 T-037」分两步：

1. 按 P-10 把 T-036 的 16 个文件提交为 `8be4963`，工作树归零，身份
   `r4fpsdmyr7-blip` 未变，**仅本地 commit、未 push**，本地 `[ahead 6]`。
2. 推进 T-037。但 `tasks.md` 写「**AC-14～17 全部转绿**」，与当前仓库状态存在结构性矛盾：

| 矛盾点 | 当前事实 | 为何不能自行转绿 |
|---|---|---|
| AC 状态 | `ac-01～19` 仍 **19/19 RED** | `ac-*.md` 是 P0 基线，状态写入属人工裁决动作（P-02 / P-10 / constitution §3.1(5)） |
| 任务勾选 | `tasks.md` 仍 `39 [ ] / 0 [x]` | AC 未转绿不得勾选（`tasks.md §1`） |
| P1 出口 | `p1-gate` 仍 `verdict=BLOCKED` / exit 2 | T-022 §4 四选一裁决、`ISSUE-20261109-T030-GATE` 的 D 解释仍待用户书面复核 |
| CI | `.github/workflows/ci.yml` 仍是 T-006 六 job 骨架 | 完整门禁接线归 T-042；P0 文件不得擅改 |
| 合规文档 | `PRIVACY.md` / `THIRD_PARTY_NOTICES.md` 不存在 | 归 T-041；AC-13 / AC-17 / AC-18 审计缺口未闭合 |
| 编码门禁 | `scripts/encoding-check.mjs` 不存在 | 归 T-045；AC-15 快照位口径张力未裁决 |
| 交节下载 | CLI 未接 `refreshCalendarData`，离线 `requests=0` | T-014 保守解不联网；缓存路径 `_data/` vs `data/calendar/` 张力待人工裁决 |

处理口径沿用 T-030 的 **D 解释**（维持 BLOCKED + P2 并行推进 + 回头补转绿），并新登记
`ISSUE-20261112-T037-GATE`：本任务只交付**可复核的取证器与 CI 风格报告**，
把「红→绿」状态写入留给人工裁决。**AI 未对四选一做出裁决，也未擅自放宽任何判定**。

---

## 2. ATDD 红→绿

| 阶段 | 证据 |
|---|---|
| RED | 先写 `tests/unit/p2-gate.test.js`（26 条），`node --test` 报 `ERR_MODULE_NOT_FOUND: tests/acceptance/gates/p2-gate.mjs` |
| GREEN | 实现 `p2-gate.mjs` 后首次 `23/23`；随后收紧 AC-16 口径并补 3 条断言，终态 `26/26` |
| 收紧 1 | 发现 `calendar.status=verified` 只是本地缓存命中，CLI 未接 `refreshCalendarData`；把 AC-16 判据改为「联网刷新是否接线」，如实记为 `GAP`，避免把缓存命中误判为场景满足 |
| 收紧 2 | `runP2Gate(provided)` 支持复用现场证据，单测顶层只取证一次，耗时 35s → 20s |
| 收紧 3 | `ac14_ci_green` 增加「四条 AC 状态必须全 GREEN」条件，避免仅凭 ci.yml 出现 `p2-gate` 字样就假绿 |

---

## 3. 产出清单

| 文件 | 作用 |
|---|---|
| `tests/acceptance/gates/p2-gate.mjs` | 单一实现两入口：`node ...` 输出 CI 报告（exit 0/1/2）；`runP2Gate()` / `collectP2Evidence()` / `evaluateP2Gate()` 供单测与 T-042 复用 |
| `tests/unit/p2-gate.test.js` | 26 条红→绿单测，含十项门禁的负向注入与 verdict 双向判定 |
| `reports/t037-p2-gate.md` | 本报告（CI 风格取证报告，含下方 §5 纯 ASCII 门禁输出） |
| `src/cli/README.md §15` | 口径订正：门禁未接入 CLI、未改实现代码 |

**未产出 / 未改动**：`ci.yml` 未接门禁（归 T-042）、`ac-*.md` 未转绿、`tasks.md` 未勾选、
`src/cli/` 与 `src/mcp/` 实现代码零改动、无 `THIRD_PARTY_NOTICES.md`、无 Release / `npm publish`。

---

## 4. 十项门禁取证口径（全部来自运行期真实调用）

| 门禁 ID | 真实取证 | 实测 |
|---|---|---|
| `scenarios_faithful` | `SPEC.md §8` 实时提取 AC-14～17 场景，逐字比对、拒 SKIP | 4/4 |
| `mcp_redaction` | `createMcpServer({})` 真实发 `tools/list` / `initialize` / 四次 `tools/call`；`assertSafePayload` 拒身体字段名 / 浮点 / 标记文本；工具描述经 `assertSafeText` | 4 工具 · 5 次隐私拒绝 · 4/4 端口失败关闭 · 0 回显 |
| `language_key_sets` | 读七份 `strings.json` + `verifyLanguagePacks` + 四种回退链真实解析 | 71 键 × 7 · issues=0 · direct/base-tag/default/fallback |
| `region_provenance` | `loadRegionMappings(fsPort)` 真实加载 + 四次 `resolveLocalePolicy` | 4 类来源 · 无 `auto:inferred` · 覆盖优先 · HK/MO/TW 地区级 |
| `offline_degradation` | `runOfflineIntegration()` + 6 种 T-034 降级路径 + 增强源码静态扫描 | 14/14 检查 · requests=0 · disk_writes=0 · 6/6 降级逐字节等于模板 · online_calls=0 |
| `source_compliance` | `loadSourceCatalog` / `loadDataSource` / 许可漂移 `assertSourceMetadata` | 4 条外部源全 unverified/unbundled/payload=null · 冲突拒 · 唯一可加载 `synthetic-demo` |
| `i18n_snapshots` | 独立复算 8 份快照 sha256 / bytes / `rr-data` 哈希 + glossary | 8/8 · rr-data 恒定 · GB18030 未覆盖 0 · 拉丁并列 71/71 · `product_e2e=unwired` |
| `acceptance_assertions` | 从上述运行期计数派生 AC-14～17 各自断言数 | 10 / 16 / 8 / 24，合计 **58** |
| `no_silent_green` | 读 `ac-14～17.md` 状态、`tasks.md` 勾选、自身 `node:fs` 只读导入白名单 | 4×RED · 39/0 · 白名单恰好三项 |
| `traceability` | 两种独立遍历清点源码、令牌动态取自 ci.yml、每行来源与证据齐备 | 125 文件 = 独立清点 · token_hits=0 |

**防假绿设计**：判定逻辑抽成纯函数 `evaluateP2Gate(evidence)`。单测与独立探针都做了
负向注入——逐项破坏十项取证变量，每项对应 check 必须转 `fail`；把四项端到端条件全部置真时
`verdict` 必须转 `PASS` / `status=ok`；只置一项时仍必须 `BLOCKED`。因此门禁
**既不是恒真总开关，也不是写死的恒假结论**。

---

## 5. CI 报告正文（`node tests/acceptance/gates/p2-gate.mjs`，exit 2）

```text
scenario=p2_gate
ac=4
scenario_count=4
scanned_files=125
independent_count=125
offline_checks=14
offline_failed=0
offline_requests=0
acceptance_assertions=58
e2e_pass=0
core_only=3
gap=1
checks=10
failed=0
baseline_touched=0
verdict=BLOCKED
ac.14=CORE_ONLY
ac.15=CORE_ONLY
ac.16=GAP
ac.17=CORE_ONLY
check.gate.scenarios_faithful=ok
check.gate.mcp_redaction=ok
check.gate.language_key_sets=ok
check.gate.region_provenance=ok
check.gate.offline_degradation=ok
check.gate.source_compliance=ok
check.gate.i18n_snapshots=ok
check.gate.acceptance_assertions=ok
check.gate.no_silent_green=ok
check.gate.traceability=ok
status=blocked
```

退出码语义（与 T-022 一致）：`0` = Phase 2 出口达成；`2` = 取证完成但出口 BLOCKED；
`1` = 取证本身失败。当前 `failed=0` 且 `verdict=BLOCKED`，故为 **exit 2**。
`ci.yml` 未接入本门禁（T-042），本报告是本机可复跑的 CI 风格输出，**不是 CI 已绿**。

---

## 6. AC-14～17 逐条判定

| AC | 状态 | 已取证 | 仍缺 |
|---|---|---|---|
| 14 | `CORE_ONLY` | MCP 四工具脱敏、失败关闭、场景可追溯 | 追溯矩阵与 CI 全绿未达成：ci.yml 仍是 T-006 骨架，P1 门禁 BLOCKED |
| 15 | `CORE_ONLY` | 71×7 键集、8 份快照逐字节可复算、rr-data 恒定、GB18030 零未覆盖、拉丁并列 | 快照来自合成夹具（`sections.count=0`、`product_e2e=unwired`），非 `rr plan --lang` 端到端；T-045 独立编码门禁未落地；`ac-15.md` 快照位仍指向 P0 占位 `tests/snapshots/ac-15.txt`，合并方式待人工裁决 |
| 16 | `GAP` | 四类来源标注、覆盖优先、无静默推断、HK/MO/TW 地区级 | 场景要求「联网下载精确交节时刻」；本地缓存 `calendar.status=verified` 不等于联网刷新，CLI `calendar.network_wired=false`；缓存路径张力、区域示例人工审校、回退文案键均待裁决 |
| 17 | `CORE_ONLY` | 断网 14/14、零请求零写盘、增强门默认关 / 逐次同意 / 6/6 降级、零在线调用、令牌扫描命中 0 | `PRIVACY.md` / `THIRD_PARTY_NOTICES.md` 未产出（T-041）；真实数据 / `diet-plan` / 包管理器清单 / 版权指南原文静态扫描未接 CI（T-042） |

---

## 7. 全量校验结果

| 项 | 结果 |
|---|---|
| `npm test` | **507/507**（T-036 基线 481 + 新增 26） |
| `npm run lint` | **PASS 10 项**，`safety.gates_readonly` node:fs 导入越界=0 |
| `npm run spec-check` | **PASS**（扫描 62 份 md，追溯矩阵无孤儿，澄清标记 0） |
| `node scripts/coverage.mjs` | **PASS** · line `94.97%` / branch `85.42%` / functions `98.36%`（均 ≥80） |
| `node tests/acceptance/gates/p2-gate.mjs` | exit **2** · `verdict=BLOCKED` · 10/10 checks · `baseline_touched=0` |
| `node tests/acceptance/gates/p1-gate.mjs` | exit **2** · `verdict=BLOCKED` · 6/6 checks · `baseline_touched=0` |
| `npm run acceptance` | exit 0 · **19/19 RED / 0 GREEN**（红态基线有效，非验收通过） |
| 独立负向探针 `/tmp/t037-probe.mjs` | **20/20**（仓库外、零写盘、不入库） |
| P0 基线 | tracked diff **0**；`SPEC.md` / `tasks.md` / `constitution.md` / `plan.md` / `ci.yml` / `ac-*.md` / `run.mjs` / `scripts/acceptance.mjs` 零改动 |
| 任务勾选 | `39 [ ] / 0 [x]` |
| Git | `HEAD=8be4963` · `[ahead 6]` · 本任务产物**未提交、未 push**；远端实际状态未联网核实 |

---

## 8. 边界与定案（勿重开）

- **P2 门禁是取证器，不是出口裁决器**：不写 `ac-*.md`、不勾 `tasks.md`、不改 `ci.yml`、
  不把 P1 `BLOCKED` 改写为通过。零磁盘写入、零子进程、零第三方依赖、`node:fs` 只读三项。
- **零兜底不变**：门禁只经注入 `fsPort` 读文件；`runCli` 默认 deps、`COMMANDS` 七条 P1 快照、
  `P2_COMMANDS=['serve-mcp','locales']` 一字未改，`feedback` 仍越界。
- **地区表述**：HK / MO / TW 是 ISO 3166-1 中国的**地区级**条目，作国籍不作独立国家解析，
  作居住地需 `region_level:'subnational'`；绝不称独立国家。
- **完全虚构**：MCP 隐私拒绝样本只用字段名与浮点形态构造，无任何真实身体数值；
  真实数据令牌正则动态取自 `ci.yml` 唯一权威规则，门禁源码与单测均不复制字面量（P-14 / FR-053）。
- **CI 接线归 T-042**：本报告不是「CI 已绿」；`p2-gate` / lint / coverage / 语言包键集 /
  区域来源 / 断网 / 许可扫描接入 `ci.yml` 时须另起任务，且不得提前假绿。

---

## 9. 待人工裁决与下一步

1. **T-022 §4 四选一裁决**（A 补接线 / B 修订 M3 出口 / C 部分出口 / D 维持 BLOCKED），
   以及 `ISSUE-20261109-T030-GATE` 的 D 解释是否复核或撤销——**仍待用户书面决定**。
2. **本次新登记 `ISSUE-20261112-T037-GATE`**：T-037 要求 AC-14～17 全绿与 P0 基线 RED 的
   结构性矛盾如何处理；本报告按 D 口径只交取证器，需用户复核。
3. **AC-15 快照位张力**：`ac-15.md` 指向 P0 占位 `tests/snapshots/ac-15.txt`，
   真实快照在 `tests/snapshots/i18n/`，合并方式待人工裁决（建议 T-037 / T-050）。
4. 后续依赖：T-040 社区规范、T-041 合规文档、T-042 全量 CI、T-045 `encoding-check`、
   T-046 Phase 3 门禁；以及 T-014 缓存路径 / 交节下载两处张力。
5. 本次产物**停下等审查**；提交与 push 须用户另行逐次显式授权（P-10）。
