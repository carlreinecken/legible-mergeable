// left and right are puffer half of tis number for other insertions
const INNER_RANGE_SIZE = 10000
const MAX = parseInt('zzzz', 36)

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

while (innerRanges[0] !== MAX) {
  const number = randomNumber(innerRanges[0], MAX)
  if (number == null) break
  innerRanges.unshift(number)
}

console.log('outer ranges size  ', MAX)
console.log('inner ranges size  ', INNER_RANGE_SIZE)
console.log('inner ranges amount', innerRanges.length)
