/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 遗债：欠债的人没了，簿上那笔账怎么办。
 *
 * 债是两个人之间的一件历史事实（`IOU`），它不看谁死了——哥没了，「他欠你半年的粮」
 * 和「你欠他二两银子」两笔照旧开着，`owed` 条件照旧成立。从前没有一卷来了结它：
 * 正月里那一卷只要分了家就演，于是哥没了之后照样说「那二两银子，你没提，他也没提」
 * ——一个殁了的人「没提」。`present.ts` 抓不到它：那句里没有「哥」，只有「他」。
 *
 * 现在由哥没了那一卷了结：他欠你的勾了（`forgive`，簿上记「免」），你欠他的下葬那天
 * 交给老屋（`repay`，记「还」）。**债不随人死自动消**——`IOU` 上没有任何「人殁则销」的规则，
 * 了结是内容写的一件事，不是引擎的一条规矩（施工决议：过程中状态不拥有自己的流转规则）。
 *
 *   一、摆好的局：两笔债、哥没了 → 丧事那一卷了结两笔，一免一还；家境为那二两银子落了；
 *       编年各记一笔；之后正月里两句都不再说；`owed settled:false` 两头都不成立。
 *   二、反面：哥活着，正月里那两句照说；你早还了银子，丧事上不再还第二回、家境不再落；
 *       没有债的丧事一个字不提债；嫂子不在场时银子交给老屋当家的。
 *   三、簿上分得清「还」和「免」：还过的那笔 `how` 是还，勾了的那笔是免；旧账（没有 how）当还了。
 *   四、随机人生只报数：哥没了那一卷演过之后，你和哥之间没有一笔还开着的债；
 *       哥没了之后正文里没有「他也没提」。
 */
import './lib/seeded'

import { lifeEvents } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { mapShards } from './lib/parallel'
import { grownUp, play, type Staged } from './lib/staged'
import type { OwedLife } from './tasks/owed-lives'

const LIVES = 120

const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)
const HE_OWES = { owed: { debtor: 'brother', creditor: 'me', settled: false } } as const
const I_OWE = { owed: { debtor: 'me', creditor: 'brother', settled: false } } as const

/** 分了家的农户，哥在老屋：先记两笔债，再让哥殁 */
function indebted(bothWays: { he: boolean; me: boolean }): Staged | null {
  for (let tries = 0; tries < 8; tries += 1) {
    const s = grownUp()
    if (!s) continue
    if (bothWays.he)
      s.people.owe({ debtor: 'brother', creditor: 'me', what: '半年的粮', terms: '开春还' })
    if (bothWays.me)
      s.people.owe({ debtor: 'me', creditor: 'brother', what: '二两银子', terms: '秋后还' })
    applyEffects([{ type: 'person', id: 'brother', fate: '殁', cause: '病' }])
    // 摆局里的人会老死：嫂子得还在，丧事上银子才有人接
    if (s.people.isAlive('brother-wife')) return s
  }
  return null
}

let bad = 0

// ============================================================
// 一、两笔债，哥没了：一免一还
// ============================================================
{
  const wrong: string[] = []
  const s = indebted({ he: true, me: true })
  if (!s) wrong.push('掷不出局')
  else {
    if (!meetsAll([HE_OWES]) || !meetsAll([I_OWE])) wrong.push('摆局：两笔债没记上')
    const gone = eventOf('kindred-brother-gone')
    if (!gone || !meetsAll(gone.requires)) wrong.push('哥没了，丧事那一卷却关着')
    const standingBefore = s.household.standing
    const chronicleBefore = s.world.chronicle.length
    const texts = play('kindred:brother-gone')
    if (!texts.some((line) => line.includes('那笔粮') && line.includes('没再提')))
      wrong.push(`他欠你的粮该勾了：${texts.slice(-3).join(' / ')}`)
    if (!texts.some((line) => line.includes('二两银子') && line.includes('交给了')))
      wrong.push(`你欠他的银子该还给老屋：${texts.slice(-3).join(' / ')}`)
    if (meetsAll([HE_OWES])) wrong.push('丧事演完，他欠你的那笔粮簿上还开着')
    if (meetsAll([I_OWE])) wrong.push('丧事演完，你欠他的那笔银子簿上还开着')
    const grain = s.people.ious.find((one) => one.debtor === 'brother')
    const silver = s.people.ious.find((one) => one.debtor === 'me')
    if (grain?.how !== '免')
      wrong.push(`他欠你的粮该是勾了（免），簿上记的是「${grain?.how ?? '（空）'}」`)
    if (silver?.how !== '还')
      wrong.push(`你欠他的银子该是还了，簿上记的是「${silver?.how ?? '（空）'}」`)
    if (s.household.standing !== standingBefore - 6)
      wrong.push(`还了二两银子，家境该落 6：${standingBefore} → ${s.household.standing}`)
    const added = s.world.chronicle.slice(chronicleBefore).map((one) => one.text)
    if (!added.some((line) => line.includes('那笔粮'))) wrong.push('勾了粮，编年没记')
    if (!added.some((line) => line.includes('二两银子'))) wrong.push('还了银子，编年没记')
    // 之后正月里两句都不再说
    const visit = play('kindred:newyear')
    if (visit.some((line) => line.includes('那笔粮') || line.includes('那二两银子')))
      wrong.push(
        `债都了结了，正月里还在提：${visit.find((l) => l.includes('那笔粮') || l.includes('那二两银子'))}`,
      )
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、一免一还：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、哥没了：他欠你的粮勾了（免），你欠他的银子下葬那天交给了嫂子（还）；家境落了、编年记了；正月里不再提。',
    )
}

// ============================================================
// 二、反面
// ============================================================
{
  const wrong: string[] = []
  // 哥活着：正月里那两句照说
  {
    const s = grownUp()
    if (!s) wrong.push('掷不出局')
    else {
      s.people.owe({ debtor: 'brother', creditor: 'me', what: '半年的粮', terms: '开春还' })
      s.people.owe({ debtor: 'me', creditor: 'brother', what: '二两银子', terms: '秋后还' })
      const visit = play('kindred:newyear')
      if (!visit.some((line) => line.includes('那笔粮'))) wrong.push('哥活着、欠你粮，正月里却不提')
      if (!visit.some((line) => line.includes('那二两银子')))
        wrong.push('哥活着、你欠他银子，正月里却不提')
    }
  }
  // 你早还了银子：丧事上不再还第二回
  {
    const s = grownUp()
    if (!s) wrong.push('掷不出第二局')
    else {
      s.people.owe({ debtor: 'me', creditor: 'brother', what: '二两银子', terms: '秋后还' })
      s.people.repay('me', 'brother')
      applyEffects([{ type: 'person', id: 'brother', fate: '殁', cause: '病' }])
      const standingBefore = s.household.standing
      const texts = play('kindred:brother-gone')
      if (texts.some((line) => line.includes('二两银子')))
        wrong.push('银子早还了，丧事上又还了一回')
      if (s.household.standing !== standingBefore) wrong.push('没有债可还，家境却落了')
      if (s.people.ious.filter((one) => one.debtor === 'me').length !== 1)
        wrong.push('还过的那笔被记成了两笔')
    }
  }
  // 没有债：一个字不提
  {
    const s = grownUp()
    if (!s) wrong.push('掷不出第三局')
    else {
      applyEffects([{ type: 'person', id: 'brother', fate: '殁', cause: '病' }])
      const texts = play('kindred:brother-gone')
      if (texts.some((line) => line.includes('粮') || line.includes('银子')))
        wrong.push(
          `没有债，丧事上却提了：${texts.find((l) => l.includes('粮') || l.includes('银子'))}`,
        )
      if (s.people.ious.length !== 0) wrong.push('没有债，簿上却多了一笔')
    }
  }
  // 嫂子不在场：银子交给老屋当家的
  {
    const s = indebted({ he: false, me: true })
    if (!s) wrong.push('掷不出第四局')
    else {
      applyEffects([{ type: 'person', id: 'brother-wife', fate: '殁', cause: '病' }])
      const texts = play('kindred:brother-gone')
      if (!texts.some((line) => line.includes('交给了老屋当家的')))
        wrong.push(`嫂子不在了，银子该交给老屋当家的：${texts.slice(-2).join(' / ')}`)
      if (texts.some((line) => line.includes('嫂子') && line.includes('二两银子')))
        wrong.push('嫂子不在了，银子却交给了她')
      if (meetsAll([I_OWE])) wrong.push('交给了老屋，簿上却还开着')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、反面：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 二、哥活着正月里照提；早还了的不还第二回；没有债一个字不提；嫂子不在了银子交给老屋当家的。',
    )
}

// ============================================================
// 三、簿上分得清「还」和「免」
// ============================================================
{
  const wrong: string[] = []
  const s = grownUp()
  if (!s) wrong.push('掷不出局')
  else {
    s.people.owe({ debtor: 'brother', creditor: 'me', what: '半年的粮', terms: '开春还' })
    s.people.owe({ debtor: 'brother', creditor: 'me', what: '一斗豆子', terms: '年底还' })
    applyEffects([{ type: 'repay', debtor: 'brother', creditor: 'me' }])
    applyEffects([{ type: 'forgive', debtor: 'brother', creditor: 'me' }])
    const [first, second] = s.people.ious
    if (first?.how !== '还' || first.settled === null)
      wrong.push(`先记的那笔该是还了：${JSON.stringify(first)}`)
    if (second?.how !== '免' || second.settled === null)
      wrong.push(`后记的那笔该是勾了：${JSON.stringify(second)}`)
    if (meetsAll([HE_OWES])) wrong.push('两笔都了结了，「还欠着」却仍成立')
    if (!meetsAll([{ owed: { debtor: 'brother', creditor: 'me', settled: true } }]))
      wrong.push('了结了，「了结过」却不成立')
    // 没有债可勾：什么也不做，不造一笔
    const before = s.people.ious.length
    applyEffects([{ type: 'forgive', debtor: 'brother', creditor: 'me' }])
    if (s.people.ious.length !== before) wrong.push('没有欠着的债，forgive 却造了一笔')
    // 旧存档：没有 how 的那笔当还了——条件层不读 how，簿上也不会把它当成没了结
    s.people.ious = [
      {
        id: 'iou-old',
        debtor: 'me',
        creditor: 'brother',
        year: 1,
        what: '旧账',
        terms: '',
        settled: 2,
      },
    ]
    if (meetsAll([I_OWE])) wrong.push('旧存档里没有 how 的已结账，被当成了没了结')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、还与免：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log('  ✓ 三、簿上分得清还了和勾了；没有债可勾不造一笔；旧账没有 how 照旧算了结。')
}

// ============================================================
// 四、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  /**
   * 哥没了那一卷在随机人生里稀（要分了家、哥先殁、年表挑中它），一百二十世里常常一世也没有——
   * 那一把第四条就没有输入，绿得毫无意义：摆局跑的前三条验不出「这一卷在真世里演不演得到」
   * （52 那五卷就是这么死的，八条判据全绿）。掷到至少有几世为止（上限十倍），
   * 头一句报的世数照旧是头一批的（`day.ts`/`portrait.ts` 同一写法）。
   */
  const ENOUGH = 3
  const CAP = LIVES * 10
  let lives = (
    await mapShards<OwedLife[]>({ task: 'scripts/tasks/owed-lives.ts', runs: LIVES })
  ).flat()
  const firstBatch = lives.length
  const enough = (): boolean =>
    lives.filter((one) => one.brotherGone).length >= ENOUGH &&
    lives.some((one) => one.brotherGone && one.debtsAtDeath > 0)
  while (!enough() && lives.length < CAP) {
    const more = (
      await mapShards<OwedLife[]>({ task: 'scripts/tasks/owed-lives.ts', runs: LIVES * 2 })
    ).flat()
    lives = [...lives, ...more]
  }
  const mourned = lives.filter((one) => one.brotherGone)
  const withDebt = mourned.filter((one) => one.debtsAtDeath > 0)
  console.log(
    `\n  ${firstBatch} 世农户（补掷到 ${lives.length} 世）：哥没了 ${mourned.length} 世，其中他没时两家之间还欠着债的 ${withDebt.length} 世` +
      `（勾了 ${withDebt.filter((one) => one.forgiven).length}，还了 ${withDebt.filter((one) => one.repaid).length}）`,
  )
  if (mourned.length === 0)
    wrong.push(
      `掷了 ${lives.length} 世没有一世走到哥没了那一卷——第四条没有输入，前三条验的是一个真世里演不到的局面`,
    )
  else if (withDebt.length === 0)
    console.log(
      `  ⚠ 掷了 ${lives.length} 世，哥没了那一卷演过 ${mourned.length} 回，没有一回是带着债没的——` +
        '「有债时哥没了」在真世里到得了但很稀（借粮要荒年、还粮要年景好、哥得死在两者之间）。' +
        '前三条量的局面真世里演得到，只是这一把没掷到；后半（殁了的人不「没提」）照判。',
    )
  for (const one of mourned) {
    if (one.openAfter > 0) wrong.push(`哥没了那一卷演过了，两家之间还开着 ${one.openAfter} 笔债`)
    for (const line of one.deadSpoke) wrong.push(`哥没了之后正文里还说他「没提」：「${line}」`)
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 四、哥没了那一卷演过的每一世，两家之间没有一笔还开着的债；正文里没有殁了的人「没提」。',
    )
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log(
    '  遗债：债不随人死自动消，了结它的是丧事那一卷——一免一还，簿上分得清。四条全部成立。\n',
  )
}
