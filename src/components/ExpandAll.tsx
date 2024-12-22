import milestoneId from '../routes/milestoneId'
import expandedStore from '../store/expandedStore'

/** Toggle all groups expand/collapse. */
function ExpandAll() {
  // if none of the groups are expanded, then expand all groups that are collapsed
  // otheerwise, collapse all groups that are expanded
  const noneExpanded = expandedStore.useSelector(state => !Object.values(state[milestoneId] || {}).some(value => value))

  return (
    <a
      onClick={() => {
        expandedStore.update(state => {
          const expanded = state[milestoneId] || {}
          return {
            ...state,
            [milestoneId]: Object.fromEntries(Object.entries(expanded).map(([groupId]) => [groupId, noneExpanded])),
          }
        })
      }}
      className='btn-link'
      style={{ marginLeft: '1em', padding: 0 }}
    >
      {noneExpanded ? 'Expand' : 'Collapse'} all
    </a>
  )
}

export default ExpandAll
