import { MERGEABLE_MARKER } from './constants'
import { mergeFunction } from './merge-function'
import { Mergeable } from './Mergeable.class'
import * as converter from './converter'

export default {
  create (dump) {
    return converter.fromDump(dump, property => {
      const r = new Mergeable(property)
      // console.log('lM/create/trFn', r instanceof Mergeable, r)
      return r
    })
  },

  merge (docA, docB) {
    if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
      throw TypeError('Only instances of Mergeable can be merged')
    }

    return docA.clone().merge(docB)
  },

  Mergeable: Mergeable,

  MERGEABLE_MARKER,

  _mergeFunction: mergeFunction,

  _converter: converter
}
