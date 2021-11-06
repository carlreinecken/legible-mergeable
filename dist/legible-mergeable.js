(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const MERGEABLE_MARKER = '^lm';
  // TODO: Evaluate where this needs to be implemented: Property keys starting
  // with the MARKER are ignored when iterating over the mergeable.
  const POSITION_KEY = MERGEABLE_MARKER + '.position';

  const MERGE_RESULT_IS_IDENTICAL = 'MERGE_RESULT_IS_IDENTICAL';
  const WRONG_TYPE_GIVEN_EXPECTED_OBJECT = 'WRONG_TYPE_GIVEN_EXPECTED_OBJECT';

  const POSITION = {
    DEFAULT_MIN: 0,
    DEFAULT_MAX: parseInt('zzzzzz', 36),
    IDENTIFIER_SEPARATOR: ' ',
    INNER_RANGE_SIZE: 10000000
  };

  var constants = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MERGEABLE_MARKER: MERGEABLE_MARKER,
    POSITION_KEY: POSITION_KEY,
    MERGE_RESULT_IS_IDENTICAL: MERGE_RESULT_IS_IDENTICAL,
    WRONG_TYPE_GIVEN_EXPECTED_OBJECT: WRONG_TYPE_GIVEN_EXPECTED_OBJECT,
    POSITION: POSITION
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

  function modifications (mergeable, modifications) {
    if (!isObject(mergeable)) {
      return {}
    }

    if (isObject(modifications)) {
      mergeable[MERGEABLE_MARKER] = modifications;
    }

    if (hasKey(mergeable, MERGEABLE_MARKER)) {
      return mergeable[MERGEABLE_MARKER]
    }

    return {}
  }

  var apiFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    renew: renew,
    touch: touch,
    set: set,
    drop: drop,
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

  function generate (prevPos, nextPos) {
    prevPos = prevPos || [];
    nextPos = nextPos || [];

    if (prevPos.length > 0 && nextPos.length > 0 && compare(prevPos, nextPos) === 0) {
      throw new Error('Could not generate new position, no space available.')
    }

    const prevPosHead = (prevPos.length > 0) ? prevPos[0] : POSITION.DEFAULT_MIN;
    const nextPosHead = (nextPos.length > 0) ? nextPos[0] : POSITION.DEFAULT_MAX;

    const diff = Math.abs(prevPosHead - nextPosHead);
    let newPos = [prevPosHead];

    if (diff < POSITION.INNER_RANGE_SIZE * 2) {
      newPos = newPos.concat(generate(prevPos.slice(1), nextPos.slice(1)));
    } else {
      let min = prevPosHead + POSITION.INNER_RANGE_SIZE * 0.5;
      let max = prevPosHead + POSITION.INNER_RANGE_SIZE * 1.5;

      if (min > max) {
        const temp = min;
        min = max;
        max = temp;
      }

      newPos[0] = Math.floor(Math.random() * (max - (min + 1))) + min + 1;
    }

    return newPos
  }

  function compare (a, b) {
    const next = x => x.length > 1 ? x.slice(1) : [POSITION.DEFAULT_MIN];
    const diff = (a[0] || 0) - (b[0] || 0);

    if (diff === 0 && (a.length > 1 || b.length > 1)) {
      return compare(next(a), next(b))
    } else if (diff > 0) {
      return 1
    } else if (diff < 0) {
      return -1
    }

    return 0
  }

  function next (positions, positionMark) {
    let result = [POSITION.DEFAULT_MAX];

    for (const cursor of positions) {
      const cursorIsBiggerThanMark = compare(cursor, positionMark) === 1;
      const cursorIsLessThanResult = compare(cursor, result) === -1;

      if (cursorIsBiggerThanMark && cursorIsLessThanResult) {
        result = cursor;
      }
    }

    return result
  }

  /**
   * Transforms an `array` of objects to a mergeable. The elements are expected
   * to have the key for the mergeable preserved, the name can be defined by
   * `indexKey`. With the option `dropIndexKey` the key can be dropped if it only
   * was there temporarily. The mergeable will have no modifications set.
   */
  function fromArray (array, indexKey, options) {
    options = options || {};
    const dropIndexKey = options.dropIndexKey === true;

    const mergeable = {};

    for (const element of array) {
      if (!isObject(element)) {
        continue
      }

      const key = element[indexKey];
      mergeable[key] = element;

      if (dropIndexKey) {
        delete mergeable[key][indexKey];
      }
    }

    return mergeable
  }

  /**
   * Transforms the `mergeable` to an ordered array with its elements. The order
   * is defined by the positions of the elements. The position is expected to be
   * on the positionKey or fallbacks to the default. The marker is ignored, if
   * the mergeable should be rebuild later, the modifications need to be preserved
   * separately. The `indexKey` can be defined which preserves the key in the
   * element itself, otherwise the original mergeable can't be rebuild. This isn't
   * needed if the key is already inside the element.
   */
  function toArray (mergeable, options) {
    options = options || {};
    const indexKey = options.indexKey;
    const positionKey = options.positionKey || POSITION_KEY;

    const array = [];

    for (const key in mergeable) {
      if (key === MERGEABLE_MARKER || !hasKey(mergeable, key)) {
        continue
      }

      const element = mergeable[key];

      if (indexKey) {
        element[indexKey] = key;
      }

      array.push(element);
    }

    return sort(positionKey, array)
  }

  /**
   * Counts all elements of the mergeable and ignores the marker.
   */
  function size (mergeable) {
    let counter = 0;

    for (const key in mergeable) {
      if (hasKey(mergeable, key) && key !== MERGEABLE_MARKER) {
        counter++;
      }
    }

    return counter
  }

  /**
   * Filters the `mergeable` and returns an array of elements. It invokes for each
   * element the `callback` to only keep the elements, where a truthy value is
   * returned. The marker is skipped.
   * The `callback` is invoked with: (element, key, modification).
   */
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

  /**
   * Maps over `mergeable` by invoking for each element the `callback` and returns
   * an array of the return values of the callbacks. The marker is skipped.
   * The `callback` is invoked with: (element, key, modification).
   */
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

  /**
   * Reduces the `mergeable` to a accumulated value by invoking for each element
   * the `callback`. If `accumulator` is not given, any element of `mergeable` is
   * used as the initial value. The marker is skipped.
   * The `callback` is invoked with: (accumulator, element, key, modification).
   */
  function reduce (mergeable, callback, accumulator) {
    for (const key in mergeable) {
      if (!hasKey(mergeable, key) || key === MERGEABLE_MARKER) {
        continue
      }

      if (accumulator == null) {
        accumulator = mergeable[key];
      }

      const modification = modifications(mergeable)[key];
      accumulator = callback(accumulator, mergeable[key], key, modification);
    }

    return accumulator
  }

  /**
   * Returns the element with the lowest position. The position of the elements
   * is expected to be under the name given in the option `positionKey` or
   * it fallbacks to the default.
   */
  function first (mergeable, options) {
    options = options || {};
    const positionKey = options.positionKey || POSITION_KEY;

    return reduce(mergeable, (accumulator, element) => {
      if (element[positionKey] == null) {
        return accumulator
      }

      const smallerStays = compare(accumulator[positionKey], element[positionKey]) === -1;
      return smallerStays ? accumulator : element
    })
  }

  /**
   * Returns the element with the highest position. The position of the elements
   * is expected to be under the name given in the option `positionKey` or
   * it fallbacks to the default.
   */
  function last (mergeable, options) {
    options = options || {};
    const positionKey = options.positionKey || POSITION_KEY;

    return reduce(mergeable, (accumulator, element) => {
      if (element[positionKey] == null) {
        return accumulator
      }

      const highestStays = compare(accumulator[positionKey], element[positionKey]) === 1;
      return highestStays ? accumulator : element
    })
  }

  /**
   * Generates a position on the mergeable element with the given key. The
   * new position is located after the element of `afterKey` and before the
   * element after it. If `afterKey` is `null`, the element is set to
   * the beginning. The positions are expected to be under the name given in the
   * option `positionKey` or it fallbacks to the default.
   */
  function move (mergeable, key, afterKey, options) {
    options = options || {};
    const positionKey = options.positionKey || POSITION_KEY;

    let afterPosition = null;

    if (afterKey != null) {
      if (!hasKey(mergeable, afterKey)) {
        throw new Error(`Could not find id ${afterKey} in mergeable.`)
      }

      afterPosition = mergeable[afterKey][positionKey];
    }

    const currentPosition = mergeable[key][positionKey];
    const allPositions = getAllPositionsExcept(mergeable, currentPosition, positionKey);

    const beforePosition = next(allPositions, afterPosition || []);
    const position = generate(afterPosition, beforePosition);

    set(mergeable[key], positionKey, position, options);
  }

  /**
   * Generates new positions for all elements in the mergeable. The positions are
   * expected to be under the name given in the option `positionKey` or it
   * fallbacks to the default.
   *
   * @todo
   */
  function reposition (mergeable, key, options) {
    // options = options || {}
    // const positionKey = options.positionKey || POSITION_KEY
    // TODO: implement reposition()
  }

  /**
   * Generates a position on the mergeable element with the given key, which will
   * be located after the highest position. The positions are expected to be under
   * the name given in the option `positionKey` or it fallbacks to the default.
   */
  function push (mergeable, key, options) {
    options = options || {};
    const positionKey = options.positionKey || POSITION_KEY;

    const lastElement = last(mergeable, options);
    const afterPosition = lastElement.position;
    const position = generate(afterPosition, null);

    set(mergeable[key], positionKey, position, options);
  }

  /**
   * This function does not exist, because of two reasons:
   *   1. With `move(mergeable, key, null)` the same is achievable
   *   2. The position generating algorithm starts using the lower numbers first
   *      so it would find itself quickly in nested positions. It is strongly
   *      recommended to only push new elements and just reverse the order later.
   */
  // function unshift () {}

  /* =================== NOT EXPORTED FUNCTIONS =================== */

  function sort (positionKey, array) {
    array.sort((a, b) => {
      if (!hasKey(a, positionKey) || !hasKey(b, positionKey)) {
        throw new Error(`Sorting failed. Position key ${positionKey} is missing on element.`)
      }

      return compare(a[positionKey], b[positionKey])
    });

    return array
  }

  function getAllPositionsExcept (mergeable, excludedPosition, positionKey) {
    return map(mergeable, property => property[positionKey])
      .filter(position => {
        // Include all positions if no current position is set
        if (position && !excludedPosition) {
          return true
        }

        // Exclude the current position
        if (excludedPosition && position.toString() !== excludedPosition.toString()) {
          return true
        }

        return false
      })
  }

  var apiArrayFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fromArray: fromArray,
    toArray: toArray,
    size: size,
    filter: filter,
    map: map,
    reduce: reduce,
    first: first,
    last: last,
    move: move,
    reposition: reposition,
    push: push
  });

  var main = {
    ...constants,

    merge (mergeableA, mergeableB) {
      if (!isObject(mergeableA) || !isObject(mergeableB)) {
        throw new TypeError(WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
      }

      return mergeFunction(mergeableA, mergeableB).result
    },

    mergeOrFail (mergeableA, mergeableB) {
      if (!isObject(mergeableA) || !isObject(mergeableB)) {
        throw new TypeError(WRONG_TYPE_GIVEN_EXPECTED_OBJECT)
      }

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
