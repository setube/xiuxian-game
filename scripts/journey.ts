/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 走一趟远路，花的日子由这一趟本身算出来。
 *
 * 跑法：`bun scripts/journey.ts`
 *
 * ## 它守的是一件刚被拆掉的事
 *
 * 从前远行的耗时写死在选项上：`{ type: 'time', days: 8 }`。
 * **落笔的那一刻他还没决定去哪儿**（目的地在 `following` 那面旗上，
 * 而旗要等选完才读得到），所以那个 8 对每个地方都一样——
 * 去云台（二十日的路）和去城隍庙（三日的路）花掉同样的时间。
 *
 * 用户 2026-09-11 解除了这一格的暂缓，并钉了边界：
 *
 * > **「目的地决定耗时」不能变成「目的地单独决定耗时」。**
 *
 * 所以这一支要守的不是「天数对不对」，是**四层各自还在不在**：
 *
 *     ① 目的地   不同的地方花不同的日子     ← 拆掉的那个折中数不许回来
 *     ② 人       身子骨差的走得久
 *     ③ 同行     跟人去要等人
 *     ④ 路况     不太平要绕
 *
 * ## 为什么每一问单独验一层
 *
 * 「验证粒度必须与故障粒度一致」——四层里坏掉任何一层，
 * **总天数都还是个看着正常的数**。只问「天数合不合理」分辨不了是哪一层塌了，
 * 所以 `reckonJourney` 把四个倍数分开返回，这一支逐个问。
 *
 * ## 这一支静态跑，不真跑世界
 *
 * 它问的是「同样的输入算出同样的账」，那件事不需要人生。
 * 而「这一格真被内容用上了没有」由第五问静态扫内容层。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { PLACES } from '../src/content/leads'
import { everyPlace, reckonJourney } from '../src/engine/journey'
import { useCharacterStore } from '../src/stores/character'
import type { Effect } from '../src/types/game'

const wrong: string[] = []

/** 换一副身子骨，重算一趟 */
function walk(to: string, body?: number): ReturnType<typeof reckonJourney> {
  setActivePinia(createPinia())
  const character = useCharacterStore()
  if (body !== undefined) character.adjustAttribute('body', body - character.attributes.body)
  return reckonJourney(to)
}

console.log('\n【六个地方各走几日】\n')
const trips = everyPlace().map((id) => ({ id, trip: walk(id, 42) }))
for (const { id, trip } of trips) {
  console.log(
    `  ${id.padEnd(8)} 基准 ${String(trip.base).padStart(2)} 日 → 实际 ${String(trip.days).padStart(2)} 日`,
  )
}

/*
 * 一、不同的地方，花的日子不一样。
 *
 * **这一问守的正是拆掉的那个东西**：从前所有远行都是 8 日。
 * 哪天有人又在选项上写死一个数，这一问不会红（它只看引擎），
 * 但第五问会——两问合起来才守得住。
 */
{
  const days = new Set(trips.map((one) => one.trip.days))
  if (days.size <= 1) {
    wrong.push(
      `六个地方算出来的天数只有 ${days.size} 种——「目的地决定基准耗时」那一层塌了`,
    )
  }
  // 最远和最近该差得开：云台 20 日 vs 城隍庙 3 日
  const spread = Math.max(...trips.map((t) => t.trip.days)) - Math.min(...trips.map((t) => t.trip.days))
  if (spread < 5) {
    wrong.push(`最远和最近只差 ${spread} 日——地方之间的远近没有体现出来`)
  }
}

/*
 * 二、身子骨差的走得久。**方向别写反。**
 *
 * 写反了照样是「不同的人走出不同的天数」，一问看不出来——
 * 所以这一问不问「有没有差别」，问**差在哪一头**。
 */
{
  const weak = walk('云台', 26)
  const mid = walk('云台', 42)
  const strong = walk('云台', 48)
  console.log(
    `\n【同一趟路，不同身子骨】\n\n  26 → ${weak.days} 日　42 → ${mid.days} 日　48 → ${strong.days} 日`,
  )
  if (!(weak.days > mid.days && mid.days >= strong.days)) {
    wrong.push(
      `身子骨 26/42/48 走出 ${weak.days}/${mid.days}/${strong.days} 日——差的该走得更久`,
    )
  }
  // 封顶还在吗：最差的人不该把二十日走成四十日
  if (weak.days > mid.days * 1.35) {
    wrong.push(`身子骨最差的人走了 ${weak.days} 日，而中位数是 ${mid.days} 日——封顶没起作用`)
  }
}

/*
 * 三、同行要等人。
 *
 * `reckonJourney` 的第二个参数。**加成是正的**——
 * 「跟人一起走反而快」那种写法是把这一层的意思写反了。
 */
{
  setActivePinia(createPinia())
  const alone = reckonJourney('云台', false)
  setActivePinia(createPinia())
  const together = reckonJourney('云台', true)
  if (together.days <= alone.days) {
    wrong.push(`一个人 ${alone.days} 日、有人同行 ${together.days} 日——同行该慢不该快`)
  }
}

/*
 * 四、四个倍数都摊开给判据看。
 *
 * 只返回一个总数的话，上面那三问一个也写不出来——
 * 这一问守的是「账摊得开」这件事本身。
 */
{
  const t = walk('云台', 42)
  const parts = ['base', 'body', 'along', 'road', 'days'] as const
  for (const key of parts) {
    if (typeof t[key] !== 'number') wrong.push(`这一趟的账少了 ${key} 那一格，判据就问不了它`)
  }
}

/*
 * 五、内容层不许再写死远行的天数。**静态扫，这一问是这支门禁的重点。**
 *
 * 前四问验的是引擎算得对，而**引擎算得再对，内容层绕过它照样白搭**——
 * 那正是这一格被拆掉之前的样子。
 *
 * 判法：`journey` 效果旁边不许再出现大额 `time`。
 * 门槛取 `PLACES` 里最短那一趟（三日）：远行至少三日，
 * 而日常那些「耗一日」「歇两天」不该被这一问误伤。
 */
{
  const floor = Math.min(...PLACES.map((one) => one.days))
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const pools: readonly (readonly Effect[])[] = [
        (node.onEnter ?? []) as readonly Effect[],
        ...(node.choices ?? []).map((one) => (one.effects ?? []) as readonly Effect[]),
      ]
      for (const effects of pools) {
        const hasJourney = effects.some((one) => one.type === 'journey')
        if (!hasJourney) continue
        const bigTime = effects.find(
          (one) => one.type === 'time' && (one.days ?? 0) >= floor,
        )
        if (bigTime) {
          wrong.push(
            `${sceneId}#${nodeId} 同时写了 journey 和 ${JSON.stringify(bigTime)}——` +
              `远行的天数该由 journey 算，写死的那个数正是刚拆掉的东西`,
          )
        }
      }
    }
  }
}

/*
 * 六、`journey` 真的有人用。
 *
 * 零使用者就是「有一头是空的」——引擎写好了、判据绿着，而没有一句内容因此不同。
 */
{
  let users = 0
  for (const scene of Object.values(lifeScenes)) {
    for (const node of Object.values(scene.nodes)) {
      const pools: readonly (readonly Effect[])[] = [
        (node.onEnter ?? []) as readonly Effect[],
        ...(node.choices ?? []).map((one) => (one.effects ?? []) as readonly Effect[]),
      ]
      for (const effects of pools) {
        if (effects.some((one) => one.type === 'journey')) users += 1
      }
    }
  }
  console.log(`\n【内容层有几处用 journey】${users} 处`)
  if (users === 0) {
    wrong.push('内容层零处用 `journey`——引擎写好了而没有一句话因此不同')
  }
}

console.log('')
if (wrong.length === 0) {
  console.log('  ✓ 目的地给基准、身子骨分快慢、同行要等人、账摊得开、内容层没写死天数')
} else {
  for (const one of wrong) console.log(`  ✗ ${one}`)
}

console.log(`\n共 ${wrong.length} 处不对。`)
process.exit(wrong.length === 0 ? 0 : 1)
