function birthdayProblem (people, daysOfYear) {
  const factorial = (n) => (n != 1) ? n * factorial(n - 1) : 1
  const result = 1 - (factorial(daysOfYear) / (Math.pow(daysOfYear, people) * factorial(daysOfYear - people)))
  return result * 100
}

console.log(birthdayProblem(2, 170))
console.log(birthdayProblem(2, 100))

// console.log(factorialBig(170))
