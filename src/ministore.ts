import Emitter from 'emitter20'

export interface Ministore<T> {
  /* Get the full state of the store. */
  getState: () => T
  /** Subscribes to changes. Returns an unsubscribe function. */
  subscribe: (f: (state: T) => void) => () => void
  /** Subscribes to changes to a slice of the state. Returns an unsubscribe function. */
  subscribeSelector: <S>(selector: (state: T) => S, f: (slice: S) => void, equals?: (a: S, b: S) => boolean) => void
  /** Updates the state. If the state is an object, accepts a partial update. Accepts an updater function that passes the old state. */
  update: (updatesOrUpdater: Partial<T> | ((oldState: T) => Partial<T>)) => void
}

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T>(initialState: T): Ministore<T> => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates one or more values in state. */
  const update = (updatesOrUpdater: Partial<T> | ((state: T) => Partial<T>)) => {
    const updates = typeof updatesOrUpdater === 'function' ? updatesOrUpdater(state) : updatesOrUpdater

    // short circuit if value(s) are unchanged
    if (
      updates && typeof updates === 'object' && !Array.isArray(updates)
        ? Object.entries(updates).every(([key, value]) => value === state[key as keyof T])
        : updates === state
    )
      return

    state =
      updates && typeof updates === 'object' && !Array.isArray(updates) ? { ...state, ...updates } : (updates as T)

    emitter.trigger('change', updates)
  }

  /**
   * Subscribe directly to the state.
   *
   * @returns Unsubscribe function.
   */
  const subscribe = (f: (state: T) => void): (() => void) => {
    emitter.on('change', f)
    return () => emitter.off('change', f)
  }

  /** Subscribe to a slice of the state. */
  const subscribeSelector = <S>(
    selector: (state: T) => S,
    f: (slice: S) => void,
    equals: (a: S, b: S) => boolean = (a, b) => a === b,
  ) => {
    let value = selector(state)
    subscribe(() => {
      const valueOld = value
      value = selector(state)
      if (!equals(value, valueOld)) {
        f(value)
      }
    })
  }

  return {
    getState: () => state,
    subscribe,
    subscribeSelector,
    update,
  }
}

/** Create a read-only computed ministore that derives its state from one or more ministores. */
function compose<T, S extends object[]>(
  compute: (...states: S) => T,
  // accept the same number of Ministores as states, with corresponding generic types, by using a mapped type generated from the states array
  stores: { [K in keyof S]: Ministore<S[K]> },
) {
  /** Gets the computed state from the stores. */
  const computeFromStores = () => compute(...(stores.map(store => store.getState()) as S))

  const store = ministore(computeFromStores())

  /** Update the composite store with the computed state. */
  const updateCompositeState = () => {
    store.update(computeFromStores())
  }

  const unsubscribes = stores.map(store => store.subscribe(updateCompositeState))

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { update, ...readonlyStore } = store

  return {
    ...readonlyStore,
    /** Destroys the composite store. */
    destroy: () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    },
  }
}

ministore.compose = compose

export default ministore
