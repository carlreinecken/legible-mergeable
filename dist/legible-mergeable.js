(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.legibleMergeable = {}));
}(this, (function (exports) { 'use strict';

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

  function mergeFunction ({ a: docA, b: docB }, modificationsKey) {
    function isPropertyMergeable (property) {
      return isObject(property) && isObject(property[modificationsKey])
    }

    const input = {
      a: { state: docA.state, mods: docA[modificationsKey] },
      b: { state: docB.state, mods: docB[modificationsKey] }
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
        // console.log('attention! merging nested properties!', prop)
        result.state[prop] = mergeFunction({
          a: { state: input.a.state[prop].state, [modificationsKey]: input.a.state[prop][modificationsKey] },
          b: { state: input.b.state[prop].state, [modificationsKey]: input.b.state[prop][modificationsKey] }
        }, modificationsKey);

        continue
      }

      // console.log('doing nuffing', prop, input.a.state[prop])

      // The property is on both sides the same
      if (hasKey(input.a.state, prop)) {
        result.state[prop] = deepCopy(input.a.state[prop]);
      }
    }

    result[modificationsKey] = result.mods;

    delete result.mods;

    return result
  }

  class Mergeable {
    static get MODIFICATIONS_KEY () {
      return '^M3Rg34bL3'
    }

    constructor (state, modifications) {
      this._state = transformDump(state, property => createMergeableFromDump(property));
      this._modifications = modifications;
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

    set (key, value, date) {
      this._state[key] = value;
      this._modifications[key] = newDate(date);
    }

    modify (key, fn, date) {
      this._state[key] = fn(this._state[key]);
      this._modifications[key] = newDate(date);
    }

    delete (key, date) {
      delete this._state[key];
      this._modifications[key] = newDate(date);
    }

    /*
     * Returns a proxy to make it possible to directly work on the state.
     * Useful for e.g. the vue v-model.
     * TODO: check practicability
     */
    get use () {
      return new Proxy(this, {
        get (target, prop) {
          return target._state[prop]
        },

        set (target, prop, value) {
          target.set(prop, value);
          return true
        },

        deleteProperty (target, prop) {
          target.delete(prop);
          return true
        }
      })
    }

    size () {
      return Object.keys(this._state).length
    }

    /*
     * Not serialized state with all MergeableObject. Only manipulate the objects
     * with this, changes to the array are not persisted.
     * TODO: add test
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

      const result = mergeFunction(
        { a: isolatedDump(this), b: isolatedDump(docB) },
        Mergeable.MODIFICATIONS_KEY
      );

      this._state = transformDump(result.state, property => createMergeableFromIsolatedDump(property));
      this._modifications = result[Mergeable.MODIFICATIONS_KEY];

      return this
    }
  }

  /*
   * I would really like to put these in another file, but that doesn't
   * work cause of circular references (I need the Mergeable class in there)
   */

  function isolatedDump (doc) {
    return {
      state: transformInternalState(doc._state, property => isolatedDump(property)),
      [Mergeable.MODIFICATIONS_KEY]: doc._modifications
    }
  }

  function createMergeableFromIsolatedDump (dump) {
    return new Mergeable(dump.state, dump[Mergeable.MODIFICATIONS_KEY])
  }

  function createMergeableFromDump (dump) {
    let modifications = {};
    const state = deepCopy(dump);

    if (hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
      modifications = state[Mergeable.MODIFICATIONS_KEY];
      delete state[Mergeable.MODIFICATIONS_KEY];
    }

    return new Mergeable(state, modifications)
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
        } else if (property instanceof Mergeable) {
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
        if (isObject(property) && isObject(property[Mergeable.MODIFICATIONS_KEY])) {
          result[identifier] = transformInstanceFn(property);
        } else {
          result[identifier] = property;
        }

        return result
      }, {})
  }

  const legibleMergeable = {
    create (dump) {
      return createMergeableFromDump(dump || {})
    },

    merge (docA, docB) {
      if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
        throw TypeError('Only instances of Mergeable can be merged')
      }

      const result = mergeFunction({
        a: isolatedDump(docA), b: isolatedDump(docB)
      }, Mergeable.MODIFICATIONS_KEY);

      return new Mergeable(
        transformDump(result.state, property => createMergeableFromIsolatedDump(property)),
        result[Mergeable.MODIFICATIONS_KEY]
      )
    }
  };

  exports.Mergeable = Mergeable;
  exports.legibleMergeable = legibleMergeable;
  exports.mergeFunction = mergeFunction;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
