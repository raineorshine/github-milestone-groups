import MilestoneGroup from '../@types/MilestoneGroup'
import Position from '../@types/Position'
import milestoneId from '../routes/milestoneId'
import milestonesStore from '../store/milestonesStore'
import encodeGroupId from '../util/encodeGroupId'

/** Hourly rate used to calculate the budget from estimated hours. */
const HOURLY_RATE = 40

/** Shows the due date, issues, and budget of a task, and an option to delete it. */
function GroupDetails({ hours, issues, group }: { hours: number; issues: Position[]; group: MilestoneGroup }) {
  return (
    <div className='mt-2'>
      <div>
        <b className='mb-1' style={{ display: 'inline-block' }}>
          Due:
        </b>{' '}
        <input
          type='date'
          value={group.due}
          placeholder='Enter a date'
          onChange={e => {
            milestonesStore.update(state => {
              const groups = state[milestoneId] || []
              return {
                ...state,
                [milestoneId]: groups.map(g =>
                  g.id === group.id
                    ? {
                        ...g,
                        due: e.target.value,
                      }
                    : g,
                ),
              }
            })
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--fgColor-muted, var(--color-fg-muted))',
            padding: '4px',
            margin: '-4px 0',
          }}
        />
      </div>
      <div>
        <b className='mb-1' style={{ display: 'inline-block' }}>
          Issues:
        </b>{' '}
        <span
          style={{
            color: 'var(--fgColor-muted, var(--color-fg-muted))',
          }}
        >
          {issues.map(issue => `#${issue}`).join(', ')}
        </span>
      </div>
      <div>
        <b className='mb-1' style={{ display: 'inline-block' }}>
          Budget:
        </b>{' '}
        <span
          style={{
            color: 'var(--fgColor-muted, var(--color-fg-muted))',
          }}
        >
          ${hours * HOURLY_RATE}
        </span>
      </div>
      <div>
        <a
          onClick={() => {
            // delete group
            milestonesStore.update(state => {
              const groups = state[milestoneId] || []
              return {
                ...state,
                [milestoneId]: groups.filter(g => g.id !== group.id),
              }
            })

            // we have to remove the group manually since ministore does not pass the old state to the subscribe callback
            document.getElementById(encodeGroupId(group.id))?.remove()
          }}
          className='color-fg-danger btn-link mt-2'
        >
          Delete
        </a>
      </div>
    </div>
  )
}

export default GroupDetails
