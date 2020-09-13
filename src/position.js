import { DEFAULT_MAX_POSITION, DEFAULT_MIN_POSITION } from './constants'

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

function randomIntBetween (min, max) {
  return Math.floor(Math.random() * (max - (min + 1))) + min + 1
}

function generate (prevPos, nextPos) {
  // should not use 000 or zzz
  console.log(prevPos, nextPos)
  console.log(DEFAULT_MIN_POSITION, DEFAULT_MAX_POSITION, encodeBase36)

  // 333, 543
  const prevPosHead = prevPos[0]
  const nextPosHead = nextPos[0]

  const diff = Math.abs(prevPosHead - nextPosHead)
  const third = Math.floor(diff * 0.3)
  const result = randomIntBetween(prevPosHead + third, nextPosHead - third)

  // while () {
  //   if (diff < 300) {
  //     // add a second identifier
  //   }
  // }
}

export function generatePosition (prevPos, nextPos) {
  const prevPosInt = decodeBase36Array(prevPos)
  const nextPosInt = decodeBase36Array(nextPos)

  generate(prevPosInt, nextPosInt)
}

export function comparePositions (a, b) {
  compare(decodeBase36Array(a), decodeBase36Array(b))
}

function compare (a, b) {
  const next = x => x.length > 1 ? x.slice(1) : ['0']
  const diff = a - b

  if (diff === 0 && (a.length > 1 || b.length > 1)) {
    return comparePositions(next(a), next(b))
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
