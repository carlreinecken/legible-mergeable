import util from './util'
import { MODIFICATIONS_KEY, POSITIONS_KEY, DEFAULT_ID_KEY } from './constants'
import mergeArray from './merge-array'
import positionFunctions from './position'
import LegibleMergeableError from './LegibleMergeableError'
import MergeableObject from './MergeableObject.class'

export default class MergeableArray {
  constructor (state, positions, modifications) {
    this._setDeserializedState(state)
    this._positions = positions
    this._modifications = modifications
  }

  /**
   * Creates a new instance from a base array, with or without a meta element.
   */
  static create (array) {
    let modifications = {}
    let positions = {}
    const state = util.deepCopy(array || [])

    const metaIndex = state.findIndex(item =>
      util.hasKey(item, MODIFICATIONS_KEY) &&
      util.hasKey(item, POSITIONS_KEY)
    )
    if (metaIndex !== -1) {
      const metaItem = state.splice(metaIndex, 1)[0]
      modifications = util.parseChangeDates(metaItem[MODIFICATIONS_KEY])
      positions = positionFunctions.decodeBase36(metaItem[POSITIONS_KEY])
    }

    return new this(state, positions, modifications)
  }

  state () {
    return this._state
  }

  has (id) {
    return this.get(id) != null
  }

  get (id) {
    return this._state.find(item => item.id() === id)
  }

  push (element, date) {
    const id = element[DEFAULT_ID_KEY]

    const prevItem = this._state[this._state.length - 1]
    const prevPosition = (prevItem) ? this._positions[prevItem.id()] : null
    this._positions[id] = positionFunctions.generate(prevPosition, null)

    this._state.push(MergeableObject.create(element))
    this._modifications[id] = util.newDate(date)
  }

  /*
   * @param afterId the element id of the left side of the new element
   *                set to null if it should be inserted at the beginning
   */
  insert (element, afterId, date) {
    let afterPosition = null
    let afterIndex = -1

    if (afterId != null) {
      afterIndex = this._state.findIndex(item => item.id() === afterId)
      if (afterIndex === -1) {
        throw new LegibleMergeableError('Could not find id ' + afterId + ' in array.')
      }
      afterPosition = this._positions[this._state[afterIndex].id()]
    }

    const beforeElement = this._state[afterIndex + 1]
    const beforePosition = beforeElement != null
      ? this._positions[beforeElement.id()]
      : null

    if (!(element instanceof MergeableObject)) {
      element = MergeableObject.create(element)
    }
    const id = element.id()
    this._state.splice(afterIndex + 1, 0, element)
    this._positions[id] = positionFunctions.generate(afterPosition, beforePosition)
    this._modifications[id] = util.newDate(date)
  }

  move (id, afterId, date) {
    const element = this._state.find(item => item.id() === id)

    if (element == null) {
      throw new LegibleMergeableError('Could not find id ' + id + ' in array.')
    }

    this.delete(id, date)
    this.insert(element, afterId, date)
  }

  reposition () {
    // TODO: set new positions for all elements and set all modification dates
  }

  delete (id, date) {
    const index = this._state.findIndex(item => item.id() === id)
    if (index === -1) {
      throw new LegibleMergeableError('Could not find id ' + id + ' in array.')
    }

    this._state.splice(index, 1)

    delete this._positions[id]
    this._modifications[id] = util.newDate(date)
  }

  size () {
    return this._state.length
  }

  /*
   * Is practical when working with the end of the list and
   * the id of the last element is needed.
   */
  last () {
    return this._state[this._state.length - 1]
  }

  /*
   * The state without the meta object, it's the "pure" document
   * @return the state
   */
  base () {
    return util.deepCopy(this._getSerializedState())
  }

  meta () {
    return util.deepCopy({
      [MODIFICATIONS_KEY]: this._modifications,
      [POSITIONS_KEY]: positionFunctions.encodeToBase36(this._positions)
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
      util.deepCopy(this._getSerializedState()),
      util.deepCopy(this._positions),
      util.deepCopy(this._modifications)
    )
  }

  static merge (a, b) {
    const result = mergeArray({
      val: a._getSerializedState(),
      mod: a._modifications,
      pos: a._positions
    }, {
      val: b._getSerializedState(),
      mod: b._modifications,
      pos: b._positions
    })
    return new MergeableArray(result.val, result.pos, result.mod)
  }

  merge (b) {
    const result = mergeArray({
      val: this._getSerializedState(),
      mod: this._modifications,
      pos: this._positions
    }, {
      val: b._getSerializedState(),
      mod: b._modifications,
      pos: b._positions
    })

    this._setDeserializedState(result.val)
    this._modifications = result.mod
    this._positions = result.pos

    return this
  }

  _getSerializedState () {
    return this._state.map(item => item.dump())
  }

  _setDeserializedState (items) {
    this._state = items.map(item => MergeableObject.create(item))
  }
}
