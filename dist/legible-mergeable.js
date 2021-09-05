(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const MODIFICATIONS_KEY = '^m';

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
    return (date ? new Date(date) : new Date()).toISOString()
  }

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function isPropertyMergeable (property) {
    return isObject(property) && isObject(property.modifications)
  }

  function merge (stateA, modificationsA, stateB, modificationsB) {
    const input = {
      a: { state: stateA, modifications: modificationsA },
      b: { state: stateB, modifications: modificationsB }
    };

    const result = { state: {}, modifications: {} };

    const properties = uniquenizeArray([].concat(
      Object.keys(input.a.state),
      Object.keys(input.a.modifications),
      Object.keys(input.b.state),
      Object.keys(input.b.modifications)
    ));

    for (const prop of properties) {
      const aChangedAt = input.a.modifications[prop] ? new Date(input.a.modifications[prop]) : null;
      const bChangedAt = input.b.modifications[prop] ? new Date(input.b.modifications[prop]) : null;

      // The property in A is newer
      if (aChangedAt > bChangedAt) {
        if (hasKey(input.a.state, prop)) {
          result.state[prop] = input.a.state[prop];
        }

        result.modifications[prop] = input.a.modifications[prop];

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        if (hasKey(input.b.state, prop)) {
          result.state[prop] = input.b.state[prop];
        }

        result.modifications[prop] = input.b.modifications[prop];

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a.modifications, prop)) {
        result.modifications[prop] = input.a.modifications[prop];
      }

      // Call the merge function recursively if both properties are mergeables
      if (isPropertyMergeable(input.a.state[prop]) && isPropertyMergeable(input.b.state[prop])) {
        result.state[prop] = merge(
          input.a.state[prop].state,
          input.a.state[prop].modifications,
          input.b.state[prop].state,
          input.b.state[prop].modifications
        );

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a.state, prop)) {
        result.state[prop] = input.a.state[prop];
      }
    }

    return result
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
        } else if (property instanceof legibleMergeable) {
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
        if (isObject(property) && isObject(property[MODIFICATIONS_KEY])) {
          result[identifier] = transformInstanceFn(property);
        } else {
          result[identifier] = property;
        }

        return result
      }, {})
  }

  function splitIntoStateAndModifications (dump) {
    let modifications = {};
    const state = deepCopy(dump);

    if (hasKey(state, MODIFICATIONS_KEY)) {
      modifications = state[MODIFICATIONS_KEY];
      delete state[MODIFICATIONS_KEY];
    }

    return { modifications, state }
  }

  // export class legibleMergeableN {
  //   // TODO: move only static methods in here. so the other class can be PascalCase
  //   static create (dump) {
  //     const { state, modifications } = splitIntoStateAndModifications(dump)

  //     return new legibleMergeable(state, modifications)
  //   }
  // }

  class legibleMergeable {
    constructor (state, modifications) {
      this._state = transformDump(state, property => legibleMergeable.create(property));

      this._modifications = modifications;
    }

    static create (dump) {
      const { state, modifications } = splitIntoStateAndModifications(dump);

      return new this(state, modifications)
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

    delete (key, date) {
      delete this._state[key];
      this._modifications[key] = newDate(date);
    }

    /*
     * Returns a proxy to make it possible to directly work on the state.
     * Useful for e.g. the vue v-model.
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
     * The state without the modifications, it's the "pure" document
     */
    base () {
      return transformInternalState(this._state, property => property.base())
    }

    meta () {
      return { [MODIFICATIONS_KEY]: { ...this._modifications } }
    }

    /*
     * Dumps the object as native simple object
     */
    dump () {
      return {
        ...transformInternalState(this._state, property => property.dump()),
        [MODIFICATIONS_KEY]: this._modifications
      }
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    toJSON () {
      return this.dump()
    }

    clone () {
      // eslint-disable-next-line new-cap
      return new legibleMergeable(deepCopy(this._state), { ...this._modifications })
    }

    static merge (stateA, stateB) {
      const result = merge(stateA._state, stateA._modifications, stateB._state, stateB._modifications);

      return new this(deepCopy(result.state), result.modifications)
    }

    merge (stateB) {
      const result = merge(this._state, this._modifications, stateB._state, stateB._modifications);

      this._state = result.state;
      this._modifications = result.modifications;

      return this
    }

    static get _mergeFunction () {
      return merge
    }

    static get KEY () {
      return {
        MODIFICATIONS: MODIFICATIONS_KEY
      }
    }
  }

  return legibleMergeable;

})));
