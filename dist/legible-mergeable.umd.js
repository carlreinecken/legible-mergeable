(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const MERGEABLE_MARKER = '^lm';

  // TODO: Evaluate where this needs to be implemented: Property keys starting
  // with the MARKER are ignored when iterating over the mergeable.
  const POSITION_KEY = MERGEABLE_MARKER + '.position';

  const OPERATIONS = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
    RECOVER: 'RECOVER',
    CHANGE: 'CHANGE',
    MERGE: 'MERGE'
  };

  var constants = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MERGEABLE_MARKER: MERGEABLE_MARKER,
    POSITION_KEY: POSITION_KEY,
    OPERATIONS: OPERATIONS
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

  function swap (a, b) {
    return [b, a]
  }

  /*
   * Both the minimum and maximum are exclusive.
   */
  function randomInt (min, max) {
    if (min > max) {
      [min, max] = swap(min, max);
    }

    return Math.floor(Math.random() * (max - (min + 1))) + min + 1
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

  class MergeableError extends Error {
    constructor (message) {
      super(message);
      this.name = this.constructor.name;
    }
  }

  class MergeResultIdenticalError extends MergeableError {
    constructor () {
      super('Result of merge is identical.');
    }
  }

  class MergeableExpectedObjectError extends MergeableError {
    constructor () {
      super('Wrong type given, expected value of type object.');
    }
  }

  class KeyNotFoundInMergableError extends MergeableError {
    constructor (payload) {
      super(`Could not find id ${payload.key} in mergeable.`);
      this.payload = payload;
    }
  }

  class PositionMissingInMergableError extends MergeableError {
    constructor (payload) {
      super(`Position key ${payload.positionKey} is missing on property.`);
      this.payload = payload;
    }
  }

  class PositionHasNoRoomError extends MergeableError {
    constructor () {
      super('Failed to generate new position, no room left.');
    }
  }

  var errors = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MergeableError: MergeableError,
    MergeResultIdenticalError: MergeResultIdenticalError,
    MergeableExpectedObjectError: MergeableExpectedObjectError,
    KeyNotFoundInMergableError: KeyNotFoundInMergableError,
    PositionMissingInMergableError: PositionMissingInMergableError,
    PositionHasNoRoomError: PositionHasNoRoomError
  });

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
      throw new MergeableExpectedObjectError()
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

  /**
   * Return all keys except (of course) the MERGEABLE_MARKER.
   */
  function keys (mergeable) {
    return Object.keys(mergeable).filter((key) => key !== MERGEABLE_MARKER)
  }

  /**
   * Return all keys which are not present in the object but have
   * modifications. These keys were removed in the past and are kept
   * for merges with mergeables which may not know that they are deleted.
   */
  function tombstones (mergeable) {
    return Object.keys(modifications(mergeable))
      .filter((key) => !hasKey(mergeable, key))
  }

  /**
   * Checks if the mergeable has the given key.
   * It returns null if it is checked for the modification MERGEABLE_MARKER.
   */
  function has (mergeable, key) {
    if (key === MERGEABLE_MARKER) {
      return null
    }

    return hasKey(mergeable, key)
  }

  /**
   * It returns the modifications of the mergeable. If modifications are passed
   * as argument they get set on the mergeable.
   */
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
    keys: keys,
    tombstones: tombstones,
    has: has,
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

  function setModification (resultRef, key, mods) {
    resultRef[MERGEABLE_MARKER][key] = mods[key];
  }

  function setProperty (resultRef, key, state) {
    if (hasKey(state, key)) {
      if (isPropertyMergeable(state[key])) {
        resultRef[key] = clone(state[key]);
      } else {
        resultRef[key] = deepCopy(state[key]);
      }
    }
  }

  function setOperations (operationsRef, key, state, otherState, otherMod, options) {
    if (!options.detailed) {
      return
    }

    if (hasKey(state, key)) {
      if (hasKey(otherState, key)) {
        operationsRef[key] = OPERATIONS.CHANGE;
      } else if (options.includeRecoverOperation && hasKey(otherMod, key)) {
        operationsRef[key] = OPERATIONS.RECOVER;
      } else {
        operationsRef[key] = OPERATIONS.ADD;
      }
    } else if (hasKey(otherState, key)) {
      operationsRef[key] = OPERATIONS.REMOVE;
    } else ;
  }

  function mergeFunction (docA, docB, options) {
    options = options || {};

    let isIdentical = true;

    const operations = { a: {}, b: {} };

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

      if (aChangedAt > bChangedAt) {
        // The property in A is newer
        setModification(result, key, input.a.mods);
        setProperty(result, key, input.a.state);
        setOperations(operations.a, key, input.a.state, input.b.state, input.b.mods, options);

        isIdentical = false;

        continue
      }

      if (aChangedAt < bChangedAt) {
        // The property in B is newer
        setModification(result, key, input.b.mods);
        setProperty(result, key, input.b.state);
        setOperations(operations.b, key, input.b.state, input.a.state, input.a.mods, options);

        isIdentical = false;

        continue
      }

      if (hasKey(input.a.mods, key)) {
        // The modification date is on both sides the same
        setModification(result, key, input.a.mods);
      }

      // Call the merge function recursively if both properties are Mergeables
      if (isPropertyMergeable(input.a.state[key]) && isPropertyMergeable(input.b.state[key])) {
        const property = mergeFunction(input.a.state[key], input.b.state[key]);

        result[key] = property.result;

        isIdentical = isIdentical && property.isIdentical;

        if (options.detailed && !property.isIdentical) {
          // TODO: this is untested
          operations.a[key] = OPERATIONS.MERGE;
          operations.b[key] = OPERATIONS.MERGE;
        }

        continue
      }

      if (hasKey(input.a.state, key)) {
        // The property should be the same on both sides
        result[key] = deepCopy(input.a.state[key]);
      }
    }

    return {
      result,
      isIdentical,
      operations: (options.detailed) ? operations : null
    }
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

  const MAX_SIZE = maxSizeAtDepth(0);
  const MIN_SIZE = 0;
  const SAFE_ZONE = Math.pow(2, 10);
  const SAFE_ZONE_BORDER_BUFFER_FACTOR = 0.25;
  const SAFE_ZONE_SPACE_BUFFER_FACTOR = 0.75;

  function maxSizeAtDepth (depth) {
    // The MAX SIZE increases exponentially with every additional level of depth
    return Math.pow(2, 15 + depth)
  }

  function generate (previous, next, depth) {
    depth = depth || 0;
    previous = previous || [MIN_SIZE];
    next = next || [maxSizeAtDepth(depth)];

    const compared = compare(previous, next);

    if (previous.length > 0 && next.length > 0 && compared === 0) {
      throw new PositionHasNoRoomError()
    }

    // In depth 0 compare the positions and switch them if necessary (previous should be smaller)
    if (compared === 1 && depth === 0) {
      [previous, next] = swap(previous, next);
    }

    const previousHead = (previous.length > 0) ? previous[0] : MIN_SIZE;
    const nextHead = (next.length > 0) ? next[0] : maxSizeAtDepth(depth);

    const diff = Math.abs(previousHead - nextHead);

    // If the zone size is not big enough, it creates a new depth level
    if (diff < SAFE_ZONE) {
      const headsAreSame = previousHead === nextHead;

      // If the heads are different the next depth does not need to consider
      // the other segments of the nextPosition. E.g. [0,6] & [1,4] should
      // generate a number between [0,6]-[0,MAX] not between [0,4]-[0,8].
      next = headsAreSame ? next.slice(1) : [];
      previous = previous.slice(1);

      const generatedSegments = generate(previous, next, depth + 1);

      return [previousHead, ...generatedSegments]
    }

    let min, max;

    // The boundary allocation strategy is decided by the eveness of the depth.
    // It creates a safe zone either from the left or right boundary. The safe
    // zone is further narrowed down by 25% from the start and 25% to the end
    // of the safe zone.
    if (depth % 2 === 0) {
      // If the depth is even, it will insert at the left side of the sequence.
      min = previousHead + SAFE_ZONE * SAFE_ZONE_BORDER_BUFFER_FACTOR;
      max = previousHead + SAFE_ZONE * SAFE_ZONE_SPACE_BUFFER_FACTOR;
    } else {
      // If the depth is odd, it will insert at the right side of the sequence.
      min = nextHead - SAFE_ZONE * SAFE_ZONE_SPACE_BUFFER_FACTOR;
      max = nextHead - SAFE_ZONE * SAFE_ZONE_BORDER_BUFFER_FACTOR;
    }

    return [randomInt(min, max)]
  }

  function compare (a, b) {
    const next = x => x.length > 1 ? x.slice(1) : [MIN_SIZE];
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
    let result = [MAX_SIZE];

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
      if (isObject(element) && !indexKey) {
        continue
      }

      const key = indexKey ? element[indexKey] : element;
      mergeable[key] = element;

      if (indexKey && dropIndexKey) {
        delete mergeable[key][indexKey];
      }
    }

    return mergeable
  }

  /**
   * Transforms the `mergeable` to a sorted array with its elements. The order
   * is defined by the positions of the elements. The position is expected to be
   * on the positionKey or fallbacks to the default.
   *
   * The marker is ignored, so if the mergeable should be rebuild later, the
   * modifications need to be preserved separately. The `indexKey` can be
   * defined which preserves the key in the element itself, this isn't needed
   * if the key is already inside the element.
   */
  function sorted (mergeable, options) {
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
        throw new KeyNotFoundInMergableError({ key: afterKey })
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
    // IDEA: this could take over the functionality that push() currently has: only
    //       generate a position for a given key. but then this would be
    //       opinionated to "reposition" at the end...
  }

  /**
   * Generates a position on the mergeable element with the given key, which will
   * be located after the highest position. The positions are expected to be under
   * the name given in the option `positionKey` or it fallbacks to the default.
   * TODO: why the f* did i make this weird that no value can be passed?
   */
  function push (mergeable, key, options) {
    options = options || {};
    const positionKey = options.positionKey || POSITION_KEY;

    const lastElement = last(mergeable, options);
    const afterPosition = lastElement[positionKey];
    const position = generate(afterPosition, null);

    set(mergeable[key], positionKey, position, options);
  }

  /**
   * This function does not exist (yet), because with
   * `move(mergeable, key, null)` the same is achievable.
   * TODO: implement as alias
   */
  // function unshift () {}

  /* =================== NOT EXPORTED FUNCTIONS =================== */

  function sort (positionKey, array) {
    return array.sort((a, b) => {
      if (!hasKey(a, positionKey) || !hasKey(b, positionKey)) {
        // TODO: be more gentle, rather sort by a key as fallback.
        //       but where to get it?! the sorted function could have an option
        //       like `fallbackSortKey`, but what if the key is still not there?
        // IDEA: just use the "key" in the sorted() function as fallback
        throw new PositionMissingInMergableError({ positionKey })
      }

      return compare(a[positionKey], b[positionKey])
    })
  }

  function getAllPositionsExcept (mergeable, excludedPosition, positionKey) {
    return map(mergeable, property => property[positionKey])
      .filter(position => {
        // Include all positions if no current position is set
        if (position && !excludedPosition) {
          return true
        }

        // Exclude the current position
        if (excludedPosition && position && position.toString() !== excludedPosition.toString()) {
          return true
        }

        return false
      })
  }

  var apiArrayFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fromArray: fromArray,
    sorted: sorted,
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

    ...errors,

    merge (mergeableA, mergeableB) {
      if (!isObject(mergeableA) || !isObject(mergeableB)) {
        throw new MergeableExpectedObjectError()
      }

      return mergeFunction(mergeableA, mergeableB).result
    },

    mergeOrFail (mergeableA, mergeableB) {
      if (!isObject(mergeableA) || !isObject(mergeableB)) {
        throw new MergeableExpectedObjectError()
      }

      const { result, isIdentical } = mergeFunction(mergeableA, mergeableB);

      if (isIdentical) {
        throw new MergeResultIdenticalError()
      }

      return result
    },

    mergeForDetails (mergeableA, mergeableB, options) {
      options = options || { includeRecoverOperation: false };
      options.detailed = true;

      if (!isObject(mergeableA) || !isObject(mergeableB)) {
        throw new MergeableExpectedObjectError()
      }

      return mergeFunction(mergeableA, mergeableB, options)
    },

    createProxy,

    ...apiFunctions,

    ...apiArrayFunctions
  };

  return main;

})));
