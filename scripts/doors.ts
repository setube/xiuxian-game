/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一个人死了，多少扇门跟着关上。
 *
 * ## 这一支守的是什么
 *
 * 2026-09-08 同一天里，同一个母题发作了两次：
 *
 *     师傅殁了　出师那一卷的正文照旧写「他把家什推到你面前」　　`present` 抓到
 *     先生殁了　`exam` 整章不开，「学童」成了无期的　　　　　　 `identity` 抓到
 *
 * **一个 NPC 的死，让一整条内容路径对玩家关闭**，而没有任何东西会因此报错。
 * 两支门禁各抓到它的一半：一半是**死人还在正文里出现**，另一半是**活人的路被锁上**。
 *
 * 而它还有第三种形态，**那两支都抓不到**：条件挂在一个只落旗标、不改身份、
 * 不产正文的节点上。那个人一死，旗标永远落不下来——**玩家读不到少了什么，
 * 判据也看不到多了什么**。
 *
 * ## 为什么静态判，不跑世界
 *
 * 要跑世界才能发现「这一卷再也没演过」，就得等那个人恰好在窗口内死掉的那些世
 * ——而那是概率事件。`present` 撞上「师傅殁了」用了一颗特定的种子，
 * `identity` 撞上「先生殁了」靠的是五颗种子里有四颗。**漏掉一次就是两天。**
 *
 * 这一支扫的是**代码**：库里每一处「要求某人活着」的事件级 `requires`，
 * 逐个问那个人会不会在窗口内死。跟世界怎么演无关，也不受采样污染影响
 * （2026-09-08 主干上先后出过两次采样污染，随机判据的数全部作废，
 * 而这一支照跑不误）。
 *
 * ## 不是每一处都是 bug——三种情形要分开
 *
 *     家里人（爹娘兄嫂）　　他们死了本来就该改变剧情走向，那是内容不是漏洞
 *     窗口错开　　　　　　　那个人在这一卷的年龄窗口里死不了（太年轻）
 *     真锁死　　　　　　　　他会在窗口内死，而这一卷没有替代分支
 *
 * 判据只报第三种。头两种放过，理由写在 `EXPECTED` 和年龄推算那儿。
 *
 * ## ⚠️ 这一支只算「他会不会死」，而 `alive: true` 挡的不止死亡
 *
 * `family.alive` 那一格对**不存在的人**也返回 false（`household.isAlive`
 * 查不到人就是 false）。所以一条 `{ family: { id: 'nurse', alive: true } }`
 * **同时在答两个问题**：
 *
 *     他殁了没有　　　　这一支算得出（`deathOdds`）
 *     这一世立了他没有　这一支一无所知
 *
 * 2026-09-09 在 `royal-dismissal` 上撞见：乳母在那个窗口只有 3% 会殁，
 * **可那条 requires 挡掉的主要是「这一世根本没立她」**——写它的人想的是前一个，
 * 而实际生效的是后一个。库里早写明了分家的办法（`types/game.ts:1488`：
 * 「要问『还没有这个人』用 `exists: false`」），**可读的那一端没有对应的纪律**：
 * 写 `alive: true` 的人不会想到自己顺带也要求了 `exists: true`。
 *
 * **所以这一支报绿，不等于那条 requires 没挡住人。** 它只保证「不是死亡挡的」。
 *
 * 跑法：bun scripts/doors.ts
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/**
 * 扫哪个目录。
 *
 * `DOORS_LIFE_DIR` 是给**打断实验**用的：把内容拷进 `node_modules/.tmp/` 改坏，
 * 验判据抓不抓得住。**不这样做的话，打断就得改真文件**——而这个仓库是共享工作区，
 * 改别人刚提交的文件再 `git checkout --` 还原，是拿破坏性命令做实验。
 */
const LIFE = process.env.DOORS_LIFE_DIR ?? 'src/content/life'

/**
 * 这些人死了就该改变走向，不算「门被锁上」。
 *
 * 爹娘兄嫂侄儿是**家里人**——`hardship` 那条父债链就是靠父亲的死推进的
 * （`debt-death` 要求他活着，正是因为那一卷演的是他还活着时的最后一段）。
 * 要求他们活着不是漏洞，是内容本身。
 *
 * **判断的界线**：这个人的死**是不是这条线要讲的事**。是的话，那一卷不演
 * 恰恰是对的；不是的话（先生、师傅、掌柜），他的死就成了无关的门闩。
 */
const EXPECTED: readonly string[] = [
  'father',
  'mother',
  'brother',
  'brother-wife',
  'nephew',
  'nephew-wife',
  'sister',
  '生母',
  '生父',
  '兄',
  '弟',
  '子',
  '女',
  '配偶',
  '抚养',
]

/**
 * `people.live()` 里那条自然死亡：45 岁往上每年 `(age-45)*0.004`，
 * 底子差的再加 `(50-health)*0.0016`。
 *
 * **所以一个人要在某个窗口内有实质的死亡概率，他得在那段时间里过了四十五。**
 * 这个数不是拍的，是从 `src/stores/people.ts` 那一行读来的——
 * 改了那条公式，这儿要跟着改。
 */
const DEATH_STARTS_AT = 45

/**
 * 库里那些 NPC 多大。**从内容里读，不在这儿猜。**
 *
 * ## 两种年龄，两个语义——混在一起会把岁数算小
 *
 * 头一版只扫 `src/content/life/` 里的 `{ type: 'meet', who: { age: N } }`，
 * 于是 `page` `steward` `nurse` `east-head` 四个全报「出场年龄不明」，欠了两天。
 * 而**他们的年龄一直写在代码里**，只是写在 `content/birth.ts`，而且
 * **语义跟 `who.age` 不是一回事**：
 *
 *     who: { age: 20 }        他出场那一刻二十岁　　　　　　　　绝对
 *     older: [42, 60]         他比玩家大四十二到六十岁　　　　　相对
 *     bornYear - randomBetween(24, 50)   同上，邻居那批　　　　 相对
 *
 * 后两种是**引擎按户生成的人**（`makePerson` + `people.enroll`），
 * 不走内容层的 `meet` 效果，所以没有 `who: { age }`。
 *
 * ⚠️ **把相对当绝对，岁数会算小一大截**：`steward` 比玩家大 60 岁，
 * `royal-dismissal` 窗口 9–13，玩家十三岁那年他**七十三**；
 * 按绝对算法（出场岁数 + 窗口跨度）只得 64。**同一处红，两个岁数，
 * 而 64 那个正好卡在门槛边上**——差一点就把一条真的报成了「刚过线」。
 *
 * ⚠️ **「我这个工具看不见」不等于「它不存在」**——2026-09-09 有人据前一版的
 * 「算不出来」推断那批邻居不参与老死，实测反了：他们有 `bornYear`，
 * 玩家六十岁那年在世率 0%。走查读的是 `who.age`，老死读的是 `Person.bornYear`，
 * 两个字段两条路径，而同名的 `meet`（引擎方法 vs 内容效果）是陷阱。
 *
 * 区间取**上界**：跟底下那句「宁可高估」同一个立场——
 * 高估会多报几条让人看，低估会漏掉真的。
 */
function agesOf(): { absolute: Map<string, number>; older: Map<string, number> } {
  const absolute = new Map<string, number>()
  const older = new Map<string, number>()

  for (const name of readdirSync(join(ROOT, LIFE))) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(ROOT, LIFE, name), 'utf8')
    for (const m of text.matchAll(
      /type:\s*'meet',[\s\S]{0,400}?id:\s*'([\w-]+)'[\s\S]{0,400}?age:\s*(\d+)/g,
    )) {
      const id = m[1]!
      if (!absolute.has(id)) absolute.set(id, Number(m[2]))
    }
  }

  // 引擎按户生成的那批：府里的下人、隔壁的邻居。他们的岁数记在「比玩家大多少」上
  const birth = readFileSync(join(ROOT, 'src/content/birth.ts'), 'utf8')
  for (const m of birth.matchAll(
    /pid:\s*'([\w-]+)',[\s\S]{0,200}?older:\s*\[\s*\d+,\s*(\d+)\s*\]/g,
  )) {
    const id = m[1]!
    if (!older.has(id)) older.set(id, Number(m[2]))
  }

  // 先收「变量名 → 比玩家大几岁」，底下再拿 `bornYear: xxxBorn` 去配——不受书写顺序影响
  const born = new Map<string, number>()
  for (const m of birth.matchAll(
    /const\s+(\w+)Born\s*=\s*bornYear\s*-\s*randomBetween\(\s*\d+,\s*(\d+)\s*\)/g,
  )) {
    born.set(m[1]!, Number(m[2]))
  }
  for (const m of birth.matchAll(/id:\s*`\$\{side\}-(\w+)`[\s\S]{0,600}?bornYear:\s*(\w+)Born/g)) {
    /*
     * `${side}-head` 展开成东西两家。岁数不在这一段里——它写在上头那行
     * `const headBorn = bornYear - randomBetween(24, 50)`，**在 `id:` 之前**。
     *
     * ⚠️ 头一版的正则从 `id:` 往后找 `randomBetween`，于是一次也没匹配上，
     * 而 `east-head` 照旧报「算不出来」。**它没被发现，是因为 `namedInComment`
     * 先把那一处放过了**——两个独立的判断串在一起，前一个的绿掩盖了后一个的瞎。
     * 是打断实验（把注释里的名字抹掉）把它逼出来的。
     */
    const suffix = m[1]!
    const span = born.get(m[2]!)
    if (span === undefined) continue
    for (const side of ['east', 'west']) {
      const id = `${side}-${suffix}`
      if (!older.has(id)) older.set(id, span)
    }
  }
  return { absolute, older }
}

/**
 * 这一处已经有人想过了——**注释里写着为什么要求他活着**。
 *
 * 头一版没有这一条，于是三处全报成 bug：`school-praise`、`school-fair`、
 * `youth-exam` 都要求先生活着，而三处的注释都明写着理由——
 *
 * > 这一卷里「先生看了你一会儿」「先生把你留了一下」都是硬写的字，
 * > **那是对的，这一卷说的就是他**。旗标不会因为一个人死了就变，
 * > 于是先生殁了之后他还在讲台上讲课。
 *
 * **那正是 `present` 那支门禁要防的事**，写的人是在修 bug，不是在造 bug。
 * 而我的判据把「做过判断并留下记录」报成了欠账——**跟 `attest.ts` 头一版
 * 栽的是同一跤**（它把「待核」「见某表」那几条认真标过的报成无出处）。
 *
 * 分界线：**这一卷讲的是不是他**。
 *
 *     讲的就是他　　先生夸了你一句、先生劝你去考　→ 他没了这一卷不演是对的
 *     他只是顺带　　掌柜引路、门房通报　　　　　　→ 他没了这一卷该照演
 *
 * 而这件事**机器判不出来**，得看那句注释。所以认它：一个 `requires` 上头
 * 带着解释的，说明有人想过了。**认不出这些痕迹，判据就会专挑最用心的那几处报**
 * ——今天已经在两支门禁上验证过这个规律。
 */
const REASONED = /开口的是|说的就是|这一卷里|硬写的字|他得还在|得问一句/

/**
 * 这一处有人想过——**判的是「注释里点没点这个人的名字」，不是措辞**。
 *
 * ## 为什么加这一条：关键词表认不出没见过的说法
 *
 * 上头那张 `REASONED` 是照库里当时的原句抄的，可它守不住**将来的措辞**。
 * 52 在 `unrest-word` 上头写了十行讨论 `east-head` 会不会死，
 * 结论是「那条 `alive: true` 不能删——**一个死人不能来敲门**」，
 * 还把逐年在世率抄进了注释。**六个关键词一个也没命中。**
 *
 * 这正是「关键词表照印象写」那一族的失效：**表没跟上内容，
 * 而失效方向是误报**——判据会指着最用心的那一处喊「没人想过」。
 *
 * 所以再加一道**结构**的问法：那段注释里出现过这个人的 id 吗？
 * 出现了，就说明作者在讨论的正是他。
 *
 *     unrest-word       注释里 `east-head` 出现 3 次   → 想过
 *     royal-dismissal   注释通篇讲入场券和窗口，
 *                       `steward` 一次也没出现        → 没想过，该报
 *
 * **钉结构比钉措辞活得久**：换一种说法、换一个人来写，只要他在讨论这个人，
 * 那个 id 就会出现；而他若根本没想到这个人会死，id 就不会在那儿。
 */
function namedInComment(context: string, who: string): boolean {
  // 只看注释行，别把 `requires` 里那个 `id: 'east-head'` 本身算进来
  const comments = context
    .split('\n')
    .filter((line) => /^\s*(\*|\/\/)/.test(line))
    .join('\n')
  return comments.includes(who)
}

interface Door {
  file: string
  event: string
  who: string
  window: [number, number]
  /**
   * 那一处 `requires` **连同它上头那段注释**。用来看有没有人想过。
   *
   * ⚠️ 头一版只取 `id:` 到 `scene:` 之间那一段——**而作者写理由的地方在上头**，
   * 于是 `REASONED` 那张表面对的是一段永远不含理由的文本。
   * 52 在 `unrest-word` 上头写了整整十行讨论「那条 `alive: true` 不能删」，
   * 判据一个字也读不到。
   */
  context: string
}

/** 扫事件级 `requires` 里「要求某人活着」的那些 */
function doors(): Door[] {
  const found: Door[] = []
  for (const name of readdirSync(join(ROOT, LIFE))) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(ROOT, LIFE, name), 'utf8')
    for (const block of text.matchAll(
      /id:\s*'([\w-]+)',\s*\n\s*window:\s*\{\s*from:\s*(\d+),\s*to:\s*(\d+)[\s\S]{0,800}?scene:/g,
    )) {
      const body = block[0]
      // 往上取 1500 字：作者的理由写在 `id:` 上头那段块注释里，不在 requires 后头
      const above = text.slice(Math.max(0, block.index - 1500), block.index)
      for (const who of body.matchAll(/family:\s*\{\s*id:\s*'([^']+)',\s*alive:\s*true/g)) {
        found.push({
          file: name,
          event: block[1]!,
          who: who[1]!,
          window: [Number(block[2]), Number(block[3])],
          context: above + body,
        })
      }
    }
  }
  return found
}

/**
 * 走完这一卷的窗口，他死掉的概率。
 *
 * ## 为什么不看「窗口末他多大」这一个数
 *
 * 头一版判的是「窗口末他有没有过四十五」。**45 是死亡概率刚离开零的那一点，
 * 不是它开始有分量的那一点**——`people.live()` 那条公式在 45 岁那年的
 * 年死亡率是 0，49 岁才 1.6%，走完五年也只掉 4%。
 *
 * 2026-09-09 实测 2000 世（生在府里的 34 世），两处的差别是一个数量级：
 *
 *     nurse    窗口末 49 岁　算 4%　　实测 34 世里没了 1 次（3%）
 *     steward  窗口末 73 岁　算 42%　实测 34 世里没了 19 次（56%）
 *
 * **两个都过了 45，而一个是真门闩，一个是误报。** 单看岁数分不开它们。
 * （steward 实测比算的高，是因为这儿取 `older` 的上界，而库里是 42–60 的区间，
 * 加上底子差的那一项 `(50-health)*0.0016`。**判据偏保守，方向是对的**。）
 *
 * 公式照 `src/stores/people.ts` 那一行抄：45 岁往上每年 `(age-45)*0.004`。
 * 底子那一项不算——判据不知道这个人的 health，**少算一点好过瞎猜一个**。
 */
function deathOdds(door: Door, ages: ReturnType<typeof agesOf>): number | undefined {
  const older = ages.older.get(door.who)
  const absolute = ages.absolute.get(door.who)

  /*
   * 相对那一路是精确的：他比玩家大 60 岁，玩家九岁到十三岁，他就是 69 到 73。
   * 绝对那一路只能取近似——`who.age` 说的是「`meet` 那一刻多大」，
   * 而 `meet` 发生在哪一年内容层不写，只好从出场岁数往后数窗口跨度。
   */
  const 逐年岁数: number[] = []
  if (older !== undefined) {
    for (let age = door.window[0]; age <= door.window[1]; age += 1) 逐年岁数.push(older + age)
  } else if (absolute !== undefined) {
    for (let i = 0; i <= door.window[1] - door.window[0]; i += 1) 逐年岁数.push(absolute + i)
  } else {
    return undefined
  }

  let 活着 = 1
  for (const his of 逐年岁数) {
    if (his > DEATH_STARTS_AT) 活着 *= 1 - (his - DEATH_STARTS_AT) * 0.004
  }
  return 1 - 活着
}

/**
 * 多大的概率算「这一卷对他关着」。
 *
 * **这个数是有语义的，不是从实测数据里挑一个刚好分开两处的**：
 * 五个人里有一个读不到这一卷，那是常态；三十个里有一个，那叫稀有。
 * 「锁死」这个词该留给前者。
 *
 * 落在这条线两边的实测（2026-09-09，2000 世）：
 *
 *     nurse    4%　　三十四个府里的孩子，一个碰上　　→ 稀有，不报
 *     steward  42%　 一半以上碰上　　　　　　　　　　→ 报
 *
 * ⚠️ **会过期**：`people.live()` 那条公式一改，这两个数全变。
 */
const LOCKED_ODDS = 0.2

console.log('\n=== 一个人死了，多少扇门跟着关上 ===\n')

let bad = 0
const all = doors()
const ages = agesOf()

console.log(`  库里 ${all.length} 处事件级 requires 要求某人活着。\n`)

// ============================================================
// 一、无关的人锁死了整卷
// ============================================================
{
  const 锁死: Door[] = []
  const 想过: string[] = []
  const 放过: string[] = []

  for (const door of all) {
    if (EXPECTED.includes(door.who)) continue
    // 注释里写了理由的，说明有人想过——见 `REASONED` 和 `namedInComment` 那儿
    if (REASONED.test(door.context) || namedInComment(door.context, door.who)) {
      想过.push(`${door.file} ${door.event}：要求 ${door.who} 活着，注释里写了理由`)
      continue
    }
    const 关着的概率 = deathOdds(door, ages)
    if (关着的概率 === undefined) {
      // 出场年龄不明：报出来让人看一眼，但不判红——**没查到和没问题是两回事**
      放过.push(`${door.file} ${door.event}：${door.who} 出场年龄不明，算不出他会不会死在窗口里`)
      continue
    }

    if (关着的概率 >= LOCKED_ODDS) {
      锁死.push(door)
    }
  }

  if (锁死.length > 0) {
    console.log(`  ✗ ${锁死.length} 处：一个跟这条线无关的人死了，整卷就再也不演：`)
    for (const one of 锁死) {
      const older = ages.older.get(one.who)
      const 出处 =
        older !== undefined ? `比玩家大 ${older} 岁` : `出场 ${ages.absolute.get(one.who)!} 岁`
      const 末了 =
        older !== undefined
          ? older + one.window[1]
          : ages.absolute.get(one.who)! + (one.window[1] - one.window[0])
      console.log(
        `      ${one.file} 的 ${one.event}：要求 ${one.who} 活着` +
          `（${出处}，窗口 ${one.window[0]}–${one.window[1]}，末了 ${末了} 岁，` +
          `走完这一程他没了的概率 ${(deathOdds(one, ages)! * 100).toFixed(0)}%）`,
      )
    }
    console.log('      他一没，这一卷对玩家永远关着——而没有任何东西会因此报错。')
    /*
     * 三条路，头一条往往最省——**22 在 30.md 第二片上实证过一次**：
     *
     * 「巷口邻家的人问起药庐」头一版钉死 `east-head` 活着，摆局的农家二十岁时
     * 四十局里三十四局他已经老病没了（他比玩家大 24–50 岁，人口册照凡人公式老死），
     * **这一卷从窗口一半起就是死的**。改成问「东邻那一户在不在」
     * （`{ house: { id: 'east' } }`），叫住你的写成「{house:east}的人」——
     * **谁当家谁问，户在人不在。**
     *
     * 分界：**这一卷讲的是不是那个人**。
     *
     *     讲的就是他　　先生夸了你一句、老管家查了三天　→ 钉人是对的，该写替代分支
     *     他只是那一户的代表　　邻家的人问起、门房通报　→ **钉户，别钉人**
     */
    console.log('      三条路：')
    console.log('        ① 能钉户就别钉人——`{ house: { id: ... } }`，谁当家谁出面')
    console.log('        ② 给「他没了」写一支替代分支（这一卷讲的就是他的时候）')
    console.log('        ③ 放宽那条 requires')
    bad += 1
  } else {
    console.log('  ✓ 没有哪一卷被一个无关的人的死锁死。')
  }

  if (想过.length > 0) {
    console.log(`
  · ${想过.length} 处要求某人活着，而注释里写了理由——放过：`)
    for (const one of 想过) console.log(`      ${one}`)
  }

  if (放过.length > 0) {
    console.log(`\n  ⚠ ${放过.length} 处算不出来：`)
    for (const one of 放过) console.log(`      ${one}`)
    console.log('      不判红——**没查到和没问题是两回事**，但也别当它们过了。')
  }
}

// ============================================================
// 二、尺子自检：拿两个已知的实例喂它
// ============================================================
{
  /*
   * 两个正例（都已修好，判据该放过）：
   *
   *     师傅殁了　`apprentice.ts` 补了 `gone` 那一支
   *     先生殁了　`exam.ts` 补了 `alone` 那一节
   *
   * 一个反例（手工构造，判据必须抓到）。
   *
   * **两头都验，一个随机世界也不用跑**——这正是静态判的好处。
   */
  const 反例: Door = {
    file: '（构造）',
    event: 'fake-locked',
    who: 'merchant',
    window: [20, 60],
    // 空的：这个反例正是「没人写理由」的那一种，`REASONED` 该放不过它
    context: '',
  }
  /*
   * ⚠️ 这几条**必须走 `deathOdds`**，不能自己写一遍算式。
   *
   * 头一版这儿写的是 `born + 40 >= DEATH_STARTS_AT`——**它把判定逻辑抄了一份**，
   * 于是 2026-09-09 把「绝对年龄」和「比玩家大多少」拆成两套算法时，
   * 判定那边改了、自检这边还在算老的，**而自检照旧全绿**。
   * 尺子自己复制了一份被测逻辑，就不再是尺子了。
   */
  const 反例概率 = deathOdds(反例, ages)
  const 抓得到 =
    反例概率 !== undefined &&
    !EXPECTED.includes(反例.who) &&
    !REASONED.test(反例.context) &&
    !namedInComment(反例.context, 反例.who) &&
    反例概率 >= LOCKED_ODDS

  const 家里人放过 = EXPECTED.includes('father') && EXPECTED.includes('nephew')

  /*
   * 判据算的概率，得跟实测对得上。
   *
   * 2026-09-09 实测 2000 世（生在府里的 34 世，`royal-dismissal` 窗口 9–13）：
   *
   *     steward  实测 34 世里没了 19 次（56%）　判据该算出 ≥ 20%（报）
   *     nurse    实测 34 世里没了  1 次（ 3%）　判据该算出 < 20%（不报）
   *
   * **这两条钉的是「判据分得开这两个人」**——头一版只看「窗口末过没过 45」，
   * 两个都过了，于是把 `nurse` 一起报了出来。单看岁数分不开一个数量级的差别。
   */
  const 管家 = deathOdds(
    { file: '（构造）', event: 'fake-steward', who: 'steward', window: [9, 13], context: '' },
    ages,
  )
  const 乳母 = deathOdds(
    { file: '（构造）', event: 'fake-nurse', who: 'nurse', window: [9, 13], context: '' },
    ages,
  )

  /* 注释里点了名的该放过，没点名的该抓住——`namedInComment` 那道的两头 */
  const 点名放过 = namedInComment('   * 这一卷要 east-head 在世，来敲门的得是真人\n', 'east-head')
  const 没点名不放过 = !namedInComment('   * 这一卷讲的是入场券和窗口\n', 'steward')

  const broken: string[] = []
  if (!抓得到) broken.push('构造的「无关的人锁死一卷」没被抓到——判据太松')
  if (!家里人放过) broken.push('家里人没被放过——判据会把父债链那种内容当成 bug')
  if (管家 === undefined || 乳母 === undefined) {
    broken.push('「比玩家大多少」那一路读不到 steward / nurse 的岁数')
  } else {
    if (管家 < LOCKED_ODDS) {
      broken.push(`管家那处算出 ${(管家 * 100).toFixed(0)}%，实测 56%——判据太松，真门闩会漏掉`)
    }
    if (乳母 >= LOCKED_ODDS) {
      broken.push(`乳母那处算出 ${(乳母 * 100).toFixed(0)}%，实测 3%——判据太紧，稀有会被误报成锁死`)
    }
  }
  if (!点名放过) broken.push('注释里点了名的没被认出来——写了理由的会被误报')
  if (!没点名不放过) broken.push('注释里没点名的也放过了——这道判法形同虚设')

  if (broken.length > 0) {
    console.log(`\n  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('\n  ✓ 尺子自检：构造的锁死抓得到，家里人的死放得过。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  他死了，你的路不该跟着断。\n')
}
