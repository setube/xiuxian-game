/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一个人管家里人叫什么，取决于他是在哪儿学会说话的。
 *
 * 跑法：`npx vite-node scripts/address.ts`
 *
 * ## 这一道守的是什么
 *
 * 这一层落地之前，四种出身的孩子管爹一律叫「爹」——`calls` 是境况表里
 * 写死的一个字符串，而境况跟户籍是正交的：境况只管关系网长什么样，
 * 管不着这家是种地的还是坐龙椅的。于是童年那一卷会读到这么一句
 * （这是当时实测跑出来的，不是设想）：
 *
 *     后来母妃带你去给爹问安。
 *
 * 「母妃」是硬写的宫廷词，「爹」是插值出来的寻常人家的词，并排在一句话里。
 * **身份是皇子，台词却像普通农户。**
 *
 * 所以这一道问四件事：
 *
 *     ① 他怎么称呼别人，跟着他在哪儿学会说话走
 *     ② 别人怎么称呼他，跟着身份走
 *     ③ 削爵那一天，两个方向朝相反的方向脱节
 *     ④ 这一层在正文里读得到，不是只活在函数里
 *
 * 第三条是这支脚本的分量所在。前两条各自证明一个方向能动，
 * 可「能动」证不出它们是两件事——**一起动的两个格子是同一个格子。**
 * 分辨得出来的只有那一天：旨意下来，街上没有人再叫他殿下了，
 * 而他开口叫的还是「娘娘」。一格说变就变，一格纹丝不动。
 *
 * ## 判据取实跑，不取静态比对
 *
 * 底下七条人生走的效果和正文**全是从库里原样读出来的**：出生那一卷
 * 给封号的那一节、`royal:fall` 那几节的 `onEnter` 和 `effects`、
 * 每一节 `blocks` 里的原句，一个字也没有在这支脚本里重写。
 * 期望值也一样——「宫里那套话管娘叫什么」是从 `REGISTERS` 里读的，
 * 不是在这儿抄一遍「娘娘」。内容表改了字，这支脚本跟着改，不会误报；
 * 而**解析链读错了那一格**，它当场红。
 *
 * ## 第五节是这支脚本的另一半
 *
 * 前四节全绿说明「机制在」，说明不了「判据能分辨」。所以第五节把四种
 * 坏实现摆出来喂给同一把尺子：语言环境接到他现在过的日子上、接到履历
 * 第一段上、敬称不看身份、`kinCall` 自己兜底。**四种必须全被拒绝。**
 */
import { createPinia, setActivePinia } from 'pinia'

import { HONORIFIC_IDENTITIES, REGISTERS, registerFor, titleFor } from '../src/content/address'
import { lifeScenes } from '../src/content/life'
import { birthSceneId } from '../src/content/life/birth'
import { livingOfKeeper } from '../src/content/living'
import { ORIGINS } from '../src/content/origins'
import { kinCall } from '../src/engine/address'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Bond, Effect, Gender, SceneNode, Trade } from '../src/types/game'

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
  if (step.choice === undefined) {
    return {
      where: `${step.scene}#${step.node}`,
      effects: node.onEnter ?? [],
      lines: linesOf(node),
    }
  }
  const choice = (node.choices ?? []).find((one) => one.id === step.choice)
  if (!choice) return `${step.scene}#${step.node} 上没有这个选择：${step.choice}`
  return {
    where: `${step.scene}#${step.node}:${step.choice}`,
    effects: choice.effects ?? [],
    lines: [],
  }
}

interface Path {
  id: string
  label: string
  trade: Trade
  gender: Gender
  steps: readonly Step[]
}

/**
 * 七条人生。
 *
 * 前五条分别落在三套话和四种封号上，第六条是同一套话的第二个来源
 * （官宦跟王府学的是同一套，而两家的爵位差着十万八千里——
 * **这一条是「称谓不姓皇室」的证据**），第七条是对照组。
 *
 * 对照组不能省。一个凡是活着就会变的东西，跟一个不会变的东西，
 * 一样没有分辨力：农户那条人生从头到尾一个字没变，
 * 才说明这一层不是「给所有人换了套词」。
 */
const PATHS: readonly Path[] = [
  {
    id: 'prince',
    label: '皇子：宫墙还没塌',
    trade: '皇室',
    gender: '男',
    steps: [
      { scene: 'child:memory', node: 'court' },
      { scene: 'royal:observatory', node: 'inside' },
    ],
  },
  {
    id: 'princess',
    label: '公主：宫墙还没塌',
    trade: '皇室',
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
    trade: '皇室',
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
    trade: '王府',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'palace' }],
  },
  {
    id: 'lady',
    label: '郡主：王府',
    trade: '王府',
    gender: '女',
    steps: [],
  },
  {
    id: 'office',
    label: '官宦人家的孩子：跟王府学的是同一套话',
    trade: '官宦',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'yamen' }],
  },
  {
    id: 'farm',
    label: '对照：农户的孩子，一个字也不该变',
    trade: '农户',
    gender: '男',
    steps: [{ scene: 'child:memory', node: 'farm' }],
  },
]

/** 走到某一处时，他身上跟称谓有关的一切 */
interface Mark {
  where: string
  identity: string
  livingId: string
  /** 别人当面怎么称呼他 */
  title: string
  /** `{elder}` 落出来是什么 */
  elder: string
  /** `{dam}` 落出来是什么 */
  dam: string
}

/** 走完一条人生之后的快照。跑完 pinia 就没了，判据只能对着快照问 */
interface Walked {
  id: string
  label: string
  trade: Trade
  gender: Gender
  /** 他学的那套话叫什么。`undefined` = 跟寻常人家没有分别 */
  register: string | undefined
  /** 家里每一种关系，他学着叫什么。**逐格问出来的，用来报覆盖率** */
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
  /** 履历第一段。第五节拿它当坏实现的证据，得跟人生一起存下来 */
  firstLiving: string | undefined
  /** 每走一处留一个记号，头一个是还没走的时候 */
  marks: readonly Mark[]
  /** 这一路读到的正文，插值之后 */
  lines: readonly string[]
  /** 走过的门牌号，报覆盖率用 */
  wheres: readonly string[]
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
function born(trade: Trade, gender: Gender): boolean {
  for (let tries = 0; tries < 6000; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    household.trade = trade
    household.gender = gender
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.bornYear = world.time.year - AGE_AT_START
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }

    const adopted = people.guardians
      .filter((id) => people.isAlive(id))
      .some((id) => livingOfKeeper(people.personOf(id)?.trade ?? '') !== undefined)
    if (adopted) continue
    if (!people.kinOf('生父').some(isNearby)) continue
    if (!people.kinOf('生母').some(isNearby)) continue
    return true
  }
  return false
}

/**
 * 出生那一卷里给他封号的那一节。
 *
 * 不写死 `identity: '皇子'`——那是内容的事。这里只按性别指出门牌号，
 * 封的是什么号由 `birth.ts` 那张 `TITLES` 说了算。
 * 生在寻常人家的那几条，库里根本没有这一节，跳过。
 */
function titling(path: Path): Step[] {
  const scene = birthSceneId(path.trade)
  const node = path.gender === '女' ? 'titled-female' : 'titled-male'
  return lifeScenes[scene]?.nodes[node] ? [{ scene, node }] : []
}

function walk(path: Path): Walked | string {
  if (!born(path.trade, path.gender)) {
    return '掷了六千回也没掷出一个爹娘俱在、又没被人捡去养的孩子，判据本身失效了'
  }
  const character = useCharacterStore()
  const people = usePeopleStore()

  const mark = (where: string): Mark => ({
    where,
    identity: character.identity,
    livingId: character.living.id,
    title: fillString('{title}'),
    elder: fillString('{elder}'),
    dam: fillString('{dam}'),
  })

  const titled = titling(path)
  const marks: Mark[] = [mark('出生')]
  const lines: string[] = []
  const wheres: string[] = []
  for (const step of [...titled, ...path.steps]) {
    const site = resolve(step)
    if (typeof site === 'string') return site
    applyEffects(site.effects)
    for (const line of site.lines) lines.push(fillString(line))
    wheres.push(site.where)
    marks.push(mark(site.where))
  }

  /**
   * 面板问的必须是**同一个人**，否则两边差的是「谁」不是「怎么叫」。
   *
   * 拿他此刻还在身边的生父：`elderCall` 的顺序头一位就是生父
   * （见 `engine/interpolate.ts`），生父在身边，`{elder}` 就一定落在他身上。
   * 不在身边的那一路不比——那时候 `{elder}` 找的已经是另一个人了。
   *
   * 头一版这里硬写了 `callOf('father')`。id 确实恒是这个字，
   * 可爹在他出生前就没了的那些境况里，这个人根本没进相识册，
   * `callOf` 老实答「一个陌生人」，而 `{elder}` 顺着顺序落到了娘身上。
   * 判据于是报「面板管爹叫『一个陌生人』，正文里却是『娘』」——
   * **两句话说的是两个人，这条判据当时什么也没量。**
   */
  const father = people.kinOf('生父').find(isNearby)

  return {
    id: path.id,
    label: path.label,
    trade: path.trade,
    gender: path.gender,
    register: registerFor(path.trade)?.id,
    kin: Object.fromEntries(
      KIN_BONDS.map((bond) => [bond, kinCall(bond)]).filter(([, word]) => word !== undefined),
    ),
    panel: father === undefined ? undefined : people.callOf(father),
    titledAtBirth: titled.length > 0,
    firstLiving: character.livings[0]?.id,
    marks,
    lines,
    wheres,
  }
}

const walked = new Map<string, Walked>()
const broken: string[] = []
for (const path of PATHS) {
  const one = walk(path)
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

// ============================================================
// 一、他怎么称呼别人，跟着他在哪儿学会说话走
// ============================================================

/**
 * 每一格都得对得上那张表，一格也不许兜底。
 *
 * 这不是恒等式：两边确实都从 `REGISTERS` 读，可**左边那个是解析链
 * 一路走下来的结果**——`registerNow()` 读错了户籍，或者读的是他此刻
 * 过的日子，左边就落到另一套话上，或者干脆是空的。
 * 削爵那条人生把这件事顶到明面上：它此刻过的是 `market` 的日子。
 */
function learntTalk(): string[] {
  const wrong: string[] = [...broken]

  for (const one of walked.values()) {
    const register = registerFor(one.trade)
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

  // 官宦跟王府学的是同一套。这一条是反着的：不姓皇室的证据
  const heir = of('heir')
  const office = of('office')
  if (heir && office && last(heir).dam !== last(office).dam) {
    wrong.push(
      `王府和官宦该是同一套话（称谓的差别来自语言环境，不来自爵位），` +
        `实际是「${last(heir).dam}」/「${last(office).dam}」`,
    )
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
 * 静态正文里那些**别的**穿帮词（「母妃」「内侍」「宫门」）归
 * `scripts/upbringing.ts` 那张词典管——那是它的活。这一支管的是
 * 词典看不见的另一半：**称谓是插值出来的，静态扫描扫不到落笔后的字。**
 */
const HARDCODED: readonly string[] = [
  ...new Set(
    [registerFor('皇室')?.kin.生父, registerFor('皇室')?.kin.生母].filter(
      (word): word is string => word !== undefined,
    ),
  ),
]

function inText(): string[] {
  const wrong: string[] = []

  const palace = registerFor('皇室')
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
    const sample = one.lines.find((line) => line.includes(one.kin.生母 ?? ' '))
    console.log(`  【${one.label}】${sample ?? '（这一路没有一句提到娘）'}`)
  }
  for (const line of heard) console.log(`  削爵之后仍旧：${line}`)
  return wrong
}

// ============================================================
// 五、尺子自检
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

function ruler(): string[] {
  const wrong: string[] = []
  const fallen = of('fallen')
  const after = fallen ? last(fallen) : undefined

  // —— 坏实现一：语言环境接到他现在过的日子上 ——
  if (after) {
    const bad = registerFor(after.livingId as Trade)
    if (bad?.id === fallen?.register) {
      wrong.push(
        `拿他此刻过的日子（${after.livingId}）去查那套话，查出来跟户籍查的是同一套——` +
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

  // —— 户籍那一头也得数：几种人家有专门的一套话，走到几种 ——
  const special = ORIGINS.map((one) => one.trade).filter(
    (trade) => registerFor(trade) !== undefined,
  )
  const walkedTrades = new Set([...walked.values()].map((one) => one.trade))
  console.log(
    `  覆盖率：全库 ${special.length} 种人家有专门的一套话，这一支走到 ${special.filter((t) => walkedTrades.has(t)).length} 种`,
  )
  for (const trade of special) {
    if (!walkedTrades.has(trade))
      wrong.push(`${trade} 有专门的一套话，可这一支没有一条人生生在那种人家`)
  }

  return wrong
}

// ============================================================

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、他怎么称呼别人，跟着他在哪儿学会说话走', run: learntTalk },
  { name: '二、别人怎么称呼他，跟着身份走', run: calledBy },
  { name: '三、削爵那一天，两个方向朝相反的方向脱节', run: twoWays },
  { name: '四、这一层在正文里读得到', run: inText },
  { name: '五、尺子自检', run: ruler },
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
  console.log('五道全过。别人怎么称呼他，一道旨意就改了；他怎么称呼别人，改不掉。')
}
