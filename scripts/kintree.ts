/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 人际面板上那张世系图，摆得对不对。
 *
 * ## 这一支守的是「辈分从边上算出来，不从年纪猜」
 *
 * 世系图的纵轴是辈分。辈分有一个看起来很省事的算法：**按年纪排**——
 * 比我大一截的是长辈，差不多的是同辈。它在绝大多数世里都对，
 * 然后在「叔叔比侄子小」那一世里错得毫无征兆。
 *
 * `engine/kinTree.ts` 不猜年纪，它沿着边走：我 →兄 哥 →(反着走)生父 侄儿。
 * 这一支就是来验这条路真的走得通的——而它只在**真跑出一个侄儿来**的世里
 * 才验得到，构造数据量不到（侄儿要哥先娶亲、再生子、再长大）。
 *
 * ## 跟 `scripts/note.ts` 分工
 *
 * 那一支守面板上那一行字（「他现在怎么样」）。这一支守面板上那张图
 * （「谁跟谁是什么关系」）。同一个面板的两半，坏法完全不同。
 *
 * 跑法：bun scripts/kintree.ts
 */
import './lib/seeded'

import { kinTreeOf } from '../src/engine/kinTree'
import type { Relation } from '../src/types/game'

import { mapShards, sumTallies } from './lib/parallel'
import { rankOf, type KinTreeShard, type Offence } from './tasks/kintree-lives'

/**
 * 走多少世。
 *
 * 这一支要等的是**哥娶亲、生子、侄儿长大**那一串——三百世下采得到几十个，
 * 够第二、三条踩实。第五条会把实际采到多少印出来，采不够会红。
 */
const RUNS = 300

/** 一个人在图上落在第几辈。不在图上就是 undefined */
// 这一段原样搬去了 tasks/kintree-lives.ts，走法和采样点一步没动。
// 判据、阈值、以及八条尺子自检全留在这儿——它们是这支门禁的结论，不是实现细节
const chart = sumTallies(
  await mapShards<KinTreeShard>({ task: 'scripts/tasks/kintree-lives.ts', runs: RUNS }),
)
const {
  sawParents,
  sawNephew,
  sawInLaw,
  sawCouple,
  sawSibling,
  sawChild,
  seats,
  worlds,
  wrongElders,
  wrongNephew,
  wrongInLaw,
  looseKin,
  danglingEdge,
  strangerOnChart,
  noCoupleLine,
  siblingAdrift,
  childAdrift,
} = chart

console.log(`\n=== 人际面板的世系图（${RUNS} 世）===\n`)

let bad = 0

function report(offences: Offence[], headline: string, why: string): void {
  if (offences.length === 0) return
  console.log(`  ✗ ${offences.length} 处${headline}：`)
  for (const one of offences.slice(0, 5)) {
    console.log(`      ${one.what.padEnd(14)}${one.detail}`)
  }
  console.log(`    ${why}`)
  bad += 1
}

report(wrongElders, '爹娘的辈分不对', '生父生母那条边推 -1，这是世系图最基本的一格。')
report(
  wrongNephew,
  '侄儿的辈分不对',
  '侄儿的辈分靠「侄儿→哥 生父」反着走算出来（`life/nephew.ts` 定的那条边）。',
)
report(
  wrongInLaw,
  '嫂子没跟哥站在一辈',
  '哥跟嫂子之间那条「配偶」边（`life/kindred.ts` 办喜事那一节）没牵上，或者没推辈分。',
)
report(danglingEdge, '线的一头不在图上', '边和座位是同一次算出来的，对不上就是 `kinTreeOf` 漏了。')
report(strangerOnChart, '图上站着玩家不认识的人', '这张图是玩家自己那本册子，不是世界的人口志。')
report(looseKin, '近亲掉出了世系', '爹娘、侄儿都该有辈分。掉进图外那一栏说明辈分没算出来。')
report(
  noCoupleLine,
  '爹娘之间没有夫妻线',
  '那条边在 `content/birth.ts` 出生那一刻牵（`bind(dad, mum, 配偶)`）。',
)
report(
  siblingAdrift,
  '兄弟姐妹没连到爹娘',
  '出身自带的在 `content/birth.ts`，后来添的在 `engine/effects.ts` 的 `meet`，两处都要牵。',
)
report(
  childAdrift,
  '我的孩子没连到我的配偶',
  '那条边在 `engine/effects.ts` 的 `meet` 里牵（`bind(孩子, 配偶, 生父/生母)`）。',
)

/*
 * 六、上面几条得真有人踩在上头。
 *
 * 一世也没采到侄儿的话，第二条会安安静静地全绿——**没查到和查过了长得一模一样。**
 */
if (sawNephew === 0) {
  console.log(
    `  ✗ ${RUNS} 世里一个侄儿也没长出来，第二条根本没被验过。` +
      `\n    「沿图走而不是猜年纪」这件事只在有侄儿的世里才验得到。`,
  )
  bad += 1
}
if (sawInLaw === 0) {
  console.log(`  ✗ ${RUNS} 世里哥一次亲也没娶，第三条根本没被验过。`)
  bad += 1
}
if (sawParents === 0) {
  console.log(`  ✗ ${RUNS} 世里没读到一对爹娘，第一条根本没被验过。`)
  bad += 1
}
if (sawCouple === 0) {
  console.log(`  ✗ ${RUNS} 世里没有一世爹娘俱在图上，夫妻线那一条根本没被验过。`)
  bad += 1
}
if (sawSibling === 0) {
  console.log(`  ✗ ${RUNS} 世里没采到一个兄弟姐妹，同源那一条根本没被验过。`)
  bad += 1
}
if (sawChild === 0) {
  console.log(`  ✗ ${RUNS} 世里没有一世是「成了家又有孩子」的，孩子连配偶那一条根本没被验过。`)
  bad += 1
}

console.log(
  `  覆盖：${worlds} 世 / 图上共 ${seats} 个座位（平均每世 ${(seats / Math.max(worlds, 1)).toFixed(1)} 个）\n` +
    `        采到爹娘 ${sawParents} 次 / 侄儿 ${sawNephew} 次 / 嫂子 ${sawInLaw} 次 / ` +
    `爹娘俱在 ${sawCouple} 次 / 兄弟姐妹 ${sawSibling} 次 / 我的孩子 ${sawChild} 次` +
    `　（采样点：咽气那年，图上人最全的一刻）`,
)

/**
 * 七、尺子自检：把摆错的图放到跟前，判据必须认出来。
 *
 * 三条判据各配一个反例。不自检的话它们可能全是空的——`rankOf` 找错了字段、
 * 判据里的 id 拼错一个字母，都会让上面那几条一声不吭地绿着。
 */
{
  const checks: {
    name: string
    relations: Relation[]
    known: string[]
    /** 查谁的辈分。跟 `known` 分开，因为有的用例 `known` 就是空的 */
    who: string
    expect: string
  }[] = []
  const edge = (from: string, to: string, bond: Relation['bond']): Relation => ({
    id: `${from}-${to}-${bond}`,
    from,
    to,
    bond,
    since: 0,
    until: null,
  })

  checks.push({
    name: '姐姐把你养大，她仍是同辈',
    relations: [edge('me', 'sister', '姐'), edge('me', 'sister', '抚养')],
    known: ['sister'],
    who: 'sister',
    expect: '0',
  })
  checks.push({
    name: '老乞丐把你养大，他是长辈',
    relations: [edge('me', 'beggar', '抚养')],
    known: ['beggar'],
    who: 'beggar',
    expect: '-1',
  })
  checks.push({
    name: '侄儿低哥一辈',
    relations: [edge('me', 'brother', '兄'), edge('nephew', 'brother', '生父')],
    known: ['brother', 'nephew'],
    who: 'nephew',
    expect: '1',
  })
  /*
   * 没见过面的爹也在谱上。
   *
   * 弃儿那一世的真实形状：`known` 是空的（他在你出生前就殁了，从没 meet 过），
   * 只有一条血缘边。这一条守的是 `whoIsOnChart` 那条补丁——
   * 没有它，图上会缺一整辈，而缺了不会有任何判据出声。
   */
  checks.push({
    name: '没见过面的爹仍在谱上',
    relations: [edge('me', 'father', '生父')],
    known: [],
    who: 'father',
    expect: '-1',
  })
  /*
   * 补一跳，不级联。
   *
   * 爹的爹跟我之间没有直接的边，他不该被顺着爬进来——这一条一旦失守，
   * 整个世界的人口志都会爬上这张图。
   */
  checks.push({
    name: '爹的爹不跟着爬进来',
    relations: [edge('me', 'father', '生父'), edge('father', 'grandpa', '生父')],
    known: [],
    who: 'grandpa',
    expect: 'undefined',
  })

  const failed: string[] = []
  for (const check of checks) {
    const tree = kinTreeOf({ relations: check.relations, known: check.known })
    const at = rankOf(tree, check.who)
    if (String(at) !== check.expect) {
      failed.push(`${check.name}（该是第 ${check.expect} 辈，算出来是 ${at}）`)
    }
  }

  /*
   * 「嫂子那条边拿掉就该红」——这一条自检的是第三条判据本身。
   * 没有它，第三条可能是恒真的：只要 `kinTreeOf` 把任何人都放进世系，它就永远绿。
   */
  const noSpouse = kinTreeOf({
    relations: [edge('me', 'brother', '兄'), edge('me', 'brother-wife', '亲戚')],
    known: ['brother', 'brother-wife'],
  })
  if (rankOf(noSpouse, 'brother-wife') !== undefined) {
    failed.push('拿掉配偶边之后嫂子还站在世系里，第三条查不出那条边缺没缺')
  }

  /*
   * 姐姐养大你，两人之间不许有亲子线。
   *
   * 这一条自检的是 `edgeKind` 那个「看辈分差、不只看 bond」的判法。
   * 头一版只按 bond 判，`抚养` 一律画亲子线，于是图上两个并排站着的同辈人
   * 之间垂下来一条亲子线，从姐姐脚底拐个弯又爬回我头顶——
   * 而这个坏法只在「姐姐是抚养人」那种出身里出，别的世里一辈子看不到。
   */
  const raisedBySister = kinTreeOf({
    relations: [edge('me', 'sister', '姐'), edge('me', 'sister', '抚养')],
    known: ['sister'],
  })
  const wrongLine = raisedBySister.edges.find((one) => one.kind === '亲子')
  if (wrongLine !== undefined) {
    failed.push(`姐姐养大你，图上却从 ${wrongLine.a} 到 ${wrongLine.b} 画了一条亲子线`)
  }

  /* 「仇」这类私密边不该画出来：两头都认得，也不等于玩家知道他俩有旧怨 */
  const secret = kinTreeOf({
    relations: [edge('me', 'a', '兄'), edge('me', 'b', '弟'), edge('a', 'b', '仇')],
    known: ['a', 'b'],
  })
  const between = secret.edges.filter((one) => [one.a, one.b].sort().join(' ') === 'a b')
  if (between.length > 0) {
    failed.push(`两个人之间那条「仇」被画成了 ${between[0]!.kind} 线`)
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检（${checks.length + 3} 条反例）：姐姐抚养仍同辈、老乞丐是长辈、侄儿低一辈、` +
        `没见过面的爹仍在谱上、爹的爹不跟着爬进来；\n` +
        `    拿掉配偶边嫂子立刻掉出世系（第三条不是恒真的），姐姐养大你不画亲子线，` +
        `两人之间那条「仇」不画。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  世系图上每个人都站在他该站的那一辈。')
  console.log('  **辈分是从边上算出来的，不是从年纪猜的——叔叔可以比侄子小。**\n')
}
