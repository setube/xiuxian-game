/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 判据里抄的那句正文，库里还在吗。
 *
 * 跑法：`bun scripts/quoting.ts`
 *
 * ## 这一支从一个环来
 *
 * 这个库有一条成文规矩：**判据的关键词表要照库里真写的字抄**
 * （凭印象写会匹配不上，见 `ruler-standard-must-come-from-system` 那一族）。
 * 规矩是对的，而它留下一个没人守的后半段：
 *
 * ```
 * 抄的时候   判据 ← 正文        ✓ 对得上
 * 正文改了   判据 ← 正文'       ✗ 【没有任何地方会红】
 * ```
 *
 * ⚠️ 2026-09-14 撞到过更坏的一种：`presence.ts` 的 `SPEAKER_IDS`
 * 把「周侍讲」映射到 `tutor`，**而那处正文本身是穿帮**
 * （宫里那位造出来姓沈）。于是
 *
 * ```
 * 正文说   「周侍讲」在说话
 * 判据问   「周侍讲」开口了吗
 *          ↓  绿。两者互相印证着对方是对的。
 * ```
 *
 * > **一处错正文加一张跟着它抄的表，谁也不会红。**
 *
 * ## 所以这一支问的是一个很窄的问题
 *
 * > 判据源码里那些**抄自正文的整句**，在内容库里还找得到吗？
 *
 * 找不到 = 那一条判据**已经静默失效**：它要么恒假（再也匹配不上），
 * 要么在拿一句不存在的话当锚点。
 *
 * ⚠️ **而它答不了「抄的那句话本身对不对」**——那要第三方事实来源
 * （`surname.ts` 是一个例子：它拿 `onEnter` 里的 `who.surname`
 * 去对正文，而不是拿正文对正文）。
 *
 * ```
 * 这一支      抄的那句还在吗        静态可判
 * surname.ts  抄的那句说得对吗      要世界事实做第三方
 * ```
 *
 * ## ⚠️ 头一次判完的四句，四句全正当
 *
 * ```
 * going-up   「这句话库里没有」  自检锚点，【故意】要它找不到
 * subject    「承诺边界」        判据自己的术语，不是正文
 * presence   「是病没的」×2      查的是【认知库的 summary】，引擎生成的
 * ```
 *
 * 所以这一栏的三种正当理由是：
 *
 * ```
 * 一  自检锚点      判据故意抄一句不存在的话，验「不该抓的没抓」
 * 二  判据的术语    那几个字是判据自己的词，本来就不在内容里
 * 三  不是正文      认知库条目 / 日录标签 / 旗标说明——引擎生成的字
 * ```
 *
 * ⚠️ 第三种最值得留意：**它们确实是玩家读得到的字，只是不住在内容库里**。
 * 这一支的干草堆是 `src/content/` 的源文本，抓不到运行时才拼出来的话。
 *
 * ## 报数不判成败
 *
 * 找不到的不一定是错——判据可能有意抄一句**不该出现**的话
 * （「爹殁了之后还写着『父亲』」那种反例锚点）。**摆出来给人看。**
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'

/** 判据里抄的整句：四个汉字以上，允许带标点 */
/**
 * 判据里抄的整句：四个汉字以上，允许带标点。
 *
 * ⚠️ **不用汉字做字符范围的端点。** 头一版写 `[一-龥…]`，
 * 而 `namesake` 当场报红：那个「一」撞上人名「沈一贯」的「一」。
 * 同一处第二次了（`surname.ts` 头一版一样）——**这个坑会反复踩，
 * 因为 `[一-龥]` 是写中文正则最顺手的那个写法。**
 *
 * 处置照上次：换成 Unicode 脚本属性，**消除歧义本身，
 * 不往 `namesake` 的登记表里加例外。**
 */
const QUOTED = /includes\('((?:\p{Script=Han}|[，。、！？：；「」]){4,})'\)/gu

/**
 * 干草堆：**整个 `src/content/` 的源文本**，不是 `lifeScenes` 摊出来的那一份。
 *
 * ⚠️ 头一版只收 `lifeScenes`，报出 13 句「库里找不到」——**13 句全是误报**。
 * 逐句查下去，它们分别在：
 *
 * ```
 * mountain    summary     认知库条目（引擎生成的，不是正文块）
 * days-manor  label       日常那一套（BEATS / DOINGS，不是 Scene）
 * leanings    text        倾向那一套
 * days        tags        日录的标签
 * ```
 *
 * **玩家读得到的字，不止住在 `lifeScenes` 里。** 而逐个 import 那些导出
 * （`DOINGS`/`BEATS`/`MANOR_*`/`LEANINGS`/`SPARKS`/`DAMPERS`…）
 * 要求我记全——**漏掉一个就是一批误报，而误报会让人去查没毛病的地方**。
 *
 * 读源文本天然覆盖所有来源：这一支要判的是「这句话还在不在这个库里」，
 * 而源码就是那个库最完整的形态。
 *
 * 代价是它也会匹配到**注释里举的例子**——那会让判据偏向「找得到」，
 * 也就是**偏向不报**。这个方向是对的：宁可漏一条待查的，
 * 不要报十三条没毛病的。
 */
const contentFiles: string[] = []
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.ts')) contentFiles.push(full)
  }
}
walk('src/content')
const ALL = contentFiles.map((one) => readFileSync(one, 'utf8')).join('｜')

interface Lost {
  file: string
  line: number
  said: string
}

const lost: Lost[] = []
let quoted = 0
const SELF = 'quoting.ts'

for (const file of readdirSync('scripts').filter((one) => one.endsWith('.ts') && one !== SELF)) {
  const lines = readFileSync(`scripts/${file}`, 'utf8').replace(/\r/g, '').split('\n')
  lines.forEach((line, i) => {
    // 注释里举的例子不算
    if (/^\s*(\*|\/\/)/.test(line)) return
    for (const hit of line.matchAll(QUOTED)) {
      const said = hit[1]
      if (said === undefined) continue
      quoted += 1
      if (!ALL.includes(said)) lost.push({ file, line: i + 1, said })
    }
  })
}

console.log(`\n=== 判据里抄的那句正文，库里还在吗 ===\n`)
console.log(`  ${quoted} 处抄了正文原句（四个汉字以上）。\n`)

if (lost.length === 0) {
  console.log(`  ✓ 每一句在内容库里都找得到。\n`)
} else {
  const byFile = new Map<string, Lost[]>()
  for (const one of lost) {
    if (!byFile.has(one.file)) byFile.set(one.file, [])
    byFile.get(one.file)?.push(one)
  }
  console.log(`  ⚠️ ${lost.length} 句在库里找不到：`)
  for (const [file, rows] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`      ${file}`)
    for (const one of rows) console.log(`          「${one.said}」`)
  }
  console.log(
    `\n      ——找不到【不一定是错】：判据可能有意抄一句不该出现的话\n` +
      `      （「爹殁了之后还写着父亲」那种反例锚点）。而每一句都值得问一遍：\n` +
      `      **正文是不是改过，而这一条判据从此再也匹配不上了？**\n`,
  )
}

console.log(
  `  ⚠️ 这一支答不了「抄的那句话【说得对不对】」——那要第三方事实来源。\n` +
    `  （scripts/surname.ts 是一个例子：它拿 onEnter 里的 who.surname 去对正文，` +
    `  而不是拿正文对正文。一处错正文加一张跟着它抄的表，谁也不会红。）\n`,
)
