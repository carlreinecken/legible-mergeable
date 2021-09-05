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
    return (date ? new Date(date) : new Date()).toISOString()
  }

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function isPropertyMergeable (property) {
    return isObject(property) && isObject(property.modifications)
  }

  function mergeFunction (stateA, modificationsA, stateB, modificationsB) {
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
        result.state[prop] = mergeFunction(
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

  class Mergeable {
    static get MODIFICATIONS_KEY () {
      return '^m'
    }

    constructor (state, modifications) {
      this._state = transformDump(state, property => {
        const { state, modifications } = splitIntoStateAndModifications(property);

        return new Mergeable(state, modifications)
      });

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

    merge (stateB) {
      const result = mergeFunction(this._state, this._modifications, stateB._state, stateB._modifications);

      this._state = result.state;
      this._modifications = result.modifications;

      return this
    }
  }

  function splitIntoStateAndModifications (dump) {
    let modifications = {};
    const state = deepCopy(dump);

    if (hasKey(state, Mergeable.MODIFICATIONS_KEY)) {
      modifications = state[Mergeable.MODIFICATIONS_KEY];
      delete state[Mergeable.MODIFICATIONS_KEY];
    }

    return { modifications, state }
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
      const { state, modifications } = splitIntoStateAndModifications(dump || {});

      return new Mergeable(state, modifications)
    },

    merge (docA, docB) {
      if (!(docA instanceof Mergeable) || !(docB instanceof Mergeable)) {
        throw TypeError('One argument is not an instance of Mergeable')
      }

      const result = mergeFunction(docA._state, docA._modifications, docB._state, docB._modifications);

      return new Mergeable(deepCopy(result.state), result.modifications)
    }
  };

  exports.Mergeable = Mergeable;
  exports.legibleMergeable = legibleMergeable;
  exports.mergeFunction = mergeFunction;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
