import * as constants from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as apiFunctions from './api-functions.js'
import * as apiArrayFunctions from './api-array-functions.js'

export default {
  ...constants,

  merge (mergeableA, mergeableB) {
    return mergeFunction(mergeableA, mergeableB).result
  },

  mergeOrFail (mergeableA, mergeableB) {
    const { result, isIdentical } = mergeFunction(mergeableA, mergeableB)

    if (isIdentical) {
      throw new Error(constants.MERGE_RESULT_IS_IDENTICAL)
    }

    return result
  },

  createProxy,

  ...apiFunctions,

  ...apiArrayFunctions
}
