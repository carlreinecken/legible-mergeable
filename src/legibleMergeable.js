import * as util from './util'
import mergeFunction from './merge-function'
import { Mergeable, splitIntoStateAndModifications } from './Mergeable.class'

export { mergeFunction, Mergeable }

export const legibleMergeable = {
  create (dump) {
    const { state, modifications } = splitIntoStateAndModifications(dump || {})

    return new Mergeable(state, modifications)
  },

  merge (docA, docB) {
    if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
      throw TypeError('One argument is not an instance of Mergeable')
    }

    const result = mergeFunction(docA._state, docA._modifications, docB._state, docB._modifications)

    return new Mergeable(util.deepCopy(result.state), result.modifications)
  }
}
