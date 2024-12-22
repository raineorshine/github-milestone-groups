import MilestoneGroup from '../@types/MilestoneGroup'
import milestoneId from '../routes/milestoneId'
import expandedStore from '../store/expandedStore'
import groupDetails from '../util/groupDetails'
import GroupDetails from './GroupDetails'

/** A milestone group heading. */
function GroupHeading({ group, index }: { group: MilestoneGroup; index: number }) {
  const showDetails = expandedStore.useSelector(state => state[milestoneId]?.[group.id] || false)

  const { issues, hours } = groupDetails(group)

  return (
    <div style={{ marginLeft: '-0.5em' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <div className='flex-shrink-0 v-align-top color-fg-default Box-row--drag-button js-drag-handle'>
          <svg
            style={{ width: 12 }}
            aria-hidden='true'
            height='16'
            viewBox='0 0 16 16'
            version='1.1'
            width='16'
            data-view-component='true'
            className='octicon octicon-grabber v-align-text-bottom'
          >
            <path d='M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'></path>
          </svg>
        </div>
        <div style={{ marginLeft: '0.3em' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <h3>Milestone {index + 1}</h3>

            {hours ? (
              <span className='ml-2' style={{ color: 'var(--fgColor-muted, var(--color-fg-muted))' }}>
                {hours}h
              </span>
            ) : null}

            <a
              onClick={() => {
                expandedStore.update(state => {
                  const expanded = state[milestoneId] || {}
                  return {
                    ...state,
                    [milestoneId]: {
                      ...expanded,
                      [group.id]: !showDetails,
                    },
                  }
                })
              }}
              className={`show-details ${showDetails ? 'expanded' : ''} Box-row--drag-button pl-2 pr-2`}
              style={{
                color: 'var(--fgColor-muted, var(--color-fg-muted))',
                cursor: 'pointer',
                textDecoration: 'none',
                userSelect: 'none',
              }}
            >
              {showDetails ? '-' : '+'}
            </a>
          </div>
          {showDetails && <GroupDetails hours={hours} group={group} issues={issues} />}
        </div>
      </div>
    </div>
  )
}

export default GroupHeading
