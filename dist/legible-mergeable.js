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

  /*
   *               |------------|
   *               |            |
   *               |  Mergeable |
   *               |            |
   *               |      ^     |
   *               |-- ~  | ~ --|
   *               |      v     |
   *       <----   |            |  <----
   * Dump          |  Transfer  |         Merge Function
   *       ---->   |            |  ---->
   *               |------------|
  */

  function switchCaseProperties (property, transformCondition, transformFunction) {
    if (typeof property !== 'object') {
      console.log('switchCaseProperties/noObject', typeof property, property);
      return property
    }

    if (transformCondition(property)) {
      console.log('switchCaseProperties/trCnd', property);
      return transformFunction(property)
    }

    if (property.__isMergeable === true) {
      console.log('switchCaseProperties/__isMergeable', property);
      return createTransferObject(property._state, property._modifications)
    }

    console.log('switchCaseProperties/deepCopy', property);
    return deepCopy(property)
  }

  function createTransferObject (state, modifications) {
    return {
      _state: { ...state },
      _modifications: { ...modifications } || {},
      __isMergeable: true
    }
  }

  function fromDump (dump, transformFunction) {
    transformFunction = transformFunction || (property => property);
    const transformCondition = (property) => isObject(property) && isObject(property[MERGEABLE_MARKER]);

    console.log('fromDump/beforeLoop', dump);

    const state = {};
    let modifications;

    for (const key in dump) {
      if (!hasKey(dump, key)) {
        continue
      }

      if (key === MERGEABLE_MARKER) {
        modifications = dump[MERGEABLE_MARKER];
        continue
      }

      state[key] = switchCaseProperties(
        dump[key],
        transformCondition,
        (property) => fromDump(property, transformFunction)
      );
    }

    console.log('fromDump/afterLoop', state);

    return transformFunction(createTransferObject(state, modifications))
  }

  /*
   * Convert from Transfer to e.g. Mergeable, Dump or Base
   */
  function fromTransfer (transfer, transformFunction) {
    const transformCondition = (property) => property.__isMergeable === true;
    const state = {};

    // console.log('fromTransfer')

    for (const key in transfer._state) {
      if (!hasKey(transfer._state, key)) {
        continue
      }

      // TODO: is this even necessary?!
      // if (!transformCondition(transfer._state[key])) {
      //   state[key] = transfer._state[key]
      //   continue
      // }

      state[key] = switchCaseProperties(
        transfer._state[key],
        transformCondition,
        (property) => fromTransfer(property, transformFunction)
      );
    }

    return transformFunction(createTransferObject(state, transfer._modifications))
  }

  function toDump (transfer) {
    return fromTransfer(transfer, (property) => {
      return { ...property._state, [MERGEABLE_MARKER]: property._modifications }
    })
  }

  function toBase (transfer) {
    return { ...fromTransfer(transfer, (property) => property._state) }
  }

  var converter = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createTransferObject: createTransferObject,
    fromDump: fromDump,
    fromTransfer: fromTransfer,
    toDump: toDump,
    toBase: toBase
  });

  function isMergeable (property) {
    return isObject(property) && property.__isMergeable === true
  }

  function mergeFunction (input) {
    const modifications = {};
    const state = {};

    const properties = uniquenizeArray([].concat(
      Object.keys(input.a._state),
      Object.keys(input.a._modifications),
      Object.keys(input.b._state),
      Object.keys(input.b._modifications)
    ));

    for (const prop of properties) {
      const aChangedAt = input.a._modifications[prop] ? new Date(input.a._modifications[prop]) : null;
      const bChangedAt = input.b._modifications[prop] ? new Date(input.b._modifications[prop]) : null;

      // The property in A is newer
      if (aChangedAt > bChangedAt) {
        if (hasKey(input.a._state, prop)) {
          if (typeof input.a._state[prop] !== 'object') {
            state[prop] = input.a._state[prop];
          } else if (input.a._state[prop].__isMergeable === true) {
            // TODO: mergeable should be cloned
            // state[prop] = input.a._state[prop]
            state[prop] = fromTransfer(input.a._state[prop], property => property);
          } else {
            state[prop] = deepCopy(input.a._state[prop]);
          }
        } // else: The property was deleted

        modifications[prop] = input.a._modifications[prop];

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        if (hasKey(input.b._state, prop)) {
          if (typeof input.b._state[prop] !== 'object') {
            state[prop] = input.b._state[prop];
          } else if (input.b._state[prop].__isMergeable === true) {
            // state[prop] = input.b._state[prop]
            state[prop] = fromTransfer(input.b._state[prop], property => property);
          } else {
            state[prop] = deepCopy(input.b._state[prop]);
          }
        }

        modifications[prop] = input.b._modifications[prop];

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a._modifications, prop)) {
        modifications[prop] = input.a._modifications[prop];
      }

      // Call the merge function recursively if both properties are Mergeables
      if (isMergeable(input.a._state[prop]) && isMergeable(input.b._state[prop])) {
        state[prop] = mergeFunction({
          a: input.a._state[prop],
          b: input.b._state[prop]
        });

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a._state, prop)) {
        state[prop] = deepCopy(input.a._state[prop]);
      }
    }

    return createTransferObject(state, modifications)
  }

  function createProxy (mergeable, options, Mergeable) {
    return new Proxy(mergeable, {
      get (target, key) {
        const item = target._state[key];

        if (item instanceof Mergeable) {
          return createProxy(item, options, Mergeable)
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

  class Mergeable {
    get __isMergeable () {
      return true
    }

    constructor ({ _state, _modifications }) {
      this._state = _state;
      this._modifications = _modifications;
    }

    has (key) {
      return hasKey(this._state, key)
    }

    get (key, fallback) {
      if (this.has(key)) {
        return this._state[key]
      }

      return fallback
    }

    refresh (key, options) {
      options = options || {};

      this._modifications[key] = newDate(options.date);
    }

    set (key, value, options) {
      options = options || {};

      if (options.mergeable || hasKey(value, MERGEABLE_MARKER)) {
        value = fromDump(value, property => new Mergeable(property));
      }

      this._state[key] = value;
      this._modifications[key] = newDate(options.date);

      return this._state[key]
    }

    delete (key, options) {
      options = options || {};

      delete this._state[key];
      this._modifications[key] = newDate(options.date);
    }

    modify (callback, options) {
      options = options || {};

      callback(createProxy(this, options, Mergeable));

      return this
    }

    date (key) {
      return this._modifications[key]
    }

    size () {
      return Object.keys(this._state).length
    }

    compare (docB) {
      const modifications = {
        a: Object.entries(this._modifications),
        b: Object.entries(docB._modifications)
      };

      if (modifications.a.length !== modifications.b.length) {
        return false
      }

      for (const [key, date] in modifications.a) {
        if (date !== modifications.b[key]) {
          return false
        }
      }

      return true
    }

    /*
     * Only use this when you need to iterate over all properties, to work on them
     */
    state () {
      return { ...this._state }
    }

    /*
     * The state without the modifications, it's the "pure" document
     */
    base () {
      return toBase(this)
    }

    meta () {
      // TODO: remove the marker out of this method
      return { [MERGEABLE_MARKER]: { ...this._modifications } }
    }

    /*
     * Dumps the object as native simple object
     */
    dump () {
      return toDump(this)
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    toJSON () {
      return this.dump()
    }

    clone () {
      return fromTransfer(this, (property) => new Mergeable(property))
    }

    merge (docB) {
      if (!(docB instanceof Mergeable)) {
        throw TypeError('Only instances of Mergeable can be merged')
      }

      const result = mergeFunction({ a: this, b: docB });
      const { _state, _modifications } = fromTransfer(result, (property) => {
          // console.log('MC/merge/trFn', property)
          return new Mergeable(property)
        });

      this._state = _state;
      // console.log(this._state, _state)
      this._modifications = _modifications;

      return this
    }

    filter (callback, options) {
      options = options || {};

      const result = {};

      for (const key in this._state) {
        let value = this._state[key];

        if (options.proxy === true && value instanceof Mergeable) {
          value = createProxy(value, null, Mergeable);
        }

        if (callback(value, key, this._modifications[key])) {
          result[key] = this._state[key];
        }
      }

      return result
    }

    map (callback, options) {
      options = options || {};

      const toArray = options.toArray === true;
      const useProxy = options.proxy === true;
      const result = toArray ? [] : {};

      for (const key in this._state) {
        let value = this._state[key];

        if (useProxy && value instanceof Mergeable) {
          value = createProxy(value, null, Mergeable);
        }

        const evaluation = callback(value, key, this._modifications[key]);

        if (useProxy && evaluation instanceof Mergeable) {
          // Otherwise a proxy would be returned
          throw new TypeError('You can not return an instance of Mergeable')
        }

        if (toArray === true) {
          result.push(evaluation);
        } else {
          result[key] = evaluation;
        }
      }

      return result
    }

    /*
     * Experimental
     */
    get _proxy () {
      return createProxy(this, null, Mergeable)
    }
  }

  var legibleMergeable = {
    create (dump) {
      return fromDump(dump, property => {
        const r = new Mergeable(property);
        // console.log('lM/create/trFn', r instanceof Mergeable, r)
        return r
      })
    },

    merge (docA, docB) {
      if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
        throw TypeError('Only instances of Mergeable can be merged')
      }

      return docA.clone().merge(docB)
    },

    Mergeable: Mergeable,

    MERGEABLE_MARKER,

    _mergeFunction: mergeFunction,

    _converter: converter
  };

  return legibleMergeable;

})));
