import * as util from './util'

function isPropertyMergeable (property) {
  return util.isObject(property) && util.isObject(property.modifications)
}

export default function mergeFunction (stateA, modificationsA, stateB, modificationsB) {
  const input = {
    a: { state: stateA, modifications: modificationsA },
    b: { state: stateB, modifications: modificationsB }
  }

  const result = { state: {}, modifications: {} }

  const properties = util.uniquenizeArray([].concat(
    Object.keys(input.a.state),
    Object.keys(input.a.modifications),
    Object.keys(input.b.state),
    Object.keys(input.b.modifications)
  ))

  for (const prop of properties) {
    const aChangedAt = input.a.modifications[prop] ? new Date(input.a.modifications[prop]) : null
    const bChangedAt = input.b.modifications[prop] ? new Date(input.b.modifications[prop]) : null

    // The property in A is newer
    if (aChangedAt > bChangedAt) {
      if (util.hasKey(input.a.state, prop)) {
        result.state[prop] = input.a.state[prop]
      }

      result.modifications[prop] = input.a.modifications[prop]

      continue
    }

    // The property in B is newer
    if (aChangedAt < bChangedAt) {
      if (util.hasKey(input.b.state, prop)) {
        result.state[prop] = input.b.state[prop]
      }

      result.modifications[prop] = input.b.modifications[prop]

      continue
    }

    // The modification date is on both sides the same
    if (util.hasKey(input.a.modifications, prop)) {
      result.modifications[prop] = input.a.modifications[prop]
    }

    // Call the merge function recursively if both properties are mergeables
    if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
      result.state[prop] = mergeFunction(
        input.a.state[prop].state,
        input.a.state[prop].modifications,
        input.b.state[prop].state,
        input.b.state[prop].modifications
      )

      continue
    }

    // The property is on both sides the same
    if (util.hasKey(input.a.state, prop)) {
      result.state[prop] = input.a.state[prop]
    }
  }

  return result
}
