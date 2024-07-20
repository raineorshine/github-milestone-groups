import React, { useState } from 'react'
import { clear, insertReactRoot, waitForElement } from '../dom'
import ministore from '../ministore'
import storage from '../storage'

/*****************************
 * SETUP
 *****************************/

/** A group of issues within a GitHub milestone. */
interface MilestoneGroup {
  due: string
  startIssue: number | null
}

/** A storage model type for all milestone groups keyed by GitHub milestone id. */
interface MilestoneModel {
  [key: string]: MilestoneGroup[]
}

const db = storage.model({
  milestones: {
    default: {} as MilestoneModel,
    decode: s => JSON.parse(s || '{}') as MilestoneModel,
    encode: JSON.stringify,
  },
})

const store = ministore(db.get('milestones'))

/** Decode an issue number from an issue row id. */
const decodeIssueNumber = (el: Element | null) => (el?.id ? +el.id.split('_')[1] : null)

/** Encode an issue number into an issue row id. */
const encodeIssueNumber = (issueNumber: number) => `issue_${issueNumber}`

/*****************************
 * COMPONENTS
 *****************************/

/** A link rendered in the milestone issues table that adds a new milestone group when clicked. */
const NewGroupLink = ({ milestoneId }: { milestoneId: string }) => {
  /** Creates a new group. */
  const newGroup = () => {
    // insert the milestone
    const firstIssue = decodeIssueNumber(document.querySelector('.js-issue-row[id]'))
    store.update(milestones => {
      const groups = milestones[milestoneId] || []
      return {
        ...milestones,
        // If this is the first group, set the startIssue to the first issue in the table.
        // Otherwise, insert the new group in the penultimate position with startIssue: 0. Milestones are numbered in array order, so this is the same as adding the new group to the end, setting its startIssue to the issue below it, and setting the last group's startIssue to 0 since now has no issues.
        [milestoneId]:
          groups.length > 0
            ? [...groups.slice(0, -1), { startIssue: null, due: '' }, groups.at(-1)!]
            : [{ startIssue: firstIssue, due: '' }],
      }
    })
  }

  return (
    <a onClick={newGroup} className='btn-link' style={{ marginLeft: '1em', padding: 0 }}>
      + New group
    </a>
  )
}

/** A milestone group heading. */
function GroupHeading({ milestoneId, group, index }: { milestoneId: string; group: MilestoneGroup; index: number }) {
  const [showOptions, setShowOptions] = useState(false)

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
            <span className='ml-2' style={{ color: 'var(--fgColor-muted, var(--color-fg-muted))' }}>
              0h
            </span>
            <a
              onClick={() => setShowOptions(!showOptions)}
              className='Box-row--drag-button pl-1 pr-1'
              style={{
                color: 'var(--fgColor-muted, var(--color-fg-muted))',
                cursor: 'pointer',
                marginLeft: '0.5em',
                textDecoration: 'none',
                userSelect: 'none',
              }}
            >
              {showOptions ? '-' : '+'}
            </a>
          </div>
          {showOptions && (
            <div>
              <div>Due: {group.due}</div>
              <div>#xxx</div>
              <div>$0</div>
              <div>
                <a
                  onClick={() => {
                    // delete group
                    store.update(state => {
                      const groups = state[milestoneId] || []
                      return {
                        ...state,
                        [milestoneId]: groups.filter(
                          (_, i) => i !== (groups[index - 1].startIssue ? index : index - 1),
                        ),
                      }
                    })
                  }}
                  className='color-fg-danger btn-link mt-2'
                >
                  Delete
                </a>
              </div>
            </div>
          )}
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
const renderGroups = (milestoneId: string) => {
  const container = document.querySelector('.js-milestone-issues-container')
  if (!container) {
    throw new Error('Unable to find .js-milestone-issues-container')
  }

  // clear old milestone group elements
  container.querySelectorAll('.milestone-group').forEach(el => el.remove())

  // get the current milestone groups
  const groups = store.getState()[milestoneId] || []

  groups.forEach((group, i) => {
    const nextSibling: HTMLElement | null = document.getElementById(
      encodeIssueNumber(group.startIssue || groups.slice(i + 1).find(g => g.startIssue)?.startIssue || 0),
    )

    return insertReactRoot(container, 'insertBefore', {
      className:
        'milestone-group Box-row Box-row--focus-gray js-navigation-item js-issue-row js-draggable-issue sortable-button-item',
      nextSibling,
    })?.render(
      <React.StrictMode>
        <GroupHeading milestoneId={milestoneId} group={group} index={i} />
      </React.StrictMode>,
    )
  })
}

/** Inserts a React root into the table heading and renders milestone group options. */
const renderOptionLinks = (milestoneId: string) => {
  insertReactRoot(
    document.getElementById('js-issues-toolbar')!.querySelector('.table-list-filters .table-list-header-toggle'),
    'appendChild',
    { tagName: 'span' },
  )?.render(
    <React.StrictMode>
      <NewGroupLink milestoneId={milestoneId} />
    </React.StrictMode>,
  )
}

/** Updates the milestone groups based on thn currently rendered issues. Triggered after a milestrone is created or an issue is dragged to a new position. The DOM is the sourxe of truth, since GitHub controls interaction and rendering of the issues table. */
const updateGroupsFromDOM = (milestoneId: string) => {
  const groupRows = [...document.querySelectorAll('.milestone-group')]
  const nextSiblings = groupRows.map(el => el.nextElementSibling)
  const groups = nextSiblings.map(el => ({
    startIssue: decodeIssueNumber(el),
    due: '',
  }))

  // Only update state if it has deep changed, otherwise this can lead to an infinite render loop.
  // Ministore only does a shallow compare.
  if (JSON.stringify(groups) !== JSON.stringify(store.getState()[milestoneId])) {
    store.update({
      [milestoneId]: groups,
    })
  }
}

/** Renders milestone group options and milestone groups on the milestone page. */
const milestone = async (milestoneId: string) => {
  // wait for the first issue to load before inserting the milestone groups
  await waitForElement('.js-issue-row:not(.milestone-group)')

  // persist and re-render milestone groups when the store changes
  store.subscribe(() => {
    const state = store.getState()
    db.set('milestones', state)
    renderGroups(milestoneId)
    setTimeout(() => {
      updateGroupsFromDOM(milestoneId)
    })
  })

  clear()

  renderOptionLinks(milestoneId)
  renderGroups(milestoneId)

  // update milestone on drag
  // recalculate all milestones for simplicity
  const container = document.querySelector('.js-milestone-issues-container')!
  container.addEventListener('dragend', () => {
    updateGroupsFromDOM(milestoneId)
  })
}

export default milestone
