import * as util from './util'
import { mergeFunction } from './merge-function'
import { AbstractMergeable } from './AbstractMergeable.class'
import { createProxy } from './proxy'
import { transformDump, transformInternalState } from './transformers'
import { mapMergeableToMergeObject } from './merge-mapping'

export class Mergeable extends AbstractMergeable {
  constructor (state, modifications) {
    super()

    this._state = transformDump(state, property => Mergeable.createFromDump(property))
    this._modifications = modifications
  }

  static createFromDump (dump) {
    let modifications = {}
    const state = util.deepCopy(dump || {})

    if (util.hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
      modifications = state[Mergeable.MODIFICATIONS_KEY]
      delete state[Mergeable.MODIFICATIONS_KEY]
    }

    return new Mergeable(state, modifications)
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

  refresh (key, options) {
    options = options || {}

    this._modifications[key] = util.newDate(options.date)
  }

  set (key, value, options) {
    options = options || {}

    if (options.mergeable) {
      value = Mergeable.createFromDump(value)
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

  date (key) {
    return this._modifications[key]
  }

  size () {
    return Object.keys(this._state).length
  }

  compare (docB) {
    const modifications = {
      a: Object.entries(this._modifications),
      b: Object.entries(docB._modifications)
    }

    if (modifications.a.length !== modifications.b.length) {
      return false
    }

    for (const [key, date] in modifications.a) {
      if (date !== modifications.b[key]) {
        return false
      }
    }

    return true
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

    const result = mergeFunction({ a: mapMergeableToMergeObject(this), b: mapMergeableToMergeObject(docB) })

    this._state = transformDump(result.state, dump => new Mergeable(dump.state, dump[Mergeable.MODIFICATIONS_KEY]))
    this._modifications = result[Mergeable.MODIFICATIONS_KEY]

    return this
  }

  filter (callback, options) {
    options = options || {}

    const result = {}

    for (const key in this._state) {
      let value = this._state[key]

      if (options.proxy === true && value instanceof Mergeable) {
        value = createProxy(value)
      }

      if (callback(value, key, this._modifications[key])) {
        result[key] = this._state[key]
      }
    }

    return result
  }

  map (callback, options) {
    options = options || {}

    const toArray = options.toArray === true
    const useProxy = options.proxy === true
    const result = toArray ? [] : {}

    for (const key in this._state) {
      let value = this._state[key]

      if (useProxy && value instanceof Mergeable) {
        value = createProxy(value)
      }

      const evaluation = callback(value, key, this._modifications[key])

      if (useProxy && evaluation instanceof Mergeable) {
        // Otherwise a proxy would be returned
        throw new TypeError('You can not return an instance of Mergeable')
      }

      if (toArray === true) {
        result.push(evaluation)
      } else {
        result[key] = evaluation
      }
    }

    return result
  }

  /*
   * Experimental
   */
  get _proxy () {
    return createProxy(this)
  }
}
