import milestoneId from '../routes/milestoneId'
import milestonesStore from '../store/milestonesStore'
import createId from '../util/createId'
import decodeIssueNumber from '../util/decodeIssueNumber'

/** A link rendered in the milestone issues table that adds a new milestone group when clicked. */
const NewGroupLink = () => {
  /** Creates a new group. */
  const newGroup = () => {
    milestonesStore.update(milestones => {
      const row = document.querySelector('.js-issue-row:not(.milestone-group)')!
      return {
        ...milestones,
        [milestoneId]: [{ id: createId(), startIssue: decodeIssueNumber(row), due: '' }],
      }
    })
  }

  return (
    <a onClick={newGroup} className='btn-link' style={{ marginLeft: '1em', padding: 0 }}>
      + New group
    </a>
  )
}

export default NewGroupLink
