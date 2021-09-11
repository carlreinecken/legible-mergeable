import * as util from './util'
import { MERGEABLE_MARKER as MARKER } from './constants'

export function mergeFunction ({ a: docA, b: docB }) {
  function isPropertyMergeable (property) {
    return util.isObject(property) && util.isObject(property[MARKER])
  }

  const input = {
    a: { state: docA.state, mods: docA[MARKER] },
    b: { state: docB.state, mods: docB[MARKER] }
  }

  const result = { state: {}, mods: {} }

  const properties = util.uniquenizeArray([].concat(
    Object.keys(input.a.state),
    Object.keys(input.a.mods),
    Object.keys(input.b.state),
    Object.keys(input.b.mods)
  ))

  for (const prop of properties) {
    const aChangedAt = input.a.mods[prop] ? new Date(input.a.mods[prop]) : null
    const bChangedAt = input.b.mods[prop] ? new Date(input.b.mods[prop]) : null

    // The property in A is newer
    if (aChangedAt > bChangedAt) {
      // if: a and b are Mergeables, they should be merged
      // else if: one property is a Mergeable:
      //   - if A (later) is the Mergeable, just take that
      //   - if B (earlier) is the Mergeable, i would need to recursively check
      //     whether the Mergeable has a later date anywhere in its nested props
      if (util.hasKey(input.a.state, prop)) {
        result.state[prop] = util.deepCopy(input.a.state[prop])
      } // else: The property was deleted

      result.mods[prop] = input.a.mods[prop]

      continue
    }

    // The property in B is newer
    if (aChangedAt < bChangedAt) {
      if (util.hasKey(input.b.state, prop)) {
        result.state[prop] = util.deepCopy(input.b.state[prop])
      }

      result.mods[prop] = input.b.mods[prop]

      continue
    }

    // The modification date is on both sides the same
    if (util.hasKey(input.a.mods, prop)) {
      result.mods[prop] = input.a.mods[prop]
    }

    // Call the merge function recursively if both properties are Mergeables
    if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
      result.state[prop] = mergeFunction({
        a: { state: input.a.state[prop].state, [MARKER]: input.a.state[prop][MARKER] },
        b: { state: input.b.state[prop].state, [MARKER]: input.b.state[prop][MARKER] }
      })

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a.state, prop)) {
      result.state[prop] = util.deepCopy(input.a.state[prop])
    }
  }

  result[MARKER] = result.mods

  delete result.mods

  return result
}
