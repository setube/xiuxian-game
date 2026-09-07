/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 这次说的话，他早就知道了。
 *
 * 33.md 的硬规则：**同一人物、同一主题、同一阶段下，不应反复提供玩家已经知道
 * 且没有新增意义的信息。**
 *
 * ## 规格里那条「七选一」不能照抄
 *
 * 33.md 说每次交互要「在信息、关系、行动、认知、**时间**、状态或未来可能性中的
 * 至少一个维度产生有效增量」。照这条写判据，它永远是绿的——库里 220 个选项挂着
 * **321 个 `time` 效果**，时间效果比选项还多。「七选一」这道门槛，任何一个推进
 * 时间的选项都自动跨过，也就是全部。
 *
 * 所以这一支**明确把时间排除在增量之外**。这是对规格的一处有意偏离：
 * 规则写得不可证伪，照着写出来的门禁会印着漂亮报表而什么也没量。
 *
 * ## 判据也不能问「玩家是不是已经知道这条」
 *
 * 那会把征象系统整层判红。`Signs` 恰恰是让不同的人读到同一件世界事实的不同侧面
 * （同一场旱灾，农民看粮价、商户看囤货、官员看赈济）——**那是对的**，
 * 而它在知识库上的表现就是「同一条知识被反复触及」。
 *
 * ## 引擎自己已经把这件事判出来了，判完扔了
 *
 * `character.ts:583` 的 `learn()`：三格（`summary`/`contact`/`interpretation`）
 * 但凡有一格不同就往 `history` 追一条，全同就 `return 'known'` 什么也不做。
 * 而 `effects.ts` 那一头：
 *
 *     if (outcome === 'new')      record(`得知 · ${title}`)
 *     if (outcome === 'detailed') record(`明白了 · ${title}`)
 *     return null                 // ← 'known' 掉到这儿，玩家什么也看不见
 *
 * **`'known'` 就是「这次接触没带来任何增量」，引擎算出来了，然后丢掉。**
 * 那正是 33.md 要防的那件事，判据直接问它。
 *
 * 顺带一件：判据不能问「history 里有没有重复的三元组」——`learn()` 结构上就不
 * 允许那种东西存在（全同则不追加），那样的判据永远绿。测量对象被上游填平了。
 *
 * ## 为什么问白说率而不是白说次数
 *
 * 实测三颗种子各 80 世：白说 10 / 22 / 8 次，**方差近三倍**。拿绝对次数当阈值
 * 会随机红，而一支会无故红的门禁比没有门禁更坏——它训练人无视它。
 *
 * 而白说率跟触及次数**不相关**，这一点让判据站得住（120 世实测）：
 *
 *     the-pedlar-book    触及 189 次    白说  1 次    1%   ← 触及最多，几乎不白说
 *     those-who-left     触及  29 次    白说  8 次   28%   ← 触及不多，四次里一次白说
 *
 * 所以「触及得多」不是白说的借口。问的是**这一条自己的白说率**。
 *
 * 跑法：bun scripts/repetition.ts
 */
import './lib/seeded'

import { mapShards, sumTallies } from './lib/parallel'
import { type RepetitionShard } from './tasks/repetition-lives'

const RUNS = 240

/**
 * 一条知识白说到几成算过。
 *
 * 三成半不是拍的。240 世三颗种子实测，白说率最高的那几条稳定是同一批：
 *
 *     the-side-path     26.3%   19.0%   24.2%
 *     day-labour        15.4%   18.6%   20.0%
 *     those-who-left    18.2%   17.1%   18.2%
 *     forbidden-page    14.3%   17.5%   14.0%
 *
 * 它们确实是同一段日常反复触发、每次写死同一组 `contact`/`interpretation`
 * （见 `content/days.ts` 那几处）。门槛设在最高值之上留约九个百分点——
 * 意思是「现状全部放过，再坏一点就拦」。**这一支守的是不许继续变坏，
 * 不是要求现在就干净。**
 *
 * 往下调会把现有内容判红；往上调则要等到一条知识说三遍有一遍白说才拦得住。
 *
 * 余量是照 240 世定的。**世数砍了这个门槛就不作数了**——120 世下同一批条目
 * 量出来是 28% 和 29%，离门槛只剩六个百分点。样本越少方差越大，
 * 这一格跟 `RUNS` 是绑在一起的。
 */
const TOO_REPETITIVE = 0.35

/** 白说次数少于这个数的条目不参与判定：两次里白说一次也是 50%，那是噪声不是毛病 */
const ENOUGH_HITS = 12

interface Verdict {
  id: string
  hits: number
  known: number
  rate: number
}

/** 判据本身。写成函数，底下第四条要拿手写的坏数据喂它 */
function tooRepetitive(rows: readonly { id: string; hits: number; known: number }[]): Verdict[] {
  return rows
    .filter((row) => row.hits >= ENOUGH_HITS)
    .map((row) => ({ ...row, rate: row.known / row.hits }))
    .filter((row) => row.rate > TOO_REPETITIVE)
    .sort((a, b) => b.rate - a.rate)
}

const tally = sumTallies(
  await mapShards<RepetitionShard>({ task: 'scripts/tasks/repetition-lives.ts', runs: RUNS }),
)

/** 合并回来是两张按键相加的表：触及一张，白说一张 */
const rows = [...tally.touched].map(([id, hits]) => ({
  id,
  hits,
  known: tally.repeated.get(id) ?? 0,
}))

console.log(`\n=== 这次说的话，他早就知道了（${RUNS} 世）===\n`)
let bad = 0

/**
 * 一、没有哪一条知识反复被白说。
 */
{
  const guilty = tooRepetitive(rows)
  if (guilty.length > 0) {
    console.log(`  ✗ 一、${guilty.length} 条知识说了等于没说，超过 ${TOO_REPETITIVE * 100}%：`)
    for (const one of guilty.slice(0, 10)) {
      console.log(
        `      ${one.id}　触及 ${one.hits} 次，白说 ${one.known} 次（${(one.rate * 100).toFixed(0)}%）`,
      )
    }
    bad += 1
  } else {
    console.log(
      `  ✓ 一、${rows.length} 条知识里没有一条白说率超过 ${TOO_REPETITIVE * 100}%（判定了其中触及满 ${ENOUGH_HITS} 次的 ${rows.filter((r) => r.hits >= ENOUGH_HITS).length} 条）。`,
    )
  }
}

/**
 * 二、尺子自检：这一批世里真的量到了「白说」这件事。
 *
 * 缺了这一条，第一条会在「一次白说也没掷到」的时候照样打勾——
 * **没查到和查过了长得一模一样**。而白说本身是稀有的（实测率 0.6%–1.7%），
 * 这一条比在别的门禁里更要紧。
 */
{
  const total = rows.reduce((sum, row) => sum + row.known, 0)
  const hits = rows.reduce((sum, row) => sum + row.hits, 0)
  if (total === 0) {
    console.log(`  ✗ 二、${RUNS} 世里一次白说也没采到——这一条什么也没量。`)
    bad += 1
  } else {
    console.log(`  ✓ 二、尺子自检：${hits} 次接触里采到 ${total} 次白说，判据量到了东西。`)
  }
}

/**
 * 三、尺子自检：判据跟被测对象是连着的。
 *
 * 这一条跟第二条不是一回事。第二条证明「读到了东西」，这一条证明
 * **判据对读到的东西真的会反应**——拿这一批真数据里最脏的那一条，
 * 把它的白说次数抬到门槛之上，判据必须抓到它。
 *
 * 光有第四条那种手写数据的自检是不够的：那只证明「这个函数对这五组输入返回预期值」，
 * 文件读空了、分片合错了、`touched` 是个空 Map，它照旧绿。
 */
{
  /*
   * 挑「判据真正会看的那些条目」里最脏的一条。
   *
   * 不能直接按率排全表：`hits` 不足 `ENOUGH_HITS` 的条目率可以高到 100%
   * （两次里白说两次），而判据压根不看它们。拿那种条目做自检，
   * 等于**在测一条判据永远不会读的数据**，抬到 100% 它也不该红——
   * 于是这一条自检会反过来诬告判据。
   */
  const judged = rows.filter((row) => row.hits >= ENOUGH_HITS)
  const worst = [...judged].sort((a, b) => b.known / b.hits - a.known / a.hits)[0]
  if (!worst) {
    console.log(`  ✗ 三、没有一条知识触及满 ${ENOUGH_HITS} 次，判据没有可读的数据。`)
    bad += 1
  } else {
    // 把真数据里最脏那条改成次次白说，判据必须抓到它
    const spiked = rows.map((row) => (row.id === worst.id ? { ...row, known: row.hits } : row))
    const caught = tooRepetitive(spiked).some((one) => one.id === worst.id)
    if (!caught) {
      console.log(`  ✗ 三、把「${worst.id}」改成次次白说，判据没抓到——判据没接在数据上。`)
      bad += 1
    } else {
      console.log(
        `  ✓ 三、尺子自检：把真数据里的「${worst.id}」（触及 ${worst.hits} 次）改成次次白说，判据当场抓到。`,
      )
    }
  }
}

/**
 * 四、尺子自检：喂坏数据抓得到，喂对的放得过。
 *
 * **第三格最要紧**：`the-pedlar-book` 那种触及一百八十九次、白说一次的条目
 * 是征象系统的正常样子——同一件事从不同侧面被反复读到。判据要是把它判红，
 * `Signs` 那一层会整层红，而那一层是对的。
 */
{
  const checks: readonly {
    row: { id: string; hits: number; known: number }
    want: boolean
    why: string
  }[] = [
    { row: { id: '次次白说', hits: 20, known: 20 }, want: true, why: '说二十遍没有一遍带新东西' },
    { row: { id: '过半白说', hits: 20, known: 12 }, want: true, why: '六成白说，该拦' },
    {
      row: { id: '征象多视角', hits: 189, known: 2 },
      want: false,
      why: '同一件世界事实的不同侧面——这是对的，不能判红',
    },
    { row: { id: '刚好在线上', hits: 20, known: 7 }, want: false, why: '35% 是门槛，不超过就放过' },
    {
      row: { id: '样本太少', hits: 2, known: 2 },
      want: false,
      why: '两次里白说两次是噪声，不是毛病',
    },
  ]

  const broken = checks.filter((one) => tooRepetitive([one.row]).length > 0 !== one.want)
  if (broken.length > 0) {
    console.log(`  ✗ 四、尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) {
      console.log(
        `      〔${one.row.id}〕${one.row.hits} 触及 / ${one.row.known} 白说，应${one.want ? '红' : '放'}——${one.why}`,
      )
    }
    bad += 1
  } else {
    console.log(`  ✓ 四、尺子自检：次次白说抓得到，征象的多视角和样本不足都放得过。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  每一次开口都得带来点什么，哪怕只是一句更笃定的话。\n')
}
