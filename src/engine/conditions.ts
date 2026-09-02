import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Condition, RegionKey } from '@/types/game'

import { stageOf } from './stages'

type WorldStore = ReturnType<typeof useWorldStore>
type CharacterStore = ReturnType<typeof useCharacterStore>
type HouseholdStore = ReturnType<typeof useHouseholdStore>

function matches(
  condition: Condition,
  world: WorldStore,
  character: CharacterStore,
  household: HouseholdStore,
): boolean {
  if (condition.flag) {
    const { key, equals } = condition.flag
    // 未指定 equals 时，只要求旗标为「真」
    if (equals === undefined) {
      if (!world.hasFlag(key)) return false
    } else if (world.getFlag(key) !== equals) {
      return false
    }
  }

  if (condition.attribute) {
    if (character.attributes[condition.attribute.key] < condition.attribute.atLeast) return false
  }

  if (condition.knowledge && !character.knows(condition.knowledge)) return false

  if (condition.item && !character.has(condition.item)) return false

  if (condition.age) {
    const { atLeast, atMost } = condition.age
    if (atLeast !== undefined && character.age < atLeast) return false
    if (atMost !== undefined && character.age > atMost) return false
  }

  if (condition.standing) {
    const { atLeast, atMost } = condition.standing
    if (atLeast !== undefined && household.standing < atLeast) return false
    if (atMost !== undefined && household.standing > atMost) return false
  }

  if (condition.family && household.isAlive(condition.family.id) !== condition.family.alive) {
    return false
  }

  if (condition.bond) {
    const people = usePeopleStore()
    const ids = people.kinOf(condition.bond.kind)
    if (ids.length === 0) return false
    if (condition.bond.alive !== undefined) {
      const anyAlive = ids.some((id) => people.isAlive(id))
      if (anyAlive !== condition.bond.alive) return false
    }
  }

  if (condition.region) {
    const state = world.regionState()
    for (const [key, range] of Object.entries(condition.region)) {
      const value = state[key as RegionKey]
      if (range.atLeast !== undefined && value < range.atLeast) return false
      if (range.atMost !== undefined && value > range.atMost) return false
    }
  }

  if (condition.trade && household.trade !== condition.trade) return false

  if (condition.gender && household.gender !== condition.gender) return false

  if (condition.stage && stageOf(character.age) !== condition.stage) return false

  return true
}

/** 全部满足才算通过；无条件即通过。 */
export function meetsAll(conditions?: readonly Condition[]): boolean {
  if (!conditions || conditions.length === 0) return true

  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  return conditions.every((condition) => matches(condition, world, character, household))
}
