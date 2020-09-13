import util from './util'

export default function merge (docA, changesA, docB, changesB) {
  const changes = { a: changesA, b: changesB }
  const resultChanges = {}
  const result = {}

  const properties = [...new Set([].concat(
    Object.keys(docA),
    Object.keys(changes.a),
    Object.keys(docB),
    Object.keys(changes.b)
  ))]

  for (const prop of properties) {
    const aChangeAt = changes.a[prop] ? new Date(changes.a[prop]) : null
    const bChangeAt = changes.b[prop] ? new Date(changes.b[prop]) : null

    if (aChangeAt > bChangeAt) {
      if (util.hasKey(docA, prop)) {
        result[prop] = docA[prop]
      }
      resultChanges[prop] = aChangeAt
    } else if (aChangeAt < bChangeAt) {
      if (util.hasKey(docB, prop)) {
        result[prop] = docB[prop]
      }
      resultChanges[prop] = bChangeAt
    } else {
      if (util.hasKey(docA, prop)) {
        result[prop] = docA[prop]
      } else if (util.hasKey(docB, prop)) {
        result[prop] = docB[prop]
      }

      if (!util.hasKey(resultChanges, prop)) {
        if (util.hasKey(changes.a, prop)) {
          resultChanges[prop] = aChangeAt
        } else if (util.hasKey(changes.b, prop)) {
          resultChanges[prop] = bChangeAt
        }
      }
    }
  }

  return { content: result, changes: resultChanges }
}
