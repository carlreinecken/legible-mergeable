(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['legible-mergeable'] = factory());
}(this, (function () { 'use strict';

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

  const CHANGES_KEY = '_changes';

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

  function merge (docA, docB) {
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

    result.val.sort((a, b) => result.pos[a[ID_KEY]] - result.pos[b[ID_KEY]]);

    return result
  }

  function merge$1 (docA, changesA, docB, changesB) {
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

  const TYPES = {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY'
  };

  class legibleMergeable {
    constructor (type, state, changes) {
      this.type = type;
      this.state = state;
      this.changes = changes;
    }

    static create (object) {
      if (Array.isArray(object)) {
        let changes = {};
        const state = util.deepCopy(object);

        const changesIndex = state.findIndex(item => util.hasKey(item, CHANGES_KEY));
        if (changesIndex > 0) {
          changes = util.parseChangeDates(state.splice(changesIndex, 1)[0][CHANGES_KEY]);
        }

        return new this(TYPES.ARRAY, state, changes)
      } else if (typeof object === 'object') {
        let changes = {};
        const state = util.deepCopy(object);

        if (util.hasKey(state, CHANGES_KEY)) {
          changes = util.parseChangeDates(state[CHANGES_KEY]);
          delete state[CHANGES_KEY];
        }

        return new this(TYPES.OBJECT, state, changes)
      }
    }

    clone () {
      return legibleMergeable.create(this.dump())
    }

    isObject () {
      return this.type === TYPES.OBJECT
    }

    isArray () {
      return this.type === TYPES.ARRAY
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
      if (this.isArray()) {
        throw new Error('set() was used on a mergeable array, set() is only for objects')
      }

      this.state[key] = value;
      this.changes[key] = new Date(date) || new Date();
    }

    delete (key, date) {
      delete this.state[key];
      this.changes[key] = new Date(date) || new Date();
    }

    add () {
    }

    replace () {
    }

    move () {
    }

    size () {
      if (this.isObject()) {
        return Object.keys(this.state).length
      }
    }

    /*
     * The state without the changes, it's the "pure" document
     * @return the state
     */
    toBase () {
      return util.deepCopy(this.state)
    }

    /*
     * Dumps the object or the array as native value
     * @return
     */
    dump () {
      if (this.isObject()) {
        return {
          ...this.state,
          [CHANGES_KEY]: this.changes
        }
      }

      if (this.isArray()) {
        return [
          ...this.state,
          { [CHANGES_KEY]: this.changes }
        ]
      }
    }

    toString () {
      return JSON.stringify(this.dump())
    }

    static merge (stateA, stateB) {
      if (stateA.isArray() && stateB.isArray()) {
        const result = merge(stateA.state, stateA.changes, stateB.state, stateB.changes);
        result.content.push({ [CHANGES_KEY]: result.changes });
        return legibleMergeable.create(result.content)
      } else if (stateA.isObject() && stateB.isObject()) {
        const result = merge$1(stateA.state, stateA.changes, stateB.state, stateB.changes);
        return legibleMergeable.create({
          ...result.content,
          [CHANGES_KEY]: result.changes
        })
      }
    }

    merge (stateB) {
      if (this.isArray() && stateB.isArray()) {
        const result = merge(this.state, this.changes, stateB.state, stateB.changes);
        this.state = result.content;
        this.changes = result.changes;
        return this
      } else if (this.isObject() && stateB.isObject()) {
        const result = merge$1(this.state, this.changes, stateB.state, stateB.changes);
        this.state = result.content;
        this.changes = result.changes;
        return this
      }
    }

    static _mergeDumps () {
      return { mergeArray: merge, mergeObject: merge$1 }
    }
  }

  return legibleMergeable;

})));
