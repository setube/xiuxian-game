/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 造册那一卷——那条回流链走得通吗，两条路都在吗。
 *
 * ## 这一支守的是一件从前没有判据管过的事
 *
 * 库里到今天为止，人际关系是一种**状态**：他在不在、活着没有、好感多少。
 * 而 `census:mismatch` 要证的是关系可以是**一种别人替代不了的能力**：
 *
 *     他能说「这是我从小一块长大的，他家原先就在巷子东头」
 *     ——不是因为他跟你好，是因为**他见过**
 *
 * 三个节点：
 *
 *   open      里长来核册，发现对不上。两条选项
 *   he-came   去找他　　→ 他出面说了话，册子改过来
 *   alone     自己跑　　→ 也办成了，花了两个多月
 *
 * ## 判据的形状：两条路都得在
 *
 * 这一卷最危险的坏法不是走不到，是**只剩一条路**：
 *
 *     只剩 he-came　→ 那就成了「系统给你一个老友，你只能用他」
 *                     关系被做成了道具
 *     只剩 alone　　→ 那条回流链整个没发生，而报表上看不出来
 *
 * 所以第三条判据问的是**两条各自都走得到**，不是「走得到」。
 *
 * ## 一格也不问「认识多少年」——判据也一样
 *
 * ⚠️ 这一卷的入场条件是「他还在 + 那句话说出口过 + 眼下有这件事」，
 * **没有年数**。判据不许偷偷把年数加回来：
 * 按年数判会把它变成一个「三十年老友系统」，
 * 而这一卷要的恰恰相反——一件普通的麻烦事，碰巧有一个人见过。
 *
 * 跑法：bun scripts/census.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { censusEvents } from '../src/content/life/census'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { roleId } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'

const SCENE = 'census:mismatch'
const TRIES = 300

let bad = 0

/**
 * 摆一局：玩家 `age` 岁，隔壁那个一起长大的还在，那句话也说出口过。
 *
 * ⚠️ **一个人也不造，掷到那一世本来就有玩伴为止**——照 `playmate.ts`
 * 那支的教训：自己 `enroll` 一个孩子，`roleId('playmate')` 认的会是
 * 引擎立基时造的另一个（`gap` 更小），六次断言六次报错，
 * 而那个错看起来像内容坏了。
 */
function stage(age: number): { id: string } | null {
  for (let n = 0; n < TRIES; n += 1) {
    setActivePinia(createPinia())
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const world = useWorldStore()
    const people = usePeopleStore()
    useNarrativeStore()

    world.advanceTime({ years: age })
    household.standing = 40

    const id = roleId('playmate')
    if (id === undefined) continue
    // 逐条断言前提真的立起来了，别让「摆歪了」冒充「内容没走通」
    if (character.age !== age) continue
    if (!people.isAlive(id)) continue
    if (!isNearby(id)) continue

    // 那句话说出口过——这一卷的入场条件之一
    world.setFlag('said-come-to-me', true)
    return { id }
  }
  console.log(`  ✗ 摆局：${TRIES} 次也没掷出「${age} 岁那年他还在」的一世。`)
  bad += 1
  return null
}

/** 演一趟，点 `want` 那条选项。返回走过的节点 */
function play(want: string): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = scene.entry
  let picked = false

  for (let guard = 0; at !== undefined && guard < 10; guard += 1) {
    const node: SceneNode | undefined = scene.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)

    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const found = open.find((one) => one.id === want)
      /*
       * ⚠️ **落空要出声。** `?? open[0]!` 会静默点第一条，
       * 于是判据拿另一条路的结果去答关于这一条的问题
       * （`pick-fallthrough-must-speak`，一天抓到过三次）。
       */
      if (found === undefined) {
        console.log(`  ✗ 「${want}」那条选项在 ${at} 上摆不出来——条件没满足，还是 id 写错了。`)
        bad += 1
        return walked
      }
      picked = true
      if (found.effects) applyEffects(found.effects)
      at = found.next ?? undefined
      continue
    }
    const branch = node.branches?.find((one) => meetsAll(one.requires))
    at = branch?.next ?? node.next ?? undefined
  }
  if (!picked) {
    console.log(`  ✗ 整趟没点到任何选项——「${want}」那一节没有可选项。`)
    bad += 1
  }
  return walked
}

console.log('\n=== 造册那年，册上那一行跟你家对不上 ===\n')

// ============================================================
// 一、去找他：他出面说了话
// ============================================================
{
  const staged = stage(48)
  if (staged !== null) {
    const walked = play('go-to-him')
    const world = useWorldStore()

    const wrong: string[] = []
    if (!walked.includes('he-came')) {
      wrong.push(`点了「去找他」，却没走到 he-came（走过 ${walked.join(' → ')}）`)
    }
    if (world.getFlag('he-spoke-for-me') !== true) {
      wrong.push('他出面了，而那一笔没落下来——往后没有任何地方知道这件事发生过')
    }
    if (world.getFlag('census-answer') !== '找了他') {
      wrong.push(`那一格记的是「${String(world.getFlag('census-answer'))}」，不是「找了他」`)
    }

    if (wrong.length > 0) {
      console.log(`  ✗ 去找他：${wrong.length} 处不成立。`)
      for (const one of wrong) console.log(`      ${one}`)
      bad += wrong.length
    } else {
      console.log('  ✓ 去找他：他出面说了他见过的那一段，册子改过来了。')
    }
  }
}

// ============================================================
// 二、自己跑：也办成了
//
// ⚠️ **这一条不是「另一种失败」。** 事情一样办得成，差别在那两个月。
// 少了这条路，这一卷就成了「系统给你一个老友，你只能用他」。
// ============================================================
{
  const staged = stage(48)
  if (staged !== null) {
    const walked = play('go-myself')
    const world = useWorldStore()

    const wrong: string[] = []
    if (!walked.includes('alone')) {
      wrong.push(`点了「自己跑」，却没走到 alone（走过 ${walked.join(' → ')}）`)
    }
    if (world.getFlag('ran-it-myself') !== true) {
      wrong.push('自己跑成了，而那一笔没落下来')
    }
    if (world.getFlag('he-spoke-for-me') === true) {
      wrong.push('没去找他，却落了「他出面说了话」那一笔——两条路的痕迹串了')
    }

    if (wrong.length > 0) {
      console.log(`  ✗ 自己跑：${wrong.length} 处不成立。`)
      for (const one of wrong) console.log(`      ${one}`)
      bad += wrong.length
    } else {
      console.log('  ✓ 自己跑：去了三趟，前后两个多月，册子也改过来了。')
    }
  }
}

// ============================================================
// 三、那一卷的入场：一格也不问「认识多少年」
//
// ⚠️ **这一条守的是设计本身，不是可达性。**
//
// 「按认识年数触发」会把这一卷变成一个「三十年老友系统」——
// 而它要的恰恰相反：一件普通的麻烦事，碰巧有一个人见过你家从前的样子。
// 三十年是它读起来特别的原因，不是它成立的条件。
//
// 库里唯一能问「认识多少年」的是 `unaged.knownFor`（它同时要求那个人
// 看着比岁数年轻，凡人恒不成立）。这一条扫入场条件，不许它出现。
// ============================================================
{
  const asked = JSON.stringify(censusEvents)
  const wrong: string[] = []
  if (asked.includes('knownFor')) {
    wrong.push('入场条件里出现了 knownFor——按年数判会把它变成「三十年老友系统」')
  }
  if (!asked.includes('said-come-to-me')) {
    wrong.push('入场不问那句话说出口过——那这一卷跟「此前还走动」就断了')
  }
  if (!asked.includes('playmate')) {
    wrong.push('入场不问那个人在不在——没有他，这条路整条不存在')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 入场条件：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 入场：问他在不在、问那句话说出口过，一格也不问认识了多少年。')
  }
}

// ============================================================
// 四、入场条件真的挡得住人——这一条走 meetsAll，不扫文本
//
// ⚠️ **上一条是静态扫 JSON，它照不出条件层。** A 刀（`meetsAll` 恒真）
// 底下那一条照样绿，因为它根本没问引擎。
//
// 而这一卷真正的条件层在**入场**上：没有那面旗的人不该走进来。
// 那面旗是它跟上游唯一的连接——`playmate.ts` 第三卷「还走动」那一支
// 落的。旗一断，这一卷就成了一个跟那个人毫无关系的随机事件，
// **而正文里他还在说「这是我从小一块长大的」**。
// ============================================================
{
  const staged = stage(48)
  if (staged !== null) {
    const world = useWorldStore()
    const requires = censusEvents[0]?.requires

    // 摆的那一局旗是立着的——该进得来
    const withFlag = meetsAll(requires)
    // 把旗撤掉——该进不来
    world.setFlag('said-come-to-me', false)
    const withoutFlag = meetsAll(requires)

    const wrong: string[] = []
    if (!withFlag) {
      wrong.push('他还在、那句话也说过，入场条件却不成立——这一卷谁也进不来')
    }
    if (withoutFlag) {
      wrong.push(
        '那句话没说出口过，入场条件照样成立——' +
          '这一卷跟「此前还走动」那一支断了，而正文里他还在说「从小一块长大」',
      )
    }

    if (wrong.length > 0) {
      console.log(`  ✗ 入场挡不挡得住：${wrong.length} 处不成立。`)
      for (const one of wrong) console.log(`      ${one}`)
      bad += wrong.length
    } else {
      console.log('  ✓ 入场挡得住：旗立着进得来，旗撤了进不来。')
    }
  }
}

// ============================================================
// 五、尺子自检：两条路的落点各不相同
//
// ⚠️ 防的是「两条选项落到同一节」——那时候上面两条会各自全绿，
// 而这一卷实际上只有一条路（`gate-green-does-not-mean-distribution-right`）。
// ============================================================
{
  const scene = lifeScenes[SCENE]
  const open = scene?.nodes[scene.entry ?? 'open']
  const nexts = (open?.choices ?? []).map((one) => one.next)
  const uniq = new Set(nexts.filter((one) => one !== undefined && one !== null))

  if (nexts.length < 2) {
    console.log(`  ✗ 尺子自检：那一节只有 ${nexts.length} 条选项——「不去找他」那条路没了。`)
    bad += 1
  } else if (uniq.size < nexts.length) {
    console.log('  ✗ 尺子自检：两条选项落到同一节——这一卷实际上只有一条路。')
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：${nexts.length} 条选项落到 ${uniq.size} 处，两条路各走各的。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  册上那一行对不上，而有一个人记得你家原先在巷子哪一头——')
  console.log('  他能说的只是他见过的那一段，可那一段恰好没有别人见过。\n')
}
