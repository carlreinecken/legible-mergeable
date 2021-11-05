import { POSITION } from './constants.js'

export function generate (prevPos, nextPos) {
  prevPos = prevPos || []
  nextPos = nextPos || []

  if (prevPos.length > 0 && nextPos.length > 0 && compare(prevPos, nextPos) === 0) {
    throw new Error('Could not generate new position, no space available.')
  }

  const prevPosHead = (prevPos.length > 0) ? prevPos[0] : POSITION.DEFAULT_MIN
  const nextPosHead = (nextPos.length > 0) ? nextPos[0] : POSITION.DEFAULT_MAX

  const diff = Math.abs(prevPosHead - nextPosHead)
  let newPos = [prevPosHead]

  if (diff < POSITION.INNER_RANGE_SIZE * 2) {
    newPos = newPos.concat(generate(prevPos.slice(1), nextPos.slice(1)))
  } else {
    let min = prevPosHead + POSITION.INNER_RANGE_SIZE * 0.5
    let max = prevPosHead + POSITION.INNER_RANGE_SIZE * 1.5

    if (min > max) {
      const temp = min
      min = max
      max = temp
    }

    newPos[0] = Math.floor(Math.random() * (max - (min + 1))) + min + 1
  }

  return newPos
}

export function compare (a, b) {
  const next = x => x.length > 1 ? x.slice(1) : [POSITION.DEFAULT_MIN]
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

export function previous (positions, positionMark) {
  let result = [POSITION.DEFAULT_MIN]

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
  let result = [POSITION.DEFAULT_MAX]

  for (const cursor of positions) {
    const cursorIsBiggerThanMark = compare(cursor, positionMark) === 1
    const cursorIsLessThanResult = compare(cursor, result) === -1

    if (cursorIsBiggerThanMark && cursorIsLessThanResult) {
      result = cursor
    }
  }

  return result
}

export function decodeBase36 (string) {
  return string
    .split(POSITION.IDENTIFIER_SEPARATOR)
    .map(string => parseInt(string, 36))
}

export function encodeToBase36 (list) {
  return list
    .map(number => number.toString(36))
    .join(POSITION.IDENTIFIER_SEPARATOR)
}
