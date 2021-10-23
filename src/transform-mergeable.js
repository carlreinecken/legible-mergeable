import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'

export function transformMergeable (dump, transformFn) {
  const result = {}

  if (!util.isObject(dump)) {
    dump = {}
  }

  for (const key in dump) {
    if (!util.hasKey(dump, key)) {
      continue
    }

    const property = dump[key]

    if (!util.isObject(property)) {
      result[key] = property
    } else if (key === MERGEABLE_MARKER) {
      continue
    } else if (util.hasMarker(property)) {
      result[key] = transformFn
        ? transformFn(property)
        : transformMergeable(property)
    } else {
      result[key] = util.deepCopy(property)
    }
  }

  return result
}
