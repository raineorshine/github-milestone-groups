import { useEffect, useRef, useSyncExternalStore } from 'react'
import ministore, { Ministore } from './ministore'

/** A minimal store type. */
interface Store<T> {
  getState: () => T
  subscribe: (cb: () => void) => () => void
}

/** Creates a useEffect hook that invokes a callback when a slice of a given store's state changes. Unlike useSelector, triggers the callback without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const makeSelectorEffect = <U extends Store<any>>(store: U) => {
  type S = U extends Store<infer V> ? V : never

  return <T>(effect: () => void, select: (state: S) => T, equalityFn?: (a: T, b: T) => boolean) => {
    const prev = useRef<T>(select(store.getState()))
    useEffect(
      () =>
        // Returns unsubscribe which is called on unmount.
        store.subscribe(() => {
          const current = select(store.getState())
          if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
            effect()
          }
          prev.current = current
        }),
      [effect, equalityFn, select],
    )
  }
}

/** Enhances a generic store with React hooks. */
const makeReactStore = <U extends Store<any>>(store: U) => {
  type T = U extends Store<infer V> ? V : never

  /** A hook that invokes a callback when the state changes. */
  const useChangeEffect = (cb: (state: T) => void) =>
    useEffect(
      () =>
        store.subscribe(() => {
          cb(store.getState())
        }),
      [cb],
    )

  function useSelector<U>(selector: (state: T) => U): U
  function useSelector(): T
  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  function useSelector<U>(selector?: (state: T) => U): T | U {
    const value = useSyncExternalStore(
      store.subscribe,
      selector ? () => selector(store.getState()) : () => store.getState(),
    )

    return value
  }

  return {
    ...store,
    useEffect: useChangeEffect,
    useSelector: useSelector as <U>(selector: (state: T) => U) => U,
    useSelectorEffect: makeSelectorEffect(store),
    useState: useSelector as () => T,
  }
}

/** Create a ministore that is enhanced with React hooks. */
const reactMinistore = <T>(initialState: T) => makeReactStore(ministore(initialState))

/** Create a read-only computed reactMinistore that derives its state from one or more ministores. */
function compose<T, S extends any[]>(compute: (...states: S) => T, stores: { [K in keyof S]: Ministore<S[K]> }) {
  const store = ministore.compose(compute, stores)
  return makeReactStore(store)
}

reactMinistore.compose = compose

export default reactMinistore
