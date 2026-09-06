/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 正文里不许无条件假定出身。
 *
 * 跑法：`bun scripts/upbringing.ts`
 *
 * ## 这一道是被一段穿帮逼出来的
 *
 * 一个生在宫里的孩子，读到的是这样一天：
 *
 *     父亲在檐下修一把锄头 / 你跟着下了地 / 割了半晌草 /
 *     手心磨出个泡 / 晚饭多盛半勺
 *
 * 这不是一句文案写错了。结构是对的、条件是对的、人物存在、关系正确、
 * 世界状态也正确——**十几道门禁一道都不会红**。可它是错的，
 * 而且错得比文案严重：数据层说这一世是皇室，内容层写的是农户。
 * 两层各说各的，世界事实自相矛盾。
 *
 * 病根不在那一行字上，在一个更早的假设里：**正文把「这家人靠地吃饭」
 * 当成了默认真相**——默认爹是农民，娘是农妇，家是小院，孩子下地干活。
 * 而这个游戏早就允许父母双亡、长姐拉扯、老乞丐捡去、寺里养大、
 * 衙门当差、王府、宫里。默认那个农户世界，是从头到尾没人质疑过的旧假设。
 *
 * ## 三道分工
 *
 * 1. **七种人家，同一天。** 种地/打猎/做买卖/当差/宫里/寺中孤儿/乞丐收养，
 *    各自把「帮家里干活」这一天连同它牵出来的心念一句一句读出来，
 *    检查有没有出现不属于这个家庭的生活事实。这一道必须全绿，没有豁免。
 * 2. **全库对账。** 扫遍所有正文，沿 requires 算出「谁读得到这一句」，
 *    跟生活事实词典对账。存量债务记在 `KNOWN` 里——**那张清单就是这次
 *    审计的结果本身**，新写的穿帮会红，清单里已经修掉的也会红。
 * 3. **尺子自检。** 手工正反例喂给判据，外加「`living.is` 写的日子得真存在」
 *    和「七种人家真的解析出七种不同的日子」。
 *
 * ## 写新正文时要记住的一句话
 *
 * 不是这些词不能写，是**出现这种生活细节时，必须有对应的人生环境来源。**
 * 想写「割了半晌草」，就先写上 `requires: [{ living: { is: 'farm' } }]`。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS, DOINGS } from '../src/content/days'
import { DAMPERS, LEANINGS, SPARKS } from '../src/content/leanings'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { ALL_LIVINGS, LIVINGS, livingOfOrigin } from '../src/content/living'
import { CIRCUMSTANCES } from '../src/content/circumstances'
import { meetsAll } from '../src/engine/conditions'
import { fillString } from '../src/engine/interpolate'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Condition, Effect, OriginId, SceneNode } from '../src/types/game'
import { asksOrigin, beOf, originsUnder } from './origin'
import { conditionsOf, exitsOf } from './refs'

// ============================================================
// 生活事实词典
// ============================================================

/**
 * 一件只有某几种日子里才存在的东西。
 *
 * `livings` 不是「适合谁」，是**「谁家里真有这个」**。这个分别要紧：
 * 皇子当然可以下地体验民间疾苦，但那得是专门写的一卷，
 * 不能是日常正文默认他家有块地。
 */
interface Fact {
  /** 正文里那个词，直接子串匹配 */
  word: string
  /** 只有这几种日子里，这个词才是真的 */
  livings: readonly string[]
  /**
   * 撞上这几句就不算。
   *
   * 「下地」在汉语里是两件事：下到地里去，和从炕上下来。
   * 「等你能下地走路」说的是后一件，跟有没有地毫无关系。
   * 没有这一格，这道门禁会把每一句病愈都判成穿帮——
   * **一道乱喊的门禁比没有门禁更坏**，因为它会训练人无视它。
   */
  unless?: readonly string[]
  why: string
}

/** 种地的人家 */
const FARM = ['farm'] as const

/**
 * 有个院子、有间屋、日子过在一个固定地方的人家。讨饭的和逃难的没有。
 *
 * `fallen` 和 `market` 在里头：削爵迁出京城给安置的是「城南一处小院，
 * 两进，有口井」，削藩搬进的是三进的旧宅。**门第塌了不等于露宿街头**——
 * 那两种日子丢的是营生，不是屋子。所以门槛、米缸、喂鸡对他们成立，
 * 而 `FARM` 那一组对他们不成立：城南小院没有地。
 */
const SETTLED = [
  'farm',
  'hunt',
  'craft',
  'shop',
  'clinic',
  'office',
  'yamen',
  'palace',
  'manor',
  'temple',
  'fallen',
  'market',
  'hired',
] as const

const FACTS: readonly Fact[] = [
  // 种地。这一组是这次审计的主角——旧假设的全部内容都长在这几个词上
  { word: '锄头', livings: FARM, why: '锄头是种地的家什' },
  // 「等你能下地走路」「又躺了些日子才能下地」说的是从炕上下来，不是下到地里去
  { word: '下地', livings: FARM, unless: ['能下地'], why: '「下地」得先有地' },
  { word: '下了地', livings: FARM, why: '「下地」得先有地' },
  { word: '割草', livings: FARM, why: '割草喂牲口是农活' },
  { word: '田埂', livings: FARM, why: '田埂是地里的路' },
  { word: '场院', livings: FARM, why: '场院是打粮晒粮的地方' },
  { word: '打谷场', livings: FARM, why: '打谷场是村里种地人家共用的地方' },
  { word: '地里', livings: FARM, why: '「地里」指的是自家那块地' },
  { word: '农忙', livings: FARM, why: '农忙是种地人家的时令' },
  { word: '收成', livings: FARM, why: '收成是自家地里打下来的' },
  { word: '晒谷', livings: FARM, why: '晒谷得有场院' },
  { word: '插秧', livings: FARM, why: '插秧是农活' },
  { word: '镰刀', livings: FARM, why: '镰刀是收割的家什' },
  { word: '牲口', livings: ['farm', 'hunt', 'shop'], why: '牲口要养得起，也要用得着' },

  // 家里养着的活物、拾掇得着的院子。讨饭的和路上逃难的没有这些
  { word: '喂鸡', livings: SETTLED, why: '喂鸡得有个安顿下来的家' },
  { word: '喂了鸡', livings: SETTLED, why: '喂鸡得有个安顿下来的家' },
  { word: '门槛', livings: SETTLED, why: '门槛得有一扇自家的门' },
  { word: '米缸', livings: SETTLED, why: '米缸是存粮的人家才有的东西' },

  // 反着的几条。眼下的正文里一条也不会撞上——它们在这儿是把规矩写全：
  // 「不许默认农户」跟「不许默认宫里」是同一条规矩的两面
  { word: '猎弓', livings: ['hunt'], why: '弓是打猎人家的家什' },
  { word: '账本', livings: ['shop'], why: '账本是做买卖的人家才有的' },
  { word: '柜台', livings: ['shop', 'clinic'], why: '柜台得有个铺面' },
  { word: '府衙', livings: ['office', 'yamen'], why: '衙门是做官人家、当差人家的去处' },
  { word: '宫门', livings: ['palace'], why: '宫门只有宫里的人天天进出' },
  { word: '内侍', livings: ['palace'], why: '内侍是宫里的人事' },

  /**
   * 硬写在正文里的宫廷称谓。
   *
   * 这一条跟 `scripts/address.ts` 是**分工**，而分工线不在词上，
   * 在「这个词有没有正经的产出路径」上：
   *
   * - **有的**，归那一支。「父王」「母妃」现在是爵位表（`RANK_CALLS`）
   *   的产出——正文里写 `{elder}`，他爹身上挂着亲王，落笔才成那两个字，
   *   削爵那天换一个查不到的爵位，它自己就变回「父亲」。
   *   这种词一个字也不许硬写，**不论在哪一卷**：手写的那份绕过了爵位表，
   *   削爵之后不会跟着变。那一支扫全库，比按读者集合量严得多。
   * - **没有的**，留在这儿，按读者集合量。
   *
   * 「父皇」正是没有的那种：宫里那位在爵位表里查不到（见 `content/address.ts`
   * 那段注释），所以皇子开口是「爹爹」，**这个系统里没有任何一处会产出「父皇」**。
   * 它只可能是有人手打上去的，于是它归静态扫描管。
   *
   * 从前这儿还有一条「母妃」，量的是「宫墙外没有这个词」——那个理由本身就是错的：
   * 「母妃」是亲王正妃之子对生母的称呼，王府在宫墙外，而那正是它该出现的地方。
   * 词随着爵位表一起搬走了，理由也跟着作废。
   */

  /**
   * 「父皇大行」豁免，因为那不是他开口，是旨意的原话。
   *
   * 这一条是实测逼出来的，不是预先想到的：门禁第三节自己打印的
   * 读者集合是 `edict=fallen`——那一节的 `onEnter` 里
   * `{ type: 'living', living: 'fallen' }` 在 blocks 之前就落了，
   * 于是「三天后有旨意下来」这一整节都算宫墙外的话。
   *
   * 而这一节的正文正在转述那道旨意。「大行」是皇帝驾崩的专用礼制词，
   * 旨意里用的当然是「父皇」——**史笔本来就该用礼制词**
   * （见 `content/address.ts`：那一层管的是他自己怎么开口，
   * 不管年表和大事记怎么记事）。
   *
   * 豁免的是这四个字连在一起的那种句子，不是「父皇」两个字。
   * 哪天有人写下「你去给父皇请安」放在削爵之后，照红。
   */
  {
    word: '父皇',
    livings: ['palace'],
    unless: ['父皇大行'],
    why: '「父皇」是宫里的礼制称呼，宫墙外没有这个词',
  },
]

// ============================================================
// 谁读得到这一句
// ============================================================

const ALL_IDS: readonly string[] = ALL_LIVINGS.map((one) => one.id)

/**
 * 出身给得起的那几种日子。
 *
 * 从 `LIVINGS` 那张表算，不在这儿手抄一份十一行的名单。那张表是
 * `Record<OriginId, Living>`——**加一行出身，它不表态就编译不过**，
 * 于是这里自动跟着走。手抄的那份不会：它会安安静静地少算一种日子，
 * 而少算的后果是「谁读得到这一句」算窄了，也就是漏报。
 *
 * 上一版这里确实是手抄的，抄的是十一个行当名。那时它还说得通——
 * 户籍是个平的枚举，除了抄没有别的办法。现在出身是一张表，
 * 表自己知道自己有几行。
 */
const FROM_ORIGIN: readonly string[] = [...new Set(Object.values(LIVINGS).map((one) => one.id))]

/**
 * 被人捡去养大之后过的那几种日子。
 *
 * 它们不属于任何一行出身——**这正是出身和 `living` 分家的原因**：
 * 老乞丐捡去养大的孩子，家里的籍还是民户、业还是务农，日子是讨饭的。
 *
 * 从境况表里算，不是「全部减去出身那几种」。那个减法从前是对的，
 * 因为那时候一种日子只有两个来源；`fallen` / `market` 出现之后它就错了——
 * 门第塌了不是「被人捡去养大」，可减法会把它算进来，
 * 于是「问一句谁把你养大的」会连带放行两种出生时不可能有的日子。
 */
const FROM_KEEPER: readonly string[] = [
  ...new Set(
    CIRCUMSTANCES.flatMap((one) => one.kin)
      .map((kin) => kin.living)
      .filter((id): id is string => id !== undefined),
  ),
]

/** 生下来就在过的日子：出身给的那几种，加上抚养人带来的那几种 */
const BORN_IDS: readonly string[] = [...new Set([...FROM_ORIGIN, ...FROM_KEEPER])]

/**
 * 半路上才有的日子。**出身条件一句也说不出它们。**
 *
 * 这一格是 living 变得可变之后才需要的：从前一个人过什么日子，
 * 出生那天就定死了，`livingsUnder` 那套「顺着 requires 一路收窄」
 * 因此是完备的。现在不完备了——十七岁削爵迁出京城的那个人，
 * 户籍还是皇室，生父那条边也还在册上（虽然人没了），可他过的是 `fallen`。
 *
 * ## 那它们从哪儿进读者集合？
 *
 * **从图上走进来，不从条件里推出来。**`readersByNode` 漫开的时候，
 * 走过一处 `living` 效果就把读者整个换掉（见 `afterLiving`），
 * 于是削爵那一节往下的每一节，读者自然就是 `fallen` 和 `market`。
 *
 * 试过另一条路：凡是靠出身收窄的分支，都把这两种一并放行。
 * 那条路当场喂出六处误报，`birth:农户:kept · 下了地` 是其中一条——
 * **出生那一天，门第还没有塌。**条件收窄跟时间先后是两件事，
 * 拿前者去表达后者，只会让每一句农活都变成穿帮。
 *
 * ## 剩下的缺口，明写在这儿
 *
 * 跨卷的时间先后算不出来：`royal-observatory` 的窗口是 9-14 岁，
 * `royal-fall` 是 13-15 岁，两者可能颠倒过来，那时钦天监那一卷的读者
 * 已经不是 `palace` 了。图上没有这条边，漫开走不过去。
 * 眼下这个缺口量不出东西来（`palace` / `fallen` / `market` 在词典里
 * 归在同一组 `SETTLED` 上，`FARM` 那组对三者都不成立），
 * **所以它是记下来的债，不是现在要修的洞。**
 */
const MIDLIFE_IDS: readonly string[] = ALL_IDS.filter((id) => !BORN_IDS.includes(id))

/**
 * 一种境况过得上的日子。
 *
 * 捡来养的那几种，抚养人身上带着自己的营生，孩子跟着过他的日子；
 * 可**那个人也会死**——`household.ts` 的 `living` 只认还活着的抚养人，
 * 人没了就落回这个家的营生。所以这里两样都得算上，
 * 不能只写那一种捡来的日子。
 */
function livingsOfCircumstance(one: (typeof CIRCUMSTANCES)[number]): readonly string[] {
  const keeper = one.kin
    .filter((kin) => kin.bond === '抚养')
    .map((kin) => kin.living)
    .find((living) => living !== undefined)
  return keeper === undefined ? FROM_ORIGIN : [keeper, ...FROM_ORIGIN]
}

/**
 * 关系网里有这么个位置的人，能过上哪几种日子。
 *
 * ## 为什么问一句「你还有爹吗」就能收窄
 *
 * 讨饭、寺里、路上这三种日子只有一个来源：`circumstances.ts` 里那三种
 * 捡来养的境况。而那三种的关系网里**根本没有生父生母这两条边**——
 * 不是「爹死了」，是世界压根没记住他爹娘是谁。
 * 所以 `{ bond: { kind: '生父', alive: true } }` 一写上，
 * 讨饭的孩子就已经被挡在门外了，用不着再写一遍 `living`。
 *
 * 这件事全库都在用：`birth.ts` 的开场靠它分流弃儿，
 * 欠债那一整条链靠它把没爹的人生排除在外。门禁不认这一条的话，
 * 会把十来处**已经分流干净**的正文判成穿帮，而那种门禁没人会听。
 *
 * ## 查不到就放行，这一条不能省
 *
 * 弟妹是长大以后才添的（`birth.ts` 的 `bearKin`），师徒、朋友、
 * 配偶子女更是。这些关系一条也不在境况表里，查出来是空的——
 * 空的时候必须放行全部，不是收窄到零。**收窄到零就成了漏报**：
 * 没有人读得到这一句，于是这一句永远不会红。
 */
function livingsWithKin(match: (kin: (typeof CIRCUMSTANCES)[number]['kin'][number]) => boolean): {
  readonly ids: readonly string[]
  readonly known: boolean
} {
  const ids = new Set<string>()
  for (const one of CIRCUMSTANCES) {
    if (!one.kin.some(match)) continue
    for (const id of livingsOfCircumstance(one)) ids.add(id)
  }
  return { ids: [...ids], known: ids.size > 0 }
}

/**
 * 一组条件放行哪几种日子。
 *
 * `Condition[]` 是且的关系，所以这里逐条求交。看不懂的条件一律放行全部——
 * **门禁宁可多报，不可漏报。**
 */
function livingsUnder(conditions: readonly Condition[] | undefined): Set<string> {
  let allowed = new Set(ALL_IDS)
  for (const one of conditions ?? []) {
    let here: readonly string[] | undefined
    if (one.living?.is !== undefined) here = [one.living.is]
    else if (one.living?.hasChore !== undefined) {
      const want = one.living.hasChore
      here = ALL_LIVINGS.filter((living) => (living.chore !== null) === want).map((l) => l.id)
    } else if (asksOrigin(one)) {
      // 出身锁不死日子：被老乞丐捡去养大的孩子，家里的籍和业一格没动，
      // 过的却是讨饭的日子。所以这里得把三种收养的日子一并放行
      here = [...originsUnder(one).map((row) => livingOfOrigin(row.id).id), ...FROM_KEEPER]
    } else if (one.bond !== undefined) {
      const kind = one.bond.kind
      const mustLive = one.bond.alive === true
      const found = livingsWithKin(
        (kin) => kin.bond === kind && !(mustLive && kin.goneAtBirth === true),
      )
      if (found.known) here = found.ids
    } else if (one.family !== undefined) {
      // `family` 问的是人口册里有没有这个 id 且还在世，跟 `bond` 是一回事的两种写法。
      // 欠债那条链后半截问的就是它（`{ family: { id: 'father', alive: true } }`）
      const who = one.family.id
      const mustLive = one.family.alive
      const found = livingsWithKin(
        (kin) => kin.id === who && !(mustLive && kin.goneAtBirth === true),
      )
      if (found.known) here = found.ids
    }
    if (here === undefined) continue
    allowed = new Set([...allowed].filter((id) => here.includes(id)))
  }
  return allowed
}

/** 这一句里出现了哪些不属于这几种日子的东西 */
function trespasses(text: string, livings: Iterable<string>): Fact[] {
  const who = [...livings]
  return FACTS.filter(
    (fact) =>
      text.includes(fact.word) &&
      !(fact.unless ?? []).some((idiom) => text.includes(idiom)) &&
      who.some((id) => !fact.livings.includes(id)),
  )
}

// ============================================================
// 取正文
// ============================================================

/** 一个节点身上所有会落到纸面上的字 */
function linesOf(node: SceneNode): string[] {
  const out: string[] = []
  for (const block of node.blocks) {
    if (block.kind === 'divider') continue
    if (block.kind === 'heading') {
      out.push(block.title)
      continue
    }
    if (block.kind === 'dialogue' && block.speaker) out.push(block.speaker)
    out.push(block.text)
  }
  for (const one of node.seen ?? []) out.push(one.text)
  for (const choice of node.choices ?? []) {
    out.push(choice.label)
    if (choice.echo) out.push(choice.echo)
  }
  return out
}

// ============================================================
// 造一世
// ============================================================

interface Fixture {
  label: string
  origin: OriginId
  /**
   * 指望被外人养大。空着就是自家大人带。
   *
   * 从前这一格存的是那个人的**营生**（「讨饭的」），因为当时
   * 「他过什么日子」正是拿营生当键查出来的。两件事拆开之后
   * （见 `types/game.ts` 的 `Person.living`），这一格只剩一个意思：
   * 该不该有一个自带日子的抚养人。是哪一种日子，`living` 那一格说了算。
   */
  keeper?: true
  /** 该解析出哪一种日子。这一格是给尺子自检用的 */
  living: string
}

/**
 * 用户点名的那几种人家，加上后来补的一行。
 *
 * 走出身的那几行（`keeper` 空着）跟走抚养的那几行（`keeper: true`）
 * 是两类，而**走抚养的才是这套东西真正的考题**：
 * 家里的籍还是民户、业还是务农，日子过的却是讨饭、寺里、没有落脚的地方，
 * 正文得听后者的。所以它们的 `origin` 一律写 `farm`：
 * **那正是它们该出的丑**——出身那一行一个字没变，而日子整个换了。
 *
 * 这里不写各有几行：数一数 `FIXTURES.length` 就知道，而写进散文里的数
 * 会随着补行漂掉，且没有任何一次跑会提醒你回头看它。
 */
const FIXTURES: readonly Fixture[] = [
  { label: '农户', origin: 'farm', living: 'farm' },
  { label: '猎户', origin: 'hunt', living: 'hunt' },
  { label: '布庄', origin: 'cloth', living: 'shop' },
  { label: '做官', origin: 'office', living: 'office' },
  { label: '衙役', origin: 'yamen', living: 'yamen' },
  { label: '宫里', origin: 'court', living: 'palace' },
  { label: '寺中孤儿', origin: 'farm', keeper: true, living: 'temple' },
  { label: '乞丐收养', origin: 'farm', keeper: true, living: 'begging' },
  /*
   * 战乱失散这一行是补进来的。
   *
   * 从前七行里没有它，于是 `adrift` 那种日子**没有任何一条判据钉着**。
   * 差点因此丢掉：那个抚养人的日子从前是拿他的营生当键查出来的，
   * 而那句营生（「逃难路上的人」）是一句会过期的话，为了不让它
   * 二十年后还挂在面板上而删掉时，`adrift` 会跟着一起没了——
   * 七行 FIXTURES 全绿，界面上什么也看不出来。
   */
  { label: '战乱失散', origin: 'farm', keeper: true, living: 'adrift' },
]

const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/**
 * 掷到指望的那种境况为止。
 *
 * 收养那三种境况加起来不到一成，所以这里是掷，不是拼——**判据取系统
 * 实际跑出来的人生，不取手工摆出来的样子**。摆出来的那个永远会通过，
 * 因为它就是照着判据摆的。
 */
function bear(fixture: Fixture): boolean {
  for (let tries = 0; tries < 6000; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    beOf(fixture.origin)
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.bornYear = world.time.year - 12
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }
    world.setFlag('schooled', true)

    const keepers = people.guardians
      .filter((id) => people.isAlive(id))
      .map((id) => people.personOf(id)?.living)
      .filter((living): living is string => living !== undefined)
    const hit =
      fixture.keeper === undefined ? keepers.length === 0 : keepers.includes(fixture.living)
    if (hit) return true
  }
  return false
}

// ============================================================
// 第一道：七种人家，同一天
// ============================================================

/**
 * 只看用户点名的那一天，不看整卷童年。
 *
 * 范围是「帮家里干活」那个去处、它抽得到的每一段、它牵出来的每一句心念，
 * 外加「北边」那一卷——那正是穿帮那段正文的两个出处。
 * 这一道没有豁免清单：**它盯的是刚修好的东西，修好了就该一直是绿的。**
 */
function sameDay(): string[] {
  const wrong: string[] = []
  const seenLivings = new Map<string, string>()
  const beatCounts = new Map<string, number>()

  for (const fixture of FIXTURES) {
    if (!bear(fixture)) {
      wrong.push(`${fixture.label}：掷了六千回也没掷出这种人家，判据本身失效了`)
      continue
    }
    // 问的是 `character.living`，不是 `household.living`——那才是条件和
    // 正文实际读的那一格。这七种人家一条 `livings` 也没有，
    // 所以这里同时也在量那条解析链的落回：顶上空着，答案得由下一级给出来
    const character = useCharacterStore()
    const living = character.living.id
    if (living !== fixture.living) {
      wrong.push(`${fixture.label}：该过 ${fixture.living} 的日子，实际解析成 ${living}`)
    }
    seenLivings.set(fixture.label, living)

    const lines: { where: string; text: string }[] = []

    // 一、这个去处本身
    const work = DOINGS.find((doing) => doing.id === 'work')
    const canWork = work !== undefined && meetsAll(work.requires)
    if (canWork) {
      lines.push({ where: '去处', text: fillString(work.label) })
      lines.push({ where: '去处', text: fillString(work.echo) })
    }

    // 二、这个去处抽得到的每一段。年景一律不问——同一段在别的年份照样抽得到
    const tags = new Set<string>()
    let reachable = 0
    if (canWork) {
      for (const beat of BEATS) {
        if (beat.doing !== 'work' || !meetsAll(beat.requires)) continue
        reachable += 1
        for (const tag of beat.tags ?? []) tags.add(tag)
        const text = typeof beat.text === 'string' ? [beat.text] : beat.text
        for (const one of text) lines.push({ where: `第${reachable}段`, text: fillString(one) })
      }
    }
    beatCounts.set(fixture.label, reachable)

    // 三、这一天牵出来的心念。穿帮最爱躲在这一层——
    // 正文分流干净了，回响还挂在「替家里下地」上，一样是没有地的人在看地
    for (const leaning of LEANINGS) {
      for (const echo of leaning.echoes) {
        if (echo.tags.some((tag) => tags.has(tag))) {
          lines.push({ where: `心念:${leaning.id}`, text: fillString(echo.text) })
        }
      }
    }
    for (const spark of SPARKS) {
      if ((spark.tags ?? []).some((tag) => tags.has(tag)) && meetsAll(spark.requires)) {
        lines.push({ where: `火种:${spark.id}`, text: fillString(spark.text) })
      }
    }

    // 四、「北边」那一卷。穿帮那句「父亲在檐下修一把锄头」的正主
    const north = lifeEvents.find((event) => event.id === 'dad-north')
    if (north !== undefined && meetsAll(north.requires)) {
      const scene = lifeScenes[north.scene]
      for (const node of Object.values(scene?.nodes ?? {})) {
        for (const line of linesOf(node)) {
          lines.push({ where: `${north.scene}:${node.id}`, text: fillString(line) })
        }
      }
    }

    for (const line of lines) {
      const fact = trespasses(line.text, [living])[0]
      if (fact === undefined) continue
      wrong.push(`${fixture.label}(${living}) ${line.where}「${line.text}」← ${fact.why}`)
    }
  }

  // 输入得能区分对错：七种人家要是解析出同一种日子，上面那一圈等于没跑
  const kinds = new Set(seenLivings.values())
  if (kinds.size < FIXTURES.length) {
    wrong.push(`${FIXTURES.length} 种人家只解析出 ${kinds.size} 种日子，这批输入分不开出身`)
  }
  const counts = new Set(beatCounts.values())
  if (counts.size < 2) {
    wrong.push(`${FIXTURES.length} 种人家抽得到的段数完全一样，说明分流条件一条也没生效`)
  }

  console.log(`  ${FIXTURES.length} 种人家各自的日子与可抽段数：`)
  for (const fixture of FIXTURES) {
    const living = seenLivings.get(fixture.label) ?? '?'
    console.log(
      `    ${fixture.label} → ${living}，帮家里干活可抽 ${beatCounts.get(fixture.label)} 段`,
    )
  }
  return wrong
}

// ============================================================
// 第二道：全库对账
// ============================================================

/**
 * 存量债务。
 *
 * **这张清单就是这次「内容假设审计」的结果本身**：全库里每一句默认了
 * 农户世界的正文，都在这儿记着账。它是棘轮——新写一句会红，
 * 清单里某一句被修掉了也会红，逼着人回来把这一行删掉。
 *
 * 清单不是豁免，是待办。要销账，办法只有两个：
 * 给那一卷写上 `requires: [{ living: ... }]`，或者把那句生活细节改成
 * 谁家都成立的样子（`{chore}` / `{putsAway}` 就是为这个准备的）。
 */
const KNOWN: readonly string[] = [
  // ────────────────────────────────────────────────
  // 一、卷上问的是出身，可出身锁不死日子
  //
  // `{ origin: 'farm' }` 这个条件放行的不止农户的日子——**被老乞丐捡去
  // 养大的孩子，家里的籍还是民户、业还是务农**，于是他也走到了这一节，
  // 读到的是「娘把你放在田埂上」。他没有田埂。
  //
  // 销账的办法：这几处分流问的其实一直是「过什么日子」，
  // 把 `{ origin: 'X' }` 换成 `{ living: { is: '…' } }` 就对了。
  // 那是重写童年卷的活，不在这次审计的范围里。
  // ────────────────────────────────────────────────
  'child:memory:escort · 门槛',
  'child:memory:farm · 田埂',
  'child:memory:shop · 柜台',
  'royal:fall:open · 宫门',

  // ────────────────────────────────────────────────
  // 二、压根没问过出身
  //
  // 这一类才是这次审计真正要指出来的东西：**它们不是条件写错了，
  // 是从来没有人想过要写条件。** 一天里待在家中就「扫了地，喂了鸡」，
  // 心念一动就「在门槛上坐着」，辍学了就「跟着母亲下地」——
  // 写的时候脑子里那个家，是个有院子有鸡有门槛有地的农户家。
  //
  // 销账的办法有两条，按句子挑：
  // - 这句话换个物件就成立的，交给 `{chore}` / `{putsAway}` 去问这家人；
  // - 非这种日子不可的，补上 `requires: [{ living: { is: '…' } }]`，
  //   再给别的日子补一条对得上的。
  // ────────────────────────────────────────────────
  'child:harvest:open · 收成',
  'child:hungry:asked · 收成',
  'dampers:made-up-with-kids · 打谷场',
  'days:home:w30 · 门槛',
  'days:home:w46 · 喂了鸡',
  'days:idle:w30 · 门槛',
  'days:kids:w44 · 打谷场',
  'dearth:price:after-borrow · 米缸',
  'dearth:price:after-borrow · 门槛',
  'dearth:price:after-work · 米缸',
  'debt:death:after · 下地',
  'leanings:leave · 门槛',
  'leanings:settle · 门槛',
  'need:illness:open · 下地',
  'routine:youth:worker · 地里',
  'school:strength:open · 地里',
  'school:threshold:cannot · 下地',
  'school:threshold:cannot · 镰刀',
  'seek:errand:gave-up · 农忙',
  'sparks:what-is-left-at-home · 米缸',
  'tutor:words:taught · 门槛',
]

/** 一个节点的门牌 */
function at(scene: string, node: string): string {
  return `${scene}:${node}`
}

/**
 * 一组效果把读者集合变成什么样。
 *
 * 绝大多数效果不动它，原样返回。碰上 `{ type: 'living' }` 就整个换掉——
 * **不是收窄，是替换**：走过这一节的人，不管进来时过的是哪种日子，
 * 出去时过的都是这一种。
 *
 * 一节里连着两处就以最后一处为准，跟 `applyEffects` 顺序执行是一回事。
 * 进来的集合是空的（这一节没人走得到）就不给它凭空造出读者来。
 */
function afterLiving(from: Set<string>, effects: readonly Effect[] | undefined): Set<string> {
  let becomes: string | undefined
  for (const one of effects ?? []) if (one.type === 'living') becomes = one.living
  if (becomes === undefined || from.size === 0) return from
  return new Set([becomes])
}

/**
 * 指名道姓地问一节：你把日子换成了哪一种。没换就是 undefined。
 *
 * 跟上面那个取的是同一件事，用处相反——`afterLiving` 拿它往下传播，
 * 这一个拿它给对照组取那个**不许出现在上游的词**。
 *
 * 单开一个函数而不是在判据里手写「fallen」，是因为手写的那份不会跟着内容走：
 * 哪天搬家那一节改成落别的日子，判据仍旧盯着 fallen，一直绿。
 */
function livingSetAt(sceneId: string, nodeId: string): string | undefined {
  const onEnter = lifeScenes[sceneId]?.nodes[nodeId]?.onEnter
  let becomes: string | undefined
  for (const one of onEnter ?? []) if (one.type === 'living') becomes = one.living
  return becomes
}

/**
 * 每一个节点，是过着哪几种日子的人读得到的。
 *
 * 逐节点算，不是逐卷算——这个分别是必须的：`child:memory` 那一卷的入口
 * 对谁都开着，可它底下十个分流节点各自锁着一种出身，
 * 「{dam}把你放在田埂上」只有走 `{ origin: 'farm' }` 那条边才读得到。
 * 按卷算会把这十节全判成穿帮，**门禁一旦开始喊狼来了，就没人再听它。**
 *
 * 走法是从每一卷的入口漫开，边上带着条件就在那里收窄一次，
 * 一直漫到不动为止。跨卷的边把范围一并带过去。
 *
 * ## 两张表，因为日子会在半路上变
 *
 * 从前只有一张，而那张表的算法**只会收窄**——它假定了「一个人过什么日子
 * 出生那天就定死」。削爵那一卷之后这个假定不成立了：
 *
 *     进 edict 这一节的是 palace（进宫门的那批人）
 *     可 edict 的 onEnter 挂着 living: 'fallen'
 *     于是它自己的正文和它往下的每一条边，读者都已经是 fallen 了
 *
 * 只有一张表的话，`outside` / `shut` 会被算成「宫里的人读得到」，
 * 于是那两节里写什么都拿宫里的尺子量——**而那是漏报也是误报**：
 * 该查 fallen/market 的没查，不该查 palace 的查了。
 *
 * 所以分两张：
 *
 *     arriving  进这一节时是谁      漫开算法用它，单调增长才停得下来
 *     reading   读这一节正文的是谁  = arriving 走完 onEnter 之后
 *
 * 往下传的是 `reading`，再叠上那条边自己的效果。
 * 对账那一段要的也是 `reading`——问的是「这句话是谁读的」。
 */
function readersByNode(): Map<string, Set<string>> {
  const arriving = new Map<string, Set<string>>()

  const widen = (key: string, incoming: Set<string>): boolean => {
    const already = arriving.get(key)
    if (already === undefined) {
      arriving.set(key, new Set(incoming))
      return incoming.size > 0
    }
    let moved = false
    for (const one of incoming) {
      if (already.has(one)) continue
      already.add(one)
      moved = true
    }
    return moved
  }

  // 入口：由事件直接进来的那一节
  for (const event of lifeEvents) {
    const [scene = '', node] = event.scene.split('#')
    const where = lifeScenes[scene]
    if (where === undefined) continue
    widen(at(scene, node ?? where.entry), livingsUnder(event.requires))
  }

  /**
   * 另外两种入口：日常和收尾。
   *
   * 它们不在年表里——年表挑不出事的时候人就回到日常，十六岁那年走进渡口，
   * 两处都是引擎直接送进去的。只认 `lifeEvents` 的话，这五卷连同它们
   * 底下的每一节都取不到读者集合，于是**在全库对账里被整段跳过**。
   * 那不是「查过了没问题」，是压根没查——门禁宁可多报，不可漏报。
   *
   * 谁都走得到，所以给全部日子。
   */
  for (const id of [...Object.values(lifeRoutine), lifeFinale]) {
    const where = lifeScenes[id]
    if (where === undefined) continue
    widen(at(id, where.entry), new Set(ALL_IDS))
  }

  for (let round = 0; round < 64; round += 1) {
    let moved = false
    for (const [sceneId, scene] of Object.entries(lifeScenes)) {
      for (const node of Object.values(scene.nodes)) {
        const came = arriving.get(at(sceneId, node.id))
        if (came === undefined) continue
        const from = afterLiving(came, node.onEnter)
        for (const exit of exitsOf(node)) {
          const narrowed = livingsUnder(exit.requires)
          const passed = new Set([...from].filter((one) => narrowed.has(one)))
          const carried = afterLiving(passed, exit.effects)
          if (carried.size === 0) continue
          if (exit.to.includes('#')) {
            const [target = '', node] = exit.to.split('#')
            const there = lifeScenes[target]
            if (there === undefined) continue
            moved = widen(at(target, node ?? there.entry), carried) || moved
            continue
          }
          if (exit.to in scene.nodes) {
            moved = widen(at(sceneId, exit.to), carried) || moved
            continue
          }
          const there = lifeScenes[exit.to]
          if (there === undefined) continue
          moved = widen(at(exit.to, there.entry), carried) || moved
        }
      }
    }
    if (!moved) break
  }

  // 漫开定下来了，再把每一节的 onEnter 过一遍——**读正文的是变化之后的那批人**
  const reading = new Map<string, Set<string>>()
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const node of Object.values(scene.nodes)) {
      const came = arriving.get(at(sceneId, node.id))
      if (came === undefined) continue
      reading.set(at(sceneId, node.id), afterLiving(came, node.onEnter))
    }
  }
  return reading
}

function wholeLibrary(): string[] {
  const readers = readersByNode()
  const found: string[] = []
  const note = (where: string, word: string) => found.push(`${where} · ${word}`)

  // 一、每一节的正文。读不到的那些节点不查——它们由别的门禁盯着孤儿问题
  let swept = 0
  let skipped = 0
  for (const [id, scene] of Object.entries(lifeScenes)) {
    for (const node of Object.values(scene.nodes)) {
      const here = readers.get(at(id, node.id))
      if (here === undefined) {
        skipped += 1
        continue
      }
      swept += 1
      for (const line of linesOf(node)) {
        for (const fact of trespasses(line, here)) note(at(id, node.id), fact.word)
      }
    }
  }
  // 跳过多少节要报出来。一道悄悄少查了半个库的门禁，看着跟全绿一模一样
  console.log(`  扫到的节点：${swept} 节，走不到因而没查的：${skipped} 节`)

  // 二、一天里的去处和落点
  for (const doing of DOINGS) {
    const readers = livingsUnder(doing.requires)
    for (const line of [doing.label, doing.echo]) {
      for (const fact of trespasses(line, readers)) note(`days:${doing.id}`, fact.word)
    }
    for (const beat of BEATS.filter((one) => one.doing === doing.id)) {
      const here = new Set([...livingsUnder(beat.requires)].filter((one) => readers.has(one)))
      const text = typeof beat.text === 'string' ? [beat.text] : beat.text
      for (const line of text) {
        for (const fact of trespasses(line, here))
          note(`days:${doing.id}:w${beat.weight}`, fact.word)
      }
    }
  }

  // 三、心念那一层。它不走 requires，靠标记分流，所以这里按
  // 「挂着这个标记的段，都是谁抽得到的」倒着算一遍
  const byTag = new Map<string, Set<string>>()
  for (const beat of BEATS) {
    const doing = DOINGS.find((one) => one.id === beat.doing)
    const here = new Set(
      [...livingsUnder(beat.requires)].filter((one) => livingsUnder(doing?.requires).has(one)),
    )
    for (const tag of beat.tags ?? []) {
      const already = byTag.get(tag)
      if (already === undefined) byTag.set(tag, new Set(here))
      else for (const one of here) already.add(one)
    }
  }
  const readersOf = (tags: readonly string[]): Set<string> => {
    const out = new Set<string>()
    for (const tag of tags) for (const one of byTag.get(tag) ?? ALL_IDS) out.add(one)
    return out
  }
  for (const leaning of LEANINGS) {
    for (const echo of leaning.echoes) {
      for (const fact of trespasses(echo.text, readersOf(echo.tags))) {
        note(`leanings:${leaning.id}`, fact.word)
      }
    }
  }
  for (const spark of SPARKS) {
    const readers = spark.tags === undefined ? new Set(ALL_IDS) : readersOf(spark.tags)
    for (const fact of trespasses(spark.text, readers)) note(`sparks:${spark.id}`, fact.word)
  }
  for (const damper of DAMPERS) {
    const readers = damper.tags === undefined ? new Set(ALL_IDS) : readersOf(damper.tags)
    for (const fact of trespasses(damper.text, readers)) note(`dampers:${damper.id}`, fact.word)
  }

  const now = [...new Set(found)].sort()
  const fresh = now.filter((one) => !KNOWN.includes(one))
  const gone = KNOWN.filter((one) => !now.includes(one))

  console.log(`  全库正文里默认了出身的地方：${now.length} 处，其中记过账的 ${KNOWN.length} 处`)
  const wrong: string[] = []
  for (const one of fresh) wrong.push(`新写的：${one}`)
  for (const one of gone) wrong.push(`已经修掉了，请把这一行从 KNOWN 里删掉：${one}`)
  return wrong
}

// ============================================================
// 第三道：尺子自检
// ============================================================

/** 手工正反例。判据不会自己证明自己 */
const RULER: readonly { text: string; living: string; leaks: boolean; why: string }[] = [
  { text: '父亲在檐下修一把锄头', living: 'palace', leaks: true, why: '宫里没有锄头' },
  { text: '父亲在檐下修一把锄头', living: 'farm', leaks: false, why: '种地的人家有锄头' },
  { text: '你跟着下了地，割了半晌草', living: 'begging', leaks: true, why: '讨饭的人家没有地' },
  { text: '你跟着下了地，割了半晌草', living: 'farm', leaks: false, why: '种地的人家有地' },
  { text: '收工的时候你又回头看了一眼地里', living: 'hunt', leaks: true, why: '打猎的人家没有地' },
  { text: '他把手里的活放下了，想了很久', living: 'palace', leaks: false, why: '这一句谁都成立' },
  {
    text: '又是这样一天。天黑下来，把弓挂回墙上。',
    living: 'hunt',
    leaks: false,
    why: '弓是猎户的收工',
  },
  { text: '场院上晒得满满的', living: 'office', leaks: true, why: '当差的人家没有场院' },
  // 这一对是给「例外」画边界的：放行的只有那一句成语，不是「下地」这个词
  {
    text: '等你能下地走路，半个多月已经过去了。',
    living: 'palace',
    leaks: false,
    why: '「能下地」说的是从炕上下来，跟有没有地无关',
  },
  { text: '你照旧下地。', living: 'palace', leaks: true, why: '宫里没有地可下' },
]

function ruler(): string[] {
  const wrong: string[] = []

  for (const one of RULER) {
    const hit = trespasses(one.text, [one.living]).length > 0
    if (hit === one.leaks) continue
    wrong.push(
      one.leaks
        ? `该拦没拦住：${one.living} 读到「${one.text}」——${one.why}`
        : `拦错了：${one.living} 读「${one.text}」本来是对的——${one.why}`,
    )
  }

  // 词典里写的日子得真的存在。`{ living: { is: 'farmm' } }` 这种错没人管
  for (const fact of FACTS) {
    for (const id of fact.livings) {
      if (!ALL_IDS.includes(id)) wrong.push(`词典里「${fact.word}」写的日子 ${id} 不存在`)
    }
  }

  // 内容里写的日子也得真的存在。这一条是 verify.ts 第四道指过来的
  const written = new Set<string>()
  const collect = (conditions: readonly Condition[] | undefined) => {
    for (const one of conditions ?? []) if (one.living?.is !== undefined) written.add(one.living.is)
  }
  for (const event of lifeEvents) collect(event.requires)
  for (const scene of Object.values(lifeScenes)) {
    for (const node of Object.values(scene.nodes)) {
      for (const ref of conditionsOf(node)) collect(ref.requires)
    }
  }
  for (const doing of DOINGS) collect(doing.requires)
  for (const beat of BEATS) collect(beat.requires)
  for (const spark of SPARKS) collect(spark.requires)
  for (const id of written) {
    if (!ALL_IDS.includes(id)) wrong.push(`内容里写了一种不存在的日子：${id}`)
  }
  console.log(`  内容里点名的日子：${[...written].sort().join(' ') || '（一个也没有）'}`)

  // 词典里要是没有一条管着种地的词，头两道就永远是绿的
  if (!FACTS.some((fact) => fact.livings.length === 1 && fact.livings[0] === 'farm')) {
    wrong.push('词典里一条农户专属的词都没有，那两道门禁量不出东西来')
  }

  /**
   * 收窄这件事本身也得有人量。
   *
   * `livingsUnder` 靠 `circumstances.ts` 的形状办事，而那份表是会改的。
   * 底下这四条把它钉住：问一句生父就该挡住讨饭的，问一句抚养就不该挡住谁，
   * 问一件长大以后才有的关系（弟妹）就该一个也不挡——
   * **最后一条最要紧**，收窄到零等于这一句永远没人读得到，
   * 于是它永远不会红。那是漏报，比误报难发现得多。
   *
   * 前四条的期望里**一个半路上的日子也没有**，那是有意的：
   * 出身条件回答的是「他生下来过的是什么日子」。
   * 门第塌了那件事不写在条件里，它写在图上——见 `MIDLIFE_IDS`。
   *
   * 而第三条（弟妹）放行的是全部十二种，**包括那两种**。
   * 这一对差别正是这套判据的分量所在：
   * 查得到就收窄到出身能给的那几种，查不到就一种也不挡。
   */
  const narrowings: readonly { what: string; when: Condition; want: readonly string[] }[] = [
    {
      what: '问一句「你还有爹吗」',
      when: { bond: { kind: '生父', alive: true } },
      want: FROM_ORIGIN,
    },
    {
      what: '问一句「谁把你养大的」',
      when: { bond: { kind: '抚养', alive: true } },
      want: BORN_IDS,
    },
    { what: '问一句「你有妹妹吗」', when: { bond: { kind: '妹' } }, want: ALL_IDS },
    {
      what: '问一句「爹还在吗」',
      when: { family: { id: 'father', alive: true } },
      want: FROM_ORIGIN,
    },
    {
      // 这一条是反过来量的：**只有 living 本身问得住 living**。
      // 上面那些不管怎么问都够不着半路上那两种，这一条一句就指定了
      what: '问一句「他现在过的是哪种日子」',
      when: { living: { is: 'farm' } },
      want: ['farm'],
    },
  ]
  for (const one of narrowings) {
    const got = [...livingsUnder([one.when])].sort()
    const want = [...new Set(one.want)].sort()
    if (got.join(' ') === want.join(' ')) continue
    wrong.push(`${one.what}，该放行 [${want.join(' ')}]，实际放行 [${got.join(' ')}]`)
  }

  // 反过来也要钉一下：一种捡来养的日子都没有的话，上面那圈等于空转
  const keeperKinds = new Set(
    CIRCUMSTANCES.flatMap((one) => livingsOfCircumstance(one)).filter(
      (id) => !FROM_ORIGIN.includes(id),
    ),
  )
  if (keeperKinds.size === 0) {
    wrong.push('境况表里一种捡来养的日子都没有，出身和生活这两层分不开')
  }
  console.log(`  捡来养的日子：${[...keeperKinds].sort().join(' ')}`)

  /**
   * 半路上换日子这件事，读者集合得跟着走。
   *
   * 这一条量的是 `readersByNode` 那两张表，而它量的方式是**指着实际的库
   * 问几个具体位置**，不是造一份假数据喂给算法。
   *
   * 底下四节各自挂着（或继承着）一处 living 效果，所以它们的读者
   * 该正好只剩一种。**要是这套东西根本不存在——也就是读者集合只会收窄、
   * 不会替换——这四行会全部继承各自上游那一节的一大把日子，当场红。**
   */
  const readers = readersByNode()
  const switched: readonly { at: string; want: string; why: string }[] = [
    { at: 'royal:fall:edict', want: 'fallen', why: '这一节的 onEnter 就是门第塌了那一下' },
    { at: 'royal:fall:shut', want: 'fallen', why: '把门关上的那个，日子没有再变' },
    { at: 'royal:fall:outside', want: 'market', why: '开门出去的那个，两年后自己过日子' },
    // 搬过去那一节才是削藩这一卷换日子的地方。
    // 它前头还有一节宣旨（`open`），那一节人还跪在王府里——见下面的对照组
    { at: 'royal:demote:home', want: 'fallen', why: '削藩搬出王府，跟削爵是同一种日子' },
  ]
  for (const one of switched) {
    const got = readers.get(one.at)
    if (got === undefined) {
      wrong.push(`${one.at} 一个读者也算不出来，这一节在门禁眼里根本不存在`)
      continue
    }
    const shown = [...got].sort().join('/')
    if (shown === one.want) continue
    wrong.push(`${one.at} 该只剩 ${one.want} 读得到，实际算成 [${shown}]——${one.why}`)
  }

  /**
   * 对照组：变化**上游**那一节不许跟着变。
   *
   * 两卷各出一节，隔得一远一近：
   *
   *     royal:fall:open    → 三节之后才是 edict，那一夜旨意还没下
   *     royal:demote:open  → 紧接着就是 home，中间只隔一条 next
   *
   * 后者是拆节拆出来的，也是这一对里更锋利的那一根：宣旨和搬家
   * 本来就不同步——**旨意念完的那一刻人还跪在王府里**，
   * 而传播要是顺着 `next` 往回漫一格，只有紧邻的这一对量得出来。
   *
   * 没有这一段的话，上面那四行有一种作弊解法能全绿：整卷无脑替换。
   *
   * 两个关键词都不写在这儿：下游换上的是哪种日子，问那一节的 `onEnter`；
   * 上游该是哪种日子，问出身表。手抄一份的话，内容改了判据不会红。
   */
  const upstream: readonly { scene: string; node: string; then: string; origin: OriginId }[] = [
    { scene: 'royal:fall', node: 'open', then: 'edict', origin: 'court' },
    { scene: 'royal:demote', node: 'open', then: 'home', origin: 'manor' },
  ]
  for (const one of upstream) {
    const key = at(one.scene, one.node)
    const becomes = livingSetAt(one.scene, one.then)
    if (becomes === undefined) {
      wrong.push(
        `${at(one.scene, one.then)} 没有一处 living 效果，${key} 这一条对照组量不到任何东西`,
      )
      continue
    }
    const got = readers.get(key)
    if (got === undefined) {
      wrong.push(`${key} 一个读者也算不出来`)
      continue
    }
    const born = livingOfOrigin(one.origin).id
    if (got.has(becomes)) {
      wrong.push(
        `${key} 的读者里混进了 ${becomes}——那是下游 ${one.then} 才换上的日子，变化倒着传到了上游`,
      )
    }
    if (!got.has(born)) {
      wrong.push(`${key} 的读者里没有 ${born}——事情还没发生，${one.origin} 的人反倒读不到自家的卷`)
    }
  }

  /**
   * 半路上那几种日子，每一种都得真有正文是它读的。
   *
   * 这一条守的是另一头：上面那四行盯着「换过日子的人读到了什么」，
   * 这一行盯着「有没有哪一种日子从头到尾没人读」。
   * `content/living.ts` 里躺着一格谁也走不到的日子，跟躺着一个孤儿节点
   * 是同一种债——**它看着像在工作。**
   *
   * 它也是上面那套传播的兜底判据：`afterLiving` 要是整个没生效，
   * `fallen` 和 `market` 的读者数会一起归零，这里当场红。
   */
  const heard = new Set<string>()
  for (const who of readers.values()) for (const one of who) heard.add(one)
  for (const id of MIDLIFE_IDS) {
    if (heard.has(id)) continue
    wrong.push(`半路上那种日子 ${id} 在全库里一节正文也读不到，没有任何一处效果把人送进去`)
  }
  console.log(`  半路上才有的日子：${MIDLIFE_IDS.join(' ') || '（一种也没有）'}`)

  console.log(
    `  换过日子那几节的读者：${switched
      .map((one) => `${one.at}=${[...(readers.get(one.at) ?? [])].sort().join('/') || '无'}`)
      .join('  ')}`,
  )
  console.log(
    `  上游那两节的读者：${upstream
      .map((one) => at(one.scene, one.node))
      .map((key) => `${key}=${[...(readers.get(key) ?? [])].sort().join('/') || '无'}`)
      .join('  ')}`,
  )

  return wrong
}

// ============================================================

console.log('出身门禁：正文里不许无条件假定出身\n')

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、七种人家，同一天', run: sameDay },
  { name: '二、全库对账', run: wholeLibrary },
  { name: '三、尺子自检', run: ruler },
]

let bad = 0
for (const gate of gates) {
  console.log(`${gate.name}`)
  const wrong = gate.run()
  for (const one of wrong) console.log(`  ✗ ${one}`)
  if (wrong.length === 0) console.log('  ✓ 没有发现问题')
  bad += wrong.length
  console.log('')
}

if (bad > 0) {
  console.log(`共 ${bad} 处。`)
  process.exitCode = 1
} else {
  console.log('三道全过。')
}
