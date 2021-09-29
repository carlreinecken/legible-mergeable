import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'

export function setMergeablePrototype (dump) {
  const result = transformMergeable(dump, (item) => setMergeablePrototype(item))

  result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {}

  Object.defineProperty(result, MERGEABLE_MARKER, { enumerable: false })

  return Object.setPrototypeOf(result, mergeablePrototype)
}

export const mergeablePrototype = {
  get __isMergeable () {
    return true
  },

  has (key) {
    return util.hasKey(this, key)
  },

  get (key, fallback) {
    if (this.has(key)) {
      return this[key]
    }

    return fallback
  },

  refresh (key, options) {
    options = options || {}

    this[MERGEABLE_MARKER][key] = util.newDate(options.date)
  },

  set (key, value, options) {
    options = options || {}

    if (options.mergeable || (options.mergeable !== false && util.hasMarker(value))) {
      value = setMergeablePrototype(value)
    }

    this[key] = value
    this[MERGEABLE_MARKER][key] = util.newDate(options.date)

    return this
  },

  delete (key, options) {
    options = options || {}

    delete this[key]

    this[MERGEABLE_MARKER][key] = util.newDate(options.date)

    return this
  },

  date (key) {
    return this[MERGEABLE_MARKER][key]
  },

  size () {
    return Object.keys(this).length
  },

  /*
   * The state without the modifications, it's the "pure" document
   */
  base () {
    return transformMergeable(this, property => property.base())
  },

  /*
   * Dumps the object as native simple object
   */
  dump () {
    return {
      ...transformMergeable(this, property => property.dump()),
      [MERGEABLE_MARKER]: this[MERGEABLE_MARKER]
    }
  },

  toString () {
    return JSON.stringify(this.dump())
  },

  toJSON () {
    return this.dump()
  },

  clone () {
    return setMergeablePrototype(this || {})
  },

  filter (callback) {
    const result = {}

    for (const key in this) {
      if (!util.hasKey(this, key)) {
        continue
      }

      const value = this[key]

      if (callback(value, key, this[MERGEABLE_MARKER][key])) {
        result[key] = value
      }
    }

    return result
  },

  map (callback) {
    const result = []

    for (const key in this) {
      if (!util.hasKey(this, key)) {
        continue
      }

      const value = this[key]
      const evaluation = callback(value, key, this[MERGEABLE_MARKER][key])

      result.push(evaluation)
    }

    return result
  }
}
