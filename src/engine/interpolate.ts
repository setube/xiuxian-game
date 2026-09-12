import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Bond, Manner, NarrativeBlock } from '@/types/game'

import { callMeBy, kinCall, titleNow } from './address'
import { describeAge } from './describe'
import { isNearby } from './nearby'

/**
 * 正文里的占位符。
 *
 * 剧本是静态数据，可这一世的姓名、家乡、行当都是出生那一刻掷出来的。
 * 绝大多数正文不该提名字——名字常驻在人物面板上，不必在文中反复念。
 * 但有几处非提不可：老先生提笔写下的那两个字，多年以后有人第一次叫你。
 * 那几处写 `{name}`，落纸之前在这里换掉。
 *
 * 地名分四级，各有各的用处：
 *
 * - `{home}` 完整门牌（云州 · 临江府 · 柳溪村），给状态栏那种地方
 * - `{province}` 州（云州）
 * - `{prefecture}` 府（临江府）
 * - `{here}` 街巷村名（柳溪村）——正文里说「你生在……」时，
 *   一个人不会把整条行政区划念一遍
 *
 * 生在京城的皇室，`{province}` 与 `{prefecture}` 指的是他日后被贬去的府。
 * 在旨意下来之前，那两个字不该出现在他的正文里。
 *
 * `{livelihood}` 是**这一家靠什么过活**（务农、经商、护送），
 * 上一版这个记号叫 `{trade}`，换出来的是那个混装的行当词——
 * 于是「你家在临江府 · 柳溪村，客栈。」这种句子读着别扭，
 * 因为「客栈」是那家的铺面，不是那家在做什么。
 * 出身另外四格没有各自的记号，理由是**它们没有一句正文要念出口**：
 * 籍是官府册子上的事，家世是别人怎么看你，都不该由旁白报出来。
 *
 * `{elder}` 与 `{elders}` 是另一类：它们问的不是家世，是**关系网**。
 * 详见下面两个函数——那是「不能假定每个人都有爹娘」在正文层的落点。
 *
 * `{chore}` 与 `{putsAway}` 是第三类，问的是**这家人过的是什么日子**。
 * 它们补的正是下面那段警告里说的那个洞：`{elder}` 换得掉主语，
 * 换不掉「一把锄头」。见 `content/living.ts`。
 *
 * `{title}` 是第四类，也是唯一一个**方向反过来**的：上面那些问的都是
 * 他怎么称呼世界，这一个问的是**世界怎么称呼他**。两个方向的来源
 * 不一样，所以会脱节——见 `engine/address.ts`。
 *
 * 这几个记号解析出什么，还要看**这一节是在什么场合说的话**（`SceneNode.manner`）。
 * 同一个 `{elder}`，家常那几节是「父王」，宣旨那一节是「王爷」。
 * 场合从节点一路传进来，不由这里去猜——猜的话就得读全局状态，
 * 而「此刻在不在行礼」根本不是一种状态，它是一句话的属性。
 */
const TOKENS =
  /\{(name|home|province|prefecture|here|livelihood|elder|elders|dam|chore|putsAway|title|era|bornEra|call|house|hail|place|age|nearbyVillage|nearbyCounty)(?::([\w\-/]+))?\}/g

/**
 * 挑一个还在身边的关系人，按给定的优先次序。
 *
 * 这是 `{elder}` / `{dam}` 共用的那一步：**先问关系网，再落笔**。
 *
 * 问的是「在不在身边」而不是「还活不活着」，而这两问的分别是被削爵那一卷
 * 逼出来的：迁出京城以后，即位的兄长仍然活着、那条边也仍然在，
 * 可他不在这个院子里。只问死活的话，「{elder}把那身蟒袍收进箱子」
 * 会由一个远在千里之外的人来做。
 *
 * 死了的自然也不在身边（见 `engine/nearby.ts`），所以这一改只收紧不放宽。
 *
 * 找着人之后还有一步：**管他叫什么，要看三样东西。**
 * 这个人身上有没有爵位（`rank`）、此刻在不在行礼（`manner`）、
 * 以及这孩子是在哪儿学会说话的。`kinCall` 按这个次序往下落，
 * 三样都答不上来才用 `calls`——境况表里那个「爹」。
 * 回落不是兜底失败，那就是寻常人家那一套本身。
 */
function callByBond(order: readonly Bond[], manner: Manner): string {
  const people = usePeopleStore()
  for (const bond of order) {
    for (const id of people.kinOf(bond)) {
      if (!isNearby(id)) continue
      return (
        kinCall(bond, people.personOf(id)?.rank, manner) ?? people.known[id]?.calls ?? '家里的大人'
      )
    }
  }
  return '家里的大人'
}

/** 同一把尺子，只要人不要称呼：此刻在身边、排在最前的那个 */
function idByBond(order: readonly Bond[]): string | undefined {
  const people = usePeopleStore()
  for (const bond of order) {
    for (const id of people.kinOf(bond)) if (isNearby(id)) return id
  }
  return undefined
}

/**
 * 一起长大的那个：邻家跟你年纪最近的孩子。
 *
 * ## 为什么它不能照 `idByBond` 写
 *
 * 上面那三个角色都按 `Bond` 取——而邻家的孩子**没有 bond**。
 * 他不是亲属，是「住在挨着的那一户里的人」（`people.isNeighbour` 按住处派生），
 * 而且他的 id 是出生那一刻随机生成的（`east-child-1` / `west-child-2`…），
 * 数量 0–3，两户合起来平均三个。**内容层写不出他的 id。**
 *
 * ## 取年纪最近的，不取第一个
 *
 * 两户合起来可能有六个孩子，跨十二岁（`birth.ts` 掷的是「比你大 0–12 岁」）。
 * 「一起玩的那个」在现实里是同龄那个，不是排在最前那个——
 * 取第一个的话，一个八岁孩子的玩伴会是那个二十岁的邻家大哥。
 *
 * ## 一辈子认同一个人，不是每次现挑
 *
 * 年龄差是固定的（大家一起变老），所以这个函数每次算出来都是同一个人——
 * **它现算，但结果稳定**。这跟 `neighbourCall` 那一格是同一个道理：
 * 不存字段，可算出来的东西不会变（`写死的字段活得比事实久`）。
 *
 * 唯一会变的时候是那个人不在了或者搬走了（`isNearby` 不成立），
 * 那时它落到下一个——**而那正是对的**：一起玩的人走了，
 * 你还是会跟别的孩子玩，只是不再是他。
 *
 * ⚠️ 6.3% 的人生里两户一个孩子也没有（20000 次实测，正是 `(1/4)²`——
 * 两户各掷 `randomBetween(0, 3)` 都掷中 0），这时它返回 `undefined`，
 * 那一条效果不落、那一句正文换成兜底。**从小没有同龄玩伴是一种真实的人生**，
 * 不给它保底。
 *
 * ⚠️ **这个数说的是「立基那一刻」，跟「某一年这个函数认不认得出人」不是一回事。**
 * 玩家八岁那年实测认得出的是 84.3%（400 世）——差的那一截不全是掷 0：
 * 底下两条门槛还会挡掉一些（跟户主差不满十六岁的算那一户的大人，
 * 跟你差过十二岁的算哥哥辈）。两个数各自成立，**采样点不同**，
 * 别把它们当成矛盾去「修」。
 */
function idOfPlaymate(): string | undefined {
  const people = usePeopleStore()
  /*
   * 我今年几岁，问 `character`，**不问人口册**。
   *
   * ⚠️ 这一行从前是 `people.ageOf('me')`，而**「我」从来不在人口册上**
   * （`'me'` 只是关系图上的节点名，没有任何地方 enroll 过它）——
   * 于是它恒为 0，`gap` 退化成孩子自己的岁数，这个函数问的变成了
   * 「邻家有没有不满十二岁的孩子」，跟玩家多大毫无关系。
   *
   * 症状是安静的：它照样返回一个真人、`{call:playmate}` 照样印出名字，
   * 只是**挑错了人**——玩家四十岁那年，它指的仍然是巷子里最小的那个孩子。
   * 400 世实测命中 13.5%，而至少有一个邻家孩子的是 84.8%：
   * 差的那七成全被「你不满十二岁」这条没人写过的规矩挡在外面。
   *
   * `effects.ts` 那段注释早写过同一个坑（家里添的孩子一律落回「某」姓，
   * 因为 `personOf('me')?.surname` 恒 undefined）。同一个 `'me'`，第二次。
   */
  const mine = useCharacterStore().age
  let best: string | undefined
  let closest = Number.POSITIVE_INFINITY
  for (const house of people.neighbourHouses()) {
    const headAge = people.ageOf(house.head)
    for (const id of house.members) {
      if (!isNearby(id)) continue
      /*
       * 排掉那一户的大人。
       *
       * 光看「跟我年纪差多少」不够：玩家三十岁的时候，邻家四十岁的户主
       * 只差十岁，会被当成一起长大的人。而孩子辈的判据是**跟户主差一辈**——
       * 那一户的当家和他媳妇都不是你的玩伴，哪怕年纪碰巧挨着。
       *
       * 十六岁是一辈：`birth.ts` 掷户主生年时用的是「比玩家大 24–50 岁」，
       * 孩子是「比玩家大 0–12 岁」，两者最窄的差正好十二到二十四之间。
       * 取十六，宽一点，宁可漏掉一个也不把大人算进来。
       */
      const age = people.ageOf(id)
      if (headAge - age < 16) continue
      const gap = Math.abs(age - mine)
      // 差得太远的不算玩伴：那是邻家的哥哥辈，不是一起长大的人
      if (gap > 12 || gap >= closest) continue
      closest = gap
      best = id
    }
  }
  return best
}

/**
 * 效果里写的角色名。
 *
 * `{elder}` 是正文里的记号；效果里对应的是 `id: 'elder'`——「跟家里的大人多说了几句」
 * 的那个 `meet`、「他没能熬过去」的那个 `person`。它们从前直接拿 `'elder'` 当人名去查
 * 人口册，而册上没有这个人（有的话是哥，那是另一个 bug）：于是 `meet` 造出一个叫
 * 「一个人」的幽灵熟人挂在人际面板上，`person fate 殁` 谁也没杀。
 * 现在角色名在结算前换成真人的 id，换不到（身边没有这样的人）那一条效果就不落。
 *
 * ## ⚠️ 四个记号分两类，而这件事从前没有任何地方写着
 *
 * 它们是**现算**的：爹殁了，`{elder}` 下一次就落到娘身上。
 * 这对不对，取决于那个记号说的是**一个位置**还是**一个人**：
 *
 *     elder / dam / child   位置　　家里管事的那个大人、娘、孩子
 *                                   换了人照样成立——正文印「娘」，读着是对的
 *     playmate              一个人　一起长大的那一个
 *                                   换了人立意就毁了，那三卷讲的正是「同一个人」
 *
 * **所以同一个形状，在两类记号上一个无害一个是 bug。**
 * 2026-09-12 两个会话各查了一半：一边量出「推过 90 天真的会换人」
 * （4 年那一档 400 世里 22 次，5.5%；4 个月以下实测为零），
 * 一边读正文判出那 18 处推过 90 天的**全是 `elder`/`dam`，换人反而更对**
 * （`bearing:await/barren` 推 4 年，正文是回溯叙述：
 * 「第三年上，{elder}托人求了个方子」——爹第二年殁了，那方子本来就该是娘求的）。
 *
 * ## 写下来是因为它从前只是「读得出来」
 *
 * 那条分法靠的是「作者写 `{elder}` 时表达的是位置不是爹」，
 * 而**这个前提在正文里一个字也没有**。哪天有人写
 * 「**{elder}答应过你的那件事**」——那一句说的是**具体某个人许的诺**，
 * 记号一滑就成了另一个人答应的，**而形状跟那 18 处一模一样**，
 * 没有任何机器会看，也不会有人去读第二遍。
 *
 * 所以给写正文的人一条可操作的：
 *
 * - **位置类记号（`elder`/`dam`/`child`）**：只写「这个位置上的人此刻在做什么」。
 *   要写「他从前许过的诺」「他当年说过的话」，那是**具体某个人**，
 *   得按 `family: { id: ... }` 点名，不能用记号。
 * - **`playmate` 是人不是位置**：凡是跨时间的那一节，
 *   `time` 别写在 `open` 的 `onEnter` 上（引擎顺序是
 *   `applyEffects(onEnter)` → 渲染正文 → 判 `branches`，`story.ts:306/307/318`）。
 * - 门禁够不着这一层（内容措辞 ↔ 玩家收到的事实，见 CLAUDE.md
 *   「语义正确是第三样东西」）。**判这一类要读正文，不能扫。**
 */
export const ROLE_IDS = ['elder', 'dam', 'child', 'playmate'] as const
export type RoleId = (typeof ROLE_IDS)[number]

const ROLE_ORDER: Readonly<Record<Exclude<RoleId, 'playmate'>, readonly Bond[]>> = {
  elder: ['生父', '抚养', '生母'],
  dam: ['生母', '抚养', '生父'],
  child: ['子', '女'],
}

export function roleId(role: string): string | undefined {
  if (role === 'elder' || role === 'dam' || role === 'child') return idByBond(ROLE_ORDER[role])
  // 玩伴不按 bond 取——他不是亲属，是挨着住的那一户里跟你年纪最近的孩子
  if (role === 'playmate') return idOfPlaymate()
  return undefined
}

/**
 * 一批效果开始那一刻，三个角色各是谁。
 *
 * 角色是按「此刻在身边」现算的（`roleId`），而一批效果里前一条会改变身边有谁：
 * 「他没能熬过去」那一批先写 `person elder 殁`，后写 `chronicle {elder}那年入冬没能熬过去`
 * ——爹殁了，`{elder}` 落到娘身上，编年记下的是「娘那年入冬没能熬过去」，而娘活得好好的。
 * 守孝那一笔 `undertake who: 'elder'` 更是连人都没换，记的是「elder」两个字母。
 *
 * 所以一批效果里的角色只在开头认一次（`applyEffects`）：**一批效果说的是同一刻的人**，
 * 那一刻是时序推完、别的事还没发生的时候。快照里是人口册上的 id；身边没有这样的人就是 undefined。
 */
export type RoleSnapshot = Readonly<Record<RoleId, string | undefined>>

/**
 * ⚠️ 加角色的人注意：**这里少写一个键，`vue-tsc --build` 可能不告诉你**。
 *
 * 类型本身是咬得住的——`Record<RoleId, …>` 缺一个键就是 `TS2741`。
 * 咬不住的是**增量构建**：`package.json` 里 `type-check` 是 `vue-tsc --build`，
 * 它读 `node_modules/.tmp/*.tsbuildinfo`，改了别处没重编这一支时会安静放过。
 *
 * 我加第四个角色 `playmate` 时就漏了这一处，而连跑几次 `--noEmit` 全绿；
 * 换 `--build --force` 当场三条错（这里两条、`ROLE_ORDER` 那里一条）。
 * **CLAUDE.md 那条「拿它当验收门槛之前先跑 `--force`」说的正是这个。**
 *
 * 底下那句 `satisfies` 不是必需的（`Record` 自己就报），留着是因为它
 * 多报一条更直白的 `TS1360`，把「哪个键缺了」写在错误信息里。
 */
export function snapshotRoles(): RoleSnapshot {
  return {
    elder: roleId('elder'),
    dam: roleId('dam'),
    child: roleId('child'),
    playmate: roleId('playmate'),
  } satisfies { [K in RoleId]-?: string | undefined }
}

/** 快照里那个人此刻怎么叫。人殁了也叫得出来（边不封口）——「爹那年入冬没能熬过去」说的就是他 */
function snapshotCall(id: string | undefined, role: RoleId, manner: Manner): string {
  if (id === undefined) return '家里的大人'
  const people = usePeopleStore()
  /*
   * 玩伴没有亲属称谓，所以跳过 bond 那一圈。
   *
   * `ROLE_ORDER` 那张表是「这个角色按哪几条 bond 找人」，而邻家的孩子
   * 不是亲属——他一条 bond 也没有（`idOfPlaymate` 按住处和年纪取）。
   * 拿他去查 `kinCall` 只会一路落空，最后还是回到 `callOf`，
   * 而 `callOf` 本来就会按邻居那一层现算（「西头沈家的」）。
   */
  if (role === 'playmate') return people.callOf(id)
  for (const bond of ROLE_ORDER[role]) {
    if (!people.kinOf(bond).includes(id)) continue
    return (
      kinCall(bond, people.personOf(id)?.rank, manner) ?? people.known[id]?.calls ?? '家里的大人'
    )
  }
  return people.known[id]?.calls ?? '家里的大人'
}

/**
 * 「管这个家的大人」此刻是谁。
 *
 * 剧本里大量的「父亲说」「跟着父亲下地」，对生下来就没爹的人是穿帮。
 * 但逐句改写要动几百行正文，而且改完还是死的——
 * 爹活着时叫爹，爹死在外地之后呢？
 *
 * 所以正文写 `{elder}`，落纸时问关系网：有爹叫爹，没爹就叫养你的那个人，
 * 一个都没有就是「家里的大人」。同一句正文，对谁都成立，
 * 而且会跟着这个人的境遇一起变。
 *
 * ⚠️ **这是过渡方案，不是终局。**
 *
 * `{elder}` 只解决「谁在做这件事」，解决不了「他为什么会做这件事」。
 * 老乞丐、长姐、寺里的师父、亲爹，不可能共享同一套生活内容——
 * 「每天傍晚去地里站一会儿」这种句子，换个主语仍然是错的，
 * 因为讨饭的人没有地。
 *
 * 所以往后写新正文的规矩是：
 *
 * 1. 只写谁都可能做的事：`{elder}每天傍晚都会出去一趟。`
 * 2. 真要写只有某种人才做的事，就给那一卷加 requires 把关系锁住，
 *    然后正文里放心写「父亲」。
 *
 * 不要让 `{elder}` 变成祖传抽象。它是拆硬编码用的撬棍，不是地基。
 *
 * ✅ **上面那个洞后来补上了一半**，见 `{chore}` / `{putsAway}`：
 * 「他在做什么」这一类由 `household.living` 回答，
 * 而只有一件活可摆弄的人家才配用那两个记号——宫里的 `chore` 是 null，
 * 于是那一整卷对皇室不成立，靠的是 `requires: [{ living: ... }]`，
 * 不是换个物件接着演。第 2 条规矩因此有了机器守着的形式。
 */
function elderCall(manner: Manner): string {
  return callByBond(['生父', '抚养', '生母'], manner)
}

/**
 * 「娘」这个位置上此刻是谁。
 *
 * 跟 `{elder}` 分开是必须的：一个由长姐拉扯大的孩子，
 * 「娘把你放在田埂上」是穿帮，但「姐把你放在田埂上」成立。
 * 同理，生母难产而亡、爹一个人把他带大的，这个位置就是爹。
 */
function damCall(manner: Manner): string {
  return callByBond(['生母', '抚养', '生父'], manner)
}

/**
 * 「爹娘」这种合称。家里只剩一个人的时候，说「爹和娘」就是穿帮。
 *
 * 跟 `callByBond` 同一条线：数的是**此刻在这个家里的**那几个人，
 * 不是名册上还活着的那几个。爹在外县修河堤的那两年，
 * 「爹和娘一起坐在灯下」不该成立。
 */
function eldersCall(manner: Manner): string {
  const people = usePeopleStore()
  const names: string[] = []
  for (const bond of ['生父', '生母', '抚养'] as const) {
    for (const id of people.kinOf(bond)) {
      if (!isNearby(id)) continue
      const calls = kinCall(bond, people.personOf(id)?.rank, manner) ?? people.known[id]?.calls
      if (calls && !names.includes(calls)) names.push(calls)
    }
  }
  if (names.length === 0) return '家里的大人'
  if (names.length === 1) return names[0]!
  return names.slice(0, 2).join('和')
}

/**
 * 手上那件活。
 *
 * 问的是 `character.living`——三级链解析完的那一格，不是 `household.living`。
 * 这个分别在削爵那一卷之后才看得出来：迁出京城以后，
 * 家里的营生还是「皇室」，而他手上那件活得由他现在过的日子说了算。
 *
 * 兜底那句「手里的东西」是给**写漏了 requires 的那一卷**准备的：
 * 宫里没有这样一件活（`chore` 是 null），正文本不该走到这儿。
 * 兜底不是补救，是让穿帮变成一句读得出来的怪话，
 * 而不是一个静默的 `undefined`——真正拦它的是 `scripts/upbringing.ts`。
 */
function choreCall(): string {
  return useCharacterStore().living.chore?.holds ?? '手里的东西'
}

/** 收工时是怎么收的。同上，宫里没有这一格 */
function putsAwayCall(): string {
  return useCharacterStore().living.chore?.putsAway ?? '把手里的东西放下'
}

/**
 * 把一句话里的占位符换成这一世的实情。没有占位符的原样返回。
 *
 * `manner` 省掉就是家常。**默认值挑家常不挑礼上，是因为漏写不会报错**：
 * 库里绝大多数话都是家里人之间说的，默认礼上的话，每一节都得显式写一行
 * 才不穿帮，而漏写的那一节只会让一个八岁孩子在灶间管他爹叫王爷。
 */
export function fillString(text: string, manner: Manner = '家常', roles?: RoleSnapshot): string {
  if (!text.includes('{')) return text

  const character = useCharacterStore()
  const household = useHouseholdStore()
  const world = useWorldStore()

  return text.replace(TOKENS, (_, token: string, arg: string | undefined) => {
    // 效果批次里带着快照：那一批开头认下的人，哪怕这一批里他殁了，说的还是他
    if (token === 'elder')
      return roles ? snapshotCall(roles.elder, 'elder', manner) : elderCall(manner)
    if (token === 'dam') return roles ? snapshotCall(roles.dam, 'dam', manner) : damCall(manner)
    if (token === 'elders') return eldersCall(manner)
    if (token === 'chore') return choreCall()
    if (token === 'putsAway') return putsAwayCall()
    if (token === 'title') return titleNow()
    if (token === 'name') return character.name
    if (token === 'home') return household.home
    if (token === 'province') return household.province
    if (token === 'prefecture') return household.prefecture
    if (token === 'here') return household.locale
    /*
     * `{call:east-wife}`——玩家此刻怎么称呼这个人；`{house:east}`——那一户叫什么（王家）。
     *
     * 带参数的记号是给**生成出来的人**用的：邻居的姓是立基时掷的，正文写不出
     * 「王婶」三个字，只能写「叫她的那个词」。称呼每次现算（`people.callOf`），
     * 九岁时是「王婶」，三十岁时是「王嫂」——同一句正文，落纸的字跟着人一起变老。
     */
    /*
     * `{call:谁}`——玩家此刻怎么称呼这个人。
     *
     * 先过一次 `roleId`：**角色名换成此刻在身边那个人的 id，换不到就按原样当 id 用**
     * （那多半本来就是个 id，像 `{call:east-wife}`）。跟底下 `{hail:}` 同一个写法。
     *
     * ⚠️ 这一句从前没有 `roleId`，于是 `{call:playmate}` 把「playmate」
     * 当成人口册上的一个 id 去查，查不到——`callOf` 兜底印出「一个陌生人」。
     * 一句通顺的话，类型过，没有任何机器会说，而 `stranger.ts` 那一支
     * 正是为这个形状建的。
     *
     * `{elder}` / `{dam}` / `{child}` 躲过了这个坑只因为它们各有专门的分支
     * （上面那三行），走的不是这条通用路径。
     */
    if (token === 'call') {
      const people = usePeopleStore()
      const key = arg ?? ''
      /*
       * `{call:known/playmate}`——**当年认定的那一个**，不是此刻顶上的那个。
       *
       * ⚠️ 这两者从前共用 `{call:playmate}` 一个写法，而它们指的
       * 常常不是同一个人：那个人殁了之后 `roleId` 会让另一个孩子顶上
       * （实测 24% 的顶替还会沿用死者的称呼）。
       *
       * **位置语义没有错，错的是拿它去说「当年」。** 所以两个写法并存：
       *
       *     {call:playmate}        此刻身边那个孩子　　　　日常那一类
       *     {call:known/playmate}  一起长大的那一个　　　　「当年」「从小」那一类
       *
       * 认定过的人已经不在了，这里落回「一个陌生人」——而那种时候
       * 正文本来就不该点他的名（入场条件用 `knownAs present` 挡住）。
       */
      if (key.startsWith('known/')) return people.callOf(people.knownOf(key.slice(6)) ?? '')
      return people.callOf(roleId(key) ?? key)
    }
    if (token === 'house') return houseCall(arg ?? '')
    /*
     * `{hail:east-wife}`——**那个人开口时怎么称呼你**，连着后面那个逗号。
     *
     * 跟上面 `{call:}` 朝相反的方向：那个是「你怎么叫他」（跟着你的教养走），
     * 这个是「他怎么叫你」（跟着你的身份和你们的关系走）。
     * 削爵那一卷早就写明了这两个方向会同时朝相反的地方脱节。
     *
     * ## 为什么把逗号也吞进来
     *
     * 因为**它可能什么也没有**。`callMeBy` 对旧交返回 `undefined`——
     * 熟人开口本来就不带称呼，那正是「熟」的样子。
     *
     *     生人　「相公，听说你中了。」
     *     旧交　「听说你中了。」
     *
     * 逗号留在正文里的话，第二种就成了「，听说你中了」。
     * 所以这个记号交付的是**整个招呼**，有就连标点一起给，没有就是空的——
     * 同一句正文，两种人读出来都通顺。
     */
    if (token === 'hail') {
      /*
       * ⚠️ `arg` 可能是**角色名**（`elder` / `dam` / `child`），不是人口册 id。
       *
       * 头一版直接把它传了下去，于是 `callMeBy('elder')` 查 `bondsWith('elder')`
       * 查了个空——**家里的大人被当成生人**，落到第三层，管自己的孩子叫「相公」。
       * 900 世实测印出来是这样的：
       *
       *     80 ×「相公，回来了。」   ← 全是家里的大人说的
       *      4 ×「你可算回来了。」   ← 本该是这一句
       *
       * 而这条错**看着完全正常**：句子通顺、称呼也是个真词，
       * 只有把两种人的话并排印出来才看得见它一直在叫错。
       *
       * `roleId` 把角色名换成此刻在身边的那个人；换不到就按原样传下去
       * （那多半本来就是个 id）。
       */
      const word = callMeBy(roleId(arg ?? '') ?? arg ?? '', manner)
      return word === undefined ? '' : `${word}，`
    }
    // 他今年多大。「侄儿已经十一岁了」——岁数从生年现算，不存；孩子是几个月就说几个月
    if (token === 'age') {
      const people = usePeopleStore()
      const who = arg ?? ''
      return people.personOf(who) ? describeAge(people.ageOf(who), people.monthsOf(who)) : '几岁'
    }
    /*
     * 地方。`{place:county}` 是他家归的那个县；`{nearbyVillage}` 是同一个镇底下
     * 的别的村，`{nearbyCounty}` 是同一个府底下的别的县——正文里那五处「邻村」
     * 从前说的是一个世界里不存在的地方，现在它有名字。
     * 住在城里的人没有邻村，落回「邻村」两个字：那一句本来就该另写，不在这儿改。
     */
    if (token === 'place') return world.placeOf(arg ?? '')?.name ?? '那地方'
    if (token === 'nearbyVillage') return world.nearbyVillages()[0]?.name ?? '邻村'
    if (token === 'nearbyCounty') return world.placeOf('county-2')?.name ?? '邻县'
    // 年号：`{era}` 是此刻的，`{bornEra}` 是他生下来那年的。
    // 老人说「那是承和年间的事了」靠的是后者——旧年号不因改元消失。
    // 王朝史还没立起来时给「本朝」，别让一句话里露出空白
    if (token === 'era') return eraCall(world.time)
    if (token === 'bornEra') {
      return eraCall({ year: world.bornYear, month: world.bornMonth, day: 1 })
    }
    return household.livelihood
  })
}

/** 那一刻的年号。拿不到就说「本朝」，一句话里不能空一块 */
function eraCall(at: { year: number; month: number; day: number }): string {
  return useWorldStore().eraOf(at)?.name ?? '本朝'
}

/** 那一户叫什么：「王家」。查不到就是「邻家」——一句话里不能空一块 */
function houseCall(id: string): string {
  const house = usePeopleStore().houses[id]
  return house ? `${house.surname}家` : '邻家'
}

/** 把一段正文里的占位符换成这一世的实情。没有占位符的原样返回。 */
export function fill(blocks: readonly NarrativeBlock[], manner: Manner = '家常'): NarrativeBlock[] {
  return blocks.map((block) => {
    if (block.kind === 'divider') return block
    if (block.kind === 'heading') return { ...block, title: fillString(block.title, manner) }
    if (block.kind === 'dialogue' && block.speaker) {
      return {
        ...block,
        speaker: fillString(block.speaker, manner),
        text: fillString(block.text, manner),
      }
    }
    return { ...block, text: fillString(block.text, manner) }
  })
}
