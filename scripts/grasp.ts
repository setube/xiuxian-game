/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * grasp 语义验收。
 *
 * ## 这一支要钉死的那条规则
 *
 * `grasp` 表示的是**玩家对自己当前认知有多确定**，
 * 不是「他离真相有多近」。这两件事看着像，差别是根本性的：
 *
 *   听说 + 错　　合法
 *   见过 + 错　　合法
 *   猜想 + 错　　合法
 *   确信 + 错　　合法　← 最常见的人
 *   亲历 + 错　　合法　← 他亲手拿过、亲耳听过，仍然理解错了
 *
 * 一旦把「档位越高越接近真相」当成隐含规则写进引擎，
 * 知识系统就退化成普通 RPG 的「知识解锁」——
 * **越查越对，最后必然全知。** 而人不是这样认识世界的。
 *
 * 跑法：npx vite-node scripts/grasp.ts
 * 失败以非零码退出，可以直接挂进 CI。
 */
import { createPinia, setActivePinia } from 'pinia'

import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import type { Grasp, KnowledgeEntry } from '../src/types/game'

function fresh() {
  setActivePinia(createPinia())
  return { character: useCharacterStore(), world: useWorldStore() }
}

let failed = 0

function check(label: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  console.log(`      ${detail}`)
  if (!ok) failed += 1
}

function entryOf(id: string): KnowledgeEntry {
  return useCharacterStore().knowledge.find((k) => k.id === id)!
}

function describe(entry: KnowledgeEntry): string {
  return `〔${entry.grasp}${entry.mistaken ? ' · 错' + entry.mistaken : ''}〕${entry.summary}`
}

console.log('\n=== grasp 是「他有多确定」，不是「他有多接近真相」===\n')

// —— 一、更确信自己的错误理解 ——
{
  const { character, world } = fresh()
  character.learn('the-book', '那册书', '大概是外乡人的账册。', '器物', world.time, '猜想', '事实')
  const before = entryOf('the-book')

  /**
   * 十年过去，他翻过很多次，越翻越笃定——**而他依然是错的**。
   *
   * 这一步不该要求调用处再传一次 `mistaken`：
   * 「他变得更确信了」是一次纯粹的档位变化，
   * 跟「他弄明白了」完全是两回事。
   */
  character.learn('the-book', '那册书', '就是外乡人的账册。', '器物', world.time, '确信')
  const after = entryOf('the-book')

  check(
    '猜想（错）→ 确信：更确信自己的错误理解',
    after.grasp === '确信' && after.mistaken === '事实',
    `${describe(before)}　→　${describe(after)}`,
  )
}

// —— 二、同一档位上的纠正 ——
{
  const { character, world } = fresh()
  character.learn('the-book', '那册书', '就是外乡人的账册。', '器物', world.time, '确信', '事实')
  const before = entryOf('the-book')

  /**
   * 有人当面告诉他那是符书。
   *
   * 他从「确信一件错事」变成「确信一件对事」——**档位没动，内容全变了**。
   * 引擎若把同档位一律当作「已经知道了」，这次纠正就永远进不来：
   * 玩家听见了正确答案，脑子里那条却纹丝不动。
   */
  character.learn(
    'the-book',
    '那册书',
    '是符书。写坏的，没有用。',
    '器物',
    world.time,
    '确信',
    null,
  )
  const after = entryOf('the-book')

  check(
    '确信（错）→ 确信（对）：同档位的纠正进得来',
    after.summary === '是符书。写坏的，没有用。' && after.mistaken === undefined,
    `${describe(before)}　→　${describe(after)}`,
  )
}

// —— 三、亲历 + 错 ——
{
  const { character, world } = fresh()
  /**
   * 他亲手拿过、亲眼看过、亲耳听过。**接触是真的，理解仍然是错的。**
   *
   * 这一格若不合法，「亲历」就成了一张真相保票，
   * 而世上最难劝的正是那种「我亲眼见过」的人。
   */
  character.learn(
    'refugees',
    '逃荒的人',
    '我亲眼看见他们从北边下来的。北边打起来了。',
    '世事',
    world.time,
    '亲历',
    '因果',
  )
  const entry = entryOf('refugees')
  check(
    '亲历 + 错误解释：亲眼见过不等于弄明白了',
    entry.grasp === '亲历' && entry.mistaken === '因果',
    describe(entry),
  )
}

// —— 四、认识不倒退这条仍然成立 ——
{
  const { character, world } = fresh()
  character.learn('adepts', '修士', '你亲眼见过一个。', '修行', world.time, '见过')
  character.learn('adepts', '修士', '有人说这世上有能飞的人。', '修行', world.time, '听说')
  const entry = entryOf('adepts')
  check('见过 → 再听人说一嘴：不退回「听说」', entry.grasp === '见过', describe(entry))
}

// —— 五、五档 × 对错，十格全部合法 ——
console.log('\n=== 十格全部合法 ===\n')
{
  const LADDER: readonly Grasp[] = ['听说', '见过', '猜想', '确信', '亲历']
  const rows: string[] = []
  for (const grasp of LADDER) {
    const { character, world } = fresh()
    character.learn('x', '某事', '他此刻的说法。', '世事', world.time, grasp)
    const right = entryOf('x')
    const { character: c2, world: w2 } = fresh()
    c2.learn('x', '某事', '他此刻的说法。', '世事', w2.time, grasp, '因果')
    const wrong = c2.knowledge.find((k) => k.id === 'x')!
    const ok = right.grasp === grasp && wrong.grasp === grasp && wrong.mistaken === '因果'
    if (!ok) failed += 1
    rows.push(`  ${ok ? '✓' : '✗'} ${grasp}　对：可　错：可`)
  }
  console.log(rows.join('\n'))
  console.log('\n  没有哪一档天然是对的。「亲历」也不是真相保票。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立——grasp 被当成了「离真相多近」，这是重大缺陷。\n`)
  process.exitCode = 1
} else {
  console.log('  grasp 表示的是确定程度，与对错正交。\n')
}
