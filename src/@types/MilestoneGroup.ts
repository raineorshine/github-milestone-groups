import Position from './Position'

/** A group of issues within a GitHub milestone. */
interface MilestoneGroup {
  id: string
  due: string
  /** The issue number of the first issue in the group. 'first' if the group has no milestones and is at the top of the list (i.e. is inserted directly before an existing group at the top). 'last' if the group has no milestones and is at the end of the list. */
  startIssue: Position
}

export default MilestoneGroup
