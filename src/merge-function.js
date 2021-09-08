import * as util from './util'
import { AbstractMergeable } from './AbstractMergeable.class'

const MOD_KEY = AbstractMergeable.MODIFICATIONS_KEY

export function mergeFunction ({ a: docA, b: docB }) {
  function isPropertyMergeable (property) {
    return util.isObject(property) && util.isObject(property[MOD_KEY])
  }

  const input = {
    a: { state: docA.state, mods: docA[MOD_KEY] },
    b: { state: docB.state, mods: docB[MOD_KEY] }
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
      if (util.hasKey(input.a.state, prop)) {
        result.state[prop] = util.deepCopy(input.a.state[prop])
      }

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

    // Call the merge function recursively if both properties are mergeables
    if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
      result.state[prop] = mergeFunction({
        a: { state: input.a.state[prop].state, [MOD_KEY]: input.a.state[prop][MOD_KEY] },
        b: { state: input.b.state[prop].state, [MOD_KEY]: input.b.state[prop][MOD_KEY] }
      })

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a.state, prop)) {
      result.state[prop] = util.deepCopy(input.a.state[prop])
    }
  }

  result[MOD_KEY] = result.mods

  delete result.mods

  return result
}
