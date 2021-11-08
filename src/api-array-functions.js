import * as util from './util.js'
import { MERGEABLE_MARKER, POSITION_KEY } from './constants.js'
import * as apiFunctions from './api-functions.js'
import * as positionFunctions from './position-functions.js'
import { KeyNotFoundInMergableError, PositionMissingInMergableError } from './errors.js'

/**
 * Transforms an `array` of objects to a mergeable. The elements are expected
 * to have the key for the mergeable preserved, the name can be defined by
 * `indexKey`. With the option `dropIndexKey` the key can be dropped if it only
 * was there temporarily. The mergeable will have no modifications set.
 */
export function fromArray (array, indexKey, options) {
  options = options || {}
  const dropIndexKey = options.dropIndexKey === true

  const mergeable = {}

  for (const element of array) {
    if (util.isObject(element) && !indexKey) {
      continue
    }

    const key = indexKey ? element[indexKey] : element
    mergeable[key] = element

    if (indexKey && dropIndexKey) {
      delete mergeable[key][indexKey]
    }
  }

  return mergeable
}

/**
 * Transforms the `mergeable` to an sorted array with its elements. The order
 * is defined by the positions of the elements. The position is expected to be
 * on the positionKey or fallbacks to the default. The marker is ignored, if
 * the mergeable should be rebuild later, the modifications need to be preserved
 * separately. The `indexKey` can be defined which preserves the key in the
 * element itself, otherwise the original mergeable can't be rebuild. This isn't
 * needed if the key is already inside the element.
 */
export function sorted (mergeable, options) {
  options = options || {}
  const indexKey = options.indexKey
  const positionKey = options.positionKey || POSITION_KEY

  const array = []

  for (const key in mergeable) {
    if (key === MERGEABLE_MARKER || !util.hasKey(mergeable, key)) {
      continue
    }

    const element = mergeable[key]

    if (indexKey) {
      element[indexKey] = key
    }

    array.push(element)
  }

  return sort(positionKey, array)
}

/**
 * Counts all elements of the mergeable and ignores the marker.
 */
export function size (mergeable) {
  let counter = 0

  for (const key in mergeable) {
    if (util.hasKey(mergeable, key) && key !== MERGEABLE_MARKER) {
      counter++
    }
  }

  return counter
}

/**
 * Filters the `mergeable` and returns an array of elements. It invokes for each
 * element the `callback` to only keep the elements, where a truthy value is
 * returned. The marker is skipped.
 * The `callback` is invoked with: (element, key, modification).
 */
export function filter (mergeable, callback) {
  const result = []

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    const modification = apiFunctions.modifications(mergeable)[key]

    if (!callback || callback(mergeable[key], key, modification)) {
      result.push(mergeable[key])
    }
  }

  return result
}

/**
 * Maps over `mergeable` by invoking for each element the `callback` and returns
 * an array of the return values of the callbacks. The marker is skipped.
 * The `callback` is invoked with: (element, key, modification).
 */
export function map (mergeable, callback) {
  const result = []

  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    const modification = apiFunctions.modifications(mergeable)[key]
    const evaluation = callback(mergeable[key], key, modification)

    result.push(evaluation)
  }

  return result
}

/**
 * Reduces the `mergeable` to a accumulated value by invoking for each element
 * the `callback`. If `accumulator` is not given, any element of `mergeable` is
 * used as the initial value. The marker is skipped.
 * The `callback` is invoked with: (accumulator, element, key, modification).
 */
export function reduce (mergeable, callback, accumulator) {
  for (const key in mergeable) {
    if (!util.hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
      continue
    }

    if (accumulator == null) {
      accumulator = mergeable[key]
    }

    const modification = apiFunctions.modifications(mergeable)[key]
    accumulator = callback(accumulator, mergeable[key], key, modification)
  }

  return accumulator
}

/**
 * Returns the element with the lowest position. The position of the elements
 * is expected to be under the name given in the option `positionKey` or
 * it fallbacks to the default.
 */
export function first (mergeable, options) {
  options = options || {}
  const positionKey = options.positionKey || POSITION_KEY

  return reduce(mergeable, (accumulator, element) => {
    if (element[positionKey] == null) {
      return accumulator
    }

    const smallerStays = positionFunctions.compare(accumulator[positionKey], element[positionKey]) === -1
    return smallerStays ? accumulator : element
  })
}

/**
 * Returns the element with the highest position. The position of the elements
 * is expected to be under the name given in the option `positionKey` or
 * it fallbacks to the default.
 */
export function last (mergeable, options) {
  options = options || {}
  const positionKey = options.positionKey || POSITION_KEY

  return reduce(mergeable, (accumulator, element) => {
    if (element[positionKey] == null) {
      return accumulator
    }

    const highestStays = positionFunctions.compare(accumulator[positionKey], element[positionKey]) === 1
    return highestStays ? accumulator : element
  })
}

/**
 * Generates a position on the mergeable element with the given key. The
 * new position is located after the element of `afterKey` and before the
 * element after it. If `afterKey` is `null`, the element is set to
 * the beginning. The positions are expected to be under the name given in the
 * option `positionKey` or it fallbacks to the default.
 */
export function move (mergeable, key, afterKey, options) {
  options = options || {}
  const positionKey = options.positionKey || POSITION_KEY

  let afterPosition = null

  if (afterKey != null) {
    if (!util.hasKey(mergeable, afterKey)) {
      throw new KeyNotFoundInMergableError({ key: afterKey })
    }

    afterPosition = mergeable[afterKey][positionKey]
  }

  const currentPosition = mergeable[key][positionKey]
  const allPositions = getAllPositionsExcept(mergeable, currentPosition, positionKey)

  const beforePosition = positionFunctions.next(allPositions, afterPosition || [])
  const position = positionFunctions.generate(afterPosition, beforePosition)

  apiFunctions.set(mergeable[key], positionKey, position, options)
}

/**
 * Generates new positions for all elements in the mergeable. The positions are
 * expected to be under the name given in the option `positionKey` or it
 * fallbacks to the default.
 *
 * @todo
 */
export function reposition (mergeable, key, options) {
  // options = options || {}
  // const positionKey = options.positionKey || POSITION_KEY
  // TODO: implement reposition()
}

/**
 * Generates a position on the mergeable element with the given key, which will
 * be located after the highest position. The positions are expected to be under
 * the name given in the option `positionKey` or it fallbacks to the default.
 */
export function push (mergeable, key, options) {
  options = options || {}
  const positionKey = options.positionKey || POSITION_KEY

  const lastElement = last(mergeable, options)
  const afterPosition = lastElement[positionKey]
  const position = positionFunctions.generate(afterPosition, null)

  apiFunctions.set(mergeable[key], positionKey, position, options)
}

/**
 * This function does not exist (yet), because with
 * `move(mergeable, key, null)` the same is achievable.
 */
// function unshift () {}

/* =================== NOT EXPORTED FUNCTIONS =================== */

function sort (positionKey, array) {
  return array.sort((a, b) => {
    if (!util.hasKey(a, positionKey) || !util.hasKey(b, positionKey)) {
      throw new PositionMissingInMergableError({ positionKey })
    }

    return positionFunctions.compare(a[positionKey], b[positionKey])
  })
}

function getAllPositionsExcept (mergeable, excludedPosition, positionKey) {
  return map(mergeable, property => property[positionKey])
    .filter(position => {
      // Include all positions if no current position is set
      if (position && !excludedPosition) {
        return true
      }

      // Exclude the current position
      if (excludedPosition && position && position.toString() !== excludedPosition.toString()) {
        return true
      }

      return false
    })
}
