import ReactDOM from 'react-dom/client'

/** The class name to use on all React roots so they can be removed and re-rendered. */
const ROOT_CLASS = 'react-root'

/** A map of root element ids to ReactDOM roots that allows re-rendering in place. Never cleaned up! */
let rootMap = new Map<string, ReactDOM.Root>()

export const clear = () => {
  // remove old roots otherwish HMR recreates them
  document.querySelectorAll(`.${ROOT_CLASS}`).forEach(el => el.remove())
}

/** Inserts a ReactDOM root prepended, inserted after, or inserted before a node. */
export const insertReactRoot = (
  el: Element | null,
  position: 'prepend' | 'appendChild' | 'insertBefore',
  {
    className,
    id,
    nextSibling,
    tagName,
  }: {
    className?: string
    /** The id for the created React root element. If called again with the same id, will re-render in the existing root. */
    id?: string
    /** Required for insertBefore. */
    nextSibling?: Element | null
    tagName?: string
  } = {},
) => {
  if (!el) return

  // return the original root element if it exists
  if (id && rootMap.has(id)) {
    return rootMap.get(id)
  }

  const root = document.createElement(tagName || 'div')
  root.classList.add(ROOT_CLASS)
  if (className) {
    className.split(' ').forEach(className => root.classList.add(className))
  }
  if (position === 'prepend' || position === 'appendChild') {
    el[position](root)
  } else {
    el[position](root, nextSibling || null)
  }

  const reactRoot = ReactDOM.createRoot(root)

  // cache the react root so the same id can be re-rendered in place
  if (id) {
    root.id = id
    rootMap.set(id, reactRoot)
  }

  return reactRoot
}
