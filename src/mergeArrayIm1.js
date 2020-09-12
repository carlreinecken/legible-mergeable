const expect = require('chai').expect

function parseChangeDates (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return { ...acc, [key]: new Date(changes[key]) }
  }, {})
}

function parseIdsToObjects (ids) {
  return ids.map(ids => { return { id: ids } })
}

function parseExpected (expected) {
  return {
    content: parseIdsToObjects(expected.content),
    changes: parseChangeDates(expected.changes)
  }
}

function merge (replicaA, replicaB) {
  return mergeArrayIm(
    parseIdsToObjects(replicaA.content),
    parseChangeDates(replicaA.changes),
    parseIdsToObjects(replicaB.content),
    parseChangeDates(replicaB.changes)
  )
}

function pureMerge (replicaA, replicaB) {
  return mergeArrayIm(
    replicaA.content,
    replicaA.changes,
    replicaB.content,
    replicaB.changes
  )
}

function getLatestDate (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return (acc < changes[key]) ? changes[key] : acc
  }, null)
}

function getIdsMap (doc, idKey) {
  return new Map(doc.map(item => [item[idKey], item]))
}

function mergeArrayIm (docA, changesA, docB, changesB) {
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
      const difference = Math.abs((elementDate || 0) - newElementDate)

      if ((closestDifference == null && !isNaN(difference)) || (difference < closestDifference)) {
        closestDifference = difference
        closestIndex = index
      }
    }

    result.content.splice(closestIndex + 1, 0, newElement)
  }

  return result
}

describe('merge arrays with IM', function () {
  it('first general test', function () {
    const replicaA = {
      // ~A1, +S4, -55
      content: ['A1', 'Y5', 'JJ', 'S4', 'FG'],
      changes: { S4: '2020-09-02', A1: '2020-09-05', 55: '2020-09-03' }
    }

    const replicaB = {
      // +CU, +E7, ~FG
      content: ['FG', 'Y5', 'JJ', 'CU', 'E7', '55', 'A1'],
      changes: { FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06' }
    }

    const expected = {
      content: ['FG', 'Y5', 'JJ', 'CU', 'S4', 'E7', 'A1'],
      changes: {
        FG: '2020-09-06',
        CU: '2020-09-01',
        E7: '2020-09-06',
        S4: '2020-09-02',
        55: '2020-09-03'
      }
    }

    expect(merge(replicaA, replicaB)).to.eql(parseExpected(expected))
    expect(merge(replicaB, replicaA)).to.eql(parseExpected(expected))
    expect(merge(replicaA, replicaA)).to.eql(parseExpected(replicaA))
    expect(merge(replicaB, replicaB)).to.eql(parseExpected(replicaB))

    expect(pureMerge(
      parseExpected(replicaA),
      merge(replicaB, replicaA)
    )).to.eql(parseExpected(expected))

    expect(pureMerge(
      parseExpected(replicaB),
      merge(replicaB, replicaA)
    )).to.eql(parseExpected(expected))
  })

  it('both delete everything and add new items', function () {
    const replicaA = {
      // -A1 -55 +JJ +S4
      content: ['JJ', 'Y5', 'S4'],
      changes: {
        A1: '2020-09-01',
        55: '2020-09-03',
        S4: '2020-09-02',
        JJ: '2020-09-07'
      }
    }

    const replicaB = {
      // -A1 -55 -Y5 +CU +E7
      content: ['CU', 'E7'],
      changes: {
        A1: '2020-09-02',
        55: '2020-09-02',
        Y5: '2020-09-04',
        CU: '2020-09-01',
        E7: '2020-09-06'
      }
    }

    const expected = {
      content: ['JJ', 'E7', 'S4', 'CU'],
      changes: {
        A1: '2020-09-01',
        55: '2020-09-03',
        S4: '2020-09-02',
        JJ: '2020-09-07',
        Y5: '2020-09-04',
        CU: '2020-09-01',
        E7: '2020-09-06'
      }
    }

    expect(merge(replicaA, replicaB)).to.eql(parseExpected(expected))
    expect(merge(replicaB, replicaA)).to.eql(parseExpected(expected))
    expect(merge(replicaA, replicaA)).to.eql(parseExpected(replicaA))
    expect(merge(replicaB, replicaB)).to.eql(parseExpected(replicaB))

    expect(pureMerge(
      parseExpected(replicaA),
      merge(replicaB, replicaA)
    )).to.eql(parseExpected(expected))

    expect(pureMerge(
      parseExpected(replicaB),
      merge(replicaB, replicaA)
    )).to.eql(parseExpected(expected))
  })

  it('merge three', function () {
    const replicaA = {
      // ~A1, +S4, -55
      content: ['A1', 'Y5', 'JJ', 'S4', 'FG'],
      changes: { S4: '2020-09-02', A1: '2020-09-05', 55: '2020-09-03' }
    }

    const replicaB = {
      // +CU, +E7, ~FG
      content: ['FG', 'Y5', 'JJ', 'CU', 'E7', '55', 'A1'],
      changes: { FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06' }
    }

    const replicaC = {
      // +HX, ~Y5, -55
      content: ['JJ', 'Y5', 'HX', 'A1', 'FG'],
      changes: { HX: '2020-09-10', Y5: '2020-08-31', 55: '2020-09-06' }
    }

    const expected = {
      // content: ['FG', 'Y5', 'JJ', 'CU', 'S4', 'E7', 'A1'],
      // content: ['JJ', 'S4', 'E7', 'CU', 'Y5', 'HX', 'A1', 'FG'],
      content: ['JJ', 'Y5', 'CU', 'S4', 'E7', 'HX', 'A1', 'FG'],
      changes: {
        // FG: '2020-09-06',
        CU: '2020-09-01',
        E7: '2020-09-06',
        S4: '2020-09-02',
        HX: '2020-09-10',
        Y5: '2020-08-31',
        55: '2020-09-06'
      }
    }

    expect(pureMerge(
      parseExpected(replicaA),
      merge(replicaB, replicaC)
    )).to.eql(parseExpected(expected))

    expect(pureMerge(
      parseExpected(replicaC),
      merge(replicaA, replicaB)
    )).to.eql(parseExpected(expected))

    // expect(pureMerge(
    //   parseExpected(replicaB),
    //   merge(replicaC, replicaA)
    // )).to.eql(parseExpected(expected))
  })
})
