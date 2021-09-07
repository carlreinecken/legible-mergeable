import * as util from './util'
import mergeFunction from './merge-function'

export class Mergeable {
  static get MODIFICATIONS_KEY () {
    return '^M3Rg34bL3'
  }

  constructor (state, modifications) {
    this._state = transformDump(state, property => createMergeableFromDump(property))
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

  set (key, value, options) {
    options = options || {}

    if (options.mergeable) {
      value = createMergeableFromDump(value || {})
    }

    this._state[key] = value
    this._modifications[key] = util.newDate(options.date)

    return this._state[key]
  }

  delete (key, options) {
    options = options || {}

    delete this._state[key]
    this._modifications[key] = util.newDate(options.date)
  }

  modify (callback, options) {
    options = options || {}

    callback(createProxy(this, options))

    return this
  }

  /*
   * Returns a proxy to make it possible to directly work on the state.
   * Useful for e.g. the vue v-model.
   * TODO: check practicability. Is sadly really buggy with Vue... Get's stuck
   * when property of state is not present when the proxy is created (? look at HTML demo).
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
   * Only use this when you need to iterate over all properties, to work on them
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

  merge (docB) {
    if (!(docB instanceof Mergeable)) {
      throw TypeError('Only instances of Mergeable can be merged')
    }

    const result = mergeFunction(
      { a: isolatedDump(this), b: isolatedDump(docB) },
      Mergeable.MODIFICATIONS_KEY
    )

    this._state = transformDump(result.state, property => createMergeableFromIsolatedDump(property))
    this._modifications = result[Mergeable.MODIFICATIONS_KEY]

    return this
  }
}

/*
 * I would really like to put these in another file, but that doesn't
 * work cause of circular references (I need the Mergeable class in there)
 */

export function isolatedDump (doc) {
  return {
    state: transformInternalState(doc._state, property => isolatedDump(property)),
    [Mergeable.MODIFICATIONS_KEY]: doc._modifications
  }
}

export function createMergeableFromIsolatedDump (dump) {
  return new Mergeable(dump.state, dump[Mergeable.MODIFICATIONS_KEY])
}

export function createMergeableFromDump (dump) {
  let modifications = {}
  const state = util.deepCopy(dump)

  if (util.hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
    modifications = state[Mergeable.MODIFICATIONS_KEY]
    delete state[Mergeable.MODIFICATIONS_KEY]
  }

  return new Mergeable(state, modifications)
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
export function transformDump (dump, transformInstanceFn) {
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

function createProxy (mergeable, options) {
  return new Proxy(mergeable, {
    get (target, key) {
      if (key === 'length') {
        return target.size()
      }

      const item = target._state[key]

      if (item instanceof Mergeable) {
        return createProxy(item, options)
      }

      return item
    },

    set (target, key, value) {
      target.set(key, value, options)
      return true
    },

    has (target, key) {
      return target.has(key)
    },

    deleteProperty (target, key) {
      target.delete(key, options)
      return true
    },

    ownKeys (target) {
      return Object.keys(target._state)
    },

    getOwnPropertyDescriptor (target, key) {
      if (target.has(key)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: target.get(key)
        }
      }
    }
  })
}
