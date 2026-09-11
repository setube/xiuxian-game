import { PLACES, placeById } from '@/content/leads'
import { useCharacterStore } from '@/stores/character'
import { useWorldStore } from '@/stores/world'

/**
 * 走一趟远路要花多少日子。
 *
 * ## 它替掉的是一个写死在选项上的数
 *
 * 从前远行的耗时是 `{ type: 'time', days: 8 }` ——写在**选项**上，
 * 而落笔的那一刻他还没决定去哪儿。于是**去云台（二十日的路）
 * 和去城隍庙（三日的路）花的时间一模一样**。
 *
 * 而 `content/leads.ts` 的 `Place.days` 早就按地方写好了六个数，
 * **在这一支之前没有任何人读它**——写了一张表，时间照旧从选项上取
 * （「有一头是空的」那一族）。
 *
 * ## 目的地给的是基准，不是结论（用户 2026-09-11 钉的边界）
 *
 * > 「目的地决定耗时」不能变成「目的地单独决定耗时」。
 *
 *     ① 目的地 / 路线   基准路程与基准耗时     ← Place.days
 *     ② 人               走得快还是慢           ← attributes.body
 *     ③ 同行             跟谁去，就得等谁       ← alongNow()
 *     ④ 途中             路上太平不太平         ← world.order
 *     ────────────────────────────────────────
 *     实际耗时
 *
 * **真正要消掉的是「旅行类型决定一个粗糙时间桶」，
 * 而不是让所有旅行都变成完全确定的时间。**
 *
 * ## 四个系数各自的来源
 *
 * 没有一个是拍的：
 *
 *     ① 基准       `Place.days`，作者按那地方多远写的（3 到 20 日）
 *     ② 身子骨     2000 次开局实测 p10=26 / p50=42 / p90=48
 *                  以 p50 为不加不减，每差十点一成，上下各封在 ±30%
 *     ③ 同行       有人同行加两成——**不是因为走得慢，是因为要等**
 *                  （歇脚、吃饭、等人跟上，那是同行这件事本身的代价）
 *     ④ 路况       `order <= 42` 是「闹匪」那一档的门槛（`stores/world.ts`
 *                  那段旱灾链注释写着），到了这一档绕路加三成
 *
 * ⚠️ **封顶是有意的**：身子骨最差的人走云台不该走成四十日——
 * 那个数会长得像一个 bug，而它其实只是几个系数乘在一起。
 * 上下各 ±30%，一趟二十日的路最多走成二十六日。
 */

/** 身子骨的中位数。2000 次开局实测，不是拍的 */
const BODY_MEDIAN = 42

/** 每差这么多点，快慢差一成 */
const BODY_PER_TENTH = 10

/** 身子骨能把一趟路拉长或缩短到什么地步 */
const BODY_LIMIT = 0.3

/** 有人同行，路上要等人、要将就，加这么多 */
const ALONG_TOLL = 0.2

/**
 * 路不太平的门槛。
 *
 * `stores/world.ts` 那段旱灾链注释写着 `order <= 42 → 闹匪`，
 * 这一支用同一个门槛——**不另立一个数**，否则世界会有两种「不太平」。
 */
const UNSAFE_ORDER = 42

/** 路上不太平要绕，加这么多 */
const UNSAFE_TOLL = 0.3

/** 这一趟的账，摊开给判据看 */
export interface Journey {
  /** 去哪儿 */
  to: string
  /** 那地方本身多远（日） */
  base: number
  /** 身子骨这一层的倍数 */
  body: number
  /** 同行这一层的倍数 */
  along: number
  /** 路况这一层的倍数 */
  road: number
  /** 实际花掉几日。至少一日——世界的最小刻度是日 */
  days: number
}

/**
 * 算这一趟的账。
 *
 * **四层分开返回，不只给一个总数**：判据要问的是「哪一层出了问题」，
 * 而一个总数答不了那个问题（「验证粒度必须与故障粒度一致」）。
 *
 * @param to 去哪儿。`content/leads.ts` 的地方 id
 * @param withCompany 有没有人同行。由调用处从 `alongNow()` 取，
 *   这一支不自己去问——**算账的人不该顺手改变世界**
 */
export function reckonJourney(to: string, withCompany = false): Journey {
  const place = placeById(to)
  const world = useWorldStore()
  const character = useCharacterStore()

  /*
   * 找不到那个地方，退回一日。
   *
   * 这不是兜底，是**真实情形**：`seeking.ts` 里「按人说的地方找了三天，
   * 没有这个地方」那一支走的正是这条路——他压根没出远门。
   * 而返回 0 会让「这一趟没花时间」和「这一趟没发生」分不开。
   */
  if (!place) return { to, base: 1, body: 1, along: 1, road: 1, days: 1 }

  const base = place.days

  /*
   * 身子骨。中位数附近不加不减，越差走得越久。
   *
   * ⚠️ 方向别写反：`body` 低是身子骨**差**，差的人走得**慢**，
   * 所以倍数要**大于一**。（这一行我写反过一次，二十日的路
   * 给身子骨最好的人算成二十六日——而他该走得比别人快。）
   */
  const bodyOff = (BODY_MEDIAN - character.attributes.body) / BODY_PER_TENTH / 10
  const body = 1 + Math.max(-BODY_LIMIT, Math.min(BODY_LIMIT, bodyOff))

  const along = withCompany ? 1 + ALONG_TOLL : 1
  const road = world.regionState().order <= UNSAFE_ORDER ? 1 + UNSAFE_TOLL : 1

  return {
    to,
    base,
    body,
    along,
    road,
    days: Math.max(1, Math.round(base * body * along * road)),
  }
}

/** 库里一共有哪几个地方，给门禁扫用 */
export function everyPlace(): readonly string[] {
  return PLACES.map((one) => one.id)
}
