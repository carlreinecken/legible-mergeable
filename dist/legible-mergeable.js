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

  function mergeArrayIm (docA, changesA, docB, changesB) {
  }

  function mergeArray (docA, changesA, docB, changesB) {
    const docs = {
      a: docA.map(item => item.id),
      b: docB.map(item => item.id)
    };
    const changes = { a: changesA, b: changesB };

    const resultIds = [];
    let counter = 0;

    const hasNext = (side) => docs[side][0] != null;
    // TODO: check if shift makes perfomance O(n^2) otherwise use index counter instead
    const shift = (side) => docs[side].shift();
    const shiftBoth = () => {
      shift('a');
      return shift('b')
    };
    const getChange = (side, id) => changes[side][id]
      ? new Date(changes[side][id])
      : null;

    while (hasNext('a') || hasNext('b')) {
      const id = { a: docs.a[0], b: docs.b[0] };
      const change = {
        a: { a: getChange('a', id.a), b: getChange('a', id.b) },
        b: { a: getChange('b', id.a), b: getChange('b', id.b) }
      };

      const win = (side, origin) => {
        // console.log(id.a, id.b, side, origin)
        resultIds.push(shift(side));
      };
      // console.log(id.a, id.b, '...')

      if (id.a === id.b && (change.a.a || new Date()).getTime() ===
        (change.b.b || new Date()).getTime()) {
        // console.log(id.a, id.b, 'both')
        resultIds.push(shiftBoth()); continue
      }

      if (resultIds.includes(id.a)) {
        shift('a'); continue
      }

      if (resultIds.includes(id.b)) {
        shift('b'); continue
      }

      if (change.a.a && !change.b.a && !docs.b.includes(id.a)) {
        // a has an addition
        if (change.b.b && !change.a.b && !docs.b.includes(id.b)) {
          // both have an addition
          if (change.a.a > change.b.b) {
            // b is younger
            win('b'); continue
          } else if (change.a.a < change.b.b) {
            // a is younger
            win('a'); continue
          }
        } else {
          // only a has an addition
          win('a'); continue
        }
      }

      if (change.b.b && !change.a.b && !docs.a.includes(id.b)) {
        // b has an addition
        if (change.a.a && !change.b.a && !docs.b.includes(id.a)) {
          // both have an addition
          if (change.b.b > change.a.a) {
            // a is younger
            win('a'); continue
          } else if (change.b.b < change.a.a) {
            // b is younger
            win('b'); continue
          }
        } else {
          // only b has an addition
          win('b'); continue
        }
      }

      // TODO: check if perfomance is better with a map instead of includes
      if (change.b.a && change.a.a < change.b.a && !docs.b.includes(id.a)) {
        // A was deleted
        shift('a'); continue
      }

      if (change.a.b && change.b.b < change.a.b && !docs.a.includes(id.b)) {
        // B was deleted
        shift('b'); continue
      }

      // TODO: rewrite comments to variables
      if (change.a.b > change.b.b) {
        // in list A item B was moved
        if (change.b.a > change.a.a) {
          // conflict: in list A item A was moved
          shiftBoth(); continue
        }
        win('a'); continue
      } else if (change.a.b < change.b.b) {
        // in list B item B was moved
        if (change.b.a < change.a.a) {
          // conflict: in list A item A was moved
          shiftBoth(); continue
        }
        win('b'); continue
      } else if (change.b.a > change.a.a) {
        // in list B item B was moved
        if (change.a.b > change.b.b) {
          // conflict: in list A item B was moved
          shiftBoth(); continue
        }
        win('b'); continue
      } else if (change.b.a < change.a.a) {
        // in list A item A was moved
        if (change.a.b < change.b.b) {
          // conflict: in list B item A was moved
          shiftBoth(); continue
        }
        win('a'); continue
      }

      // TODO: throw error?
      console.warn(id, 'was not caught by any condition', change);

      if (counter++ > docs.a.length + docs.b.length) {
        break
      }
    }

    // TODO: merge duplicate objects
    const result = resultIds.map(id => {
      const entry = docA.find(item => item.id === id);
      return (entry == null) ? docB.find(item => item.id === id) : entry
    });

    const allIds = docA.concat(
      docB,
      Object.keys(changes.a),
      Object.keys(changes.b)
    ).map(item => {
      if (typeof item === 'object' && item.id) {
        return item.id
      } else if (typeof item === 'string') {
        return item
      }
    });

    const resultChanges = allIds.reduce((obj, id) => {
      const previousChange = getChange('a', id) > getChange('b', id)
        ? changes.a[id]
        : changes.b[id];

      if (previousChange == null) {
        return obj
      }

      return { ...obj, [id]: new Date(previousChange) }
    }, {});

    return { content: result, changes: resultChanges }
  }

  function mergeObject (docA, changesA, docB, changesB) {
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
        const result = mergeArray(stateA.state, stateA.changes, stateB.state, stateB.changes);
        result.content.push({ [CHANGES_KEY]: result.changes });
        return legibleMergeable.create(result.content)
      } else if (stateA.isObject() && stateB.isObject()) {
        const result = mergeObject(stateA.state, stateA.changes, stateB.state, stateB.changes);
        return legibleMergeable.create({
          ...result.content,
          [CHANGES_KEY]: result.changes
        })
      }
    }

    merge (stateB) {
      if (this.isArray() && stateB.isArray()) {
        const result = mergeArray(this.state, this.changes, stateB.state, stateB.changes);
        this.state = result.content;
        this.changes = result.changes;
        return this
      } else if (this.isObject() && stateB.isObject()) {
        const result = mergeObject(this.state, this.changes, stateB.state, stateB.changes);
        this.state = result.content;
        this.changes = result.changes;
        return this
      }
    }

    static mergeDumps () {
      return { mergeArray: mergeArray, mergeArrayIm: mergeArrayIm, mergeObject: mergeObject }
    }
  }

  return legibleMergeable;

})));
