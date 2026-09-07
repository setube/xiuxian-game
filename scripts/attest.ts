/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 门禁：制度参照窗口。
 *
 * ## 这支尺子量什么
 *
 * 库里每一条史实性内容都该答得出三个问题——**出自哪个时段、出处是什么、
 * 是查到的还是推出来的**。这支门禁按这三格逐条查，报三种账：
 *
 *     缺格　　　三格里有一格没填
 *     出处太软　「明代」两个字不算出处
 *     时代错位　标着史料，可它出自别的朝代
 *
 * ## 为什么「时代错位」不是错误，是欠账
 *
 * 用户拍板这一格时说的原话，是要防住这种事：
 *
 * > 一个作者看过某个宋代材料，觉得「挺有古味」，两年以后悄悄写进明代事件。
 *
 * 注意这句话里危险的是**「悄悄」**，不是「宋代」。一条宋代材料明明白白标着
 * 出自宋代，并且有人知道它在那儿，这不是问题；问题是它跟明代材料混在一起，
 * 长得一模一样，两年后谁也认不出来。
 *
 * 所以这支门禁**不会因为时代错位而变红**——它把那些格数出来、列在报表上，
 * 让它们一直在明面上。`palace` 那一套称谓（爹爹、娘娘）就是现成的一条：
 * 出处是宋人笔记，而这个世界照的是明。那一格的正文里写着为什么暂时留着宋的
 * （一个有出处的宋代词，好过一个没出处的明代词），**留着是判断，不是疏忽**。
 * 判断可以留，但不能没人知道。
 *
 * 真正让它红的只有两件：**缺格**和**出处太软**。这两件都是「没人做过这个判断」，
 * 不是「做过判断而选择留着」。
 *
 * ## 它守不住什么
 *
 * 机器守得住「有没有标出处」，守不住「出处对不对」。一条编造的书名卷次
 * 照样能过这支门禁——那是人的活，不是尺子的活。这支门禁的全部作用是
 * **让没标的那些格无处可藏**，好让人把注意力花在该核的地方。
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ATTESTATIONS } from '../src/content/address'
import {
  isOutOfPeriod,
  MIN_SOURCE_LENGTH,
  REFERENCE_PERIOD,
  TIMELESS,
  type Attestation,
} from '../src/content/attest'

/** 报表里一条出处最多显示这么长，超了截断——报的是哪一格不对，不是把原文抄一遍 */
const EXCERPT = 40

/** 仓库根。这支门禁要读内容文件的原文，不能只靠 import */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function excerpt(text: string): string {
  return text.length <= EXCERPT ? text : `${text.slice(0, EXCERPT)}…`
}

/**
 * 全库带出处的内容，拉平成一张表。
 *
 * 现在只有称谓那三张表接进来了。**再有别的内容要带出处，在这儿加一行**，
 * 别在那边自己写一支门禁——散在各处的话，添一条内容而忘了标出处，
 * 谁也不会吭声，而这支门禁存在的全部理由正是不让那种事发生。
 */
function everythingAttested(): readonly { where: string; attested: Attestation }[] {
  return ATTESTATIONS
}

// ============================================================
// 第二道：没来登记的那些
// ============================================================

/**
 * 上面那一道有个前提：**内容会主动来登记。**
 *
 * 而最危险的那种恰恰不会。用户那句话说的就是它——
 *
 * > 一个作者看过某个宋代材料，觉得「挺有古味」，两年以后悄悄写进明代事件。
 *
 * 悄悄写进去的那句话不会跑来填三个格子，它就是一句注释、一段正文。
 * 第一道尺子对它是瞎的：`ATTESTATIONS` 里没有它，于是数出来永远齐全。
 * **判据只查登记过的，就等于宣布没登记的都合格。**
 *
 * 所以第二道反过来找：**凡是点了朝代名的散文，都在声称一件史实**——
 * 不然「明代」两个字没有必要出现。而声称史实就该答得出出处。
 * 朝代名是这类句子留下的把柄，因为不提朝代它就不构成史实主张。
 *
 * 抓到之后有两条路，都合规：给它补一格出处（多半是 `合理化`），
 * 或者把朝代名去掉——**不声称是史实，就不必有出处。**
 * 门禁不替人选，只负责让这个选择被做出来。
 */
const DYNASTIES: readonly string[] = [
  '明代',
  '明朝',
  '宋代',
  '宋朝',
  '唐代',
  '唐朝',
  '清代',
  '清朝',
  '元代',
  '汉代',
]

/**
 * 扫哪些文件。
 *
 * 只扫 `src/content/`——那儿是内容层，一句「明代农家冬天……」写在这儿
 * 就是在给世界定调。引擎和门禁里提到朝代多半是在讨论判据本身，不是在写世界。
 */
const CONTENT_DIR = 'src/content'

/** 已经登记过出处的文件。这些文件里提朝代是正当的——它们的出处在第一道里查 */
const REGISTERED_FILES: readonly string[] = ['address.ts', 'attest.ts']

/**
 * `eras.ts` 整个文件豁免。
 *
 * 它是**年号词库的元规则**：通篇在说「哪些真年号不许进词库」「为什么排除明代年号」。
 * 那儿的每一个「明代」都不是在给世界定调，恰恰相反——是在**防止**世界被读成换皮明朝。
 * 拿史实出处去要求它，等于要求一句「不许用明代年号」自己引一条明代史料。
 */
const RULE_FILES: readonly string[] = ['eras.ts']

/**
 * 这一行已经自己带着出处了。
 *
 * 「永乐十九年改北京为京师」「镖局系于清代、明代称标客标行」——**朝代名后面
 * 跟着年号、卷次、书名或具体制度**，那就是出处本身，不是无根的史实主张。
 * 第二道要抓的是「说了朝代却什么依据也没有」，不是「凡提朝代皆有罪」。
 *
 * 抓得太宽的后果比漏抓更糟：报表上十二条里十条是误报，人就不看它了，
 * 而真正那两条也一起淹掉——**一支没人看的门禁等于没有。**
 */
const CITED = /[一二三四五六七八九十百]+年|卷[一二三四五六七八九十百]+|《[^》]+》|元年|年间/

interface Claim {
  file: string
  line: number
  dynasty: string
  text: string
}

function unregisteredClaims(): Claim[] {
  const found: Claim[] = []
  const dir = join(ROOT, CONTENT_DIR)
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts')) continue
    if (REGISTERED_FILES.includes(name)) continue
    if (RULE_FILES.includes(name)) continue
    const text = readFileSync(join(dir, name), 'utf8')
    const lines = text.split('\n')
    for (const [index, line] of lines.entries()) {
      const hit = DYNASTIES.find((one) => line.includes(one))
      if (hit === undefined) continue
      if (CITED.test(line)) continue
      found.push({ file: `${CONTENT_DIR}/${name}`, line: index + 1, dynasty: hit, text: line.trim() })
    }
  }
  return found
}

function ruler(): string[] {
  const wrong: string[] = []
  const all = everythingAttested()

  if (all.length === 0) {
    return ['一条带出处的内容也没扫到——这支门禁在空转，判据永远绿']
  }

  // —— 一：三格齐不齐 ——
  for (const one of all) {
    const { period, source, status } = one.attested
    if (!period || period.trim() === '') {
      wrong.push(`${one.where} 没写 period——不知道这条材料出自哪个时段`)
    }
    if (!source || source.trim() === '') {
      wrong.push(`${one.where} 没写 source——不知道这条材料的出处`)
    }
    if (status !== '史料' && status !== '合理化') {
      wrong.push(`${one.where} 的 status 是「${String(status)}」，只能是「史料」或「合理化」`)
    }
  }

  // —— 二：出处站不站得住 ——
  for (const one of all) {
    const { source } = one.attested
    if (source && source.length < MIN_SOURCE_LENGTH) {
      wrong.push(
        `${one.where} 的出处只写了 ${source.length} 个字：「${source}」——` +
          '一句话说不清一个词是从哪儿来的，等于没写',
      )
    }
  }

  // —— 三：两档都得有人 ——
  const sourced = all.filter((one) => one.attested.status === '史料')
  const reasoned = all.filter((one) => one.attested.status === '合理化')
  if (sourced.length === 0) {
    wrong.push('一条史料也没有——这一层全是编的，历史感无从谈起')
  }
  if (reasoned.length === 0) {
    wrong.push('一条合理化也没有——那等于宣称每个词都引得出出处，而口语实录并不存在')
  }

  return wrong
}

/** 时代错位的那些格。不进 `wrong`，只上报表——见文件头「为什么不是错误」 */
function outOfPeriod(): readonly { where: string; attested: Attestation }[] {
  return everythingAttested().filter((one) => isOutOfPeriod(one.attested))
}

function main(): void {
  console.log('制度参照窗口')
  console.log(`  参照时段：${REFERENCE_PERIOD}（design/ming-society.md）\n`)

  const all = everythingAttested()
  const sourced = all.filter((one) => one.attested.status === '史料')
  const reasoned = all.filter((one) => one.attested.status === '合理化')

  console.log(
    `  覆盖：一共 ${all.length} 条，史料 ${sourced.length} 条，合理化 ${reasoned.length} 条`,
  )

  const byPeriod = new Map<string, number>()
  for (const one of all) {
    byPeriod.set(one.attested.period, (byPeriod.get(one.attested.period) ?? 0) + 1)
  }
  const spread = [...byPeriod.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([period, count]) => `${period} ${count}`)
    .join('，')
  console.log(`  时段分布：${spread}`)

  const adrift = outOfPeriod()
  if (adrift.length === 0) {
    console.log(`\n  ✓ 没有时代错位的格（史料那一档全在 ${REFERENCE_PERIOD} 或 ${TIMELESS}）`)
  } else {
    console.log(`\n  ⚠ 时代错位 ${adrift.length} 条——有出处，但不是这个世界的朝代：`)
    for (const one of adrift) {
      console.log(`      ${one.where}`)
      console.log(`        ${one.attested.period}：${excerpt(one.attested.source)}`)
    }
    console.log('      ——这不是错误，是欠账。留着是判断，但得有人知道它在那儿。')
  }

  const claims = unregisteredClaims()
  if (claims.length === 0) {
    console.log(`\n  ✓ ${CONTENT_DIR} 的散文里没有点着朝代却没登记出处的句子`)
  } else {
    console.log(`\n  ⚠ 点了朝代但没来登记出处的 ${claims.length} 处：`)
    for (const one of claims) {
      console.log(`      ${one.file}:${one.line}（${one.dynasty}）`)
      console.log(`        ${excerpt(one.text)}`)
    }
    console.log('      ——提到朝代就是在声称一件史实。要么补一格出处（多半是「合理化」），')
    console.log('        要么把朝代名去掉：不声称是史实，就不必有出处。')
  }

  const wrong = ruler()
  if (wrong.length > 0) {
    console.log(`\n✗ ${wrong.length} 处：`)
    for (const one of wrong) console.log(`  - ${one}`)
    process.exit(1)
  }

  console.log('\n✓ 每一条史实性内容都答得出「哪个时段、什么出处、查的还是推的」。')
  console.log('  **机器守得住有没有标，守不住标得对不对**——后者是人的活。')
}

main()
