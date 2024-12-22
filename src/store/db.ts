import MilestoneState from '../@types/MilestoneState'
import storage from '../storage'

const db = storage.model({
  milestones: {
    default: {} as MilestoneState,
    decode: s => JSON.parse(s || '{}') as MilestoneState,
    encode: JSON.stringify,
  },
})

export default db
