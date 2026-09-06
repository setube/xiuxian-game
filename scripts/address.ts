/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一个人管家里人叫什么，取决于他是在哪儿学会说话的。
 *
 * 跑法：`bun scripts/address.ts`
 *
 * ## 这一道守的是什么
 *
 * 这一层落地之前，四种出身的孩子管爹一律叫「爹」——`calls` 是境况表里
 * 写死的一个字符串，而境况跟出身是正交的：境况只管关系网长什么样，
 * 管不着这家是种地的还是坐龙椅的。于是童年那一卷会读到这么一句
 * （这是当时实测跑出来的，不是设想）：
 *
 *     后来母妃带你去给爹问安。
 *
 * 「母妃」是硬写的宫廷词，「爹」是插值出来的寻常人家的词，并排在一句话里。
 * **身份是皇子，台词却像普通农户。**
 *
 * 所以这一道问五件事：
 *
 *     ① 他怎么称呼别人，跟着他在哪儿学会说话走
 *     ② 别人怎么称呼他，跟着身份走
 *     ③ 削爵那一天，两个方向朝相反的方向脱节
 *     ④ 这一层在正文里读得到，不是只活在函数里
 *     ⑤ 同一个人，隔一道门换一个称呼
 *
 * 第三条是这支脚本的分量所在。前两条各自证明一个方向能动，
 * 可「能动」证不出它们是两件事——**一起动的两个格子是同一个格子。**
 * 分辨得出来的只有那一天：旨意下来，街上没有人再叫他殿下了，
 * 而他开口叫的还是「娘娘」。一格说变就变，一格纹丝不动。
 *
 * 第五条问的是**场合**那一维。《礼部志稿》卷十六：亲王入朝，
 * 在朝廷则行君臣礼，至便殿则叙家人礼——**身份上的君臣和家庭里的亲属，
 * 是可以分开的两件事**。史料能证明的到此为止：两套礼并存，同一天，
 * 隔一道门。至于家人礼那一侧出口的到底是哪两个字，没有口语实录，
 * 那是我们为游戏语言做的合理化（见 `content/address.ts` 每格的 `attested`）。
 * 削爵那一卷把这件事摆成了三节：宣旨那一节他爹是「王爷」，
 * 搬家那一节是「父王」，改口之后是「父亲」。
 *
 * ## 判据取实跑，不取静态比对
 *
 * 底下八条人生走的效果和正文**全是从库里原样读出来的**：出生那一卷
 * 落爵位和封号的那两节、`royal:fall` / `royal:demote` 那几节的
 * `onEnter` 和 `effects`、每一节 `blocks` 里的原句，一个字也没有在这支
 * 脚本里重写，连**那一节是在什么场合说的话**也是从 `SceneNode.manner`
 * 读出来的。期望值也一样——「宫里那套话管娘叫什么」从 `REGISTERS` 读，
 * 「亲王的儿子礼上怎么叫爹」从 `RANK_CALLS` 读，不是在这儿抄一遍。
 * 内容表改了字，这支脚本跟着改，不会误报；
 * 而**解析链读错了那一格**，它当场红。
 *
 * ## 第六节是这支脚本的另一半
 *
 * 前五节全绿说明「机制在」，说明不了「判据能分辨」。所以第六节把六种
 * 坏实现摆出来喂给同一把尺子：语言环境接到他现在过的日子上、接到履历
 * 第一段上、敬称不看身份、`kinCall` 自己兜底、场合那一维根本不存在、
 * 爵位那一层不查表见爵位就换词。**六种必须全被拒绝。**
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import {
  ATTESTATIONS,
  HONORIFIC_IDENTITIES,
  RANK_CALLS,
  rankCallFor,
  REGISTERS,
  registerFor,
  titleFor,
} from '../src/content/address'
import { lifeScenes } from '../src/content/life'
import { birthSceneId } from '../src/content/life/birth'
import { ORIGINS } from '../src/content/origins'
import { kinCall } from '../src/engine/address'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Bond, Effect, Gender, Manner, OriginId, SceneNode } from '../src/types/game'

import { beOf } from './origin'

/** 风调雨顺。这一道不查年景，把它按住免得饥荒插进来搅局 */
const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 削爵那一年他十五岁 */
const AGE_AT_START = 15

// ============================================================
// 走一条人生
// ============================================================

/** 库里的一处。**不写内容本身，只写它在库里的门牌号** */
interface Step {
  scene: string
  node: string
  /** 不填就是这一节本身；填了就是这一节某个选择 */
  choice?: string
}

interface Site {
  where: string
  /**
   * 这一节是在什么场合说的话。**从 `SceneNode.manner` 读，不在这儿挑。**
   *
   * 选择那一步跟着它上头那一节走，跟 `engine/story.ts` 里 `choose()`
   * 那一行是同一个道理：按钮上那句话跟它上头的正文是同一个场合说的。
   */
  manner: Manner
  effects: readonly Effect[]
  /** 这一节的正文模板，原样读出来的。选择那一步没有正文 */
  lines: readonly string[]
}

/** 一节里所有带字的正文。分隔线没有字，标题那一格叫 `title` 不叫 `text` */
function linesOf(node: SceneNode): string[] {
  return (node.blocks ?? []).flatMap((block) =>
    'text' in block && typeof block.text === 'string' ? [block.text] : [],
  )
}

function resolve(step: Step): Site | string {
  const scene = lifeScenes[step.scene]
  if (!scene) return `库里没有这一卷：${step.scene}`
  const node = scene.nodes[step.node]
  if (!node) return `${step.scene} 里没有这一节：${step.node}`
  // 没标的就是家常。这一行跟 `engine/interpolate.ts` 的默认值必须是同一档，
  // 否则门禁量的是一套规则，玩家读到的是另一套
  const manner = node.manner ?? '家常'
  if (step.choice === undefined) {
    return {
      where: `${step.scene}#${step.node}`,
      manner,
      effects: node.onEnter ?? [],
      lines: linesOf(node),
    }
  }
  const choice = (node.choices ?? []).find((one) => one.id === step.choice)
  if (!choice) return `${step.scene}#${step.node} 上没有这个选择：${step.choice}`
  return {
    where: `${step.scene}#${step.node}:${step.choice}`,
    manner,
    effects: choice.effects ?? [],
    lines: [],
  }
}

interface Path {
  id: string
  label: string
  origin: OriginId
  gender: Gender
  steps: readonly Step[]
}

/**
 * 八条人生。
 *
 * 前五条分别落在三套话和四种封号上，第六条走削爵那三节（**场合那一维
 * 唯一走得到的地方**），第七条是同一套话的第二个来源（官宦跟王府学的是
 * 同一套，而两家的爵位差着十万八千里——**这一条是「称谓不姓皇室」的证据**），
 * 第八条是对照组。
 *
 * 对照组不能省。一个凡是活着就会变的东西，跟一个不会变的东西，
 * 一样没有分辨力：农户那条人生从头到尾一个字没变，
 * 才说明这一层不是「给所有人换了套词」。
 */
const PATHS: readonly Path[] = [
  {
    id: 'prince',
    label: '皇子：宫墙还没塌',
    origin: 'court',
    gender: '男',
    steps: [
      { scene: 'child:memory', node: 'court' },
      { scene: 'royal:observatory', node: 'inside' },
    ],
  },
  {
    id: 'princess',
    label: '公主：宫墙还没塌',
    origin: 'court',
    gender: '女',
    steps: [{ scene: 'child:memory', node: 'court' }],
  },
  {
    /**
     * 削爵迁出，开门走到街上。
     *
     * 这一条是整支脚本的主角：它一路上要经过封号、旨意、迁居、
     * 上街，而这四件事里只有一件动得了他嘴里那套话——**一件也没有。**
     */
    id: 'fallen',
    label: '削爵迁出，开门走到街上',
    origin: 'court',
    gender: '男',
    steps: [
      { scene: 'royal:fall', node: 'open' },
      { scene: 'royal:fall', node: 'saw' },
      { scene: 'royal:fall', node: 'edict' },
      { scene: 'royal:fall', node: 'edict', choice: 'street' },
      { scene: 'royal:fall', node: 'outside' },
    ],
  },
  {
    id: 'heir',
    label: '世子：王府',
    origin: 'manor',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'palace' }],
  },
  {
    id: 'lady',
    label: '郡主：王府',
    origin: 'manor',
    gender: '女',
    steps: [],
  },
  {
    /**
     * 削藩那三节。**第五节量的就是这一条。**
     *
     * 三节走下来，`{elder}` 指的从头到尾是同一个人，落出来的却该是
     * 三个词：宣旨那一节标着 `manner: '礼上'`，爵位还在——王爷；
     * 搬家那一节是家常，爵位还在——父王；改口那一节爵位换成了
     * 一个表里查不到的「宗室」——父亲。
     *
     * 前两节隔的是**礼**（同一天，隔一道门），后两节隔的才是那道旨意。
     */
    id: 'demoted',
    label: '削藩：宣旨、搬家、改口，同一个人三个称呼',
    origin: 'manor',
    gender: '男',
    steps: [
      { scene: 'royal:demote', node: 'open' },
      { scene: 'royal:demote', node: 'home' },
      { scene: 'royal:demote', node: 'after' },
    ],
  },
  {
    id: 'office',
    label: '官宦人家的孩子：跟王府学的是同一套话',
    origin: 'office',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'official' }],
  },
  {
    id: 'farm',
    label: '对照：农户的孩子，一个字也不该变',
    origin: 'farm',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'farm' }],
  },
]

/** 走到某一处时，他身上跟称谓有关的一切 */
interface Mark {
  where: string
  /** 这一节是在什么场合说的话。从库里读的 */
  manner: Manner
  identity: string
  livingId: string
  /** 别人当面怎么称呼他 */
  title: string
  /** 家常那一档，`{elder}` 落出来是什么 */
  elder: string
  /**
   * 礼上那一档，**同一个** `{elder}` 落出来是什么。
   *
   * 两档都记，是因为这一节要问的不是「他叫什么」而是「隔一道门叫得一样不一样」。
   * 只记这一节实际用的那一档，两档相同和这一节恰好没标礼上就分不开了。
   */
  elderFormal: string
  /** `{dam}` 落出来是什么。家常那一档 */
  dam: string
  /**
   * `{elder}` 此刻指的是不是他生父。
   *
   * `elderCall` 的顺序头一位就是生父（见 `engine/interpolate.ts`），
   * 生父在身边，那个占位符就一定落在他身上；不在身边就落到别人身上了。
   * **落到别人身上的那几处不能拿他爹的爵位去对**——削爵那条人生
   * 从旨意那一夜起就是这样，`{elder}` 说的已经是他娘。
   */
  elderIsFather: boolean
  /**
   * 此刻他爹身上挂着什么爵。**从人口册里读的，不是这儿手写的**。
   *
   * 有了这一格，「这一处他该叫什么」就能从 `RANK_CALLS` + `REGISTERS`
   * 两张表推出来（见 `wantElder`），不必在判据里写「王爷/父王/父亲」。
   * `undefined` 有两种意思：爹不在身边，或者他身上本来就没有爵位——
   * 靠上面那一格分开。
   */
  fatherRank: string | undefined
}

/** 标了礼上的那一节，正文按两档各读一遍。判「标了到底有没有用」 */
interface FormalText {
  where: string
  formal: string
  plain: string
}

/** 走完一条人生之后的快照。跑完 pinia 就没了，判据只能对着快照问 */
interface Walked {
  id: string
  label: string
  origin: OriginId
  gender: Gender
  /** 他学的那套话叫什么。`undefined` = 跟寻常人家没有分别 */
  register: string | undefined
  /**
   * 家里每一种关系，他学着叫什么。**逐格问出来的，用来报覆盖率**。
   *
   * 问的时候不带爵位，所以这一格量的是**纯教养那一层**——
   * 王府那位挂着亲王爵，这里照样答「父亲」，「父王」是盖在上头的另一层。
   * 第一节两条判据分别对着这两层，别混。
   */
  kin: Partial<Record<Bond, string>>
  /**
   * 人际面板上管爹叫什么。跟正文里那个字必须是同一个答案。
   *
   * `undefined` = 走完这一路他爹已经不在身边了，两边找的不是同一个人，
   * 这一格不比（削爵那条人生就是，他爹在那一夜没了）。
   */
  panel: string | undefined
  /** 出生那一卷里到底有没有封号那一节。**别在判据里手写「官宦除外」** */
  titledAtBirth: boolean
  /** 履历第一段。第六节拿它当坏实现的证据，得跟人生一起存下来 */
  firstLiving: string | undefined
  /** 每走一处留一个记号，头一个是还没走的时候 */
  marks: readonly Mark[]
  /** 爵位那张表上，这一路真的查中过哪几格。报覆盖率用 */
  rankCells: readonly string[]
  /** 标了礼上的那几节各自的两档读法 */
  formalTexts: readonly FormalText[]
  /** 这一路读到的正文，按各自那一节的场合插值之后 */
  lines: readonly string[]
  /** 走过的门牌号，报覆盖率用 */
  wheres: readonly string[]
}

/** 爵位那张表上一格的门牌号。**表改了这儿跟着改，别在判据里拼字符串** */
function cellOf(one: { rank: string; bond: Bond; manner: Manner }): string {
  return `${one.rank}·${one.bond}·${one.manner}`
}

/** 这一节里读者真正读到的那个词。场合是节点上标的，不是这儿挑的 */
function spoken(at: Mark): string {
  return at.manner === '礼上' ? at.elderFormal : at.elder
}

/** `REGISTERS` 里一共出现过哪几种关系。**别在这儿另抄一张表** */
const KIN_BONDS: readonly Bond[] = [
  ...new Set(REGISTERS.flatMap((one) => Object.keys(one.kin))),
] as Bond[]

/**
 * 掷到一个爹娘都还在身边、又没被人捡去养的孩子，然后把世界摆到削爵那一年。
 *
 * ## 两个条件都是必须的
 *
 * 收养那一级会盖掉家里的营生（`scripts/living.ts` 头一版栽在这上头，
 * 农户那条对照有时候解析成 temple，门禁随机变红）。
 *
 * 而「爹娘都在身边」这一条更直接——**这一支量的就是他管爹娘叫什么。**
 * 头一版只问了「关系网上有没有这条边」，于是掷到了「生母难产而亡」
 * 那种境况：边在（世界永远记着她是他生母），人不在。`damCall` 一路
 * 落到生父身上，第三节读出来的是「他管娘叫『爹』」——
 * **量到的是别的东西，而它看上去像这一层坏了。**
 *
 * 要问的是 `isNearby` 不是「还活着」：削爵那一卷的 `takes` 只带走
 * 名单上的人，留在京城的那些边一条没断，可他们不在这个院子里。
 *
 * 性别按人生指定，不听天由命：四种封号里有两种是女孩的，
 * 掷出来的话覆盖率每跑一次都不一样。
 */
function born(id: OriginId, gender: Gender): boolean {
  for (let tries = 0; tries < 6000; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    beOf(id)
    household.gender = gender
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.bornYear = world.time.year - AGE_AT_START
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }

    const adopted = people.guardians
      .filter((id) => people.isAlive(id))
      .some((id) => people.personOf(id)?.living !== undefined)
    if (adopted) continue
    if (!people.kinOf('生父').some(isNearby)) continue
    if (!people.kinOf('生母').some(isNearby)) continue
    return true
  }
  return false
}

/**
 * 出生那一卷里要走的那几节。
 *
 * 两节，各落一张表：
 *
 * - `open`——**他爹身上那个爵位在这一节落定**。这是生下来就有的事实，
 *   `birth.ts` 把它发在第一句话之前，正因为取名那一段里王府那一节
 *   已经有一句「{elder}看了一眼那道文书」在等着它。
 * - `titled-男/女`——他自己那个封号。
 *
 * 两节的门牌号都不写死内容：封的是什么号、爹挂的是什么爵，
 * 都由 `birth.ts` 那两张表说了算，这里只按性别指出去哪儿。
 * 生在寻常人家的那几条，库里根本没有封号那一节，只走开场。
 *
 * `titled` 单独返回而不是从步数推：**「有没有封号那一节」是第二节的判据**，
 * 它得跟「走了几步」分开，否则加一节开场就把那条判据搅了。
 */
function birthSteps(path: Path): { steps: Step[]; titled: boolean } {
  const scene = birthSceneId(path.origin)
  const nodes = lifeScenes[scene]?.nodes
  const node = path.gender === '女' ? 'titled-female' : 'titled-male'
  const titled = nodes?.[node] !== undefined
  const steps: Step[] = nodes?.open ? [{ scene, node: 'open' }] : []
  if (titled) steps.push({ scene, node })
  return { steps, titled }
}

function walk(path: Path): Walked | string {
  if (!born(path.origin, path.gender)) {
    return '掷了六千回也没掷出一个爹娘俱在、又没被人捡去养的孩子，判据本身失效了'
  }
  const character = useCharacterStore()
  const people = usePeopleStore()

  /**
   * 他爹，如果此刻还在这个院子里。
   *
   * 问的是 `isNearby` 不是「还活着」：削爵那一卷的 `takes` 只带走名单上的人，
   * 留在京城的那些边一条没断，可他们不在这个院子里。
   *
   * `{elder}` 落在谁身上跟这一行是同一个判断——`elderCall` 的顺序头一位
   * 就是生父（见 `engine/interpolate.ts`），所以这个人在，那个占位符就是他。
   */
  const nearbyFather = (): string | undefined => people.kinOf('生父').find(isNearby)

  const mark = (where: string, manner: Manner): Mark => {
    const father = nearbyFather()
    return {
      where,
      manner,
      identity: character.identity,
      livingId: character.living.id,
      title: fillString('{title}'),
      elder: fillString('{elder}', '家常'),
      elderFormal: fillString('{elder}', '礼上'),
      dam: fillString('{dam}', '家常'),
      elderIsFather: father !== undefined,
      fatherRank: father === undefined ? undefined : people.personOf(father)?.rank,
    }
  }

  /**
   * 爵位那张表此刻被查中了哪几格。
   *
   * 问的不是「表里有这一格」——那是恒真的。问的是**此刻这个院子里
   * 真的站着一个挂着这个爵位、又是这层关系的人**，而解析链从他身上
   * 答出来的正是表里那个词。没有人挂这个爵位，这一格就没人量过。
   */
  const rankCells = new Set<string>()
  const noteRanks = (): void => {
    for (const cell of RANK_CALLS) {
      const id = people.kinOf(cell.bond).find(isNearby)
      if (id === undefined || people.personOf(id)?.rank !== cell.rank) continue
      if (kinCall(cell.bond, cell.rank, cell.manner) === cell.word) rankCells.add(cellOf(cell))
    }
  }

  const { steps: birth, titled } = birthSteps(path)
  const marks: Mark[] = [mark('出生', '家常')]
  const formalTexts: FormalText[] = []
  const lines: string[] = []
  const wheres: string[] = []
  noteRanks()
  for (const step of [...birth, ...path.steps]) {
    const site = resolve(step)
    if (typeof site === 'string') return site
    applyEffects(site.effects)
    // 场合跟着这一节走，跟 `engine/story.ts` 落笔时是同一档。
    // 在这儿写死家常的话，宣旨那一节量到的是玩家读不到的另一句话
    for (const line of site.lines) lines.push(fillString(line, site.manner))
    if (site.manner === '礼上') {
      for (const line of site.lines) {
        formalTexts.push({
          where: site.where,
          formal: fillString(line, '礼上'),
          plain: fillString(line, '家常'),
        })
      }
    }
    wheres.push(site.where)
    noteRanks()
    marks.push(mark(site.where, site.manner))
  }

  /**
   * 面板问的必须是**同一个人**，否则两边差的是「谁」不是「怎么叫」。
   *
   * 拿他此刻还在身边的生父，跟 `{elder}` 找的是同一个人（见 `nearbyFather`）。
   * 不在身边的那一路不比——那时候 `{elder}` 找的已经是另一个人了。
   *
   * 头一版这里硬写了 `callOf('father')`。id 确实恒是这个字，
   * 可爹在他出生前就没了的那些境况里，这个人根本没进相识册，
   * `callOf` 老实答「一个陌生人」，而 `{elder}` 顺着顺序落到了娘身上。
   * 判据于是报「面板管爹叫『一个陌生人』，正文里却是『娘』」——
   * **两句话说的是两个人，这条判据当时什么也没量。**
   */
  const father = nearbyFather()

  return {
    id: path.id,
    label: path.label,
    origin: path.origin,
    gender: path.gender,
    register: registerFor(path.origin)?.id,
    kin: Object.fromEntries(
      KIN_BONDS.map((bond) => [bond, kinCall(bond)]).filter(([, word]) => word !== undefined),
    ),
    panel: father === undefined ? undefined : people.callOf(father),
    titledAtBirth: titled,
    firstLiving: character.livings[0]?.id,
    marks,
    rankCells: [...rankCells],
    formalTexts,
    lines,
    wheres,
  }
}

/**
 * 这条路上剧本自己有没有写死他爹。写了的（削爵那一卷「大行皇帝」），
 * 爹不在是内容，不是意外。
 */
function pathKillsFather(path: Path): boolean {
  return path.steps.some((step) => {
    const site = resolve(step)
    return (
      typeof site !== 'string' &&
      site.effects.some((one) => one.type === 'family' && one.id === 'father' && one.alive === false)
    )
  })
}

/**
 * 走到够数为止。
 *
 * 剧本里有跳年（出生那卷醒来跳三年，削爵那卷前后一年），跳年会掷骰子让人殁——
 * 娘在那三年里没了，`{dam}` 就落回「家里的大人」，判据于是报「搬一次家就改了口音」。
 * 那不是称谓层的错，是这一世的判据前提没了：判据问的是「同一个人三个称呼」，
 * 人都不在了就没有可问的。所以这一世作废，重掷，掷到爹娘都走完为止。
 * 种子 hunt-211 抓到的正是这一种（`bun scripts/replay.ts` 那一支立的规矩）。
 */
function walkAlive(path: Path): Walked | string {
  const killsFather = pathKillsFather(path)
  let last: Walked | string = '一回也没走'
  for (let tries = 0; tries < 200; tries += 1) {
    last = walk(path)
    if (typeof last === 'string') return last
    const people = usePeopleStore()
    const motherAlive = people.kinOf('生母').some((id) => people.isAlive(id))
    const fatherAlive = people.kinOf('生父').some((id) => people.isAlive(id))
    if (motherAlive && (fatherAlive || killsFather)) return last
  }
  return `掷了两百回，回回都有人在路上殁了——${typeof last === 'string' ? last : '判据前提立不住'}`
}

const walked = new Map<string, Walked>()
const broken: string[] = []
for (const path of PATHS) {
  const one = walkAlive(path)
  if (typeof one === 'string') broken.push(`${path.label}：${one}`)
  else walked.set(path.id, one)
}

function of(id: string): Walked | undefined {
  return walked.get(id)
}

/** 一条人生走完之后的样子 */
function last(one: Walked): Mark {
  return one.marks[one.marks.length - 1]!
}

/** 这一路上的某一处。走没走到由调用方判 */
function markAt(one: Walked, where: string): Mark | undefined {
  return one.marks.find((at) => at.where === where)
}

/**
 * 这一处，他管爹**该**叫什么——从两张内容表推出来的，一个字没手写。
 *
 * 规则跟 `engine/address.ts` 里的 `kinCall` 是同一条：爵位那张表先查，
 * 查不到落回教养那一层。但两边走的是不同的路——那边从 store 里拿出身和爵位，
 * 这边拿的是这条人生**指定**的出身和记号上存的爵位。
 * 于是解析链哪一环读错了格子（读成他此刻过的日子、读错了场合、
 * 见爵位就换词不查表），这个期望值都还是对的，而它落出来的那个字不对。
 *
 * 返回 `undefined` = 寻常人家，这一层根本没有他的份，那个字来自境况表。
 */
function wantElder(one: Walked, at: Mark): string | undefined {
  const byRank =
    at.fatherRank === undefined ? undefined : rankCallFor(at.fatherRank, '生父', at.manner)
  return byRank ?? registerFor(one.origin)?.kin.生父
}

// ============================================================
// 一、他怎么称呼别人，跟着他在哪儿学会说话走
// ============================================================

/**
 * 每一格都得对得上那张表，一格也不许兜底。
 *
 * 这不是恒等式：两边确实都从 `REGISTERS` 读，可**左边那个是解析链
 * 一路走下来的结果**——`registerNow()` 读错了出身那一格，或者读的是他此刻
 * 过的日子，左边就落到另一套话上，或者干脆是空的。
 * 削爵那条人生把这件事顶到明面上：它此刻过的是 `market` 的日子。
 */
function learntTalk(): string[] {
  const wrong: string[] = [...broken]

  for (const one of walked.values()) {
    const register = registerFor(one.origin)
    if (register === undefined) {
      for (const [bond, word] of Object.entries(one.kin)) {
        wrong.push(`${one.label}：寻常人家不该有专门的一套话，${bond} 却学成了「${word}」`)
      }
      continue
    }
    if (one.register !== register.id) {
      wrong.push(`${one.label}：该学的是「${register.learntIn}」那套话，实际是 ${one.register}`)
    }
    for (const bond of KIN_BONDS) {
      const want = register.kin[bond]
      const got = one.kin[bond]
      if (want !== got) {
        wrong.push(
          `${one.label}：${bond} 在「${register.learntIn}」那套话里叫「${want}」，` +
            `实际落成「${got ?? '（没学过，回落到境况表）'}」`,
        )
      }
    }
  }

  // 三套话两两不同。少了这一条，三张一模一样的表也能让上面全绿
  const three = [of('prince'), of('office'), of('farm')]
  const dams = three.map((one) => (one ? last(one).dam : '—'))
  if (new Set(dams).size !== three.filter((one) => one !== undefined).length) {
    wrong.push(`宫里、读书人家、寻常人家管娘叫的是同一个字：${dams.join(' / ')}`)
  }

  /**
   * 官宦跟王府学的是同一套。这一条是反着的：不姓皇室的证据。
   *
   * 比的是**教养那一层**（`kin`，不带爵位查出来的），不是嘴上那个字——
   * 王府那位娘挂着王妃的封号，嘴上落出来的是「母妃」，官宦家的是「母亲」。
   * 那两个字不同，恰恰是因为爵位那张表盖在了教养上头，跟教养本身无关。
   *
   * 头一版这里比的就是嘴上那个字（`last(one).dam`）。爵位那一层落地当天
   * 它就红了，而它报的是「王府和官宦学的不是同一套话」——**结论是反的**：
   * 两家学的仍旧是同一套，变的是上头盖了一层。
   */
  const heir = of('heir')
  const office = of('office')
  if (heir && office) {
    for (const bond of KIN_BONDS) {
      if (heir.kin[bond] === office.kin[bond]) continue
      wrong.push(
        `王府和官宦该是同一套话（称谓的差别来自语言环境，不来自爵位），` +
          `${bond} 却学成了「${heir.kin[bond] ?? '（没学过）'}」/「${office.kin[bond] ?? '（没学过）'}」`,
      )
    }
    /**
     * 反过来：嘴上那个字必须不同，否则爵位那一层等于没盖上来。
     *
     * 上面那一条是「底下这层一样」，这一条是「上头那层不一样」。
     * 只留上面那条的话，把 `RANK_CALLS` 整张表删掉，第一节照样全绿。
     */
    if (last(heir).dam === last(office).dam) {
      wrong.push(
        `王府和官宦嘴上管娘叫的是同一个字（${last(heir).dam}）——` +
          '爵位那一层没有盖上来，王妃的儿子跟主事的儿子说的是一样的话',
      )
    }
  }

  // 面板上那个字和正文里那个字得是同一个答案，否则人际面板会自成一套。
  // 爹已经不在身边的那几路不比——`panel` 为空说的就是这件事
  for (const one of walked.values()) {
    if (one.panel === undefined) continue
    if (one.panel !== last(one).elder) {
      wrong.push(`${one.label}：面板上管爹叫「${one.panel}」，正文里却是「${last(one).elder}」`)
    }
  }

  for (const one of walked.values()) {
    const kin = KIN_BONDS.map((bond) => `${bond}→${one.kin[bond] ?? '（寻常）'}`).join('　')
    console.log(`  【${one.label}】${one.register ?? '寻常人家那套'}　${kin}`)
  }
  return wrong
}

// ============================================================
// 二、别人怎么称呼他，跟着身份走
// ============================================================

/** 这个身份有没有带封号的敬称 */
function honorific(identity: string): boolean {
  return HONORIFIC_IDENTITIES.includes(identity)
}

function calledBy(): string[] {
  const wrong: string[] = []

  for (const one of walked.values()) {
    for (const at of one.marks) {
      const want = titleFor(at.identity, one.gender)
      if (at.title !== want) {
        wrong.push(
          `${one.label} 走到 ${at.where}：{title} 该落成「${want}」，实际是「${at.title}」`,
        )
      }
      // 敬称和寻常称呼必须是两个字眼。同一个字的话这一节量不出东西
      if (honorific(at.identity) && at.title === titleFor('', one.gender)) {
        wrong.push(`${one.label}：${at.identity} 的敬称跟没有封号的人一样，都是「${at.title}」`)
      }
    }
  }

  /**
   * 封的是什么号由内容说了算，这里只问它真的被封上了。
   *
   * 「哪几种人家生下来有封号」也从库里读——出生那一卷里到底有没有
   * 那一节（见 `titling`）。头一版在这儿手写了「官宦除外」，
   * 那等于把 `birth.ts` 的 `TITLES` 表在门禁里抄了第二份：
   * 哪天给某一种人家添了封号，这一行不会红，它只会继续豁免。
   */
  for (const one of walked.values()) {
    const titled = one.marks.filter((at) => honorific(at.identity))
    const atBirth = one.marks[0]!
    if (one.titledAtBirth && titled.length === 0) {
      wrong.push(`${one.label}：出生那一卷里有封号那一节，走完却一处也没封上`)
    }
    if (!one.titledAtBirth && titled.length > 0) {
      wrong.push(
        `${one.label}：出生那一卷里没有封号那一节，走完却带上了敬称（${titled[0]!.identity}）`,
      )
    }
    if (titled.length > 0 && honorific(atBirth.identity)) {
      wrong.push(`${one.label}：还没走到封号那一节就已经有了敬称——那不是内容给的`)
    }
  }

  for (const one of walked.values()) {
    const path = one.marks.map((at) => `${at.identity}→${at.title}`).join('　')
    console.log(`  【${one.label}】${path}`)
  }
  return wrong
}

// ============================================================
// 三、削爵那一天，两个方向朝相反的方向脱节
// ============================================================

/**
 * 这一节是整支脚本的分量所在。
 *
 * 前两节各自证明一个方向能动，可「能动」证不出它们是两件事——
 * **一起动的两个格子是同一个格子。** 分辨得出来的只有削爵那一天：
 *
 *     别人怎么称呼他　殿下 → 公子　（旨意当天就改了）
 *     他怎么称呼别人　娘娘 → 娘娘　（一个字没动）
 *     他过的什么日子　palace → market
 *
 * 三行里任意一行塌了这一节就红：第一行不动说明敬称没跟着身份走，
 * 第二行动了说明那套话被日子牵着改了，第三行不动说明这条人生
 * 根本没走到该走的地方，前两行的结论也就不作数。
 *
 * 只比 `{dam}` 不比 `{elder}`：他爹在那一夜没了，`{elder}` 落到谁
 * 是「家里还有没有这个人」的事，跟「管他叫什么」不是一回事。
 */
function twoWays(): string[] {
  const wrong: string[] = []
  const one = of('fallen')
  if (!one) return ['削爵那条人生没走成，这一节量不了']

  const before = [...one.marks].reverse().find((at) => honorific(at.identity))
  const after = last(one)
  if (!before) return ['削爵那条人生一处也没封上号，脱节无从谈起']

  if (before.title === after.title) {
    wrong.push(`旨意下来前后别人都叫他「${after.title}」——敬称没有跟着身份走`)
  }
  if (honorific(after.identity)) {
    wrong.push(`走完这条人生他还带着封号（${after.identity}），那道旨意没有落到身上`)
  }
  if (before.dam !== after.dam) {
    wrong.push(
      `他管娘叫的字从「${before.dam}」变成了「${after.dam}」——` +
        '搬一次家就改了口音，那套话是跟着日子走的，不是跟着教养走的',
    )
  }
  if (before.livingId === after.livingId) {
    wrong.push(
      `迁出京城前后过的是同一种日子（${after.livingId}）——` +
        '这条人生没走到该走的地方，上面两条的结论不作数',
    )
  }

  const palace = of('prince')
  if (palace && last(palace).dam !== after.dam) {
    wrong.push(
      `宫墙没塌的那个管娘叫「${last(palace).dam}」，迁出京城的这个叫「${after.dam}」——` +
        '同样在宫里长大的两个人，学的该是同一套话',
    )
  }

  console.log(`  ${before.where} → ${after.where}`)
  console.log(
    `    别人怎么称呼他　${before.title} → ${after.title}　（${before.identity} → ${after.identity}）`,
  )
  console.log(`    他怎么称呼别人　${before.dam} → ${after.dam}`)
  console.log(`    他过的什么日子　${before.livingId} → ${after.livingId}`)
  return wrong
}

// ============================================================
// 四、这一层在正文里读得到
// ============================================================

/**
 * 全库有几处正文硬写着宫里那套话的字。
 *
 * ## 只扫宫里那一套，而且只扫生父生母那两格
 *
 * 「哥哥」「姐姐」不扫：寻常人家的正文里它们本来就正当地出现
 * （`child:sibling` 那句「往后你是当哥哥（姐姐）的了」）。
 *
 * **「父亲」「母亲」更不能扫**，虽然它们确实是读书人家那套话里的字。
 * 那两个词同时还是通用的书面叙述词——「满月那天，父亲抱着你走了二里地」
 * 是叙述者在讲这件事，不是主角开口叫人。头一版把整张 `REGISTERS`
 * 拉平了扫，当场喂出四十来条误报，全库每一卷都在里头。
 * **一支每次都红四十条的门禁，等于没有门禁。**
 *
 * 「爹爹」「娘娘」不一样：这两个字只可能是当面的称呼。
 * 硬写在正文里就是绕过了这一层，而且会出现在每一个农户孩子的屏幕上。
 *
 * 静态正文里那些**别的**穿帮词（「内侍」「宫门」）归
 * `scripts/upbringing.ts` 那张词典管——那是它的活。这一支管的是
 * 词典看不见的另一半：**称谓是插值出来的，静态扫描扫不到落笔后的字。**
 *
 * ## 爵位那张表只扫家常那一档
 *
 * 「父王」「母妃」跟「爹爹」「娘娘」一样，只可能是当面的称呼，
 * 硬写在正文里就绕过了这一层。削爵那一卷是这条禁令的理由本身：
 * 在 `royal:demote#home` 里把「父王」两个字写死，`after` 那一节
 * 就永远改不了口，**而那正是这一卷存在的全部意义。**
 *
 * 礼上那一档的「王爷」**不扫**，它同时是个第三人称的身份名词——
 * `royal:demote#home` 那句「街坊都知道搬来了个从前的王爷」是街坊在议论他，
 * 不是他在叫人。扫了就是误报，而每次都误报的门禁等于没有门禁。
 */
const HARDCODED: readonly string[] = [
  ...new Set([
    ...[registerFor('court')?.kin.生父, registerFor('court')?.kin.生母].filter(
      (word): word is string => word !== undefined,
    ),
    ...RANK_CALLS.filter((one) => one.manner === '家常').map((one) => one.word),
  ]),
]

function inText(): string[] {
  const wrong: string[] = []

  const palace = registerFor('court')
  if (!palace) return ['库里没有宫里那套话，这一节量不了']
  const damWord = palace.kin.生母
  if (damWord === undefined) return ['宫里那套话里没写管娘叫什么，这一节量不了']

  // 削爵之后那一节的正文里，他嘴里那个字必须还是宫里那个
  const fallen = of('fallen')
  const after = fallen ? last(fallen) : undefined
  const heard = fallen?.lines.filter((line) => line.includes(damWord)) ?? []
  if (fallen && heard.length === 0) {
    wrong.push(
      `削爵那条人生一路读下来，没有一句正文让读者看见他管娘叫「${damWord}」——` +
        '这一层于是只活在函数里，读者一个字也读不到',
    )
  }
  if (after && honorific(after.identity)) {
    wrong.push('那句话是在他还带着封号的时候读到的——那就看不出「别人改了口，他没改」')
  }

  // 对照：农户那条人生的正文里，一个宫里的字也不该有
  const farm = of('farm')
  const slipped = farm?.lines.filter((line) => line.includes(damWord)) ?? []
  for (const line of slipped) {
    wrong.push(`农户的孩子读到了宫里那套话：「${line}」`)
  }

  /**
   * 谁也不许绕过这一层直接把字写死在正文里。
   *
   * 这一条防的是以后：今天全库干净，明天有人写下一句「你去问问爹爹」，
   * 那句话就会出现在每一个农户孩子的屏幕上。
   */
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      for (const line of linesOf(node)) {
        for (const word of HARDCODED) {
          if (line.includes(word)) {
            wrong.push(
              `${sceneId}#${nodeId} 把「${word}」硬写在正文里：「${line}」——` +
                '这个字该由 {elder} / {dam} 落出来，写死了就绕过了这一层',
            )
          }
        }
      }
    }
  }

  for (const one of walked.values()) {
    const sample = one.lines.find((line) => line.includes(one.kin.生母 ?? '\u0000'))
    console.log(`  【${one.label}】${sample ?? '（这一路没有一句提到娘）'}`)
  }
  for (const line of heard) console.log(`  削爵之后仍旧：${line}`)
  return wrong
}

// ============================================================
// 五、同一个人，隔一道门换一个称呼
// ============================================================

/**
 * 《礼部志稿》卷十六：亲王入朝，在朝廷则行君臣礼，至便殿则叙家人礼。
 *
 * 同一天，同两个人，隔一道门两套礼——**身份上的君臣和家庭里的亲属
 * 本来就是可以分开的两件事**。史料能证明的到此为止：两套礼并存。
 * 至于家人礼那一侧他到底出口叫哪两个字，没有口语实录，那两个字是
 * 我们为游戏语言定的（见 `content/address.ts` 每一格的 `attested`）。
 *
 * 所以这一节量的是**规则**，不是那两个字：
 *
 *     有爵位可依据的时候，两档必须分岔
 *     爵位查不到的时候，两档必须重新合并
 *
 * 削爵那一卷把这件事摆成了三节，三节里 `{elder}` 指的是同一个人：
 *
 *     royal:demote#open   礼上 · 亲王 　王爷
 *     royal:demote#home   家常 · 亲王 　父王
 *     royal:demote#after  家常 · 宗室 　父亲
 *
 * 前两节隔的是礼（同一天，隔一道门），后两节隔的才是那道旨意。
 * 上面那三个词一个也没写进判据里——它们是从 `RANK_CALLS` 和 `REGISTERS`
 * 推出来的（见 `wantElder`），表改了字这一节跟着改，不会误报。
 */

/**
 * 标了礼上的那几节，正文按两档读出来一不一样。**走到了才有得比。**
 *
 * 第五节拿它问「那个标注到底有没有用」，第六节拿它报覆盖率。
 * 一处有好几句，只要有一句两档不同就算这个标注起了作用——
 * 一节里本来就不是每句话都提到人。
 */
const formalEffect = new Map<string, boolean>()
for (const one of walked.values()) {
  for (const at of one.formalTexts) {
    formalEffect.set(at.where, (formalEffect.get(at.where) ?? false) || at.formal !== at.plain)
  }
}

/** 削爵那三节的门牌号。顺序就是走的顺序 */
const DEMOTE_STEPS = ['royal:demote#open', 'royal:demote#home', 'royal:demote#after'] as const

function byManner(): string[] {
  const wrong: string[] = []

  /**
   * 头一条，也是最要紧的一条：每一处落出来的字，得是那两张表推出来的那个。
   *
   * 全部八条人生的每一处都过一遍，不只是削爵那三节——一条规则只在
   * 一卷内容上成立，那是那一卷写对了，不是规则立住了。
   *
   * 爹不在身边的那几处跳过：`{elder}` 那时候找的是另一个人，
   * 拿他爹的爵位去对，量的是「家里还有没有这个人」，不是「管他叫什么」。
   */
  for (const one of walked.values()) {
    for (const at of one.marks) {
      if (!at.elderIsFather) continue
      const want = wantElder(one, at)
      if (want === undefined) continue
      if (spoken(at) !== want) {
        wrong.push(
          `${one.label} 走到 ${at.where}（${at.manner}・${at.fatherRank ?? '无爵'}）：` +
            `他管爹该叫「${want}」，实际落成「${spoken(at)}」`,
        )
      }
    }
  }

  const one = of('demoted')
  if (!one) return [...wrong, '削藩那条人生没走成，场合这一维没有别处可量']

  const marks = DEMOTE_STEPS.map((where) => markAt(one, where))
  const missed = DEMOTE_STEPS.filter((_, i) => marks[i] === undefined)
  if (missed.length > 0) return [...wrong, `削藩这几节没走到：${missed.join('、')}`]
  const [ritual, moved, renamed] = marks as [Mark, Mark, Mark]

  // 三节三个词。这一条是这一节的骨头：少了它，三节落成同一个字也能全绿
  const words = [ritual, moved, renamed].map(spoken)
  if (new Set(words).size !== words.length) {
    wrong.push(
      `削藩三节里他管爹叫的是「${words.join('」「')}」——` +
        '三节该是三个词：宣旨那一节在行礼，搬家那一节在家里，改口之后爵位没了',
    )
  }

  /**
   * 有爵位的时候两档分岔，没爵位的时候两档合并。
   *
   * 这两条是一对，缺一条都不成立：只有前一条，一个「凡是礼上就换个词」
   * 的实现照样过；只有后一条，一个「场合根本不存在」的实现照样过。
   */
  if (ritual.elder === ritual.elderFormal) {
    wrong.push(
      `宣旨那一节他爹还挂着${ritual.fatherRank ?? '（没有爵位）'}，` +
        `两档却落出同一个字（${ritual.elder}）——场合这一维没有起作用`,
    )
  }
  if (renamed.elder !== renamed.elderFormal) {
    wrong.push(
      `改口那一节他爹的爵位换成了表里查不到的「${renamed.fatherRank ?? '（没有爵位）'}」，` +
        `两档却还分着（${renamed.elder}／${renamed.elderFormal}）——` +
        '爵位没了，那道门也就不该再隔出两个词来',
    )
  }

  /**
   * 爵位表里查不到的人，隔一道门也是同一个字。
   *
   * 宫里那位爹身上确确实实写着「皇帝」（`birth.ts` 发的），
   * 而 `RANK_CALLS` 里没有这一格——于是他儿子在朝上朝下都叫「爹爹」。
   * 这一条守着 `royal:fall#outside` 那句「那两个字你从会说话起就这么叫」：
   * 一个「见爵位就换词」的实现会当场把那句话说的事情弄假。
   */
  for (const id of ['prince', 'farm']) {
    const path = of(id)
    if (!path) continue
    const at = last(path)
    if (!at.elderIsFather) continue
    if (at.elder !== at.elderFormal) {
      wrong.push(
        `${path.label}：他爹身上是「${at.fatherRank ?? '（没有爵位）'}」，爵位表里查不到，` +
          `隔一道门却换了字（${at.elder}／${at.elderFormal}）`,
      )
    }
  }

  // 标了礼上的那一节，正文按两档读出来必须不同，否则那个标注是装饰
  for (const [where, worked] of formalEffect) {
    if (!worked) {
      wrong.push(`${where} 标了 manner: '礼上'，可正文按两档读出来一模一样——那个标注是装饰`)
    }
  }

  for (const at of [ritual, moved, renamed]) {
    console.log(
      `  ${at.where}　${at.manner}・${at.fatherRank ?? '无爵'}　→　${spoken(at)}` +
        `　（家常 ${at.elder}／礼上 ${at.elderFormal}）`,
    )
  }
  return wrong
}

// ============================================================
// 六、尺子自检
// ============================================================

/** 全库有几处正文用了 `{title}`。**门禁自己数，别在这儿抄一张单子** */
function titleSites(): string[] {
  const found: string[] = []
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      if (linesOf(node).some((line) => line.includes('{title}'))) found.push(`${sceneId}#${nodeId}`)
    }
  }
  return found
}

/** 全库有几节标了礼上。**门禁自己扫，别在这儿抄一张单子** */
function formalSites(): string[] {
  const found: string[] = []
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      if (node.manner === '礼上') found.push(`${sceneId}#${nodeId}`)
    }
  }
  return found
}

/**
 * 一条出处至少要写这么多字。
 *
 * 这个数不是量出来的，是定的——它守的是一条纪律：**「明代」两个字不算出处，
 * 「《礼部志稿》卷十六：亲王入朝，在朝廷则君臣礼，至便殿则叙家人礼」才算。**
 * 合理化那一级同理，得写清楚为什么这么定、它软在哪儿。
 *
 * 一句话说不清一个词是从哪儿来的，这一层就退回成「作者的临时感觉」，
 * 而分史料／合理化两级的全部意义正是不让它退回去。
 */
const MIN_ATTESTATION = 20

function ruler(): string[] {
  const wrong: string[] = []
  const fallen = of('fallen')
  const after = fallen ? last(fallen) : undefined

  // —— 坏实现一：语言环境接到他现在过的日子上 ——
  if (after) {
    const bad = registerFor(after.livingId as OriginId)
    if (bad?.id === fallen?.register) {
      wrong.push(
        `拿他此刻过的日子（${after.livingId}）去查那套话，查出来跟出身查的是同一套——` +
          '这一世分辨不出解析链读的是哪一格，第三节的结论失效',
      )
    } else {
      console.log(
        `  ✓ 接到「他现在过的日子」上会落空：${after.livingId} → ` +
          `${bad?.learntIn ?? '（没有专门的一套话，于是回落到「娘」）'}`,
      )
    }
  }

  // —— 坏实现二：语言环境接到履历第一段上 ——
  if (fallen) {
    const first = fallen.firstLiving
    if (first === 'palace') {
      wrong.push('履历第一段恰好是 palace，这条坏实现在这一世混得过去，尺子分辨不出')
    } else {
      console.log(
        `  ✓ 接到「履历第一段」上会读到 ${first ?? '（空的）'}——` +
          '`liveAs` 只在换日子那一刻记一笔，出生那一段根本不在里头',
      )
    }
  }

  // —— 坏实现三：敬称不看身份 ——
  const prince = of('prince')
  if (prince && after) {
    const titled = prince.marks.find((at) => honorific(at.identity))
    if (titled && titled.title === after.title) {
      wrong.push(`有封号和没封号的人被叫的是同一个字（${after.title}），第二节量不出东西`)
    } else if (titled) {
      console.log(
        `  ✓ 敬称认得出身份：${titled.identity}→${titled.title}　${after.identity}→${after.title}`,
      )
    }
  }

  // —— 坏实现四：`kinCall` 自己兜底 ——
  const farm = of('farm')
  if (farm) {
    if (Object.keys(farm.kin).length > 0) {
      wrong.push('寻常人家也查出了一套专门的话——`kinCall` 在自己里头兜了底，第一节量不出东西')
    } else {
      console.log('  ✓ `kinCall` 不兜底：寻常人家逐格问下来全是空的，回落交给调用方')
    }
  }

  /**
   * —— 坏实现五：场合那一维根本不存在，全库一律按家常解 ——
   *
   * 这一条问的不是「第五节会不会红」——那条判据本来就是问分岔的。
   * 问的是**它有没有立足点**：这一世真的走到了一个爵位表里查得到、
   * 又标着礼上的格子。一格也没走到的话，第五节那条判据是在空气里跑，
   * 把 `Manner` 整个删掉它照样全绿。
   */
  const demoted = of('demoted')
  const formalCells = RANK_CALLS.filter((one) => one.manner === '礼上').map(cellOf)
  const reached = formalCells.filter((cell) => demoted?.rankCells.includes(cell))
  if (reached.length === 0) {
    wrong.push(
      '这一支没有一处走到「礼上」那一档的爵位称呼——' +
        '把场合这一维整个删掉，第五节照样全绿，它量不出东西',
    )
  } else {
    console.log(`  ✓ 场合那一维有立足点：这一支查中了 ${reached.join('、')}`)
  }

  /**
   * —— 坏实现六：爵位那一层不查表，见爵位就换词 ——
   *
   * 宫里那位爹身上确确实实写着爵位（`birth.ts` 那张 `RANKS` 发的），
   * 而爵位称呼表里没有他这一格。于是「查不到就落回教养」这条规则
   * 在这一支真的被走到了，一个见爵位就换词的实现会当场落出别的字，
   * 把 `royal:fall#outside` 那句「那两个字你从会说话起就这么叫」弄假。
   *
   * 三问缺一不可：他爹**有**爵位（否则这条规则没被走到）、
   * 那个爵位在表里**查不到**（否则这把尺子量的是另一件事）、
   * 落出来的字**是教养那一层的**（这才是规则真的生效了）。
   */
  const atPalace = prince ? last(prince) : undefined
  const learnt = prince?.kin.生父
  if (!atPalace || atPalace.fatherRank === undefined) {
    wrong.push(
      '宫里那条人生走完，他爹身上一个爵位也没有——' +
        '「查不到就落回」这条规则这一世根本没被走到，见爵位就换词的实现混得过去',
    )
  } else if (RANK_CALLS.some((one) => one.rank === atPalace.fatherRank)) {
    wrong.push(
      `爵位表里现在有「${atPalace.fatherRank}」这一格了——` +
        '宫里那一支不再是「查不到」的例子，这把尺子失效，得另找一处',
    )
  } else if (atPalace.elder !== learnt) {
    wrong.push(
      `宫里那位爹挂着「${atPalace.fatherRank}」，爵位表里查不到，` +
        `他儿子却没落回教养那一层：叫的是「${atPalace.elder}」，学的是「${learnt ?? '（没学过）'}」`,
    )
  } else {
    console.log(
      `  ✓ 见爵位就换词会当场破：他爹身上写着「${atPalace.fatherRank}」，` +
        `表里查不到，落回教养层的「${atPalace.elder}」`,
    )
  }

  // —— 覆盖率：那几套话一共几格，这一支验到几格 ——
  const cells = REGISTERS.flatMap((one) => Object.keys(one.kin).map((bond) => `${one.id}:${bond}`))
  const checked = new Set<string>()
  for (const one of walked.values()) {
    if (one.register === undefined) continue
    for (const bond of Object.keys(one.kin)) checked.add(`${one.register}:${bond}`)
  }
  console.log(`  覆盖率：那几套话一共 ${cells.length} 格，这一支验到 ${checked.size} 格`)
  for (const cell of cells) {
    if (!checked.has(cell)) wrong.push(`${cell} 这一格没有人生走到过——那个字没人量过`)
  }

  // —— 覆盖率：几种封号，走到几种 ——
  const met = new Set<string>()
  for (const one of walked.values()) {
    for (const at of one.marks) if (honorific(at.identity)) met.add(at.identity)
  }
  console.log(
    `  覆盖率：全库 ${HONORIFIC_IDENTITIES.length} 种带封号的身份，这一支走到 ${met.size} 种`,
  )
  for (const identity of HONORIFIC_IDENTITIES) {
    if (!met.has(identity))
      wrong.push(`${identity} 有专门的敬称，可这一支一条人生也没走成——那个字没人量过`)
  }

  // —— 覆盖率：几处正文用了 {title}，走到几处 ——
  const sites = titleSites()
  const walkedSites = new Set([...walked.values()].flatMap((one) => one.wheres))
  console.log(
    `  覆盖率：全库 ${sites.length} 处正文用了 {title}，这一支走到 ${sites.filter((w) => walkedSites.has(w)).length} 处`,
  )
  for (const where of sites) {
    if (!walkedSites.has(where)) wrong.push(`${where} 的正文里有 {title}，这一支一次也没走到那儿`)
  }

  // —— 出身那一头也得数：几行出身有专门的一套话，走到几行 ——
  const special = ORIGINS.map((one) => one.id).filter((id) => registerFor(id) !== undefined)
  const walkedOrigins = new Set([...walked.values()].map((one) => one.origin))
  console.log(
    `  覆盖率：全库 ${special.length} 种人家有专门的一套话，这一支走到 ${special.filter((id) => walkedOrigins.has(id)).length} 种`,
  )
  for (const id of special) {
    if (!walkedOrigins.has(id)) wrong.push(`${id} 有专门的一套话，可这一支没有一条人生生在那种人家`)
  }

  // —— 覆盖率：爵位那张表一共几格，这一支查中几格 ——
  const rankCells = RANK_CALLS.map(cellOf)
  const hit = new Set([...walked.values()].flatMap((one) => one.rankCells))
  console.log(`  覆盖率：爵位那张表一共 ${rankCells.length} 格，这一支查中 ${hit.size} 格`)
  for (const cell of rankCells) {
    if (!hit.has(cell)) wrong.push(`爵位表 ${cell} 这一格没有一条人生走到过——那个词没人量过`)
  }

  // —— 覆盖率：全库几处标了礼上，这一支走到几处 ——
  const formal = formalSites()
  console.log(
    `  覆盖率：全库 ${formal.length} 处正文标了礼上，这一支走到 ${formal.filter((w) => formalEffect.has(w)).length} 处`,
  )
  for (const where of formal) {
    if (!formalEffect.has(where)) {
      wrong.push(`${where} 标了 manner: '礼上'，这一支一次也没走到那儿——那个标注没人验过`)
    }
  }

  /**
   * —— 覆盖率：出处两级各有几条 ——
   *
   * 这一段量的是别处量不着的东西：**这一层的历史感是不是可追的。**
   *
   * 「父王、母妃、皇兄」不能全部当成同一级别的固定制度称呼——有些是
   * 后世小说高度固化的文学表达，有些才是礼制、口语、书面语之间的混合。
   * 所以每一格都得标明它是哪一级：史料引得出书名卷次，合理化写清楚
   * 为什么这么定、软在哪儿。两级都得有人——一条史料也没有，这一层全是编的；
   * 一条合理化也没有，那等于宣称每个词都引得出出处，而口语实录并不存在。
   */
  const sourced = ATTESTATIONS.filter((one) => one.attested.level === '史料')
  const reasoned = ATTESTATIONS.filter((one) => one.attested.level === '合理化')
  console.log(
    `  覆盖率：出处一共 ${ATTESTATIONS.length} 条，史料 ${sourced.length} 条，合理化 ${reasoned.length} 条`,
  )
  if (sourced.length === 0) wrong.push('一条史料出处也没有——这一层全是编的，历史感无从谈起')
  if (reasoned.length === 0) {
    wrong.push('一条合理化也没有——那等于宣称每个词都引得出出处，而日常口语的实录并不存在')
  }
  for (const one of ATTESTATIONS) {
    if (one.attested.from.length < MIN_ATTESTATION) {
      wrong.push(
        `${one.where} 的出处只写了 ${one.attested.from.length} 个字：「${one.attested.from}」——` +
          '一句话说不清一个词是从哪儿来的，等于没写',
      )
    }
  }
  if (!sourced.some((one) => one.attested.from.includes('《'))) {
    wrong.push('标着史料的那几条里没有一条引到书名——「史料」这一级于是跟「合理化」没有分别')
  }

  return wrong
}

// ============================================================

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、他怎么称呼别人，跟着他在哪儿学会说话走', run: learntTalk },
  { name: '二、别人怎么称呼他，跟着身份走', run: calledBy },
  { name: '三、削爵那一天，两个方向朝相反的方向脱节', run: twoWays },
  { name: '四、这一层在正文里读得到', run: inText },
  { name: '五、同一个人，隔一道门换一个称呼', run: byManner },
  { name: '六、尺子自检', run: ruler },
]

let bad = 0
for (const gate of gates) {
  console.log(`${gate.name}`)
  const found = gate.run()
  for (const one of found) console.log(`  ✗ ${one}`)
  if (found.length === 0) console.log('  ✓ 没有发现问题')
  bad += found.length
  console.log('')
}

if (bad > 0) {
  console.log(`共 ${bad} 处。`)
  process.exitCode = 1
} else {
  console.log('六道全过。别人怎么称呼他，一道旨意就改了；他怎么称呼别人，改不掉。')
  console.log('而同一个人隔一道门是两个称呼——朝廷上是君臣，便殿里是父子。')
}
