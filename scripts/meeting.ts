/* eslint-disable no-console -- 这是一支命令行门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 第一次真正接触修士。
 *
 * ## 这一支要证的那句话
 *
 *     玩家终于找到了人，但玩家仍然不知道自己找到的是什么。
 *
 * 「找到人」是上一支（`scripts/seeking.ts`）的事。这一支验的是**照上面之后**：
 * 两个人互相打量了一回，两边都会看错，而两边都不知道自己看错了。
 *
 * ## 七道判据
 *
 *     一　双向　　　　一次会面，他往你身上落东西，你也往他身上落东西
 *     二　一对一错　　同一次会面里既有说对的也有说岔的，玩家分不出哪句是哪句
 *     三　能力边界　　炼气那个看不见资质，所以他一辈子不会提这两个字
 *     四　按看到的　　他怎么待你按他量到的数，不按真值。**这一道最容易写成空判据**
 *     五　你也读错　　玩家从衣裳年纪手上有没有茧读出来的意思，多半是错的
 *     六　什么也没给　走到这一步不发功法不给境界不动一格属性
 *     七　两把尺子　　同一个人被两个修士各看一次，说的不是同一回事
 *
 * ## 判据本身也会说谎，所以每一道都带自检
 *
 * 尤其第四道。「炼气修士的态度跟 root 无关」这句话，在一个
 * `regard` 恒等于常数的错误实现下同样成立——**判据会绿，而机制是死的**。
 * 所以那一道拿同一把尺子去量筑基修士：他看得见 root，
 * **他那一组必须显著有别**。两边一起看，尺子才有话语权。
 *
 * 跑法：bun scripts/meeting.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { CULTIVATORS, THE_ONE_AT_THE_TEMPLE, THE_ONE_ON_THE_PATH } from '../src/content/cultivators'
import { observerById } from '../src/content/observers'
import { encounterCultivator } from '../src/engine/meeting'
import { observe } from '../src/engine/observe'
import { useCharacterStore } from '../src/stores/character'
import { usePeopleStore } from '../src/stores/people'
import type { Attributes, Observer } from '../src/types/game'

/** 每一节各跑多少世。四百是让第四道那个均值差站得住的最小体面数目 */
const RUNS = 400

/**
 * 一个资质极好、悟性平平的孩子。
 *
 * **这份数据是这一整支的要害。** root 83 而 insight 48：
 * 一个看不见 root 的炼气修士量到的是「悟性寻常」，
 * 而他站在那儿的是万里挑一的胚子。
 *
 * 换成一份处处平庸的数据，底下七道判据里有四道会失去区分力——
 * 输入不构成挑战，判据就永远绿，而且看着像在工作。
 */
const GIFTED: Attributes = {
  memory: 95,
  insight: 48,
  body: 61,
  will: 55,
  fortune: 50,
  root: 83,
  spirit: 58,
}

/**
 * 开一世。
 *
 * **先 `useCharacterStore()` 再动别的**：创建那一刻等于出生，
 * 它把 `bornYear` 钉在当时的 `time.year` 上。顺序反了，人就凭空老了几岁。
 */
function fresh(attributes: Attributes = GIFTED): void {
  setActivePinia(createPinia())
  const character = useCharacterStore()
  character.attributes = { ...attributes }
}

/** 跑一次会面，把这一世的角色仓一并交出来 */
function meetOnce(cultivatorId: string, attributes: Attributes = GIFTED) {
  fresh(attributes)
  const meeting = encounterCultivator(cultivatorId)
  return { meeting, character: useCharacterStore(), people: usePeopleStore() }
}

let failed = 0
const judge = (ok: boolean, line: string): void => {
  console.log(`  ${ok ? '√' : '✗'}　${line}`)
  if (!ok) failed += 1
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 尺子自检（存心写错的必须红）===\n')

/**
 * `astray` 这把尺子准不准。
 *
 * 它说的是「说出口的那句，跟真值本该得到的那句，是不是同一句」。
 * 验法是造两个极端的观察者：
 *
 *     判断力满格　　量到的就是真值，**永远不可能说岔**
 *     判断力为零　　往中间拉 60% 再抖 ±34，**必然经常说岔**
 *
 * 只验一头是不够的：一个恒返回 `false` 的错误实现能通过上半场，
 * 恒返回 `true` 的能通过下半场。**两头都验，尺子才立得住。**
 */
function forgeObserver(acuity: number): Observer {
  const real = observerById('adept')
  if (!real) throw new Error('炼气修士那把尺子不见了')
  return {
    ...real,
    id: 'forged',
    readings: real.readings.map((reading) => ({ ...reading, acuity })),
  }
}

{
  let sharpAstray = 0
  let blindAstray = 0
  let total = 0
  const sharp = forgeObserver(100)
  const blind = forgeObserver(0)
  for (let i = 0; i < RUNS; i += 1) {
    fresh()
    for (const remark of observe(sharp)) {
      if (remark.astray) sharpAstray += 1
    }
    fresh()
    for (const remark of observe(blind)) {
      if (remark.astray) blindAstray += 1
      total += 1
    }
  }
  judge(sharpAstray === 0, `判断力满格的人 ${total} 句里说岔 ${sharpAstray} 句（必须是 0）`)
  judge(
    blindAstray > total * 0.15,
    `判断力为零的人 ${total} 句里说岔 ${blindAstray} 句（必须显著多于 0）`,
  )
}

/**
 * 第三道那把尺子：光看 ADEPT 没有 root 是不够的。
 *
 * 一份把 `readings` 读成空数组的坏实现，也会得出「他不提资质」。
 * **所以必须同时验筑基那位真的提**——一把两头都指向同一个方向的尺子
 * 量不出任何东西。
 */
{
  const adept = observerById('adept')
  const master = observerById('master')
  const aspectsOf = (o: Observer | undefined): string[] =>
    (o?.readings ?? []).map((r) => r.lens.aspect)
  judge(aspectsOf(adept).length > 0, `炼气那把尺子上有 ${aspectsOf(adept).length} 格（不能是空的）`)
  judge(aspectsOf(master).includes('root'), '筑基那把尺子上有「资质」这一格（对照组必须成立）')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 一　双向：一次会面，两头都落了东西 ===\n')

{
  const { meeting, character, people } = meetOnce(THE_ONE_ON_THE_PATH.id)
  const claims = Object.values(character.aspects).reduce((n, a) => n + a.claims.length, 0)
  const met = character.knowledge.find((k) => k.id === `met:${THE_ONE_ON_THE_PATH.id}`)
  const person = people.personOf(THE_ONE_ON_THE_PATH.id)

  judge(meeting !== null, '会面成立')
  judge(claims > 0, `他说的话落进了「别人怎么看你」：${claims} 条`)
  judge(met !== undefined, '你读出来的意思落进了「你知道的事」')
  judge(met?.contact === '见过', `这一条的接触档是「${met?.contact}」（必须是「见过」）`)
  judge(person !== undefined, '他进了人口册，是一个有姓有名有年纪的人')
  /**
   * 见过他，可不知道他叫什么。
   *
   * 「认识一个人」和「知道他叫什么」在这套模型里是两件事，
   * 而这一处正是那句「玩家仍然不知道自己找到的是什么」最扎实的一条证据：
   * **他姓姜，名不换，六十三岁——这三样玩家一样也不知道。**
   */
  judge(
    people.callOf(THE_ONE_ON_THE_PATH.id) === THE_ONE_ON_THE_PATH.calls,
    `他在玩家心里叫「${people.callOf(THE_ONE_ON_THE_PATH.id)}」，不叫${person?.surname}${person?.given}`,
  )
  console.log(
    `    （他其实姓${person?.surname}，名${person?.given}，今年 ${people.ageOf(THE_ONE_ON_THE_PATH.id)} 岁）`,
  )

  console.log('\n  这一次他说的：')
  for (const said of meeting?.says ?? []) console.log(`    「${said.text}」`)
  console.log('\n  这一次你读出来的：')
  console.log(`    ${met?.summary ?? '(没有)'}`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 二　一句对一句错 ===\n')
console.log('  用户点名的那件事：「你记性不错」说对了，「修行资质寻常」说错了，')
console.log('  而玩家不会知道哪句错。\n')

{
  let allRight = 0
  let mixed = 0
  let allWrong = 0
  for (let i = 0; i < RUNS; i += 1) {
    const { meeting } = meetOnce(THE_ONE_ON_THE_PATH.id)
    const says = meeting?.says ?? []
    const wrong = says.filter((s) => s.astray).length
    if (wrong === 0) allRight += 1
    else if (wrong === says.length) allWrong += 1
    else mixed += 1
  }
  const pct = (n: number): string => `${((n / RUNS) * 100).toFixed(1)}%`
  console.log(`  ${RUNS} 次会面（炼气修士每次说两句）：`)
  console.log(`    两句都说对　　${String(allRight).padStart(4)}　${pct(allRight)}`)
  console.log(`    一对一错　　　${String(mixed).padStart(4)}　${pct(mixed)}`)
  console.log(`    两句都说岔　　${String(allWrong).padStart(4)}　${pct(allWrong)}\n`)

  judge(mixed > RUNS * 0.1, '「一对一错」真的会发生，不是理论可能')
  judge(allRight > RUNS * 0.05, '他也有全说对的时候——不是每次都在瞎说')
  judge(allWrong > RUNS * 0.02, '他也有全说岔的时候——不是每次都对一半')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 三　看不见的东西，他不会说 ===\n')
console.log('  一个炼气修士的观察能力有边界。这一条静态就判得出来，')
console.log('  不必拿一万次模拟去猜——**能静态判的别拿模拟去判**。\n')

{
  for (const cultivator of CULTIVATORS) {
    const observer = observerById(cultivator.observer)
    const aspects = (observer?.readings ?? []).map((r) => r.lens.aspect)
    const calls = (observer?.readings ?? []).map((r) => r.calls || '(不带称呼)')
    console.log(`  ${cultivator.calls}（${cultivator.realm}）看得见：${calls.join('、')}`)
    console.log(`    落在哪几面：${[...new Set(aspects)].join('、')}`)
  }
  console.log()

  const adeptAspects = (observerById('adept')?.readings ?? []).map((r) => r.lens.aspect)
  const masterAspects = (observerById('master')?.readings ?? []).map((r) => r.lens.aspect)
  judge(!adeptAspects.includes('root'), '炼气修士这辈子看不见资质')
  judge(masterAspects.includes('root'), '筑基修士看得见')

  // 静态说的话，实跑得对得上——只信静态就成了在验数据，不是在验行为
  const { character } = meetOnce(THE_ONE_ON_THE_PATH.id)
  judge(character.aspects.root.claims.length === 0, '实跑一次：炼气修士一句资质的话也没有落下')
  const { character: after } = meetOnce(THE_ONE_AT_THE_TEMPLE.id)
  judge(after.aspects.root.claims.length > 0, '实跑一次：筑基修士落下了资质那一句')
  console.log(`    他说的是：「${after.aspects.root.claims[0]?.text}」`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 四　他怎么待你，按他量到的，不按真值 ===\n')
console.log('  两组人，root 一组钉 5 一组钉 95，其余七项完全相同。')
console.log('  炼气修士的态度必须**无差**——他压根没量那一样东西。\n')

{
  const withRoot = (root: number): Attributes => ({ ...GIFTED, root })
  const regardOf = (cultivatorId: string, root: number): number => {
    let sum = 0
    for (let i = 0; i < RUNS; i += 1) {
      const { meeting } = meetOnce(cultivatorId, withRoot(root))
      sum += meeting?.regard ?? 0
    }
    return sum / RUNS
  }

  const adeptLow = regardOf(THE_ONE_ON_THE_PATH.id, 5)
  const adeptHigh = regardOf(THE_ONE_ON_THE_PATH.id, 95)
  const masterLow = regardOf(THE_ONE_AT_THE_TEMPLE.id, 5)
  const masterHigh = regardOf(THE_ONE_AT_THE_TEMPLE.id, 95)

  const adeptGap = Math.abs(adeptHigh - adeptLow)
  const masterGap = Math.abs(masterHigh - masterLow)

  console.log(`  炼气修士　root=5 时 ${adeptLow.toFixed(1)}　root=95 时 ${adeptHigh.toFixed(1)}`)
  console.log(`            相差 ${adeptGap.toFixed(1)}`)
  console.log(`  筑基修士　root=5 时 ${masterLow.toFixed(1)}　root=95 时 ${masterHigh.toFixed(1)}`)
  console.log(`            相差 ${masterGap.toFixed(1)}\n`)

  judge(adeptGap < 4, '炼气修士的态度跟资质无关（相差在噪声里）')
  /**
   * 这一行才是上一行有没有意义的凭据。
   *
   * 一个 `regard` 恒等于常数的坏实现能让上一行绿——**这一行会当场红**。
   * 守「X 不影响结果」这类不变量，必须真的把 X 变一遍，
   * 而且要有一个「X 应该影响结果」的对照组在旁边站着。
   */
  judge(masterGap > 15, '筑基修士的态度跟资质大有关系（对照组：判据不是空的）')

  // 门槛读的是他量到的数，所以「看不见 root」直接决定了他肯不肯多说
  let openedLow = 0
  let openedHigh = 0
  for (let i = 0; i < RUNS; i += 1) {
    if (meetOnce(THE_ONE_AT_THE_TEMPLE.id, withRoot(5)).meeting?.opened) openedLow += 1
    if (meetOnce(THE_ONE_AT_THE_TEMPLE.id, withRoot(95)).meeting?.opened) openedHigh += 1
  }
  console.log(
    `  筑基修士肯多说两句：root=5 时 ${openedLow}/${RUNS}，root=95 时 ${openedHigh}/${RUNS}`,
  )
  judge(openedHigh > openedLow, '看错的后果是真的——他真的就那么待你了')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 五　你也会读错他 ===\n')

{
  const kinds = new Map<string, number>()
  const grades = new Map<string, number>()
  for (let i = 0; i < RUNS; i += 1) {
    const { character } = meetOnce(THE_ONE_ON_THE_PATH.id)
    const met = character.knowledge.find((k) => k.id === `met:${THE_ONE_ON_THE_PATH.id}`)
    const kind = met?.mistaken ?? '(没读错)'
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1)
    const grade = met?.interpretation ?? '(没有)'
    grades.set(grade, (grades.get(grade) ?? 0) + 1)
  }
  console.log(`  ${RUNS} 次会面，你对他的理解错在哪一层：`)
  for (const [kind, n] of [...kinds].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${kind.padEnd(8)}${String(n).padStart(4)}`)
  }
  console.log('\n  而你有多笃定：')
  for (const [grade, n] of [...grades].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${grade.padEnd(8)}${String(n).padStart(4)}`)
  }
  console.log()

  const wrong = RUNS - (kinds.get('(没读错)') ?? 0)
  judge(wrong > RUNS * 0.5, `你多半会读错他：${wrong}/${RUNS}`)
  judge((grades.get('确信') ?? 0) > 0, '错得整齐的时候你会「确信」')
  /**
   * 「猜想」那一档必须真的会出现。
   *
   * 头一版这里是恒绿的死枝：炼气那位四处形迹里三处是错的，
   * 一次留意三处，`wrong >= 2` 必然成立——`猜想` 那个分支
   * **一次也走不到，而它看起来跟活的一模一样**。
   * 补了两处「他恰好读对了」的形迹，这一档才有了呼吸。
   */
  judge((grades.get('猜想') ?? 0) > 0, '偶尔只错一处，那时你只是「猜想」（这一档不能是死枝）')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 六　走到这一步，什么也没拿到 ===\n')

{
  fresh()
  const character = useCharacterStore()
  const before = { ...character.attributes }
  const realmBefore = character.realm
  const identityBefore = character.identity
  const itemsBefore = character.inventory.length

  // 两个修士都见一遍，见完还各见一遍
  for (const cultivator of CULTIVATORS) encounterCultivator(cultivator.id)
  for (const cultivator of CULTIVATORS) encounterCultivator(cultivator.id)

  const attrSame = (Object.keys(before) as (keyof Attributes)[]).every(
    (key) => character.attributes[key] === before[key],
  )
  judge(attrSame, '四次会面之后，真实属性一格没动')
  judge(character.realm === realmBefore, `境界还是「${character.realm}」`)
  judge(character.identity === identityBefore, `身份还是「${character.identity}」`)
  judge(character.inventory.length === itemsBefore, '一件东西也没拿到')

  const claims = Object.values(character.aspects).reduce((n, a) => n + a.claims.length, 0)
  console.log(`\n  他拿到的只有话：${claims} 句评说，${character.knowledge.length} 条见闻。`)

  /**
   * 最不该拿到的那样东西：哪句是错的。
   *
   * `astray` 和 `held` 只在引擎里活着。**玩家若能知道哪句是错的，
   * 那就不叫错了**——这一层是整章的地基，而地基塌了不会有任何别的地方吭声：
   * 正文照样好看，claims 照样有，只是那句「玩家不知道哪句错」悄悄变成了假话。
   *
   * 所以不能只在注释里声明它没漏。扫一遍落进 store 的每一条。
   */
  const leaked = Object.values(character.aspects)
    .flatMap((aspect) => aspect.claims)
    .filter((claim) => 'astray' in claim || 'held' in claim)
  judge(leaked.length === 0, `${claims} 句评说里，没有一句带着「这句是错的」的标记`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 七　两个修士说的不一样 ===\n')
console.log('  同一把尺子（悟性），两个判断力不同的人。')
console.log('  这就是日后「多年以后你终于知道当年那句是错的」的锚点。\n')

{
  const saidBy = (cultivatorId: string): Map<string, number> => {
    const said = new Map<string, number>()
    for (let i = 0; i < RUNS; i += 1) {
      const { meeting } = meetOnce(cultivatorId)
      for (const one of meeting?.says ?? []) {
        if (!one.text.startsWith('悟性')) continue
        said.set(one.text, (said.get(one.text) ?? 0) + 1)
      }
    }
    return said
  }

  const byAdept = saidBy(THE_ONE_ON_THE_PATH.id)
  const byMaster = saidBy(THE_ONE_AT_THE_TEMPLE.id)
  const show = (label: string, said: Map<string, number>): void => {
    console.log(`  ${label}`)
    for (const [text, n] of [...said].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(4)} 次　「${text}」`)
    }
    console.log()
  }
  show('炼气修士（判断力 52）说悟性：', byAdept)
  show('筑基修士（判断力 71）说悟性：', byMaster)

  const commonest = (said: Map<string, number>): string =>
    [...said].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  judge(byAdept.size > 1, '炼气修士说的话不止一种——他自己也不稳')
  judge(byMaster.size > 1, '筑基修士说的话也不止一种')
  judge(
    byAdept.size > byMaster.size || commonest(byAdept) !== commonest(byMaster),
    '两人说的不是同一回事：要么口径不同，要么一个比另一个飘',
  )

  /**
   * 同一世里问两个人，两句话对不对得上。
   *
   * 上面三道比的是两份分布，这一道比的是**同一个孩子当着两个人的面站了一回**。
   * 分布不同不等于每一次都不同；而玩家碰上的从来是「这一次」。
   */
  let disagreed = 0
  let oneAstray = 0
  for (let i = 0; i < RUNS; i += 1) {
    fresh()
    const his = encounterCultivator(THE_ONE_ON_THE_PATH.id)?.says.find((s) =>
      s.text.startsWith('悟性'),
    )
    const hers = encounterCultivator(THE_ONE_AT_THE_TEMPLE.id)?.says.find((s) =>
      s.text.startsWith('悟性'),
    )
    if (!his || !hers) continue
    if (his.text !== hers.text) disagreed += 1
    // 两人对同一样东西说了不同的话，那至少有一个说岔了——而玩家两句都听着
    if (his.astray !== hers.astray) oneAstray += 1
  }
  console.log(`  同一世里先后问两个人，两句悟性对不上的：${disagreed}/${RUNS}`)
  console.log(`  其中恰好一个说岔、另一个说对的：${oneAstray}/${RUNS}\n`)
  judge(disagreed > RUNS * 0.4, '同一个孩子当面站着，两个人多半说的不是同一句')
  judge(oneAstray > RUNS * 0.1, '一句对一句错真的会同时摆在玩家面前')

  /**
   * 两句话并排落着——这一条不需要任何新机制。
   *
   * `claims` 只增不改，同一世里见两个人，两句就挨在一起了。
   * 「三十六岁你终于知道当年那句是错的」那一刻要的就是这两行。
   */
  fresh()
  const character = useCharacterStore()
  encounterCultivator(THE_ONE_ON_THE_PATH.id)
  encounterCultivator(THE_ONE_AT_THE_TEMPLE.id)
  const onCultivation = character.aspects.cultivation.claims
  console.log('  同一世里先后见了两个人，「修行」这一面下并排放着：')
  for (const claim of onCultivation) console.log(`    ${claim.source}：「${claim.text}」`)
  console.log()
  judge(onCultivation.length >= 3, '两个人的话都在，没有谁被谁盖掉')
  judge(
    new Set(onCultivation.map((c) => c.source)).size === 2,
    '两句出自两个不同的人——来源记着，不是一锅烩',
  )
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 这一支没有验到的 ===\n')
console.log('  · 「二十八岁另一位修士重新看你」——凡人这一册十六七岁就在渡口收尾，')
console.log('    那之后的人生还没写。两次会面现在压在十三到十六岁之间。')
console.log('    要紧的是隔着两把尺子，不是隔了几年；成年那段写出来把窗口往后拉即可。')
console.log('  · 「玩家分不出哪句错」这一半只验到结构：astray 确实没有落进 store（第六节）。')
console.log('    再往上一层——玩家读了正文之后心里怎么想——不是代码能回答的。')

console.log(
  failed === 0
    ? '\n七道都过了。他见着人了，而他仍旧不知道自己见着的是什么。\n'
    : `\n${failed} 道没过。\n`,
)
if (failed > 0) process.exitCode = 1
