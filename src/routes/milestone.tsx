import React from 'react'
import ExpandAll from '../components/ExpandAll'
import Export from '../components/Export'
import GroupHeading from '../components/GroupHeading'
import NewGroupLink from '../components/NewGroupLink'
import { insertReactRoot } from '../dom'
import db from '../store/db'
import expandedStore from '../store/expandedStore'
import milestonesStore from '../store/milestonesStore'
import decodeGroupId from '../util/decodeGroupId'
import decodeIssueNumber from '../util/decodeIssueNumber'
import encodeGroupId from '../util/encodeGroupId'
import encodeIssueNumber from '../util/encodeIssueNumber'
import milestoneId from './milestoneId'

/*****************************
 * SETUP
 *****************************/

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

/*****************************
 * COMPONENTS
 *****************************/

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

/** Re-renders milestone groups and option links. */
const render = () => {
  renderGroups()

  // "Expand all" is hidden when there are no groups
  renderOptionLinks()
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

    expandedStore.updateFromMilestones(milestones)

    render()
    setTimeout(updateGroupsFromDOM)
  })

  // re-render groups after Everhour time estimates load
  waitForValue(() => document.querySelector('.everhour-item-time')).then(() => {
    render()
  })

  // update milestone on drag
  // recalculate all milestones for simplicity
  const container = document.querySelector('.js-milestone-issues-container')!
  container.addEventListener('dragend', () => {
    // give the DOM a moment to re-render, as I have seen group estimates become stale
    setTimeout(updateGroupsFromDOM)
  })

  // When an issue is added or removed from a milestone in another tab, the table re-loads.
  // I could not find a turbo event or any other event on the window, document, or turbo-frame that triggers when the table is reloaded, so restore to re-rendering when the tab becomes active again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      render()
    }
  })

  // wait for the first issue to load before inserting the milestone groups
  await waitForValue(() => document.querySelector('.js-issue-row:not(.milestone-group)'))

  render()
}

export default milestone
