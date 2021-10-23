import * as constants from './constants.js'
import { mergeFunction } from './merge-function.js'
import { createProxy } from './proxy.js'
import * as apiFunctions from './api-functions.js'
import * as apiArrayFunctions from './api-array-functions.js'

export default {
  ...constants,

  merge (mergeableA, mergeableB) {
    return mergeFunction(mergeableA, mergeableB)
  },

  mergeOrFail (mergeableA, mergeableB) {
    return mergeFunction(mergeableA, mergeableB, true)
  },

  createProxy,

  ...apiFunctions,

  ...apiArrayFunctions
}
