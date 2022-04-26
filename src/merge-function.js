import * as util from './util.js'
import { MERGEABLE_MARKER as MARKER } from './constants.js'
import { clone as cloneMergeable } from './api-functions.js'

function isPropertyMergeable (property) {
  return util.isObject(property) && util.hasMarker(property)
}

function stateWithoutMarker (state) {
  const result = { ...state }
  delete result[MARKER]

  return result
}

function setModification (resultRef, key, mods) {
  resultRef[MARKER][key] = mods[key]
}

function setProperty (resultRef, key, state) {
  if (util.hasKey(state, key)) {
    if (isPropertyMergeable(state[key])) {
      resultRef[key] = cloneMergeable(state[key])
    } else {
      resultRef[key] = util.deepCopy(state[key])
    }
  } else {
    // The property was deleted
  }
}

export function mergeFunction (docA, docB) {
  let isIdentical = true

  const input = {
    a: { state: stateWithoutMarker(docA), mods: docA[MARKER] || {} },
    b: { state: stateWithoutMarker(docB), mods: docB[MARKER] || {} }
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

    if (aChangedAt > bChangedAt) {
      // The property in A is newer
      setModification(result, key, input.a.mods)
      setProperty(result, key, input.a.state)

      isIdentical = false

      continue
    }

    if (aChangedAt < bChangedAt) {
      // The property in B is newer
      setModification(result, key, input.b.mods)
      setProperty(result, key, input.b.state)

      isIdentical = false

      continue
    }

    if (util.hasKey(input.a.mods, key)) {
      // The modification date is on both sides the same
      setModification(result, key, input.a.mods)
    }

    // Call the merge function recursively if both properties are Mergeables
    if (isPropertyMergeable(input.a.state[key]) && isPropertyMergeable(input.b.state[key])) {
      const property = mergeFunction(input.a.state[key], input.b.state[key])

      result[key] = property.result

      isIdentical = isIdentical && property.isIdentical

      continue
    }

    if (util.hasKey(input.a.state, key)) {
      // The property should be the same on both sides
      result[key] = util.deepCopy(input.a.state[key])
    } else {
      // The property was deleted on both sides
    }
  }

  return { result, isIdentical }
}
