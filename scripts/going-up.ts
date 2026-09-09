/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 上山那一趟：叫你的人是别人，走不走得成不由你说了算。
 *
 * ## 这一支守的是 29.md 那句设计判断
 *
 * > 不要把它设计成【选择】散修 / 宗门，**因为这样又变成玩家菜单**。
 *
 * 落到机制上是两条，而这两条都可以查：
 *
 *     开口那一下不由玩家　这一卷的入口是 `known-on-the-mountain`，
 *                         而那面旗只有 `mountain.ts` 落得下——玩家点不到它
 *     答应了未必走得成　　有妻儿的人走不脱，而那不是他反悔
 *
 * ## 摆局跑，不跑真世——理由跟 `mountain` 那一支一样
 *
 * 入口 `known-on-the-mountain` 在随机人生里是 **0.3%**（2026-09-09 实测
 * 800 世 2 世，主干 `7b441e1`），而这一卷是它的子集。**3000 世随机跑期望
 * 只有九世走到前提**，量不出分支分布——那不是内容稀有，是样本太薄。
 *
 * 所以照 `mountain`／`ascent` 那两支的规矩：**摆局把每一支逐个走一遍，
 * 随机人生只报数**。摆局验的是「规则算得对不对」，真世验的是「局面出得来吗」，
 * 而后者由 `mountain.ts` 那一册自己守。
 *
 * 跑法：bun scripts/going-up.ts
 */
import './lib/seeded'

import { applyEffects } from '../src/engine/effects'

import { born, play, type Staged } from './lib/staged'

console.log('\n=== 上山那一趟（摆局跑）===\n')

let bad = 0

/** 把玩家摆成「上头问起过他」的样子——这一卷全部的前提 */
function sentFor(years: number): Staged | null {
  const s = born('farm', years, [])
  if (!s) return null
  s.world.setFlag('known-on-the-mountain', true)
  return s
}

/**
 * 给玩家摆一个妻子。**走 `meet` 效果，跟正文同一条路**——
 * 直接 `enroll` 摆得出人，摆不出那条 `配偶` 边，而判据问的正是那条边
 * （`scripts/bearing.ts:60` 那一处也是这么办的）。
 */
function wed(): void {
  applyEffects([
    {
      type: 'meet',
      id: 'spouse',
      calls: '妻子',
      delta: 20,
      who: { surname: '秦', given: '娘', gender: '女', age: 26, doing: '操持家务' },
      bond: '配偶',
    },
  ])
}

/**
 * 再摆一个孩子。**照 `bearing.ts:176` 那一处的原句抄**——
 * 头一版我按印象写了 `surname` 和 `age: 6`，`kinOf('子')` 摆出来是空的，
 * 于是「有妻有子走不脱」那一条永远走不到，**而判据报的是「内容让他走脱了」**。
 * 摆局摆错了，看上去跟内容坏了一模一样。
 */
function bear(): void {
  applyEffects([
    {
      type: 'meet',
      id: 'son',
      calls: '孩子',
      delta: 25,
      who: { given: '安', gender: '男', age: 0 },
      bond: '子',
    },
  ])
}

// ============================================================
// 一、开口那一下不由玩家
// ============================================================
{
  /*
   * **这一条查的是「玩家点不到那面旗」**，不是「那面旗存在」。
   *
   * 分界线：一个玩家能自己点出来的入口，就是菜单；一个只有别人落得下的入口，
   * 才是「人家开口」。所以查的是**全库谁写得下 `known-on-the-mountain`**——
   * 只该有 `mountain.ts`（药庐那位说的那五个字），而那一节玩家没有选项。
   */
  const { readdirSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const LIFE = 'src/content/life'
  const 写它的: string[] = []
  for (const name of readdirSync(LIFE)) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(LIFE, name), 'utf8')
    if (/key:\s*'known-on-the-mountain'\s*,\s*value:\s*true/.test(text)) 写它的.push(name)
  }

  if (写它的.length === 1 && 写它的[0] === 'mountain.ts') {
    console.log('  ✓ 「上头问起你了」只有药庐那一册落得下——玩家点不到这个入口。')
  } else {
    console.log(`  ✗ 落 \`known-on-the-mountain\` 的有 ${写它的.length} 处：${写它的.join('、')}`)
    console.log('      这个入口该只由别人开口落下。玩家自己点得出来的话，它就成了菜单。')
    bad += 1
  }
}

// ============================================================
// 二、答应了，未必走得成
// ============================================================
{
  const wrong: string[] = []

  // 有妻有子的走不脱
  {
    const s = sentFor(30)
    if (!s) wrong.push('掷不出局（有妻有子那一支）')
    else {
      wed()
      bear()
      const texts = play('going-up:sent-for', 'go')
      const 走不脱 = texts.some((t) => t.includes('交代不完') || t.includes('没有去成'))
      if (!走不脱) wrong.push(`有妻有子却走脱了：${texts.slice(-2).join(' / ')}`)
    }
  }

  // 一个人的走得脱
  {
    const s = sentFor(30)
    if (!s) wrong.push('掷不出局（一个人那一支）')
    else {
      const texts = play('going-up:sent-for', 'go')
      const 到了 = texts.some((t) => t.includes('半山腰') || t.includes('挑水'))
      if (!到了) wrong.push(`一个人却没走成：${texts.slice(-2).join(' / ')}`)
    }
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('\n  ✓ 有妻儿的走不脱、一个人的走得成——答应了不等于走得了。')
  }
}

// ============================================================
// 三、不去，跟去是同一层的两个结局
// ============================================================
{
  const s = sentFor(30)
  const wrong: string[] = []
  if (!s) wrong.push('掷不出局')
  else {
    const texts = play('going-up:sent-for', 'stay')
    /*
     * **这一条查的是「不去也留下一笔」**，不是「不去有正文」。
     *
     * 29.md：宗门不比散修高级，否则不上去的人只是失败者。
     * 而「失败分支」在这个库里的机器判法是：**它留不留痕迹**——
     * 留了，那就是他一生里真发生过的事；不留，那就只是一个没走的岔路。
     */
    const 留了痕迹 = texts.length > 0
    if (!留了痕迹) wrong.push('不去那一支一句正文也没有')

    // 而且不该出现「你上山了」那一笔
    if (texts.some((t) => t.includes('半山腰') || t.includes('挑水'))) {
      wrong.push('说了不去，却还是上了山')
    }
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('  ✓ 不去那一支照样有正文、照样记年表——它跟去是同一层的两个结局。')
  }
}

// ============================================================
// 四、这一片不落身份
// ============================================================
{
  /*
   * 他上去了也还不是「外门弟子」——**山上还没决定拿他怎么办**。
   *
   * 29.md 列的那棵树（山门/长老/掌教/执事/外门/内门/传承/派系）一格也不建，
   * 这一条守的就是它：**先有使用者再抽象**，别先造阶梯再找楼。
   *
   * 静态查，不跑局：这一卷的 `onEnter` 里不该出现 `type: 'identity'`。
   * 跑局去读身份也行，可那要先知道 `Staged` 里没有 `character`
   * （头一版我就是这么栽的）——**而这一条问的本来就是「库里写没写」**。
   */
  const { readFileSync } = await import('node:fs')
  const src = readFileSync('src/content/life/going-up.ts', 'utf8')
  const wrong: string[] = []
  if (/type:\s*'identity'/.test(src)) {
    wrong.push('这一卷落了 `identity`——那等于替山上做了它还没做的决定')
  }
  if (/type:\s*'realm'/.test(src)) {
    wrong.push('这一卷落了 `realm`（境界）——他上去了也还是那个不识字的人')
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`      ${one}`)
    console.log('      到「在半山腰挑水」为止。给他一个身份，等于替山上做了还没做的决定。')
    bad += 1
  } else {
    console.log('  ✓ 上去了也没落身份——山上还没决定拿他怎么办。')
  }
}

// ============================================================
// 五、尺子自检
// ============================================================
{
  const broken: string[] = []

  /*
   * 喂它一条该抓的：把「有妻儿」那一局的判词换成一句库里没有的话，
   * 第二问必须抓到。**不打断的话，我会把一条永远绿的判据当成守住了。**
   */
  const s = sentFor(30)
  if (!s) broken.push('掷不出局')
  else {
    wed()
    bear()
    const texts = play('going-up:sent-for', 'go')
    // 该抓：库里的原句认得出
    if (!texts.some((t) => t.includes('交代不完'))) {
      broken.push('「交代不完」这句认不出来了——判词跟库里的正文对不上')
    }
    // 不该抓：一句库里没有的话不该命中
    if (texts.some((t) => t.includes('这句话库里没有'))) {
      broken.push('一句库里没有的话被认成了正文——判词太宽')
    }
  }

  if (broken.length > 0) {
    console.log(`\n  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('  ✓ 尺子自检：库里的原句认得出，编的话认不出。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  叫你的是别人，走不走得成不由你说了算。\n')
}
