import util from './util'
import { CHANGES_KEY } from './constants'
import { mergeArray, mergeArrayIm, mergeObject } from './merge'

const TYPES = {
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY'
}

export default class legibleMergeable {
  constructor (type, state, changes) {
    this.type = type
    this.state = state
    this.changes = changes
  }

  static create (object) {
    if (Array.isArray(object)) {
      let changes = {}
      const state = util.deepCopy(object)

      const changesIndex = state.findIndex(item => util.hasKey(item, CHANGES_KEY))
      if (changesIndex > 0) {
        changes = util.parseChangeDates(state.splice(changesIndex, 1)[0][CHANGES_KEY])
      }

      return new this(TYPES.ARRAY, state, changes)
    } else if (typeof object === 'object') {
      let changes = {}
      const state = util.deepCopy(object)

      if (util.hasKey(state, CHANGES_KEY)) {
        changes = util.parseChangeDates(state[CHANGES_KEY])
        delete state[CHANGES_KEY]
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

    this.state[key] = value
    this.changes[key] = new Date(date) || new Date()
  }

  delete (key, date) {
    delete this.state[key]
    this.changes[key] = new Date(date) || new Date()
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
      const result = mergeArray(stateA.state, stateA.changes, stateB.state, stateB.changes)
      result.content.push({ [CHANGES_KEY]: result.changes })
      return legibleMergeable.create(result.content)
    } else if (stateA.isObject() && stateB.isObject()) {
      const result = mergeObject(stateA.state, stateA.changes, stateB.state, stateB.changes)
      return legibleMergeable.create({
        ...result.content,
        [CHANGES_KEY]: result.changes
      })
    }
  }

  merge (stateB) {
    if (this.isArray() && stateB.isArray()) {
      const result = mergeArray(this.state, this.changes, stateB.state, stateB.changes)
      this.state = result.content
      this.changes = result.changes
      return this
    } else if (this.isObject() && stateB.isObject()) {
      const result = mergeObject(this.state, this.changes, stateB.state, stateB.changes)
      this.state = result.content
      this.changes = result.changes
      return this
    }
  }

  static mergeDumps () {
    return { mergeArray: mergeArray, mergeArrayIm: mergeArrayIm, mergeObject: mergeObject }
  }
}
