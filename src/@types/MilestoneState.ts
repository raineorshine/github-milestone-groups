import MilestoneGroup from './MilestoneGroup'

/** A storage model type for all milestone groups keyed by GitHub milestone id. */
interface MilestoneState {
  [milestoneId: string]: MilestoneGroup[]
}

export default MilestoneState
