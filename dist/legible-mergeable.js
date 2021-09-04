(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const DEFAULT_ID_KEY = 'id';
  const MODIFICATIONS_KEY = '^m';

  function hasKey (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  function isObject (object) {
    return Object.prototype.toString.call(object) === '[object Object]'
  }

  function deepCopy (value) {
    // TODO: replace with something better performing.
    //       makes following util function parseDateValuesInObject obsolete.
    return JSON.parse(JSON.stringify(value))
  }

  function parseDateValuesInObject (changes) {
    return Object.keys(changes).reduce((acc, key) => {
      return ((acc[key] = new Date(changes[key])), acc)
    }, {})
  }

  function newDate (date) {
    return date ? new Date(date) : new Date()
  }

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function arrayToObject (array, customIndex) {
    return array.reduce((acc, value, i) => {
      const key = customIndex == null ? i : customIndex;

      acc[value[key]] = value;

      return acc
    }, {})
  }

  var util = {
    hasKey,
    isObject,
    deepCopy,
    parseDateValuesInObject,
    newDate,
    uniquenizeArray,
    arrayToObject
  };

  function merge (stateA, modificationsA, stateB, modificationsB) {
    const modifications = { a: modificationsA, b: modificationsB, result: {} };
    const state = { a: stateA, b: stateB, result: {} };

    const properties = util.uniquenizeArray([].concat(
      Object.keys(state.a),
      Object.keys(modifications.a),
      Object.keys(state.b),
      Object.keys(modifications.b)
    ));

    for (const prop of properties) {
      const aChangedAt = modifications.a[prop] ? new Date(modifications.a[prop]) : null;
      const bChangedAt = modifications.b[prop] ? new Date(modifications.b[prop]) : null;

      if (aChangedAt > bChangedAt) {
        if (util.hasKey(state.a, prop)) {
          state.result[prop] = state.a[prop];
        }

        modifications.result[prop] = aChangedAt;

        continue
      }

      if (aChangedAt < bChangedAt) {
        if (util.hasKey(state.b, prop)) {
          state.result[prop] = state.b[prop];
        }

        modifications.result[prop] = bChangedAt;

        continue
      }

      if (util.hasKey(state.a, prop)) {
        state.result[prop] = state.a[prop];
      } else if (util.hasKey(state.b, prop)) {
        state.result[prop] = state.b[prop];
      }

      if (util.hasKey(modifications.result, prop)) {
        continue
      }

      if (util.hasKey(modifications.a, prop)) {
        modifications.result[prop] = aChangedAt;
      } else if (util.hasKey(modifications.b, prop)) {
        modifications.result[prop] = bChangedAt;
      }
    }

    return { state: state.result, modifications: modifications.result }
  }

  class legibleMergeable {
    constructor (state, modifications) {
      this._state = {};

      for (const [identifier, property] of Object.entries(state)) {
        if (util.isObject(property) && util.isObject(property[MODIFICATIONS_KEY])) {
          this._state[identifier] = legibleMergeable.create(property);
        } else {
          this._state[identifier] = property;
        }
      }

      this._modifications = util.parseDateValuesInObject(modifications);
    }

    static create (object) {
      let modifications = {};
      const state = util.deepCopy(object);

      if (util.hasKey(state, MODIFICATIONS_KEY)) {
        modifications = state[MODIFICATIONS_KEY];
        delete state[MODIFICATIONS_KEY];
      }

      return new this(state, modifications)
    }

    has (key) {
      return util.hasKey(this._state, key)
    }

    get (key, fallback) {
      if (this.has(key)) {
        return this._state[key]
      }

      return fallback
    }

    set (key, value, date) {
      this._state[key] = value;
      this._modifications[key] = util.newDate(date);
    }

    delete (key, date) {
      delete this._state[key];
      this._modifications[key] = util.newDate(date);
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

    id () {
      return this._state[DEFAULT_ID_KEY]
    }

    size () {
      return Object.keys(this._state).length
    }

    /*
     * The state without the modifications, it's the "pure" document
     */
    base () {
      return this._getRecursiveState(property => property.base())
    }

    meta () {
      return { [MODIFICATIONS_KEY]: { ...this._modifications } }
    }

    /*
     * Dumps the object as native simple object
     */
    dump () {
      return {
        ...this._getRecursiveState(property => property.dump()),
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
      return new legibleMergeable(util.deepCopy(this._state), { ...this._modifications })
    }

    static merge (stateA, stateB) {
      const result = merge(stateA._state, stateA._modifications, stateB._state, stateB._modifications);

      return new this(util.deepCopy(result.state), result.modifications)
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

    /**
     * Gets the state, but if the instance is found it gets
     * transformed via the given callback
     */
    _getRecursiveState (transformInstanceFn) {
      return Object
        .entries(this._state)
        .reduce((result, [identifier, property]) => {
          if (typeof property !== 'object') {
            result[identifier] = property;
          } else if (property instanceof legibleMergeable) {
            result[identifier] = transformInstanceFn(property);
          } else {
            result[identifier] = util.deepCopy(property);
          }

          return result
        }, {})
    }
  }

  return legibleMergeable;

})));
