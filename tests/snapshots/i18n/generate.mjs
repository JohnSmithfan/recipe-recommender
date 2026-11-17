// SPDX-License-Identifier: GPL-3.0-only
/**
 * T-036 · 多语言快照生成器（零第三方依赖、确定性、默认只读）。
 *
 *   node tests/snapshots/i18n/generate.mjs            # --check：只读逐字节比对，exit 0/1
 *   node tests/snapshots/i18n/generate.mjs --write    # 开发期重建快照 / 清单 / 术语表
 *
 * 快照是**真实 render() 输出**，不是预填占位文本（tests/snapshots/README.md、
 * P-02 / P-09）。--check 模式零写盘，供 CI 与单测复验；--write 只在人工重建
 * 快照时使用，产物须重新经人工审查（P-10）。
 *
 * 运行期零在线调用：语言包从本地 locales/ 读取；运行期不联网、不调用翻译 / LLM。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  ROOT, SNAPSHOT_TAGS, SNAPSHOT_DIR, MANIFEST_PATH, GLOSSARY_PATH,
  ENTRY_KEYS,
  sha256, loadPacks, buildFixturePlan, renderFor,
  cjkChars, uncoveredCjk, comboFp, ledgerLineSha256,
  latinGlossary, MODERN_FOOD_TERMS,
} from './fixture.mjs';
import { LANGUAGE_PACK_KEYS } from '../../../src/core/render/index.js';

const abs = (rel) => join(ROOT, rel);
const asJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** 在内存中重建全部产物（无任何写入）。 */
function build() {
  const sources = loadPacks();
  const plan = buildFixturePlan();
  /** @type {Map<string, string>} */
  const files = new Map();
  /** @type {Array<Record<string, unknown>>} */
  const entries = [];

  for (const tag of SNAPSHOT_TAGS) {
    const r = renderFor(tag, plan, sources);
    const body = r.markdown;
    files.set(`${tag}.md`, body);
    const resolvedTag = r.resolved.tag;
    entries.push({
      tag,
      requested_tag: tag,
      resolved_tag: resolvedTag,
      resolved_by: r.resolved.resolved_by,
      file: `${tag}.md`,
      sha256: sha256(body),
      bytes: Buffer.byteLength(body, 'utf8'),
      rr_data_sha256: sha256(JSON.stringify(r.data)),
      pack_sha256: sha256(JSON.stringify(sources[resolvedTag])),
      fallback_keys: r.resolved.fallback_keys.length,
      missing_keys: r.resolved.missing_keys.length,
      cjk_count: new Set(cjkChars(body)).size,
      gb18030_l1_uncovered: uncoveredCjk(body).length,
      combo_fp: comboFp(),
      ledger_sha256: ledgerLineSha256(),
    });
  }

  for (const e of entries) {
    const keys = Object.keys(e);
    if (keys.length !== ENTRY_KEYS.length || !ENTRY_KEYS.every((k) => keys.includes(k))) {
      throw new Error('snapshot_entry_keys');
    }
  }

  const baseData = renderFor('en', plan, sources).data;
  const manifest = {
    schema_version: '1.0.0',
    generated_by: 'tests/snapshots/i18n/generate.mjs',
    fictional: true,
    review_status: 'ai-candidate-unreviewed',
    product_e2e: 'unwired',
    sections_source: 'synthetic-render-fixture',
    plan_header_language_tag: 'xx',
    key_count: LANGUAGE_PACK_KEYS.length,
    tags: [...SNAPSHOT_TAGS],
    combo_fp: comboFp(),
    ledger_sha256: ledgerLineSha256(),
    rr_data_sha256: sha256(JSON.stringify(baseData)),
    entries,
  };

  const latin = latinGlossary(sources);
  const glossary = {
    schema_version: '1.0.0',
    review_status: 'ai-candidate-unreviewed',
    fictional: true,
    source: 'locales/la/strings.json',
    key_count: LANGUAGE_PACK_KEYS.length,
    paired_count: latin.filter((e) => e.paired).length,
    entries: latin,
    modern_food_terms: [...MODERN_FOOD_TERMS],
  };

  return { files, manifest, glossary };
}

const write = process.argv.includes('--write');
const built = build();

if (write) {
  for (const [name, body] of built.files) {
    writeFileSync(abs(`${SNAPSHOT_DIR}/${name}`), body, 'utf8');
  }
  writeFileSync(abs(MANIFEST_PATH), asJson(built.manifest), 'utf8');
  writeFileSync(abs(GLOSSARY_PATH), asJson(built.glossary), 'utf8');
  process.stdout.write(`snapshot_write=ok tags=${SNAPSHOT_TAGS.length} entries=${built.manifest.entries.length}\n`);
} else {
  /** @type {string[]} */
  const diffs = [];
  for (const [name, body] of built.files) {
    const p = abs(`${SNAPSHOT_DIR}/${name}`);
    if (!existsSync(p)) diffs.push(`${name}:missing`);
    else if (readFileSync(p, 'utf8') !== body) diffs.push(`${name}:bytes`);
  }
  if (!existsSync(abs(MANIFEST_PATH))) diffs.push('manifest.json:missing');
  else if (readFileSync(abs(MANIFEST_PATH), 'utf8') !== asJson(built.manifest)) {
    diffs.push('manifest.json:bytes');
  }
  if (!existsSync(abs(GLOSSARY_PATH))) diffs.push('glossary.json:missing');
  else if (readFileSync(abs(GLOSSARY_PATH), 'utf8') !== asJson(built.glossary)) {
    diffs.push('glossary.json:bytes');
  }
  if (diffs.length > 0) {
    process.stdout.write(`snapshot_check=fail diffs=${diffs.join(',')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`snapshot_check=ok tags=${SNAPSHOT_TAGS.length} files=${built.files.size + 2} disk_writes=0\n`);
  }
}
