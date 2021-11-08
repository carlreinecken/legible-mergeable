import { PositionHasNoRoomError } from './errors.js'
import * as util from './util.js'

export const MAX_SIZE = maxSizeAtDepth(0)
export const MIN_SIZE = 0
export const SAFE_ZONE = Math.pow(2, 10)
const SAFE_ZONE_BORDER_BUFFER_FACTOR = 0.25
const SAFE_ZONE_SPACE_BUFFER_FACTOR = 0.75

export function maxSizeAtDepth (depth) {
  // The MAX SIZE increases exponentially with every additional level of depth
  return Math.pow(2, 15 + depth)
}

export function generate (previous, next, depth) {
  depth = depth || 0
  previous = previous || [MIN_SIZE]
  next = next || [maxSizeAtDepth(depth)]

  const compared = compare(previous, next)

  if (previous.length > 0 && next.length > 0 && compared === 0) {
    throw new PositionHasNoRoomError()
  }

  // In depth 0 compare the positions and switch them if necessary (previous should be smaller)
  if (compared === 1 && depth === 0) {
    [previous, next] = util.swap(previous, next)
  }

  const previousHead = (previous.length > 0) ? previous[0] : MIN_SIZE
  const nextHead = (next.length > 0) ? next[0] : maxSizeAtDepth(depth)

  const diff = Math.abs(previousHead - nextHead)

  // If the zone size is not big enough, it creates a new depth level
  if (diff < SAFE_ZONE) {
    const headsAreSame = previousHead === nextHead

    // If the heads are different the next depth does not need to consider
    // the other segments of the nextPosition. E.g. [0,6] & [1,4] should
    // generate a number between [0,6]-[0,MAX] not between [0,4]-[0,8].
    next = headsAreSame ? next.slice(1) : []
    previous = previous.slice(1)

    const generatedSegments = generate(previous, next, depth + 1)

    return [previousHead, ...generatedSegments]
  }

  let min, max

  // The boundary allocation strategy is decided by the eveness of the depth.
  // It creates a safe zone either from the left or right boundary. The safe
  // zone is further narrowed down by 25% from the start and 25% to the end
  // of the safe zone.
  if (depth % 2 === 0) {
    // If the depth is even, it will insert at the left side of the sequence.
    min = previousHead + SAFE_ZONE * SAFE_ZONE_BORDER_BUFFER_FACTOR
    max = previousHead + SAFE_ZONE * SAFE_ZONE_SPACE_BUFFER_FACTOR
  } else {
    // If the depth is odd, it will insert at the right side of the sequence.
    min = nextHead - SAFE_ZONE * SAFE_ZONE_SPACE_BUFFER_FACTOR
    max = nextHead - SAFE_ZONE * SAFE_ZONE_BORDER_BUFFER_FACTOR
  }

  return [util.randomInt(min, max)]
}

export function compare (a, b) {
  const next = x => x.length > 1 ? x.slice(1) : [MIN_SIZE]
  const diff = (a[0] || 0) - (b[0] || 0)

  if (diff === 0 && (a.length > 1 || b.length > 1)) {
    return compare(next(a), next(b))
  } else if (diff > 0) {
    return 1
  } else if (diff < 0) {
    return -1
  }

  return 0
}

// TODO: this function is not used at the moment. so it should be removed.
export function previous (positions, positionMark) {
  let result = [MIN_SIZE]

  for (const cursor of positions) {
    const cursorIsLessThanMark = compare(cursor, positionMark) === -1
    const cursorIsBiggerThanResult = compare(cursor, result) === 1

    if (cursorIsLessThanMark && cursorIsBiggerThanResult) {
      result = cursor
    }
  }

  return result
}

export function next (positions, positionMark) {
  let result = [MAX_SIZE]

  for (const cursor of positions) {
    const cursorIsBiggerThanMark = compare(cursor, positionMark) === 1
    const cursorIsLessThanResult = compare(cursor, result) === -1

    if (cursorIsBiggerThanMark && cursorIsLessThanResult) {
      result = cursor
    }
  }

  return result
}
