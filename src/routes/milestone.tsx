import React from 'react'
import { insertReactRoot } from '../dom'
import reactMinistore from '../react-ministore'
import storage from '../storage'

/** Hourly rate used to calculate the budget from estimated hours. */
const HOURLY_RATE = 40

/*****************************
 * SETUP
 *****************************/

/** The position of a group, either above an issue, or at the beginning or end of the list. */
type Position = number | 'first' | 'last'

/** A group of issues within a GitHub milestone. */
interface MilestoneGroup {
  id: string
  due: string
  /** The issue number of the first issue in the group. 'first' if the group has no milestones and is at the top of the list (i.e. is inserted directly before an existing group at the top). 'last' if the group has no milestones and is at the end of the list. */
  startIssue: Position
}

/** A storage model type for all milestone groups keyed by GitHub milestone id. */
interface MilestoneState {
  [milestoneId: string]: MilestoneGroup[]
}

interface ExpandedState {
  [milestoneId: string]: { [groupId: string]: boolean }
}

const db = storage.model({
  milestones: {
    default: {} as MilestoneState,
    decode: s => JSON.parse(s || '{}') as MilestoneState,
    encode: JSON.stringify,
  },
})

/** Returns an update function for expandedStore that merges in the current milestones. Adds new keys to the expanded store, deletes removed keys, and keeps existing keys with their existing state. */
const updateExpandedFromMilestones = (milestones: MilestoneState) => (state: ExpandedState) => ({
  [milestoneId]: Object.fromEntries(
    (milestones[milestoneId] || []).map(g => [g.id, state[milestoneId]?.[g.id] ?? false]),
  ),
})

const [, , , , milestoneId] = window.location.pathname.split('/')
const milestonesStore = reactMinistore(db.get('milestones'))
const expandedStore = reactMinistore(updateExpandedFromMilestones(milestonesStore.getState())({}))

/** Encodes a group id into a milestone group DOM id. */
const encodeGroupId = (id: string) => `milestone-group-${id}`

/** Decode a group id from a milestone group DOM id. */
const decodeGroupId = (el: Element) => el.id.replace('milestone-group-', '')

/** Decode an issue number from an issue row id. */
const decodeIssueNumber = (el: Element): Position => (!el ? 'last' : el.id ? +el.id.split('_')[1] : 'first')

/** Encode an issue number into an issue row id. */
const encodeIssueNumber = (issueNumber: Position) => `issue_${issueNumber}`

/** Extracts the Everhour time estimate from an issue row. */
const decodeTimeEstimate = (el: Element | null): number => {
  // Example text: '0h of 20h'
  // '\n                0h\n                 of 20h\n            '
  const text = el?.querySelector?.('.everhour-item-time')?.textContent || ''
  return +text.replace(/h/g, '').split('of')[1]?.trim() || 0
}

/** Waits for a function to return a non-null, non-undefined value, with logarithmic rolloff. */
const waitForValue = <T,>(f: () => T, duration: number = 16): Promise<NonNullable<T>> => {
  return new Promise(resolve => {
    const result = f()
    if (result != null) {
      resolve(result)
    } else {
      setTimeout(() => {
        resolve(waitForValue(f, duration * 2))
      }, duration)
    }
  })
}

/** Creates a pseudorandom id. */
const createId = (): string => Math.random().toString(36).slice(2)

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

/*****************************
 * COMPONENTS
 *****************************/

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

/** Export all milestone groups as JSON. */
function Export() {
  const groups = milestonesStore.useSelector(state => state[milestoneId] || [])
  const allDetails = groups.map(group => ({ ...groupDetails(group), due: group.due }))

  return (
    <a
      onClick={() => {
        alert(JSON.stringify(allDetails))
      }}
      className='btn-link'
      style={{ marginLeft: '1em', padding: 0 }}
    >
      <svg
        width='18'
        height='18'
        fill='rgba(255, 255, 255, 1)'
        viewBox='0 0 11 10'
        style={{
          position: 'relative',
          fill: 'var(--fgColor-muted, var(--color-fg-muted))',
          width: '18px',
          height: '18px',
          verticalAlign: 'top',
        }}
      >
        <g>
          <path d='M5.07799385,1.57822638 L5.07799385,6.00195683 C5.07799385,6.25652943 4.87308997,6.46290127 4.61635805,6.46290127 C4.36140363,6.46290127 4.15472224,6.25632412 4.15472224,6.00195683 L4.15472224,1.57673073 L3.63332249,2.09813049 C3.45470505,2.27674793 3.16501806,2.27665705 2.98348118,2.09512018 C2.80320118,1.91484018 2.80426532,1.62148443 2.98047088,1.44527887 L4.29219473,0.133555019 C4.38100979,0.0447399441 4.49728613,0.000109416918 4.61407318,0 L4.61759666,0.0013781583 C4.73483522,0.00162826335 4.85141208,0.0459413813 4.93902573,0.133555019 L6.25074959,1.44527887 C6.42936703,1.62389632 6.42927613,1.91358331 6.24773926,2.09512018 C6.06745926,2.27540018 5.77410353,2.27433604 5.59789795,2.09813049 L5.07799385,1.57822638 Z M0.92327161,8.54026239 L8.30944449,8.54026239 L8.30944449,5.3066871 C8.30944449,5.05290609 8.51434837,4.84717595 8.77108029,4.84717595 C9.02603471,4.84717595 9.2327161,5.05449945 9.2327161,5.3066871 L9.2327161,9.00402285 C9.2327161,9.13081036 9.18157324,9.24560465 9.09837549,9.32874375 C9.01393142,9.41215029 8.89896465,9.463534 8.77170544,9.463534 L0.461010662,9.463534 C0.334057222,9.463534 0.219089304,9.41259023 0.135717961,9.32967926 C0.05158592,9.24480666 0,9.1300136 0,9.00402285 L0,5.3066871 C0,5.05290609 0.204903893,4.84717595 0.461635805,4.84717595 C0.71659022,4.84717595 0.92327161,5.05449945 0.92327161,5.3066871 L0.92327161,8.54026239 Z'></path>
        </g>
      </svg>
    </a>
  )
}

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

/*****************************
 * RENDER
 * We need multiple React roots since we are interspersing React components with existing issues in the milestone issues table.
 *****************************/

/** Renders milestone groups in the milestone issues table. */
const renderGroups = () => {
  const container = document.querySelector('.js-milestone-issues-container')
  if (!container) {
    throw new Error('Unable to find .js-milestone-issues-container')
  }

  // get the current milestone groups
  const groups = milestonesStore.getState()[milestoneId] || []

  groups.forEach((group, i) => {
    const nextSibling: HTMLElement | null = document.getElementById(
      encodeIssueNumber(group.startIssue || groups.slice(i + 1).find(g => g.startIssue)?.startIssue || 'first'),
    )

    insertReactRoot(container, 'insertBefore', {
      className:
        'milestone-group Box-row Box-row--focus-gray js-navigation-item js-issue-row js-draggable-issue sortable-button-item',
      id: encodeGroupId(group.id),
      nextSibling,
    })?.render(
      <React.StrictMode>
        <GroupHeading group={group} index={i} />
      </React.StrictMode>,
    )
  })
}

/** Inserts a React root into the table heading and renders milestone group options. */
const renderOptionLinks = () => {
  const groups = milestonesStore.getState()[milestoneId] || []
  insertReactRoot(
    document.getElementById('js-issues-toolbar')!.querySelector('.table-list-filters .table-list-header-toggle'),
    'appendChild',
    { id: 'option-links', tagName: 'span' },
  )?.render(
    <React.StrictMode>
      <NewGroupLink />
      {groups.length > 0 && (
        <>
          <ExpandAll />
          <Export />
        </>
      )}
    </React.StrictMode>,
  )
}

/** Updates the milestone groups based on thn currently rendered issues. Triggered after a milestrone is created or an issue is dragged to a new position. The DOM is the sourxe of truth, since GitHub controls interaction and rendering of the issues table. */
const updateGroupsFromDOM = () => {
  const groupsOld = milestonesStore.getState()[milestoneId]
  const groupRows = [...document.querySelectorAll('.milestone-group')] as HTMLElement[]
  const groupsFromDOM = groupRows.map(row => ({
    id: decodeGroupId(row),
    startIssue: decodeIssueNumber(row.nextElementSibling!),
    due: groupsOld.find(g => g.id === decodeGroupId(row))?.due || '',
  }))

  // Only update state if it has deep changed, otherwise this can lead to an infinite render loop.
  // Ministore only does a shallow compare.
  if (JSON.stringify(groupsFromDOM) !== JSON.stringify(groupsOld)) {
    milestonesStore.update({
      [milestoneId]: groupsFromDOM,
    })
  }
  // Groups may not have changed, but the issues within them may have, so we need to re-render to update the group estimates.
  else {
    renderGroups()
  }
}

/** Renders milestone group options and milestone groups on the milestone page. */
const milestone = async () => {
  // persist and re-render milestone groups when the store changes
  milestonesStore.subscribe(milestones => {
    const state = milestonesStore.getState()
    db.set('milestones', state)

    expandedStore.update(updateExpandedFromMilestones(milestones))

    renderGroups()
    renderOptionLinks() // "Expand all" is hidden when there are no groups
    setTimeout(updateGroupsFromDOM)
  })

  // re-render groups after Everhour time estimates load
  waitForValue(() => document.querySelector('.everhour-item-time')).then(() => {
    renderGroups()
    renderOptionLinks()
  })

  // update milestone on drag
  // recalculate all milestones for simplicity
  const container = document.querySelector('.js-milestone-issues-container')!
  container.addEventListener('dragend', () => {
    // give the DOM a moment to re-render, as I have seen group estimates become stale
    setTimeout(updateGroupsFromDOM)
  })

  // wait for the first issue to load before inserting the milestone groups
  await waitForValue(() => document.querySelector('.js-issue-row:not(.milestone-group)'))
  renderOptionLinks()
  renderGroups()
}

export default milestone
