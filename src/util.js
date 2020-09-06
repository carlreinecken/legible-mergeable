function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function deepCopy (value) {
  return JSON.parse(JSON.stringify(value))
}

export default {
  hasKey,
  deepCopy
}
