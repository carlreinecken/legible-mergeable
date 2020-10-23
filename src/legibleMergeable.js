import { MODIFICATIONS_KEY, POSITIONS_KEY } from './constants'
import MergeableObject from './MergeableObject.class'
import MergeableArray from './MergeableArray.class'
import mergeObject from './merge-object'
import mergeArray from './merge-array'
import positionFunctions from './position'

export default {
  Array (payload) {
    return MergeableArray.create(payload)
  },

  Object (payload) {
    return MergeableObject.create(payload)
  },

  merge (stateA, stateB) {
    if (stateA instanceof MergeableArray && stateB instanceof MergeableArray) {
      return MergeableArray.merge(stateA, stateB)
    } else if (stateA instanceof MergeableObject && stateB instanceof MergeableObject) {
      return MergeableObject.merge(stateA, stateB)
    }
  },

  get _mergeFunction () {
    return { mergeArray, mergeObject }
  },

  get _positionFunctions () {
    return positionFunctions
  },

  get KEY () {
    return {
      MODIFICATIONS: MODIFICATIONS_KEY,
      POSITIONS: POSITIONS_KEY
    }
  }
}
