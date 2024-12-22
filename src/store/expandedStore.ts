import MilestoneState from '../@types/MilestoneState'
import reactMinistore from '../react-ministore'
import milestoneId from '../routes/milestoneId'
import milestonesStore from './milestonesStore'

interface ExpandedState {
  [milestoneId: string]: { [groupId: string]: boolean }
}

/** Returns an update function for expandedStore that merges in the current milestones. Adds new keys to the expanded store, deletes removed keys, and keeps existing keys with their existing state. */
const updateExpandedFromMilestones = (milestones: MilestoneState) => (state: ExpandedState) => ({
  [milestoneId]: Object.fromEntries(
    (milestones[milestoneId] || []).map(g => [g.id, state[milestoneId]?.[g.id] ?? false]),
  ),
})

const expandedStoreBase = reactMinistore(updateExpandedFromMilestones(milestonesStore.getState())({}))

const expandedStore = {
  ...expandedStoreBase,
  updateFromMilestones: (milestones: MilestoneState) => {
    expandedStore.update(updateExpandedFromMilestones(milestones))
  },
}

export default expandedStore
