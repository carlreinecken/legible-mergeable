import { AbstractMergeable } from './AbstractMergeable.class'
import { transformInternalState } from './transformers'

export function mapMergeableToMergeObject (doc) {
  return {
    state: transformInternalState(doc._state, property => mapMergeableToMergeObject(property)),
    [AbstractMergeable.MODIFICATIONS_KEY]: doc._modifications
  }
}
