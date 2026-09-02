/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 认知三轴验收。
 *
 * ## 这一支要钉死的那件事
 *
 * 「知道」不是一道单一的坡。它有三根各自独立的轴：
 *
 *     接触　听说 → 见过 → 亲历　　**只能往上**
 *     解释　未理解 → 猜想 → 确信　**可以往下**
 *     对错　对 / 错　　　　　　　　跟前两根都正交
 *
 * 从前这些揉在一个 `grasp` 字段里，而那道梯子混了两个轴——
 * 于是「亲眼见过但完全不明白那是什么」这种状态根本写不出来，
 * 而那正是一个人第一次撞见修士时最真实的样子。
 *
 * 两条规则一正一反，缺一不可：
 *
 * - **接触只能往上。** 听人说一嘴，推翻不了亲眼见过。
 * - **解释可以往下。** 一句「不是那么回事」就能让确信多年的人重新不敢肯定。
 *
 * 还要分清被人说动之后的三种样子——只做「纠正」的话，
 * NPC 一开口玩家的世界模型就被改对，那还是百科系统。
 *
 * 跑法：npx vite-node scripts/grasp.ts
 * 失败以非零码退出，可以直接挂进 CI。
 */
import { createPinia, setActivePinia } from 'pinia'

import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import type { Contact, Interpretation, KnowledgeEntry } from '../src/types/game'

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

function show(entry: KnowledgeEntry): string {
  const wrong = entry.mistaken ? ` · 错${entry.mistaken}` : ''
  return `〔${entry.contact} · ${entry.interpretation}${wrong}〕${entry.summary}`
}

console.log('\n=== 接触只能往上，解释可以往下 ===\n')

// —— 一、亲眼见过，可他完全不明白那是什么 ——
{
  const { character, world } = fresh()
  /**
   * 这一格是整次拆分的起因。
   *
   * 老的单轴梯子里，「见过」排在「猜想」前面——于是一个亲眼看见修士
   * 御风而去的人，档位竟然比一个坐在家里瞎猜的人还低。
   * 而他真实的状态是：**离得最近，却什么也没弄明白。**
   */
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '你亲眼看见那个人踩着水面走过去了。你不知道那是什么。',
    category: '修行',
    at: world.time,
    contact: '见过',
    interpretation: '未理解',
  })
  const entry = entryOf('adepts')
  check(
    '见过 + 未理解：亲眼见过，却说不出那是什么',
    entry.contact === '见过' && entry.interpretation === '未理解',
    show(entry),
  )
}

// —— 二、接触不倒退 ——
{
  const { character, world } = fresh()
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '你亲眼见过一个。',
    category: '修行',
    at: world.time,
    contact: '见过',
  })
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '有人说这世上有能飞的人。',
    category: '修行',
    at: world.time,
    contact: '听说',
  })
  const entry = entryOf('adepts')
  check('见过 → 再听人说一嘴：接触不退回「听说」', entry.contact === '见过', show(entry))
}

// —— 三、更确信自己那个错的 ——
{
  const { character, world } = fresh()
  character.learn({
    id: 'the-book',
    title: '那册书',
    summary: '大概是外乡人的账册。',
    category: '器物',
    at: world.time,
    interpretation: '猜想',
    mistaken: '事实',
  })
  const before = entryOf('the-book')
  /** 十年过去，他翻过很多次，越翻越笃定——**而他依然是错的** */
  character.learn({
    id: 'the-book',
    title: '那册书',
    summary: '就是外乡人的账册。',
    category: '器物',
    at: world.time,
    interpretation: '确信',
  })
  const after = entryOf('the-book')
  check(
    '猜想（错）→ 确信：更确信自己那个错的',
    after.interpretation === '确信' && after.mistaken === '事实',
    `${show(before)}　→　${show(after)}`,
  )
}

console.log('\n=== 被人说动之后的三种样子 ===\n')

/** 一个确信多年、而且是错的人。三种扰动都从这里出发 */
function convinced() {
  const { character, world } = fresh()
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '修士就是江湖上很厉害的人。',
    category: '修行',
    at: world.time,
    contact: '听说',
    interpretation: '确信',
    mistaken: '因果',
  })
  return { character, world }
}

// —— ① 动摇：他没弄明白什么，只是不再敢肯定 ——
{
  const { character, world } = convinced()
  const before = entryOf('adepts')
  character.learn({
    id: 'adepts',
    title: '修士',
    category: '修行',
    at: world.time,
    shaken: true,
  })
  const after = entryOf('adepts')
  check(
    '① 动摇：「你这么一说……我也不敢肯定了。」',
    after.interpretation === '猜想' &&
      after.summary === before.summary &&
      after.mistaken === '因果',
    `${show(before)}　→　${show(after)}`,
  )
  console.log('      说法一个字没改，错也还是错的——他只是不再笃定。')
}

// —— ② 有了别的说法：两个版本并排放着 ——
{
  const { character, world } = convinced()
  const before = entryOf('adepts')
  character.learn({
    id: 'adepts',
    title: '修士',
    category: '修行',
    at: world.time,
    rival: '有个走北路的商旅说，他们不是江湖人。',
  })
  const after = entryOf('adepts')
  check(
    '② 有了别的说法：新说法不覆盖旧说法',
    after.summary === before.summary &&
      after.rival === '有个走北路的商旅说，他们不是江湖人。' &&
      after.interpretation === '猜想',
    `${show(after)}\n      　　　另有一说：${after.rival}`,
  )
  console.log('      他心里从此有两个版本，而他还没能采信新的那个。')
}

// —— ③ 明确纠正 ——
{
  const { character, world } = convinced()
  const before = entryOf('adepts')
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '修士不是江湖人。那是另一套东西。',
    category: '修行',
    at: world.time,
    contact: '见过',
    interpretation: '确信',
    mistaken: null,
  })
  const after = entryOf('adepts')
  check(
    '③ 明确纠正：这一步才抹掉错误标记',
    after.mistaken === undefined && after.contact === '见过',
    `${show(before)}　→　${show(after)}`,
  )
}

// —— 三种扰动结果各不相同 ——
console.log('\n  三种扰动的结局互不相同——只做第三种，NPC 一开口世界模型就被改对，')
console.log('  那还是百科系统。')

// —— 认知历史 ——
console.log('\n=== 认知历史留得下来 ===\n')
{
  const { character, world } = convinced()
  character.learn({
    id: 'adepts',
    title: '修士',
    category: '修行',
    at: world.time,
    rival: '有个走北路的商旅说，他们不是江湖人。',
  })
  character.learn({
    id: 'adepts',
    title: '修士',
    summary: '修士是另一种江湖人吧。',
    category: '修行',
    at: world.time,
    interpretation: '确信',
  })
  const entry = entryOf('adepts')
  for (const moment of entry.history) {
    console.log(
      `    〔${moment.how}〕${moment.contact} · ${moment.interpretation}　${moment.summary}`,
    )
  }
  const ok = entry.history.length === 3 && entry.history[0]!.how === '初识'
  check(
    '每一步都留下来了，旧的没被抹掉',
    ok,
    `共 ${entry.history.length} 步：${entry.history.map((m) => m.how).join(' → ')}`,
  )
  console.log('\n      注意最后那一步：他采信了商旅的话，却把它塞回自己原来那个框里。')
  console.log(`      现在他确信「${entry.summary}」——而这仍然是错的。`)
  if (entry.mistaken !== '因果') {
    console.log('      ✗ 错误标记丢了：他明明还是错的。')
    failed += 1
  }
}

// —— 九格全部合法 ——
console.log('\n=== 三接触 × 三解释 × 对错，全部合法 ===\n')
{
  const CONTACTS: readonly Contact[] = ['听说', '见过', '亲历']
  const READINGS: readonly Interpretation[] = ['未理解', '猜想', '确信']
  const rows: string[] = []
  for (const contact of CONTACTS) {
    const cells: string[] = []
    for (const interpretation of READINGS) {
      const { character, world } = fresh()
      character.learn({
        id: 'x',
        title: '某事',
        summary: '他此刻的说法。',
        category: '世事',
        at: world.time,
        contact,
        interpretation,
        mistaken: '因果',
      })
      const entry = entryOf('x')
      const ok =
        entry.contact === contact &&
        entry.interpretation === interpretation &&
        entry.mistaken === '因果'
      if (!ok) failed += 1
      cells.push(`${ok ? '✓' : '✗'} ${interpretation}`)
    }
    rows.push(`  ${contact}　${cells.join('　')}`)
  }
  console.log(rows.join('\n'))
  console.log('\n  九格乘对错十八种，没有哪一格天然是对的。')
  console.log('  「亲历」不是真相保票——世上最难劝的正是那种「我亲眼见过」的人。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立——认知三轴没有立住。\n`)
  process.exitCode = 1
} else {
  console.log('  接触只能往上，解释可以往下，对错与两者都正交。')
  console.log('  被人说动之后有动摇、有别的说法、有明确纠正，三种各不相同。\n')
}
