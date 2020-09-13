const expect = require('chai').expect
const mergeArrayIm = require('../dist/legible-mergeable.js')._mergeDumps().mergeArray

function parseChangeDates (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return { ...acc, [key]: new Date(changes[key]) }
  }, {})
}

function parseIdsToObjects (ids) {
  return ids.map(id => { return { id } })
}

function p (expected) {
  return {
    val: parseIdsToObjects(expected.val),
    mod: parseChangeDates(expected.mod),
    pos: expected.pos
  }
}

describe('merge arrays', function () {
  it('first generic test', function () {
    const replicaA = p({
      // ~A1, +S4, -55
      val: ['Y5', 'A1', 'JJ', 'S4', 'FG'],
      pos: { Y5: 0, A1: 0.45, JJ: 1, S4: 1.45, FG: 3 },
      mod: { A1: '2020-09-05', S4: '2020-09-02', 55: '2020-09-03' }
    })

    const replicaB = p({
      // +CU, +E7, ~FG
      val: ['Y5', 'FG', 'JJ', 'CU', 'E7', '55', 'A1'],
      pos: { Y5: 0, FG: 0.55, JJ: 1, CU: 1.55, E7: 1.755, 55: 2, A1: 4 },
      mod: { FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06' }
    })

    const expected = p({
      val: ['Y5', 'A1', 'FG', 'JJ', 'S4', 'CU', 'E7'],
      pos: { Y5: 0, A1: 0.45, FG: 0.55, JJ: 1, S4: 1.45, CU: 1.55, E7: 1.755 },
      mod: { A1: '2020-09-05', FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06', S4: '2020-09-02', 55: '2020-09-03' }
    })

    expect(mergeArrayIm(replicaA, replicaB)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaA)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaB)).to.eql(replicaB)
    expect(mergeArrayIm(replicaA, replicaA)).to.eql(replicaA)

    expect(mergeArrayIm(replicaA, mergeArrayIm(replicaB, replicaA))).to.eql(expected)
    expect(mergeArrayIm(replicaB, mergeArrayIm(replicaA, replicaB))).to.eql(expected)
  })

  it('conflicting modifications', function () {
    const replicaA = p({
      // A2~ F8~ YQ-
      val: ['A2', 'JZ', 'L5', 'F8'],
      pos: { JZ: 2, F8: 4.45, L5: 4, A2: 0.45 },
      mod: { A2: '2020-09-13', YQ: '2020-09-12', F8: '2020-09-02' }
    })

    const replicaB = p({
      // A2~ F8- YQ~
      val: ['JZ', 'A2', 'YQ', 'L5'],
      pos: { YQ: 3.65, JZ: 2, L5: 4, A2: 3.05 },
      mod: { A2: '2020-09-10', YQ: '2020-09-13', F8: '2020-09-08' }
    })

    const expected = p({
      val: ['A2', 'JZ', 'YQ', 'L5'],
      pos: { YQ: 3.65, JZ: 2, L5: 4, A2: 0.45 },
      mod: { A2: '2020-09-13', YQ: '2020-09-13', F8: '2020-09-08' }
    })

    expect(mergeArrayIm(replicaA, replicaB)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaA)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaB)).to.eql(replicaB)
    expect(mergeArrayIm(replicaA, replicaA)).to.eql(replicaA)

    expect(mergeArrayIm(replicaA, mergeArrayIm(replicaB, replicaA))).to.eql(expected)
    expect(mergeArrayIm(replicaB, mergeArrayIm(replicaA, replicaB))).to.eql(expected)
  })

  it('reset all elements and add new ones', function () {
    const replicaA = p({
      // A2- F8-
      val: ['JZ', 'L5'],
      pos: { JZ: 0.95, L5: 1.95 },
      mod: { A2: '2020-09-13', F8: '2020-09-02', JZ: '2020-09-10', L5: '2020-09-13' }
    })

    const replicaB = p({
      // A2- F8-
      val: ['TM', 'V9'],
      pos: { TM: 1.05, V9: 2.05 },
      mod: { A2: '2020-09-13', F8: '2020-09-02', TM: '2020-09-10', V9: '2020-09-13' }
    })

    const expected = p({
      val: ['JZ', 'TM', 'L5', 'V9'],
      pos: { TM: 1.05, V9: 2.05, JZ: 0.95, L5: 1.95 },
      mod: { A2: '2020-09-13', F8: '2020-09-02', JZ: '2020-09-10', L5: '2020-09-13', TM: '2020-09-10', V9: '2020-09-13' }
    })

    expect(mergeArrayIm(replicaA, replicaB)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaA)).to.eql(expected)
    expect(mergeArrayIm(replicaB, replicaB)).to.eql(replicaB)
    expect(mergeArrayIm(replicaA, replicaA)).to.eql(replicaA)

    expect(mergeArrayIm(replicaA, mergeArrayIm(replicaB, replicaA))).to.eql(expected)
    expect(mergeArrayIm(replicaB, mergeArrayIm(replicaA, replicaB))).to.eql(expected)
  })

  it('the holy three', function () {
    const replicaA = p({
      // ~A1, +S4, -55
      val: ['Y5', 'A1', 'JJ', 'S4', 'FG'],
      pos: { Y5: 0, A1: 0.45, JJ: 1, S4: 1.45, FG: 3 },
      mod: { A1: '2020-09-05', S4: '2020-09-02', 55: '2020-09-03' }
    })

    const replicaB = p({
      // +CU, +E7, ~FG
      val: ['Y5', 'FG', 'JJ', 'CU', 'E7', '55', 'A1'],
      pos: { Y5: 0, FG: 0.55, JJ: 1, CU: 1.55, E7: 1.755, 55: 2, A1: 4 },
      mod: { FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06' }
    })

    const replicaC = p({
      // +HS, (+CU), ~FG
      val: ['Y5', 'JJ', 'FG', 'CU', '55', 'HS', 'A1'],
      pos: { Y5: 0, JJ: 1, FG: 1.253, CU: 1.55, 55: 2, HS: 3.03, A1: 4 },
      mod: { FG: '2020-09-04', CU: '2020-09-01', HS: '2020-09-06' }
    })

    const expected = p({
      val: ['Y5', 'A1', 'FG', 'JJ', 'S4', 'CU', 'E7', 'HS'],
      pos: { Y5: 0, A1: 0.45, FG: 0.55, JJ: 1, S4: 1.45, CU: 1.55, E7: 1.755, HS: 3.03 },
      mod: { A1: '2020-09-05', FG: '2020-09-06', CU: '2020-09-01', E7: '2020-09-06', S4: '2020-09-02', 55: '2020-09-03', HS: '2020-09-06' }
    })

    expect(mergeArrayIm(replicaB, replicaB)).to.eql(replicaB)
    expect(mergeArrayIm(replicaA, replicaA)).to.eql(replicaA)
    expect(mergeArrayIm(replicaC, replicaC)).to.eql(replicaC)

    expect(mergeArrayIm(replicaA, mergeArrayIm(replicaB, replicaC))).to.eql(expected)
    expect(mergeArrayIm(replicaB, mergeArrayIm(replicaC, replicaA))).to.eql(expected)
    expect(mergeArrayIm(replicaC, mergeArrayIm(replicaA, replicaB))).to.eql(expected)
  })
})
