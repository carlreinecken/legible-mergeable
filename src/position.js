import {
  DEFAULT_MAX_POSITION,
  DEFAULT_MIN_POSITION,
  THRESHOLD_NEW_POSITION_DEPTH
} from './constants'
import LegibleMergeableError from './LegibleMergeableError'

/* How Positions are generated and compared
 *
 * Based on CRDT LOGOOT sequence algorithm.
 * Numbers are encoded in base36 to save character space.
 *
 *    // identifiers: A < B < C
 *    { A: [1], B: [1, 5], C: [2] }
 *
 *    // identifiers with a random "unique" number encoded in base36
 *    { A: ['a4'], B: ['a4'], ['n1'], C: ['a5'] }
 */

const encodeBase36 = (number) => number.toString(36)
const decodeBase36 = (string) => parseInt(string, 36)
const decodeBase36Array = (list) => list.map(value => decodeBase36(value))
const encodeBase36Array = (list) => list.map(value => encodeBase36(value))

// function randomIntBetween (min, max) {
//   return Math.floor(Math.random() * (max - (min + 1))) + min + 1
// }

function randomIntInMiddleThirdBetween (min, max) {
  const diff = Math.abs(min - max)
  const third = Math.floor(diff * 0.3)
  min = min + third
  const result = Math.floor(Math.random() * ((max - third) - (min + 1))) + min + 1
  return result
}

function generate (prevPos, nextPos) {
  console.log('generate()', prevPos, nextPos)

  if (compare(prevPos, nextPos) === 0) {
    throw new LegibleMergeableError('Could not generate new position, no space available.')
  }

  const prevPosHead = prevPos[0]
  const nextPosHead = nextPos[0]

  const diff = Math.abs(prevPosHead - nextPosHead)
  const newPos = [prevPosHead]

  if (diff < THRESHOLD_NEW_POSITION_DEPTH) {
    newPos.push(randomIntInMiddleThirdBetween(DEFAULT_MIN_POSITION, DEFAULT_MAX_POSITION))
  } else {
    newPos[0] = randomIntInMiddleThirdBetween(prevPosHead, nextPosHead)
  }

  return encodeBase36Array(newPos)
}

function generatePosition (prevPos, nextPos) {
  console.log(prevPos, nextPos)
  const prevPosInt = decodeBase36Array(prevPos)
  const nextPosInt = decodeBase36Array(nextPos)

  return generate(prevPosInt, nextPosInt)
}

function comparePositions (a, b) {
  return compare(decodeBase36Array(a), decodeBase36Array(b))
}

function compare (a, b) {
  const next = x => x.length > 1 ? x.slice(1) : [DEFAULT_MIN_POSITION]
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

export default {
  generatePosition,
  comparePositions
}
