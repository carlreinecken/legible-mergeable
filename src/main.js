import * as util from './util.js'
import * as constants from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as apiFunctions from './api-functions.js'
import * as apiArrayFunctions from './api-array-functions.js'

export default {
  ...constants,

  merge (mergeableA, mergeableB) {
    if (!util.isObject(mergeableA) || !util.isObject(mergeableB)) {
      throw new TypeError(constants.WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
    }

    return mergeFunction(mergeableA, mergeableB).result
  },

  mergeOrFail (mergeableA, mergeableB) {
    if (!util.isObject(mergeableA) || !util.isObject(mergeableB)) {
      throw new TypeError(constants.WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
    }

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
