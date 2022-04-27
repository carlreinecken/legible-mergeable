import chai from 'chai'
import lm from '../src/main.js'

const { expect } = chai
const MARKER = lm.MERGEABLE_MARKER

/* eslint-disable no-unused-expressions */

describe('merge objects', function () {
  it('two with changed properties', function () {
    const docA = {
      name: 'gustav',
      age: 22,
      hungry: false,
      pet: 'pig',
      [MARKER]: { hungry: '2020-07-14', pet: '2020-09-01' }
    }

    const docB = {
      name: 'gustav',
      age: 44,
      hungry: null,
      pet: 'dog',
      [MARKER]: { age: '2020-07-02', hungry: '2020-07-02', pet: '2020-08-31' }
    }

    const expected = {
      name: 'gustav',
      age: 44,
      hungry: false,
      pet: 'pig',
      [MARKER]: { hungry: '2020-07-14', pet: '2020-09-01', age: '2020-07-02' }
    }

    expect(lm.merge(docA, docB)).to.eql(expected)
    expect(lm.merge(docB, docA)).to.eql(expected)
    expect(lm.merge(docA, docA)).to.eql(docA)
    expect(lm.merge(docB, docB)).to.eql(docB)
  })

  it('two with new and deleted properties', function () {
    const docA = { age: 13, [MARKER]: { pet: '2020-09-01' } }

    const docB = {
      name: 'gustav',
      age: 13,
      pet: 'dog',
      [MARKER]: { name: '2020-08-09', pet: '2020-08-31' }
    }

    const expected = {
      name: 'gustav',
      age: 13,
      [MARKER]: { name: '2020-08-09', pet: '2020-09-01' }
    }

    expect(lm.merge(docA, docB)).to.eql(expected)
    expect(lm.merge(docB, docA)).to.eql(expected)
    expect(lm.merge(docA, docA)).to.eql(docA)
    expect(lm.merge(docB, docB)).to.eql(docB)
  })

  it('three', function () {
    const docA = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'pig',
      [MARKER]: { hungry: '2020-07-14', pet: '2020-06-30' }
    }

    const docB = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'goat',
      [MARKER]: { hungry: '2020-07-02', pet: '2020-07-24' }
    }

    const docC = {
      name: 'alice',
      age: 19,
      hungry: true,
      pet: 'dog',
      [MARKER]: { age: '2020-07-02' }
    }

    const expected = {
      name: 'alice',
      age: 19,
      hungry: false,
      pet: 'goat',
      [MARKER]: { age: '2020-07-02', hungry: '2020-07-14', pet: '2020-07-24' }
    }

    expect(lm.merge(docA, lm.merge(docB, docC))).to.eql(expected)
    expect(lm.merge(lm.merge(docB, docA), docC)).to.eql(expected)
    expect(lm.merge(docB, lm.merge(docC, docA))).to.eql(expected)
    expect(lm.merge(docB, lm.merge(docB, docB))).to.eql(docB)

    expect(lm.merge(docA, docA)).to.eql(docA)
    expect(lm.merge(docB, docB)).to.eql(docB)
    expect(lm.merge(docC, docC)).to.eql(docC)
  })

  it('nested properties, list as top level', function () {
    const docA = {
      1: { name: 'gustav', age: 22, [MARKER]: {} },
      2: { name: 'bob', age: 44, [MARKER]: { age: '2021-09-03' } },
      [MARKER]: {}
    }

    const docB = {
      2: { name: 'hi bob', age: 12, [MARKER]: { name: '2021-09-02' } },
      [MARKER]: { 1: '2021-09-01' }
    }

    const expected = {
      2: { name: 'hi bob', age: 44, [MARKER]: { name: '2021-09-02', age: '2021-09-03' } },
      [MARKER]: { 1: '2021-09-01' }
    }

    expect(lm.merge(docA, docB)).to.eql(expected)
    expect(lm.merge(docB, docA)).to.eql(expected)
    expect(lm.merge(docA, docA)).to.eql(docA)
    expect(lm.merge(docB, docB)).to.eql(docB)
  })

  xit('complex tree', function () {
  })

  it('fail with identical object', function () {
    const replicaA = { name: 'Almondmilk', price: 290, [MARKER]: { name: '2021-10-02' } }
    const replicaB = { name: 'Almondmilk', price: 290, [MARKER]: { name: '2021-10-02' } }

    const doMerge1 = () => lm.mergeOrFail(replicaA, replicaB)
    const doMerge2 = () => lm.mergeOrFail(replicaB, replicaA)

    expect(doMerge1).to.throw(lm.MergeResultIdenticalError)
    expect(doMerge2).to.throw(lm.MergeResultIdenticalError)
  })

  it('fail with identical nested object', function () {
    const replicaA = {
      [MARKER]: { H: '2021-10-24' },
      G: { age: 44, name: 'bob', [MARKER]: { age: '2021-09-03' } }
    }

    const replicaB = {
      G: { name: 'bob', age: 44, [MARKER]: { age: '2021-09-03' } },
      [MARKER]: { H: '2021-10-24' }
    }

    const doMerge1 = () => lm.mergeOrFail(replicaA, replicaB)
    const doMerge2 = () => lm.mergeOrFail(replicaB, replicaA)

    expect(doMerge1).to.throw(lm.MergeResultIdenticalError)
    expect(doMerge2).to.throw(lm.MergeResultIdenticalError)
  })

  it('doesn\'t fail because nested object is different', function () {
    const replicaA = {
      [MARKER]: { G: '2021-10-24', U: '2021-10-24' },
      G: { content: 'was geht!', [MARKER]: { content: '2021-10-24' } },
      U: { content: 'hi', [MARKER]: { content: '2021-10-24' } }
    }

    const replicaB = {
      [MARKER]: { G: '2021-10-24', U: '2021-10-24' },
      G: { content: 'nix geht', [MARKER]: { content: '2021-10-25' } },
      U: { content: 'hi', [MARKER]: { content: '2021-10-24' } }
    }

    const doMerge1 = () => lm.mergeOrFail(replicaA, replicaB)
    const doMerge2 = () => lm.mergeOrFail(replicaB, replicaA)

    expect(doMerge1).to.not.throw(lm.MergeResultIdenticalError)
    expect(doMerge2).to.not.throw(lm.MergeResultIdenticalError)
  })

  it('doesn\'t fail when nested object is identical but parent changed', function () {
    const replicaA = {
      [MARKER]: { N: '2021-10-24' },
      N: { title: 'network', [MARKER]: {} }
    }

    const replicaB = {
      [MARKER]: { N: '2021-10-24', R: '2021-10-25' },
      N: { title: 'network', [MARKER]: {} },
      R: { title: 'renew', [MARKER]: {} }
    }

    const result1 = lm.mergeOrFail(replicaA, replicaB)
    const result2 = lm.mergeOrFail(replicaB, replicaA)

    const expected = {
      [MARKER]: { N: '2021-10-24', R: '2021-10-25' },
      N: { title: 'network', [MARKER]: {} },
      R: { title: 'renew', [MARKER]: {} }
    }

    expect(result1).to.eql(expected)
    expect(result2).to.eql(expected)
    expect(result1).to.eql(result2)
  })

  describe('detailed option', function () {
    /**
     *      | mod. date| merge  |           | compare
     *  key | x    y   | result | operation | result to y
     *  ----|-- -------|--------|-----------|---------
     *  A   | 1  + 2   |  = 2   | y CHANGEs | -
     *  B   | 2  + 1   |  = 2   | x CHANGEs | CHANGE
     *  C   | 1  + 2✝  |  = 2✝  | y REMOVEs | -
     *  D   | 2✝ + 1   |  = 2✝  | x REMOVEs | REMOVE
     *  E   | 1✝ + 2   |  = 2   | y RECOVERs| -
     *  F   | 2  + 1✝  |  = 2   | x RECOVERs| RECOVER

     *  G   |    + 1   |  = 1   | y ADDs    | -
     *  H   | 1  +     |  = 1   | x ADDs    | ADD
     *  I   | 1  + 1   |  = 1   | -         | -
     *  J   | 1✝ + 1✝  |  = 1✝  | -         | -
     */

    it('includes standard operations', function () {
      const d1 = '2022-03-27'
      const d2 = '2022-04-27'

      const modsA = { A: d1, B: d2, C: d1, D: d2, E: d1, F: d2, H: d1, I: d1, J: d1 }
      const docA = { A: 1, B: 2, C: 3, F: 6, H: 8, I: 9, [MARKER]: modsA }

      const modsB = { A: d2, B: d1, C: d2, D: d1, E: d2, F: d1, G: d1, I: d1, J: d1 }
      const docB = { A: 10, B: 20, D: 30, E: 50, G: 70, I: 9, [MARKER]: modsB }

      const expectedMods = { A: d2, B: d2, C: d2, D: d2, E: d2, F: d2, G: d1, H: d1, I: d1, J: d1 }
      const expectedMerge = { A: 10, B: 2, E: 50, F: 6, G: 70, H: 8, I: 9, [MARKER]: expectedMods }

      const expectedOperationsA = {
        B: lm.OPERATIONS.CHANGE,
        D: lm.OPERATIONS.REMOVE,
        F: lm.OPERATIONS.ADD,
        H: lm.OPERATIONS.ADD
      }

      const expectedOperationsB = {
        A: lm.OPERATIONS.CHANGE,
        C: lm.OPERATIONS.REMOVE,
        E: lm.OPERATIONS.ADD,
        G: lm.OPERATIONS.ADD
      }

      const data = lm.mergeForDetails(docA, docB)

      expect(data.isIdentical).to.eql(false)
      expect(data.result).to.eql(expectedMerge)

      expect(data.operations.a).to.eql(expectedOperationsA)
      expect(data.operations.b).to.eql(expectedOperationsB)

      const switchedData = lm.mergeForDetails(docB, docA)

      expect(switchedData.isIdentical).to.eql(false)
      expect(switchedData.result).to.eql(expectedMerge)

      expect(switchedData.operations.a).to.eql(expectedOperationsB)
      expect(switchedData.operations.b).to.eql(expectedOperationsA)
    })

    it('includes recover operations', function () {
      const d1 = '2022-03-27'
      const d2 = '2022-04-27'

      const docA = { F: 6, H: 8, [MARKER]: { E: d1, F: d2, H: d1 } }
      const docB = { E: 50, G: 70, [MARKER]: { E: d2, F: d1, G: d1 } }
      const expectedMerge = { E: 50, F: 6, G: 70, H: 8, [MARKER]: { E: d2, F: d2, G: d1, H: d1 } }

      const expectedOperationsA = { F: lm.OPERATIONS.RECOVER, H: lm.OPERATIONS.ADD }
      const expectedOperationsB = { E: lm.OPERATIONS.RECOVER, G: lm.OPERATIONS.ADD }

      const data = lm.mergeForDetails(docA, docB, { includeRecoverOperation: true })

      expect(data.operations.a).to.eql(expectedOperationsA)
      expect(data.operations.b).to.eql(expectedOperationsB)

      const switchedData = lm.mergeForDetails(docB, docA, { includeRecoverOperation: true })

      expect(switchedData.operations.a).to.eql(expectedOperationsB)
      expect(switchedData.operations.b).to.eql(expectedOperationsA)

      // just to be sure
      expect(data.result).to.eql(expectedMerge)
    })
  })
})
