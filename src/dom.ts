import ReactDOM from 'react-dom/client'

/** Returns true if a value is non null and non undefined. */
function nonNull<T>(value: T | null | undefined): value is T {
  return value != null
}

/** Inserts a ReactDOM root prepended, inserted after, or inserted before a node. */
export const insertReactRoot = (
  el: Element | null,
  position: 'prepend' | 'appendChild' | 'insertBefore',
  {
    className,
    nextSibling,
    tagName,
  }: {
    className?: string
    /** Required for insertBefore. */
    nextSibling?: Element | null
    tagName?: string
  } = {},
) => {
  if (!el) return
  const root = document.createElement(tagName || 'div')
  root.classList.add('react-root')
  if (className) {
    className.split(' ').forEach(className => root.classList.add(className))
  }
  if (position === 'prepend' || position === 'appendChild') {
    el[position](root)
  } else {
    el[position](root, nextSibling || null)
  }
  return ReactDOM.createRoot(root)
}
