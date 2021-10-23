import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import * as apiFunctions from './api-functions.js'

export function filter (mergeable, callback) {
  const result = []

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    const modification = apiFunctions.modifications(mergeable)[key]

    if (!callback || callback(mergeable[key], key, modification)) {
      result.push(mergeable[key])
    }
  }

  return result
}

export function map (mergeable, callback) {
  const result = []

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    const modification = apiFunctions.modifications(mergeable)[key]
    const evaluation = callback(mergeable[key], key, modification)

    result.push(evaluation)
  }

  return result
}
