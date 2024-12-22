import Position from '../@types/Position'

/** Decode an issue number from an issue row id. */
const decodeIssueNumber = (el: Element): Position => (!el ? 'last' : el.id ? +el.id.split('_')[1] : 'first')

export default decodeIssueNumber
