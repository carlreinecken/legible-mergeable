(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const MERGEABLE_MARKER = '^lm';

  function hasKey (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  function isObject (object) {
    return Object.prototype.toString.call(object) === '[object Object]'
  }

  function deepCopy (value) {
    // TODO: replace with something better performing. be sure to compare perfomance
    return JSON.parse(JSON.stringify(value))
  }

  function newDate (date) {
    return date || (new Date()).toISOString()
  }

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function hasMarker (property) {
    return hasKey(property, MERGEABLE_MARKER) && isObject(property[MERGEABLE_MARKER])
  }

  function isPropertyMergeable (property) {
    return isObject(property) && hasMarker(property)
  }

  function stateWithoutMarker (state) {
    const result = { ...state };
    delete result[MERGEABLE_MARKER];

    return result
  }

  function mergeFunction ({ a: docA, b: docB }) {
    const input = {
      a: { state: stateWithoutMarker(docA), mods: docA[MERGEABLE_MARKER] },
      b: { state: stateWithoutMarker(docB), mods: docB[MERGEABLE_MARKER] }
    };

    const result = { [MERGEABLE_MARKER]: {} };

    const properties = uniquenizeArray([].concat(
      Object.keys(input.a.state),
      Object.keys(input.a.mods),
      Object.keys(input.b.state),
      Object.keys(input.b.mods)
    ));

    for (const prop of properties) {
      const aChangedAt = input.a.mods[prop] ? new Date(input.a.mods[prop]) : null;
      const bChangedAt = input.b.mods[prop] ? new Date(input.b.mods[prop]) : null;

      // console.log('mrgfn/loop', prop, aChangedAt, bChangedAt)

      // The property in A is newer
      if (aChangedAt > bChangedAt) {
        // if: a and b are Mergeables, they should be merged
        // else if: one property is a Mergeable:
        //   - if A (later) is the Mergeable, just take that
        //   - if B (earlier) is the Mergeable, i would need to recursively check
        //     whether the Mergeable has a later date anywhere in its nested props
        if (hasKey(input.a.state, prop)) {
          result[prop] = deepCopy(input.a.state[prop]);
        } // else: The property was deleted

        result[MERGEABLE_MARKER][prop] = input.a.mods[prop];

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        if (hasKey(input.b.state, prop)) {
          result[prop] = deepCopy(input.b.state[prop]);
        }

        result[MERGEABLE_MARKER][prop] = input.b.mods[prop];

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a.mods, prop)) {
        result[MERGEABLE_MARKER][prop] = input.a.mods[prop];
      }

      // Call the merge function recursively if both properties are Mergeables
      if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
        result[prop] = mergeFunction({
          a: input.a.state[prop],
          b: input.b.state[prop]
        });

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a.state, prop)) {
        result[prop] = deepCopy(input.a.state[prop]);
      }
    }

    return result
  }

  // import { MERGEABLE_MARKER } from './constants'

  function createProxy (mergeable, options) {
    return new Proxy(mergeable, {
      get (target, key) {
        if (hasKey(target, key) && target[key].__isMergeable === true) {
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
        target.set(key, value, options);
        return true
      },

      has (target, key) {
        return target.has(key)
      },

      deleteProperty (target, key) {
        target.delete(key, options);
        return true
      },

      getOwnPropertyDescriptor (target, key) {
        if (hasKey(target, key)) {
          return Reflect.getOwnPropertyDescriptor(target, key)
        }

        return { enumerable: false, configurable: true, writable: true }
      }
    })
  }

  function transformMergeables (dump, transformFn) {
    return Object
      .entries(dump)
      .reduce((result, [key, property]) => {
        if (typeof property !== 'object') {
          // console.log('trMrg/no object', key)
          result[key] = property;
        } else if (hasMarker(property)) {
          // console.log('trMrg/has marker', key)
          result[key] = transformFn(property);
        } else {
          // TODO: deep clone?
          // console.log('trMrg/deep clone', key)
          result[key] = deepCopy(property);
          // result[key] = property
        }

        // console.log('trMrg/result', key, result)
        return result
      }, {})
  }

  function setMergeablePrototype (dump) {
    const result = transformMergeables(dump, (item) => setMergeablePrototype(item));

    result[MERGEABLE_MARKER] = result[MERGEABLE_MARKER] || {};

    Object.defineProperty(result, MERGEABLE_MARKER, { enumerable: false });

    return Object.setPrototypeOf(result, mergeablePrototype)
  }

  const mergeablePrototype = {
    get __isMergeable () {
      return true
    },

    // TODO: i think it would be better if they call the createProxy function themself
    // otherwise the user might be inclined to call this function a lot, which
    // is not really good to create new proxies all the time, right?
    get _proxy () {
      return createProxy(this)
    },

    has (key) {
      return hasKey(this, key)
    },

    get (key, fallback) {
      if (this.has(key)) {
        return this[key]
      }

      return fallback
    },

    refresh (key, options) {
      options = options || {};

      this[MERGEABLE_MARKER][key] = newDate(options.date);
    },

    set (key, value, options) {
      options = options || {};

      if (options.mergeable || hasMarker(value)) ;

      this[key] = value;
      this[MERGEABLE_MARKER][key] = newDate(options.date);

      return this[key]
    },

    delete (key, options) {
      options = options || {};

      delete this[key];

      this[MERGEABLE_MARKER][key] = newDate(options.date);
    },

    // TODO: do i really need this? or should they just get the proxy directly?
    modify (callback, options) {
      options = options || {};

      callback(createProxy(this, options));

      return this
    },

    date (key) {
      return this[MERGEABLE_MARKER][key]
    },

    size () {
      return Object.keys(this).length
    },

    // TODO: so its basically a shallow cloning of this :D
    // TODO: without the marker please!
    state () {
      return { ...this }
    },

    /*
     * The state without the modifications, it's the "pure" document
     */
    base () {
      return transformMergeables(this, property => property.base())
    },

    /*
     * Dumps the object as native simple object
     */
    dump () {
      return {
        ...transformMergeables(this, property => property.dump()),
        [MERGEABLE_MARKER]: this[MERGEABLE_MARKER]
      }
    },

    toString () {
      return JSON.stringify(this.dump())
    },

    toJSON () {
      return this.dump()
    },

    clone () {
      return setMergeablePrototype(this || {})
      // return createPrototype(transformMergeables(this || {}, createPrototype))
    },

    merge (docB) {
      if (!isObject(docB) || !hasMarker(docB)) {
        // TODO: does a marker even need to exist (on the root)?
        throw TypeError('Only objects with the mergeable marker can be merged')
      }

      const result = mergeFunction({ a: this, b: docB });

      for (const key in this) {
        if (!hasKey(this, key)) {
          continue
        }

        if (hasKey(result, key)) {
          this[key] = result[key];
        } else {
          delete this[key];
        }
      }

      this[MERGEABLE_MARKER] = result[MERGEABLE_MARKER];

      return this
    },

    filter () {
    },

    map () {
    }
  };

  var legibleMergeable = {
    create (dump) {
      return setMergeablePrototype(dump || {})
    },

    merge (docA, docB) {
      if (!isObject(docA) || !hasMarker(docA) || !isObject(docB) || !hasMarker(docB)) {
        // TODO: does a marker even need to exist (on the root)?
        throw TypeError('Only objects with the mergeable marker can be merged')
      }

      const result = mergeFunction({ a: docA, b: docB });

      return setMergeablePrototype(result)
    },

    _mergeFunction: mergeFunction,

    MERGEABLE_MARKER
  };

  return legibleMergeable;

})));
