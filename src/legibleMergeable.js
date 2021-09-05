import { MODIFICATIONS_KEY } from './constants'
import mergeObject from './merge-object'
import * as util from './util'
import { transformDump, transformInternalState, splitIntoStateAndModifications } from './transform-util'

export default class legibleMergeable {
  constructor (state, modifications) {
    this._state = transformDump(state, property => legibleMergeable.create(property))

    this._modifications = modifications
  }

  static create (dump) {
    const { state, modifications } = splitIntoStateAndModifications(dump)

    return new this(state, modifications)
  }

  has (key) {
    return util.hasKey(this._state, key)
  }

  get (key, fallback) {
    if (this.has(key)) {
      return this._state[key]
    }

    return fallback
  }

  set (key, value, date) {
    this._state[key] = value
    this._modifications[key] = util.newDate(date)
  }

  delete (key, date) {
    delete this._state[key]
    this._modifications[key] = util.newDate(date)
  }

  /*
   * Returns a proxy to make it possible to directly work on the state.
   * Useful for e.g. the vue v-model.
   */
  get use () {
    return new Proxy(this, {
      get (target, prop) {
        return target._state[prop]
      },

      set (target, prop, value) {
        target.set(prop, value)
        return true
      },

      deleteProperty (target, prop) {
        target.delete(prop)
        return true
      }
    })
  }

  size () {
    return Object.keys(this._state).length
  }

  /*
   * The state without the modifications, it's the "pure" document
   */
  base () {
    return transformInternalState(this._state, property => property.base())
  }

  meta () {
    return { [MODIFICATIONS_KEY]: { ...this._modifications } }
  }

  /*
   * Dumps the object as native simple object
   */
  dump () {
    return {
      ...transformInternalState(this._state, property => property.dump()),
      [MODIFICATIONS_KEY]: this._modifications
    }
  }

  toString () {
    return JSON.stringify(this.dump())
  }

  toJSON () {
    return this.dump()
  }

  clone () {
    // eslint-disable-next-line new-cap
    return new legibleMergeable(util.deepCopy(this._state), { ...this._modifications })
  }

  static merge (stateA, stateB) {
    const result = mergeObject(stateA._state, stateA._modifications, stateB._state, stateB._modifications)

    return new this(util.deepCopy(result.state), result.modifications)
  }

  merge (stateB) {
    const result = mergeObject(this._state, this._modifications, stateB._state, stateB._modifications)

    this._state = result.state
    this._modifications = result.modifications

    return this
  }

  static get _mergeFunction () {
    return mergeObject
  }

  static get KEY () {
    return {
      MODIFICATIONS: MODIFICATIONS_KEY
    }
  }
}
