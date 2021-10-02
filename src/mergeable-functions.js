import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'

export function renew (mergeable, key, options) {
  options = options || {}

  touch(mergeable)

  mergeable[MERGEABLE_MARKER][key] = options.date || (new Date()).toISOString()
}

export function touch (mergeable) {
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

export function modifications (mergeable) {
  return mergeable[MERGEABLE_MARKER] || {}
}

export function size (mergeable) {
  return Object.keys(mergeable).length
}

export function base (mergeable) {
  return transformMergeable(mergeable, property => base(property), true)
}

export function clone (mergeable) {
  return transformMergeable(mergeable || {}, property => property, false)
}

export function filter (mergeable, callback) {
  const result = []

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    if (callback(mergeable[key], key, modifications(mergeable)[key])) {
      result.push(mergeable[key])
    }
  }

  return result
}

export function map (mergeable, callback) {
  const result = []

  touch(mergeable)

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    const evaluation = callback(mergeable[key], key, modifications(mergeable)[key])

    result.push(evaluation)
  }

  return result
}
