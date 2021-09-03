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

  function deepCopy (value) {
    // TODO: replace with something better performing.
    //       makes following util function parseChangeDates obsolete.
    return JSON.parse(JSON.stringify(value))
  }

  function parseChangeDates (changes) {
    const result = {};
    for (const [key, value] of Object.entries(changes)) {
      result[key] = new Date(value);
    }
    return result
  }

  function newDate (date) {
    return date ? new Date(date) : new Date()
  }

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  var util = {
    hasKey,
    deepCopy,
    parseChangeDates,
    newDate,
    uniquenizeArray
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

  class MergeableObject {
    constructor (state, modifications) {
      this._state = state;
      this._modifications = util.parseChangeDates(modifications);
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

    get (key) {
      if (this.has(key)) {
        return this._state[key]
      }
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
     * @return the state
     */
    base () {
      return util.deepCopy(this._state)
    }

    meta () {
      return { [MODIFICATIONS_KEY]: { ...this._modifications } }
    }

    /*
     * Dumps the object as native value
     * @return
     */
    dump () {
      if (Object.keys(this._modifications).length === 0) {
        return { ...this._state }
      }

      return {
        ...this._state,
        [MODIFICATIONS_KEY]: this._modifications
      }
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    clone () {
      return new MergeableObject(util.deepCopy(this._state), util.deepCopy(this._modifications))
    }

    static merge (stateA, stateB) {
      const result = merge(stateA._state, stateA._modifications, stateB._state, stateB._modifications);

      return MergeableObject.create({
        ...result.state,
        [MODIFICATIONS_KEY]: result.modifications
      })
    }

    merge (stateB) {
      const result = merge(this._state, this._modifications, stateB._state, stateB._modifications);
      this._state = result.state;
      this._modifications = result.modifications;
      return this
    }
  }

  var legibleMergeable = {
    Object (payload) {
      return MergeableObject.create(payload)
    },

    merge (stateA, stateB) {
      if (stateA instanceof MergeableObject && stateB instanceof MergeableObject) {
        return MergeableObject.merge(stateA, stateB)
      }
    },

    isObject (object) {
      return object instanceof MergeableObject
    },

    get _mergeFunction () {
      return { mergeObject: merge }
    },

    get KEY () {
      return {
        MODIFICATIONS: MODIFICATIONS_KEY
      }
    }
  };

  return legibleMergeable;

})));
