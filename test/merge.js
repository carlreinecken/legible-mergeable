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

  xit('tree', function () {
  })

  it('fail with same object', function () {
    const replicaA = { name: 'Almondmilk', price: 290, [MARKER]: { name: '2021-10-02' } }
    const replicaB = { name: 'Almondmilk', price: 290, [MARKER]: { name: '2021-10-02' } }

    const doMerge1 = () => lm.mergeOrFail(replicaA, replicaB)
    const doMerge2 = () => lm.mergeOrFail(replicaB, replicaA)

    expect(doMerge1).to.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
    expect(doMerge2).to.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
  })

  it('fail with same nested object', function () {
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

    expect(doMerge1).to.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
    expect(doMerge2).to.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
  })

  it('doesn\'t fail because nested object is different', function () {
    const replicaA = {
      G: { name: 'valentin', age: 14, [MARKER]: { age: '2021-10-24' } },
      [MARKER]: { H: '2021-10-24' }
    }

    const replicaB = {
      G: { name: 'bob', age: 14, [MARKER]: { age: '2021-09-03' } },
      [MARKER]: { H: '2021-10-24' }
    }

    const doMerge1 = () => lm.mergeOrFail(replicaA, replicaB)
    const doMerge2 = () => lm.mergeOrFail(replicaB, replicaA)

    expect(doMerge1).to.not.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
    expect(doMerge2).to.not.throw(lm.MERGE_HAD_NO_DIFFERENCES_ERROR)
  })
})
