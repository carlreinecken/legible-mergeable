import * as util from './util.js'
import { MERGEABLE_MARKER, WRONG_TYPE_GIVEN_EXPECTED_OBJECT } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'

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
    throw new TypeError(WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
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

export function size (mergeable) {
  return Object.keys(mergeable).length
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

export function modifications (mergeable) {
  if (!util.isObject(mergeable) || !util.hasKey(mergeable, MERGEABLE_MARKER)) {
    return {}
  }

  return mergeable[MERGEABLE_MARKER]
}
