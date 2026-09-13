import '../../scripts/lib/seeded'
import { createPinia, setActivePinia } from 'pinia'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { roleId } from '../../src/engine/interpolate'
let hit = 0, aliveAtRender = 0, deadAtRender = 0
for (let i = 0; i < 400; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore(); const people = usePeopleStore()
  const story = useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale })
  // 钩住渲染那一刻：locate 是进节点时调的
  const locate = narrative.locate
  narrative.locate = (s: string, n: string): void => {
    if (s === 'playmate:young' && n === 'open') {
      const id = roleId('playmate')
      hit += 1
      const p = id ? people.roster[id] : undefined
      if (p?.fate === '在') aliveAtRender += 1; else deadAtRender += 1
    }
    locate(s, n)
  }
  story.begin()
  let t = 0
  while (!narrative.ended && t < 200) {
    const open = narrative.options.filter(o => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice); t += 1
  }
}
console.log(`\n400 世：playmate:young#open 演到 ${hit} 次`)
console.log(`  渲染那一刻 roleId 挑中的人：活着 ${aliveAtRender}  已殁 ${deadAtRender}`)
