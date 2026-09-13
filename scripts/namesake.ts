/**
 * 同名：一个字既是判据拿来认人的字，又是库里某个人的名字。
 *
 * 这是一支门禁脚本。它不进构建，标准输出就是它的产物。
 *
 * ## 由来：一条判据错了很久，而它一直是绿的
 *
 * 2026-09-13，`verify` 报「秦娘说都好」是「缺生母却把娘当活人写」的穿帮——
 * **而那是妻子在说话**。`match.ts` 四条议亲对象的 `given` 都是「娘」，
 * 落纸时妻子是「姓+娘」，生母是光杆「娘」：
 *
 * ```
 * 生母      「娘在老屋没了」「，娘说给孙子留着」
 * 配偶      「秦娘说都好」「林娘问起过药庐那边」
 * 生母 ghost /娘(说|在|回|走|去|问|叫)/   ← 分不开这两个人
 * ```
 *
 * ⚠️ **而这个洞不是那天引入的。** `mountain.ts:615/628` 早有
 * 「{call:spouse}说了」「{call:spouse}问起过」，从写下那天就会撞。
 * 它没红过，只因为那一族的分母是 0.37%——判据抽不到。
 * 新写的一卷到达率 95%，把照度从 0.37% 抬到 95%，它才显形。
 *
 * > **一个判据的错误率跟被测内容的到达率成正比，而到达率是别人的内容决定的。**
 * > 所以「这支门禁一直是绿的」这句话里，没有一个字是关于这支门禁的。
 *
 * ## 所以这一支守的是那个【查法】，不是那一次的结论
 *
 * 「全库只有『娘』这一个碰撞」是个会过期的事实——下一个人给谁起名叫「妹」，
 * 它就回来了，而且会以别的形状（撞的是别的判据、别的词）。
 * 能留住的只有问题本身：**两边都从数据取，求交集。**
 *
 * ```
 * 一边   判据真拿来认字的词    正则字面量 / new RegExp / includes / startsWith / endsWith
 * 另一边 库里真有的名字        src 下所有 given: 和 surname: 的字面值
 * ```
 *
 * 两边都不手写清单——手写那张表正是「判据的关键词表要照库里真写的字抄」
 * 那条毛病（我第一版就手写了一张亲属称谓表，而它漏掉了引擎层的人）。
 *
 * ## ⚠️ 这一支绿，只等于「名字字面层的碰撞查过了」
 *
 * 它不回答实体错认那一大类里的别的形状，跟 GPT 过这一轮时列的：
 * 不同词形指向同一个人、同一个词在不同语境指向不同人**而不与姓名字面碰撞**、
 * 判据读了错的状态来源、判据没有碰撞词却把死人当活人、正文生成那一步
 * 已经把实体信息丢了。**别拿这一支的绿去替那几类背书。**
 *
 * ## ⚠️ 往 `HANDLED` 加条目、或往这儿加自检的人，先读这一条
 *
 * > **一个从没响过的自检，和一个不存在的自检，在报表上没有区别。**
 * > 所以这儿每一条自检，都要能说出它**响过一次**是什么时候、砍掉哪一步会让它响。
 *
 * 写的是「被证明响过一次」这个**状态**，不是「要去打断验证」这个**动作**
 * ——动作会被赶时间的人跳过，而那正是这张表要防的东西。
 *
 * 这一支的七条，2026-09-13 逐条砍过，各响一次：
 *
 * ```
 * 只扫一个文件                    → 「只摊出 0 个判据用词，太少」
 * 让判据那边收不到「娘」            → 「verify 里的「娘」没被抓到」
 * 让人名那边收不到「娘」            → 「match.ts 里叫「娘」的那几位没被抓到」
 * 拿掉去 \r ／ 拿掉剥行注释         → 行注释自检红
 * 拿掉剥块注释                     → 块注释自检红
 * 删掉 verify ／ mourning 的处置    → 登记当场过期，各指名哪一头没了
 * ```
 *
 * ⚠️ 补这七条时发现：**正向自检天然不会被拿去打断**。反向的
 *（「拿掉剥注释 → 该红」）写的时候就带着「我要让它红」的意图；
 * 正向的（「该抓到的抓到了吗」）写的时候心里想的是「它现在是对的」。
 * 这一支七条里有三条从没响过，全是这一类。
 *
 * ## 头一个 import 是 `./lib/seeded`，纯静态的也一样
 *
 * 这一支一颗骰子也不掷（只读文件、剥注释、求交集），我头一版因此直接从
 * `node:fs` 起手，`replay` 当场红。理由 `unused.ts:88` 已经写过一遍：
 * **那条判据不给「反正我不掷骰子」开例外，而那是对的**——开了例外它就得
 * 判断哪一支「真的不掷」，而那件事静态看不出来。
 *
 * 跑法：bun scripts/namesake.ts
 */
import './lib/seeded'

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return name.endsWith('.ts') ? [path] : []
  })
}

/**
 * 块注释换成等长空白（保住行号），行注释砍掉。
 *
 * ⚠️ **先去掉 `\r`，这一步不是洁癖。** 这个仓库的文件是 CRLF，
 * 而 JS 的 `.` 不匹配 `\r`（它跟 `\n` 一样算行终止符）——
 * 于是 `/\/\/.*$/` 里的 `$` 永远够不着字符串结尾，**行注释一条也剥不掉**。
 * 踩过：`birth.ts:321` 的 `// 一、爹在不在` 被当成了判据用词，
 * 而「剥不干净」和「剥干净了」印出来都是「清单里多几个词」。
 */
function strip(source: string): string {
  return source
    .split('\r')
    .join('')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')
}

/**
 * 已经查过、且确认拦得住的碰撞。
 *
 * ⚠️ **这不是豁免表，是「查过了，这么处置的」的登记。**
 *
 * 而光靠「要写清三样」这条纪律挡不住赶时间的人——散文理由可以含混，
 * 含混还看不出来。所以每一条**必须附一个可执行的断言**（`holds`）：
 * 它去读真代码，确认那个处置此刻还在。
 *
 * ```
 * 散文理由      三个月后处置被人删了，这行字照旧读着很有道理
 * 可执行断言    处置一删，这一条当场红，而且指到具体是哪一句没了
 * ```
 *
 * 这样「敷衍地登记」不再比「去修」省事：你得写出一句**真能失效**的断言，
 * 而写得出那句话，多半也就已经看懂那个处置了。
 *
 * ⚠️ 而 `holds` 是**必填字段**——这一点比上面那段话硬：
 * 登记一条却不写断言，**类型层就过不去**，不是「成本高到没人愿意敷衍」，
 * 是根本敷衍不了。（同「`atLeast` 在类型层排除『埋着』比在注释里叮嘱可靠」。）
 */
const HANDLED: readonly { word: string; why: string; holds: () => string | undefined }[] = [
  {
    word: '娘',
    why: [
      'match.ts 四条议亲对象的 given 都是「娘」，落纸成「秦娘」「林娘」。',
      '  · verify（tasks/verify-relations.ts）扫之前把在册人的「姓+名」抹成「·」，',
      '    抹完「秦娘说」不剩「娘说」，而光杆「娘说」原样留着',
      "  · mourning 用的是 startsWith('娘')，锚在句首——妻子有姓，撞不上",
    ].join('\n'),
    holds: () => {
      const relations = readFileSync('scripts/tasks/verify-relations.ts', 'utf8')
      if (!relations.includes('aliases') || !relations.includes("split(alias).join('·')")) {
        return 'verify 那头的处置没了：verify-relations.ts 不再把在册人的名字抹掉'
      }
      const mourning = strip(readFileSync('scripts/mourning.ts', 'utf8'))
      if (!mourning.includes("startsWith('娘')")) {
        return "mourning 那头的处置变了：不再是 startsWith('娘')，锚可能已经不在句首"
      }
      return undefined
    },
  },
]

/** 判据「认字」的几种写法。故意写窄——宁可漏，不可把说明文字收进来当判据用词 */
const MATCHERS = [
  /\/[^/\n]+\/[gimsuy]*/g,
  /new RegExp\(\s*['"`][^'"`\n]*['"`]/g,
  /\.(?:includes|startsWith|endsWith)\(\s*['"`][^'"`\n]*['"`]/g,
]

const slash = (path: string) => path.split('\\').join('/')

/**
 * 尺子自己不在被量的那一堆里。
 *
 * ⚠️ 头一版没排，它当场红在自己身上：本文件 107 行的 `/[一-龥]+/g`
 * 是个字符类区间，而「一」和「龥」被当成了判据认人的字；
 * 上头 `HANDLED` 里那句说明文字写着 `startsWith('娘')`，同样会被读成用法。
 *
 * **这跟「提出标准的人不在标准的射程里」是反过来的一面**：那一条说的是
 * 定标准的人容易漏掉自己，这一条是尺子把自己的刻度当成了读数。
 * 一手核过，全库只有本文件用中文字符类区间（`grep -rln "一-龥" scripts/`），
 * 所以排掉它不会连累别支。
 */
const SELF = 'namesake.ts'

const words = new Map<string, string[]>()
/**
 * 不过滤长度的那一份，只给尺子自检用。
 *
 * ⚠️ 自检要问「注释里的字进没进来」，而注释里那句是「爹在不在」——**四个字**，
 * 会被下面 `length > 3` 那道过滤掉。我头一版直接写 `words.has('爹在不在')`，
 * 那是一条**恒假的判据**：剥注释坏没坏它都不会响。
 * 自检问的东西，得从没经过那道过滤的地方取。
 */
const rawWords = new Set<string>()
for (const file of walk('scripts')) {
  if (file.endsWith(SELF)) continue
  strip(readFileSync(file, 'utf8'))
    .split('\n')
    .forEach((raw, index) => {
      for (const matcher of MATCHERS) {
        for (const hit of raw.matchAll(matcher)) {
          for (const token of hit[0].matchAll(/[一-龥]+/g)) {
            rawWords.add(token[0])
            // 四字以上是句子（文件头自述、编年原句照抄），不是认人的字
            if (token[0].length > 3) continue
            if (!words.has(token[0])) words.set(token[0], [])
            words.get(token[0])!.push(`${slash(file)}:${index + 1}`)
          }
        }
      }
    })
}

const names = new Map<string, string[]>()
for (const file of [...walk('src/content'), ...walk('src/engine'), ...walk('src/stores')]) {
  strip(readFileSync(file, 'utf8'))
    .split('\n')
    .forEach((raw, index) => {
      for (const hit of raw.matchAll(/(?:given|surname):\s*'([^']+)'/g)) {
        if (!names.has(hit[1]!)) names.set(hit[1]!, [])
        names.get(hit[1]!)!.push(`${slash(file)}:${index + 1}`)
      }
    })
}

const wrong: string[] = []

/**
 * 尺子自检。
 *
 * ⚠️ **只验「已知那个坑还在不在」是不够的**——这一支的探针版本被我自己
 * 骗过四次，而四次里「娘」都被正确抓到了，坏的是别的部分：
 *
 * ```
 * 把 /* 三、… *\/ 当成正则字面量     → 五个假候选（二三五一小）
 * 手写一张亲属称谓表当筛子           → 漏掉引擎层的人
 * CRLF：JS 的「.」不匹配 \r         → 行注释【一条也没剥掉】，而看不出来
 * 尺子扫到了自己                     → /[一-龥]+/g 里的「一」「龥」被当成用词
 * ```
 *
 * 所以除了正向那两条，还问三件**不依赖「预先猜中下一种污染物」**的：
 * 行注释真剥掉了吗（`birth.ts` 那句「爹在不在」）、块注释真剥掉了吗
 * （`seeking.ts` 那句「总得有一类通得到真入口」）、摊出来的量级对不对。
 * 三条各盯一整类失效，不是盯某个词。
 *
 * ⚠️ 中间有一版写的是「清单里不许有纯数字词」——**那是误报**：
 * `mountain.ts:676` 的 `.includes('四十五')` 是真用词（造册那年他报四十五）。
 * 自检要问的是「剥注释那一步生没生效」，不是「结果看着像不像脏东西」。
 */
if (!words.get('娘')?.some((one) => one.includes('verify'))) {
  wrong.push('尺子坏了：verify 里的「娘」没被抓到。底下的清单不能当结论读')
}
if (!names.get('娘')?.some((one) => one.includes('match'))) {
  wrong.push('尺子坏了：match.ts 里叫「娘」的那几位没被抓到')
}
if (words.size < 50 || names.size < 10) {
  wrong.push(`尺子坏了：只摊出 ${words.size} 个判据用词、${names.size} 个人名，太少`)
}
// 剥注释没生效时，这两句会被当成判据用词——一句在行注释里，一句在块注释里
if (rawWords.has('爹在不在')) {
  wrong.push('尺子坏了：行注释里的字进了清单，`//` 那一步没生效（多半又是 CRLF）')
}
if (rawWords.has('总得有一类通得到真入口')) {
  wrong.push('尺子坏了：块注释里的字进了清单，`/* */` 那一步没生效')
}

const clashes: { word: string; where: string[]; name: string; at: string[] }[] = []
for (const [word, where] of words) {
  for (const [name, at] of names) {
    if (name.includes(word)) clashes.push({ word, where, name, at })
  }
}

console.log(`\n=== 同名验收（判据用词 ${words.size} 个 × 库里名字 ${names.size} 个）===\n`)

const known = new Set(HANDLED.map((one) => one.word))
const fresh = clashes.filter((one) => !known.has(one.word))

for (const one of clashes.filter((c) => known.has(c.word))) {
  const handled = HANDLED.find((h) => h.word === one.word)!
  const broken = handled.holds()
  console.log(`  ◇ 「${one.word}」——查过了：\n    ${handled.why.split('\n').join('\n    ')}`)
  if (broken === undefined) {
    console.log(`    ✓ 上面说的那两处处置，此刻都还在（读真代码验过）\n`)
  } else {
    console.log(`    ✗ ${broken}\n`)
    wrong.push(`「${one.word}」的登记过期了：${broken}`)
  }
}

// 登记了一个词，而库里根本没有这个同名了——那条登记该撤，不然它会一直替将来的某个人背书
for (const handled of HANDLED) {
  if (clashes.some((one) => one.word === handled.word)) continue
  wrong.push(
    `HANDLED 里登记着「${handled.word}」，而现在没有这个同名了——撤掉它，别让它替下一个人背书`,
  )
}

if (fresh.length > 0) {
  console.log(`  ✗ ${fresh.length} 个没登记过的同名：\n`)
  for (const one of fresh) {
    console.log(`    「${one.word}」判据用它 ${one.where.length} 处；「${one.name}」是人名`)
    console.log(`      判据：${one.where.slice(0, 5).join(' · ')}`)
    console.log(`      人名：${one.at.slice(0, 3).join(' · ')}\n`)
  }
  console.log('  判据认的是【字】，而字认不出人。先确认那几处判据会不会把这个人当成另一个人：')
  console.log('  锚在句首（startsWith）多半撞不上（人名有姓），而正则里的光杆字会撞。')
  console.log('  确认拦得住就往 HANDLED 里登记一条，写清楚谁在用、为什么撞不上、处置在哪。\n')
  wrong.push(`${fresh.length} 个没登记过的同名`)
}

if (wrong.length > 0) {
  console.log('✗ 不成立：')
  for (const line of wrong) console.log(`    ${line}`)
  console.log()
  process.exitCode = 1
} else {
  console.log('  ✓ 两项都在：\n')
  console.log('    · 尺子自己判得出——已知那两头（verify 的「娘」、match 里叫「娘」的人）都在册')
  console.log(`    · ${clashes.length} 个同名，${known.size} 个查过并登记了处置，没有新的\n`)
  console.log('  这一支不问「正文对不对」，只问「判据认的那个字，会不会指向另一个人」。\n')
}
