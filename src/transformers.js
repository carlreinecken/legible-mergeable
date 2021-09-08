import * as util from './util'
import { AbstractMergeable } from './AbstractMergeable.class'

/**
 * Transform a given internal state.
 * If the instance is found it gets transformed via the given callback
 */
export function transformInternalState (state, transformInstanceFn) {
  return Object
    .entries(state)
    .reduce((result, [identifier, property]) => {
      if (typeof property !== 'object') {
        result[identifier] = property
      } else if (property instanceof AbstractMergeable) {
        result[identifier] = transformInstanceFn(property)
      } else {
        result[identifier] = util.deepCopy(property)
      }

      return result
    }, {})
}

/**
 * Transform a given dumped (raw) object.
 * If the instance is found it gets transformed via the given callback
 */
export function transformDump (dump, transformInstanceFn) {
  return Object
    .entries(dump)
    .reduce((result, [identifier, property]) => {
      if (util.isObject(property) && util.isObject(property[AbstractMergeable.MODIFICATIONS_KEY])) {
        result[identifier] = transformInstanceFn(property)
      } else {
        result[identifier] = property
      }

      return result
    }, {})
}
