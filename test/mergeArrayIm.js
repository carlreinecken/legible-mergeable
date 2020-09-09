const legibleMergeable = require('../dist/legible-mergeable.js')
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
  return legibleMergeable.mergeDumps().mergeArrayIm(
    parseIdsToObjects(replicaA.content),
    parseChangeDates(replicaA.changes),
    parseIdsToObjects(replicaB.content),
    parseChangeDates(replicaB.changes)
  )
}

function pureMerge (replicaA, replicaB) {
  return legibleMergeable.mergeDumps().mergeArrayIm(
    replicaA.content,
    replicaA.changes,
    replicaB.content,
    replicaB.changes
  )
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

  xit('merge three', function () {
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

    // const replicaC = {
    //   // +HX, -DW, ~23, +LP
    //   content: ['FG', 'Y5', 'JJ', 'CU', 'E7', '55', 'A1'],
    //   changes: { FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06' }
    // }

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
})
