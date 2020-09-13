import util from './util'
import { MODIFICATIONS_KEY, POSITIONS_KEY, ID_KEY } from './constants'
import mergeArray from './merge-array'

export default class MergeableArray {
  constructor (state, positions, modifications) {
    this.state = state
    this.positions = positions
    this.modifications = modifications
  }

  static create (array) {
    let modifications = {}
    let positions = {}
    const state = util.deepCopy(array || [])

    const changesIndex = state.findIndex(item => {
      return util.hasKey(item, MODIFICATIONS_KEY) && util.hasKey(item, POSITIONS_KEY)
    })
    if (changesIndex > 0) {
      const metaItem = state.splice(changesIndex, 1)[0]
      modifications = util.parseChangeDates(metaItem[MODIFICATIONS_KEY])
      positions = metaItem[POSITIONS_KEY]
    }

    return new this(state, positions, modifications)
  }

  has (id) {
  }

  get (id) {
    if (this.has(id)) {
    }
  }

  push (element, date) {
    this.state.push(element)
    this.modifications[element[ID_KEY]] = util.newDate(date)
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
    const result = mergeArray({
      val: stateA.state,
      mod: stateA.modifications,
      pos: stateA.positions
    }, {
      val: stateB.state,
      mod: stateB.modifications,
      pos: stateB.positions
    })
    result.content.push({ [MODIFICATIONS_KEY]: result.mod, [POSITIONS_KEY]: result.pos })
    return MergeableArray.create(result.content)
  }

  merge (stateB) {
    const result = MergeableArray.merge(this, stateB)
    this.state = result.val
    this.modifications = result.mod
    this.positions = result.pos
    return this
  }
}
