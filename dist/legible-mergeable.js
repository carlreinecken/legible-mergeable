(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

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

  class AbstractMergeable {
    static get MODIFICATIONS_KEY () {
      return '^M3Rg34bL3'
    }

    constructor () {
      if (this.constructor === AbstractMergeable) {
        throw new Error('Can\'t instantiate the abstract class AbstractMergeable!')
      }
    }
  }

  const MOD_KEY = AbstractMergeable.MODIFICATIONS_KEY;

  function mergeFunction ({ a: docA, b: docB }) {
    function isPropertyMergeable (property) {
      return isObject(property) && isObject(property[MOD_KEY])
    }

    const input = {
      a: { state: docA.state, mods: docA[MOD_KEY] },
      b: { state: docB.state, mods: docB[MOD_KEY] }
    };

    const result = { state: {}, mods: {} };

    const properties = uniquenizeArray([].concat(
      Object.keys(input.a.state),
      Object.keys(input.a.mods),
      Object.keys(input.b.state),
      Object.keys(input.b.mods)
    ));

    for (const prop of properties) {
      const aChangedAt = input.a.mods[prop] ? new Date(input.a.mods[prop]) : null;
      const bChangedAt = input.b.mods[prop] ? new Date(input.b.mods[prop]) : null;

      // The property in A is newer
      if (aChangedAt > bChangedAt) {
        if (hasKey(input.a.state, prop)) {
          result.state[prop] = deepCopy(input.a.state[prop]);
        }

        result.mods[prop] = input.a.mods[prop];

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        if (hasKey(input.b.state, prop)) {
          result.state[prop] = deepCopy(input.b.state[prop]);
        }

        result.mods[prop] = input.b.mods[prop];

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a.mods, prop)) {
        result.mods[prop] = input.a.mods[prop];
      }

      // Call the merge function recursively if both properties are mergeables
      if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
        result.state[prop] = mergeFunction({
          a: { state: input.a.state[prop].state, [MOD_KEY]: input.a.state[prop][MOD_KEY] },
          b: { state: input.b.state[prop].state, [MOD_KEY]: input.b.state[prop][MOD_KEY] }
        });

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a.state, prop)) {
        result.state[prop] = deepCopy(input.a.state[prop]);
      }
    }

    result[MOD_KEY] = result.mods;

    delete result.mods;

    return result
  }

  function createProxy (mergeable, options) {
    return new Proxy(mergeable, {
      get (target, key) {
        const item = target._state[key];

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

  /**
   * Transform a given internal state.
   * If the instance is found it gets transformed via the given callback
   */
  function transformInternalState (state, transformInstanceFn) {
    return Object
      .entries(state)
      .reduce((result, [identifier, property]) => {
        if (typeof property !== 'object') {
          result[identifier] = property;
        } else if (property instanceof AbstractMergeable) {
          result[identifier] = transformInstanceFn(property);
        } else {
          result[identifier] = deepCopy(property);
        }

        return result
      }, {})
  }

  /**
   * Transform a given dumped (raw) object.
   * If the instance is found it gets transformed via the given callback
   */
  function transformDump (dump, transformInstanceFn) {
    return Object
      .entries(dump)
      .reduce((result, [identifier, property]) => {
        if (isObject(property) && isObject(property[AbstractMergeable.MODIFICATIONS_KEY])) {
          result[identifier] = transformInstanceFn(property);
        } else {
          result[identifier] = property;
        }

        return result
      }, {})
  }

  function mapMergeableToMergeObject (doc) {
    return {
      state: transformInternalState(doc._state, property => mapMergeableToMergeObject(property)),
      [AbstractMergeable.MODIFICATIONS_KEY]: doc._modifications
    }
  }

  class Mergeable extends AbstractMergeable {
    constructor (state, modifications) {
      super();

      this._state = transformDump(state, property => Mergeable.createFromDump(property));
      this._modifications = modifications;
    }

    static createFromDump (dump) {
      let modifications = {};
      const state = deepCopy(dump || {});

      if (hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
        modifications = state[Mergeable.MODIFICATIONS_KEY];
        delete state[Mergeable.MODIFICATIONS_KEY];
      }

      return new Mergeable(state, modifications)
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

      if (options.mergeable) {
        value = Mergeable.createFromDump(value);
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

      callback(createProxy(this, options));

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
      return transformInternalState(this._state, property => property.base())
    }

    meta () {
      return { [Mergeable.MODIFICATIONS_KEY]: { ...this._modifications } }
    }

    /*
     * Dumps the object as native simple object
     */
    dump () {
      return {
        ...transformInternalState(this._state, property => property.dump()),
        [Mergeable.MODIFICATIONS_KEY]: this._modifications
      }
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    toJSON () {
      return this.dump()
    }

    clone () {
      return new Mergeable(deepCopy(this._state), { ...this._modifications })
    }

    merge (docB) {
      if (!(docB instanceof Mergeable)) {
        throw TypeError('Only instances of Mergeable can be merged')
      }

      const result = mergeFunction({ a: mapMergeableToMergeObject(this), b: mapMergeableToMergeObject(docB) });

      this._state = transformDump(result.state, dump => new Mergeable(dump.state, dump[Mergeable.MODIFICATIONS_KEY]));
      this._modifications = result[Mergeable.MODIFICATIONS_KEY];

      return this
    }

    filter (callback, options) {
      options = options || {};

      const result = {};

      for (const key in this._state) {
        let value = this._state[key];

        if (options.proxy === true && value instanceof Mergeable) {
          value = createProxy(value);
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
          value = createProxy(value);
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
      return createProxy(this)
    }
  }

  var legibleMergeable = {
    create (dump) {
      return Mergeable.createFromDump(dump)
    },

    merge (docA, docB) {
      if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
        throw TypeError('Only instances of Mergeable can be merged')
      }

      return docA.clone().merge(docB)
    },

    _mergeFunction: mergeFunction,

    Mergeable: Mergeable
  };

  return legibleMergeable;

})));
