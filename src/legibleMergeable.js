import { MERGEABLE_MARKER } from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as mergeableFunctions from './mergeable-functions.js'

export default {
  merge (mergeableA, mergeableB) {
    return mergeFunction({ a: mergeableA, b: mergeableB })
  },

  MERGEABLE_MARKER,

  createProxy (mergeable, options) {
    return createProxy(mergeable, options)
  },

  ...mergeableFunctions
}
