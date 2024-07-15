import React, { useState } from 'react'
import { insertReactRoot, waitForElement } from '../dom'
import ministore from '../ministore'
import storage from '../storage'

/*****************************
 * SETUP
 *****************************/

/** A group of issues within a GitHub milestone. */
interface MilestoneGroup {
  startIssue: string
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

/*****************************
 * COMPONENTS
 *****************************/

const AddGroupLink = ({ milestoneId }: { milestoneId: string }) => {
  return (
    <a
      onClick={() => {
        store.update(milestones => ({
          ...milestones,
          [milestoneId]: [...(milestones[milestoneId] || []), { startIssue: 'x' }],
        }))
        renderMilestoneGroups(milestoneId)
      }}
      className='btn-link'
      style={{ marginLeft: '1em', padding: 0 }}
    >
      + Add group
    </a>
  )
}

function Heading({ milestoneId, index }: { milestoneId: string; index: number }) {
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
              <div>Due: x</div>
              <div>#xxx</div>
              <div>$</div>
              <div>
                <a
                  onClick={() => {
                    store.update(state => {
                      const milestones = state[milestoneId] || []
                      return {
                        ...state,
                        [milestoneId]: milestones.filter((_, i) => i !== index),
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
const renderMilestoneGroups = async (milestoneId: string) => {
  const container = document.querySelector('.js-milestone-issues-container')
  if (!container) {
    throw new Error('Unable to find .js-milestone-issues-container')
  }

  // clear old milestone groups
  container.querySelectorAll('.milestone-group').forEach(el => el.remove())

  // get the current milestones
  const milestones = store.getState()[milestoneId] || []

  // wait for the first issue to load before inserting the milestone groups
  await waitForElement('.js-issue-row:not(.milestone-group)')

  milestones.map((_, i) =>
    insertReactRoot(container, 'insertBefore', {
      className:
        'milestone-group Box-row Box-row--focus-gray js-navigation-item js-issue-row js-draggable-issue sortable-button-item',
      nextSibling: container?.querySelector('.js-issue-row:not(.milestone-group)'),
    })?.render(
      <React.StrictMode>
        <Heading milestoneId={milestoneId} index={i} />
      </React.StrictMode>,
    ),
  )
}

/** Renders milestone group options and milestone groups on the milestone page. */
const milestone = (milestoneId: string) => {
  // re-render everything
  store.subscribe(() => {
    db.set('milestones', store.getState())
    renderMilestoneGroups(milestoneId)
  })

  // remove old roots otherwish HMR recreates them
  document.querySelectorAll('.react-root').forEach(el => el.remove())

  // Add Group link in table header
  insertReactRoot(
    document.getElementById('js-issues-toolbar')!.querySelector('.table-list-filters .table-list-header-toggle'),
    'appendChild',
    { tagName: 'span' },
  )?.render(
    <React.StrictMode>
      <AddGroupLink milestoneId={milestoneId} />
    </React.StrictMode>,
  )

  renderMilestoneGroups(milestoneId)
}

export default milestone
