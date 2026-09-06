/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一生跑得完，而且每一段都真的有人在过。
 *
 * 跑法：`bun scripts/lifelong.ts`
 *
 * ## 这一道是被「十六岁结束」逼出来的
 *
 * 上一版人生停在十六岁那年的渡口：演完 `finish()`，卷终。那个结构
 * 在替玩家回答一个他没问过的问题——**「你这一生能不能在十六岁以前
 * 接触到修仙？」**——而只要那是唯一的出口，前面的家庭、谋生、教育、
 * 疾病、灾荒、人际、迁徙就全成了一道入门检测的前置步骤。
 *
 * 那条规则拿掉之后，终点换成了天年（`engine/lifespan.ts` 出生那天掷的数）。
 * 换完之后有一批新问题，全都是**只有真跑一遍才看得见**的：
 *
 *     跑不跑得完　　　　　年表抽事、日常耗时、再抽事——这个圈会不会不停
 *     后半生有没有内容　　十七岁之后年表几乎是空的，三卷日常独自撑着
 *     修行还碰不碰得上　　窗口收到 16–28、加了命数门槛之后，会不会没人碰得上
 *
 * ## 跟 `verify.ts` 第六道的分工
 *
 * 那一道判**结构**：六个格子是不是真的六个，终点是不是真的一个。
 * 静态判得死死的，一个随机数也不掷。
 *
 * 这一道判**存在**：每一格是不是真的有人停在那儿。这件事静态判不了——
 * 一卷「可以被走到」和「真有人走到」是两回事，中间隔着权重、条件、
 * 和这个人前面几十年攒下的东西。**存在性只能跑出来。**
 *
 * ## 判据一个具体数也不写死
 *
 * 这一道量出来的东西全都会漂：内容一多，寿命分布跟着变；日常的选项
 * 一改，命数涨得快慢就变，能走到渡口的人跟着变。所以判据一个具体数
 * 也不认，只守住四样谁也不该跌破的：
 *
 *     每一世都走得到终点　　　跑不完就是死循环，那是引擎坏了
 *     每一档都有人停在那儿　　有一档是 0，那一档的内容就没人读得到
 *     临终那几节都有人走到　　分支次序写错，后面那一节会被整个盖住
 *     修行不是 0% 也不是 100%　0% 是碰不上，100% 是又变回必经的检测
 *
 * 具体的数照样打印出来给人读——**给人读的数和用来判的数是两回事**，
 * 前者越细越好，后者一细就会在某次无关的改动里假红。
 */
import './lib/seeded'

import { lifeFinale, lifeRoutine } from '../src/content/life'
import { mapShards, sumTallies } from './lib/parallel'
import { CULTIVATION_CHAPTER, partings, TURN_CEILING, type Tally } from './tasks/lifelong-lives'

/**
 * 跑多少世。
 *
 * 比 `verify.ts` 那边的三百世多一倍，理由是这一道有两格特别稀：
 * **启蒙和少年那两档的日常几乎没人停得到**——七到十六岁那几年年表塞得很满
 * （开蒙、那一日、离村、寻访、师承、照面全挤在这几岁），候选池难得空一次。
 *
 * 六千世量下来：启蒙停过 12 世，少年停过 8 世。**这仍然是个位数**，
 * 也就是说「不是 0」这条判据靠的是一个泊松尾巴：λ≈8 的时候
 * 恰好一世也没停的概率是 e⁻⁸，约莫三千分之一。三百世那会儿
 * λ≈4，假红率跳到五十分之一——那个量级会真的在无关的改动里红一次，
 * 翻倍是为了把它压回可以忽略的那一档，不是为了让它变成两位数。
 *
 * 这两个数会漂（往后半生补内容、或者给七到十六岁减两件事，它就变）。
 * **它们是定这个数的出处，不是判据本身**——判据一个具体数也不认，
 * 只认「不是 0」。内容大改之后这里该重新量一次，而不是照抄 600：
 * 真正该看的是最稀那一格还剩几世，不是这里写着几百。
 */
const RUNS = 6000

// ============================================================
// 判
// ============================================================

/** 一、一生跑得完，而且是在终点停下的 */
function runsToEnd(tally: Tally): string[] {
  const wrong: string[] = []
  if (tally.stalled > 0) {
    wrong.push(
      `${tally.stalled} 世按满了 ${TURN_CEILING} 下还没走完——` +
        '年表抽事、日常耗时、再抽事，这个圈没有停下来。',
    )
  }
  if (tally.reachedFinale !== tally.runs) {
    wrong.push(
      `${tally.runs - tally.reachedFinale} 世没走到落幕（${lifeFinale}）就停了——` +
        '人生只该有一个终点，别的地方停下就是有第二个出口。',
    )
  }
  return wrong
}

/** 二、每一档都得有人真的停在那儿 */
function everyStageLived(tally: Tally): string[] {
  const empty = Object.entries(lifeRoutine).filter(([, sceneId]) => !tally.lives.get(sceneId))
  if (empty.length === 0) return []
  return empty.map(
    ([stage, sceneId]) =>
      `「${stage}」这一档 ${tally.runs} 世里一个人也没停过（${sceneId}）——` +
      '那一卷写了，可没人读得到。',
  )
}

/**
 * 三、临终身边那几种情形，每一种都得有人走到。
 *
 * 跟第二道是同一件事，换了个地方问：落幕开场按「身边有没有人」分流，
 * 分出来的每一节都是一格，**一格没人停就是一段没人读得到的内容**。
 *
 * 这一条是补上去的，头一次跑就红了：`spouse` 六千世一个人也没走到。
 * 顺着红灯查下去，真因不在落幕那一卷，在两层之外的
 * `engine/conditions.ts`——`bond` 从前有一句「一条边也没有就直接不成立」，
 * 于是「说一门亲事」那个 `{ 配偶, alive: false }` 的开关问的是「鳏寡」
 * 而不是「未婚」，**全库没有一个人娶得成**。没有配偶就没有生养，
 * 子、女、配偶三节同时是死的，四条分支里真正在分流的只有徒弟那一条。
 *
 * 值得记的是这一道**怎么**抓到它的：它没有去读条件求值那一层，
 * 它只问了一句「这一节有没有人走到」。一句引擎里的短路，
 * 三卷内容哑掉，一个错也不报——**静态判据看不见这种病，
 * 因为每一节都写得好好的，只是没有人走得到。**
 */
function everyPartingLived(tally: Tally): string[] {
  if (partings.length === 0) {
    return [`落幕（${lifeFinale}）的开场一条分流也没有——这一道没有东西可以量`]
  }
  return partings
    .filter((node) => !tally.partings.get(node))
    .map(
      (node) =>
        `落幕的「${node}」这一节 ${tally.runs} 世里一个人也没走到——` +
        '前面某一条分支把它整个盖住了。',
    )
}

/**
 * 四、修行是走出来的。
 *
 * 两头都守，因为两头都是同一种病的两个方向：
 *
 *     0%　　 门槛太高，这条路等于不存在，写了也白写
 *     100%　 人人必经，那就又变回了「十六岁那道检测」，只是挪了个岁数
 *
 * 中间那个数是多少不判——它一定会漂：日常里涨命数的选项多两个，
 * 比例就往上走；渡口的窗口收一岁，就往下走。**会漂的数不写进判据。**
 */
function cultivationIsWalkedTo(tally: Tally): string[] {
  if (tally.metCultivation === 0) {
    return [
      `${tally.runs} 世里没有一个人走到过修行那一卷（${CULTIVATION_CHAPTER}）——` +
        '门槛高到这条路等于不存在。',
    ]
  }
  if (tally.metCultivation === tally.runs) {
    return [
      `${tally.runs} 世里人人都走到了修行那一卷——` +
        '那不是一条稀有的路，那是一道人人必经的检测，只是挪了个岁数。',
    ]
  }
  return []
}

// ============================================================
// 四、尺子自检
// ============================================================

/**
 * 上面三道判的都是跑出来的数，而**跑出来的数天然会让人放松警惕**：
 * 满屏都是真实样本，看着就像在工作。所以先拿手工捏的账本喂一遍判据，
 * 看它红不红在该红的地方。
 *
 * 底样是一份「一切正常」的账本，三道都该绿；六个变体各只捏坏一处。
 */
function ruler(): string[] {
  const wrong: string[] = []
  const stages = Object.entries(lifeRoutine)
  const healthy: Tally = {
    runs: 100,
    stalled: 0,
    reachedFinale: 100,
    stops: new Map(stages.map(([, sceneId]) => [sceneId, 300])),
    lives: new Map(stages.map(([, sceneId]) => [sceneId, 100])),
    partings: new Map(partings.map((node) => [node, 30])),
    metCultivation: 30,
    rolled: [60],
    died: [60],
    turns: 1000,
  }

  const check = (
    what: string,
    gate: (tally: Tally) => string[],
    tally: Tally,
    shouldBeRed: boolean,
  ): void => {
    const red = gate(tally).length > 0
    if (red !== shouldBeRed) {
      wrong.push(`「${what}」该${shouldBeRed ? '红' : '绿'}，实际${red ? '红' : '绿'}了`)
    }
  }

  check('底样：一生跑得完', runsToEnd, healthy, false)
  check('底样：每一档都有人停', everyStageLived, healthy, false)
  check('底样：临终那几节都有人走到', everyPartingLived, healthy, false)
  check('底样：修行是走出来的', cultivationIsWalkedTo, healthy, false)

  check('有世按满了回合上限', runsToEnd, { ...healthy, stalled: 1 }, true)
  check('有世没走到落幕', runsToEnd, { ...healthy, reachedFinale: 99 }, true)

  const firstStage = stages[0]
  if (!firstStage) {
    wrong.push('日常一档都没有——这把尺子没有东西可以量')
  } else {
    const [, firstScene] = firstStage
    const holed = new Map(healthy.lives)
    holed.delete(firstScene)
    check('有一档日常没人停过', everyStageLived, { ...healthy, lives: holed }, true)
  }

  const firstParting = partings[0]
  if (!firstParting) {
    wrong.push('落幕一条分流也没有——这把尺子没有东西可以量')
  } else {
    const shadowed = new Map(healthy.partings)
    shadowed.delete(firstParting)
    check('落幕有一节被盖住了', everyPartingLived, { ...healthy, partings: shadowed }, true)
  }

  check('没人走到修行那一卷', cultivationIsWalkedTo, { ...healthy, metCultivation: 0 }, true)
  check(
    '人人都走到修行那一卷',
    cultivationIsWalkedTo,
    { ...healthy, metCultivation: healthy.runs },
    true,
  )

  return wrong
}

// ============================================================
// 报数
// ============================================================

function quantile(values: readonly number[], at: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * at))] ?? 0
}

function spread(label: string, values: readonly number[]): string {
  if (values.length === 0) return `${label}：没有样本`
  return (
    `${label}：最短 ${Math.min(...values)}　四分之一 ${quantile(values, 0.25)}　` +
    `中位 ${quantile(values, 0.5)}　四分之三 ${quantile(values, 0.75)}　最长 ${Math.max(...values)}`
  )
}

console.log('一生门禁：跑得完，而且每一段都真的有人在过\n')

const tally = sumTallies(
  await mapShards<Tally>({ task: 'scripts/tasks/lifelong-lives.ts', runs: RUNS }),
)

console.log(
  `跑了 ${tally.runs} 世，一共按了 ${tally.turns} 下（每世约 ${Math.round(tally.turns / tally.runs)} 下）。\n`,
)
console.log(`  ${spread('掷定的天年', tally.rolled)}`)
console.log(`  ${spread('咽气的岁数', tally.died)}`)
console.log(
  `\n  走到落幕的 ${tally.reachedFinale} 世，按满回合上限的 ${tally.stalled} 世，` +
    `走到修行那一卷的 ${tally.metCultivation} 世` +
    `（${((tally.metCultivation / tally.runs) * 100).toFixed(1)}%）。\n`,
)

console.log('  每一档日常各有多少人停过、一共停了多少回：\n')
for (const [stage, sceneId] of Object.entries(lifeRoutine)) {
  const lives = tally.lives.get(sceneId) ?? 0
  const stops = tally.stops.get(sceneId) ?? 0
  console.log(
    `    ${stage}　${String(lives).padStart(3)} 世停过　${String(stops).padStart(5)} 回　${sceneId}`,
  )
}
console.log('')

console.log('  临终身边有没有人，落幕那几节各收了多少世：\n')
for (const node of partings) {
  const held = tally.partings.get(node) ?? 0
  console.log(
    `    ${node.padEnd(8)}${String(held).padStart(4)} 世　${((held / tally.runs) * 100).toFixed(1)}%`,
  )
}
console.log('')

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、一生跑得完，而且是在终点停下的', run: () => runsToEnd(tally) },
  { name: '二、每一档都有人真的停在那儿', run: () => everyStageLived(tally) },
  { name: '三、临终那几节都有人走到，没有一节被盖住', run: () => everyPartingLived(tally) },
  { name: '四、修行是走出来的，不是发下来的', run: () => cultivationIsWalkedTo(tally) },
  { name: '五、尺子自检', run: ruler },
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
  console.log(
    '五道全过。\n\n' +
      '  这一道只判「有没有人走到」。走到的那一卷读起来好不好、\n' +
      '  后半生的内容够不够密，判不了——十七岁之后年表几乎是空的，\n' +
      '  三卷日常眼下独自撑着人生后半段，那是一处明写的缺口，不是一处故障。',
  )
}
