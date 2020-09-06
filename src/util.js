function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function deepCopy (value) {
  return JSON.parse(JSON.stringify(value))
}

function parseChangeDates (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return { ...acc, [key]: new Date(changes[key]) }
  }, {})
}

export default {
  hasKey,
  deepCopy,
  parseChangeDates
}
