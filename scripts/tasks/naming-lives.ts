/**
 * 「名字要有人告诉你才知道」那一支的单世模拟，从 `scripts/naming.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样的回合上限、同样一路随机落笔。
 * 判据（哪种写法算穿帮、几条各自怎么判）和它们的自检全留在 `naming.ts`，
 * 这里只把每一世看到的记下来。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'

export interface Leak {
  id: string
  name: string
  where: '正文' | '选项'
  text: string
}

export interface NamingShard {
  leaks: Leak[]
  namedFine: number
  personsSeen: number
  namedPersons: number
  callWrong: number
}

export function runShard(runs: number): NamingShard {
  const leaks: Leak[] = []
  let namedFine = 0
  let personsSeen = 0
  let namedPersons = 0
  let callWrong = 0

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const people = usePeopleStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    const kept = new Set<string>()
    const drain = (): string[] => {
      const fresh: string[] = []
      for (const item of narrative.stream) {
        if (kept.has(item.id)) continue
        kept.add(item.id)
        if ('text' in item.block && item.block.text) fresh.push(item.block.text)
        if (item.block.kind === 'dialogue' && item.block.speaker) fresh.push(item.block.speaker)
      }
      return fresh
    }
    drain()
    for (let turn = 0; !narrative.ended && turn < 240; turn += 1) {
      const open = narrative.options.filter((o) => !o.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      const fresh = drain()
      const labels = narrative.options.map((o) => o.choice.label)
      for (const person of Object.values(people.roster)) {
        // 「氏」不是名，「秦娘」的「娘」是名——全名得两个字以上才认，一个字的姓名撞上别的词不算数
        const name = `${person.surname}${person.given}`
        if (person.given === '氏' || name.length < 2) continue
        const knows = people.known[person.id]?.knowsName === true
        const hits = fresh.filter((text) => text.includes(name))
        const labelHits = labels.filter((label) => label.includes(name))
        if (knows) {
          namedFine += hits.length + labelHits.length
          continue
        }
        for (const text of hits) leaks.push({ id: person.id, name, where: '正文', text })
        for (const text of labelHits) leaks.push({ id: person.id, name, where: '选项', text })
      }
    }
    // 二、callOf 不知道名字不落名字
    for (const person of Object.values(people.roster)) {
      if (!people.known[person.id]) continue
      personsSeen += 1
      const name = `${person.surname}${person.given}`
      const called = people.callOf(person.id)
      const knows = people.known[person.id]?.knowsName === true
      if (knows) namedPersons += 1
      if (!knows && called === name) callWrong += 1
      if (knows && called !== name) callWrong += 1
    }
  }

  return { leaks, namedFine, personsSeen, namedPersons, callWrong }
}
