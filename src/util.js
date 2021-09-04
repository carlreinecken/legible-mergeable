function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function isObject (object) {
  return Object.prototype.toString.call(object) === '[object Object]'
}

function deepCopy (value) {
  // TODO: replace with something better performing.
  //       makes following util function parseDateValuesInObject obsolete.
  return JSON.parse(JSON.stringify(value))
}

function parseDateValuesInObject (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return ((acc[key] = new Date(changes[key])), acc)
  }, {})
}

function newDate (date) {
  return date ? new Date(date) : new Date()
}

function uniquenizeArray (array) {
  return [...new Set(array)]
}

function arrayToObject (array, customIndex) {
  return array.reduce((acc, value, i) => {
    const key = customIndex == null ? i : customIndex

    acc[value[key]] = value

    return acc
  }, {})
}

export default {
  hasKey,
  isObject,
  deepCopy,
  parseDateValuesInObject,
  newDate,
  uniquenizeArray,
  arrayToObject
}
