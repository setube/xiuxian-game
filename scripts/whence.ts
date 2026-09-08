/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 这一步是从哪儿来的。
 *
 * 20.md 那条最高级硬规则：
 *
 * > **任何重大事实、身份、关系、性格、立场和人生方向的变化，都必须存在
 * > 可追溯的前置经历和时间过程；不存在无来源的状态跳转。**
 *
 * 这一支只守这条规则的**第一个可验片段**：身份变了，年表里得有一笔。
 *
 * ## 为什么判「年表有没有记」，而不是判「有没有前置旗标」
 *
 * 因为查旗标是查不出问题的：内容作者写了旗标就过，**而那个旗标本身
 * 可能就是凭空打的**。判据往上多问一层没有尽头，总有一层是没人验的。
 *
 * 年表不一样——它是**写给玩家看的那句话**。「你承了户」「父亲被削了爵」
 * 「家里借了钱，送你进了私塾」，每一笔都是这一生里真的发生过、
 * 并且玩家真的读到过的事。身份变了而年表一个字没有，意味着
 * **玩家眼前这个人换了个身份，而他这辈子没有任何一件事解释得了它**。
 *
 * 20.md 自己也是这么要求的：不规定「必须经过这六步」，
 * 只要求「必须存在一条真实、合理、可解释的因果路径」。
 *
 * ## 六类里现在守得住哪几类
 *
 * 20.md 说的是六类：身份、关系、性格、愿望、婚姻、死亡。**不是每一类都能用
 * 同一把尺子量**——「变了而年表没长」这个问法只对身份成立。80 世实测：
 *
 *     类别    变化次数   其中年表没长
 *     身份         —          0       ← 判据本来就是为它写的
 *     关系       199         53
 *     婚姻        57          0       ← 永远绿
 *     死亡       481        345       ← 72% 报红
 *     愿望      1068        963       ← 90% 报红
 *
 * **婚姻永远绿**，因为「成亲」那一卷硬写着 `{ type: 'chronicle' }`，
 * 判据的测量对象被上游填平了——它会一直打勾，看着像在工作。
 *
 * **死亡和愿望天天红**，比永远绿更糟。别人的死、倾向的一格一格长，
 * 本来就不该每次都写进玩家年表；照搬这个问法会造出一支喊狼来了的门禁，
 * 而那种门禁的下场是被人关掉，连同它本来能抓到的那几条一起。
 *
 * 所以第四条换了个问法：**不问「有没有记」，问「两边对不对得上」。**
 * 而且方向要挑对——「年表说成亲 → 有没有配偶边」实测 29:0，**也是永远绿**；
 * 有分辨力的是反过来：**关系图上有一条后天才有的边，这一生里有没有一件事解释它。**
 * 配偶 19:18、师徒 158:10——既不永远绿也不天天红，判据咬得住东西。
 *
 * 守的是**配偶**和**师**这两种。「徒」试过，收窄掉了——理由写在 `EARNED_BONDS` 那儿：
 * 收徒发生在日常那一卷，而**日常本来就不进年表**，20.md 那条规则管的是重大变化，
 * **判据的射程不该超过规则的射程。**
 *
 * ## 性格那一类：现在没有守的对象
 *
 * `Person.temper` 只在 `content/birth.ts` 两处 `rollTemper()` 掷一次，
 * **`engine/effects.ts` 里没有任何改它的效果**，全库只读不写。
 * 没有变化就没有「无来源的变化」，现在造判据等于造一支永远绿的门禁。
 * 等第一个真的改性格的内容出现，再回来加这一条。
 *
 * ## 这支抓不住什么，写明在这里
 *
 * 它不判年表那一笔**说得对不对**——「你承了户」这句话跟身份变成家主
 * 是不是同一件事，机器分不出。它只判**有没有**。
 * 宁可漏，不可误报：这一层再往里做就得读文本，而那是人的活。
 *
 * 跑法：bun scripts/whence.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

/** 走多少世。身份一生变不了几次，得多走几世才采得到足够多的变化 */
const RUNS = 200

interface Jump {
  from: string
  to: string
  scene: string
  age: number
}

/**
 * 判据本身。**写成函数，是为了底下第三条能喂它坏数据。**
 *
 * 一次身份变化是「有来源的」，当且仅当同一步里年表也长了。
 */
function unexplained(changed: boolean, chronicleGrew: boolean): boolean {
  return changed && !chronicleGrew
}

/**
 * 后天才有的关系。**天生的那几种不在内**——生父、生母、兄、姐是出生那一刻就有的，
 * 要求这一生里有一件事解释「你为什么有个爹」是荒唐的。
 *
 * 配偶、师不一样：**它们必然是这一生里某件事的结果。** 一个人不会生下来就有妻子，
 * 也不会生下来就有师父——中间一定发生过什么，而那件事该在年表里留下一笔。
 *
 * ## 为什么「徒」不在内
 *
 * 头一版把「徒」也算进来了，200 世里抓到一条：`routine.ts` 的 `teach` 那一节
 * 造了徒弟这条边（`meet` + `bond: '徒'`），而年表一个字没记。
 *
 * 查下来**那不是内容漏了一笔，是我把两件事混为一谈了**。`routine.ts` 整卷
 * 一条 `chronicle` 都没有——**日常那一卷本来就不进年表**，一年一年的家常
 * 不该每笔都写进人生大事记。收个徒弟教两年，是日子里长出来的，
 * 不是「重大事实变化」。
 *
 * 而 20.md 那条规则管的是**重大**变化。**判据的射程不该超过规则的射程**——
 * 硬要日常卷补上年表笔，等于用门禁去改设计，那是本末倒置。
 *
 * 分界线：**这一条边是不是「一件事」的结果**。成亲、拜师是一件事，有始有终、
 * 玩家读得到那一刻；收徒是**一段日子**，它在 `routine` 里，跟「教孩子认字」
 * 「把手上的活交下去」是同一类。留着「徒」会让这支门禁天天报一条它管不着的事。
 */
const EARNED_BONDS: readonly string[] = ['配偶', '师']

/**
 * 哪些字眼算是「解释了这条边」。
 *
 * **这张表是照库里真写的字抄的，不是想出来的。** 头一版我按印象写了
 * `/成亲|嫁|娶|结发|婚/`，跑自检时「你成了亲」那条没匹配上——库里写的是
 * 「你成**了**亲」，中间隔着一个字。`match.ts` 里实际那六句是：
 *
 *     有人来给你说亲。   这门亲事定下来了。   那门亲事没有成。
 *     你成了亲。         你嫁过去了。         你入赘到了秦家。
 *
 * 判据里的关键词表是**最容易悄悄失效的那种东西**：内容改一个字它就不匹配了，
 * 而不匹配的表现是「报出一条无来源的边」——看上去像内容出了问题，其实是尺子瞎了。
 * 所以这张表要宽（宁可放过），并且底下第六条拿库里的真句子验它。
 */
/*
 * 「师」那一行 2026-09-09 又栽了一次同样的跤：学徒那一卷的原句是「你拜了师**傅**，学**一门手**艺」
 * （youth.ts），表里写的是「拜师」「师父」「学艺」——三个词一个也对不上。它一直没红，
 * 是因为从前当学徒的孩子多半上过几天学，「先生」「开蒙」替它兜着；佃户一行出身进来之后
 * （家境 16–28，上不了学），头一批没念过书就去当学徒的人出现了，四百七十条师徒边里红了四条。
 * **一张关键词表能绿多久，取决于有没有别的词替它兜底，不取决于它对不对。**
 */
const EXPLAINS: Record<string, RegExp> = {
  配偶: /成.{0,2}亲|嫁|娶|结发|婚|入赘|亲事/,
  师: /拜.{0,2}师|师父|师傅|手艺|出师|收徒|入门|学艺|念书|私塾|先生|识字|开蒙/,
}

/** 一条无来源的关系边 */
interface Dangling {
  bond: string
  scene: string
  age: number
}

const jumps: Jump[] = []
const dangling: Dangling[] = []
/** 一共采到多少次身份变化。没有这个数，第一条会在「一次也没变过」时照样打勾 */
let changes = 0
/** 一共采到多少条后天关系边。同理，没有它第四条会在「一条都没有」时打勾 */
let earned = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const people = usePeopleStore()

  story.begin()

  /*
   * 出生那一卷设的头一个身份不算跳转——那不是「变成了什么」，
   * 是「他本来就是什么」。所以基线从 `begin()` 之后取。
   */
  let identity = character.identity
  let chronicled = world.chronicle.length
  let turns = 0

  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((one) => !one.locked)
    if (open.length === 0) break

    const scene = narrative.sceneId ?? '?'
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const now = character.identity
    const grew = world.chronicle.length > chronicled
    if (now !== identity) {
      changes += 1
      if (unexplained(true, grew)) {
        jumps.push({ from: identity, to: now, scene, age: character.age })
      }
    }
    identity = now
    chronicled = world.chronicle.length
  }

  /*
   * 这一世走完了，回头看关系图上那些后天才有的边。
   *
   * **在世末看而不是逐步看**，因为一条边可以在年表那一笔之前先立起来
   * （先定了亲，过两年才办喜事），逐步比对会把这种正常的先后当成无来源。
   * 世末问的是这一辈子有没有解释过它——那才是「不存在无来源的状态跳转」的意思。
   */
  const told = world.chronicle.map((one) => one.text ?? '').join('|')
  for (const relation of people.relations) {
    if (relation.from !== 'me' && relation.to !== 'me') continue
    if (!EARNED_BONDS.includes(relation.bond)) continue
    earned += 1
    if (!EXPLAINS[relation.bond]?.test(told)) {
      dangling.push({ bond: relation.bond, scene: narrative.sceneId ?? '?', age: character.age })
    }
  }
}

console.log(`\n=== 这一步是从哪儿来的（${RUNS} 世）===\n`)

let bad = 0

/**
 * 一、身份变了，年表里得有一笔。
 *
 * 报错时把「从什么变成什么、在哪一卷、那年几岁」全打出来——
 * **说不说得通只有人能判断**，门禁能做的是把可疑的那几处挑出来给人看，
 * 不是替人下结论。这一条跟 `shadow.ts` 那句「判不出来和没问题是两回事」
 * 是同一种自觉。
 */
{
  const unique = new Map<string, Jump>()
  for (const one of jumps) unique.set(`${one.from}→${one.to}:${one.scene}`, one)

  if (unique.size > 0) {
    console.log(`  ✗ ${unique.size} 种身份变化，这一生里没有一件事解释得了它：`)
    for (const [, one] of [...unique].slice(0, 8)) {
      console.log(`      ${one.scene}（${one.age} 岁）：${one.from} → ${one.to}，年表无记载`)
    }
    bad += 1
  } else {
    console.log(`  ✓ 采到 ${changes} 次身份变化，每一次年表里都留下了那一笔。`)
  }
}

/**
 * 二、尺子自检：这一批世里身份真的变过。
 *
 * 缺了它，第一条会在「谁的身份都没变过」时照样打勾——
 * **没查到和查过了长得一模一样。**
 */
{
  if (changes === 0) {
    console.log(`  ✗ ${RUNS} 世里没有一个人的身份变过——这一条什么也没量。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：${changes} 次身份变化确实发生了，判据量到了东西。`)
  }
}

/**
 * 三、尺子自检：喂坏数据抓得到，喂对的放得过。
 *
 * 前两条都绿时印出来的是「库里的身份变化都有来源」，而那句话有两种成因：
 * 判据管用而内容干净，或者判据根本抓不到东西。两种印出来一模一样。
 */
{
  const checks: readonly { changed: boolean; grew: boolean; want: boolean; why: string }[] = [
    { changed: true, grew: false, want: true, why: '身份变了而年表没长——这正是要抓的' },
    { changed: true, grew: true, want: false, why: '身份变了且年表记了一笔，有来源' },
    { changed: false, grew: false, want: false, why: '什么都没变，不该报' },
    { changed: false, grew: true, want: false, why: '年表长了但身份没变，跟这一条无关' },
  ]

  const broken = checks.filter((one) => unexplained(one.changed, one.grew) !== one.want)

  if (broken.length > 0) {
    console.log(`  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one.why}`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：无来源的跳转抓得到，有来源的和没变的都放得过。`)
  }
}

/**
 * 四、后天才有的关系，这一生里得有一件事解释它。
 *
 * 这一条是第一条的另一半，问法**反过来**：第一条问「变了的东西有没有留下记录」，
 * 这一条问「留下的东西有没有来处」。两个方向都要问，因为它们漏的不是同一批东西。
 *
 * 方向挑错就废了：「年表说成亲 → 有没有配偶边」实测 29:0，**永远绿**。
 * 有分辨力的是这个方向——关系图上立着一条边，而这一生里一个字也没提过它。
 */
{
  const unique = new Map<string, Dangling>()
  for (const one of dangling) unique.set(`${one.bond}:${one.scene}`, one)

  if (unique.size > 0) {
    console.log(`  ✗ ${unique.size} 种后天关系，这一生里没有一件事解释得了它：`)
    for (const [, one] of [...unique].slice(0, 8)) {
      console.log(`      ${one.bond}（${one.age} 岁，末卷 ${one.scene}）：年表里一个字也没提过`)
    }
    bad += 1
  } else {
    console.log(`  ✓ 采到 ${earned} 条后天关系，每一条这一生里都有一件事解释得了。`)
  }
}

/**
 * 五、尺子自检：这一批世里真的长出过后天关系。
 *
 * 跟第二条同一个道理。**一条后天边都没采到时，第四条会照样打勾**——
 * 而那句「每一条都有解释」说的其实是「一条也没有」。
 */
{
  if (earned === 0) {
    console.log(`  ✗ ${RUNS} 世里没有长出过一条后天关系——第四条什么也没量。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：${earned} 条后天关系确实立起来过，第四条量到了东西。`)
  }
}

/**
 * 六、尺子自检：第四条喂坏数据抓得到，喂对的放得过。
 *
 * 跟第三条同一个道理，验的是第四条那把尺子（`EXPLAINS`）。
 * **只验「有边而年表空白」抓不抓得住是不够的**——还得验它不会把
 * 「年表里明明写了」的那些也报出来，否则收窄一次就废一次。
 */
{
  const checks: readonly { bond: string; told: string; want: boolean; why: string }[] = [
    {
      bond: '配偶',
      told: '你有了个儿子|今年是个丰年',
      want: true,
      why: '有配偶而一生没提过成亲——正是要抓的',
    },
    { bond: '配偶', told: '你成了亲。', want: false, why: '「你成了亲」（match.ts 原句）' },
    { bond: '配偶', told: '你嫁过去了。', want: false, why: '「你嫁过去了」（原句）' },
    { bond: '配偶', told: '你入赘到了秦家。', want: false, why: '「你入赘到了秦家」（原句）' },
    { bond: '配偶', told: '这门亲事定下来了。', want: false, why: '「这门亲事定下来了」（原句）' },
    { bond: '师', told: '你揣了几年的那册书', want: true, why: '有师父而一生没念过书没拜过师' },
    { bond: '师', told: '家里借了钱，送你进了私塾', want: false, why: '私塾那一笔解释得了师徒' },
    // youth.ts 原句：没念过书就去当学徒的孩子，这一生只有这一句解释他的师傅
    { bond: '师', told: '你拜了师傅，学一门手艺。', want: false, why: '「你拜了师傅，学一门手艺」（youth.ts 原句）' },
    { bond: '师', told: '你出师了，师傅把家什给了你。', want: false, why: '「你出师了，师傅把家什给了你」（apprentice.ts 原句）' },
  ]

  /*
   * 用例里那几句**全是从 `content/life/match.ts` 抄的原句**，不是编的。
   *
   * 头一版我按印象编了「你成亲了」「你嫁了人」，跑出来不匹配——库里写的是
   * 「你成**了**亲」「你嫁**过去**了」，还有一种是「入赘」。**编出来的用例
   * 只验得了我以为库里写的字。** 而我据此报了一个不存在的 bug 给 14，
   * 说 `match:offer` 让配偶边凭空出现——其实那一卷四条终点全带 `chronicle`，
   * 是我的关键词表认不出它们。
   */
  const broken = checks.filter((one) => !EXPLAINS[one.bond]!.test(one.told) !== one.want)

  if (broken.length > 0) {
    console.log(`  ✗ 第四条那把尺子坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one.why}`)
    bad += 1
  } else {
    console.log('  ✓ 尺子自检：无来源的关系抓得到，年表里解释过的都放得过。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  人生不是状态跳转，是连续的因果过程。\n')
}
