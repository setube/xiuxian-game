/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 山上下来的人：修仙界作为第二层社会的第一片。
 *
 * 30.md：修仙世界同样先有世界、组织、人物、资源、规则和因果，玩家再进入其中。
 * 这一片不建 Sect 类型、不写「山上」是什么——它写一个凡人能看见的那一面：
 *
 *     药庐那位是山上的人　　　　写在他身上（`Cultivator.history`，入册即真、known:false）
 *     山上隔几年下来一个人取药　第四个修士（`the-one-who-comes-down`），不挑人不收人
 *     你翻了几年的药是往山上送的　问了、而他肯答（处到带一段往后），才成为你知道的事
 *     山上知道有你这么个人了　　处到教一点、他再下来那一趟——到此为止
 *
 *   一、摆好的局：处到使唤问他，他不答（认知层「见过·猜想」）；处到带一段问，他答「山上的」
 *       （他身上那一页翻开、认知层「亲历·确信」、编年一笔）；不问，只知道有人来取药；
 *       下山的人入册带 realm、顶在「搭话」、不教任何人；`flag.in` 这一格三种情形都判得对。
 *   二、再下来：处到教一点，「上头问起你了」（旗、认知层）；没处到，跟上回一样，什么也不落；
 *       他上回肯多说两句的（`opened:` 旗）这回进门认出你——旗由量到的数定，量不到就没有。
 *   三、壮年那一卷读得到：知道山上有人的读一句，山上问起过的读另一句，两句不同时出。
 *   四、随机人生（分片，三种走法）：有心人掷到「下来了」「答了」「上头问起了」各至少一世为止；
 *       链单调（问起 ⇒ 再来 ⇒ 下来 ⇒ 在药庐；答了 ⇒ 问了；翻开那一页 ⇔ 答了；下山的人在册 ⇔ 下来过）；
 *       不许太好走（有心人下来过 ≤ 40%、随机 ≤ 5%——山上几年才下来一趟人）。
 *       第二片：多嘴的人（有心 + 有人问就说）掷到「跟配偶说了」「他不再让你去了」各至少一世；
 *       有心人一世也没说出去；被赶出去的咽气那年跟他处在「不理会」；说了 ⇒ 被嘱咐过。
 *   五、摆好的局（第二片，「别出去乱说」是一条规矩）：没被嘱咐过的人，夜里、巷口两卷不开；
 *       嘱咐过了，配偶在夜里问、邻家户主在巷口问；跟配偶说了留在家里（他知道那一卷不开）；
 *       跟邻家说了他知道（footing 回不理会、师承那条链上的事全落空、山上不会再问起你）；
 *       瞒住了两卷都不再问；没有东邻那一户（宫里长大的）巷口那一卷不开。
 */
import './lib/seeded'

import { CULTIVATORS, THE_ONE_WHO_COMES_DOWN } from '../src/content/cultivators'
import { lifeEvents } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import type { Attributes, OriginId } from '../src/types/game'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import type { MountainLife, MountainPayload, Policy } from './tasks/mountain-lives'

const LIVES = 300
const SHED = 'herbalist-at-the-shed'
const VISITOR = THE_ONE_WHO_COMES_DOWN.id
const FOOTING = `footing:${SHED}`
const OPENED = `opened:${VISITOR}`

let bad = 0

/**
 * 农家的孩子二十岁，药庐那位入了册（见过他），处到某一格。
 *
 * 农家要爹娘都在：寺里收留、路上长大的境况没有宅，也就没有东邻那一户——第五条摆局
 * 要问巷口那一卷开不开，局得先有东邻。宫里长大的（`court`）反过来，要的正是没有东邻。
 */
function atShed(footing: string | null, origin: OriginId = 'farm'): Staged | null {
  const s = born(origin, 20, origin === 'farm' ? ['father', 'mother'] : [])
  if (!s) return null
  applyEffects([{ type: 'meeting', who: SHED }])
  if (footing !== null) s.world.setFlag(FOOTING, footing)
  return s
}

/** 悟性、神魂钉到天上或地下——下山的人肯不肯多说两句由这两样定（`adept` 那把尺子） */
function withMind(level: 'high' | 'low'): void {
  const character = useCharacterStore()
  const value = level === 'high' ? 95 : 5
  const attributes: Attributes = { ...character.attributes, insight: value, spirit: value }
  character.attributes = attributes
}

// ============================================================
// 一、摆好的局：问不问、答不答、落什么
// ============================================================
{
  const wrong: string[] = []
  // 使唤那一格问：不答
  {
    const s = atShed('使唤')
    if (!s) wrong.push('掷不出局')
    else {
      const tao = s.people.personOf(SHED)
      const page = tao?.history.find((one) => one.id === 'keeps-the-shed')
      if (!page) wrong.push('药庐那位入册时身上没有「替山上看着药庐」那一页')
      else if (page.known) wrong.push('那一页入册就是 known——玩家还没问就知道了')
      const texts = play('mountain:down', 'ask-who')
      if (!texts.some((line) => line.includes('翻你的药')))
        wrong.push(`处到使唤问他，他该不答：${texts.slice(-3).join(' / ')}`)
      if (texts.some((line) => line.includes('山上的'))) wrong.push('处到使唤，他却说了「山上的」')
      const entry = useCharacterStore().knowledge.find((one) => one.id === 'the-mountain-above')
      if (!entry) wrong.push('问了没答，认知层该有「有人从山上下来取药」那一条')
      else if (entry.contact !== '见过' || entry.interpretation !== '猜想')
        wrong.push(`没答的那一条该是「见过·猜想」，是「${entry.contact}·${entry.interpretation}」`)
      if (s.people.personOf(SHED)?.history.find((one) => one.id === 'keeps-the-shed')?.known)
        wrong.push('没答，那一页却翻开了')
      const visitor = s.people.personOf(VISITOR)
      if (!visitor) wrong.push('下山的人没入册')
      else {
        if (visitor.realm !== '炼气') wrong.push(`下山的人该是炼气，记的是「${visitor.realm ?? '（无）'}」`)
        if (visitor.place !== '云台') wrong.push(`下山的人该在云台，记的是「${visitor.place}」`)
        if (s.people.callOf(VISITOR) !== THE_ONE_WHO_COMES_DOWN.calls)
          wrong.push(`叫他「${s.people.callOf(VISITOR)}」`)
      }
    }
  }
  // 带一段往后问：答「山上的」
  {
    const s = atShed('带一段')
    if (!s) wrong.push('掷不出第二局')
    else {
      const texts = play('mountain:down', 'ask-who')
      if (!texts.some((line) => line.includes('我替他们看着这儿')))
        wrong.push(`处到带一段问他，他该答「山上的」：${texts.slice(-4).join(' / ')}`)
      if (!texts.some((line) => line.includes('别出去乱说'))) wrong.push('答了却没嘱咐「别出去乱说」——公开度那一条')
      const page = s.people.personOf(SHED)?.history.find((one) => one.id === 'keeps-the-shed')
      if (!page?.known) wrong.push('他答了，身上那一页却没翻开（recall）')
      const entry = useCharacterStore().knowledge.find((one) => one.id === 'the-mountain-above')
      if (!entry) wrong.push('答了，认知层没有「山上」那一条')
      else if (entry.contact !== '亲历' || entry.interpretation !== '确信')
        wrong.push(`答了的那一条该是「亲历·确信」，是「${entry.contact}·${entry.interpretation}」`)
      if (!s.world.chronicle.some((one) => one.text.includes('替山上看着这间药庐')))
        wrong.push('答了，编年里没记那一笔')
    }
  }
  // 不问：只知道有人来取药
  {
    const s = atShed('教一点')
    if (!s) wrong.push('掷不出第三局')
    else {
      const texts = play('mountain:down', 'say-nothing')
      if (!texts.some((line) => line.includes('那两筐是空的了')))
        wrong.push(`没问的该读到那两筐空了：${texts.slice(-3).join(' / ')}`)
      const entry = useCharacterStore().knowledge.find((one) => one.id === 'the-mountain-above')
      if (!entry || entry.contact !== '见过')
        wrong.push(`没问的只知道有人来取药（见过），是「${entry?.contact ?? '（无）'}」`)
      if (s.people.personOf(SHED)?.history.find((one) => one.id === 'keeps-the-shed')?.known)
        wrong.push('没问，那一页却翻开了')
    }
  }
  // 下山的人：顶在搭话、不教、四人里会教的仍只有一个
  {
    if (THE_ONE_WHO_COMES_DOWN.stance.ceiling !== '搭话') wrong.push('下山的人的顶该在「搭话」——他没有资格收人')
    if (THE_ONE_WHO_COMES_DOWN.teaches !== undefined) wrong.push('下山的人不该教任何人')
    const teachers = CULTIVATORS.filter((one) => one.teaches !== undefined)
    if (teachers.length !== 1) wrong.push(`会教人的该只有药庐那位，现在 ${teachers.length} 个`)
    if (!THE_ONE_WHO_COMES_DOWN.steps['搭话']?.length) wrong.push('顶以下那一格没有台词——哑巴台阶')
  }
  // `flag.in`：值在里头、不在里头、没设过
  {
    const s = atShed(null)
    if (!s) wrong.push('掷不出第四局')
    else {
      const ask = () => meetsAll([{ flag: { key: FOOTING, in: ['使唤', '带一段', '教一点'] } }])
      if (ask()) wrong.push('旗没设过，`in` 却成立')
      s.world.setFlag(FOOTING, '搭话')
      if (ask()) wrong.push('旗是「搭话」，不在那三格里，`in` 却成立')
      s.world.setFlag(FOOTING, '带一段')
      if (!ask()) wrong.push('旗是「带一段」，在那三格里，`in` 却不成立')
      const event = lifeEvents.find((one) => one.id === 'mountain-down')
      if (!event) wrong.push('年表上没有「山上下来的人」那件事')
      else if (!meetsAll(event.requires)) wrong.push('处到带一段，下山那件事的条件却不成立')
      s.world.setFlag(FOOTING, '不理会')
      if (event && meetsAll(event.requires)) wrong.push('不去了（不理会），下山那件事的条件还成立')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、摆好的局：${wrong[0]}（共 ${wrong.length} 处）`)
    for (const one of wrong.slice(1)) console.log(`      ${one}`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、使唤那一格问他不答（见过·猜想）；带一段往后问他答「山上的」（那一页翻开、亲历·确信、编年一笔）；不问只知道有人取药；下山的人入册带 realm、顶在搭话、不教；`flag.in` 三种情形都对。',
    )
}

// ============================================================
// 二、再下来：上头问起你了；他上回理过你，这回认出你
// ============================================================
{
  const wrong: string[] = []
  {
    const s = atShed('教一点')
    if (!s) wrong.push('掷不出局')
    else {
      play('mountain:down', 'say-nothing')
      const texts = play('mountain:again')
      if (!texts.some((line) => line.includes('上头问起你了')))
        wrong.push(`处到教一点，他再下来该带出「上头问起你了」：${texts.slice(-3).join(' / ')}`)
      if (!s.world.hasFlag('known-on-the-mountain')) wrong.push('上头问起了，旗却没落')
      const entry = useCharacterStore().knowledge.find((one) => one.id === 'the-mountain-above')
      if (!entry || entry.contact !== '亲历' || !entry.summary?.includes('知道有你这么个人'))
        wrong.push(`问起之后认知层该说「他们知道有你这么个人了」：${entry?.summary ?? '（无）'}`)
      if (!s.world.chronicle.some((one) => one.text.includes('山上的人问起了你'))) wrong.push('问起了，编年没记')
    }
  }
  {
    const s = atShed('使唤')
    if (!s) wrong.push('掷不出第二局')
    else {
      play('mountain:down', 'say-nothing')
      const texts = play('mountain:again')
      if (texts.some((line) => line.includes('上头问起你了'))) wrong.push('只处到使唤，上头却问起了')
      if (!texts.some((line) => line.includes('跟上回一样'))) wrong.push(`没处到教一点，该跟上回一样：${texts.slice(-2).join(' / ')}`)
      if (s.world.hasFlag('known-on-the-mountain')) wrong.push('没处到教一点，旗却落了')
    }
  }
  // 他肯不肯多说两句由他量到的数定；肯了，世界记一面旗；再来那一趟凭这面旗认出你
  {
    const s = atShed('使唤')
    if (!s) wrong.push('掷不出第三局')
    else {
      withMind('high')
      // 照面的正文是 `meeting` 那一格结算时返回的块，`play()` 不收效果返回的话——直接结算那一格看
      const said = applyEffects([{ type: 'meeting', who: VISITOR }])
        .map((block) => ('text' in block ? block.text : ''))
      if (!s.world.hasFlag(OPENED)) wrong.push('悟性神魂钉到 95，他却没肯多说两句（opened 旗没落）')
      if (!said.some((line) => line.includes('新来的？'))) wrong.push(`肯多说的该问「新来的？」：${said.slice(0, 6).join(' / ')}`)
      const again = play('mountain:again')
      if (!again.some((line) => line.includes('像是认出来了'))) wrong.push('上回他理过你，这回却没认出你')
    }
    const t = atShed('使唤')
    if (!t) wrong.push('掷不出第四局')
    else {
      withMind('low')
      const said = applyEffects([{ type: 'meeting', who: VISITOR }])
        .map((block) => ('text' in block ? block.text : ''))
      if (t.world.hasFlag(OPENED)) wrong.push('悟性神魂钉到 5，他却肯多说两句了')
      if (!said.some((line) => line.includes('像一根柱子'))) wrong.push(`不理你的该读到「像一根柱子」：${said.slice(0, 6).join(' / ')}`)
      const again = play('mountain:again')
      if (again.some((line) => line.includes('像是认出来了'))) wrong.push('上回他没看你，这回却认出你了')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、再下来：${wrong[0]}（共 ${wrong.length} 处）`)
    for (const one of wrong.slice(1)) console.log(`      ${one}`)
    bad += 1
  } else
    console.log(
      '  ✓ 二、处到教一点他再下来，「上头问起你了」（旗、认知、编年）；只处到使唤跟上回一样；他肯不肯多说由量到的数定，肯了这回认出你，没肯就没有。',
    )
}

// ============================================================
// 三、壮年那一卷读得到
// ============================================================
{
  const wrong: string[] = []
  {
    const s = atShed('带一段')
    if (!s) wrong.push('掷不出局')
    else {
      play('mountain:down', 'ask-who')
      applyEffects([{ type: 'time', years: 12 }])
      const texts = play('routine:prime')
      if (!texts.some((line) => line.includes('你知道山上有人')))
        wrong.push(`知道山上有人的壮年该读到那一句：${texts.slice(0, 6).join(' / ')}`)
      if (texts.some((line) => line.includes('山上的人问起过你'))) wrong.push('没被问起过，却读到「山上的人问起过你」')
    }
  }
  {
    const s = atShed('教一点')
    if (!s) wrong.push('掷不出第二局')
    else {
      play('mountain:down', 'ask-who')
      play('mountain:again')
      applyEffects([{ type: 'time', years: 12 }])
      const texts = play('routine:prime')
      if (!texts.some((line) => line.includes('山上的人问起过你')))
        wrong.push(`被问起过的壮年该读到那一句：${texts.slice(0, 6).join(' / ')}`)
      if (texts.some((line) => line.includes('你知道山上有人。这些年'))) wrong.push('被问起过了，却还读到「没跟谁说过」那一句——两句该互斥')
    }
  }
  {
    const s = atShed(null)
    if (!s) wrong.push('掷不出第三局')
    else {
      applyEffects([{ type: 'time', years: 12 }])
      const texts = play('routine:prime')
      if (texts.some((line) => line.includes('山上'))) wrong.push('不知道山上有人的，壮年那一卷却提了山上')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、壮年那一卷：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log('  ✓ 三、壮年那一卷：知道山上有人的读一句，山上问起过的读另一句，两句不同时出；不知道的一个字不提。')
}

// ============================================================
// 四、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  const CAP = LIVES * 10
  const batch = (policy: Policy, runs: number) =>
    mapShards<MountainLife[], MountainPayload>({
      task: 'scripts/tasks/mountain-lives.ts',
      runs,
      payload: { policy },
    }).then((all) => all.flat())
  const random = await batch('random', LIVES)
  let keen = await batch('keen', LIVES)
  const firstKeen = keen
  const enough = (all: MountainLife[]) =>
    all.some((one) => one.down) && all.some((one) => one.told) && all.some((one) => one.known)
  while (!enough(keen) && keen.length < CAP) keen = [...keen, ...(await batch('keen', LIVES))]

  const count = (all: MountainLife[], pick: (one: MountainLife) => boolean) => all.filter(pick).length
  const row = (label: string, all: MountainLife[]) =>
    console.log(
      `  · ${label} ${all.length} 世：在药庐（使唤往后）${count(all, (o) => o.atShed)}，山上下来过 ${count(all, (o) => o.down)}，` +
        `问了 ${count(all, (o) => o.asked)}，答了「山上的」${count(all, (o) => o.told)}，他肯多说 ${count(all, (o) => o.opened)}，` +
        `又下来 ${count(all, (o) => o.again)}（认出你 ${count(all, (o) => o.recognised)}），上头问起 ${count(all, (o) => o.known)}（进门时你正坐着 ${count(all, (o) => o.sitting)}）；` +
        `壮年读到「知道山上有人」${count(all, (o) => o.readKnows)}、「问起过你」${count(all, (o) => o.readAsked)}`,
    )
  // 第二片：多嘴的人。掷到「跟配偶说了」「他不再让你去了」各至少一世为止
  let talkers = await batch('talker', LIVES)
  const firstTalkers = talkers
  const loose = (all: MountainLife[]) => all.some((one) => one.toldSpouse) && all.some((one) => one.shutOut)
  while (!loose(talkers) && talkers.length < CAP) talkers = [...talkers, ...(await batch('talker', LIVES))]
  row('随机', random)
  row('有心人', firstKeen)
  if (keen.length > firstKeen.length) console.log(`  · 有心人补掷到 ${keen.length} 世`)
  const secrecy = (label: string, all: MountainLife[]) =>
    console.log(
      `  · ${label} ${all.length} 世：被嘱咐过 ${count(all, (o) => o.toldByShed)}，夜里被问 ${count(all, (o) => o.askedHome)}（说了 ${count(all, (o) => o.toldSpouse)}），` +
        `巷口被问 ${count(all, (o) => o.askedLane)}（说了 ${count(all, (o) => o.talked)}），瞒住了 ${count(all, (o) => o.kept)}，他不再让你去了 ${count(all, (o) => o.shutOut)}`,
    )
  secrecy('有心人', firstKeen)
  secrecy('多嘴的人', firstTalkers)
  if (talkers.length > firstTalkers.length) console.log(`  · 多嘴的人补掷到 ${talkers.length} 世`)

  // 掷到出现为止
  if (!keen.some((one) => one.down)) wrong.push(`${keen.length} 世有心人里没有一世山上下来过——这一卷在真世里走不到`)
  if (!keen.some((one) => one.told)) wrong.push(`${keen.length} 世有心人里没有一世听他说「山上的」`)
  if (!keen.some((one) => one.known)) wrong.push(`${keen.length} 世有心人里没有一世「上头问起你了」`)
  // 链单调（量的是尺子，不是内容）
  for (const one of [...random, ...keen]) {
    if (one.down && !one.atShed) wrong.push('山上下来过，可这一世从没在药庐里')
    if (one.told && !one.asked) wrong.push('他答了「山上的」，可这一世没问过')
    if (one.told && !one.recalled) wrong.push('他答了，那一页却没翻开')
    if (one.recalled && !one.told) wrong.push('那一页翻开了，他却没答过')
    if (one.known && !one.again) wrong.push('上头问起了，可他没再下来过')
    if (one.known && !one.taught) wrong.push('上头问起了，可这一世没处到教一点')
    if (one.visitorEnrolled !== one.down) wrong.push('下山的人在册与否，跟他下来过与否对不上')
    if (one.recognised && !one.opened) wrong.push('再来时认出你，可上回他没肯多说')
    if (one.sitting && !(one.known && one.held)) wrong.push('他进门时你正坐着——可这一世没到教一点、或身上没摸着')
    if (one.readAsked && !one.known) wrong.push('壮年读到「问起过你」，可上头没问起过')
    if (one.readKnows && one.knowledge === null) wrong.push('壮年读到「知道山上有人」，认知层却没有那一条')
    if (one.knowledge?.contact === '亲历' && !one.told && !one.known) wrong.push('认知层「亲历」，可既没答过也没问起过')
  }
  // 第二片：规矩要咬得到人；有心人守口
  if (!talkers.some((one) => one.toldSpouse)) wrong.push(`${talkers.length} 世多嘴的人里没有一世跟配偶说过——夜里那一卷在真世里走不到`)
  if (!talkers.some((one) => one.shutOut)) wrong.push(`${talkers.length} 世多嘴的人里没有一世被赶出来——规矩在真世里咬不到人`)
  if (keen.some((one) => one.toldSpouse || one.talked)) wrong.push('有心人守口，却有一世说出去了——走法或选项 id 错了')
  for (const one of [...random, ...keen, ...talkers]) {
    if ((one.toldSpouse || one.talked || one.kept) && !one.toldByShed) wrong.push('有人问起药庐那边，可他没被嘱咐过——那两卷不该开')
    if (one.shutOut && !one.talked) wrong.push('他不再让你去了，可这一世没跟邻家说过')
    if (one.shutOut && one.footingAtEnd !== '不理会') wrong.push(`被赶出来了，咽气那年却还处在「${one.footingAtEnd}」`)
    if (one.toldSpouse && one.shutOut && !one.talked) wrong.push('只跟配偶说了，他却知道了——那件事该留在家里')
  }
  // 不许太好走：山上几年才下来一趟人
  const keenDown = count(firstKeen, (o) => o.down) / firstKeen.length
  const randomDown = count(random, (o) => o.down) / random.length
  if (keenDown > 0.4) wrong.push(`有心人四成以上撞见了下山的人（${Math.round(keenDown * 100)}%）——太好走了`)
  if (randomDown > 0.05) wrong.push(`随便走的人二十个里一个撞见了下山的人（${Math.round(randomDown * 100)}%）——太好走了`)

  if (wrong.length > 0) {
    console.log(`\n  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    for (const one of [...new Set(wrong)].slice(1, 6)) console.log(`      ${one}`)
    bad += 1
  } else
    console.log(
      `  ✓ 四、有心人 ${keen.length} 世里，山上下来过、答了「山上的」、上头问起了各至少一世；链单调；有心人 ${Math.round(keenDown * 100)}%、随机 ${Math.round(randomDown * 100)}% 撞见下山的人——走得到，不算好走；多嘴的人 ${talkers.length} 世里跟配偶说了、被赶出来各至少一世，有心人一世也没说出去。`,
    )
}

// ============================================================
// 五、摆好的局（第二片）：「别出去乱说」是一条规矩
// ============================================================
{
  const wrong: string[] = []
  const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)
  const opens = (id: string): boolean => {
    const event = eventOf(id)
    if (!event) throw new Error(`年表上没有 ${id}`)
    return meetsAll(event.requires)
  }
  /** 处到某一格、问过那是谁、有配偶在。返回摆好的局 */
  const withSpouse = (footing: string, origin: OriginId = 'farm'): Staged | null => {
    const s = atShed(footing, origin)
    if (!s) return null
    play('mountain:down', 'ask-who')
    applyEffects([
      {
        type: 'meet',
        id: 'spouse',
        calls: '妻子',
        name: true,
        who: { surname: '秦', given: '娘', gender: '女', age: 19, doing: '操持家务' },
        bond: '配偶',
      },
    ])
    return s
  }
  // 没被嘱咐过（处到使唤，他不答）：夜里、巷口两卷都不开
  {
    const s = withSpouse('使唤')
    if (!s) wrong.push('掷不出局')
    else {
      if (s.world.hasFlag('told-by-the-shed')) wrong.push('处到使唤他不答，却记成嘱咐过')
      if (opens('mountain-asked-home')) wrong.push('没被嘱咐过，夜里那一卷却开着')
      if (opens('mountain-asked-lane')) wrong.push('没被嘱咐过，巷口那一卷却开着')
    }
  }
  // 嘱咐过了：跟配偶说了留在家里
  {
    const s = withSpouse('带一段')
    if (!s) wrong.push('掷不出第二局')
    else {
      if (!s.world.hasFlag('told-by-the-shed')) wrong.push('他答了「别出去乱说」，却没记成嘱咐过')
      if (!opens('mountain-asked-home')) wrong.push('嘱咐过、配偶在，夜里那一卷却不开')
      const texts = play('mountain:asked-home', 'tell-mountain')
      if (!texts.some((line) => line.includes('别跟旁人说'))) wrong.push(`跟配偶说了，她该说「别跟旁人说」：${texts.join(' / ')}`)
      if (!s.world.hasFlag('told-spouse-about-the-mountain')) wrong.push('跟配偶说了，旗没落')
      if (opens('mountain-asked-home')) wrong.push('问过一回了，夜里那一卷还开着')
      if (opens('mountain-shut')) wrong.push('只跟配偶说了，他知道那一卷却开了——那件事该留在家里')
      if (!opens('mountain-asked-lane')) wrong.push('跟配偶说了，巷口那一卷该照旧能问')
    }
  }
  // 嘱咐过了：跟邻家说了，他知道了——footing 回不理会，链上的事全落空
  {
    const s = withSpouse('带一段')
    if (!s) wrong.push('掷不出第三局')
    else {
      if (!s.people.houses['east']) wrong.push('摆局：农家该有东邻那一户')
      if (!opens('mountain-asked-lane')) wrong.push('嘱咐过、有东邻那一户，巷口那一卷却不开')
      const lane = play('mountain:asked-lane', 'tell-mountain')
      if (!lane.some((line) => line.includes('他倒想去看看'))) wrong.push(`跟邻家说了该读到他那一笑：${lane.join(' / ')}`)
      if (!s.world.hasFlag('talked-about-the-mountain')) wrong.push('跟邻家说了，旗没落')
      if (!opens('mountain-shut')) wrong.push('说出去了、还在药庐里，他知道那一卷却不开')
      const shut = play('mountain:shut')
      if (!shut.some((line) => line.includes('往后不用来了'))) wrong.push(`他该说「往后不用来了」：${shut.join(' / ')}`)
      if (s.world.getFlag(FOOTING) !== '不理会') wrong.push(`赶出来了，footing 该回「不理会」，是「${String(s.world.getFlag(FOOTING))}」`)
      if (!s.world.hasFlag('shut-out-by-the-shed')) wrong.push('赶出来了，旗没落')
      for (const id of ['tutor-errand', 'tutor-walk', 'tutor-words', 'mountain-down', 'mountain-again', 'mountain-shut'])
        if (opens(id)) wrong.push(`赶出来了，${id} 却还开着——规矩没咬到师承那条链`)
      if (!s.world.chronicle.some((one) => one.text.includes('不再让你去了'))) wrong.push('赶出来了，编年没记')
    }
  }
  // 瞒住了：两卷都不再问
  {
    const s = withSpouse('带一段')
    if (!s) wrong.push('掷不出第四局')
    else {
      const texts = play('mountain:asked-lane', 'keep-mountain')
      if (!texts.some((line) => line.includes('手心有汗'))) wrong.push(`瞒住了该读到手心有汗：${texts.join(' / ')}`)
      if (!s.world.hasFlag('kept-the-mountain')) wrong.push('瞒住了，旗没落')
      if (opens('mountain-asked-lane') || opens('mountain-asked-home')) wrong.push('瞒住了，两卷却还会再问')
      if (opens('mountain-shut')) wrong.push('瞒住了，他知道那一卷却开了')
    }
  }
  // 没有东邻那一户（宫里长大的）：巷口那一卷不开，夜里那一卷照旧
  {
    const s = withSpouse('带一段', 'court')
    if (!s) wrong.push('掷不出第五局')
    else {
      if (s.people.houses['east']) wrong.push('摆局：宫里长大的不该有东邻')
      if (opens('mountain-asked-lane')) wrong.push('没有东邻那一户，巷口那一卷还开着')
      if (!opens('mountain-asked-home')) wrong.push('没有东邻，夜里那一卷该照旧')
    }
  }
  if (wrong.length > 0) {
    console.log(`
  ✗ 五、规矩：${wrong[0]}（共 ${wrong.length} 处）`)
    for (const one of wrong.slice(1)) console.log(`      ${one}`)
    bad += 1
  } else
    console.log(
      '  ✓ 五、「别出去乱说」是一条规矩：没被嘱咐过两卷不开；跟配偶说了留在家里；跟邻家说了他知道——footing 回不理会、师承那条链全落空、编年一笔；瞒住了不再问；没有东邻那一户巷口不开。',
    )
}

if (bad > 0) {
  console.log(`\n${bad} 条红。`)
  process.exitCode = 1
} else console.log('\n山上下来的人：四条全绿。')
