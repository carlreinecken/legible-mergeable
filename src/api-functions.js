import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'
import { MergeableExpectedObjectError } from './errors.js'

export function renew (mergeable, keys, options) {
  options = options || {}

  touch(mergeable)

  keys = Array.isArray(keys) ? keys : [keys]

  for (const key of keys) {
    mergeable[MERGEABLE_MARKER][key] = options.date || (new Date()).toISOString()
  }
}

export function touch (mergeable) {
  if (!util.isObject(mergeable)) {
    throw new MergeableExpectedObjectError()
  }

  if (!util.hasKey(mergeable, MERGEABLE_MARKER)) {
    mergeable[MERGEABLE_MARKER] = {}
  }

  return mergeable
}

export function set (mergeable, key, value, options) {
  mergeable[key] = value

  renew(mergeable, key, options)
}

export function drop (mergeable, key, options) {
  delete mergeable[key]

  renew(mergeable, key, options)
}

export function base (mergeable) {
  return transformMergeable(mergeable)
}

export function clone (mergeable) {
  const transformed = transformMergeable(mergeable, property => clone(property))

  if (util.isObject(mergeable) && util.hasKey(mergeable, MERGEABLE_MARKER)) {
    transformed[MERGEABLE_MARKER] = { ...mergeable[MERGEABLE_MARKER] }
  }

  return transformed
}

/**
 * Just return all keys except of course the marker
 */
export function keys (mergeable) {
  return Object.keys(mergeable).filter((key) => key !== MERGEABLE_MARKER)
}

/**
 * Compares a `mergeableA` with a `mergeableB` and returns an array of keys for
 * missing and added elements. The modification marker is ignored and skipped.
 */
export function compare (mergeableA, mergeableB) {
  const keysA = keys(mergeableA)
  const setA = new Set(keysA)
  const keysB = keys(mergeableB)
  const setB = new Set(keysB)

  return {
    missing: keysA.filter((key) => !setB.has(key)),
    added: keysB.filter((key) => !setA.has(key))
  }
}

/**
 * It returns the modifications of the mergeable. If modifications are passed
 * as argument they get set on the mergeable.
 */
export function modifications (mergeable, modifications) {
  if (!util.isObject(mergeable)) {
    return {}
  }

  if (util.isObject(modifications)) {
    mergeable[MERGEABLE_MARKER] = modifications
  }

  if (util.hasKey(mergeable, MERGEABLE_MARKER)) {
    return mergeable[MERGEABLE_MARKER]
  }

  return {}
}
