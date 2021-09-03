function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function deepCopy (value) {
  // TODO: replace with something better performing.
  //       makes following util function parseChangeDates obsolete.
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

function uniquenizeArray (array) {
  return [...new Set(array)]
}

export default {
  hasKey,
  deepCopy,
  parseChangeDates,
  newDate,
  uniquenizeArray
}
