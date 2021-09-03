import { MODIFICATIONS_KEY } from './constants'
import MergeableObject from './MergeableObject.class'
import mergeObject from './merge-object'

export default {
  Object (payload) {
    return MergeableObject.create(payload)
  },

  merge (stateA, stateB) {
    if (stateA instanceof MergeableObject && stateB instanceof MergeableObject) {
      return MergeableObject.merge(stateA, stateB)
    }
  },

  isObject (object) {
    return object instanceof MergeableObject
  },

  get _mergeFunction () {
    return { mergeObject }
  },

  get KEY () {
    return {
      MODIFICATIONS: MODIFICATIONS_KEY
    }
  }
}
