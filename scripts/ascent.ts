/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 修仙第一条纵切：凡人 → 听说 → 找 → 遇见 → 认识一个修士 → 想学 → 试学 → 第一次修炼 → 成／败。
 *
 * 施工决议 ⑤ 要这一片先证明一件事：**修仙真的可以从刚建立的凡人世界里自然长出来。**
 * 这条链的每一环库里早就有了（seeking / meeting / tutelage / riverman / attempt / afterwards），
 * 各有各的门禁，可它们量的都是自己那一卷——摆好的局、塞好的属性。没有一支把链
 * 从头到尾放进真世里走一遍。走了一遍（2026-09-08，400 世随机选 + 400 世有心人）：
 *
 *     药庐那条　　十二岁念头一起就撞进去，心志够不着门槛（58 量的是肯不肯守着，
 *                 十四岁心志中位 51），一辈子只去一回，链在第一格就死了：400 世 0 世到第二格
 *     找人那条　　线索对上要在十三到十六岁之间，遇见要在十四到十六——0.3%
 *     书那条　　　通，可要三件稀事叠上（抬起来的是修士 × 命数够过渡口 × 带着书到），有心人 2%
 *
 * 三册的窗口都写着「到十六岁为止」，理由是「成年那一段人生还没写」——那一段早有了（`4f2ba6d`），
 * 窗口没跟着挪。第一笔：三册窗口挪到成年段末（`GROWN_UP`）；药庐加「再去一趟」那一节
 * （他要的正是肯天天守着的人）；修士不按凡人公式老死（陶仲八十三岁入册，几年内会「老病」）。
 * 挪完拜师那条仍近乎走不到（有心人 300 世 1 世到「使唤」）、书那条有心人 2%。
 *
 * **用户拍板（2026-09-08）：拜师那条要走得通；书那条 2% 太稀。** 第二笔：陶仲的台阶 8 → 4
 * （门槛 58 不动，「教一点」82 → 70）；使唤、带一段改可反复（一天的坏运气不再锁死整条链）；
 * 续上的四件开到壮年末；成年段「接着打听」点念头（`kept-asking` 那条火种——念头层从前
 * 冻在十六岁）；再去一趟 0.4；渡口命数门槛 55 → 50。改完有心人 300 世：那五句 33、会了门路 21、
 * 自己坐过 20，第一次修炼 12（4%）；随便走的人拜师到底 1 世、第一次修炼 0。
 *
 *   一、摆好的局：十四岁、念头在、头一回被晾（旗标没落）→「再去一趟」开着；心志够了再去，
 *       他说「你若真想学，明日再来」，落「搭话」，往后接的是使唤那一卷；自己说不去了的回不来。
 *   二、窗口从段表取：入口（药庐、再去、问人、对上、观里）到 `GROWN_UP`，师承续上的四件到 `PRIME_UP`，
 *       目录跟着；「再去一趟」带 `chance`（宽窗口可反复的事没有它会挤光日常）。
 *   三、修士不老死：陶仲入册带 `realm`，推四十年还在；对照：一个八十五岁的凡人推四十年会没。
 *   四、随机人生（分片，两种走法）：漏斗表只报数；有心人那一批掷到使唤、带一段、那五句、自己坐、
 *       观里、第一次修炼、觉出了什么各至少一世为止（上限十倍）；链的单调性；不许太好走
 *       （有心人第一次修炼 ≤ 20%、会了门路 ≤ 20%，随机第一次修炼 ≤ 10%）；也不许掉回拍板前
 *       （有心人第一次修炼 ≥ 2%、会了门路 ≥ 2%——一批低了再掷一批合起来算）。
 */
import './lib/seeded'

import { CULTIVATORS } from '../src/content/cultivators'
import { lifeEvents } from '../src/content/life'
import { CHAPTERS } from '../src/content/life/chapters'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { GROWN_UP, PRIME_UP } from '../src/engine/stages'
import { useCharacterStore } from '../src/stores/character'
import { makePerson } from '../src/stores/people'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import { STAGES, type AscentLife, type AscentPayload, type Policy } from './tasks/ascent-lives'

const LIVES = 300
const SHED = 'herbalist-at-the-shed'
const FOOTING = `footing:${SHED}`
const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)
const inWindow = (id: string, age: number): boolean => {
  const event = eventOf(id)
  return event !== undefined && age >= event.window.from && age <= event.window.to
}

let bad = 0

// ============================================================
// 一、再去一趟药庐
// ============================================================
{
  const wrong: string[] = []
  const youngster = (): Staged | null => born('farm', 14, ['mother'])
  const s = youngster()
  if (!s) wrong.push('掷不出局')
  else {
    const character = useCharacterStore()
    s.world.setFlag('leaning:know', true)
    // 头一回：一个坐不住的孩子，他量到的数够不着门槛
    character.attributes = { ...character.attributes, will: 18, body: 22 }
    const shed = eventOf('tutor-shed')
    if (!shed || !meetsAll(shed.requires) || !inWindow('tutor-shed', 14))
      wrong.push('十四岁、念头在，药庐那一卷却关着')
    play('tutor:shed', 'just-stay')
    if (s.world.getFlag(FOOTING) !== undefined)
      wrong.push(`头一回该被晾着（旗标不落），却落了「${String(s.world.getFlag(FOOTING))}」`)
    s.world.setFlag('event:tutor-shed', true)
    const again = eventOf('tutor-shed-again')
    if (!again) wrong.push('库里没有「再去一趟」这条事件')
    else {
      if (!meetsAll(again.requires)) wrong.push('被晾过、念头还在，「再去一趟」却关着')
      // 上限 0.5：它在链上，链一开头就排在散事件前面，再高就是回回都去；下限 0.2 是拍板后标定的（0.4）
      if (again.chance === undefined || again.chance > 0.5 || again.chance < 0.2)
        wrong.push(
          `「再去一趟」是宽窗口可反复的事，chance 该在 0.2–0.5 之间：${again.chance ?? '（无）'}`,
        )
      if (!again.repeatable) wrong.push('「再去一趟」得能反复来')
    }
    // 走了，他还是没问你来做什么
    const walked = play('tutor:shed', 'walk-off', 'again')
    if (!walked.some((line) => line.includes('他还是没问你来做什么')))
      wrong.push(`看了一会儿走了那一节：${walked.join(' / ')}`)
    if (s.world.getFlag(FOOTING) !== undefined) wrong.push('看了一会儿走了，旗标不该动')
    if (again && !meetsAll(again.requires)) wrong.push('走了一回之后「再去一趟」该还开着')
    // 几年后心志够了再去：他把戥子放下了
    character.attributes = { ...character.attributes, will: 95, body: 80 }
    const texts = play('tutor:shed', 'just-stay', 'again')
    if (!texts.some((line) => line.includes('后来你又去了一趟镇西')))
      wrong.push(`再去一趟的开场：${texts.slice(0, 2).join(' / ')}`)
    /*
     * 他松口那句（「你若真想学，明日再来」）是 `tutelage` 效果的回执，`play()` 只收正文不收回执，
     * 所以这儿看的是它留下的事实：旗标落了「搭话」。那句话在库里由 `verify` 守着
     * （`ceiling` 以下缺一格台词就红）。
     */
    if (s.world.getFlag(FOOTING) !== '搭话')
      wrong.push(`该落「搭话」，落的是「${String(s.world.getFlag(FOOTING) ?? '（无）')}」`)
    if (again && meetsAll(again.requires)) wrong.push('落了「搭话」之后「再去一趟」该关了')
    const errand = eventOf('tutor-errand')
    if (!errand || !meetsAll(errand.requires)) wrong.push('落了「搭话」，使唤那一卷却没接上')
  }
  // 反面：自己说不去了的，回不来
  const t = youngster()
  if (!t) wrong.push('掷不出第二局')
  else {
    t.world.setFlag('leaning:know', true)
    t.world.setFlag('event:tutor-shed', true)
    t.world.setFlag(FOOTING, '不理会')
    const again = eventOf('tutor-shed-again')
    if (again && meetsAll(again.requires)) wrong.push('自己说了不去了，「再去一趟」却还开着')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、再去一趟：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、被晾过的人回得来：心志够了那一趟他说「明日再来」，落「搭话」，往后接使唤；自己说不去了的回不来。',
    )
}

// ============================================================
// 二、窗口从段表取
// ============================================================
{
  const wrong: string[] = []
  if (GROWN_UP < 20 || GROWN_UP > 40) wrong.push(`成年段末该在二十到四十之间：${GROWN_UP}`)
  if (PRIME_UP <= GROWN_UP || PRIME_UP > 60)
    wrong.push(`壮年末该在成年末之后、六十之前：${PRIME_UP}`)
  // 入口到成年段末：三十岁往后不会有人头一回撞进药庐、头一回开口问人
  const entries = ['tutor-shed', 'tutor-shed-again', 'seek-asking', 'seek-crossed', 'meet-temple']
  // 续上的到壮年末：一段开始了的关系不因过了二十九就断
  const continued = ['tutor-errand', 'tutor-walk', 'tutor-words', 'tutor-alone']
  for (const [ids, until, why] of [
    [entries, GROWN_UP, '入口该到成年段末'],
    [continued, PRIME_UP, '续上的该到壮年末'],
  ] as const) {
    for (const id of ids) {
      const event = eventOf(id)
      if (!event) wrong.push(`库里没有 ${id}`)
      else if (event.window.to !== until)
        wrong.push(`${id} 的窗口到 ${event.window.to} 为止，${why}（${until}）`)
    }
  }
  for (const [id, until] of [
    ['seeking', GROWN_UP],
    ['meeting', GROWN_UP],
    ['tutelage', PRIME_UP],
  ] as const) {
    const chapter = CHAPTERS.find((one) => one.id === id)
    if (!chapter) wrong.push(`目录里没有 ${id}`)
    else if (chapter.age[1] !== until)
      wrong.push(`目录里 ${id} 写的是到 ${chapter.age[1]}，事件到 ${until}`)
  }
  // 一个二十四岁的人，念头在，这几卷对他开着；三十岁入口关了、续上的还开着；五十岁全关
  const s = born('farm', 24, [])
  if (!s) wrong.push('掷不出局')
  else {
    s.world.setFlag('leaning:know', true)
    if (!inWindow('tutor-shed', 24) || !inWindow('seek-asking', 24) || !inWindow('meet-temple', 24))
      wrong.push('二十四岁，找人、照面、师承对他该开着')
    if (inWindow('tutor-shed', GROWN_UP + 1)) wrong.push('过了成年段，药庐那一卷该关了')
    if (!inWindow('tutor-words', GROWN_UP + 1))
      wrong.push('过了成年段，那五句该还开着——关系已经开始了')
    if (inWindow('tutor-alone', PRIME_UP + 1)) wrong.push('过了壮年，自己坐那一卷该关了')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、窗口：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 二、找人、照面、师承的入口开到成年段末（${GROWN_UP} 岁），师承续上的四件开到壮年末（${PRIME_UP} 岁）；目录跟着；「再去一趟」带 chance。`,
    )
}

// ============================================================
// 三、修士不按凡人公式老死
// ============================================================
{
  const wrong: string[] = []
  for (const one of CULTIVATORS) {
    if (one.realm === undefined) wrong.push(`${one.id} 没有 realm，入册后会按凡人老死`)
  }
  const s = born('farm', 20, [])
  if (!s) wrong.push('掷不出局')
  else {
    applyEffects([{ type: 'meeting', who: SHED }])
    const tao = s.people.personOf(SHED)
    if (!tao) wrong.push('见过药庐那位，人口册上却没有他')
    else {
      if (tao.realm !== '炼气')
        wrong.push(`人口册上他该是炼气修士，记的是「${tao.realm ?? '（无）'}」`)
      const age = s.world.time.year - tao.bornYear
      if (age < 60) wrong.push(`他比玩家大七十一岁，入册时该有七八十：${age}`)
    }
    applyEffects([{ type: 'time', years: 40 }])
    if (!s.people.isAlive(SHED)) wrong.push('推了四十年，药庐那位按凡人的岁数「老病」殁了')
    // 对照：一个八十五岁的凡人推四十年，掷到没了为止——这把尺子量得出老死
    let mortalDied = false
    for (let tries = 0; tries < 20 && !mortalDied; tries += 1) {
      const id = `mortal-${tries}`
      s.people.enroll(
        makePerson({
          id,
          surname: '常',
          given: '人',
          gender: '男',
          bornYear: s.world.time.year - 85,
          health: 40,
          place: s.world.place,
        }),
      )
      s.people.live(40)
      if (!s.people.isAlive(id)) mortalDied = true
    }
    if (!mortalDied) wrong.push('对照组：八十五岁的凡人推四十年，二十回都没没——老病那条公式断了')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、修士不老死：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log(`  ✓ 三、${CULTIVATORS.length} 位修士都带 realm；陶仲入册后推四十年还在；八十五岁的凡人照旧会没。`)
}

// ============================================================
// 四、随机人生：两种走法各报一张漏斗表
// ============================================================
{
  const wrong: string[] = []
  const CAP = LIVES * 10
  const batch = (policy: Policy, runs: number) =>
    mapShards<AscentLife[], AscentPayload>({
      task: 'scripts/tasks/ascent-lives.ts',
      runs,
      payload: { policy },
    }).then((all) => all.flat())
  const count = (lives: AscentLife[], key: string) => lives.filter((one) => one.hit[key]).length
  const table = (label: string, lives: AscentLife[]): void => {
    const n = lives.length
    console.log(
      `\n  · ${label}：${n} 世，走完一生 ${lives.filter((one) => one.finished).length}，第一次修炼的年纪 ${
        lives
          .map((one) => one.attemptAt)
          .filter((age): age is number => age !== null)
          .sort((a, b) => a - b)
          .join('、') || '（无）'
      }`,
    )
    for (const stage of STAGES) {
      const hit = count(lives, stage.key)
      const base = stage.after ? count(lives, stage.after) : n
      const cond =
        stage.after && base > 0 ? `　（上一环 ${base} → ${Math.round((hit / base) * 100)}%）` : ''
      console.log(
        `    ${String(hit).padStart(4)}  ${((hit / n) * 100).toFixed(1).padStart(5)}%  ${stage.label}${cond}`,
      )
    }
  }

  const random = await batch('random', LIVES)
  let keen = await batch('keen', LIVES)
  const firstKeen = keen
  /*
   * 存在性：有心人那一批掷到这几环各至少一世为止。分布只用首批。
   *
   * 用户拍板（2026-09-08）：拜师那条要走得通。所以「那五句」「自己坐过」也进这张表——
   * 头一版它们只印 ⚠，因为陶仲的台阶（8 分一格，「教一点」要 82）在真世里够不着；
   * 台阶改成 5、使唤和带一段可反复、成年打听点念头、再去一趟 0.25 之后，
   * 这几环该是走得到的，走不到就红。
   */
  const MUST = ['errand', 'walk', 'words', 'alone', 'temple', 'attempt', 'felt']
  const missing = (lives: AscentLife[]) => MUST.filter((key) => count(lives, key) === 0)
  while (missing(keen).length > 0 && keen.length < CAP)
    keen = [...keen, ...(await batch('keen', LIVES))]

  table('随机选', random)
  table('有心人', firstKeen)
  if (keen.length > firstKeen.length) console.log(`\n  · 有心人补掷到 ${keen.length} 世`)
  // 一世也没到过的环印出来（MUST 之外的，比如「觉出了什么」之后那两卷）
  const never = STAGES.filter((stage) => count(keen, stage.key) === 0)
  if (never.length > 0)
    console.log(
      `\n  ⚠ 有心人 ${keen.length} 世里一世也没到过：${never.map((one) => one.label).join('；')}`,
    )

  for (const key of missing(keen)) {
    const stage = STAGES.find((one) => one.key === key)
    wrong.push(
      `${keen.length} 世有心人里没有一世到过「${stage?.label ?? key}」——这一环在真世里走不到`,
    )
  }
  // 链的单调性：到了后一环必到过前一环（量的是尺子，不是内容）
  const ORDERED: readonly [string, string][] = [
    ['felt', 'attempt'],
    ['attempt', 'qi'],
    ['qi', 'bookriver'],
    ['bookriver', 'book'],
    ['walk', 'errand'],
    ['words', 'walk'],
    ['known', 'mountain'],
    // 观里要的是那一条线索，不是对上；头一版写成 ['temple','crossed']，600 世里 2 世到了观却没对上——尺子错了
    ['temple', 'lead'],
    ['crossed', 'lead'],
  ]
  for (const [later, earlier] of ORDERED) {
    const broken = [...random, ...keen].filter((one) => one.hit[later] && !one.hit[earlier]).length
    if (broken > 0) wrong.push(`${broken} 世到了「${later}」却没到过「${earlier}」——尺子或链断了`)
  }
  // 不许太好走
  const keenAttempt = count(firstKeen, 'attempt') / firstKeen.length
  const randomAttempt = count(random, 'attempt') / random.length
  if (keenAttempt > 0.2)
    wrong.push(`有心人两成以上走到了第一次修炼（${Math.round(keenAttempt * 100)}%）——太好走了`)
  if (randomAttempt > 0.1)
    wrong.push(
      `随便走的人一成以上走到了第一次修炼（${Math.round(randomAttempt * 100)}%）——太好走了`,
    )
  // 拜师那条也不许太好走：他还是只肯教沉得住的那一类人
  const keenRite = count(firstKeen, 'rite') / firstKeen.length
  if (keenRite > 0.2)
    wrong.push(`有心人两成以上让药庐那位教了（${Math.round(keenRite * 100)}%）——他成了谁都教的人`)
  /*
   * 也不许掉回去。
   *
   * 用户拍板（2026-09-08）：拜师那条要走得通，有心人 2% 走到第一次修炼太稀。改完量出
   * 第一次修炼 4%（300 世 12 世）、会了门路 7%（21 世）。地板各放在 2%：抓的是掉回拍板前那个数
   * （拜师 0、书 2%），不是几个点的漂移。300 世里 2% 是 6 世，一批掷低了不算——再掷一批
   * 合起来算，两批都低才红（存在性那套的变体）。
   */
  const FLOOR = 0.02
  let pooled = keen
  const under = (lives: AscentLife[]) =>
    (['attempt', 'rite'] as const).filter((key) => count(lives, key) / lives.length < FLOOR)
  if (under(pooled).length > 0) pooled = [...pooled, ...(await batch('keen', LIVES))]
  for (const key of under(pooled)) {
    const stage = STAGES.find((one) => one.key === key)
    wrong.push(
      `有心人 ${pooled.length} 世里到过「${stage?.label ?? key}」的只有 ${((count(pooled, key) / pooled.length) * 100).toFixed(1)}%——掉回拍板前那个「太稀」了`,
    )
  }
  // 每一环都有量法（尺子自检）
  for (const stage of STAGES) {
    if (!(stage.key in (keen[0]?.hit ?? {}))) wrong.push(`「${stage.label}」没有量法`)
  }

  if (wrong.length > 0) {
    console.log(`\n  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `\n  ✓ 四、有心人 ${keen.length} 世里，使唤、带一段、那五句、自己坐、观里、第一次修炼、觉出了什么各至少一世到过；链单调；第一次修炼有心人 ${Math.round(keenAttempt * 100)}%、随机 ${Math.round(randomAttempt * 100)}%，会了门路有心人 ${Math.round(keenRite * 100)}%——走得通，也不算好走。`,
    )
}

if (bad > 0) {
  console.log(`\n${bad} 条红。`)
  process.exitCode = 1
} else console.log('\n修仙第一条纵切：四条全绿。')
