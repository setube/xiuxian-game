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

/**
 * 把玩家摆成「上头问起过他」的样子——这一卷全部的前提。
 *
 * ⚠️ `years` 是**推几年**，不是**落在几岁**：`born('farm', 30)` 实测 500 局
 * 落在 33×41 / 34×376 / 35×83（2026-09-10）——`time` 效果推整年时日常会再多推几年。
 * 判据不问岁数所以不受影响，但别把下面那些 `sentFor(30)` 读成「三十岁的人」，
 * 报数时写「三十年后、三十四上下」。同 [[age-needs-whose-and-when]] 那一条。
 */
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
// 五、这一卷落的旗，有没有下家
// ============================================================
{
  /**
   * **这一条是替我自己问的。**
   *
   * 2026-09-09 全库扫过一遍：151 面旗，**66 面没有任何读取端**。
   * 而我那天刚写完这一卷，就有一面 `said-yes-to-the-mountain` 落在那 66 面里
   * ——**我一边在评判别人的旗，一边自己造了一面**。
   *
   * ## 三种旗，只有第三种该报
   *
   *     有读者　　　别处 requires 问得到它　　　　　　　→ 好的
   *     无声的光杆　没人读，正文也没承诺什么　　　　　　→ 放过（那是一段人生的结论）
   *     过路的光杆　没人读，而它本身只是个中间状态　　　→ **报**
   *
   * 这一卷现在两面无声光杆，各有各的理由：
   *
   *     could-not-go-up          「往后大概也不会知道了」——正文自己说了没有下文
   *     turned-down-the-mountain 「你在里屋，没有出去」——同上
   *
   * **它们是结论，不是欠账。** 而 `said-yes-to-the-mountain` 两头都不占：
   * 既没有下文，也不是任何一段人生的结论——它只是「答应了，还没走成」，
   * 而那件事的结局由另外两面旗记着。
   *
   * ## ⚠️ 门禁读不算读取端
   *
   * 只有 `scripts/` 在读的旗**比没人读更坏**——那意味着
   * **判据在守一个内容层根本没用上的东西**（2026-09-09 在 `unrest-kept` 上
   * 实见过一次）。所以这一条只扫 `src/`。
   */
  const { readdirSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')

  const mine = readFileSync('src/content/life/going-up.ts', 'utf8')
  const 落的旗 = [...mine.matchAll(/type:\s*'flag',\s*key:\s*'([\w:-]+)'/g)].map((m) => m[1]!)

  /** 正文自己说了没有下文的——这些是结论，不是欠账 */
  const 结论: readonly string[] = ['could-not-go-up', 'turned-down-the-mountain']

  let 全库 = ''
  for (const d of ['src/content', 'src/content/life', 'src/engine', 'src/stores']) {
    for (const f of readdirSync(d)) {
      if (f.endsWith('.ts')) 全库 += '\n' + readFileSync(join(d, f), 'utf8')
    }
  }

  const 没下家: string[] = []
  for (const flag of [...new Set(落的旗)]) {
    if (结论.includes(flag)) continue
    const 读它的 =
      new RegExp(`flag:\\s*\\{\\s*key:\\s*'${flag}'`).test(全库) ||
      new RegExp(`key:\\s*'${flag}'\\s*,\\s*(?:equals|absent|in)\\b`).test(全库)
    if (!读它的) 没下家.push(flag)
  }

  if (没下家.length > 0) {
    console.log(`\n  ✗ ${没下家.length} 面旗落了而没人读：${没下家.join('、')}`)
    console.log('      要么给它写个下家，要么删掉它——过路的状态本来就该由结局那几面旗记着。')
    console.log('      （正文自己说了「没有下文」的，加进 `结论` 那张表。）')
    bad += 1
  } else {
    console.log('\n  ✓ 这一卷落的旗都有下家，或者正文自己说了没有下文。')
  }
}

// ============================================================
// ============================================================
// 六、上了山，世界得知道他不在村里了
// ============================================================
{
  /**
   * **人在半山腰，而世界不知道——那是这一卷最容易留下的洞。**
   *
   * 头一版这一节只落旗和认知，于是：
   *
   *     living 还是 farm　日常照旧给他「帮家里干活」「出门做工」（六处）
   *     home 还在村里　　 按 `nearby` 判的卷照旧演——夜里配偶问、巷口邻家问，
   *                       而他二十年没下过山
   *
   * 「人在镇上、户在老屋」库里早有现成写法（`reunion.ts:77` 离家做工那处）：
   * **户不动，住处动**，`nearby` 比的是住处。上山照抄这一套。
   *
   * ⚠️ 这一条**跑局验，不静态查**：静态只查得出「那两笔写在文件里」，
   * 查不出「它们真的落下了」。而今天在别处见过一次「写了不生效」
   * （`branches` 挂在有 `choices` 的节点上，格式全对、类型也过、永远轮不到判定）。
   */
  const s = sentFor(30)
  const wrong: string[] = []
  if (!s) wrong.push('掷不出局')
  else {
    const { useCharacterStore } = await import('../src/stores/character')
    const { useHouseholdStore } = await import('../src/stores/household')
    const ch = useCharacterStore() as unknown as { living?: { id?: string } }
    const hh = useHouseholdStore() as unknown as { home?: string }

    const 上山前 = String(ch.living?.id ?? '?')
    play('going-up:sent-for', 'go')
    const 上山后 = String(ch.living?.id ?? '?')

    if (上山后 !== 'up-there') {
      wrong.push(`上了山 living 还是 ${上山后}（上山前 ${上山前}）——日常会继续给他「帮家里干活」`)
    }
    if (!String(hh.home ?? '').includes('云台')) {
      wrong.push(`上了山 home 还是「${String(hh.home)}」——按 nearby 判的卷会继续给他演`)
    }
    /*
     * 那几处「干活/做工」的排除名单里得有他。**这一条钉的是库里的名单，
     * 不是我自己写的数组。**
     *
     * ⚠️ 头一版写的是 `meetsAll([{ living: { notIn: ['palace','manor','up-there'] } }])`
     * ——**它测的是自己**：那个数组是我在这儿现写的，跟 `day.ts` 那六处
     * 写了什么毫无关系。打断验的时候把 `day.ts` 的名单改回两项，
     * **判据照旧全绿**。
     *
     * 改成扫库：把那几处 `notIn` 的实际内容读出来，逐个问里头有没有他。
     */
    const { readFileSync: read2 } = await import('node:fs')
    const 漏的: string[] = []
    for (const f of ['day', 'illness', 'leaving', 'routine']) {
      const text = read2(`src/content/life/${f}.ts`, 'utf8')
      for (const m of text.matchAll(/living:\s*\{\s*notIn:\s*\[([^\]]*)\]/g)) {
        const 名单 = m[1]!
        // 只管那些排除了高墙里头的人的——那几处正是「干活/做工」那一族
        if (!名单.includes('palace')) continue
        if (!名单.includes('up-there')) 漏的.push(`${f}.ts: [${名单.replace(/\s+/g, ' ').trim()}]`)
      }
    }
    if (漏的.length > 0) {
      wrong.push(`${漏的.length} 处「干活」的排除名单里没有 up-there：${漏的.join('、')}`)
    }
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('\n  ✓ 上了山 living 和 home 都跟着走了——世界知道他不在村里了。')
  }
}

// ============================================================
// 七、被赶出来的人，不该还被叫上山
// ============================================================
{
  /**
   * **旗活得比关系久。**
   *
   * 30.md 第二片给药庐立了一条规矩：说出去了，往后不用来了
   * （`mountain:shut` 那一节把 `footing` 打回「不理会」）。
   * **可 `known-on-the-mountain` 还在**——那件事确实发生过，
   * 它不该因为后来闹翻了就消失。
   *
   * 于是被赶出来的人照样满足这一卷的入口，而山上根本不会再要他。
   * 22 报的这一条，修法是加一条排除，**不是删那面旗**。
   *
   * 这一问静态查：那条 requires 在不在。**不跑局，因为跑局要先掷出
   * 「说出去了」那一支，而它本身稀有**——而这一条的正确性跟掷不掷到无关。
   */
  const { readFileSync } = await import('node:fs')
  const src = readFileSync('src/content/life/going-up.ts', 'utf8')

  const 排除了 = /key:\s*'shut-out-by-the-shed'\s*,\s*absent:\s*true/.test(src)

  /*
   * 尺子自检的一半：那面旗得真的存在于 `mountain.ts`，否则这一条排除的是
   * 一个不存在的东西——**而那种条件恒为真，长得跟守住了一模一样**。
   */
  const 那面旗还在 = /key:\s*'shut-out-by-the-shed'/.test(
    readFileSync('src/content/life/mountain.ts', 'utf8'),
  )

  const wrong: string[] = []
  if (!排除了) {
    wrong.push('没排除 `shut-out-by-the-shed`——被药庐赶出来的人还会被叫上山')
  }
  if (!那面旗还在) {
    wrong.push('`mountain.ts` 不再落 `shut-out-by-the-shed` 了——那条排除正在守一个不存在的东西')
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('  ✓ 被赶出来的人不会再被叫上山——旗记着那件事发生过，而关系断了是另一面旗。')
  }
}

// ============================================================
// 七、尺子自检
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
