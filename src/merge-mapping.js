import { MERGEABLE_MARKER } from './constants'
import { transformInternalState } from './transformers'

export function mapMergeableToMergeObject (doc, Mergeable) {
  return {
    state: transformInternalState(
      doc._state,
      property => mapMergeableToMergeObject(property, Mergeable),
      Mergeable
    ),
    [MERGEABLE_MARKER]: doc._modifications
  }
}
