import { MERGEABLE_MARKER, MERGE_HAD_NO_DIFFERENCES_ERROR } from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as mergeableFunctions from './api.js'

export default {
  MERGEABLE_MARKER,
  MERGE_HAD_NO_DIFFERENCES_ERROR,

  merge (mergeableA, mergeableB) {
    return mergeFunction(mergeableA, mergeableB)
  },

  mergeOrFail (mergeableA, mergeableB) {
    return mergeFunction(mergeableA, mergeableB, true)
  },

  createProxy,

  ...mergeableFunctions
}
