import util from './util'
import { MODIFICATIONS_KEY, DEFAULT_ID_KEY } from './constants'
import mergeObject from './merge-object'

export default class MergeableObject {
  constructor (state, changes) {
    this.state = state
    this.changes = util.parseChangeDates(changes)
  }

  static create (object) {
    let changes = {}
    const state = util.deepCopy(object)

    if (util.hasKey(state, MODIFICATIONS_KEY)) {
      changes = state[MODIFICATIONS_KEY]
      delete state[MODIFICATIONS_KEY]
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
    this.state[key] = value
    this.changes[key] = util.newDate(date)
  }

  delete (key, date) {
    delete this.state[key]
    this.changes[key] = util.newDate(date)
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
    const result = mergeObject(stateA.state, stateA.changes, stateB.state, stateB.changes)
    return MergeableObject.create({
      ...result.content,
      [MODIFICATIONS_KEY]: result.changes
    })
  }

  merge (stateB) {
    const result = mergeObject(this.state, this.changes, stateB.state, stateB.changes)
    this.state = result.content
    this.changes = result.changes
    return this
  }
}
