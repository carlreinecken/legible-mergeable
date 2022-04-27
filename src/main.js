import * as util from './util.js'
import * as constants from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as apiFunctions from './api-functions.js'
import * as apiArrayFunctions from './api-array-functions.js'
import * as errors from './errors.js'

export default {
  ...constants,

  ...errors,

  merge (mergeableA, mergeableB) {
    if (!util.isObject(mergeableA) || !util.isObject(mergeableB)) {
      throw new errors.MergeableExpectedObjectError()
    }

    return mergeFunction(mergeableA, mergeableB).result
  },

  mergeOrFail (mergeableA, mergeableB) {
    if (!util.isObject(mergeableA) || !util.isObject(mergeableB)) {
      throw new errors.MergeableExpectedObjectError()
    }

    const { result, isIdentical } = mergeFunction(mergeableA, mergeableB)

    if (isIdentical) {
      throw new errors.MergeResultIdenticalError()
    }

    return result
  },

  mergeForDetails (mergeableA, mergeableB, options) {
    options = options || { includeRecoverOperation: false }
    options.detailed = true

    if (!util.isObject(mergeableA) || !util.isObject(mergeableB)) {
      throw new errors.MergeableExpectedObjectError()
    }

    return mergeFunction(mergeableA, mergeableB, options)
  },

  createProxy,

  ...apiFunctions,

  ...apiArrayFunctions
}
