import { MERGEABLE_MARKER, MERGE_HAD_NO_DIFFERENCES_ERROR } from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as mergeableFunctions from './api.js'

export default {
  MERGEABLE_MARKER,
  MERGE_HAD_NO_DIFFERENCES_ERROR,

  merge (mergeableA, mergeableB, options) {
    options = options || {}

    return mergeFunction({ a: mergeableA, b: mergeableB, failIfSame: options.failIfSame })
  },

  createProxy,

  ...mergeableFunctions
}
