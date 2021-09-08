import { AbstractMergeable } from './AbstractMergeable.class'

export function createProxy (mergeable, options) {
  return new Proxy(mergeable, {
    get (target, key) {
      const item = target._state[key]

      if (item instanceof AbstractMergeable) {
        return createProxy(item, options)
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

      return item
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

    ownKeys (target) {
      return Object.keys(target._state)
    },

    getOwnPropertyDescriptor (target, key) {
      if (target.has(key)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: target.get(key)
        }
      }
    }
  })
}
