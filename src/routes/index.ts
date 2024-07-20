/** Sets up turbo route handlers and checks current route. */
const route = (routes: { [key: string]: (...params: string[]) => void }) => {
  let lastPathname: string

  const onRoute = () => {
    // route handler can be triggered multiple times
    // do not trigger route if url has not changed
    if (window.location.pathname === lastPathname) return
    lastPathname = window.location.pathname

    // @ts-ignore
    const [_, org, repo, page, ...params] = window.location.pathname.split('/')
    routes[page]?.(...params)
  }

  document.addEventListener('turbo:load', onRoute)
  const unsubscribe = () => document.removeEventListener('turbo:load', onRoute)

  // Trigger the route handler in case turbo:load has already triggered.
  // It will do nothing if the url has not changed.
  onRoute()

  return unsubscribe
}

export default route
