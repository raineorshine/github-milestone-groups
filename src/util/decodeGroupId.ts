/** Decode a group id from a milestone group DOM id. */
const decodeGroupId = (el: Element) => el.id.replace('milestone-group-', '')

export default decodeGroupId
