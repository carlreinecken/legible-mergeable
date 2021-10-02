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

  function uniquenizeArray (array) {
    return [...new Set(array)]
  }

  function hasMarker (property) {
    return hasKey(property, MERGEABLE_MARKER) && isObject(property[MERGEABLE_MARKER])
  }

  function transformMergeable (dump, transformFn) {
    const result = {};

    for (const key in dump) {
      if (!hasKey(dump, key)) {
        continue
      }

      const property = dump[key];

      if (typeof property !== 'object') {
        result[key] = property;
      } else if (key === MERGEABLE_MARKER) {
        continue
      } else if (hasMarker(property)) {
        result[key] = transformFn ? transformFn(property) : transformMergeable(property);
      } else {
        result[key] = deepCopy(property);
      }
    }

    return result
  }

  function renew (mergeable, key, options) {
    options = options || {};

    touch(mergeable);

    mergeable[MERGEABLE_MARKER][key] = options.date || (new Date()).toISOString();
  }

  function touch (mergeable) {
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

  function modifications (mergeable) {
    return mergeable[MERGEABLE_MARKER] || {}
  }

  function size (mergeable) {
    return Object.keys(mergeable).length
  }

  function base (mergeable) {
    return transformMergeable(mergeable)
  }

  function clone (mergeable) {
    const transformed = transformMergeable(mergeable || {}, property => clone(property));

    if (hasKey(mergeable, MERGEABLE_MARKER)) {
      transformed[MERGEABLE_MARKER] = { ...mergeable[MERGEABLE_MARKER] };
    }

    return transformed
  }

  function filter (mergeable, callback) {
    const result = [];

    for (const key in mergeable) {
      if (!hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
        continue
      }

      if (callback(mergeable[key], key, modifications(mergeable)[key])) {
        result.push(mergeable[key]);
      }
    }

    return result
  }

  function map (mergeable, callback) {
    const result = [];

    touch(mergeable);

    for (const key in mergeable) {
      if (!hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
        continue
      }

      const evaluation = callback(mergeable[key], key, modifications(mergeable)[key]);

      result.push(evaluation);
    }

    return result
  }

  var mergeableFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    renew: renew,
    touch: touch,
    set: set,
    drop: drop,
    modifications: modifications,
    size: size,
    base: base,
    clone: clone,
    filter: filter,
    map: map
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

  function mergeFunction ({ a: docA, b: docB }) {
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

        continue
      }

      // The property in B is newer
      if (aChangedAt < bChangedAt) {
        setProperty(result, input.b.state, key);
        setModification(result, input.b.mods, key);

        continue
      }

      // The modification date is on both sides the same
      if (hasKey(input.a.mods, key)) {
        setModification(result, input.a.mods, key);
      }

      // Call the merge function recursively if both properties are Mergeables
      if (isPropertyMergeable(input.a.state[key]) && isPropertyMergeable(input.b.state[key])) {
        result[key] = mergeFunction({
          a: input.a.state[key],
          b: input.b.state[key]
        });

        continue
      }

      // The property is on both sides the same
      if (hasKey(input.a.state, key)) {
        result[key] = deepCopy(input.a.state[key]);
      }
      // else: The property is deleted on both sides
    }

    return result
  }

  function createProxy (dump, options) {
    const result = transformMergeable(dump, (item) => createProxy(item, options));

    result[MERGEABLE_MARKER] = { ...dump[MERGEABLE_MARKER] } || {};

    return getProxy(result, options)
  }

  function getProxy (mergeable, options) {
    return new Proxy(mergeable, {
      set (target, key, value, receiver) {
        if (value && hasMarker(value)) {
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

  var legibleMergeable = {
    merge (mergeableA, mergeableB) {
      return mergeFunction({ a: mergeableA, b: mergeableB })
    },

    MERGEABLE_MARKER,

    createProxy (mergeable, options) {
      return createProxy(mergeable, options)
    },

    ...mergeableFunctions
  };

  return legibleMergeable;

})));
