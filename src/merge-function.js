import * as util from './util'
import { MERGEABLE_MARKER as MARKER } from './constants'

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

  for (const prop of properties) {
    const aChangedAt = input.a.mods[prop] ? new Date(input.a.mods[prop]) : null
    const bChangedAt = input.b.mods[prop] ? new Date(input.b.mods[prop]) : null

    // console.log('mrgfn/loop', prop, aChangedAt, bChangedAt)

    // The property in A is newer
    if (aChangedAt > bChangedAt) {
      // if: a and b are Mergeables, they should be merged
      // else if: one property is a Mergeable:
      //   - if A (later) is the Mergeable, just take that
      //   - if B (earlier) is the Mergeable, i would need to recursively check
      //     whether the Mergeable has a later date anywhere in its nested props
      if (util.hasKey(input.a.state, prop)) {
        result[prop] = util.deepCopy(input.a.state[prop])
      } // else: The property was deleted

      result[MARKER][prop] = input.a.mods[prop]

      continue
    }

    // The property in B is newer
    if (aChangedAt < bChangedAt) {
      if (util.hasKey(input.b.state, prop)) {
        result[prop] = util.deepCopy(input.b.state[prop])
      }

      result[MARKER][prop] = input.b.mods[prop]

      continue
    }

    // The modification date is on both sides the same
    if (util.hasKey(input.a.mods, prop)) {
      result[MARKER][prop] = input.a.mods[prop]
    }

    // Call the merge function recursively if both properties are Mergeables
    if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
      result[prop] = mergeFunction({
        a: input.a.state[prop],
        b: input.b.state[prop]
      })

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a.state, prop)) {
      result[prop] = util.deepCopy(input.a.state[prop])
    }
  }

  return result
}
