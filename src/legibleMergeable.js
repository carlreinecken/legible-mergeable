import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { mergeFunction } from './merge-function.js'
import { setMergeablePrototype } from './mergeable-prototype.js'

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
