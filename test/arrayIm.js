const expect = require('chai').expect

function hasKey (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

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

function getModifications (a, b) {
  const result = {
    inserted: {},
    deleted: {},
    moved: {}
  }

  for (const [id, change] of Object.entries(a.changes)) {
    if (!hasKey(b.changes, id) && !b.values.has(id) && a.values.has(id)) {
      result.inserted[id] = {
        val: a.values.get(id),
        pos: a.positions[id],
        mod: change
      }
      continue
    }

    // abort if the other lists has a newer change
    if (change < (b.changes[id] || null)) {
      continue
    }

    if (!a.values.has(id)) {
      result.deleted[id] = change
      continue
    }

    if (a.values.has(id) &&
      b.values.has(id) &&
      a.positions[id] !== b.positions[id]
    ) {
      result.moved[id] = {
        val: a.values.get(id),
        pos: a.positions[id],
        mod: change
      }
    }
  }

  return result
}

function getAllModifications (a, b) {
  const modA = getModifications(a, b)
  const modB = getModifications(b, a)

  return {
    inserted: { ...modA.inserted, ...modB.inserted },
    deleted: { ...modA.deleted, ...modB.deleted },
    moved: { ...modA.moved, ...modB.moved }
  }
}

function getIdsMap (doc, idKey) {
  return new Map(doc.map(item => [item[idKey], item]))
}

function mergeArrayIm (docA, docB) {
  const ID_KEY = 'id'
  const result = { val: [], mod: {}, pos: {} }
  const input = {
    a: { positions: docA.pos, changes: docA.mod, values: getIdsMap(docA.val, ID_KEY) },
    b: { positions: docB.pos, changes: docB.mod, values: getIdsMap(docB.val, ID_KEY) }
  }

  const modifications = getAllModifications(input.a, input.b)
  // console.log(modifications)

  const ids = [...new Set([].concat(
    Array.from(input.a.values.keys()),
    Array.from(input.b.values.keys()),
    Object.keys(input.a.changes),
    Object.keys(input.b.changes)
  ))]
  // console.log(ids)

  for (const id of ids) {
    if (hasKey(modifications.deleted, id)) {
      result.mod[id] = modifications.deleted[id]
      continue
    }

    if (hasKey(modifications.inserted, id)) {
      result.val.push(modifications.inserted[id].val)
      result.pos[id] = modifications.inserted[id].pos
      result.mod[id] = modifications.inserted[id].mod
      continue
    }

    if (hasKey(modifications.moved, id)) {
      result.val.push(modifications.moved[id].val)
      result.pos[id] = modifications.moved[id].pos
      result.mod[id] = modifications.moved[id].mod
      continue
    }

    let source
    if (input.a.values.has(id)) source = 'a'
    if (input.b.values.has(id)) source = 'b'
    if (!source) continue

    result.val.push(input[source].values.get(id))
    result.pos[id] = input[source].positions[id]
    if (hasKey(input[source].changes, id)) {
      result.mod[id] = input[source].changes[id]
    }
  }

  result.val.sort((a, b) => result.pos[a[ID_KEY]] - result.pos[b[ID_KEY]])

  return result
}

describe('merge arrays with IM2', function () {
  it('first general test', function () {
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
