/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 那一点热，后来有人读它吗。
 *
 * ## 这一支要拦的那件事，它自己就是被这样发现的
 *
 * `attempt.ts` 里三成的人「觉出了一点什么」，那一节落下两样东西：
 *
 *     flag: felt-something      他觉出过
 *     knowledge: that-warmth    「那一点热」这条认知
 *
 * **然后全库没有一处读它们。** 一个人这辈子唯一一次碰到修行的边，
 * 此后再没有任何事情因此不同——查出来只用了一行 `grep`，
 * 而它在库里躺了不知道多久，**因为没有任何东西会为此报错**。
 *
 * 所以这一支的第一条判据不是量内容好不好，是量**留下的痕迹有没有人读**。
 * 它守的是同一个形状再犯：往后谁再落一面旗、一条认知，
 * 而全库没人问它——那跟没落一样，只是看不出来。
 *
 * ## 三条路的厚度也要量
 *
 * 这一册有三个同层的结局（再来过 / 再没有 / 没再试），
 * 而**「没再试」那一路最容易被写薄**：它是「什么也没发生」，
 * 写的人容易一笔带过。可它是最常见的那一种人生。
 *
 * 量厚度不问「有没有写」（那永远绿），问**引擎自己数得出来的量**：
 * 每一路的正文行数。差一倍以上就是写得不一样实。
 * （这个思路是 xiuxian-game-a8 提的，它在 `repetition.ts` 上用过。）
 *
 * 跑法：bun scripts/afterwards.ts
 */
import './lib/seeded'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterwardsScenes } from '../src/content/life/afterwards'
import { lifeEvents, lifeScenes } from '../src/content/life'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('\n=== 那一点热，后来有人读它吗 ===\n')

let bad = 0

/**
 * 一、`attempt` 留下的那两样东西，这一册真的在读。
 *
 * **这一条是这一支存在的理由。** 它不跑世界——要拦的那件事在代码里：
 * 有人落了一面旗而全库没人问它。静态查得准，也查得快。
 */
{
  const attemptSrc = readFileSync(join(ROOT, 'src', 'content', 'life', 'attempt.ts'), 'utf8')
  const afterSrc = readFileSync(join(ROOT, 'src', 'content', 'life', 'afterwards.ts'), 'utf8')

  // `attempt` 落了哪些旗（`{ type: 'flag', key: 'xxx' }`）
  const dropped = [...attemptSrc.matchAll(/type: 'flag', key: '([^']+)'/g)].map((m) => m[1]!)
  const unread = dropped.filter((key) => !afterSrc.includes(key))

  if (dropped.length === 0) {
    console.log('  ✗ 尺子自己坏了：`attempt.ts` 里一面旗也没找到，这一条判据落空了。')
    bad += 1
  } else if (unread.length > 0) {
    console.log(`  ✗ ${unread.length} 面旗落了没人读：${unread.join('、')}`)
    console.log('    落一面旗而全库没人问它，跟没落一样——只是看不出来。')
    bad += 1
  } else {
    console.log(
      `  ✓ \`attempt\` 落的 ${dropped.length} 面旗（${dropped.join('、')}），这一册都读了。`,
    )
  }
}

/**
 * 二、三条路都真的接得上，而且各自留了痕。
 *
 * 静态查：每条路的终点节点在不在库里、有没有落 `flag`。
 * **「没再试」那一路一样要留痕**——它跟另外两条是同一层的结局，
 * 而年表里没有它的话，这个人一生的记录里就少了这件事。
 */
{
  const scene = afterwardsScenes['afterwards:again']
  const want = ['came-back', 'nothing-again', 'let-go']
  const missing = want.filter((id) => scene?.nodes[id] === undefined)

  const marks = want
    .filter((id) => scene?.nodes[id] !== undefined)
    .filter((id) => {
      const node = scene!.nodes[id]!
      const effects = node.onEnter ?? []
      // 落了旗或者记了年表，两样有一样就算留痕
      return !effects.some((one) => one.type === 'flag' || one.type === 'chronicle')
    })

  if (missing.length > 0) {
    console.log(`\n  ✗ ${missing.length} 条路的终点不在库里：${missing.join('、')}`)
    bad += 1
  } else if (marks.length > 0) {
    console.log(`\n  ✗ ${marks.length} 条路走完什么痕也没留：${marks.join('、')}`)
    console.log('    「没再试」跟另外两条是同一层的结局，年表里少了它，这一生的记录就缺一块。')
    bad += 1
  } else {
    console.log(`\n  ✓ 三条路的终点都在，而且各自留了痕（旗或年表）。`)
  }
}

/**
 * 三、三条路的厚度不许差一倍以上。
 *
 * **「没再试」最容易被写薄**——它是「什么也没发生」，写的人容易一笔带过。
 * 可它是最常见的那一种人生：三成觉出过的人里，多数不会再去动那本书。
 *
 * 量的是正文行数（`blocks` 里 `text` 的条数），不问「有没有写」——
 * 后者永远绿。
 */
{
  const scene = afterwardsScenes['afterwards:again']
  const thickness = new Map<string, number>()
  for (const id of ['came-back', 'nothing-again', 'let-go']) {
    const node = scene?.nodes[id]
    thickness.set(id, (node?.blocks ?? []).length)
  }

  const counts = [...thickness.values()]
  const most = Math.max(...counts)
  const least = Math.min(...counts)

  console.log(`\n  三条路的正文行数：`)
  for (const [id, n] of thickness) console.log(`      ${id.padEnd(14)} ${n} 行`)

  if (least === 0) {
    console.log('\n  ✗ 有一条路一句正文也没有。')
    bad += 1
  } else if (most / least > 2) {
    console.log(`\n  ✗ 最厚的比最薄的多一倍以上（${most} : ${least}）——三条路写得不一样实。`)
    console.log('    多数人落在最常见的那一路上，它不该比稀有的那一路薄。')
    bad += 1
  } else {
    console.log(`\n  ✓ 三条路厚度相当（最多 ${most} 行，最少 ${least} 行）。`)
  }
}

/**
 * 四、这一册真的挂进了库，而且事件的前提对得上。
 *
 * 挂漏了的册子跟没写一样，**而且它看起来完全正常**——
 * 文件在那儿，类型也对，只是没有一个人走得到。
 */
{
  const inLibrary = ['afterwards:again', 'afterwards:late'].filter(
    (id) => lifeScenes[id] === undefined,
  )
  const events = lifeEvents.filter((e) => e.id.startsWith('afterwards-'))

  // 那两卷都得问 `felt-something`——不问的话没觉出过的人也会读到它
  const missingGuard = events.filter(
    (e) => !(e.requires ?? []).some((c) => c.flag?.key === 'felt-something'),
  )

  if (inLibrary.length > 0) {
    console.log(`\n  ✗ ${inLibrary.length} 卷没挂进库：${inLibrary.join('、')}`)
    bad += 1
  } else if (events.length !== 2) {
    console.log(`\n  ✗ 这一册该有两件事，库里找到 ${events.length} 件。`)
    bad += 1
  } else if (missingGuard.length > 0) {
    console.log(
      `\n  ✗ ${missingGuard.length} 件事没问 \`felt-something\`——没觉出过的人也会读到它。`,
    )
    bad += 1
  } else {
    console.log(`\n  ✓ 两卷都挂进了库，而且都问了「他觉出过没有」。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  他这辈子唯一一次碰到修行的边，此后没有答案——而那件事真的留在了他的一生里。\n')
}
