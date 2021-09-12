import * as util from './util'
import { MERGEABLE_MARKER } from './constants'
import { mergeFunction } from './merge-function'
import { setMergeablePrototype } from './mergeable-prototype'

export default {
  create (dump) {
    return setMergeablePrototype(dump || {})
  },

  merge (docA, docB) {
    if (!util.isObject(docA) || !util.hasMarker(docA) || !util.isObject(docB) || !util.hasMarker(docB)) {
      // TODO: does a marker even need to exist (on the root)?
      throw TypeError('Only objects with the mergeable marker can be merged')
    }

    const result = mergeFunction({ a: docA, b: docB })

    return setMergeablePrototype(result)
  },

  _mergeFunction: mergeFunction,

  MERGEABLE_MARKER
}
