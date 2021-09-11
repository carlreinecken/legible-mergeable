import * as util from './util'
import { MERGEABLE_MARKER } from './constants'

/*
 *               |------------|
 *               |            |
 *               |  Mergeable |
 *               |            |
 *               |      ^     |
 *               |-- ~  | ~ --|
 *               |      v     |
 *       <----   |            |  <----
 * Dump          |  Transfer  |         Merge Function
 *       ---->   |            |  ---->
 *               |------------|
*/

function switchCaseProperties (property, transformCondition, transformFunction) {
  if (typeof property !== 'object') {
    console.log('switchCaseProperties/noObject', typeof property, property)
    return property
  }

  if (transformCondition(property)) {
    console.log('switchCaseProperties/trCnd', property)
    return transformFunction(property)
  }

  if (property.__isMergeable === true) {
    console.log('switchCaseProperties/__isMergeable', property)
    // this is the problem
    return createTransferObject(property._state, property._modifications)
  }

  console.log('switchCaseProperties/deepCopy', property)
  return util.deepCopy(property)
}

export function createTransferObject (state, modifications) {
  return {
    _state: { ...state },
    _modifications: { ...modifications } || {},
    __isMergeable: true
  }
}

export function fromDump (dump, transformFunction) {
  transformFunction = transformFunction || (property => property)
  const transformCondition = (property) => util.isObject(property) && util.isObject(property[MERGEABLE_MARKER])

  console.log('fromDump/beforeLoop', dump)

  const state = {}
  let modifications

  for (const key in dump) {
    if (!util.hasKey(dump, key)) {
      continue
    }

    if (key === MERGEABLE_MARKER) {
      modifications = dump[MERGEABLE_MARKER]
      continue
    }

    state[key] = switchCaseProperties(
      dump[key],
      transformCondition,
      (property) => fromDump(property, transformFunction)
    )
  }

  console.log('fromDump/afterLoop', state)

  return transformFunction(createTransferObject(state, modifications))
}

/*
 * Convert from Transfer to e.g. Mergeable, Dump or Base
 */
export function fromTransfer (transfer, transformFunction) {
  const transformCondition = (property) => property.__isMergeable === true
  const state = {}

  // console.log('fromTransfer')

  for (const key in transfer._state) {
    if (!util.hasKey(transfer._state, key)) {
      continue
    }

    // TODO: is this even necessary?!
    // if (!transformCondition(transfer._state[key])) {
    //   state[key] = transfer._state[key]
    //   continue
    // }

    state[key] = switchCaseProperties(
      transfer._state[key],
      transformCondition,
      (property) => fromTransfer(property, transformFunction)
    )
  }

  return transformFunction(createTransferObject(state, transfer._modifications))
}

export function toDump (transfer) {
  return fromTransfer(transfer, (property) => {
    return { ...property._state, [MERGEABLE_MARKER]: property._modifications }
  })
}

export function toBase (transfer) {
  return { ...fromTransfer(transfer, (property) => property._state) }
}
