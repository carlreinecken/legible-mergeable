import * as util from './util'
import mergeFunction from './merge-function'

export class Mergeable {
  static get MODIFICATIONS_KEY () {
    return '^m'
  }

  constructor (state, modifications) {
    this._state = transformDump(state, property => {
      const { state, modifications } = splitIntoStateAndModifications(property)

      return new Mergeable(state, modifications)
    })

    this._modifications = modifications
  }

  has (key) {
    return util.hasKey(this._state, key)
  }

  get (key, fallback) {
    if (this.has(key)) {
      return this._state[key]
    }

    return fallback
  }

  set (key, value, date) {
    this._state[key] = value
    this._modifications[key] = util.newDate(date)
  }

  delete (key, date) {
    delete this._state[key]
    this._modifications[key] = util.newDate(date)
  }

  /*
   * Returns a proxy to make it possible to directly work on the state.
   * Useful for e.g. the vue v-model.
   * TODO: check practicability
   */
  get use () {
    return new Proxy(this, {
      get (target, prop) {
        return target._state[prop]
      },

      set (target, prop, value) {
        target.set(prop, value)
        return true
      },

      deleteProperty (target, prop) {
        target.delete(prop)
        return true
      }
    })
  }

  size () {
    return Object.keys(this._state).length
  }

  /*
   * Not serialized state with all MergeableObject. Only manipulate the objects
   * with this, changes to the array are not persisted.
   * TODO: add test
   */
  state () {
    return { ...this._state }
  }

  /*
   * The state without the modifications, it's the "pure" document
   */
  base () {
    return transformInternalState(this._state, property => property.base())
  }

  meta () {
    return { [Mergeable.MODIFICATIONS_KEY]: { ...this._modifications } }
  }

  /*
   * Dumps the object as native simple object
   */
  dump () {
    return {
      ...transformInternalState(this._state, property => property.dump()),
      [Mergeable.MODIFICATIONS_KEY]: this._modifications
    }
  }

  toString () {
    return JSON.stringify(this.dump())
  }

  toJSON () {
    return this.dump()
  }

  clone () {
    return new Mergeable(util.deepCopy(this._state), { ...this._modifications })
  }

  merge (stateB) {
    const result = mergeFunction(this._state, this._modifications, stateB._state, stateB._modifications)

    this._state = result.state
    this._modifications = result.modifications

    return this
  }
}

export function splitIntoStateAndModifications (dump) {
  let modifications = {}
  const state = util.deepCopy(dump)

  if (util.hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
    modifications = state[Mergeable.MODIFICATIONS_KEY]
    delete state[Mergeable.MODIFICATIONS_KEY]
  }

  return { modifications, state }
}

/**
 * Transform a given internal state.
 * If the instance is found it gets transformed via the given callback
 */
function transformInternalState (state, transformInstanceFn) {
  return Object
    .entries(state)
    .reduce((result, [identifier, property]) => {
      if (typeof property !== 'object') {
        result[identifier] = property
      } else if (property instanceof Mergeable) {
        result[identifier] = transformInstanceFn(property)
      } else {
        result[identifier] = util.deepCopy(property)
      }

      return result
    }, {})
}

/**
 * Transform a given dumped (raw) object.
 * If the instance is found it gets transformed via the given callback
 */
function transformDump (dump, transformInstanceFn) {
  return Object
    .entries(dump)
    .reduce((result, [identifier, property]) => {
      if (util.isObject(property) && util.isObject(property[Mergeable.MODIFICATIONS_KEY])) {
        result[identifier] = transformInstanceFn(property)
      } else {
        result[identifier] = property
      }

      return result
    }, {})
}
