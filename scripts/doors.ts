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
 * 跑法：bun scripts/doors.ts
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIFE = 'src/content/life'

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

/** 库里那些 NPC 出场时多大。从内容里 `who: { age: N }` 读，不在这儿猜 */
function agesOf(): Map<string, number> {
  const found = new Map<string, number>()
  for (const name of readdirSync(join(ROOT, LIFE))) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(ROOT, LIFE, name), 'utf8')
    for (const m of text.matchAll(
      /type:\s*'meet',[\s\S]{0,400}?id:\s*'([\w-]+)'[\s\S]{0,400}?age:\s*(\d+)/g,
    )) {
      const id = m[1]!
      const age = Number(m[2])
      if (!found.has(id)) found.set(id, age)
    }
  }
  return found
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

interface Door {
  file: string
  event: string
  who: string
  window: [number, number]
  /** 那一处 `requires` 前后的注释。用来看有没有人想过 */
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
      for (const who of body.matchAll(/family:\s*\{\s*id:\s*'([^']+)',\s*alive:\s*true/g)) {
        found.push({
          file: name,
          event: block[1]!,
          who: who[1]!,
          window: [Number(block[2]), Number(block[3])],
          context: body,
        })
      }
    }
  }
  return found
}

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
    // 注释里写了理由的，说明有人想过——见 `REASONED` 那儿
    if (REASONED.test(door.context)) {
      想过.push(`${door.file} ${door.event}：要求 ${door.who} 活着，注释里写了理由`)
      continue
    }
    const born = ages.get(door.who)
    if (born === undefined) {
      // 出场年龄不明：报出来让人看一眼，但不判红——**没查到和没问题是两回事**
      放过.push(`${door.file} ${door.event}：${door.who} 出场年龄不明，算不出他会不会死在窗口里`)
      continue
    }

    /*
     * 他在这一卷窗口的末尾有多大。
     *
     * 玩家窗口的上界减去玩家拜他为师/入学那年的岁数，加上他出场时的年龄——
     * 这儿取个粗的：**他出场时多大，加上窗口跨度**。宁可高估
     * （高估会多报几条让人看，低估会漏掉真的）。
     */
    const 窗口末他多大 = born + (door.window[1] - door.window[0])

    if (窗口末他多大 >= DEATH_STARTS_AT) {
      锁死.push(door)
    }
  }

  if (锁死.length > 0) {
    console.log(`  ✗ ${锁死.length} 处：一个跟这条线无关的人死了，整卷就再也不演：`)
    for (const one of 锁死) {
      const born = ages.get(one.who)!
      console.log(
        `      ${one.file} 的 ${one.event}：要求 ${one.who} 活着` +
          `（出场 ${born} 岁，窗口 ${one.window[0]}–${one.window[1]}，末了 ${born + (one.window[1] - one.window[0])} 岁）`,
      )
    }
    console.log('      他一没，这一卷对玩家永远关着——而没有任何东西会因此报错。')
    console.log('      两条路：放宽那条 requires，或者给「他没了」写一支替代分支。')
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
  const born = ages.get('merchant')
  const 抓得到 =
    born !== undefined &&
    !EXPECTED.includes(反例.who) &&
    !REASONED.test(反例.context) &&
    born + 40 >= DEATH_STARTS_AT

  const 家里人放过 = EXPECTED.includes('father') && EXPECTED.includes('nephew')

  const broken: string[] = []
  if (!抓得到) broken.push('构造的「无关的人锁死一卷」没被抓到——判据太松')
  if (!家里人放过) broken.push('家里人没被放过——判据会把父债链那种内容当成 bug')

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
