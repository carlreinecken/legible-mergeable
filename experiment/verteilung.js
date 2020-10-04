// left and right are puffer half of tis number for other insertions
const OUTER_RANGE_SIZE_CHAR = 'zzzzzzzzzz'
const OUTER_RANGE_SIZE = parseInt(OUTER_RANGE_SIZE_CHAR, 36)
const INNER_RANGE_AMOUNT_MIN = 100
const INNER_RANGE_SIZE = (OUTER_RANGE_SIZE/2 - 1/2) / INNER_RANGE_AMOUNT_MIN

function randomNumber (min, max) {
  const diff = max - min
  if (diff < INNER_RANGE_SIZE * 2) {
    // create new level instead
    return
  }

  // TODO: randomize between boundary- and boundary+ (LSEQ)
  // if (Math.random() > 0.5) {
  min = min + INNER_RANGE_SIZE * 0.5
  max = min + INNER_RANGE_SIZE * 1.5
  // } else {
  //   min = max - INNER_RANGE_SIZE * 1.5
  //   max = max - INNER_RANGE_SIZE * 0.5
  // }

  const result = Math.floor(Math.random() * (max - (min + 1))) + min + 1
  return result
}

const innerRanges = []
innerRanges.push(0)

while (innerRanges[0] !== OUTER_RANGE_SIZE) {
  const number = randomNumber(innerRanges[0], OUTER_RANGE_SIZE)
  if (number == null) break
  innerRanges.unshift(number)
}

console.log('outer ranges size       %d (%d)', OUTER_RANGE_SIZE, OUTER_RANGE_SIZE_CHAR.length)
console.log('inner ranges size       %d', INNER_RANGE_SIZE)
console.log('inner ranges amount min %d', INNER_RANGE_AMOUNT_MIN)
console.log('inner ranges amount     %d', innerRanges.length)
