/**
 * 摆好的局。
 *
 * `kindred.ts` 四、六到十一、十三、十四和 `away.ts` 整支都用它：出生、推到二十岁、分家，
 * 然后把库里那一卷一节一节演下去（`play`）——条件用真的 `meetsAll` 判、正文用真的 `fillString` 落、
 * 效果用真的 `applyEffects` 结。随机掷到「分了家、哥娶了亲、娘还在、荒年、又到了还粮那一年」
 * 要几千世，一局摆好只要几毫秒。
 *
 * 这不是门禁，是库：`gates.ts` 只收 `scripts/` 顶层的 .ts，这儿的文件不会被当门禁跑。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { meetsAll } from '../../src/engine/conditions'
import { applyEffects } from '../../src/engine/effects'
import { fillString } from '../../src/engine/interpolate'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { makePerson, usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import type { Temper } from '../../src/types/game'
import { beOf } from '../origin'

export type PeopleStore = ReturnType<typeof usePeopleStore>
export type WorldStore = ReturnType<typeof useWorldStore>
export type HouseholdStore = ReturnType<typeof useHouseholdStore>

export const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 把库里的一卷一节一节演下去。有选项的节按 `choiceId` 选，没写就选第一个 */
export function play(sceneId: string, choiceId?: string): string[] {
  const scene = lifeScenes[sceneId]
  if (!scene) return []
  const texts: string[] = []
  let node = scene.nodes[scene.entry]
  for (let step = 0; step < 32 && node; step += 1) {
    applyEffects(node.onEnter)
    for (const block of node.blocks) {
      if ('text' in block && block.text) texts.push(fillString(block.text))
    }
    for (const one of node.seen ?? []) if (meetsAll(one.requires)) texts.push(fillString(one.text))
    if (node.choices && node.choices.length > 0) {
      const choice = node.choices.find((one) => one.id === choiceId) ?? node.choices[0]!
      applyEffects(choice.effects)
      if (!choice.next) break
      node = scene.nodes[choice.next.replace(/^.*#/, '')]
      continue
    }
    const target = node.branches?.find((one) => meetsAll(one.requires))?.next ?? node.next
    if (!target) break
    node = scene.nodes[target.replace(/^.*#/, '')]
  }
  return texts
}

export interface Staged {
  people: PeopleStore
  world: WorldStore
  household: HouseholdStore
}

/** 生在一个有哥、娘还在的人家，推到二十岁，分家。掷不出来就 null */
export function stage(origin: 'farm' | 'cloth'): Staged | null {
  for (let tries = 0; tries < 600; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    const world = useWorldStore()
    const people = usePeopleStore()
    // 出身要在角色 store 建起来之前定：出生（立人、立户）发生在 `useCharacterStore()` 那一刻，
    // 之后再 `beOf` 只改得了家境四格，改不了已经立起来的户——头一版摆出来的「布庄人家」老屋在种地
    beOf(origin)
    useCharacterStore()
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    if (!people.isAlive('brother') || !people.isAlive('mother')) continue
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }
    applyEffects([{ type: 'time', years: 20 }])
    if (!people.isAlive('brother') || !people.isAlive('mother')) continue
    applyEffects([{ type: 'divide', leaves: 'me' }])
    if (!people.houses['old-home']) continue
    // 摆好的局里只演几天的事。站在年尾，三天喜酒就跨了年，跨年才会有人殁——
    // 先走到开春，走完再看人都还在不在
    if (world.time.month >= 10) {
      applyEffects([{ type: 'time', months: 13 - world.time.month }])
      if (!people.isAlive('brother') || !people.isAlive('mother')) continue
    }
    return { people, world, household }
  }
  return null
}

export function weather(s: Staged, patch: Partial<typeof CALM>): void {
  s.world.regions = { [s.household.prefecture]: { state: { ...CALM, ...patch }, last: {} } }
}

/**
 * 让一个人长到这个岁数：挪他的生年，不推世界。推世界十九年，哥和娘都可能殁在半路——
 * 那是另一件事，不是这一局要量的
 */
export function ageTo(s: Staged, id: string, age: number): void {
  s.people.amend(id, { bornYear: s.world.time.year - age })
}

/** 让嫂子先在老屋里，性情由这一局定——娶亲那一卷的 `meet` 见到已有的人就不再造 */
export function marryIn(s: Staged, temper: Temper): void {
  s.people.enroll(
    makePerson({
      id: 'brother-wife',
      surname: '吴',
      given: '氏',
      gender: '女',
      bornYear: s.world.time.year - 19,
      temper,
      doing: '操持家务',
      place: s.people.personOf('brother')?.place ?? s.household.home,
    }),
  )
  s.people.joinHouse('old-home', 'brother-wife')
}

/** 分了家、哥娶了亲、侄儿十八岁、下过地——老屋这一代人都到齐了的那一天 */
export function grownUp(): Staged | null {
  const st = stage('farm')
  if (!st) return null
  marryIn(st, '温和')
  play('kindred:wedding')
  play('kindred:nephew')
  ageTo(st, 'nephew', 18)
  play('kindred:nephew-grown')
  applyEffects([{ type: 'flag', key: 'event:kindred-nephew-grown', value: true }])
  return st
}
