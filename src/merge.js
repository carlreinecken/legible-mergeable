import util from './util'

function getLatestDate (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return (acc < changes[key]) ? changes[key] : acc
  }, null)
}

function getIdsMap (doc, idKey) {
  return new Map(doc.map(item => [item[idKey], item]))
}

export function mergeArrayIm (docA, changesA, docB, changesB) {
  const result = { content: [], changes: {} }
  const input = { a: {}, b: {} }
  const ID_KEY = 'id'

  // get the latest change from each doc
  const latestDateA = getLatestDate(changesA)
  const latestDateB = getLatestDate(changesB)

  if (latestDateA > latestDateB) {
    input.a = { doc: docA, changes: changesA, map: getIdsMap(docA, ID_KEY) }
    input.b = { doc: docB, changes: changesB, map: getIdsMap(docB, ID_KEY) }
  } else if (latestDateB >= latestDateA) {
    input.a = { doc: docB, changes: changesB, map: getIdsMap(docB, ID_KEY) }
    input.b = { doc: docA, changes: changesA, map: getIdsMap(docA, ID_KEY) }
  }

  // take the entire order from the one with the latest change
  // reorders from the older one are lost
  result.content = input.a.doc
  result.changes = input.a.changes

  // const getChangeDate = (date) => date instanceof Date ? date : null
  const toBeInserted = []
  const toBeDeleted = new Set()

  // loop over the loosing side and check for deletions and insertions
  for (const changeId of Object.keys(input.b.changes)) {
    const change = input.b.changes[changeId]
    if (!input.a.changes[changeId] && !input.a.map.has(changeId)) {
      // b has added id
      toBeInserted.push(input.b.map.get(changeId))
      result.changes[changeId] = change
    }

    if (!input.b.map.has(changeId) && input.a.map.has(changeId)) {
      // b has deleted id
      toBeDeleted.add(changeId)
      result.changes[changeId] = change
    }
  }

  // filter out deleted items
  result.content = result.content.filter(item => !toBeDeleted.has(item[ID_KEY]))

  // the insertions from the loosing side will be inserted on the winning side
  // after their closest elements to their own timestamp respectively
  for (const newElement of toBeInserted) {
    const newElementDate = input.b.changes[newElement[ID_KEY]]
    let closestIndex = null
    let closestDifference = null

    for (const [index, element] of input.a.doc.entries()) {
      const elementDate = input.a.changes[element[ID_KEY]]
      const difference = Math.abs(elementDate - newElementDate)

      if (closestDifference == null || difference < closestDifference) {
        closestDifference = difference
        closestIndex = index
      }
    }

    result.content.splice(closestIndex + 1, 0, newElement)
  }

  return result
}

export function mergeArray (docA, changesA, docB, changesB) {
  const docs = {
    a: docA.map(item => item.id),
    b: docB.map(item => item.id)
  }
  const changes = { a: changesA, b: changesB }

  const resultIds = []
  let counter = 0

  const hasNext = (side) => docs[side][0] != null
  // TODO: check if shift makes perfomance O(n^2) otherwise use index counter instead
  const shift = (side) => docs[side].shift()
  const shiftBoth = () => {
    shift('a')
    return shift('b')
  }
  const getChange = (side, id) => changes[side][id]
    ? new Date(changes[side][id])
    : null

  while (hasNext('a') || hasNext('b')) {
    const id = { a: docs.a[0], b: docs.b[0] }
    const change = {
      a: { a: getChange('a', id.a), b: getChange('a', id.b) },
      b: { a: getChange('b', id.a), b: getChange('b', id.b) }
    }

    const win = (side, origin) => {
      // console.log(id.a, id.b, side, origin)
      resultIds.push(shift(side))
    }
    // console.log(id.a, id.b, '...')

    if (id.a === id.b && (change.a.a || new Date()).getTime() ===
      (change.b.b || new Date()).getTime()) {
      // console.log(id.a, id.b, 'both')
      resultIds.push(shiftBoth()); continue
    }

    if (resultIds.includes(id.a)) {
      shift('a'); continue
    }

    if (resultIds.includes(id.b)) {
      shift('b'); continue
    }

    if (change.a.a && !change.b.a && !docs.b.includes(id.a)) {
      // a has an addition
      if (change.b.b && !change.a.b && !docs.b.includes(id.b)) {
        // both have an addition
        if (change.a.a > change.b.b) {
          // b is younger
          win('b', 1); continue
        } else if (change.a.a < change.b.b) {
          // a is younger
          win('a', 2); continue
        }
      } else {
        // only a has an addition
        win('a', 3); continue
      }
    }

    if (change.b.b && !change.a.b && !docs.a.includes(id.b)) {
      // b has an addition
      if (change.a.a && !change.b.a && !docs.b.includes(id.a)) {
        // both have an addition
        if (change.b.b > change.a.a) {
          // a is younger
          win('a', 4); continue
        } else if (change.b.b < change.a.a) {
          // b is younger
          win('b', 5); continue
        }
      } else {
        // only b has an addition
        win('b', 6); continue
      }
    }

    // TODO: check if perfomance is better with a map instead of includes
    if (change.b.a && change.a.a < change.b.a && !docs.b.includes(id.a)) {
      // A was deleted
      shift('a'); continue
    }

    if (change.a.b && change.b.b < change.a.b && !docs.a.includes(id.b)) {
      // B was deleted
      shift('b'); continue
    }

    // TODO: rewrite comments to variables
    if (change.a.b > change.b.b) {
      // in list A item B was moved
      if (change.b.a > change.a.a) {
        // conflict: in list A item A was moved
        shiftBoth(); continue
      }
      win('a'); continue
    } else if (change.a.b < change.b.b) {
      // in list B item B was moved
      if (change.b.a < change.a.a) {
        // conflict: in list A item A was moved
        shiftBoth(); continue
      }
      win('b'); continue
    } else if (change.b.a > change.a.a) {
      // in list B item B was moved
      if (change.a.b > change.b.b) {
        // conflict: in list A item B was moved
        shiftBoth(); continue
      }
      win('b'); continue
    } else if (change.b.a < change.a.a) {
      // in list A item A was moved
      if (change.a.b < change.b.b) {
        // conflict: in list B item A was moved
        shiftBoth(); continue
      }
      win('a'); continue
    }

    // TODO: throw error?
    console.warn(id, 'was not caught by any condition', change)

    if (counter++ > docs.a.length + docs.b.length) {
      break
    }
  }

  // TODO: merge duplicate objects
  const result = resultIds.map(id => {
    const entry = docA.find(item => item.id === id)
    return (entry == null) ? docB.find(item => item.id === id) : entry
  })

  const allIds = docA.concat(
    docB,
    Object.keys(changes.a),
    Object.keys(changes.b)
  ).map(item => {
    if (typeof item === 'object' && item.id) {
      return item.id
    } else if (typeof item === 'string') {
      return item
    }
  })

  const resultChanges = allIds.reduce((obj, id) => {
    const previousChange = getChange('a', id) > getChange('b', id)
      ? changes.a[id]
      : changes.b[id]

    if (previousChange == null) {
      return obj
    }

    return { ...obj, [id]: new Date(previousChange) }
  }, {})

  return { content: result, changes: resultChanges }
}

export function mergeObject (docA, changesA, docB, changesB) {
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
