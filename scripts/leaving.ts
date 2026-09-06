/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 走与不走：念头能不能反过来影响行动。
 *
 * ## 分寸在哪里
 *
 * 念头若只出现在人物面板里，它终究只是一张人物画像。可它一旦
 * 直接变成「【任务：跟商队走】」，这个游戏就换了一种。
 *
 * 正确的位置在中间：**念头改变的是他更容易注意到什么、
 * 更愿意试一试什么、更容易坚持什么——而不是替他做决定。**
 *
 * 要跑出这四种人：
 *
 *   A　有了念头 → 越来越主动 → 最后真的走了
 *   B　有了念头 → 一直没动 → 留在原地　　← 最要紧的一种
 *   C　有了念头 → 家里出了事 → 念头退下去
 *   D　有了念头 → 走了一趟 → 回来之后改了方向
 *
 * B 最要紧，因为**有一个念头 ≠ 必须实现这个念头**。
 * 否则念头就成了隐藏任务。
 *
 * 跑法：bun scripts/leaving.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents } from '../src/content/life'
import { DAMPERS, LEANINGS } from '../src/content/leanings'
import { OPENINGS } from '../src/content/openings'
import { readingOf } from '../src/engine/leanings'
import { useCharacterStore } from '../src/stores/character'
import { useLeaningStore } from '../src/stores/leanings'
import { useWorldStore } from '../src/stores/world'
import { mapShards } from './lib/parallel'
import type { Lived } from './tasks/leaving-lives'

/**
 * ## 世数按最稀的那一格定
 *
 * 这一支统计的是**条件概率**，分母是「动过『想离开』这个念头的人生」。
 * 照总数拍世数必然出错，可照合格样本拍也不够——
 * **真正卡住的是四种形状里最稀的那一格。**
 *
 * 一千五百世里合格的一百世（十五分之一），
 * 而 A（最后真的走了）只占这一百世的百分之三——**三个人**。
 * 若照「三十个合格样本就够了」去拍，五百世筛出三十几个，
 * A 的期望个数不到一，一多半的批次里它根本不出现，
 * 于是走查报「这几种人生跑不出来」，看上去像是功能坏了。
 *
 * 要让最稀那一格稳定出现，得让「合格样本 × 它的占比」到三以上：
 * 反推回去正好是一千五百世，而它已经贴着线——所以底下第三节
 * 的门禁没有押在 A 上，改押在「走出去过的人」这一格更宽的判据上。
 *
 * 三个数一层套一层——总世数 → 合格样本 → 最稀那一格。
 * **拍板要拍在最里头那一层。**
 */
const RUNS = 1500

let failed = 0

// —— 一、静态门禁：念头不得创造世界事实 ——
console.log('\n=== 一、念头不得创造世界事实 ===\n')
{
  /**
   * 这一条做成静态检查，不做统计。
   *
   * 统计只能说明「目前没有相关性」，证明不了「世界不会为玩家改变」。
   * 而后者是一条结构性质：机会的出现条件里只要引用了念头，
   * 世界就开始配合玩家了——**得钉在数据上才拦得住以后的人。**
   */
  const LEANING_IDS = new Set(LEANINGS.map((item) => item.id))
  const offenders: string[] = []

  for (const opening of OPENINGS) {
    for (const condition of opening.requires ?? []) {
      // 条件系统里根本没有「念头」这一项，所以只可能借旗标偷渡
      const key = condition.flag?.key ?? ''
      if (LEANING_IDS.has(key) || key.startsWith('leaning:')) {
        offenders.push(`${opening.id} → ${key}`)
      }
    }
  }

  // 年表那一头也要查：机会所在的卷，入场条件里同样不许有念头
  const scenes = ['leave:hiring', 'leave:caravan', 'leave:the-road']
  for (const event of lifeEvents) {
    if (!scenes.includes(event.scene)) continue
    for (const condition of event.requires ?? []) {
      const key = condition.flag?.key ?? ''
      if (LEANING_IDS.has(key) || key.startsWith('leaning:')) {
        offenders.push(`年表 · ${event.id} → ${key}`)
      }
    }
  }

  console.log(`  ${OPENINGS.length} 个机会，它们的入场条件：`)
  for (const opening of OPENINGS) {
    const conditions = (opening.requires ?? [])
      .map((c) => (c.flag ? `旗标 ${c.flag.key}` : c.age ? `年纪 ≥ ${c.age.atLeast}` : '其他'))
      .join('、')
    console.log(`      ${opening.id.padEnd(10)} ${conditions || '（谁都遇得上）'}`)
  }

  console.log()
  if (offenders.length > 0) {
    console.log(`  ✗ ${offenders.length} 处让念头决定了世界会不会发生什么：`)
    for (const line of offenders) console.log(`      ${line}`)
    failed += 1
  } else {
    console.log('  没有一处。商队本来就要走，短工本来就在招——')
    console.log('  **世界不因为玩家想要什么而配合他。**')
  }
}

// —— 二、同一个机会，两种读法 ——
console.log('\n=== 二、同一个机会，两个人读到的不一样 ===\n')
{
  for (const [label, weight] of [
    ['心里什么也没存的人', 0],
    ['想离开的人', 20],
  ] as [string, number][]) {
    setActivePinia(createPinia())
    useCharacterStore()
    const leaning = useLeaningStore()
    const world = useWorldStore()
    if (weight > 0) {
      leaning.stir('leave', weight, { at: world.time, text: '……' }, world.time)
    }
    console.log(`  【${label}】`)
    for (const line of readingOf('hiring')) console.log(`      ${line}`)
    console.log()
  }
  console.log('  同一条告示，同一组选项。**多出来的那一句不添信息，只添注意力**——')
  console.log('  「货栈的活是跟着车队走的」是他自己想到的，不是管事的多告诉他的。')
}

// —— 三、四种人生 ——
console.log('\n=== 三、四种人生 ===\n')

/**
 * 掷到够数为止。
 *
 * 上面那段算过：一千五百世里 A/D 的期望个数刚过三——**贴着线**。贴着线的意思是
 * 二十回里有一回它掷出零，走查报「这几种人生跑不出来」，看上去像是功能坏了。
 * 全套门禁里偶尔一支红、单跑又绿，`leaving` 就是其中一支（种子 hunt-7 那一批抓的）。
 *
 * 固定世数判零世会闪红，要掷到够数的事件为止：第一批不够，再摊一批，最多四批。
 * 种子照样钉得住——`mapShards` 每摊一回派的片种子不一样。
 */
const ENOUGH_OF_EACH = 3
const BATCHES_AT_MOST = 4
let lives: Lived[] = []
let batches = 0
const enough = (): boolean => {
  const wanted = lives.filter((life) => life.everWanted)
  const went = wanted.filter((life) => life.went || life.cameBack).length
  const stayed = wanted.filter((life) => life.wantsNow && !life.went).length
  const cooled = wanted.filter((life) => !life.went && !life.wantsNow).length
  return went >= ENOUGH_OF_EACH && stayed >= ENOUGH_OF_EACH && cooled >= ENOUGH_OF_EACH
}
while (batches < BATCHES_AT_MOST && (batches === 0 || !enough())) {
  lives = [
    ...lives,
    ...(await mapShards<Lived[]>({ task: 'scripts/tasks/leaving-lives.ts', runs: RUNS })).flat(),
  ]
  batches += 1
}
const SAMPLED = lives.length
if (batches > 1) console.log(`  （第一批 ${RUNS} 世最稀的那格没掷够，摊了 ${batches} 批，共 ${SAMPLED} 世）
`)

{
  const wanted = lives.filter((life) => life.everWanted)
  const a = wanted.filter((life) => life.went && !life.letGo)
  // 「留在原地」的实质是没走成，不是从没行动过——
  // 一个去问过两回、最后说家里离不开的人，也是这一种
  const b = wanted.filter((life) => life.wantsNow && !life.went)
  const c = wanted.filter((life) => !life.went && !life.wantsNow)
  // 走了一趟，回来之后那个念头被压下去了
  const d = wanted.filter((life) => life.cameBack && life.cooled)
  /**
   * ## 最稀那一格稀到一定程度，该改的是判据，不是世数
   *
   * A 和 D 各占合格样本的三个点上下——一千五百世跑下来各三个人。
   * 期望是三，那么**每二十批就有一批抽到零**，走查于是报
   * 「这几种人生跑不出来」，看上去像功能坏了。往上加世数治得了它，
   * 可这一支已经是全套里最慢的一支，为一格罕见值再翻一倍不划算。
   *
   * 回头看这一格到底在问什么：A（走了）和 D（走了又回来）
   * **是同一条路上的两种后续**——都得先真的走出去。
   * 而「走出去之后那个念头退没退」是另一个问题，它不该用
   * 「这一批里抽到没有」来判死活。
   *
   * 所以门禁改成问路通不通：**走出去过的人必须存在。**
   * A 与 D 各自的比例照报不误，只是不再拿它们卡门禁——
   * 报出来的数字和守住的底线，本来就不必是同一个。
   */
  const wentOut = wanted.filter((life) => life.went || life.cameBack)

  const pct = (n: number) => ((n / Math.max(1, wanted.length)) * 100).toFixed(1).padStart(5)
  console.log(`  ${SAMPLED} 世里，${wanted.length} 世动过「想离开」的念头。其中：\n`)
  console.log(`  A　越来越主动，最后真的走了　${pct(a.length)}%`)
  console.log(`  B　一直没动，留在原地　　　　${pct(b.length)}%`)
  console.log(`  C　念头后来退下去了　　　　　${pct(c.length)}%`)
  console.log(`  D　走了一趟，回来改了方向　　${pct(d.length)}%`)
  console.log(`\n  真的走出去过的（A 与 D 合起来，去掉重复）　${pct(wentOut.length)}%`)

  console.log()
  const missing: string[] = []
  if (wentOut.length === 0) missing.push('A/D（真的走出去过）')
  if (b.length === 0) missing.push('B')
  if (c.length === 0) missing.push('C')
  if (missing.length > 0) {
    console.log(`  ✗ 这几种人生跑不出来：${missing.join('、')}`)
    failed += 1
  } else if (a.length > wanted.length * 0.5) {
    console.log('  ✗ 一半以上动过念头的人都走成了——那念头就是隐藏任务。')
    failed += 1
  } else {
    console.log('  四种都跑得出来，而且走成的是少数。')
    console.log('  **有一个念头 ≠ 必须实现这个念头。**')
  }
}

// —— 四、念头会退，不只会涨 ——
console.log('\n=== 四、念头不是一条经验条 ===\n')
{
  /**
   * 这一节从第三节那一批人生里读，不另起一轮。
   *
   * 从前它自己又跑两百世，而且跑的时候是**一律随机点选项**——
   * 等于把玩家当成一枚骰子。第三节那一批是按「心里存着念头的人
   * 更容易往前一步」模拟的，用它既省掉两百世，
   * 又顺带把那个骰子玩家去掉了。
   */
  const tally = new Map<string, number>()
  for (const life of lives) {
    for (const id of life.damped) tally.set(id, (tally.get(id) ?? 0) + 1)
  }

  if (tally.size === 0) {
    console.log(`  ✗ ${SAMPLED} 世里没有一个念头退过——那它就只是一条经验条。`)
    failed += 1
  } else {
    for (const [id, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
      const says = LEANINGS.find((item) => item.id === id)?.says ?? id
      console.log(
        `  ${String(((n / SAMPLED) * 100).toFixed(1)).padStart(5)}% 的人生里，这个念头被压过：${says}`,
      )
    }
    console.log('\n  他没有改主意，他只是走不开——而年复一年地走不开，')
    console.log('  跟改了主意其实差不多。')

    /**
     * 覆盖面自己报出来，别让读的人以为这是全貌。
     *
     * 眼下反向火种只写了「想离开」一个念头，于是上面那张表
     * 必然只有一行。**一行不是分布**——写死一句「好几个念头都会退」
     * 就成了替内容吹牛。这一行让缺口自己说话：以后补了别的念头的
     * 反向火种，它自己会变。
     */
    const covered = new Set(DAMPERS.map((d) => d.leaning))
    console.log(
      `\n  （反向火种眼下只写了 ${covered.size}/${LEANINGS.length} 个念头——` +
        `别的念头目前只会涨不会退，这是内容上的缺口，不是机制上的。）`,
    )
  }
}

// —— 五、压下去的时候，顶上来的是什么 ——
console.log('\n=== 五、一个念头退下去，接上的不是空白 ===\n')
{
  for (const damper of DAMPERS) {
    const from = LEANINGS.find((item) => item.id === damper.leaning)?.says ?? damper.leaning
    const to = damper.instead
      ? (LEANINGS.find((item) => item.id === damper.instead!.leaning)?.says ??
        damper.instead.leaning)
      : '（什么也没顶上来）'
    console.log(`  ${damper.text}`)
    console.log(`      ${from}　−${damper.weight}　→　${to}`)
    console.log()
  }
  console.log('  这跟认知系统里「解释可以往下掉」是同一个立场：')
  console.log('  **玩家对世界的认识会改变，玩家对自己想要什么的认识也会改变。**')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  念头改变的是他注意到什么、愿意试什么、能不能坚持——不是替他做决定。')
  console.log('  而世界不因为他想要什么而配合他。\n')
}
