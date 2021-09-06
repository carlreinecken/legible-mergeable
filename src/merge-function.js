import * as util from './util'

export default function mergeFunction ({ a: docA, b: docB }, modificationsKey) {
  function isPropertyMergeable (property) {
    return util.isObject(property) && util.isObject(property[modificationsKey])
  }

  const input = {
    a: { state: docA.state, mods: docA[modificationsKey] },
    b: { state: docB.state, mods: docB[modificationsKey] }
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
      // console.log('attention! merging nested properties!', prop)
      result.state[prop] = mergeFunction({
        a: { state: input.a.state[prop].state, [modificationsKey]: input.a.state[prop][modificationsKey] },
        b: { state: input.b.state[prop].state, [modificationsKey]: input.b.state[prop][modificationsKey] }
      }, modificationsKey)

      continue
    }

    // console.log('doing nuffing', prop, input.a.state[prop])

    // The property is on both sides the same
    if (util.hasKey(input.a.state, prop)) {
      result.state[prop] = util.deepCopy(input.a.state[prop])
    }
  }

  result[modificationsKey] = result.mods

  delete result.mods

  return result
}
