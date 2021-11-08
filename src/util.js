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

export function uniquenizeArray (array) {
  return [...new Set(array)]
}

export function hasMarker (property) {
  return hasKey(property, MERGEABLE_MARKER) && isObject(property[MERGEABLE_MARKER])
}

export function swap (a, b) {
  return [b, a]
}

/*
 * Both the minimum and maximum are exclusive.
 */
export function randomInt (min, max) {
  if (min > max) {
    [min, max] = swap(min, max)
  }

  return Math.floor(Math.random() * (max - (min + 1))) + min + 1
}
