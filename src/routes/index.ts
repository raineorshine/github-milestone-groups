/** Sets up turbo route handlers and checks current route. */
const route = (routes: { [key: string]: () => void }) => {
  const onRoute = () => {
    // @ts-ignore
    const [_, org, repo, page, param] = window.location.pathname.split('/')
    routes[page]?.()
  }

  document.addEventListener('turbo:load', onRoute)
  const unsubscribe = () => document.removeEventListener('turbo:load', onRoute)

  onRoute()

  return unsubscribe
}

export default route
