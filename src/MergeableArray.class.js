import util from './util'
import { MODIFICATIONS_KEY, POSITIONS_KEY, DEFAULT_ID_KEY } from './constants'
import mergeArray from './merge-array'
import position from './position'
import LegibleMergeableError from './LegibleMergeableError'

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
    let afterPosition = null
    let afterIndex = -1

    if (afterId != null) {
      afterIndex = this.state.findIndex(item => item[DEFAULT_ID_KEY] === afterId)
      if (afterIndex === -1) {
        throw new LegibleMergeableError('Could not find id ' + afterId + ' in array.')
      }
      afterPosition = this.positions[this.state[afterIndex][DEFAULT_ID_KEY]]
    }

    const beforeElement = this.state[afterIndex + 1]
    const beforePosition = beforeElement != null
      ? this.positions[beforeElement[DEFAULT_ID_KEY]]
      : null

    const id = element[DEFAULT_ID_KEY]
    this.state.splice(afterIndex + 1, 0, element)
    this.positions[id] = position.generate(afterPosition, beforePosition)
    this.modifications[id] = util.newDate(date)
  }

  move (id, afterId, date) {
  }

  delete (id, date) {
  }

  size () {
    return this.state.length
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
