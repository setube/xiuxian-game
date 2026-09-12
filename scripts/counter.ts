/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 柜台后头那些年——四个去处都走得到吗，效果都落下来了吗。
 *
 * `counter.ts`（`counter:years`）是伙计那条路唯一的出口，五个节点：
 *
 *   open         结算节点（收掉「在铺子里做伙计」这件事），四条分流
 *   entrusted    掌柜把钥匙给你　→ 管事 + 营生「经商」
 *   went-home    回乡　　　　　　→ 农家子
 *   grew-old     老徐那条路　　　→ 老伙计（兜底那一条）
 *   shop-closed  掌柜没了铺子散了→ 佣工 + 营生「佣工」
 *
 * 1500 世真世实测：走进这一卷 73 世，回乡 46.6%、铺子关了 35.6%、
 * 老伙计 9.6%、托付 8.2%——**兜底不等于最多**。
 *
 * ## 这一支为什么非有不可
 *
 * 写这一册的时候，那四条分流**改过三版，前两版各有两条是恒假的**：
 *
 *     第一版　`schooled` + `insight ≥ 55`　　念过书 0/81 世、见识≤44 0/81 世
 *     第二版　`insight among '前四分之一'`　1500 世走进 96 世，托付 0、回乡 0
 *     第三版　岁数
 *
 * 三次的症状一模一样：**`identity.ts` 那支门禁全绿**（挂着「伙计」
 * 进棺材的从 20% 降到 0%），而实际上所有人都落到了同一个兜底节点。
 *
 * 那支门禁问的是「这件事结束了吗」，它答得对。
 * 而「他后来做什么去了」有几种答案——**没有任何判据在问**。
 * 这一支问它。
 *
 * ## 判「落在哪」，不判「路过了哪」
 *
 * 分流目标常常串在同一条路径上，`walked.includes(目标)` 会让
 * 错的答案蒙混过关。这里只认**除 `open` 之外落到的第一个节点**。
 *
 * ## 三刀验收（`bash scripts/cut.sh`）
 *
 *     A 刀　`meetsAll` 恒真　　→ 分流那三条全歪，红 8 项
 *     B 刀　`applyEffects` 空转→ 身份和营生全不落，红 6 项
 *     C 刀　`meetsAll` 恒假　　→ 见底下
 *
 * ⚠️ **A 和 C 不是一刀的两种说法，A 照不出恒假的条件**——`meetsAll`
 * 恒真的时候，一条恒假的条件也跟着成立了，于是那一卷反而「正常」。
 *
 * 这一点对这一支尤其要紧：**这一册最初的 bug 就是恒假条件**
 * （前两版各有两条分流恒假，而 `identity.ts` 全绿）。
 * 头一版文件头把两刀合成一条写，等于**写了一支专门抓恒假的门禁，
 * 却记下一把照不出恒假的刀**——下一个人照它复验会少跑的正是那一刀。
 *
 * 跑法：bun scripts/counter.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

import { beOf } from './origin'

const SCENE = 'counter:years'

/**
 * 摆一个当过伙计的人。
 *
 * ⚠️ `beOf` 只立人不推世界（`staged.ts` 那一行写着），所以岁数要自己推。
 * 而**岁数就是这一卷分流的输入**，所以它是这支门禁里最要紧的一个参数。
 */
function stage(age: number): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  household.livelihood = '务农'
  useWorldStore().advanceTime({ years: age })
  // 「在铺子里做伙计」这件事得先立起来，否则这一卷的 `undertake done` 收的是空气
  useCharacterStore().setIdentity('伙计')
}

/**
 * 掌柜入册。
 *
 * `fate` 那一格控制走哪条路：他殁了走 `shop-closed`，
 * 他在且玩家四十往上走 `entrusted`。
 */
function enrollKeeper(alive: boolean): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'shop-keeper',
    surname: '周',
    given: '守仁',
    gender: '男',
    bornYear: world.time.year - 58,
    bornMonth: 6,
    temper: '木讷',
    health: 62,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'shop-keeper', '友')
}

/** 老徐入册。只影响 `grew-old` 末尾那一句 `seen` */
function enrollOldClerk(alive: boolean): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'old-clerk',
    surname: '徐',
    given: '进',
    gender: '男',
    bornYear: world.time.year - 65,
    bornMonth: 9,
    temper: '木讷',
    health: 55,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'old-clerk', '友')
}

/**
 * 摆局，推完 `open` 的 `onEnter`，确认掌柜的死活还是我摆的那样，再演。
 *
 * ## 这个函数是被一条红灯逼出来的
 *
 * ⚠️ **`open` 的 `onEnter` 推五个月，而掌柜进场就 58 岁。**
 * 摆局那一刻他活着，引擎判分流那一刻他可能已经殁了——
 * 于是「四十四岁、掌柜还在」这个摆局落到了 `shop-closed`，
 * 判据报「该落在 entrusted」，**读着像那条分流坏了**。
 *
 * 头一版没有这个函数，第二节单独跑是绿的、第五节同样的摆局是红的
 * ——差别只是随机流的位置。那种红最难查：同一个摆局，两处不同的结果。
 *
 * 修法照 `regard` 那支：**掷到推完那段时间要验的那个人还是那个样子为止，
 * 再从分流本身起演**（不重复推时间，`open` 的 `onEnter` 已经推过了）。
 */
function stagedRun(age: number, keeperAlive: boolean, tries = 60): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []

  for (let attempt = 0; attempt < tries; attempt += 1) {
    stage(age)
    enrollKeeper(keeperAlive)
    enrollOldClerk(true)

    const entry = scene.entry
    const node = scene.nodes[entry]
    if (node?.onEnter) applyEffects(node.onEnter)

    // 推完那五个月，他还是我摆的那个样子吗
    if (usePeopleStore().isAlive('shop-keeper') !== keeperAlive) continue

    const branch = node?.branches?.find((one) => meetsAll(one.requires))
    const next = branch?.next ?? node?.next
    if (next === undefined) return [entry]

    const landed = scene.nodes[next]
    if (landed?.onEnter) applyEffects(landed.onEnter)
    return [entry, next]
  }
  return []
}

/** 落在哪一节——除 `open` 之外的第一个 */
function landedOn(walked: readonly string[]): string | undefined {
  return walked.find((one) => one !== 'open')
}

console.log('\n=== 柜台后头那些年——四个去处都走得到吗 ===\n')

let bad = 0

// ============================================================
// 一、掌柜没了：铺子散了
//
// 这一条排在分流表最前，因为铺子是他的。少了这一条，
// 底下那条托付会把一个死人写成把钥匙交给你的人。
// ============================================================
{
  const walked = stagedRun(44, false)
  const character = useCharacterStore()
  const where = landedOn(walked)

  const wrong: string[] = []
  if (where !== 'shop-closed') {
    wrong.push(`掌柜殁了，该落在 shop-closed，实际落在「${String(where)}」`)
  }
  if (character.identity !== '佣工') {
    wrong.push(`铺子关了，身份该是「佣工」，实际是「${character.identity}」`)
  }
  if (useHouseholdStore().livelihood !== '佣工') {
    wrong.push(`铺子关了，营生该改成佣工，实际是「${useHouseholdStore().livelihood}」`)
  }
  if (character.doing('shopwork')) {
    wrong.push('铺子都关了，「在铺子里做伙计」这件事还挂着——那一笔 undertake done 没落')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 掌柜没了：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 掌柜没了：铺子散了，他另寻活做，那件事也收了。')
  }
}

// ============================================================
// 二、托付：四十往上，掌柜还在
// ============================================================
{
  const walked = stagedRun(44, true)
  const character = useCharacterStore()
  const where = landedOn(walked)

  const wrong: string[] = []
  if (where !== 'entrusted') {
    wrong.push(`四十四岁、掌柜还在，该落在 entrusted，实际落在「${String(where)}」`)
  }
  if (character.identity !== '管事') {
    wrong.push(`掌柜把铺子交了，身份该是「管事」，实际是「${character.identity}」`)
  }
  if (useHouseholdStore().livelihood !== '经商') {
    wrong.push(`铺子归他照看了，营生该是经商，实际是「${useHouseholdStore().livelihood}」`)
  }
  if (character.doing('shopwork')) {
    wrong.push('钥匙都给他了，「在铺子里做伙计」这件事还挂着')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 托付：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 托付：掌柜把钥匙放在他面前，铺子的事从此他拿主意。')
  }
}

// ============================================================
// 三、回乡：三十以下，家里有地
//
// ⚠️ 这一条要 `livelihood: '务农'`——按死那一格，
// 不然 `beOf('farm')` 掷出来的未必是种地的人家（6.5% 不过农家日子）。
// ============================================================
{
  const walked = stagedRun(27, true)
  const character = useCharacterStore()
  const where = landedOn(walked)

  const wrong: string[] = []
  if (where !== 'went-home') {
    wrong.push(`二十七岁、家里有地，该落在 went-home，实际落在「${String(where)}」`)
  }
  if (character.identity !== '农家子') {
    wrong.push(`他回了家，身份该是「农家子」，实际是「${character.identity}」`)
  }
  if (character.doing('shopwork')) {
    wrong.push('人都回家了，「在铺子里做伙计」这件事还挂着')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 回乡：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 回乡：他从铺子里出来回了家，而地里的活他照旧会做。')
  }
}

// ============================================================
// 四、老徐那条路：兜底那一条
//
// **四十岁还在柜台后头不是未完成，是一种结局**——而那正是
// 这一卷要说的话。所以这一条要验的是身份真的换了一个词：
// 挂着「伙计」进棺材是 bug，挂着「老伙计」进棺材不是。
//
// ⚠️ 这里从前写着「也是最多人走的一条」，**实测推翻了**：
// 1500 世真世里走进这一卷 73 世，回乡 46.6%、铺子关了 35.6%、
// 老伙计 9.6%、托付 8.2%。兜底不等于最多——
// 前面三条各自筛掉一批人之后，剩到兜底的反而是少数。
// ============================================================
{
  const walked = stagedRun(35, true)
  const character = useCharacterStore()
  const where = landedOn(walked)

  const wrong: string[] = []
  if (where !== 'grew-old') {
    wrong.push(`三十五岁、掌柜在，该落在 grew-old（兜底），实际落在「${String(where)}」`)
  }
  if (character.identity !== '老伙计') {
    wrong.push(
      `他在铺子里做了很多年，身份该换成「老伙计」，实际是「${character.identity}」` +
        '——换不掉这个词，那支「身份有没有下家」的门禁就白绿了',
    )
  }
  if (character.doing('shopwork')) {
    wrong.push('「在铺子里做伙计」这件事没收——它会一直挂到他咽气')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 老徐那条路：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 老徐那条路：他成了柜上那位老师傅，而那也是一种完成。')
  }
}

// ============================================================
// 五、那两个人真的进了册——`youth:apprentice#open:shop` 那一头
//
// ⚠️ **这一条是 `apart` 那支门禁逼出来的，而它报得对。**
//
// 我在 `youth:apprentice` 的 `shop` 选项上加了两笔 `meet`（掌柜、老徐）
// 之后，那一处就进了 `apart` 的覆盖率表——它扫全库所有「会改变谁在
// 你身边」的地方，要么自己走到，要么在移交表里写明谁量。
// 而 `apart` 走的是 `craft` 那条（学手艺），`shop` 这条它一次没走到，
// 于是当天报：「那条路没人量过」。
//
// **那不是它多事。** 这一册整个建在这两个人身上：
// `open` 的分流问掌柜死活、`grew-old` 末尾那句 `seen` 问老徐死活。
// 他们要是没入册，上面四节全部落进「掌柜没了」那一支——
// 而报表上看起来只是「这一卷偏爱某个结局」。
//
// 所以这一条从 `shop` 那条选项本身演起，不摆局喂人。
// ============================================================
{
  setActivePinia(createPinia())
  beOf('farm')
  useHouseholdStore().standing = 40
  useWorldStore().advanceTime({ years: 17 })

  const wrong: string[] = []
  const node = lifeScenes['youth:apprentice']?.nodes['open']
  const shop = node?.choices?.find((one) => one.id === 'shop')
  if (shop === undefined) {
    wrong.push('`youth:apprentice#open` 上没有 shop 那条选项了——这一册的入口不见了')
  } else {
    if (node?.onEnter) applyEffects(node.onEnter)
    applyEffects(shop.effects)

    const people = usePeopleStore()
    const character = useCharacterStore()
    for (const [id, who] of [
      ['shop-keeper', '掌柜'],
      ['old-clerk', '老徐'],
    ] as const) {
      if (people.personOf(id) === undefined) {
        wrong.push(`进了铺子，而${who}（${id}）没有入册——这一册的分流全建在他身上`)
      }
    }
    if (!character.doing('shopwork')) {
      wrong.push('进了铺子，而「在铺子里做伙计」这件事没立起来——那一卷的入场条件问的正是它')
    }
    if (character.identity !== '伙计') {
      wrong.push(`进了铺子，身份却是「${character.identity}」`)
    }
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 进铺子那一头：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log('  ✓ 进铺子那一头：掌柜和老徐都入了册，那件事也立起来了。')
  }
}

// ============================================================
// 六、四个去处互不相同
//
// ⚠️ **这一条是这支门禁的尺子自检，也是它存在的直接理由。**
//
// 前两版四条分流里有两条恒假，四个人全落进同一个兜底节点，
// 而 `identity.ts` 那支门禁**全绿**——它问的是「这件事结束了吗」，
// 答得对；「他后来做什么去了有几种答案」不在它的射程里。
//
// 所以这里不问「每一条走得到吗」（上面四节各自问了），
// 问的是**它们真的互不相同**：四个摆局落到四个不同的节点。
// 分流条件一旦退化成恒假，这一条立刻红。
// ============================================================
{
  const cases: Array<{ 摆的是: string; age: number; keeper: boolean }> = [
    { 摆的是: '掌柜没了', age: 44, keeper: false },
    { 摆的是: '四十四岁掌柜还在', age: 44, keeper: true },
    { 摆的是: '二十七岁家里有地', age: 27, keeper: true },
    { 摆的是: '三十五岁', age: 35, keeper: true },
  ]
  const landed = new Map<string, string[]>()
  for (const one of cases) {
    const where = landedOn(stagedRun(one.age, one.keeper)) ?? '(没落到任何一节)'
    landed.set(where, [...(landed.get(where) ?? []), one.摆的是])
  }

  if (landed.size < cases.length) {
    console.log(`  ✗ ${cases.length} 个摆局只落到 ${landed.size} 个不同的节点——分流条件有恒假的：`)
    for (const [where, who] of landed) {
      if (who.length > 1) console.log(`      「${where}」同时收下了：${who.join('、')}`)
    }
    console.log('      前两版正是这个样子（两条恒假），而那时候 identity.ts 全绿。')
    bad += 1
  } else {
    console.log(`  ✓ ${cases.length} 个摆局落到 ${landed.size} 个不同的去处——四条分流都在分辨人。`)
  }
}

// ============================================================
// 七、尺子自检：那四条效果真的挂在我起演的那几节上
//
// ⚠️ 防的是「从错的节点起演」——那时候一条效果也落不到，
// 上面几节会整片报红，**读着像内容坏了**。
// ============================================================
{
  const checks: Array<{ node: string; least: number }> = [
    { node: 'open', least: 2 },
    { node: 'entrusted', least: 4 },
    { node: 'went-home', least: 4 },
    { node: 'grew-old', least: 3 },
    { node: 'shop-closed', least: 3 },
  ]
  for (const { node, least } of checks) {
    const count = lifeScenes[SCENE]?.nodes[node]?.onEnter?.length ?? 0
    if (count < least) {
      console.log(
        `  ✗ 尺子自检：「${node}」只挂着 ${count} 条效果（该有 ${least} 条往上）——结构变了。`,
      )
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：五节的 onEnter 都还挂着该有的那几笔。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  伙计这件事有了尽头，而尽头不止一种——')
  console.log('  有人接了钥匙，有人回了家，有人成了柜上那位老师傅，有人连铺子都没了。\n')
}
