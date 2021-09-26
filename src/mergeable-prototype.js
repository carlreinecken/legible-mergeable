import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { createProxy } from './proxy.js'
import { transformMergeables } from './recursive.js'

export function setMergeablePrototype (dump) {
  const result = transformMergeables(dump, (item) => setMergeablePrototype(item))

  result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {}

  Object.defineProperty(result, MERGEABLE_MARKER, { enumerable: false })

  return Object.setPrototypeOf(result, mergeablePrototype)
}

export const mergeablePrototype = {
  get __isMergeable () {
    return true
  },

  // TODO: i think it would be better if they call the createProxy function themself
  // otherwise the user might be inclined to call this function a lot, which
  // is not really good to create new proxies all the time, right?
  get _proxy () {
    return createProxy(this)
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

    if (options.mergeable || util.hasMarker(value)) {
      // value = createFromDump(value)
    }

    this[key] = value
    this[MERGEABLE_MARKER][key] = util.newDate(options.date)

    return this[key]
  },

  delete (key, options) {
    options = options || {}

    delete this[key]

    this[MERGEABLE_MARKER][key] = util.newDate(options.date)
  },

  // TODO: do i really need this? or should they just get the proxy directly?
  modify (callback, options) {
    options = options || {}

    callback(createProxy(this, options))

    return this
  },

  date (key) {
    return this[MERGEABLE_MARKER][key]
  },

  size () {
    return Object.keys(this).length
  },

  // TODO: so its basically a shallow cloning of this..?
  // TODO: without the marker please!
  state () {
    return { ...this }
  },

  /*
   * The state without the modifications, it's the "pure" document
   */
  base () {
    return transformMergeables(this, property => property.base())
  },

  /*
   * Dumps the object as native simple object
   */
  dump () {
    return {
      ...transformMergeables(this, property => property.dump()),
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
