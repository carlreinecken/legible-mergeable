(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const MERGEABLE_MARKER = '^lm';

  const MERGE_RESULT_IS_IDENTICAL = 'MERGE_RESULT_IS_IDENTICAL';
  const WRONG_TYPE_GIVEN_EXPECTED_OBJECT = 'WRONG_TYPE_GIVEN_EXPECTED_OBJECT';

  var constants = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MERGEABLE_MARKER: MERGEABLE_MARKER,
    MERGE_RESULT_IS_IDENTICAL: MERGE_RESULT_IS_IDENTICAL,
    WRONG_TYPE_GIVEN_EXPECTED_OBJECT: WRONG_TYPE_GIVEN_EXPECTED_OBJECT
  });

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

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function hasMarker (property) {
    return hasKey(property, MERGEABLE_MARKER) && isObject(property[MERGEABLE_MARKER])
  }

  function transformMergeable (dump, transformFn) {
    const result = {};

    if (!isObject(dump)) {
      dump = {};
    }

    for (const key in dump) {
      if (!hasKey(dump, key)) {
        continue
      }

      const property = dump[key];

      if (!isObject(property)) {
        result[key] = property;
      } else if (key === MERGEABLE_MARKER) {
        continue
      } else if (hasMarker(property)) {
        result[key] = transformFn
          ? transformFn(property)
          : transformMergeable(property);
      } else {
        result[key] = deepCopy(property);
      }
    }

    return result
  }

  function renew (mergeable, keys, options) {
    options = options || {};

    touch(mergeable);

    keys = Array.isArray(keys) ? keys : [keys];

    for (const key of keys) {
      mergeable[MERGEABLE_MARKER][key] = options.date || (new Date()).toISOString();
    }
  }

  function touch (mergeable) {
    if (!isObject(mergeable)) {
      throw new TypeError(WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
    }

    if (!hasKey(mergeable, MERGEABLE_MARKER)) {
      mergeable[MERGEABLE_MARKER] = {};
    }

    return mergeable
  }

  function set (mergeable, key, value, options) {
    mergeable[key] = value;

    renew(mergeable, key, options);
  }

  function drop (mergeable, key, options) {
    delete mergeable[key];

    renew(mergeable, key, options);
  }

  function size (mergeable) {
    return Object.keys(mergeable).length
  }

  function base (mergeable) {
    return transformMergeable(mergeable)
  }

  function clone (mergeable) {
    const transformed = transformMergeable(mergeable, property => clone(property));

    if (isObject(mergeable) && hasKey(mergeable, MERGEABLE_MARKER)) {
      transformed[MERGEABLE_MARKER] = { ...mergeable[MERGEABLE_MARKER] };
    }

    return transformed
  }

  function modifications (mergeable) {
    if (!isObject(mergeable) || !hasKey(mergeable, MERGEABLE_MARKER)) {
      return {}
    }

    return mergeable[MERGEABLE_MARKER]
  }

  var apiFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    renew: renew,
    touch: touch,
    set: set,
    drop: drop,
    size: size,
    base: base,
    clone: clone,
    modifications: modifications
  });

  function isPropertyMergeable (property) {
    return isObject(property) && hasMarker(property)
  }

  function stateWithoutMarker (state) {
    const result = { ...state };
    delete result[MERGEABLE_MARKER];

    return result
  }

  function setModification (resultReference, mods, key) {
    resultReference[MERGEABLE_MARKER][key] = mods[key];
  }

  function setProperty (resultReference, state, key) {
    if (hasKey(state, key)) {
      if (isPropertyMergeable(state[key])) {
        resultReference[key] = clone(state[key]);
      } else {
        resultReference[key] = deepCopy(state[key]);
      }
    }
    // else: The property was deleted
  }

  function mergeFunction (docA, docB) {
    let isIdentical = true;

    const input = {
      a: { state: stateWithoutMarker(docA), mods: docA[MERGEABLE_MARKER] || {} },
      b: { state: stateWithoutMarker(docB), mods: docB[MERGEABLE_MARKER] || {} }
    };

    const result = { [MERGEABLE_MARKER]: {} };

    const properties = uniquenizeArray([].concat(
      Object.keys(input.a.state),
      Object.keys(input.a.mods),
      Object.keys(input.b.state),
      Object.keys(input.b.mods)
    ));

    for (const key of properties) {
      const aChangedAt = input.a.mods[key] ? new Date(input.a.mods[key]) : null;
      const bChangedAt = input.b.mods[key] ? new Date(input.b.mods[key]) : null;

      // The property in A is newer
      if (aChangedAt > bChangedAt) {
        setProperty(result, input.a.state, key);
        setModification(result, input.a.mods, key);

        isIdentical = false;

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        setProperty(result, input.b.state, key);
        setModification(result, input.b.mods, key);

        isIdentical = false;

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a.mods, key)) {
        setModification(result, input.a.mods, key);
      }

      // Call the merge function recursively if both properties are Mergeables
      if (isPropertyMergeable(input.a.state[key]) && isPropertyMergeable(input.b.state[key])) {
        const property = mergeFunction(input.a.state[key], input.b.state[key]);

        result[key] = property.result;

        isIdentical = isIdentical && property.isIdentical;

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a.state, key)) {
        result[key] = deepCopy(input.a.state[key]);
      }
      // else: The property was deleted on both sides
    }

    return { result, isIdentical }
  }

  function createProxy (dump, options) {
    const result = transformMergeable(dump, (item) => createProxy(item, options));

    result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {};

    return getProxy(result, options)
  }

  function getProxy (mergeable, options) {
    return new Proxy(mergeable, {
      set (target, key, value, receiver) {
        if (value && isObject(value) && hasMarker(value)) {
          value = createProxy(value, options);
        }

        renew(target, key, options);

        return Reflect.set(target, key, value, receiver)
      },

      deleteProperty (target, key) {
        renew(target, key, options);

        return Reflect.deleteProperty(target, key)
      },

      getOwnPropertyDescriptor (target, key) {
        if (key === MERGEABLE_MARKER) {
          return { enumerable: false, configurable: true, writable: true }
        }

        return Reflect.getOwnPropertyDescriptor(target, key)
      }
    })
  }

  function filter (mergeable, callback) {
    const result = [];

    for (const key in mergeable) {
      if (!hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
        continue
      }

      const modification = modifications(mergeable)[key];

      if (!callback || callback(mergeable[key], key, modification)) {
        result.push(mergeable[key]);
      }
    }

    return result
  }

  function map (mergeable, callback) {
    const result = [];

    for (const key in mergeable) {
      if (!hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
        continue
      }

      const modification = modifications(mergeable)[key];
      const evaluation = callback(mergeable[key], key, modification);

      result.push(evaluation);
    }

    return result
  }

  var apiArrayFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    filter: filter,
    map: map
  });

  var main = {
    ...constants,

    merge (mergeableA, mergeableB) {
      return mergeFunction(mergeableA, mergeableB).result
    },

    mergeOrFail (mergeableA, mergeableB) {
      const { result, isIdentical } = mergeFunction(mergeableA, mergeableB);

      if (isIdentical) {
        throw new Error(MERGE_RESULT_IS_IDENTICAL)
      }

      return result
    },

    createProxy,

    ...apiFunctions,

    ...apiArrayFunctions
  };

  return main;

})));
