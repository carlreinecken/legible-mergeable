import {
  POSITION_DEFAULT_MAX,
  POSITION_DEFAULT_MIN,
  POSITION_INNER_RANGE_SIZE,
  POSITION_IDENTIFIER_SEPARATOR
} from './constants'
import LegibleMergeableError from './LegibleMergeableError'

function generate (prevPos, nextPos) {
  prevPos = prevPos || []
  nextPos = nextPos || []

  if (prevPos.length > 0 && nextPos.length > 0 && compare(prevPos, nextPos) === 0) {
    throw new LegibleMergeableError('Could not generate new position, no space available.')
  }

  const prevPosHead = prevPos[0] || POSITION_DEFAULT_MIN
  const nextPosHead = nextPos[0] || POSITION_DEFAULT_MAX

  const diff = Math.abs(prevPosHead - nextPosHead)
  let newPos = [prevPosHead]

  if (diff < POSITION_INNER_RANGE_SIZE * 2) {
    newPos = newPos.concat(generate(prevPos.slice(1), nextPos.slice(1)))
  } else {
    let min = prevPosHead + POSITION_INNER_RANGE_SIZE * 0.5
    let max = prevPosHead + POSITION_INNER_RANGE_SIZE * 1.5

    if (min > max) {
      const temp = min
      min = max
      max = temp
    }

    newPos[0] = Math.floor(Math.random() * (max - (min + 1))) + min + 1
  }

  return newPos
}

function compare (a, b) {
  const next = x => x.length > 1 ? x.slice(1) : [POSITION_DEFAULT_MIN]
  const diff = a[0] - b[0]

  if (diff === 0 && (a.length > 1 || b.length > 1)) {
    return compare(next(a), next(b))
  } else if (diff > 0) {
    return 1
  } else if (diff < 0) {
    return -1
  }

  return 0
}

function decodeBase36 (object) {
  const result = {}
  for (const [key, list] of Object.entries(object)) {
    result[key] = list
      .split(POSITION_IDENTIFIER_SEPARATOR)
      .map(string => parseInt(string, 36))
  }
  return result
}

function encodeToBase36 (object) {
  const result = {}
  for (const [key, list] of Object.entries(object)) {
    result[key] = list
      .map(number => number.toString(36))
      .join(POSITION_IDENTIFIER_SEPARATOR)
  }
  return result
}

export default {
  generate,
  compare,
  decodeBase36,
  encodeToBase36
}
