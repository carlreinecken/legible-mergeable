import { MODIFICATIONS_KEY, POSITIONS_KEY } from './constants'
import mergeableObject from './object'
import mergeableArray from './array'
import mergeObject from './merge-object'
import mergeArray from './merge-array'

export default {
  Array (payload) {
    return mergeableArray.create(payload)
  },

  Object (payload) {
    return mergeableObject.create(payload)
  },

  merge (stateA, stateB) {
    if (stateA instanceof mergeableArray && stateB instanceof mergeableArray) {
      return mergeableArray.merge(stateA, stateB)
    } else if (stateA instanceof mergeableObject && stateB instanceof mergeableObject) {
      return mergeableObject.merge(stateA, stateB)
    }
  },

  get _mergeFunction () {
    return { mergeArray, mergeObject }
  },

  get KEY () {
    return {
      MODIFICATIONS: MODIFICATIONS_KEY,
      POSITIONS: POSITIONS_KEY
    }
  }
}
