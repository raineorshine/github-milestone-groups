import MilestoneGroup from '../@types/MilestoneGroup'
import decodeIssueNumber from './decodeIssueNumber'
import encodeGroupId from './encodeGroupId'

/** Extracts the Everhour time estimate from an issue row. */
const decodeTimeEstimate = (el: Element | null): number => {
  // Example text: '0h of 20h'
  // '\n                0h\n                 of 20h\n            '
  const text = el?.querySelector?.('.everhour-item-time')?.textContent || ''
  return +text.replace(/h/g, '').split('of')[1]?.trim() || 0
}

/** Extract the list of issues and total hours of a given MilestoneGroup from the DOM. */
const groupDetails = (group: MilestoneGroup) => {
  // Get all issues in the group:
  // - All issues after the group heading
  //   - excluding the next milestone group,
  //   - excluding any issues after the next milestone group
  const issueRows = [
    ...document.querySelectorAll(
      `#${encodeGroupId(group.id)} ~ .js-issue-row:not(.milestone-group):not(#${encodeGroupId(group.id)} ~ .milestone-group ~ .js-issue-row)`,
    ),
  ]
  const issues = issueRows.map(decodeIssueNumber)
  const hours = issueRows.reduce((accum, row) => accum + decodeTimeEstimate(row), 0)

  return { issues, hours }
}

export default groupDetails
