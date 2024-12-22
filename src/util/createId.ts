/** Creates a pseudorandom id. */
const createId = (): string => Math.random().toString(36).slice(2)

export default createId
