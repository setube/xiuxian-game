/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 机缘五节点走查。
 *
 *   注意 → 理解 → 兴趣 → 行动 → 世界回应
 *
 * 验收标准：`omen:wounded` 必须跑得出这六种人生，尤其 B、C、D。
 *
 *   A 看见 → 判断对 → 有兴趣 → 行动 → 成功
 *   B 看见 → 判断错 → 有兴趣 → 行动 → 发现自己判断错了
 *   C 看见 → 判断错 → 没兴趣 → 离开 → 一生不知道真相
 *   D 看见 → 判断对 → 有兴趣 → 行动 → 但行动失败
 *   E 看见 → 判断对 → 没兴趣 → 离开
 *   F 看见 → 判断错 → 有兴趣 → 行动 → 世界回应完全超出预期
 *
 * B 证明**理解可以错误**，C 证明**机会不等于命运**，
 * D 证明**行动不保证结果**。这三件成立，「机缘不是抽奖」才算落地。
 *
 * 跑法：npx vite-node scripts/wounded.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import {
  glance,
  resolve,
  rollTruth,
  truthToReading,
  type Approach,
  type WoundedTruth,
} from '../src/engine/wounded'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'

const RUNS = 4000

/** 行动失败或半途而废的那些结局 */
const FAILURES = new Set([
  'lift-fail-disciple',
  'lift-fail-fighter',
  'lift-half-fighter',
  'lift-half-hunter',
  'help-gone',
])

/** 世界回应完全超出预期的那些 */
const SHOCKS = new Set(['lift-adept', 'lift-wicked', 'look-wicked'])

function fresh() {
  setActivePinia(createPinia())
  useHouseholdStore()
  return { character: useCharacterStore(), world: useWorldStore() }
}

// —— 一、他看了片刻，心里想什么 ——
console.log('\n=== 同一个人躺在那儿，不同的人看出不同的东西 ===\n')
{
  for (const truth of ['修士', '猎户', '邪修', '死人'] as WoundedTruth[]) {
    const tally = new Map<string, { n: number; wrong: number }>()
    for (let i = 0; i < 600; i += 1) {
      fresh()
      const seen = glance(truth)
      const row = tally.get(seen.reading) ?? { n: 0, wrong: 0 }
      row.n += 1
      if (seen.mistaken) row.wrong += 1
      tally.set(seen.reading, row)
    }
    console.log(`  真相是【${truth}】，玩家读成：`)
    for (const [reading, row] of [...tally.entries()].sort((a, b) => b[1].n - a[1].n)) {
      const pct = ((row.n / 600) * 100).toFixed(0)
      const mark = row.wrong === row.n ? '　✗ 读错了' : row.wrong === 0 ? '　✓ 读对了' : ''
      console.log(`    ${reading}  ${String(pct).padStart(3)}%${mark}`)
    }
    console.log()
  }
}

// —— 二、六种人生 ——
console.log('=== 六种人生 ===\n')
const shapes: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
const samples: Record<string, string> = {}

for (let i = 0; i < RUNS; i += 1) {
  const { character } = fresh()
  const truth = rollTruth()
  const seen = glance(truth)

  // 兴趣是玩家自己决定的。走查里随机替他挑，好把各条路都走一遍
  const roll = Math.random()
  const interested = roll > 0.3
  const approach: Approach = roll > 0.75 ? '扶' : roll > 0.5 ? '看' : '叫人'

  if (!interested) {
    // 没兴趣，走开了。他一辈子不会知道真相
    const key = seen.mistaken ? 'C' : 'E'
    shapes[key] = (shapes[key] ?? 0) + 1
    if (!samples[key]) {
      samples[key] =
        `真相【${truth}】　他以为【${seen.reading}】　他没有过去，` +
        `${seen.mistaken ? '而且他到死都以为自己看对了' : '他看得没错，只是不想惹事'}`
    }
    continue
  }

  const outcome = resolve(truth, approach, seen.reading)
  const failed = FAILURES.has(outcome.id)
  const shocked = SHOCKS.has(outcome.id)

  let key: string
  if (seen.mistaken && shocked) key = 'F'
  else if (seen.mistaken) key = 'B'
  else if (failed) key = 'D'
  else key = 'A'

  shapes[key] = (shapes[key] ?? 0) + 1
  if (!samples[key]) {
    samples[key] =
      `真相【${truth}】　他以为【${seen.reading}】　他选了「${approach}」　→　${outcome.summary}`
  }
  // 顺带把认知写进去，验证 mistaken 会不会被记住
  character.learn(
    'the-man-on-the-road',
    '山道上那个人',
    outcome.summary,
    '人物',
    useWorldStore().time,
    outcome.learnedTruth ? '亲历' : '猜想',
    outcome.learnedTruth ? undefined : seen.reading === truthToReading(truth) ? undefined : '事实',
  )
}

const LABELS: Record<string, string> = {
  A: '判断对 → 行动 → 成功',
  B: '判断错 → 行动 → 才发现自己错了',
  C: '判断错 → 没兴趣 → 一生不知道真相',
  D: '判断对 → 行动 → 但没做成',
  E: '判断对 → 没兴趣 → 走开',
  F: '判断错 → 行动 → 世界回应完全超出预期',
}

let missing = 0
for (const key of ['A', 'B', 'C', 'D', 'E', 'F']) {
  const n = shapes[key] ?? 0
  const pct = ((n / RUNS) * 100).toFixed(1)
  console.log(`  ${key}　${LABELS[key]!.padEnd(30)} ${String(pct).padStart(5)}%`)
  if (n === 0) missing += 1
}

console.log('\n  各举一例：\n')
for (const key of ['A', 'B', 'C', 'D', 'E', 'F']) {
  if (samples[key]) console.log(`  ${key}　${samples[key]}`)
}

console.log()
if (missing > 0) {
  console.log(`  ✗ 有 ${missing} 种人生跑不出来——五节点没有全部落地。`)
  process.exitCode = 1
} else {
  console.log('  六种人生都跑得出来。')
  console.log('  B 证明理解可以错误，C 证明机会不等于命运，D 证明行动不保证结果。')
}

// —— 三、铁律：气运不决定机缘 ——
console.log('\n=== 铁律：气运不决定机缘成不成 ===\n')
{
  /**
   * 这一测必须**把 body 按住**。
   *
   * 头一版直接按气运分桶，结果差了二十个百分点——看着像气运在插手，
   * 其实是混杂：fortune 和 body 都来自出身，气运低的多是农户猎户，
   * 而他们 body 高、扶得动人。量的根本不是气运。
   *
   * 所以这里把 body 和 will 钉死，只让 fortune 变。
   */
  const byFortune = new Map<string, { n: number; ok: number }>()
  for (let i = 0; i < 3000; i += 1) {
    const { character } = fresh()
    const fortune = (i % 3) * 30 + 20
    character.attributes = { ...character.attributes, body: 50, will: 50, fortune }
    const bucket = fortune >= 70 ? '气运 80' : fortune >= 40 ? '气运 50' : '气运 20'
    const truth = rollTruth()
    const seen = glance(truth)
    const outcome = resolve(truth, '扶', seen.reading)
    const row = byFortune.get(bucket) ?? { n: 0, ok: 0 }
    row.n += 1
    if (!FAILURES.has(outcome.id)) row.ok += 1
    byFortune.set(bucket, row)
  }
  const rates: number[] = []
  for (const [bucket, row] of [...byFortune.entries()].sort()) {
    const rate = (row.ok / row.n) * 100
    rates.push(rate)
    console.log(`  ${bucket}　n=${String(row.n).padStart(4)}　行动没落空的：${rate.toFixed(0)}%`)
  }
  const spread = Math.max(...rates) - Math.min(...rates)
  console.log(
    `\n  最大差距 ${spread.toFixed(0)} 个百分点${spread <= 6 ? '——气运没有插手。' : '——气运在决定机缘，这是重大缺陷。'}`,
  )
  if (spread > 6) process.exitCode = 1
}

// —— 四、身子骨才是那个变量 ——
console.log('\n=== 而 body 是真的有用，但对修士不管用 ===\n')
{
  for (const truth of ['猎户', '武人', '弟子', '修士'] as WoundedTruth[]) {
    const line: string[] = []
    for (const body of [30, 50, 70]) {
      let ok = 0
      for (let i = 0; i < 400; i += 1) {
        const { character } = fresh()
        character.attributes = { ...character.attributes, body, will: 50 }
        const seen = glance(truth)
        if (!FAILURES.has(resolve(truth, '扶', seen.reading).id)) ok += 1
      }
      line.push(`body ${body}：${((ok / 400) * 100).toFixed(0)}%`)
    }
    console.log(`  扶一个【${truth}】　${line.join('　')}`)
  }
  console.log('\n  力气对猎户、武人、弟子都管用，对修士完全不管用——')
  console.log('  那件事根本不取决于力气。而玩家做决定时并不知道躺着的是谁。')
}

// —— 五、真相 × 动作，十八个格子 ——
console.log('\n=== 六种真相 × 三个动作 ===\n')
{
  /**
   * 这张表专治一类 bug：**文本跟真相打架**。
   *
   * 头一版「走近看看」漏了死人那一支，掉进了「是个受了伤的人」——
   * 可真相是他早断了气。这种矛盾在概率统计里看不出来，
   * 只有把每个格子摊平念一遍才抓得住。
   */
  const TRUTHS: WoundedTruth[] = ['猎户', '武人', '死人', '修士', '弟子', '邪修']
  for (const truth of TRUTHS) {
    console.log(`  真相【${truth}】`)
    for (const approach of ['扶', '看', '叫人'] as Approach[]) {
      const { character } = fresh()
      character.attributes = { ...character.attributes, body: 55, will: 55 }
      const outcome = resolve(truth, approach, truthToReading(truth))
      console.log(`    ${approach}　${outcome.summary}`)
      console.log(`    　　〔${outcome.id}〕${outcome.learnedTruth ? '弄明白了' : '始终没弄明白'}`)
    }
    console.log()
  }
}
console.log()
