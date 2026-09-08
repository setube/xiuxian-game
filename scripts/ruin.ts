/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 家业可以毁掉（12.md 缺口一）。
 *
 * 父债链从前停在「债还欠着」：父亲死在外地或再没消息，那个数就那样挂着，
 * 库里没有一处记下**这一户已经败了**。现在链尾有了一卷：镇上来人，地抵了债。
 * 败了不等于换一种日子——人还在原来的地里下种，只是从此种的是别人的地。
 * 所以记下这件事的是家境上新开的一格 `tenure`（自耕／佃），不是业，不是日子。
 *
 * 这一支验四件事：
 *
 *   一、摆好的局：父亲客死、债还在、地是自家的 → 那一卷进得来；演完田是佃、
 *       当年那笔债勾了、家境落了、编年记了一笔。
 *   二、反面：父亲回来了、家里开布庄、地已经是租的——三种局各自进不来。
 *   三、下游三处读者：承户不再说「如今是你的」，分家不再说「地按亩分」，
 *       成人那年「把家里的地种好」换成「把租的那几亩种好」。每一处都反着验一遍：
 *       地还是自家的时候，旧话必须还在——不然是把话删了，不是把话分了。
 *   四、随机人生只报数：农户里父债链走到尽头的有几世、地抵了债的有几世；
 *       抵了债之后正文里不许再出现把地当自家的那几句。
 *
 * 一处不去验：人物面板那一行「租着几亩地种」在 `.vue` 里，这里挂不起 Vue。
 */
import './lib/seeded'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import type { Condition } from '../src/types/game'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import type { RuinedLife } from './tasks/ruin-lives'

const LIVES = 120

const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)
const choiceOf = (scene: string, node: string, id: string) =>
  lifeScenes[scene]?.nodes[node]?.choices?.find((one) => one.id === id)

let bad = 0

// ============================================================
// 摆局
// ============================================================

/** 农户的孩子九岁，父债链走到父亲出门；他出门之后的命由调用方定 */
function inDebt(): Staged | null {
  const s = born('farm', 9, ['father', 'mother'])
  if (!s) return null
  play('debt:drought')
  play('debt:borrow', 'sit')
  play('debt:leave', 'follow')
  return s
}

/** 父亲客死。那一卷把他写成殁 */
function fatherDies(s: Staged): void {
  applyEffects([{ type: 'flag', key: 'father-fate', value: '亡' }])
  play('debt:death', 'silent')
  if (s.people.isAlive('father')) throw new Error('摆局：客死那一卷演完父亲还活着')
}

const canRuin = (): boolean => meetsAll(eventOf('debt-fields')?.requires)

// ============================================================
// 一、地抵了债：进得来，演完田是佃、债勾了、家境落了、编年记了
// ============================================================
{
  const wrong: string[] = []
  const s = inDebt()
  if (!s) wrong.push('掷不出局')
  else {
    fatherDies(s)
    if (s.household.tenure !== '自耕')
      wrong.push(`农户生下来田该是自耕，却是 ${s.household.tenure}`)
    if (s.household.debt <= 0) wrong.push('父亲借了钱，家里却不欠债')
    if (!canRuin()) wrong.push('父亲客死、债还在、地是自家的，抵债那一卷却进不来')
    const debtBefore = s.household.debt
    const standingBefore = s.household.standing
    const texts = play('debt:fields', 'listen')
    if (s.household.tenure !== '佃') wrong.push(`地抵了债，田那一格却是 ${s.household.tenure}`)
    if (s.household.debt !== debtBefore - 12) {
      wrong.push(`当年借的是 12，抵债该勾掉 12：${debtBefore} → ${s.household.debt}`)
    }
    if (s.household.standing >= standingBefore) wrong.push('地没了，家境没落')
    if (!s.world.chronicle.some((one) => one.text.includes('地抵了债'))) {
      wrong.push('编年里没有「地抵了债」')
    }
    if (!texts.some((line) => line.includes('租子'))) wrong.push('正文没讲从此要交租')
    if (texts.some((line) => line.includes('父亲') || line.includes('爹'))) {
      wrong.push('父亲不在了，这一卷里却提到了他')
    }
    if (canRuin()) wrong.push('地已经抵了，那一卷还进得来')
    // 面板那一行字问的也是这一格
    if (s.household.livelihood !== '务农') wrong.push('抵了债业不该变：种的还是地')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、地抵了债：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、父亲客死、债还在：镇上来人，地抵了债——田是佃，债勾了，家境落了，编年记了，正文里没有父亲。',
    )
}

// ============================================================
// 二、反面：三种局各自进不来
// ============================================================
{
  const wrong: string[] = []
  // 父亲回来了。从旱到回来推了近三年，他也在老：health 掷得低的那几局链尾已经老病没了，
  // 那不是这一条要验的事——掷到他真回来为止（十二局），不是让他不死
  let back: Staged | null = null
  for (let tries = 0; tries < 12 && back === null; tries += 1) {
    const s = inDebt()
    if (!s) continue
    applyEffects([{ type: 'flag', key: 'father-fate', value: '归' }])
    play('debt:return')
    if (s.people.isAlive('father')) back = s
  }
  if (!back) wrong.push('十二局里父亲没有一局活着回来，摆不出局')
  else if (canRuin()) wrong.push('父亲回来了，抵债那一卷还进得来')
  // 布庄人家：父亲没了也没有地可抵
  const b = born('cloth', 9, ['father', 'mother'])
  if (!b) wrong.push('掷不出布庄的局')
  else {
    applyEffects([
      { type: 'flag', key: 'father-in-debt', value: true },
      { type: 'person', id: 'father', fate: '殁', cause: '病' },
    ])
    if (b.household.tenure !== null)
      wrong.push(`开布庄的人家田该是 null，却是 ${b.household.tenure}`)
    if (canRuin()) wrong.push('开布庄的人家没有地，抵债那一卷却进得来')
  }
  // 父亲杳无音信：跟客死一样进得来（那笔债不因人没消息就没了）
  const c = inDebt()
  if (!c) wrong.push('掷不出第三局')
  else {
    applyEffects([{ type: 'flag', key: 'father-fate', value: '杳' }])
    play('debt:silence')
    if (c.people.isAlive('father')) wrong.push('摆局：杳那一卷演完父亲还「在」')
    else if (!canRuin()) wrong.push('父亲再没消息、债还在，抵债那一卷却进不来')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、反面：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log('  ✓ 二、父亲回来了进不来；开布庄的没有地可抵；父亲杳无音信跟客死一样进得来。')
}

// ============================================================
// 三、下游三处读者：抵了债之后旧话不再说；地还是自家的时候旧话还在
// ============================================================
{
  const wrong: string[] = []
  type Reader = {
    where: string
    stage: () => Staged | null
    /** 地还是自家的时候该说的话；抵了债之后该说的话 */
    owning: string
    renting: string
  }
  const readers: Reader[] = [
    {
      where: '承户 house:succeed',
      stage: () => born('farm', 16, ['mother']),
      owning: '如今是你的',
      renting: '租子',
    },
    {
      where: '分家 house:divide',
      stage: () => born('farm', 22, ['brother', 'mother']),
      owning: '地按亩分',
      renting: '没有地可分',
    },
    {
      where: '弟弟分家 house:divide-younger',
      stage: () => born('farm', 24, ['mother']),
      owning: '地按亩分',
      renting: '分不了',
    },
  ]
  for (const reader of readers) {
    const scene = reader.where.split(' ')[1]!
    for (const tenure of ['自耕', '佃'] as const) {
      const s = reader.stage()
      if (!s) {
        wrong.push(`${reader.where}：掷不出局`)
        continue
      }
      applyEffects([{ type: 'household', tenure }])
      const texts = play(scene)
      const want = tenure === '佃' ? reader.renting : reader.owning
      const forbid = tenure === '佃' ? reader.owning : reader.renting
      if (!texts.some((line) => line.includes(want))) {
        wrong.push(
          `${reader.where}（${tenure}）该说「${want}」，说的是：${texts.slice(-3).join(' / ')}`,
        )
      }
      if (texts.some((line) => line.includes(forbid))) {
        wrong.push(`${reader.where}（${tenure}）不该说「${forbid}」`)
      }
    }
  }
  // 成人那年的选项：地是自家的走「家里的地」，抵了债走「租的那几亩」
  const farm = choiceOf('youth:apprentice', 'open', 'farm')
  const tenant = choiceOf('youth:apprentice', 'open', 'tenant')
  if (!farm || !tenant) wrong.push('成人那一卷少了种地的两条选项')
  else {
    const s = born('farm', 16, ['mother'])
    if (!s) wrong.push('掷不出局')
    else {
      const open = (c: { requires?: Condition[] }) => meetsAll(c.requires)
      if (!open(farm) || open(tenant))
        wrong.push('地是自家的：该开「家里的地」那条、锁「租的那几亩」那条')
      applyEffects([{ type: 'household', tenure: '佃' }])
      if (open(farm) || !open(tenant))
        wrong.push('抵了债：该锁「家里的地」那条、开「租的那几亩」那条')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、读者：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 三、承户、分家、弟弟分家、成人那年四处：地是自家的旧话还在，抵了债就换成租的那几亩。',
    )
}

// ============================================================
// 四、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  const lives = (
    await mapShards<RuinedLife[]>({ task: 'scripts/tasks/ruin-lives.ts', runs: LIVES })
  ).flat()
  const lost = lives.filter((one) => one.fatherLost)
  const ruined = lives.filter((one) => one.ruined)
  // 抵债的不止链尾那两种死法：借了钱之后病没的、老没的，一样走到这一卷。那是对的——
  // 这一卷问的是「借债的人不在了」，不问他怎么没的
  const otherwise = ruined.filter((one) => !one.fatherLost)
  console.log(
    `\n  ${lives.length} 世农户：父债链走到尽头 ${lost.length} 世，地抵了债 ${ruined.length} 世` +
      `（其中 ${otherwise.length} 世父亲不是没在链尾，是别的死法）`,
  )
  const ways = new Map<string, number>()
  for (const one of ruined) {
    const key = `${one.father?.fate ?? '?'}${one.father?.cause ? `·${one.father.cause}` : ''}`
    ways.set(key, (ways.get(key) ?? 0) + 1)
  }
  if (ruined.length > 0) {
    console.log(`  · 抵债那一刻父亲的下落：${[...ways].map(([k, n]) => `${k} ${n}`).join('，')}`)
  } else console.log('  · 这一把没有一世抵债，第四条没有可判的')
  // 抵债的每一世，父亲都得是不在了的：这一卷说的是「借债的人不在了」
  for (const one of ruined) {
    if (one.father?.fate === '在') wrong.push('父亲还活着，地就抵了债')
  }
  for (const one of ruined) {
    if (one.atRuin?.tenure !== '佃') wrong.push(`抵了债那一刻田是 ${one.atRuin?.tenure}`)
    if (one.tenureAtEnd !== '佃') wrong.push(`抵了债之后田又变回了 ${one.tenureAtEnd}`)
    for (const line of one.ownedAfter) wrong.push(`抵了债之后还把地当自家的：「${line}」`)
  }
  const stillOwning = lives.filter((one) => !one.ruined && one.tenureAtEnd !== '自耕')
  for (const one of stillOwning) wrong.push(`没抵过债，田却成了 ${one.tenureAtEnd}`)
  if (wrong.length > 0) {
    console.log(`  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log('  ✓ 四、抵了债的每一世：田是佃、之后正文里没再把地当自家的；没抵过的田还是自耕。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  家业可以毁掉：地抵了债，日子一天没变，家业没了——四条全部成立。\n')
}
