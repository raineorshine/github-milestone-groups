import Position from '../@types/Position'

/** Encode an issue number into an issue row id. */
const encodeIssueNumber = (issueNumber: Position) => `issue_${issueNumber}`

export default encodeIssueNumber
