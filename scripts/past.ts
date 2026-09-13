/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 往事这一族：写下的和读到的，两头对得上吗。
 *
 * 跑法：`bun scripts/past.ts`
 *
 * ## 这一支从两处相反的断线来
 *
 * 2026-09-14 一次差集比出两种形状相反的毛病：
 *
 * ```
 * own-child        写入端一处（立基掷给乳母），【读取端零】
 *                  而 days-manor 那句正文早就在说这件事
 *                  —— 两头各说各的，中间断着
 *
 * mother-far-home  【只有读取端】，写入端零
 * mother-learned   娘身上的往事 id 不带 mother- 前缀
 * mother-famine    而 recall 找不到就 return false ——【静默失败】
 * ```
 *
 * 后一种的代价实测过：**500 世里读到那段正文 109 世，
 * 而娘的往事一件也没被翻开（0 世）。** 正文写得完完整整，
 * 玩家读到了那一段，而人际面板上那条往事始终是暗的。
 *
 * ⚠️ **两种都不报错**：`Chapter` 的 id 是 `string`，类型层拦不住；
 * `recall` 静默返回 false，运行时也不吭声。**门禁全绿。**
 *
 * ## 它问两个方向
 *
 * ```
 * 读了没人写   recall 的 chapter 在立基的往事表里找得到吗   ← 恒定落空
 * 写了没人读   立基掷的往事，有没有任何一处 recall 它       ← 报数不判红
 * ```
 *
 * **头一个判红**（那是确定的坏），**第二个报数**
 * ——一件往事没人读不一定是缺陷：它可能在等一卷还没写的内容，
 * 而「等着」和「忘了」这一支分不出来。
 *
 * ## ⚠️ 它够不着的
 *
 * 运行时 `people.remember()` 动态加的往事（`effects.ts` 那一路）——
 * 那些不在立基表里，而这一支只静态比两张表。
 * **所以「读了没人写」那一栏可能误报**，每一条都要人看一眼。
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'

import { lifeScenes } from '../src/content/life'

/** 立基掷的那几件往事：`{ id: 'famine', atAge: 9, what: … }` */
const DECLARED = new Set<string>()
/*
 * ⚠️ 扫【整个 src/content】，不列文件名单。
 *
 * 头一版只扫 `birth.ts` 和 `circumstances.ts`，于是报出
 * 「`keeps-the-shed` 只有人读没有人写」——**而它的写入端在
 * `cultivators.ts`**（修士那一族单独立的 `history`）。
 *
 * 一条判据的观察宇宙靠一张手写的文件名单撑着，
 * **下一个新来源就是一次误报**。而误报会让人去查一处没毛病的地方。
 */
const contentFiles: string[] = []
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.ts')) contentFiles.push(full)
  }
}
walk('src/content')
for (const file of contentFiles) {
  const src = readFileSync(file, 'utf8')
  for (const hit of src.matchAll(/\{\s*id:\s*'([a-z-]+)',\s*atAge:/g)) {
    const id = hit[1]
    if (id !== undefined) DECLARED.add(id)
  }
  // 单独写在 `past:` 里的那种（乳母、管家那几个）
  for (const hit of src.matchAll(/past:\s*\{\s*id:\s*'([a-z-]+)'/g)) {
    const id = hit[1]
    if (id !== undefined) DECLARED.add(id)
  }
  // `history: [{ id: … }]` 那种（修士那一族）
  for (const hit of src.matchAll(/history:\s*\[\s*\{\s*id:\s*'([a-z-]+)'/g)) {
    const id = hit[1]
    if (id !== undefined) DECLARED.add(id)
  }
}

/** 内容层 recall 的那几件 */
const RECALLED = new Map<string, string[]>()
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const effects = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of effects) {
      const rec = one as { type?: string; chapter?: string }
      if (rec.type !== 'recall' || typeof rec.chapter !== 'string') continue
      if (!RECALLED.has(rec.chapter)) RECALLED.set(rec.chapter, [])
      RECALLED.get(rec.chapter)?.push(sceneId)
    }
  }
}
// 日常那一套（BEATS）的 effects 不在 lifeScenes 里，从源码扫
for (const file of ['src/content/days.ts', 'src/content/days-manor.ts']) {
  for (const hit of readFileSync(file, 'utf8').matchAll(/'recall',\s*id:\s*'[a-z-]+',\s*chapter:\s*'([a-z-]+)'/g)) {
    const id = hit[1]
    if (id === undefined) continue
    if (!RECALLED.has(id)) RECALLED.set(id, [])
    RECALLED.get(id)?.push(file.replace('src/content/', ''))
  }
}

console.log(`\n=== 往事这一族：写下的和读到的，两头对得上吗 ===\n`)
console.log(`  立基掷的 ${DECLARED.size} 件 · 内容层 recall 的 ${RECALLED.size} 件\n`)

const orphanRead = [...RECALLED.keys()].filter((id) => !DECLARED.has(id))
if (orphanRead.length > 0) {
  console.log(`  ✗ ${orphanRead.length} 件【只有人读，没有人写】——recall 恒定落空：`)
  for (const id of orphanRead) {
    console.log(`      「${id}」被 ${(RECALLED.get(id) ?? []).join('、')} 读`)
  }
  console.log(
      `      ——recall 找不到那件往事就 return false，【静默失败】。` +
      `      正文照演，而那笔世界事实一次也没落下。\n`,
  )
  process.exitCode = 1
} else {
  console.log(`  ✓ 每一件被 recall 的往事，立基那头都真的掷得出来。\n`)
}

const orphanWrite = [...DECLARED].filter((id) => !RECALLED.has(id)).sort()
if (orphanWrite.length > 0) {
  console.log(
    `  ◇ ${orphanWrite.length} 件【写了没人读】（报数不判红）：\n      ${orphanWrite.join('、')}`,
  )
  console.log(
    `      ——不一定是缺陷：它可能在等一卷还没写的内容。\n` +
      `      而「等着」和「忘了」，这一支分不出来。\n`,
  )
}

console.log(
  `  ⚠️ 够不着的：运行时动态加的往事不在立基表里，\n` +
    `  所以上头那一栏可能误报——每一条都要人看一眼。\n`,
)
