/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 想要一个孩子，和有一个孩子。
 *
 * 这一册（`content/life/bearing.ts`）要证明的是一件事：
 *
 * > **这两件事在这个时代里不是同一件。**
 *
 * 从前 `routine.ts` 里「添个孩子」是一个选项——选中、一年过去、
 * 屋里多个孩子，**一次也没落空过**。那写的是这个人想不想要孩子。
 *
 * ## 三个结局都得真被走到
 *
 * 这一支最要紧的一条，是**「没留住」和「一直没有」不能是纸上的分支**。
 * 它们各自只有两三成的机会，而两三成的东西极容易在别处被挡住
 * （前置不成立、章界不对、掷了却没落效果），
 * **挡住之后跟没写一模一样，而且判据不报错**。
 *
 * ## 护栏也要验
 *
 * 用户拍板：「保大/保小不能是作者预设的戏剧按钮」。
 * 所以这一支有一条判据是**反着问的**：这一册里不许出现
 * 「保大保小」那种二选一的选项。一个农家在自己屋里生孩子，
 * 面前没有那个按钮——摆出来等于凭空发明一种这个时代不存在的权力。
 *
 * 跑法：bun scripts/bearing.ts
 */
import './lib/seeded'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPinia, setActivePinia } from 'pinia'

import { bearingScenes } from '../src/content/life/bearing'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

import { beOf } from './origin'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('\n=== 想要一个孩子，和有一个孩子 ===\n')

let bad = 0

/** 走一遍这一卷，返回它落在哪个终点 */
function play(): { end: string; kin: number; chronicles: number } {
  setActivePinia(createPinia())
  beOf('farm')
  const world = useWorldStore()
  useCharacterStore()
  const people = usePeopleStore()
  useHouseholdStore()
  world.bornYear = world.time.year - 25

  // 先成亲——这一卷的前提。走 meet 效果，跟正文同一条路
  applyEffects([
    {
      type: 'meet',
      id: 'spouse',
      calls: '妻子',
      delta: 20,
      who: { surname: '秦', given: '娘', gender: '女', age: 22, doing: '操持家务' },
      bond: '配偶',
    },
  ])

  const scene = bearingScenes['bearing:await']!
  let at = scene.entry
  const guard = new Set<string>()
  while (at && !guard.has(at)) {
    guard.add(at)
    const node = scene.nodes[at]
    if (!node) break
    if (node.onEnter) applyEffects(node.onEnter)

    const branch = node.branches?.find((one) =>
      (one.requires ?? []).every((c) => {
        if (c.flag === undefined) return true
        return world.getFlag(c.flag.key) === c.flag.equals
      }),
    )
    const nextId = branch?.next ?? node.next
    if (!nextId) break
    at = nextId
  }
  return {
    end: at,
    kin: people.kinOf('子').length + people.kinOf('女').length,
    chronicles: world.chronicle.length,
  }
}

/**
 * 一、三个结局都真的走得到。
 *
 * 掷的是七成有孕、其中八成活，所以期望是：
 * 生下来活着 56%、没留住 14%、一直没有 30%。
 *
 * 跑 400 次。**下限取 5%**——三档里最稀的一档期望 14%，
 * 400 次里期望 56 次，掉到 5%（20 次）以下说明那一路被什么挡住了。
 * 这个数不是照实测倒推的，是照「最稀那一档不该被压掉三分之二」定的。
 */
{
  const RUNS = 400
  const ends = new Map<string, number>()
  let withKin = 0
  for (let i = 0; i < RUNS; i += 1) {
    const one = play()
    ends.set(one.end, (ends.get(one.end) ?? 0) + 1)
    if (one.kin > 0) withKin += 1
  }

  console.log(`  ${RUNS} 世走到哪儿：`)
  for (const [end, n] of [...ends].sort((a, b) => b[1] - a[1])) {
    console.log(
      `      ${end.padEnd(10)} ${n.toString().padStart(3)}　${((n / RUNS) * 100).toFixed(1)}%`,
    )
  }

  const FLOOR = 5
  const want = ['son', 'daughter', 'lost', 'barren']
  const missing = want.filter((one) => ((ends.get(one) ?? 0) / RUNS) * 100 < FLOOR)
  if (missing.length > 0) {
    console.log(`\n  ✗ ${missing.length} 条路走不到（不足 ${FLOOR}%）：${missing.join('、')}`)
    console.log('    「没留住」和「一直没有」不能是纸上的分支——两三成的东西最容易在别处被挡住。')
    bad += 1
  } else {
    console.log(`\n  ✓ 四条路都走得到：生了儿子、生了女儿、没留住、一直没有动静。`)
    console.log(`      （${withKin} 世家里真添了人口，占 ${((withKin / RUNS) * 100).toFixed(1)}%）`)
  }
}

/**
 * 二、没留住那一路，什么也没有多，可是年表记着。
 *
 * 这一条守的是那一节的立场：**它不改变这个人的能力，也不解锁任何后续。**
 * 接上一串效果就等于说这件事「有用」——它没有用，它只是发生了。
 *
 * 而年表必须记：跟退亲那一节同一条纪律，**这是这个人一生里真发生过的事。**
 */
{
  let checked = 0
  let noKin = 0
  let hasChronicle = 0
  for (let i = 0; i < 300 && checked < 30; i += 1) {
    const one = play()
    if (one.end !== 'lost') continue
    checked += 1
    if (one.kin === 0) noKin += 1
    if (one.chronicles > 0) hasChronicle += 1
  }

  if (checked === 0) {
    console.log('\n  ✗ 三百世里一次也没走到「没留住」——这一条判据落空了。')
    bad += 1
  } else if (noKin !== checked || hasChronicle !== checked) {
    console.log(
      `\n  ✗ 走到「没留住」${checked} 次，其中 ${checked - noKin} 次多出了人口、` +
        `${checked - hasChronicle} 次年表没记。`,
    )
    bad += 1
  } else {
    console.log(`\n  ✓ 「没留住」走到 ${checked} 次：一次也没多出人口，一次不落都记进了年表。`)
  }
}

/**
 * 三、这一册里不许有「保大保小」那种按钮。
 *
 * 用户拍板原文：「保大/保小不能是作者预设的戏剧按钮——必须先问
 * 当时到底有没有这个现实选择」。
 *
 * 这是**静态**判据，查的是源码里有没有这类选项。它不跑世界，
 * 因为要拦的那件事在代码里：**有人日后往这一册里加了一个二选一。**
 */
{
  const path = join(ROOT, 'src', 'content', 'life', 'bearing.ts')
  const source = readFileSync(path, 'utf8')
  const banned = ['保大', '保小', '保大人', '保孩子']
  const hasButton = (text: string) =>
    banned.filter((one) => text.includes(`label: '${one}`) || text.includes(`'${one}还是`))

  const found = hasButton(source)

  /*
   * 尺子自检——**这一条头一版是假的**：它拿一个硬写的字串
   * `label: '保大人'` 喂给判据，抓到了就宣布自己管用。
   *
   * 可那证明的只是「这个正则会匹配这个字串」，**跟这一支有没有在读
   * `bearing.ts` 完全无关**。文件改个名、路径写错、内容读成空串，
   * 那个自检照旧绿——它自检的是自己，不是自己跟被测对象的连接。
   *
   * 现在改成：把真源码取出来，往里插一个按钮，判据必须抓到；
   * 再确认原样的源码它放得过。**一头验它会红，一头验它不误报。**
   */
  const poisoned = source.replace("id: 'son',", "id: 'son',\n label: '保大人还是保孩子',")
  const catchesPoison = hasButton(poisoned).length > 0
  const readsFile = source.length > 1000 && source.includes('bearing:await')

  if (!readsFile) {
    console.log(`\n  ✗ 尺子自己坏了：读到的 ${path} 不像这一册（${source.length} 字）。`)
    bad += 1
  } else if (!catchesPoison) {
    console.log('\n  ✗ 尺子自己坏了：往真源码里插一个「保大人还是保孩子」都抓不到。')
    bad += 1
  } else if (found.length > 0) {
    console.log(`\n  ✗ 这一册里出现了「${found.join('、')}」那种二选一。`)
    console.log('    一个农家在自己屋里生孩子，面前没有那个按钮。')
    console.log('    摆出来等于凭空发明一种这个时代不存在的权力。')
    bad += 1
  } else {
    console.log('\n  ✓ 没有「保大保小」那种按钮——产婆尽力，然后听天由命。')
    console.log('      （自检：往真源码里插一个进去，当场抓得到）')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  想要一个孩子，和有一个孩子，是两件事。\n')
}
