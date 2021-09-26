import * as util from './util.js'

export function transformMergeables (dump, transformFn) {
  const result = {}

  for (const key in dump) {
    if (!util.hasKey(dump, key)) {
      continue
    }

    const property = dump[key]

    // TODO: add condition branch to check if key is MERGEABLE_MARKER
    // an then skip it, because the setMergeablePrototype sets it shallow
    // cloned by itself (which should be enough

    if (typeof property !== 'object') {
      result[key] = property
    } else if (util.hasMarker(property)) {
      result[key] = transformFn(property)
    } else {
      result[key] = util.deepCopy(property)
      // TODO: is deep copy ok?
      // result[key] = property
    }
  }

  return result
}
