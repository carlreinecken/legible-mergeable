import util from './util'
import { MODIFICATIONS_KEY, POSITIONS_KEY, DEFAULT_ID_KEY } from './constants'
import mergeArray from './merge-array'
import position from './position'

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

    const metaIndex = state.findIndex(item =>
      util.hasKey(item, MODIFICATIONS_KEY) &&
      util.hasKey(item, POSITIONS_KEY)
    )
    if (metaIndex > 0) {
      const metaItem = state.splice(metaIndex, 1)[0]
      modifications = util.parseChangeDates(metaItem[MODIFICATIONS_KEY])
      positions = position.decodeToBase36(metaItem[POSITIONS_KEY])
    }

    return new this(state, positions, modifications)
  }

  has (id) {
    return this.state.find(item => item.id === id) != null
  }

  get (id) {
    return util.deepCopy(this.state.find(item => item.id === id))
  }

  reposition () {
    // set new positions for all elements and set all modification dates
  }

  push (element, date) {
    const id = element[DEFAULT_ID_KEY]

    const prevItem = this.state[this.state.length - 1]
    const prevPosition = (prevItem) ? this.positions[prevItem[DEFAULT_ID_KEY]] : null
    this.positions[id] = position.generate(prevPosition, null)

    this.state.push(element)
    this.modifications[id] = util.newDate(date)
  }

  insert (element, afterId, date) {
  }

  replace (element, replacedId, date) {
  }

  delete (id, date) {
  }

  last () {
  }

  size () {
  }

  /*
   * The state without the meta object, it's the "pure" document
   * @return the state
   */
  base () {
    return util.deepCopy(this.state)
  }

  meta () {
    return util.deepCopy({
      [MODIFICATIONS_KEY]: this.modifications,
      [POSITIONS_KEY]: position.encodeToBase36(this.positions)
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
