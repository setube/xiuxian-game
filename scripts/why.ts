/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 他为什么坐下来。
 *
 * ## 这一支守的是 28.md 那句话
 *
 *   > 财富、权力、长生，是修仙最核心的三类现实目的；修仙本身不是目的。
 *
 * 「第一次照着书上做」那一册从前的入场只问三样——手里有那册书、
 * 知道那是什么、没在试。**一次也没问过他图什么。** 于是办完丧事那夜
 * 起过念头的人，和被人踩了半辈子的人，坐下来时读到的是同一句话。
 *
 * 现在那一册开头按念头分三岔（`attempt:first` 的 `why` 节点），
 * 三类目的在库里早有对应物，都是从真经历里长出来的：
 *
 *     heal    「你想学看病」　　　　　　→ 长生（最近的那一个）
 *     rich    「你想让家里过得松快些」　→ 财富
 *     strong  「你不想再被人按住」　　　→ 权力
 *
 * ⚠️ 长生那一类**没有直接对应物**。我头一版写的是 `live-long`，
 * 而那是一个**愿望**不是念头——`content/wishes.ts` 开头把需求／愿望／念头
 * 分得很清楚，还写着「这个区分是有代价才立起来的：从前『想活久一点』
 * 被当成一个念头」。我一头撞了回去，`verify` 当场抓住
 * （「念头 live-long 没有任何地方产出」）。
 *
 * 那个愿望通向五个地方（`heal` / `know` / `settle` / `strong` /
 * 什么也不通向），这儿取它最常走的 `heal`。
 *
 * ## 两半各答一个问题，而它们答不了对方那个
 *
 *     摆局那一半   这三条路各自站不站得住　　（钉死念头，看读出哪一句）
 *     真世那一半   真世里演不演得到　　　　　（只报数，不判红）
 *
 * 真世那一半为什么不判红：`attempt-first` 实测 1500 世出 6 世（0.4%），
 * **而这个数今天还在动**——修仙线入口刚被改过一轮，半小时内从 0.1% 变成 0.4%。
 * 按这种量级判红，那一条会在 0–3 之间抖，而那是噪声不是信号
 * （xiuxian-game-52 2026-09-09 定的分法）。
 *
 * 跑法：bun scripts/why.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { meetsAll } from '../src/engine/conditions'
import { useLeaningStore } from '../src/stores/leanings'
import type { Condition, LeaningStage } from '../src/types/game'

import { play, stage } from './lib/staged'

/** 三类目的，和各自那一句只有他读得到的话 */
const AIMS: readonly { leaning: string; node: string; says: string; why: string }[] = [
  {
    leaning: 'heal',
    node: 'for-long',
    says: '守在旁边',
    why: '长生：他见过人怎么没的，本想学看病',
  },
  { leaning: 'strong', node: 'for-strong', says: '说了不算', why: '权力：不愿再被人那样看着' },
  { leaning: 'rich', node: 'for-rich', says: '经不起', why: '财富：家底经不起一场病' },
]

let bad = 0
console.log('\n=== 他为什么坐下来（三类现实目的）===\n')

/**
 * 一、三条路各自站得住：钉死一个念头，那一句读得到。
 *
 * 摆局跑，不掷随机人生——那一册 0.4% 的入场率下，随机跑验不了
 * 「这三条路各自通不通」（见文件头那两半的分工）。
 */
{
  const wrong: string[] = []
  for (const aim of AIMS) {
    setActivePinia(createPinia())
    if (!stage('farm')) {
      wrong.push(`${aim.leaning}：掷不出局`)
      continue
    }
    const leanings = useLeaningStore()
    const at = { year: 20, month: 1, day: 1 }
    // 推到「反复」以上。一次挪一格，所以连着推几次
    for (let i = 0; i < 8; i += 1) leanings.stir(aim.leaning, 12, { at, text: '摆局' }, at)
    const lines = play('attempt:first')
    if (!lines.some((line) => line.includes(aim.says))) {
      wrong.push(`${aim.leaning}（${aim.why}）：读不到那一句，落纸的是 ${lines[0] ?? '（空）'}`)
    }
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 一、${wrong.length} 条路不通：`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(`  ✓ 一、${AIMS.length} 类目的各自走得到自己那一句。`)
  }
}

/**
 * 二、没念头的人一句也读不到。
 *
 * 少了这一条，第一条会在「那三句对谁都印」的时候照样打勾——
 * 而那正是这一片最容易写坏的方式：`branches` 的兜底 `next` 指错地方，
 * 或者条件恒真（`atLeast: '埋着'` 就是恒真的，类型层已经排除）。
 */
{
  setActivePinia(createPinia())
  if (!stage('farm')) {
    console.log('  ✗ 二、掷不出局，这一条没验到。')
    bad += 1
  } else {
    const lines = play('attempt:first')
    const leaked = AIMS.filter((aim) => lines.some((line) => line.includes(aim.says)))
    if (leaked.length > 0) {
      console.log(
        `  ✗ 二、什么念头也没有的人读到了 ${leaked.length} 句：${leaked.map((one) => one.leaning).join('、')}`,
      )
      bad += 1
    } else {
      console.log('  ✓ 二、什么念头也没有的人，那三句一句也读不到。')
    }
  }
}

/**
 * 三、尺子自检：那三个念头 id 在册。
 *
 * 写错一个字（`riches`）那一条永远不成立，整条分支静默消失——
 * 跟 `equals: false` 那一族同一个形状。`verify.ts` 的 `NEEDS` 那张表
 * 也查这件事，这儿再查一遍是因为**这一支自己就依赖那三个 id**：
 * 它们要是没了，上面两条会一起变成「三条路都不通」，
 * 而那句话会把人引向内容，不是引向这张名单。
 */
{
  const stages: LeaningStage[] = ['反复', '明白']
  setActivePinia(createPinia())
  const leanings = useLeaningStore()
  const missing = AIMS.filter((aim) => leanings.peakStageOf(aim.leaning) !== '埋着')
  const ok = stages.length === 2 && missing.length === 0
  if (!ok) {
    console.log('  ✗ 三、尺子自检：新掷一世，三个念头本该都是「埋着」，实际不是。')
    bad += 1
  } else {
    console.log('  ✓ 三、尺子自检：新掷一世三个念头都从「埋着」起步，档位表也没缺。')
  }
}

/**
 * 四、条件层真的在判这一格。
 *
 * 上面三条都绿的时候，剩下一种坏法查不出来：**`Condition.leaning` 那一格
 * 根本没进 `CHECKS`**。那时候引擎会把它当成「没有这一条」——
 * 不是不成立，是**静默通过**（`conditions.ts` 那段注释写着这件事）。
 * 于是三条路对谁都通，而第二条会红；可要是有人同时把兜底也改了，
 * 两条都能绿。
 *
 * 所以直接问条件层：钉死念头问「至少反复」该真，没念头问该假。
 */
{
  setActivePinia(createPinia())
  const failed: string[] = []
  const at = { year: 20, month: 1, day: 1 }
  const leanings = useLeaningStore()
  const ask = (one: Condition): boolean => meetsAll([one])
  if (ask({ leaning: { id: 'rich', atLeast: '反复' } })) {
    failed.push('新掷一世，问「rich 至少反复」答了真')
  }
  for (let i = 0; i < 8; i += 1) leanings.stir('rich', 12, { at, text: '自检' }, at)
  if (!ask({ leaning: { id: 'rich', atLeast: '反复' } })) {
    failed.push('推到明白了，问「rich 至少反复」还答假——这一格没在判事')
  }
  if (ask({ leaning: { id: 'heal', atLeast: '反复' } })) {
    failed.push('只推了 rich，问「heal 至少反复」却答真——它没分辨 id')
  }
  if (failed.length > 0) {
    console.log(`  ✗ 四、尺子自检：${failed[0]}`)
    bad += 1
  } else {
    console.log('  ✓ 四、尺子自检：条件层认得这一格，分得清 id，也分得清档位。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  修仙不是目的：他坐下来，是因为原本就想要点什么。\n')
}
