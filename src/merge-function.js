import * as util from './util'
import * as converter from './converter'

function isMergeable (property) {
  return util.isObject(property) && property.__isMergeable === true
}

export function mergeFunction (input) {
  const modifications = {}
  const state = {}

  const properties = util.uniquenizeArray([].concat(
    Object.keys(input.a._state),
    Object.keys(input.a._modifications),
    Object.keys(input.b._state),
    Object.keys(input.b._modifications)
  ))

  for (const prop of properties) {
    const aChangedAt = input.a._modifications[prop] ? new Date(input.a._modifications[prop]) : null
    const bChangedAt = input.b._modifications[prop] ? new Date(input.b._modifications[prop]) : null

    // The property in A is newer
    if (aChangedAt > bChangedAt) {
      if (util.hasKey(input.a._state, prop)) {
        if (typeof input.a._state[prop] !== 'object') {
          state[prop] = input.a._state[prop]
        } else if (input.a._state[prop].__isMergeable === true) {
          // TODO: mergeable should be cloned
          // state[prop] = input.a._state[prop]
          state[prop] = converter.fromTransfer(input.a._state[prop], property => property)
        } else {
          state[prop] = util.deepCopy(input.a._state[prop])
        }
      } // else: The property was deleted

      modifications[prop] = input.a._modifications[prop]

      continue
    }

    // The property in B is newer
    if (aChangedAt < bChangedAt) {
      if (util.hasKey(input.b._state, prop)) {
        if (typeof input.b._state[prop] !== 'object') {
          state[prop] = input.b._state[prop]
        } else if (input.b._state[prop].__isMergeable === true) {
          // state[prop] = input.b._state[prop]
          state[prop] = converter.fromTransfer(input.b._state[prop], property => property)
        } else {
          state[prop] = util.deepCopy(input.b._state[prop])
        }
      }

      modifications[prop] = input.b._modifications[prop]

      continue
    }

    // The modification date is on both sides the same
    if (util.hasKey(input.a._modifications, prop)) {
      modifications[prop] = input.a._modifications[prop]
    }

    // Call the merge function recursively if both properties are Mergeables
    if (isMergeable(input.a._state[prop]) && isMergeable(input.b._state[prop])) {
      state[prop] = mergeFunction({
        a: input.a._state[prop],
        b: input.b._state[prop]
      })

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a._state, prop)) {
      state[prop] = util.deepCopy(input.a._state[prop])
    }
  }

  return converter.createTransferObject(state, modifications)
}
