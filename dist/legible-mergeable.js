(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['legible-mergeable'] = factory());
}(this, (function () { 'use strict';

  const POSITIONS_KEY = '^p';
  const MODIFICATIONS_KEY = '^m';
  const ID_KEY = 'id';
  const DEFAULT_MIN_POSITION = parseInt('0', 36);
  // in base10 -> 46655
  const DEFAULT_MAX_POSITION = parseInt('zzz', 36);
  // should be divideable by three
  const THRESHOLD_NEW_POSITION_DEPTH = 3 * 3;

  function hasKey (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  function deepCopy (value) {
    return JSON.parse(JSON.stringify(value))
  }

  function parseChangeDates (changes) {
    return Object.keys(changes).reduce((acc, key) => {
      return { ...acc, [key]: new Date(changes[key]) }
    }, {})
  }

  function newDate (date) {
    return new Date(date) || new Date()
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
      this.changes = changes;
    }

    static create (object) {
      let changes = {};
      const state = util.deepCopy(object);

      if (util.hasKey(state, MODIFICATIONS_KEY)) {
        changes = util.parseChangeDates(state[MODIFICATIONS_KEY]);
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
      this.changes[key] = new Date(date) || new Date();
    }

    delete (key, date) {
      delete this.state[key];
      this.changes[key] = new Date(date) || new Date();
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
          val: a.values.get(id),
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

  function getIdsMap (doc, idKey) {
    return new Map(doc.map(item => [item[idKey], item]))
  }

  function merge$1 (docA, docB) {
    const ID_KEY = 'id';
    const result = { val: [], mod: {}, pos: {} };
    const input = {
      a: { positions: docA.pos, changes: docA.mod, values: getIdsMap(docA.val, ID_KEY) },
      b: { positions: docB.pos, changes: docB.mod, values: getIdsMap(docB.val, ID_KEY) }
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

    for (const id of ids) {
      if (util.hasKey(modifications.deleted, id)) {
        result.mod[id] = modifications.deleted[id];
        continue
      }

      if (util.hasKey(modifications.inserted, id)) {
        result.val.push(modifications.inserted[id].val);
        result.pos[id] = modifications.inserted[id].pos;
        result.mod[id] = modifications.inserted[id].mod;
        continue
      }

      if (util.hasKey(modifications.moved, id)) {
        result.val.push(modifications.moved[id].val);
        result.pos[id] = modifications.moved[id].pos;
        result.mod[id] = modifications.moved[id].mod;
        continue
      }

      let source;
      if (input.a.values.has(id)) source = 'a';
      if (input.b.values.has(id)) source = 'b';
      if (!source) continue

      result.val.push(input[source].values.get(id));
      result.pos[id] = input[source].positions[id];
      if (util.hasKey(input[source].changes, id)) {
        result.mod[id] = input[source].changes[id];
      }
    }

    result.val.sort((a, b) => {
      return result.pos[a[ID_KEY]] - result.pos[b[ID_KEY]]
      // TODO: if not same id and substraction is 0, then compare mod dates
    });

    return result
  }

  class MergeableArray {
    constructor (state, positions, modifications) {
      this.state = state;
      this.positions = positions;
      this.modifications = modifications;
    }

    static create (array) {
      let modifications = {};
      let positions = {};
      const state = util.deepCopy(array || []);

      const changesIndex = state.findIndex(item => {
        return util.hasKey(item, MODIFICATIONS_KEY) && util.hasKey(item, POSITIONS_KEY)
      });
      if (changesIndex > 0) {
        const metaItem = state.splice(changesIndex, 1)[0];
        modifications = util.parseChangeDates(metaItem[MODIFICATIONS_KEY]);
        positions = metaItem[POSITIONS_KEY];
      }

      return new this(state, positions, modifications)
    }

    has (id) {
    }

    get (id) {
      if (this.has(id)) ;
    }

    push (element, date) {
      this.state.push(element);
      this.modifications[element[ID_KEY]] = util.newDate(date);
      // this.generatePosition(index)
    }

    insert (element, afterId, date) {
    }

    replace (element, replacedId, date) {
    }

    delete (id, date) {
    }

    move (id, afterId, date) {
    }

    last () {
    }

    size () {
    }

    /*
     * The state without the changes, it's the "pure" document
     * @return the state
     */
    base () {
      return util.deepCopy(this.state)
    }

    meta () {
      return util.deepCopy({
        [MODIFICATIONS_KEY]: this.modifications,
        [POSITIONS_KEY]: this.positions
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
        util.deepCopy(this.state),
        util.deepCopy(this.positions),
        util.deepCopy(this.modifications)
      )
    }

    static merge (stateA, stateB) {
      const result = merge$1({
        val: stateA.state,
        mod: stateA.modifications,
        pos: stateA.positions
      }, {
        val: stateB.state,
        mod: stateB.modifications,
        pos: stateB.positions
      });
      result.content.push({ [MODIFICATIONS_KEY]: result.mod, [POSITIONS_KEY]: result.pos });
      return MergeableArray.create(result.content)
    }

    merge (stateB) {
      const result = MergeableArray.merge(this, stateB);
      this.state = result.val;
      this.modifications = result.mod;
      this.positions = result.pos;
      return this
    }
  }

  class LegibleMergeableError extends Error {
    constructor (message) {
      super(message);
      this.name = 'LegibleMergeableError';
    }
  }

  /* How Positions are generated and compared
   *
   * Based on CRDT LOGOOT sequence algorithm.
   * Numbers are encoded in base36 to save character space.
   *
   *    // identifiers: A < B < C
   *    { A: [1], B: [1, 5], C: [2] }
   *
   *    // identifiers with a random "unique" number encoded in base36
   *    { A: ['a4'], B: ['a4'], ['n1'], C: ['a5'] }
   */

  const encodeBase36 = (number) => number.toString(36);
  const decodeBase36 = (string) => parseInt(string, 36);
  const decodeBase36Array = (list) => list.map(value => decodeBase36(value));
  const encodeBase36Array = (list) => list.map(value => encodeBase36(value));

  // function randomIntBetween (min, max) {
  //   return Math.floor(Math.random() * (max - (min + 1))) + min + 1
  // }

  function randomIntInMiddleThirdBetween (min, max) {
    const diff = Math.abs(min - max);
    const third = Math.floor(diff * 0.3);
    min = min + third;
    const result = Math.floor(Math.random() * ((max - third) - (min + 1))) + min + 1;
    return result
  }

  function generate (prevPos, nextPos) {
    console.log('generate()', prevPos, nextPos);

    if (prevPos.length > 0 && nextPos.length > 0 && compare(prevPos, nextPos) === 0) {
      throw new LegibleMergeableError('Could not generate new position, no space available.')
    }

    // 4-1 4-2
    const prevPosHead = prevPos[0] || DEFAULT_MIN_POSITION;
    const nextPosHead = nextPos[0] || DEFAULT_MAX_POSITION;

    const diff = Math.abs(prevPosHead - nextPosHead);
    console.log('diff', diff);
    let newPos = [prevPosHead];

    if (diff < THRESHOLD_NEW_POSITION_DEPTH) {
      newPos = newPos.concat(generate(prevPos.slice(1), nextPos.slice(1)));
    } else {
      newPos[0] = randomIntInMiddleThirdBetween(prevPosHead, nextPosHead);
    }

    return newPos
  }

  function generatePosition (prevPos, nextPos) {
    console.log(prevPos, nextPos);
    const prevPosInt = decodeBase36Array(prevPos);
    const nextPosInt = decodeBase36Array(nextPos);

    return encodeBase36Array(generate(prevPosInt, nextPosInt))
  }

  function comparePositions (a, b) {
    return compare(decodeBase36Array(a), decodeBase36Array(b))
  }

  function compare (a, b) {
    const next = x => x.length > 1 ? x.slice(1) : [DEFAULT_MIN_POSITION];
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

  var positionFunctions = {
    generatePosition,
    comparePositions
  };

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
