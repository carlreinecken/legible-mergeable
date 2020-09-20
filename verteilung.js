const RANGE = 370
const MAX = parseInt('zzz', 36)

function randomIntFromMiddleThird (min, max) {
  const diff = max - min
  min = min + RANGE * 0.5
  max = min + RANGE * 1.5

  const result = Math.floor(Math.random() * (max - (min + 1))) + min + 1
  return result
}

let bar = [0]
while (bar[0] !== MAX && MAX - bar[0] >= RANGE*3) {
  bar.unshift(randomIntFromMiddleThird(bar[0], MAX))
}

console.log('amount of basic ranges', bar.length)
