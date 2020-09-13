import util from './util'
// import { CHANGES_KEY, MODIFICATIONS_KEY, POSITIONS_KEY } from './constants'
import { MODIFICATIONS_KEY as CHANGES_KEY } from './constants'
import mergeArray from './merge-array'

export default class MergeableArray {
  constructor (state, positions, modifications) {
    this.state = state
    this.positions = positions
    this.modifications = modifications
  }

  static create (array) {
    let changes = {}
    const state = util.deepCopy(array || [])

    const changesIndex = state.findIndex(item => util.hasKey(item, CHANGES_KEY))
    if (changesIndex > 0) {
      changes = util.parseChangeDates(state.splice(changesIndex, 1)[0][CHANGES_KEY])
    }

    return new this(state, changes)
  }

  has (id) {
  }

  get (id) {
    if (this.has(id)) {
    }
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
      { [CHANGES_KEY]: this.changes }
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
    const result = mergeArray(stateA.state, stateA.changes, stateB.state, stateB.changes)
    result.content.push({ [CHANGES_KEY]: result.changes })
    return MergeableArray.create(result.content)
  }

  merge (stateB) {
    const result = mergeArray(this.state, this.changes, stateB.state, stateB.changes)
    this.state = result.content
    this.changes = result.changes
    return this
  }
}
