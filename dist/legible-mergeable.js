(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['legible-mergeable'] = factory());
}(this, (function () { 'use strict';

  const POSITIONS_KEY = '^p';
  const MODIFICATIONS_KEY = '^m';

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

  var util = {
    hasKey,
    deepCopy,
    parseChangeDates
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
    toBase () {
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
      let changes = {};
      const state = util.deepCopy(array || []);

      const changesIndex = state.findIndex(item => util.hasKey(item, MODIFICATIONS_KEY));
      if (changesIndex > 0) {
        changes = util.parseChangeDates(state.splice(changesIndex, 1)[0][MODIFICATIONS_KEY]);
      }

      return new this(state, changes)
    }

    has (id) {
    }

    get (id) {
      if (this.has(id)) ;
    }

    delete (id, date) {
    }

    insert (element, afterId, date) {
    }

    replace (element, replacedId, date) {
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
    toBase () {
      return util.deepCopy(this.state)
    }

    /*
     * Dumps the array as native value
     * @return
     */
    dump () {
      return [
        ...this.state,
        { [MODIFICATIONS_KEY]: this.changes }
      ]
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    clone () {
      return new this(
        util.deepCopy(this.state),
        util.deepCopy(this.changes)
      )
    }

    static merge (stateA, stateB) {
      const result = merge$1(stateA.state, stateA.changes, stateB.state, stateB.changes);
      result.content.push({ [MODIFICATIONS_KEY]: result.changes });
      return MergeableArray.create(result.content)
    }

    merge (stateB) {
      const result = merge$1(this.state, this.changes, stateB.state, stateB.changes);
      this.state = result.content;
      this.changes = result.changes;
      return this
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

    get KEY () {
      return {
        MODIFICATIONS: MODIFICATIONS_KEY,
        POSITIONS: POSITIONS_KEY
      }
    }
  };

  return index;

})));
