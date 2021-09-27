import * as util from './util.js'
import { MERGEABLE_MARKER as MARKER } from './constants.js'

function isPropertyMergeable (property) {
  return util.isObject(property) && util.hasMarker(property)
}

function stateWithoutMarker (state) {
  const result = { ...state }
  delete result[MARKER]

  return result
}

export function mergeFunction ({ a: docA, b: docB }) {
  const input = {
    a: { state: stateWithoutMarker(docA), mods: docA[MARKER] },
    b: { state: stateWithoutMarker(docB), mods: docB[MARKER] }
  }

  const result = { [MARKER]: {} }

  const properties = util.uniquenizeArray([].concat(
    Object.keys(input.a.state),
    Object.keys(input.a.mods),
    Object.keys(input.b.state),
    Object.keys(input.b.mods)
  ))

  for (const key of properties) {
    const aChangedAt = input.a.mods[key] ? new Date(input.a.mods[key]) : null
    const bChangedAt = input.b.mods[key] ? new Date(input.b.mods[key]) : null

    // The property in A is newer
    if (aChangedAt > bChangedAt) {
      // if: a and b are Mergeables, they should be merged
      // else if: one property is a Mergeable:
      //   - if A (later) is the Mergeable, just take that
      //   - if B (earlier) is the Mergeable, i would need to recursively check
      //     whether the Mergeable has a later date anywhere in its nested props
      if (util.hasKey(input.a.state, key)) {
        result[key] = util.deepCopy(input.a.state[key])
      } // else: The property was deleted

      result[MARKER][key] = input.a.mods[key]

      continue
    }

    // The property in B is newer
    if (aChangedAt < bChangedAt) {
      if (util.hasKey(input.b.state, key)) {
        result[key] = util.deepCopy(input.b.state[key])
      }

      result[MARKER][key] = input.b.mods[key]

      continue
    }

    // The modification date is on both sides the same
    if (util.hasKey(input.a.mods, key)) {
      result[MARKER][key] = input.a.mods[key]
    }

    // Call the merge function recursively if both properties are Mergeables
    if (isPropertyMergeable(input.a.state[key]) && isPropertyMergeable(input.b.state[key])) {
      result[key] = mergeFunction({
        a: input.a.state[key],
        b: input.b.state[key]
      })

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a.state, key)) {
      result[key] = util.deepCopy(input.a.state[key])
    }
  }

  return result
}
