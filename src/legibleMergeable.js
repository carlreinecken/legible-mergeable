import { mergeFunction } from './merge-function'
import { Mergeable } from './Mergeable.class'

export default {
  create (dump) {
    return Mergeable.createFromDump(dump)
  },

  merge (docA, docB) {
    if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
      throw TypeError('Only instances of Mergeable can be merged')
    }

    return docA.clone().merge(docB)
  },

  _mergeFunction: mergeFunction,

  Mergeable: Mergeable
}
