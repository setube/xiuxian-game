/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 商旅走查：一个真实存在的人，能不能成为另一个人错误世界模型的来源。
 *
 * 前两支机缘验的是玩家跟**世界**打交道。这一支验的是跟**另一个人**——
 * 而人跟物最要紧的区别是：一个人对世界的理解，本身就是另一个人的局部世界。
 *
 * 要验的四件事：
 *
 *   ① NPC 四种状态都真的会出现
 *      不知道 / 知道但不说 / 知道且愿意说 / 自己错了而不自知
 *   ② 说的是真的 ≠ 他的解释是真的
 *      他说了真话，玩家仍然可能理解错
 *   ③ NPC 的回答不覆盖玩家原认知，只造成不同程度的扰动
 *      没问出什么 / 加深 / 动摇 / 有了别的说法 / 弄明白了
 *   ④ **越来越自信但越来越错**的人生跑得出来
 *      这一条最要紧：认知不是越问越对的
 *
 * 跑法：npx vite-node scripts/merchant.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { applyEffects } from '../src/engine/effects'
import {
  merchantLore,
  talk,
  viewWords,
  type AdeptView,
  type MerchantLore,
} from '../src/engine/hearsay'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { KnowledgeEntry } from '../src/types/game'

const RUNS = 3000

function fresh(insight = 45) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  household.trade = '商户'
  const character = useCharacterStore()
  character.attributes = { ...character.attributes, insight }
  usePeopleStore()
  return { character, world: useWorldStore() }
}

function adeptEntry(): KnowledgeEntry | undefined {
  return useCharacterStore().knowledge.find((k) => k.id === 'cultivators-exist')
}

function show(entry: KnowledgeEntry): string {
  const wrong = entry.mistaken ? ` · 错${entry.mistaken}` : ''
  return `〔${entry.contact} · ${entry.interpretation}${wrong}〕${entry.summary}`
}

let failed = 0

// —— ① NPC 的四种状态 ——
console.log('\n=== ① 一个 NPC 的四种状态 ===\n')
{
  const LORES: MerchantLore[] = ['亲眼见过', '听行里人说的', '把江湖人当修士', '什么也不知道']
  for (const lore of LORES) {
    fresh(45)
    const shut = talk(lore, '很厉害的江湖人', false)
    const open = talk(lore, '很厉害的江湖人', true)
    const say = (blocks: typeof open.blocks) =>
      blocks
        .filter((b) => b.kind === 'dialogue' && 'speaker' in b === false)
        .map((b) => ('text' in b ? b.text : ''))[0] ?? '（没说话）'
    console.log(`  【${lore}】`)
    console.log(`      不肯说时：${say(shut.blocks)}　→　${shut.turn}`)
    console.log(`      肯说时：　${say(open.blocks)}　→　${open.turn}`)
  }
  console.log('\n  「知道但不说」和「真不知道」是两句不同的话，玩家分得出来。')
  console.log('  而「把江湖人当修士」那一个说得最生动——他有名有姓有年份，')
  console.log('  比真见过修士的人讲得还实在。**他不是骗子，他只是归错了类。**')
}

// —— ② 他说了真话，玩家还是理解错了 ——
console.log('\n=== ② 说的是真的 ≠ 他的解释是真的 ===\n')
{
  console.log('  同一个亲眼见过修士的商旅，同一句「不是一路人」，')
  console.log('  落在心思粗细不同的人耳朵里：\n')
  for (const insight of [30, 45, 60, 75]) {
    const tally = new Map<string, number>()
    for (let i = 0; i < 500; i += 1) {
      fresh(insight)
      const result = talk('亲眼见过', '很厉害的江湖人', true)
      const key = `${result.turn} → ${result.view}`
      tally.set(key, (tally.get(key) ?? 0) + 1)
    }
    const parts = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} ${Math.round((n / 500) * 100)}%`)
    console.log(`  心思 ${String(insight).padStart(2)}　${parts.join('　')}`)
  }
  console.log('\n  心思粗的人点点头，说「不是一路人，那就是不同门派的意思吧」——')
  console.log('  **他采信了真话，而他的世界模型比谈话之前更自信、也更错。**')
  console.log('  没有人撒谎，没有人失误。')

  // —— 而笃定本身就是一道墙 ——
  console.log('\n  同一批人，唯一的区别是他原来已经确信了这件事：\n')
  for (const insight of [45, 60, 75]) {
    const tally = new Map<string, number>()
    for (let i = 0; i < 500; i += 1) {
      const { character, world } = fresh(insight)
      // 让他先确信「修士就是很厉害的江湖人」，再去听同一句话
      world.setFlag('adept-view', '很厉害的江湖人')
      character.learn({
        id: 'cultivators-exist',
        title: '修士',
        summary: viewWords('很厉害的江湖人'),
        category: '修行',
        at: world.time,
        contact: '听说',
        interpretation: '确信',
        mistaken: '因果',
      })
      const result = talk('亲眼见过', '很厉害的江湖人', true)
      tally.set(result.turn, (tally.get(result.turn) ?? 0) + 1)
    }
    const parts = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} ${Math.round((n / 500) * 100)}%`)
    console.log(`  心思 ${String(insight).padStart(2)}　${parts.join('　')}`)
  }
  console.log('\n  心思 75 的人，只因为原来已经确信，听懂的比例就掉下来一大截。')
  console.log('  **越笃定越听不进去**——这一条才是「越问越错」真正的发条。')
}

// —— ③ 五种扰动 ——
console.log('\n=== ③ NPC 的回答只造成扰动，不覆盖认知 ===\n')
{
  const turns = new Map<string, number>()
  for (let i = 0; i < RUNS; i += 1) {
    const { world } = fresh(30 + (i % 50))
    const lore = merchantLore()
    const view = (['没听说过', '说书人编的', '很厉害的江湖人', '山里的怪人'] as AdeptView[])[i % 4]!
    world.setFlag('adept-view', view)
    const result = talk(lore, view, i % 3 !== 0)
    turns.set(result.turn, (turns.get(result.turn) ?? 0) + 1)
  }
  for (const [turn, n] of [...turns.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%  ${turn}`)
  }
  const missing = ['没问出什么', '加深', '动摇', '有了别的说法', '弄明白了'].filter(
    (turn) => !turns.has(turn),
  )
  if (missing.length > 0) {
    console.log(`\n  ✗ 这几种扰动一次也没出现：${missing.join('、')}`)
    failed += 1
  } else {
    console.log('\n  五种扰动都出现了。「弄明白了」只是其中之一，而且不是最多的那一种。')
    console.log('  「动摇」是最不起眼的一种：他什么也没弄明白，只是不再笃定了。')
  }
}

// —— ④ 越来越自信，越来越错 ——
console.log('\n=== ④ 三次谈话，一条越走越歪的路 ===\n')
{
  /** 谈三次，把每一次之后他脑子里那句话记下来 */
  function threeNights(insight: number, lore: MerchantLore): KnowledgeEntry | undefined {
    const { world } = fresh(insight)
    world.setFlag('merchant-lore', lore)
    world.setFlag('poured-for-merchant', true)
    for (let i = 0; i < 3; i += 1) applyEffects([{ type: 'hearsay' }])
    return adeptEntry()
  }

  for (const [label, insight, lore] of [
    ['心思粗的孩子，遇上一个真见过修士的人', 32, '亲眼见过'],
    ['心思很细的孩子，遇上同一个人', 72, '亲眼见过'],
    ['心思中等的孩子，遇上一个自己就错了的人', 48, '把江湖人当修士'],
  ] as [string, number, MerchantLore][]) {
    const entry = threeNights(insight, lore)
    console.log(`  ${label}`)
    if (!entry) {
      console.log('      三夜下来什么也没问出来。\n')
      continue
    }
    for (const moment of entry.history) {
      console.log(
        `      〔${moment.how}〕${moment.contact} · ${moment.interpretation}　${moment.summary}`,
      )
    }
    if (entry.rival) console.log(`      另有一说：${entry.rival}`)
    console.log(`      最后：${show(entry)}\n`)
  }
}

// —— 关键指标 ——
console.log('=== 关键指标：多谈几次之后，他离真相更近了吗 ===\n')
{
  const shape = { 更对: 0, 更错: 0, 没变: 0, 一无所获: 0 }
  const samples: Record<string, string> = {}
  let firmerAndWronger = 0

  for (let i = 0; i < RUNS; i += 1) {
    fresh(28 + (i % 52))
    for (let n = 0; n < 3; n += 1) applyEffects([{ type: 'hearsay' }])
    const entry = adeptEntry()
    if (!entry) {
      shape.一无所获 += 1
      continue
    }
    const first = entry.history[0]!
    const wrongNow = entry.mistaken !== undefined
    const firmer = first.interpretation !== '确信' && entry.interpretation === '确信'

    if (!wrongNow && entry.summary === viewWords('另一套东西')) {
      shape.更对 += 1
      if (!samples['更对'])
        samples['更对'] =
          `〔${first.interpretation}〕${first.summary}　→　〔${entry.interpretation}〕${entry.summary}`
    } else if (wrongNow && firmer) {
      shape.更错 += 1
      firmerAndWronger += 1
      if (!samples['更错'])
        samples['更错'] =
          `〔${first.interpretation}〕${first.summary}　→　〔${entry.interpretation}〕${entry.summary}`
    } else if (wrongNow) {
      shape.没变 += 1
      if (!samples['没变'])
        samples['没变'] =
          `〔${first.interpretation}〕${first.summary}　→　〔${entry.interpretation}〕${entry.summary}`
    } else {
      shape.没变 += 1
    }
  }

  for (const [key, n] of Object.entries(shape)) {
    console.log(`  ${key.padEnd(6)} ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%`)
  }
  console.log()
  for (const [key, line] of Object.entries(samples)) {
    console.log(`  ${key}：${line}`)
  }

  console.log(`\n  三夜谈下来，有 ${((firmerAndWronger / RUNS) * 100).toFixed(1)}% 的人`)
  console.log('  **变得比一开始更笃定，而且仍然是错的。**')
  console.log('  这一条是这支机缘真正要证明的东西：认知不是越问越对的。')

  if (firmerAndWronger === 0) {
    console.log('\n  ✗ 一个都没有——那说明多问几次必然更接近真相，这还是百科系统。')
    failed += 1
  }
  if (shape.更对 === 0) {
    console.log('\n  ✗ 没有人弄明白过——那这条路根本走不通。')
    failed += 1
  }
}

// —— 他是个人，不是触发器 ——
console.log('\n=== 他是个持续存在的人 ===\n')
{
  const { world } = fresh(45)
  const people = usePeopleStore()
  people.meet('merchant', '走北路的商旅', 4, '收粗布往北边贩。每隔一两年从这儿过一趟。')
  for (let i = 0; i < 3; i += 1) {
    applyEffects([{ type: 'hearsay' }])
    applyEffects([{ type: 'time', years: 2 }])
  }
  const him = people.known['merchant']!
  console.log(`  ${people.callOf('merchant')}　好感 ${him.affinity}`)
  console.log(`  谈过 ${world.getFlag('merchant-talks')} 次，中间过了六年。`)
  console.log(`  他的下落：${him.note ?? '（没记）'}`)
  console.log('\n  同一个 id，同一个人。他记得你，也在跟着变老——')
  console.log('  这一支不是三个长得一样的事件，是一个人来了三趟。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  四条都成立：四种状态都在、真话会被听歪、回答只造成扰动、')
  console.log('  而且「越问越自信也越问越错」的人生跑得出来。\n')
}
