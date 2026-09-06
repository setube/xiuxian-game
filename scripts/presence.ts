/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 人物生命状态 → 当前存在 → 当前在场 → 当前可接触：死了的、明显不在场的人，不能再当现实交互主体。
 *
 * ## 这一道是被一串同根的 bug 逼出来的（用户 2026-09-07）
 *
 *     父亲死后仍在对话        商旅死后次年「又来了」
 *     死者名字被字符串误判    已故人物仍被某些叙事引用
 *
 * 它们不是偶然，是一个横切的语义边界一直没画：**历史存在 ≠ 当前活着 ≠ 当前在场**（`engine/presence.ts`）。
 * 这一支把那条边界画成一张矩阵——
 *
 *     人物：爹　娘　哥　嫂子　侄儿　东邻　先生　商旅　乳母　老管家
 *     状态：生　死　不在场　离户　迁居　远行
 *     表面：现实对话（对话块的说话人）　现实效果（meet／observe／person／tie／owe 点名的人）　历史（编年、人口册、关系图）
 *
 * 每一格都在摆好的局上量：把这个人摆成那种状态，然后用真的 `meetsAll` 把全库每一卷从入口走一遍
 * （岁数条件剥掉——这一支问的不是「几岁走得到」，是「除了他的死活在场，还有没有别的条件挡着」），
 * 走到的节点里凡是让他开口、跟他照面的，就是一处穿帮。
 *
 * ## 三条规矩
 *
 * 1. **死了的人不开口、不照面**：对话块的说话人解析到他 → 红；`meet`/`observe`/`person`/`tie`/`owe` 点到他 → 红。
 * 2. **不在场的人不开口**：人活着、在别处，对话块的说话人解析到他 → 红。效果里点到他只记数不红——
 *    正月里回来过年、赶回来奔丧，正文写的是他来了，数据里没记这一趟；那是「在场」这一格下一片的事。
 * 3. **历史不受这条限制**：他殁了还在人口册、关系图、编年里；编年、回忆、叙述提他不算穿帮。
 *
 * ## 跟 `present.ts` 分工
 *
 * 那一支按**字**找：随机人生里死人的称呼还出现在正文里没有。这一支按 **id** 找：说话人记号、效果里的 id。
 * 硬写的「父亲」「周先生」这里也认（一张小表映到关系或人），可它认不出「他」——那是那一支的活。
 *
 * 跑法：bun scripts/presence.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { ROLE_IDS } from '../src/engine/interpolate'
import { exists, isAlive, isPresent } from '../src/engine/presence'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Bond, Condition, Effect, OriginId, Scene, SceneNode } from '../src/types/game'
import { grownUp, type Staged } from './lib/staged'
import { beOf } from './origin'
import { effectsOf } from './refs'

// ============================================================
// 矩阵的三个轴
// ============================================================

type State = '生' | '死' | '不在场' | '离户' | '迁居' | '远行'
const STATES: readonly State[] = ['生', '死', '不在场', '离户', '迁居', '远行']

/** 把这个人摆成那种状态。走真的效果——户主重算、离户都在效果里 */
function put(id: string, state: State): void {
  const away: Record<Exclude<State, '生' | '死'>, string> = {
    不在场: '{province} · {prefecture} · 镇上',
    离户: '{province} · {prefecture} · 镇上',
    迁居: '邻县 · 河堤工地',
    远行: '北边的路上',
  }
  if (state === '生') return
  if (state === '死') {
    applyEffects([{ type: 'person', id, fate: '殁' }])
    return
  }
  applyEffects([
    { type: 'person', id, place: away[state], ...(state === '离户' ? { leavesHouse: true } : {}) },
  ])
}

interface Subject {
  id: string
  label: string
  /** 摆在哪一种局里 */
  world: 'farm-child' | 'old-home' | 'manor-child'
}

const SUBJECTS: readonly Subject[] = [
  { id: 'father', label: '爹', world: 'farm-child' },
  { id: 'mother', label: '娘', world: 'farm-child' },
  { id: 'east-head', label: '东邻', world: 'farm-child' },
  { id: 'teacher', label: '先生', world: 'farm-child' },
  { id: 'merchant', label: '商旅', world: 'farm-child' },
  { id: 'brother', label: '哥', world: 'old-home' },
  { id: 'brother-wife', label: '嫂子', world: 'old-home' },
  { id: 'nephew', label: '侄儿', world: 'old-home' },
  { id: 'nurse', label: '乳母', world: 'manor-child' },
  { id: 'steward', label: '老管家', world: 'manor-child' },
]

// ============================================================
// 摆局
// ============================================================

/** 生在某种人家，推到几岁。掷不出（要的人不在）就 null */
function born(origin: OriginId, years: number, need: readonly string[]): Staged | null {
  for (let tries = 0; tries < 200; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    const world = useWorldStore()
    const people = usePeopleStore()
    beOf(origin)
    useCharacterStore()
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    applyEffects([{ type: 'time', years }])
    if (need.every((id) => people.isAlive(id))) return { people, world, household }
  }
  return null
}

/** 农户人家的孩子九岁：爹娘、邻居都在；先生、商旅照库里的效果入册 */
function farmChild(): Staged | null {
  const s = born('farm', 9, ['father', 'mother', 'east-head'])
  if (!s) return null
  applyEffects([
    {
      type: 'meet',
      id: 'teacher',
      calls: '周先生',
      delta: 4,
      who: { surname: '周', given: '明远', gender: '男', age: 52, doing: '教书' },
      bond: '师',
    },
    {
      type: 'meet',
      id: 'merchant',
      calls: '走北路的商旅',
      delta: 4,
      who: { surname: '贺', given: '三', gender: '男', age: 38, doing: '收粗布往北边贩' },
    },
  ])
  return s
}

function manorChild(): Staged | null {
  return born('manor', 9, ['nurse', 'steward'])
}

function stageFor(world: Subject['world']): Staged | null {
  if (world === 'farm-child') return farmChild()
  if (world === 'manor-child') return manorChild()
  return grownUp()
}

// ============================================================
// 表面：这一节里谁在开口、谁被点名
// ============================================================

/** 硬写的说话人：映到一层关系，或直接映到一个人 */
const SPEAKER_BONDS: Readonly<Record<string, Bond>> = {
  父亲: '生父',
  爹: '生父',
  母亲: '生母',
  娘: '生母',
}
const SPEAKER_IDS: Readonly<Record<string, string>> = {
  周先生: 'teacher',
  周教授: 'teacher',
  周侍讲: 'teacher',
}
/** 不是世上的某个人：你自己、书场里的说书人 */
const NOBODY_IN_PARTICULAR: readonly string[] = ['你', '说书人']

const ROLE_ORDER: Readonly<Record<string, readonly Bond[]>> = {
  elder: ['生父', '抚养', '生母'],
  dam: ['生母', '抚养', '生父'],
  elders: ['生父', '生母', '抚养'],
  child: ['子', '女'],
}

/**
 * 这一句是谁说的。
 *
 * 记号（`{elder}`）按关系挑**此刻在场**的那个——引擎挑的是「在身边」的（`isNearby`，比家在哪），
 * 这儿比此刻在哪，只紧不松。挑不到就是「没人」：引擎会落一句「家里的大人」，那正是要抓的。
 */
function speakerOf(speaker: string): { id: string } | { nobody: true } | null {
  const people = usePeopleStore()
  if (NOBODY_IN_PARTICULAR.includes(speaker)) return null
  const token = /^\{(\w+)(?::([\w-]+))?\}$/.exec(speaker)
  if (token) {
    const [, name, arg] = token
    if (name === 'call' && arg) return { id: arg }
    const order = ROLE_ORDER[name ?? '']
    if (!order) return null
    for (const bond of order) for (const id of people.kinOf(bond)) if (isPresent(id)) return { id }
    return { nobody: true }
  }
  const direct = SPEAKER_IDS[speaker]
  if (direct) return { id: direct }
  const bond = SPEAKER_BONDS[speaker]
  if (bond) {
    const ids = people.kinOf(bond)
    if (ids.length === 0) return { nobody: true }
    return { id: ids.find((id) => isPresent(id)) ?? ids[0]! }
  }
  return null
}

/** 效果里点到的人（角色名照引擎的办法换成真人；换不到就是没人） */
function targetsOf(effect: Effect): string[] {
  const people = usePeopleStore()
  const real = (id: string): string | null => {
    if (!(ROLE_IDS as readonly string[]).includes(id)) return id
    const order = ROLE_ORDER[id] ?? []
    for (const bond of order) for (const one of people.kinOf(bond)) if (isPresent(one)) return one
    return null
  }
  switch (effect.type) {
    case 'meet':
    case 'relation': {
      const id = real(effect.id)
      return id && (effect.delta ?? 0) !== 0 && !('who' in effect && effect.who) ? [id] : []
    }
    case 'observe':
      return people.personOf(effect.observer) ? [effect.observer] : []
    case 'person':
      // 让他殁、让他走都是在写下落，不是照面；改他手上的活才是把他当活人使
      return effect.fate === undefined &&
        (effect.doing !== undefined || effect.livelihood !== undefined)
        ? [effect.id]
        : []
    case 'tie':
      return [effect.from, effect.to]
    case 'owe':
      return [effect.debtor, effect.creditor]
    default:
      return []
  }
}

// ============================================================
// 走：从入口把一卷走一遍，岁数条件剥掉
// ============================================================

const AGE_KEYS: readonly (keyof Condition)[] = ['age', 'stage']

function ageless(conditions: readonly Condition[] | undefined): Condition[] {
  return (conditions ?? []).map((one) => {
    const copy: Record<string, unknown> = { ...one }
    for (const key of AGE_KEYS) delete copy[key]
    return copy as Condition
  })
}

const holds = (conditions: readonly Condition[] | undefined): boolean =>
  meetsAll(ageless(conditions))

/** 一卷的入口此刻开不开：年表上有一条要求成立的事件指着它，或者它是例行／日常／落幕 */
function enterable(scene: Scene): boolean {
  if (scene.id.startsWith('routine:') || scene.id.startsWith('day:') || scene.id === lifeFinale)
    return true
  return lifeEvents.some((event) => event.scene === scene.id && holds(event.requires))
}

/** 从入口走，收走得到的节点；跨卷的 next 也跟过去 */
function reachable(library: Readonly<Record<string, Scene>>, start: Scene): Set<string> {
  const seen = new Set<string>()
  const queue: { scene: Scene; nodeId: string }[] = [{ scene: start, nodeId: start.entry }]
  while (queue.length > 0) {
    const { scene, nodeId } = queue.shift()!
    const key = `${scene.id}#${nodeId}`
    if (seen.has(key)) continue
    const node = scene.nodes[nodeId]
    if (!node) continue
    seen.add(key)
    const go = (target: string): void => {
      const hash = target.indexOf('#')
      if (hash >= 0) {
        const other = library[target.slice(0, hash)]
        if (other) queue.push({ scene: other, nodeId: target.slice(hash + 1) || other.entry })
        return
      }
      if (scene.nodes[target]) {
        queue.push({ scene, nodeId: target })
        return
      }
      const other = library[target]
      if (other) queue.push({ scene: other, nodeId: other.entry })
    }
    for (const choice of node.choices ?? [])
      if (choice.next && holds(choice.requires)) go(choice.next)
    const branch = (node.branches ?? []).find((one) => holds(one.requires))
    if (branch) go(branch.next)
    else if (node.next) go(node.next)
  }
  return seen
}

// ============================================================
// 量
// ============================================================

interface Hit {
  subject: string
  state: State
  surface: '对话' | '效果'
  where: string
  what: string
}

/** 这一节里跟这个人有关的表面 */
function surfacesOf(
  scene: Scene,
  node: SceneNode,
  id: string,
): { surface: '对话' | '效果'; what: string }[] {
  const out: { surface: '对话' | '效果'; what: string }[] = []
  for (const block of node.blocks) {
    if (block.kind !== 'dialogue' || !block.speaker) continue
    const who = speakerOf(block.speaker)
    if (who && 'id' in who && who.id === id)
      out.push({ surface: '对话', what: `${block.speaker}：「${block.text.slice(0, 18)}」` })
  }
  // 效果按归属算：进节时落的算，选得中的选项的算；锁着的选项（条件不成立）它的效果落不下来。
  // 头一版拿 `effectsOf(node)` 一股脑收，把「娘活着才能选」的选项也算成了死人被点名
  const live: Effect[] = [
    ...(node.onEnter ?? []),
    ...(node.choices ?? []).filter((choice) => holds(choice.requires)).flatMap((choice) => choice.effects ?? []),
  ]
  for (const effect of live) {
    if (targetsOf(effect).includes(id))
      out.push({ surface: '效果', what: `${effect.type} → ${id}` })
  }
  void scene
  void effectsOf
  return out
}

/** 记号解析到「没人」的对话块：家里一个大人都不在场，却有人在说话 */
function nobodySpeaks(node: SceneNode): string[] {
  const out: string[] = []
  for (const block of node.blocks) {
    if (block.kind !== 'dialogue' || !block.speaker) continue
    const who = speakerOf(block.speaker)
    if (who && 'nobody' in who) out.push(`${block.speaker}：「${block.text.slice(0, 18)}」`)
  }
  return out
}

const hits: Hit[] = []
const soft: Hit[] = []
const nobody: Hit[] = []
/** 在场时能走到、且他在开口／被点名的节点数——尺子咬得到的地方有多少，按人记 */
const bites = new Map<string, number>()
let bitten = 0

/**
 * 记过账的穿帮：都是别的会话（内容层）那一片的卷，按分工由它修。
 * 记账不是放过——新的会红，修掉了的也会红（那一行就该从这里删掉）。
 * 每一行是 `卷#节　人物　表面`，状态不记：同一处对四种不在场都红，记一次就够。
 */
// 这五处都是「不在场还开口」，不是死了：爹去外县做工、先生迁走了、孩子落地时爹在外头。
// `alive` 拦不住它们——这一批正是 `present` 那一格的第一批使用者，等它进了主干由内容层接上。
const KNOWN: readonly string[] = [
  'birth:farm#kept　爹　对话', // 爹不在家孩子落地时，取名那句还是他说的。加 bond 生父 present
  'dad:north#told　爹　对话', // 爹去外县做工了，还在讲十八岁那年。kin.ts 事件加 present
  'mom:past#silent　娘　对话', // 同上，mom:past
  'school:threshold#afford　先生　对话', // 先生迁走了还伸手要束脩。schooling.ts 加 family teacher present
  'school:threshold#strain　先生　对话',
]
const knownKey = (hit: Hit): string => `${hit.where}　${hit.subject}　${hit.surface}`
const stagedOut: string[] = []
/** 历史那一层：殁了之后他还在不在册上、关系图上 */
const historyGone: string[] = []

for (const subject of SUBJECTS) {
  for (const state of STATES) {
    const s = stageFor(subject.world)
    if (!s) {
      stagedOut.push(`${subject.label}·${state}`)
      continue
    }
    if (!exists(subject.id)) {
      stagedOut.push(`${subject.label}·${state}（册上没有他）`)
      continue
    }
    const edgesBefore = s.people.relations.filter((r) => r.from === subject.id || r.to === subject.id).length
    put(subject.id, state)
    const alive = isAlive(subject.id)
    const present = isPresent(subject.id)
    if (state === '死') {
      if (!exists(subject.id)) historyGone.push(`${subject.label}殁了就从人口册上消失了`)
      const edgesAfter = s.people.relations.filter((r) => r.from === subject.id || r.to === subject.id).length
      // 邻居跟你之间本来就没有边（相邻是户与户的事）；有边的，殁了一条也不能少
      if (edgesAfter < edgesBefore) historyGone.push(`${subject.label}殁了，关系图上少了 ${edgesBefore - edgesAfter} 条边`)
    }
    for (const scene of Object.values(lifeScenes)) {
      if (!enterable(scene)) continue
      for (const key of reachable(lifeScenes, scene)) {
        const [sceneId, nodeId] = key.split('#') as [string, string]
        const node = lifeScenes[sceneId]?.nodes[nodeId]
        if (!node) continue
        for (const one of surfacesOf(scene, node, subject.id)) {
          const hit: Hit = {
            subject: subject.label,
            state,
            surface: one.surface,
            where: key,
            what: one.what,
          }
          if (state === '生') {
            bitten += 1
            bites.set(subject.label, (bites.get(subject.label) ?? 0) + 1)
          } else if (!alive) {
            hits.push(hit)
          } else if (!present && one.surface === '对话') {
            hits.push(hit)
          } else if (!present) {
            soft.push(hit)
          }
        }
        if (state !== '生') {
          for (const what of nobodySpeaks(node)) {
            nobody.push({ subject: subject.label, state, surface: '对话', where: key, what })
          }
        }
      }
    }
  }
}

// ============================================================
// 尺子自检：三种坏局摆给同一把尺
// ============================================================

function ruler(): string[] {
  const wrong: string[] = []
  const s = farmChild()
  if (!s) return ['掷不出局']
  const library: Record<string, Scene> = {
    'probe:dead-speaks': {
      id: 'probe:dead-speaks',
      title: '',
      entry: 'open',
      nodes: {
        open: { id: 'open', blocks: [{ kind: 'dialogue', speaker: '{elder}', text: '进去。' }] },
      },
    },
    'probe:guarded': {
      id: 'probe:guarded',
      title: '',
      entry: 'open',
      nodes: {
        open: {
          id: 'open',
          blocks: [],
          branches: [{ requires: [{ bond: { kind: '生父', present: true } }], next: 'talk' }],
        },
        talk: { id: 'talk', blocks: [{ kind: 'dialogue', speaker: '父亲', text: '进去。' }] },
      },
    },
    'probe:alive-only': {
      id: 'probe:alive-only',
      title: '',
      entry: 'open',
      nodes: {
        open: {
          id: 'open',
          blocks: [],
          branches: [{ requires: [{ bond: { kind: '生父', alive: true } }], next: 'talk' }],
        },
        talk: { id: 'talk', blocks: [{ kind: 'dialogue', speaker: '父亲', text: '进去。' }] },
      },
    },
  }
  const father = 'father'
  const walk = (sceneId: string): string[] => [...reachable(library, library[sceneId]!)]
  // 生：三卷都走得到、爹都在开口
  if (!walk('probe:guarded').includes('probe:guarded#talk'))
    wrong.push('爹在场，问 present 的那一卷却进不去')
  // 爹去了镇上：问 present 的挡住了，只问 alive 的挡不住，记号解析到娘
  put(father, '不在场')
  if (walk('probe:guarded').includes('probe:guarded#talk'))
    wrong.push('爹在镇上，问 present 的那一卷还进得去')
  if (!walk('probe:alive-only').includes('probe:alive-only#talk'))
    wrong.push('爹在镇上、活着，只问 alive 的那一卷该进得去（这正是要抓的漏）')
  const aliveTalk = library['probe:alive-only']!.nodes['talk']!
  if (
    !surfacesOf(library['probe:alive-only']!, aliveTalk, father).some(
      (one) => one.surface === '对话',
    )
  )
    wrong.push('爹不在场却硬写着「父亲」开口，尺子没量到')
  const dead = library['probe:dead-speaks']!.nodes['open']!
  const spoke = speakerOf('{elder}')
  if (!spoke || !('id' in spoke) || spoke.id !== 'mother')
    wrong.push('爹在镇上，{elder} 该落到娘身上')
  // 爹娘都殁了：{elder} 解析到没人
  put(father, '死')
  put('mother', '死')
  if (nobodySpeaks(dead).length === 0) wrong.push('爹娘都殁了，{elder} 开口，尺子没量到「没人」')
  // 新那一格：present 跟 alive 是两问
  const t = farmChild()
  if (!t) return [...wrong, '掷不出第二局']
  if (!meetsAll([{ family: { id: 'father', present: true } }]))
    wrong.push('爹在家，family.present 却是假')
  put('father', '不在场')
  if (meetsAll([{ family: { id: 'father', present: true } }]))
    wrong.push('爹去了镇上，family.present 还是真')
  if (!meetsAll([{ family: { id: 'father', alive: true } }]))
    wrong.push('爹去了镇上，alive 却成了假——两问搅在一起了')
  if (meetsAll([{ bond: { kind: '生父', present: true } }]))
    wrong.push('爹去了镇上，bond.present 还是真')
  if (meetsAll([{ bond: { kind: '生父', near: true } }]))
    wrong.push('爹去了镇上，near 也该是假才对（家不在镇上）')
  // 你也去了镇上：他又在场了
  t.world.moveTo(t.people.personOf('father')?.place ?? '')
  if (!meetsAll([{ family: { id: 'father', present: true } }])) wrong.push('你也到了镇上，爹该在场')
  if (meetsAll([{ bond: { kind: '生父', near: true } }]))
    wrong.push('你到了镇上他在场，可他不在你家——near 该是假')
  return wrong
}

// ============================================================
// 报
// ============================================================

console.log('\n=== 谁还在、谁在场（人物 × 状态 × 表面）===\n')
let bad = 0

const cell = (
  subject: string,
  state: State,
  surface: '对话' | '效果',
  from: readonly Hit[],
): number =>
  from.filter((one) => one.subject === subject && one.state === state && one.surface === surface)
    .length

console.log('  人物      ' + STATES.map((state) => state.padEnd(6, '　')).join(''))
for (const subject of SUBJECTS) {
  const row = STATES.map((state) => {
    if (state === '生') return '——    '
    const hard = cell(subject.label, state, '对话', hits) + cell(subject.label, state, '效果', hits)
    const gentle = cell(subject.label, state, '效果', soft)
    return `${hard === 0 ? '·' : `✗${hard}`}${gentle > 0 ? `(${gentle})` : ''}`.padEnd(6, ' ')
  })
  console.log(`  ${subject.label.padEnd(4, '　')}  ${row.join('')}`)
}
console.log('  （✗n = 死了还开口／被点名、不在场还开口；(n) = 不在场时效果里点到他，只记数）\n')

console.log(
  `  在场时尺子咬得到的地方：${bitten} 处（他在开口或被点名、且那一节走得到）——` +
    SUBJECTS.map((one) => `${one.label} ${bites.get(one.label) ?? 0}`).join('，'),
)
console.log(
  '  咬不到的那几行不是放过：库里没有一处让他们按 id 开口或照面，他们只在正文里被叫到——那是 present.ts 按字量的地方。',
)
if (bitten < 12) {
  console.log(`  ✗ 咬得到的地方太少，这把尺量的是空气。`)
  bad += 1
}
if (stagedOut.length > 0) console.log(`  摆不出的格：${stagedOut.join('、')}`)

const byWhere = (list: readonly Hit[]): string[] =>
  [...new Set(list.map((one) => `${one.where}　${one.subject}·${one.state}　${one.what}`))].sort()

const fresh = hits.filter((hit) => !KNOWN.includes(knownKey(hit)))
const stillKnown = new Set(hits.map(knownKey).filter((key) => KNOWN.includes(key)))
const mended = KNOWN.filter((key) => !stillKnown.has(key))
if (fresh.length > 0 || mended.length > 0) {
  if (fresh.length > 0) {
    console.log(`\n  ✗ 一、${fresh.length} 处新的：死了还开口／被点名、不在场还开口：`)
    for (const line of byWhere(fresh).slice(0, 40)) console.log(`      ${line}`)
    if (fresh.length > 40) console.log(`      …还有 ${fresh.length - 40} 处`)
  }
  for (const key of mended) console.log(`  ✗ 一、已经修掉了，请把这一行从 KNOWN 里删掉：${key}`)
  bad += 1
} else {
  console.log(
    `  ✓ 一、死了的人不开口、不被点名；不在场的人不开口。（记过账、等内容层修的 ${stillKnown.size} 处：${[...stillKnown].join('；')}）`,
  )
}

if (nobody.length > 0) {
  const lines = byWhere(nobody)
  console.log(
    `\n  ✗ 二、${lines.length} 处家里一个大人都不在场，记号却还在开口（引擎会落「家里的大人」）：`,
  )
  for (const line of lines.slice(0, 20)) console.log(`      ${line}`)
  bad += 1
} else console.log('  ✓ 二、没有「家里的大人」在替不在场的人说话。')

if (historyGone.length > 0) {
  console.log(`\n  ✗ 三、历史被抹了：${historyGone[0]}`)
  bad += 1
} else console.log('  ✓ 三、殁了的人还在人口册、关系图上——历史存在不随生死变。')

if (soft.length > 0) {
  console.log(
    `\n  不在场时效果里点到他的 ${soft.length} 处（回来过年、赶回来奔丧那一类，正文写了他来，数据没记这一趟）：`,
  )
  for (const line of byWhere(soft).slice(0, 12)) console.log(`      ${line}`)
}

const rulerWrong = ruler()
if (rulerWrong.length > 0) {
  console.log(`\n  ✗ 四、尺子自检：${rulerWrong[0]}（共 ${rulerWrong.length} 处）`)
  bad += 1
} else
  console.log(
    '  ✓ 四、尺子自检：死了的开口抓得到、问 present 的挡得住、只问 alive 的挡不住；present 跟 alive、near 各是各的。',
  )

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else console.log('  谁还在、谁在场：全部成立。\n')
