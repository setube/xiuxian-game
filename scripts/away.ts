/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 在外的那些年：哥在镇上谋生十年二十年，家里的事照旧发生。
 *
 * 用户 2026-09-07 点的观察题：一个人一旦在外谋生十年二十年，家庭、婚姻、子女、关系、财产和原户
 * 之间会怎样自然变化。这一支把 `life/away.ts` 那一册在摆好的局上一节一节演下去
 * （工具在 `lib/staged.ts`），随机人生里只报数。
 *
 *   一、财产从营生里出：哥还在地上的荒年他来借粮，去了镇上的荒年是他捎银子回来；
 *       收下是一笔债——第二笔，欠的是银、方向反着，进的是同一个 `IOU` 格；年景好了你去还
 *   二、娘没了他在镇上：赶回来已是第三天，那一回你跟他的边动的是减不是加
 *   三、伤了手回老屋：自己的营生清掉、人回老屋、老屋的营生不动；回来了就不再走
 *   四、老了做不动了回老屋：五十八开、五十不开；正月里不再「从镇上回来」
 *   五、在地上的哥种不动了、儿子在镇上：亲厚平常的回来，不睦的不回，地是嫂子种着
 *   六、侄儿出师：手上的活换了，营生还是佣工
 *   七、侄儿在镇上成的亲：媳妇进的是老屋、落在老屋——户在哪看户里多数人，不看当家的在哪
 *   八、尺子自检：「户在哪」那把尺的三种局
 *
 * 跑法：bun scripts/away.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import { type Staged, ageTo, grownUp, play, weather } from './lib/staged'

const LIVES = 160

const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)
const owesHim = (s: Staged): boolean =>
  s.people.ious.some(
    (one) => one.debtor === 'me' && one.creditor === 'brother' && one.settled === null,
  )
/** 老屋在哪：嫂子从没离开过 */
const oldHomePlace = (s: Staged): string | undefined => s.people.personOf('brother-wife')?.place
/** 人殁了走效果，户主才会重算（`keepHeads`）——直接改 fate 户主还写着死人 */
const dies = (id: string): void => {
  applyEffects([{ type: 'person', id, fate: '殁' }])
}
/** 哥去了镇上做木匠 */
const turns = (s: Staged): boolean => {
  s.people.amend('brother', { temper: '精明' })
  play('kindred:brother-turns')
  return s.people.livelihoodOf('brother') === '木工'
}
/** 侄儿去了镇上当学徒，父子那条边按 terms 摆 */
const sends = (s: Staged, terms: '亲厚' | '不睦'): boolean => {
  s.people.amend('nephew', { temper: terms === '亲厚' ? '温和' : '刚硬' })
  s.people.amend('brother', { temper: terms === '亲厚' ? '温和' : '刚硬' })
  s.world.setFlag('nephew-restless', true)
  play('nephew:goes')
  return (
    s.people.livelihoodOf('nephew') === '佣工' &&
    s.people.termsBetween('nephew', 'brother') === terms
  )
}

console.log(`\n=== 在外的那些年：哥在镇上谋生十年二十年（${LIVES} 世随机人生只报数）===\n`)
let bad = 0

// 随机人生：只报数
const counts = {
  turned: 0,
  lent: 0,
  repaid: 0,
  hurt: 0,
  old: 0,
  fatherOld: 0,
  journeyman: 0,
  wedsAway: 0,
}
for (let i = 0; i < LIVES; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  for (let turn = 0; !narrative.ended && turn < 240; turn += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
  }
  const fired = (id: string): boolean => world.hasFlag(`event:${id}`)
  if (fired('kindred-brother-turns') || fired('kindred-brother-turns-debt')) counts.turned += 1
  if (fired('away-lends')) counts.lent += 1
  if (fired('away-i-repay') || fired('away-i-repay-need')) counts.repaid += 1
  if (fired('away-hurt')) counts.hurt += 1
  if (fired('away-old')) counts.old += 1
  if (fired('away-father-old')) counts.fatherOld += 1
  if (fired('away-journeyman')) counts.journeyman += 1
  if (fired('kindred-nephew-weds') && world.hasFlag('nephew-went')) counts.wedsAway += 1
}
console.log(
  `  ${LIVES} 世：哥改行 ${counts.turned}，捎银子 ${counts.lent}，还银子 ${counts.repaid}，伤了手 ${counts.hurt}，` +
    `老了回来 ${counts.old}，种不动了 ${counts.fatherOld}，侄儿出师 ${counts.journeyman}，在镇上成的亲 ${counts.wedsAway}`,
)

// 一、财产从营生里出：第二笔债
{
  const wrong: string[] = []
  const lends = eventOf('away-lends')
  const repay = eventOf('away-i-repay')
  const borrow = eventOf('kindred-borrow')
  const s = grownUp()
  if (!s || !lends || !repay || !borrow) wrong.push('掷不出局，或者年表上少了那几卷')
  else {
    // 你家紧：推到二十岁的农户家境在五十上下，先压到「紧巴」那一档，这一局才有得说
    s.household.shiftStanding(40 - s.household.standing)
    weather(s, { grain: 130, harvest: 30 })
    if (meetsAll(lends.requires)) wrong.push('哥还在地上种地，荒年却是他捎银子来——他哪来的银子')
    if (!meetsAll(borrow.requires)) wrong.push('哥在地上，荒年借粮那一卷该开着')
    weather(s, {})
    if (!turns(s)) wrong.push('摆不出去了镇上的哥')
    weather(s, { grain: 130, harvest: 30 })
    if (meetsAll(borrow.requires)) wrong.push('哥去了镇上做木匠，荒年却还来借粮——他不在地上')
    if (!meetsAll(lends.requires)) wrong.push('哥在镇上有银钱、你家荒年紧，捎银子那一卷却关着')
    const standingBefore = s.household.standing
    const brotherBefore = s.people.known['brother']?.affinity ?? 0
    play('away:lends', 'take')
    const iou = s.people.ious.find((one) => one.debtor === 'me' && one.creditor === 'brother')
    if (!iou) wrong.push('收了银子，账上没有这笔债')
    else {
      if (!iou.what.includes('银')) wrong.push(`欠的该是银子，账上写的是「${iou.what}」`)
      if (iou.settled !== null) wrong.push('刚收下就销了')
    }
    if (!(s.household.standing > standingBefore)) wrong.push('收了二两银子，家境没宽')
    if (!((s.people.known['brother']?.affinity ?? 0) > brotherBefore))
      wrong.push('荒年他捎银子来，你跟他的边没动')
    // 两笔债并存：先前那笔粮（他欠你）和这笔银（你欠他）各是各的
    weather(s, {})
    s.people.owe({ debtor: 'brother', creditor: 'me', what: '半年的粮', terms: '开春还' })
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('那二两银子'))) wrong.push('欠着他银子，正月里那一卷却没提')
    if (!visit.some((l) => l.includes('那笔粮'))) wrong.push('他还欠着粮，正月里那一卷却没提')
    s.people.repay('brother', 'me')
    // 年景好了你去还：他在镇上就去镇上
    weather(s, { harvest: 30 })
    if (meetsAll(repay.requires)) wrong.push('年景没好就催着还')
    weather(s, { harvest: 60 })
    if (!meetsAll(repay.requires)) wrong.push('欠着他银子、年景好了，还银子那一卷却关着')
    const lines = play('away:i-repay')
    if (!lines.some((l) => l.includes('镇上')))
      wrong.push(`他在镇上，还银子却没去镇上：${lines[0] ?? '（没有正文）'}`)
    if (owesHim(s)) wrong.push('还了银子，那笔债还没销')
    if (s.household.standing !== standingBefore)
      wrong.push(`收了又还了，家境却从 ${standingBefore} 变成了 ${s.household.standing}`)
    if (meetsAll(repay.requires)) wrong.push('还清了，还银子那一卷还开着')
    const again = play('kindred:newyear')
    if (again.some((l) => l.includes('那二两银子'))) wrong.push('还清了，正月里还在提那二两银子')
  }
  // 推回去：没有债
  const t = grownUp()
  if (!t) wrong.push('掷不出第二局')
  else {
    turns(t)
    weather(t, { grain: 130, harvest: 30 })
    play('away:lends', 'refuse')
    if (owesHim(t)) wrong.push('推回去了，账上却记了债')
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 一、第二笔债：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 一、哥在地上的荒年他来借粮，去了镇上的荒年是他捎银子来；收下是一笔债——欠的是银、方向反着，跟那笔粮各是各的、正月里各提各的；` +
        `年景好了你去镇上还，还清了不再提，家境收了又还回到原处；推回去就没有债。（随机人生里捎银子 ${counts.lent} 世）`,
    )
  }
}

// 二、娘没了他在镇上
{
  const wrong: string[] = []
  const s = grownUp()
  const t = grownUp()
  if (!s || !t) wrong.push('掷不出局')
  else {
    // 在地上：跪在前头，加
    const homeBefore = s.people.known['brother']?.affinity ?? 0
    s.people.amend('mother', { fate: '殁' })
    const home = play('kindred:mourning')
    if (!home.some((l) => l.includes('跪在前头')))
      wrong.push('哥在老屋，娘没了那一卷却没说他跪在前头')
    if (!((s.people.known['brother']?.affinity ?? 0) > homeBefore))
      wrong.push('一起守了孝，你跟哥的边没近')
    // 在镇上：没赶上，减
    if (!turns(t)) wrong.push('摆不出去了镇上的哥')
    const awayBefore = t.people.known['brother']?.affinity ?? 0
    t.people.amend('mother', { fate: '殁' })
    const away = play('kindred:mourning')
    if (!away.some((l) => l.includes('没赶上下葬')))
      wrong.push(`哥在镇上，娘没了那一卷却没说他没赶上：${away[1] ?? ''}`)
    if (away.some((l) => l.includes('跪在前头'))) wrong.push('哥在镇上，那一卷却说他跪在前头')
    if (!((t.people.known['brother']?.affinity ?? 0) < awayBefore))
      wrong.push('娘下葬他没赶上，你跟他的边却没动、或者反而近了')
    if (t.people.houseOf('brother')?.id !== 'old-home') wrong.push('娘没了，哥就不是老屋的人了')
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 二、娘没了他在镇上：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 二、娘没了：哥在老屋是跪在你前头、你们的边近了一格；哥在镇上是赶回来没赶上下葬、那一回动的是减。',
    )
}

// 三、伤了手回老屋；四、老了回老屋
{
  const wrong: string[] = []
  const hurt = eventOf('away-hurt')
  const old = eventOf('away-old')
  const need = eventOf('away-i-repay-need')
  const s = grownUp()
  if (!s || !hurt || !old || !need) wrong.push('掷不出局，或者年表上少了那几卷')
  else {
    s.household.shiftStanding(40 - s.household.standing)
    if (!turns(s)) wrong.push('摆不出去了镇上的哥')
    const home = oldHomePlace(s)
    const headBefore = s.people.houses['old-home']?.head
    if (s.people.personOf('brother')?.place === home) wrong.push('哥去了镇上，人却还在老屋')
    if (!meetsAll(hurt.requires)) wrong.push('哥在镇上做木匠，伤手那一卷却关着')
    // 先欠着他银子：他伤了手，你不等年景也还
    weather(s, { grain: 130, harvest: 30 })
    play('away:lends', 'take')
    weather(s, {})
    if (meetsAll(need.requires)) wrong.push('他好好的，「不等年景也还」那一卷就开了')
    const lines = play('away:hurt')
    if (!lines.some((l) => l.includes('伤了手'))) wrong.push('伤手那一卷没说伤了手')
    if (s.people.livelihoodOf('brother') !== '务农')
      wrong.push(`伤了手回老屋，问他靠什么谋生却是「${s.people.livelihoodOf('brother') ?? '无'}」`)
    if (s.people.personOf('brother')?.livelihood !== undefined)
      wrong.push('回老屋了，自己那格营生没清')
    if (s.people.personOf('brother')?.place !== home)
      wrong.push(`回老屋了，人却在 ${s.people.personOf('brother')?.place}`)
    if (s.people.houses['old-home']?.livelihood !== '务农')
      wrong.push('哥伤了手，老屋的营生跟着变了')
    if (s.people.houses['old-home']?.head !== headBefore)
      wrong.push(`哥伤了手回来，老屋的当家从 ${headBefore} 换成了 ${s.people.houses['old-home']?.head}`)
    if (meetsAll(hurt.requires) || meetsAll(old.requires))
      wrong.push('已经回了老屋，伤手／老了回来那两卷还开着')
    if (!meetsAll(need.requires))
      wrong.push('他伤了手做不了活，你欠着他银子，「不等年景也还」那一卷却关着')
    const repaid = play('away:i-repay')
    if (!repaid.some((l) => l.includes('老屋')))
      wrong.push(`他回了老屋，银子却送去了别处：${repaid[0] ?? ''}`)
    if (owesHim(s)) wrong.push('还了，债没销')
    const visit = play('kindred:newyear')
    if (visit.some((l) => l.includes('从镇上回来')))
      wrong.push('哥回了老屋，正月里却还说他从镇上回来')
  }
  const t = grownUp()
  if (!t || !old) wrong.push('掷不出第二局')
  else {
    turns(t)
    const home = oldHomePlace(t)
    ageTo(t, 'brother', 50)
    if (meetsAll(old.requires)) wrong.push('哥五十，老了回来那一卷就开了')
    ageTo(t, 'brother', 58)
    if (!meetsAll(old.requires)) wrong.push('哥五十八、在镇上做木匠，老了回来那一卷却关着')
    const lines = play('away:old')
    if (!lines.some((l) => l.includes('五十八岁')))
      wrong.push(`老了回来那句岁数不对：${lines[0] ?? ''}`)
    if (t.people.livelihoodOf('brother') !== '务农' || t.people.personOf('brother')?.place !== home)
      wrong.push('老了回来，营生没落回老屋的、或者人没回老屋')
    if (t.people.houseOf('brother')?.id !== 'old-home')
      wrong.push('在镇上待了这些年，回来就不是老屋的人了')
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 三四、回老屋：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 三四、伤了手、老了做不动了都回老屋：自己的营生清掉落回老屋的、人回老屋、老屋的营生和当家的都不动，回来了就不再走；` +
        `他伤了手你不等年景也还、银子送去老屋；正月里不再说他从镇上回来。（随机人生里伤了手 ${counts.hurt} 世，老了回来 ${counts.old} 世）`,
    )
  }
}

// 五、在地上的哥种不动了、儿子在镇上：回不回来看父子那条边
{
  const wrong: string[] = []
  const fatherOld = eventOf('away-father-old')
  for (const terms of ['亲厚', '不睦'] as const) {
    const s = grownUp()
    if (!s || !fatherOld) {
      wrong.push('掷不出局，或者年表上没有种不动了那一卷')
      break
    }
    if (!sends(s, terms)) wrong.push(`摆不出父子${terms}、儿子在镇上的局`)
    const home = oldHomePlace(s)
    ageTo(s, 'brother', 52)
    if (meetsAll(fatherOld.requires)) wrong.push('哥五十二，种不动那一卷就开了')
    ageTo(s, 'brother', 60)
    if (!meetsAll(fatherOld.requires)) wrong.push('哥六十、在地上、儿子在镇上，种不动那一卷却关着')
    const lines = play('away:father-old')
    if (terms === '亲厚') {
      if (!lines.some((l) => l.includes('从镇上回来了')))
        wrong.push(`父子亲厚，儿子却没回来：${lines[lines.length - 1] ?? ''}`)
      if (s.people.livelihoodOf('nephew') !== '务农')
        wrong.push('儿子回来种地了，问他靠什么谋生却还是佣工')
      if (s.people.personOf('nephew')?.place !== home) wrong.push('儿子回来了，人却不在老屋')
    } else {
      if (!lines.some((l) => l.includes('没回来')))
        wrong.push(`父子不睦，那一卷却没说他没回来：${lines[lines.length - 1] ?? ''}`)
      if (s.people.livelihoodOf('nephew') !== '佣工') wrong.push('父子不睦，儿子却回来了')
      if (!(s.people.personOf('brother-wife')?.doing ?? '').includes('种地'))
        wrong.push('儿子没回来，地却没人种——嫂子手上的活没换')
    }
    if (s.people.houses['old-home']?.livelihood !== '务农') wrong.push('老屋的营生变了')
    if (s.people.houseOf('nephew')?.id !== 'old-home') wrong.push('儿子回没回来，都还该是老屋的人')
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 五、种不动了：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 五、哥六十种不动了、儿子在镇上：亲厚的回来种地，不睦的不回、地是嫂子种着；老屋的营生不动。（随机人生里 ${counts.fatherOld} 世）`,
    )
}

// 六、侄儿出师；七、在镇上成的亲
{
  const wrong: string[] = []
  const journeyman = eventOf('away-journeyman')
  // 哥在地上、侄儿在镇上：出师；成亲回来又走，媳妇留在老屋
  const s = grownUp()
  if (!s || !journeyman) wrong.push('掷不出局，或者年表上没有出师那一卷')
  else {
    if (!sends(s, '亲厚')) wrong.push('摆不出去了镇上的侄儿')
    const home = oldHomePlace(s)
    if (meetsAll(journeyman.requires)) wrong.push('侄儿十八，出师那一卷就开了')
    ageTo(s, 'nephew', 21)
    if (!meetsAll(journeyman.requires)) wrong.push('侄儿二十一、在镇上当学徒，出师那一卷却关着')
    play('away:journeyman')
    if (!(s.people.personOf('nephew')?.doing ?? '').includes('伙计'))
      wrong.push(`出师了，手上的活还是「${s.people.personOf('nephew')?.doing}」`)
    if (s.people.livelihoodOf('nephew') !== '佣工') wrong.push('出师了，营生却不是佣工了——伙计跟学徒一格')
    const lines = play('kindred:nephew-weds')
    if (lines.some((l) => l.includes('彩礼是哥'))) wrong.push('哥在地上种地，喜酒那一卷却说彩礼是他在镇上攒的')
    if (!lines.some((l) => l.includes('回镇上去了'))) wrong.push('他在镇上当伙计，喜酒那一卷却没说他又回镇上去了')
    if (s.people.houseOf('nephew-wife')?.id !== 'old-home') wrong.push('侄媳妇进的不是老屋')
    if (s.people.personOf('nephew-wife')?.place !== home) wrong.push(`侄媳妇进门落在了 ${s.people.personOf('nephew-wife')?.place}`)
    if (s.people.personOf('nephew')?.place === home) wrong.push('成了亲他该回镇上去，人却留在了老屋')
  }
  // 哥在镇上、侄儿在地上：当家的不在家，媳妇进门落的还是老屋——户在哪看户里多数人，不看当家的在哪
  const t = grownUp()
  if (!t) wrong.push('掷不出第二局')
  else {
    if (t.people.isAlive('father')) dies('father')
    if (!turns(t)) wrong.push('摆不出去了镇上的哥')
    const home = oldHomePlace(t)
    if (t.people.houses['old-home']?.head !== 'brother') wrong.push(`这一局老屋该是哥当家，却是 ${t.people.houses['old-home']?.head}`)
    if (t.people.personOf('brother')?.place === home) wrong.push('哥去了镇上，人却还在老屋')
    const lines = play('kindred:nephew-weds')
    if (!lines.some((l) => l.includes('彩礼是哥'))) wrong.push('哥在镇上做木匠，喜酒那一卷却没说彩礼是他攒的')
    if (lines.some((l) => l.includes('回镇上去了'))) wrong.push('侄儿在地上种地，喜酒那一卷却说他回镇上去了')
    if (t.people.houseOf('nephew-wife')?.id !== 'old-home') wrong.push('侄媳妇进的不是老屋')
    if (t.people.personOf('nephew-wife')?.place !== home) {
      wrong.push(`当家的在镇上，侄媳妇进门却落在了 ${t.people.personOf('nephew-wife')?.place}——户在哪看户里多数人，不看当家的在哪`)
    }
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 六七、出师与成亲：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 六七、侄儿出师手上的活换了、营生还是佣工；在镇上成的亲回来又走、媳妇留在老屋；哥在镇上做木匠彩礼是他攒的，当家的不在家媳妇进门落的还是老屋。` +
        `（随机人生里出师 ${counts.journeyman} 世，在镇上成的亲 ${counts.wedsAway} 世）`,
    )
  }
}

// 八、尺子自检：「户在哪」那把尺
{
  const wrong: string[] = []
  const s = grownUp()
  if (!s) wrong.push('掷不出局')
  else {
    const home = oldHomePlace(s)
    const town = '镇上'
    if (s.people.isAlive('father')) dies('father')
    if (s.people.houses['old-home']?.head !== 'brother') wrong.push(`这一局老屋该是哥当家，却是 ${s.people.houses['old-home']?.head}`)
    // 当家的一个人在镇上，户里别的人在老屋：户在老屋
    s.people.amend('brother', { place: town })
    if (s.people.placeOfHouse('old-home') !== home)
      wrong.push(`当家的在镇上、户里别的人在老屋，户却在 ${s.people.placeOfHouse('old-home')}`)
    // 正要回去的那个人不算他自己
    if (s.people.placeOfHouse('old-home', 'brother') !== home)
      wrong.push('正要回老屋的哥，把自己也算进了「户在哪」')
    // 平手看当家的：户里只剩哥和嫂子，一个镇上一个老屋
    for (const id of [...(s.people.houses['old-home']?.members ?? [])]) {
      if (id !== 'brother' && id !== 'brother-wife' && s.people.isAlive(id)) dies(id)
    }
    if (s.people.houses['old-home']?.head !== 'brother') wrong.push(`只剩哥和嫂子，当家的却是 ${s.people.houses['old-home']?.head}`)
    if (s.people.placeOfHouse('old-home') !== town) wrong.push('一个镇上一个老屋平手，该看当家的')
    // 只剩当家的一个：他在哪户在哪
    dies('brother-wife')
    if (s.people.placeOfHouse('old-home') !== town) wrong.push('户里只剩当家的一个，他在哪户就在哪')
    if (s.people.placeOfHouse('old-home', 'brother') !== undefined)
      wrong.push('户里没有别的活人，该答不出')
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 八、尺子自检：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 八、尺子自检：「户在哪」看户里多数活人、平手看当家的、只剩一个看他、一个没有答不出。',
    )
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  在外的那些年：八条全部成立。\n')
}
