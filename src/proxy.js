import * as util from './util.js'
import { MERGEABLE_MARKER } from './constants.js'
import { transformMergeable } from './transform-mergeable.js'
import * as mergeableFunctions from './mergeable-functions.js'

export function createProxy (dump, options) {
  const result = transformMergeable(dump, (item) => createProxy(item, options))

  result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {}

  return getProxy(result, options)
}

function getProxy (mergeable, options) {
  return new Proxy(mergeable, {
    set (target, key, value, receiver) {
      if (value && util.hasMarker(value)) {
        value = createProxy(value, options)
      }

      mergeableFunctions.renew(target, key, options)

      return Reflect.set(target, key, value, receiver)
    },

    deleteProperty (target, key) {
      mergeableFunctions.renew(target, key, options)

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
