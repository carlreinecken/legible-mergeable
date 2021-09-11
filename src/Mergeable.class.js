import * as util from './util'
import { MERGEABLE_MARKER } from './constants'
import { mergeFunction } from './merge-function'
import { createProxy } from './proxy'
import * as converter from './converter'

export class Mergeable {
  get __isMergeable () {
    return true
  }

  constructor ({ _state, _modifications }) {
    this._state = _state
    this._modifications = _modifications
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

    if (options.mergeable || util.hasKey(value, MERGEABLE_MARKER)) {
      value = converter.fromDump(value, property => new Mergeable(property))
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

    callback(createProxy(this, options, Mergeable))

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
    return converter.toBase(this)
  }

  meta () {
    // TODO: remove the marker out of this method
    return { [MERGEABLE_MARKER]: { ...this._modifications } }
  }

  /*
   * Dumps the object as native simple object
   */
  dump () {
    return converter.toDump(this)
  }

  toString () {
    return JSON.stringify(this.dump())
  }

  toJSON () {
    return this.dump()
  }

  clone () {
    return converter.fromTransfer(this, (property) => new Mergeable(property))
  }

  merge (docB) {
    if (!(docB instanceof Mergeable)) {
      throw TypeError('Only instances of Mergeable can be merged')
    }

    const result = mergeFunction({ a: this, b: docB })
    const { _state, _modifications } = converter
      .fromTransfer(result, (property) => {
        // console.log('MC/merge/trFn', property)
        return new Mergeable(property)
      })

    this._state = _state
    // console.log(this._state, _state)
    this._modifications = _modifications

    return this
  }

  filter (callback, options) {
    options = options || {}

    const result = {}

    for (const key in this._state) {
      let value = this._state[key]

      if (options.proxy === true && value instanceof Mergeable) {
        value = createProxy(value, null, Mergeable)
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
        value = createProxy(value, null, Mergeable)
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
    return createProxy(this, null, Mergeable)
  }
}
