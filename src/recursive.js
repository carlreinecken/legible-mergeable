import * as util from './util'

export function transformMergeables (dump, transformFn) {
  return Object
    .entries(dump)
    .reduce((result, [key, property]) => {
      if (typeof property !== 'object') {
        // console.log('trMrg/no object', key)
        result[key] = property
      } else if (util.hasMarker(property)) {
        // console.log('trMrg/has marker', key)
        result[key] = transformFn(property)
      } else {
        // TODO: deep clone?
        // console.log('trMrg/deep clone', key)
        result[key] = util.deepCopy(property)
        // result[key] = property
      }

      // console.log('trMrg/result', key, result)
      return result
    }, {})
}
