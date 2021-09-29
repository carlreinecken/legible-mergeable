import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'

export function createProxy (dump, options) {
  const result = transformMergeable(dump, (item) => createProxy(item, options))

  result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {}

  return getProxy(result, options)
}

function getProxy (mergeable, options) {
  options = options || {}

  return new Proxy(mergeable, {
    set (target, key, value, receiver) {
      if (util.hasMarker(value)) {
        value = createProxy(value, options)
      }

      target[MERGEABLE_MARKER][key] = util.newDate(options.date)
      return Reflect.set(target, key, value, receiver)
    },

    deleteProperty (target, key) {
      target[MERGEABLE_MARKER][key] = util.newDate(options.date)
      return Reflect.deleteProperty(target, key)
    },

    getOwnPropertyDescriptor (target, key) {
      if (key === MERGEABLE_MARKER) {
        return { enumerable: false, configurable: true, writable: true }
      }

      return Reflect.getOwnPropertyDescriptor(target, key)
    }
  })
}
