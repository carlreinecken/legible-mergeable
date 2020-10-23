(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.legibleMergeable = factory());
}(this, (function () { 'use strict';

  const DEFAULT_ID_KEY = 'id';

  const POSITIONS_KEY = '^p';
  const MODIFICATIONS_KEY = '^m';

  const POSITION_DEFAULT_MIN = 0;
  const POSITION_DEFAULT_MAX = parseInt('zzzzzz', 36);
  const POSITION_IDENTIFIER_SEPARATOR = ',';
  const POSITION_INNER_RANGE_SIZE = 10000000;

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

  var util = {
    hasKey,
    deepCopy,
    parseChangeDates,
    newDate
  };

  function merge (docA, changesA, docB, changesB) {
    const changes = { a: changesA, b: changesB };
    const resultChanges = {};
    const result = {};

    const properties = [...new Set([].concat(
      Object.keys(docA),
      Object.keys(changes.a),
      Object.keys(docB),
      Object.keys(changes.b)
    ))];

    for (const prop of properties) {
      const aChangeAt = changes.a[prop] ? new Date(changes.a[prop]) : null;
      const bChangeAt = changes.b[prop] ? new Date(changes.b[prop]) : null;

      if (aChangeAt > bChangeAt) {
        if (util.hasKey(docA, prop)) {
          result[prop] = docA[prop];
        }
        resultChanges[prop] = aChangeAt;
      } else if (aChangeAt < bChangeAt) {
        if (util.hasKey(docB, prop)) {
          result[prop] = docB[prop];
        }
        resultChanges[prop] = bChangeAt;
      } else {
        if (util.hasKey(docA, prop)) {
          result[prop] = docA[prop];
        } else if (util.hasKey(docB, prop)) {
          result[prop] = docB[prop];
        }

        if (!util.hasKey(resultChanges, prop)) {
          if (util.hasKey(changes.a, prop)) {
            resultChanges[prop] = aChangeAt;
          } else if (util.hasKey(changes.b, prop)) {
            resultChanges[prop] = bChangeAt;
          }
        }
      }
    }

    return { content: result, changes: resultChanges }
  }

  class MergeableObject {
    constructor (state, changes) {
      this.state = state;
      this.changes = util.parseChangeDates(changes);
    }

    static create (object) {
      let changes = {};
      const state = util.deepCopy(object);

      if (util.hasKey(state, MODIFICATIONS_KEY)) {
        changes = state[MODIFICATIONS_KEY];
        delete state[MODIFICATIONS_KEY];
      }

      return new this(state, changes)
    }

    has (key) {
      return util.hasKey(this.state, key)
    }

    get (key) {
      if (this.has(key)) {
        return this.state[key]
      }
    }

    set (key, value, date) {
      this.state[key] = value;
      this.changes[key] = util.newDate(date);
    }

    delete (key, date) {
      delete this.state[key];
      this.changes[key] = util.newDate(date);
    }

    id () {
      return this.state[DEFAULT_ID_KEY]
    }

    size () {
      return Object.keys(this.state).length
    }

    /*
     * The state without the changes, it's the "pure" document
     * @return the state
     */
    base () {
      return util.deepCopy(this.state)
    }

    /*
     * Dumps the object as native value
     * @return
     */
    dump () {
      if (Object.keys(this.changes).length === 0) {
        return this.state
      }

      return {
        ...this.state,
        [MODIFICATIONS_KEY]: this.changes
      }
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    clone () {
      return new MergeableObject(util.deepCopy(this.state), util.deepCopy(this.changes))
    }

    static merge (stateA, stateB) {
      const result = merge(stateA.state, stateA.changes, stateB.state, stateB.changes);
      return MergeableObject.create({
        ...result.content,
        [MODIFICATIONS_KEY]: result.changes
      })
    }

    merge (stateB) {
      const result = merge(this.state, this.changes, stateB.state, stateB.changes);
      this.state = result.content;
      this.changes = result.changes;
      return this
    }
  }

  class LegibleMergeableError extends Error {
    constructor (message) {
      super(message);
      this.name = 'LegibleMergeableError';
    }
  }

  function generate (prevPos, nextPos) {
    prevPos = prevPos || [];
    nextPos = nextPos || [];

    if (prevPos.length > 0 && nextPos.length > 0 && compare(prevPos, nextPos) === 0) {
      throw new LegibleMergeableError('Could not generate new position, no space available.')
    }

    const prevPosHead = (prevPos.length > 0) ? prevPos[0] : POSITION_DEFAULT_MIN;
    const nextPosHead = (nextPos.length > 0) ? nextPos[0] : POSITION_DEFAULT_MAX;

    const diff = Math.abs(prevPosHead - nextPosHead);
    let newPos = [prevPosHead];

    if (diff < POSITION_INNER_RANGE_SIZE * 2) {
      newPos = newPos.concat(generate(prevPos.slice(1), nextPos.slice(1)));
    } else {
      let min = prevPosHead + POSITION_INNER_RANGE_SIZE * 0.5;
      let max = prevPosHead + POSITION_INNER_RANGE_SIZE * 1.5;

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
    const next = x => x.length > 1 ? x.slice(1) : [POSITION_DEFAULT_MIN];
    const diff = a[0] - b[0];

    if (diff === 0 && (a.length > 1 || b.length > 1)) {
      return compare(next(a), next(b))
    } else if (diff > 0) {
      return 1
    } else if (diff < 0) {
      return -1
    }

    return 0
  }

  function decodeBase36 (object) {
    const result = {};
    for (const [key, list] of Object.entries(object)) {
      result[key] = list
        .split(POSITION_IDENTIFIER_SEPARATOR)
        .map(string => parseInt(string, 36));
    }
    return result
  }

  function encodeToBase36 (object) {
    const result = {};
    for (const [key, list] of Object.entries(object)) {
      result[key] = list
        .map(number => number.toString(36))
        .join(POSITION_IDENTIFIER_SEPARATOR);
    }
    return result
  }

  var positionFunctions = {
    generate,
    compare,
    decodeBase36,
    encodeToBase36
  };

  function foo (object) {
    let changes = {};
    const state = util.deepCopy(object);

    if (util.hasKey(state, MODIFICATIONS_KEY)) {
      changes = util.parseChangeDates(state[MODIFICATIONS_KEY]);
      delete state[MODIFICATIONS_KEY];
    }

    return { changes, state }
  }

  function mergeObjects (a, b) {
    a = foo(a);
    b = foo(b);

    const merged = merge(a.state, a.changes, b.state, b.changes);
    if (Object.keys(merged.changes).length === 0) {
      return merged.content
    }

    return {
      ...merged.content,
      [MODIFICATIONS_KEY]: merged.changes
    }
  }

  function getModifications (a, b) {
    const result = {
      inserted: {},
      deleted: {},
      moved: {}
    };

    for (const [id, change] of Object.entries(a.changes)) {
      if (!util.hasKey(b.changes, id) && !b.values.has(id) && a.values.has(id)) {
        result.inserted[id] = {
          val: a.values.get(id),
          pos: a.positions[id],
          mod: change
        };
        continue
      }

      // abort if the other lists has a newer change
      // this is also important to enusre that only the newest deletion is considered
      if (change < (b.changes[id] || null)) {
        continue
      }

      if (!a.values.has(id)) {
        result.deleted[id] = change;
        continue
      }

      if (a.values.has(id) &&
        b.values.has(id) &&
        a.positions[id] !== b.positions[id]
      ) {
        result.moved[id] = {
          pos: a.positions[id],
          mod: change
        };
      }
    }

    return result
  }

  function getAllModifications (a, b) {
    const modA = getModifications(a, b);
    const modB = getModifications(b, a);

    return {
      inserted: { ...modA.inserted, ...modB.inserted },
      deleted: { ...modA.deleted, ...modB.deleted },
      moved: { ...modA.moved, ...modB.moved }
    }
  }

  function getIdsMap (doc) {
    return new Map(doc.map(item => [item[DEFAULT_ID_KEY], item]))
  }

  function merge$1 (docA, docB) {
    const input = {
      a: { positions: docA.pos, changes: docA.mod, values: getIdsMap(docA.val) },
      b: { positions: docB.pos, changes: docB.mod, values: getIdsMap(docB.val) }
    };

    const modifications = getAllModifications(input.a, input.b);
    // console.log(modifications)

    const ids = [...new Set([].concat(
      Array.from(input.a.values.keys()),
      Array.from(input.b.values.keys()),
      Object.keys(input.a.changes),
      Object.keys(input.b.changes)
    ))];
    // console.log(ids)

    /*
     * Build result values
     */

    const result = { val: [], mod: {}, pos: {} };

    for (const id of ids) {
      if (util.hasKey(modifications.deleted, id)) {
        result.mod[id] = modifications.deleted[id];
        continue
      }

      if (util.hasKey(modifications.inserted, id)) {
        result.val.push(modifications.inserted[id].val);
        if (modifications.inserted[id].pos) {
          result.pos[id] = modifications.inserted[id].pos;
        }
        result.mod[id] = modifications.inserted[id].mod;
        continue
      }

      if (util.hasKey(modifications.moved, id)) {
        result.val.push(mergeObjects(input.a.values.get(id), input.b.values.get(id)));
        if (modifications.moved[id].pos) {
          result.pos[id] = modifications.moved[id].pos;
        }
        result.mod[id] = modifications.moved[id].mod;
        continue
      }

      /*
       * No array action:
       * However the objects are either different or are the same.
       */

      let source;
      if (input.a.values.has(id)) source = 'a';
      if (input.b.values.has(id)) source = 'b';
      if (!source) continue

      if (input.a.values.has(id) && input.b.values.has(id)) {
        result.val.push(mergeObjects(input.a.values.get(id), input.b.values.get(id)));
      } else {
        result.val.push(input[source].values.get(id));
      }

      if (input[source].positions[id]) {
        result.pos[id] = input[source].positions[id];
      }
      if (util.hasKey(input[source].changes, id)) {
        result.mod[id] = input[source].changes[id];
      }
    }

    /*
     * Order elements by position
     */

    if (Object.keys(result.pos).length > 0) {
      result.val.sort((a, b) => positionFunctions.compare(
        result.pos[a[DEFAULT_ID_KEY]],
        result.pos[b[DEFAULT_ID_KEY]]
      ));
    }

    return result
  }

  class MergeableArray {
    constructor (state, positions, modifications) {
      this._setDeserializedState(state);
      this._positions = positions;
      this._modifications = util.parseChangeDates(modifications);
    }

    /**
     * Creates a new instance from a base array, with or without a meta element.
     */
    static create (array) {
      let modifications = {};
      let positions = {};
      const state = util.deepCopy(array || []);

      const metaIndex = state.findIndex(item =>
        util.hasKey(item, MODIFICATIONS_KEY) &&
        util.hasKey(item, POSITIONS_KEY)
      );
      if (metaIndex !== -1) {
        const metaItem = state.splice(metaIndex, 1)[0];
        modifications = metaItem[MODIFICATIONS_KEY];
        positions = positionFunctions.decodeBase36(metaItem[POSITIONS_KEY]);
      }

      return new this(state, positions, modifications)
    }

    has (id) {
      return this.get(id) != null
    }

    get (id) {
      return this._state.find(item => item.id() === id)
    }

    push (element, date) {
      const id = element[DEFAULT_ID_KEY];

      const prevItem = this._state[this._state.length - 1];
      const prevPosition = (prevItem) ? this._positions[prevItem.id()] : null;
      this._positions[id] = positionFunctions.generate(prevPosition, null);

      this._state.push(MergeableObject.create(element));
      this._modifications[id] = util.newDate(date);
    }

    /*
     * @param afterId the element id of the left side of the new element
     *                set to null if it should be inserted at the beginning
     */
    insert (element, afterId, date) {
      let afterPosition = null;
      let afterIndex = -1;

      if (afterId != null) {
        afterIndex = this._state.findIndex(item => item.id() === afterId);
        if (afterIndex === -1) {
          throw new LegibleMergeableError('Could not find id ' + afterId + ' in array.')
        }
        afterPosition = this._positions[this._state[afterIndex].id()];
      }

      const beforeElement = this._state[afterIndex + 1];
      const beforePosition = beforeElement != null
        ? this._positions[beforeElement.id()]
        : null;

      if (!(element instanceof MergeableObject)) {
        element = MergeableObject.create(element);
      }
      const id = element.id();
      this._state.splice(afterIndex + 1, 0, element);
      this._positions[id] = positionFunctions.generate(afterPosition, beforePosition);
      this._modifications[id] = util.newDate(date);
    }

    move (id, afterId, date) {
      const element = this._state.find(item => item.id() === id);

      if (element == null) {
        throw new LegibleMergeableError('Could not find id ' + id + ' in array.')
      }

      this.delete(id, date);
      this.insert(element, afterId, date);
    }

    reposition () {
      // TODO: set new positions for all elements and set all modification dates
    }

    delete (id, date) {
      const index = this._state.findIndex(item => item.id() === id);
      if (index === -1) {
        throw new LegibleMergeableError('Could not find id ' + id + ' in array.')
      }

      this._state.splice(index, 1);

      delete this._positions[id];
      this._modifications[id] = util.newDate(date);
    }

    size () {
      return this._state.length
    }

    /*
     * Is practical when working with the end of the list and
     * the id of the last element is needed.
     */
    last () {
      return this._state[this._state.length - 1]
    }

    first () {
      return this._state[0]
    }

    /*
     * Not serialized state with all MergeableObject. Do not change things here!
     */
    state () {
      return this._state
    }

    /*
     * The state without the meta object, it's the "pure" document
     * @return the state
     */
    base () {
      return util.deepCopy(this._getSerializedState())
    }

    meta () {
      return util.deepCopy({
        [MODIFICATIONS_KEY]: this._modifications,
        [POSITIONS_KEY]: positionFunctions.encodeToBase36(this._positions)
      })
    }

    /*
     * Dumps the array as native value
     * @return
     */
    dump () {
      return [
        ...this.base(),
        this.meta()
      ]
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    clone () {
      return new MergeableArray(
        util.deepCopy(this._getSerializedState()),
        util.deepCopy(this._positions),
        util.deepCopy(this._modifications)
      )
    }

    static merge (a, b) {
      const result = merge$1({
        val: a._getSerializedState(),
        mod: a._modifications,
        pos: a._positions
      }, {
        val: b._getSerializedState(),
        mod: b._modifications,
        pos: b._positions
      });

      return new MergeableArray(result.val, result.pos, result.mod)
    }

    merge (b) {
      const result = merge$1({
        val: this._getSerializedState(),
        mod: this._modifications,
        pos: this._positions
      }, {
        val: b._getSerializedState(),
        mod: b._modifications,
        pos: b._positions
      });

      this._setDeserializedState(result.val);
      this._modifications = result.mod;
      this._positions = result.pos;

      return this
    }

    _getSerializedState () {
      return this._state.map(item => item.dump())
    }

    _setDeserializedState (items) {
      this._state = items.map(item => MergeableObject.create(item));
    }
  }

  var index = {
    Array (payload) {
      return MergeableArray.create(payload)
    },

    Object (payload) {
      return MergeableObject.create(payload)
    },

    merge (stateA, stateB) {
      if (stateA instanceof MergeableArray && stateB instanceof MergeableArray) {
        return MergeableArray.merge(stateA, stateB)
      } else if (stateA instanceof MergeableObject && stateB instanceof MergeableObject) {
        return MergeableObject.merge(stateA, stateB)
      }
    },

    get _mergeFunction () {
      return { mergeArray: merge$1, mergeObject: merge }
    },

    get _positionFunctions () {
      return positionFunctions
    },

    get KEY () {
      return {
        MODIFICATIONS: MODIFICATIONS_KEY,
        POSITIONS: POSITIONS_KEY
      }
    }
  };

  return index;

})));
