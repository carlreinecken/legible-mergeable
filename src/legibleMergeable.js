import mergeFunction from './merge-function'
import {
  Mergeable,
  createMergeableFromDump,
  createMergeableFromIsolatedDump,
  isolatedDump,
  transformDump
} from './Mergeable.class'

export { mergeFunction, Mergeable }

export const legibleMergeable = {
  create (dump) {
    return createMergeableFromDump(dump || {})
  },

  merge (docA, docB) {
    if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
      throw TypeError('Only instances of Mergeable can be merged')
    }

    const result = mergeFunction({
      a: isolatedDump(docA), b: isolatedDump(docB)
    }, Mergeable.MODIFICATIONS_KEY)

    return new Mergeable(
      transformDump(result.state, property => createMergeableFromIsolatedDump(property)),
      result[Mergeable.MODIFICATIONS_KEY]
    )
  }
}
