import util from './util'

export default function merge (stateA, modificationsA, stateB, modificationsB) {
  const modifications = { a: modificationsA, b: modificationsB, result: {} }
  const state = { a: stateA, b: stateB, result: {} }

  const properties = util.uniquenizeArray([].concat(
    Object.keys(state.a),
    Object.keys(modifications.a),
    Object.keys(state.b),
    Object.keys(modifications.b)
  ))

  for (const prop of properties) {
    const aChangedAt = modifications.a[prop] ? new Date(modifications.a[prop]) : null
    const bChangedAt = modifications.b[prop] ? new Date(modifications.b[prop]) : null

    if (aChangedAt > bChangedAt) {
      if (util.hasKey(state.a, prop)) {
        state.result[prop] = state.a[prop]
      }

      modifications.result[prop] = aChangedAt

      continue
    }

    if (aChangedAt < bChangedAt) {
      if (util.hasKey(state.b, prop)) {
        state.result[prop] = state.b[prop]
      }

      modifications.result[prop] = bChangedAt

      continue
    }

    if (util.hasKey(state.a, prop)) {
      state.result[prop] = state.a[prop]
    } else if (util.hasKey(state.b, prop)) {
      state.result[prop] = state.b[prop]
    }

    if (util.hasKey(modifications.result, prop)) {
      continue
    }

    if (util.hasKey(modifications.a, prop)) {
      modifications.result[prop] = aChangedAt
    } else if (util.hasKey(modifications.b, prop)) {
      modifications.result[prop] = bChangedAt
    }
  }

  return { state: state.result, modifications: modifications.result }
}
