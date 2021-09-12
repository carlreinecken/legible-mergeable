import * as util from './util'
// import { MERGEABLE_MARKER } from './constants'

export function createProxy (mergeable, options) {
  return new Proxy(mergeable, {
    get (target, key) {
      if (util.hasKey(target, key) && target[key].__isMergeable === true) {
        return createProxy(target[key], options)
      }

      // I'm to be honest not sure if I want/need to support this.
      // With it you could modify an object or an array one level deeper
      // and it gets tracked. Though it's not recursive.
      // TODO: Research need and perfomance impact
      // https://stackoverflow.com/questions/41299642/how-to-use-javascript-proxy-for-nested-objects
      // https://stackoverflow.com/questions/36372611/how-to-test-if-an-object-is-a-proxy
      // if (typeof item === 'object' && item != null) {
      //   return new Proxy(item, {
      //     set (objectTarget, objectKey, objectValue) {
      //       objectTarget[objectKey] = objectValue
      //       mergeable.refresh(key, options)
      //       return true
      //     }
      //   })
      // }

      return target[key]
    },

    set (target, key, value) {
      target.set(key, value, options)
      return true
    },

    has (target, key) {
      return target.has(key)
    },

    deleteProperty (target, key) {
      target.delete(key, options)
      return true
    },

    getOwnPropertyDescriptor (target, key) {
      if (util.hasKey(target, key)) {
        return Reflect.getOwnPropertyDescriptor(target, key)
      }

      return { enumerable: false, configurable: true, writable: true }
    }
  })
}
