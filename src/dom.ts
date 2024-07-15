import ReactDOM from 'react-dom/client'

/** The class name to use on all React roots so they can be removed and re-rendered. */
const ROOT_CLASS = 'react-root'

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
  root.classList.add(ROOT_CLASS)
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

/** Waits for a query selector to return a non-null element. */
export const waitForElement = (selector: string, wait: number = 16): Promise<Element> => {
  const el = document.querySelector(selector)
  return new Promise(resolve => {
    if (el) {
      resolve(el)
    } else {
      setTimeout(() => {
        resolve(waitForElement(selector, wait * 2))
      }, wait)
    }
  })
}
