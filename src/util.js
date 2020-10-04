function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function deepCopy (value) {
  return JSON.parse(JSON.stringify(value))
}

function parseChangeDates (changes) {
  const result = {}
  for (const [key, value] of Object.entries(changes)) {
    result[key] = new Date(value)
  }
  return result
}

function newDate (date) {
  return date ? new Date(date) : new Date()
}

export default {
  hasKey,
  deepCopy,
  parseChangeDates,
  newDate
}
