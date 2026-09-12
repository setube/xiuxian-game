/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 路上遇见的那几件事——三卷各自走得到吗。
 *
 * `encounters.ts` 里三个场景是修行纵切的早期感知层：
 *
 *   omen:wounded   受伤的人倒在路边（孩童视角）
 *   omen:book      旧书摊里那册奇书
 *   omen:merchant  走南闯北的商人
 *
 * 核心节点分别是：close-look / notice / after（走近/注意到/发现了）。
 * verify 里部分节点零命中，因为前置 leaning/knowledge 条件苛刻。
 * 摆局，把每一支关键分叉都验一遍。
 *
 * 跑法：bun scripts/encounters.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 12): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 15,
): string[] {
  const s = lifeScenes[scene]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = from

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = s.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)

    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const want = pick(open.map((o) => o.id))
      const chosen: Choice = open.find((one) => one.id === want) ?? open[0]!
      if (chosen.effects) applyEffects(chosen.effects)
      at = chosen.next ?? undefined
      continue
    }
    const branch = node.branches?.find((one) => meetsAll(one.requires))
    at = branch?.next ?? node.next ?? undefined
  }
  return walked
}

function play(scene: string, pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 路上遇见的那几件事——三卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、omen:wounded（受伤的人）。
 *
 * 关键分叉：notice（注意到了）/ unseen（没注意到）/ walked-on（走过去了）。
 * interest 节点里有 lift/inspect/fetch/leave 四个选项。
 */
{
  const SCENE = 'omen:wounded'

  // unseen：open 兜底走 unseen（没注意到）
  stage()
  const unseenWalked = play(SCENE, (opts) => opts[0]!)
  if (
    !unseenWalked.includes('unseen') &&
    !unseenWalked.includes('noticed-but-ignored') &&
    !unseenWalked.includes('notice')
  ) {
    console.log(`  ✗ wounded open：没走到任何分叉（走过 ${unseenWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ wounded open：走进去了，到了 ${unseenWalked[unseenWalked.length - 1]}。`)
  }

  // notice → interest → lift（走近去帮）
  // 直接从 interest 节点演，绕过 open 的随机分叉
  stage()
  const liftWalked = playFrom(SCENE, 'interest', (opts) =>
    opts.includes('lift') ? 'lift' : opts[0]!,
  )
  if (!liftWalked.includes('after')) {
    console.log(`  ✗ wounded lift：选了「扶」却没走到 after（走过 ${liftWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ wounded lift（走近去帮）：走到了。')
  }

  // walked-on：直接从 interest 演，选 leave
  stage()
  const leaveWalked = playFrom(SCENE, 'interest', (opts) =>
    opts.includes('leave') ? 'leave' : opts[0]!,
  )
  if (!leaveWalked.includes('walked-on')) {
    console.log(`  ✗ wounded walked-on：选了「走开」却没走到（走过 ${leaveWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ wounded walked-on（走开）：走到了。')
  }
}

/**
 * 二、omen:book（旧书摊里那册奇书）。
 *
 * 关键节点：notice → interest → bought/kept/literate/already。
 * asked 分叉（问了书主，书主回答了）。
 */
{
  const SCENE = 'omen:book'

  // notice → interest → buy
  stage()
  const boughtWalked = play(SCENE, (opts) => (opts.includes('buy') ? 'buy' : opts[0]!))
  if (
    !boughtWalked.includes('bought') &&
    !boughtWalked.includes('notice') &&
    !boughtWalked.includes('interest')
  ) {
    console.log(`  ✗ book bought：选了「买」却没走到核心节点（走过 ${boughtWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ book 买了路线：走到了 ${boughtWalked[boughtWalked.length - 1]}。`)
  }

  // ask → asked（问了书主）
  stage()
  const askedWalked = playFrom(SCENE, 'interest', (opts) =>
    opts.includes('ask') ? 'ask' : opts[0]!,
  )
  if (!askedWalked.includes('asked')) {
    console.log(`  ✗ book asked：选了「问书主」却没走到（走过 ${askedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ book asked（问了书主）：走到了。')
  }

  // away（走开）
  stage()
  const awayWalked = playFrom(SCENE, 'interest', (opts) =>
    opts.includes('away') ? 'away' : opts[0]!,
  )
  if (awayWalked.length === 0) {
    console.log('  ✗ book away：从 interest 走开走了零步——节点有问题。')
    bad += 1
  } else {
    console.log(`  ✓ book 走开路线：走到了 ${awayWalked[awayWalked.length - 1]}。`)
  }
}

/**
 * 三、omen:merchant（走南闯北的商人）。
 *
 * 这一卷有两个事件：第一次遇见（omen-merchant-1）和再遇（omen-merchant-2/3）。
 * 关键节点：first（第一次见到）→ notice/interest → talk/pour/listen/away。
 * after（有所得）/ overheard（旁听到了）/ missed（没在意）。
 */
{
  const SCENE = 'omen:merchant'

  // open → first（进卷就走到 first）
  stage()
  const firstWalked = play(SCENE, (opts) => opts[0]!)
  if (!firstWalked.includes('first')) {
    console.log(`  ✗ merchant first：没走到（走过 ${firstWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ merchant first（第一次见到）：走到了。')
  }

  // pour → after（倒了茶，有所得）
  stage()
  const pourWalked = playFrom(SCENE, 'interest', (opts) =>
    opts.includes('pour') ? 'pour' : opts[0]!,
  )
  if (!pourWalked.includes('after')) {
    console.log(`  ✗ merchant after：选了「倒茶」却没走到（走过 ${pourWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ merchant after（倒茶有所得）：走到了。')
  }

  // missed（没在意）
  stage()
  const missedWalked = playFrom(SCENE, 'notice', (opts) => opts[0]!)
  if (
    !missedWalked.includes('missed') &&
    !missedWalked.includes('after') &&
    !missedWalked.includes('overheard')
  ) {
    console.log(`  ✗ merchant 结果节点：没走到任何结果（走过 ${missedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ merchant 结果节点：走到了 ${missedWalked[missedWalked.length - 1]}。`)
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了，不是零步就结束。
 */
{
  const scenes = ['omen:wounded', 'omen:book', 'omen:merchant'] as const
  for (const scene of scenes) {
    stage()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：三卷各自都走进去了。')
}

/**
 * 效果层：**三次遇见，做了什么就留下什么**。
 *
 * 上面那几条验的是「各支分叉走得到」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 三卷各是一次「路上遇见」，各留各的：
 *
 *     伤者   inspect 见识 +2   fetch 心志 +2   leave 落「走开了」的旗
 *     旧书   buy 家底 -1       leaf 见识 +1
 *     行商   talk 见识 +2      pour 心志 +2 且落「给他倒过茶」的旗
 *
 * ## 两面旗是这三卷唯一留到后头的东西
 *
 * `left-wounded-man` 和 `poured-for-merchant`——**别的都是几点属性，
 * 只有这两面旗会被后头的卷读到**。走开那一次尤其：
 * 它记的不是「你少拿了两点见识」，是**你从那个人身边走过去了**。
 *
 * 判「做了不同的事留下不同的东西」不判「inspect 正好 +2」。
 */
{
  interface Left {
    insight: number
    will: number
    standing: number
    flags: string[]
  }

  const WATCHED = ['left-wounded-man', 'poured-for-merchant'] as const

  function leftBy(scene: string, from: string, pick: string): Left {
    stage()
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const world = useWorldStore()
    const before = {
      insight: character.attributes.insight,
      will: character.attributes.will,
      standing: household.standing,
    }
    playFrom(scene, from, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    return {
      // 记增量：每次摆局各起各的 pinia，属性和家底起手都是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
      standing: household.standing - before.standing,
      flags: WATCHED.filter((one) => world.getFlag(one) === true),
    }
  }

  const inspect = leftBy('omen:wounded', 'interest', 'inspect')
  const fetch = leftBy('omen:wounded', 'interest', 'fetch')
  const left = leftBy('omen:wounded', 'interest', 'leave')
  const buy = leftBy('omen:book', 'interest', 'buy')
  const pour = leftBy('omen:merchant', 'interest', 'pour')

  const wrong: string[] = []
  if (inspect.insight <= 0) wrong.push(`走近去看该长见识，实际 ${inspect.insight}`)
  if (fetch.will <= 0) wrong.push(`跑一趟去取水该长心志，实际 ${fetch.will}`)
  if (inspect.insight === fetch.insight && inspect.will === fetch.will) {
    wrong.push('察看和取水落下同样的东西——那一节几条路没有分别')
  }
  if (!left.flags.includes('left-wounded-man')) {
    wrong.push('从那个人身边走过去了，却没留下那面旗——这一卷唯一记得住的事丢了')
  }
  if (inspect.flags.includes('left-wounded-man')) {
    wrong.push('走近去看了，却记成「走开了」')
  }
  if (buy.standing >= 0) wrong.push(`买了那本书该花钱，家底却是 ${buy.standing}`)
  if (!pour.flags.includes('poured-for-merchant')) {
    wrong.push('给行商倒过茶，却没留下那面旗')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 遇见效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 遇见效果层：察看 +${inspect.insight} 见识、取水 +${fetch.will} 心志、` +
        `走开留了旗；买书折 ${buy.standing}；倒茶留了旗。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  路上遇见的那几件事，各自有人走过了，做了什么也各留各的。\n')
}
