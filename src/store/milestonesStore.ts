import reactMinistore from '../react-ministore'
import db from './db'

const milestonesStore = reactMinistore(db.get('milestones'))

export default milestonesStore
