import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import ministore from './ministore'
import storage from './storage'

const db = storage.model({
  milestones: {
    default: [],
    decode: s => JSON.parse(s || '[]'),
    encode: JSON.stringify,
  },
})

const store = ministore(db.get('milestones') as { index: number }[])

store.subscribe(() => {
  db.set('milestones', store.getState())
  renderMilestoneGroups()
})

const insertReactRoot = (
  el: Element | null,
  position: 'before' | 'after',
  { className, tagName }: { className?: string; tagName?: string } = {},
) => {
  if (!el) return
  const root = document.createElement(tagName || 'div')
  root.classList.add('react-root')
  if (className) {
    className.split(' ').forEach(className => root.classList.add(className))
  }
  el[position === 'before' ? 'prepend' : 'appendChild'](root)
  return ReactDOM.createRoot(root)
}
const appendReactRoot = (el: Element | null, { className, tagName }: { className?: string; tagName?: string } = {}) =>
  insertReactRoot(el, 'after', { className, tagName })
const prependReactRoot = (el: Element | null, { className, tagName }: { className?: string; tagName?: string } = {}) =>
  insertReactRoot(el, 'before', { className, tagName })

function Heading({ index }: { index: number }) {
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
                    store.update(milestones => milestones.filter(m => m.index !== index))
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

// remove old roots otherwish HMR recreates them
document.querySelectorAll('.react-root').forEach(el => el.remove())

const container = document.querySelector('.js-milestone-issues-container')

appendReactRoot(
  document.getElementById('js-issues-toolbar')!.querySelector('.table-list-filters .table-list-header-toggle'),
  { tagName: 'span' },
)?.render(
  <React.StrictMode>
    <a
      onClick={() => {
        const index = container?.querySelectorAll('.milestone-group').length || 0
        store.update(milestones => [...milestones, { index: index }])
        renderMilestoneGroups()
      }}
      className='btn-link'
      style={{ marginLeft: '1em', padding: 0 }}
    >
      + Add group
    </a>
  </React.StrictMode>,
)

const renderMilestoneGroups = () => {
  container?.querySelectorAll('.milestone-group').forEach(el => el.remove())
  store.getState().map((_, i) =>
    prependReactRoot(container, {
      className:
        'milestone-group Box-row Box-row--focus-gray js-navigation-item js-issue-row js-draggable-issue sortable-button-item',
    })?.render(
      <React.StrictMode>
        <Heading index={i} />
      </React.StrictMode>,
    ),
  )
}

renderMilestoneGroups()
