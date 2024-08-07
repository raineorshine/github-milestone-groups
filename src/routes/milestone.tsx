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
      {groups.length > 0 && <ExpandAll />}
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
