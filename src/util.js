import { MERGEABLE_MARKER } from './constants.js'

export function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

export function isObject (object) {
  return Object.prototype.toString.call(object) === '[object Object]'
}

export function deepCopy (value) {
  // TODO: replace with something better performing. be sure to compare perfomance
  return JSON.parse(JSON.stringify(value))
}

export function newDate (date) {
  return date || (new Date()).toISOString()
}

export function uniquenizeArray (array) {
  return [...new Set(array)]
}

export function hasMarker (property) {
  return hasKey(property, MERGEABLE_MARKER) && isObject(property[MERGEABLE_MARKER])
}
