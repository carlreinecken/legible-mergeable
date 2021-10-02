import chai from 'chai'
import legibleMergeable from '../src/legibleMergeable.js'

const { expect } = chai
const MARKER = legibleMergeable.MERGEABLE_MARKER

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

    expect(legibleMergeable.merge(docA, docB)).to.eql(expected)
    expect(legibleMergeable.merge(docB, docA)).to.eql(expected)
    expect(legibleMergeable.merge(docA, docA)).to.eql(docA)
    expect(legibleMergeable.merge(docB, docB)).to.eql(docB)
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

    expect(legibleMergeable.merge(docA, docB)).to.eql(expected)
    expect(legibleMergeable.merge(docB, docA)).to.eql(expected)
    expect(legibleMergeable.merge(docA, docA)).to.eql(docA)
    expect(legibleMergeable.merge(docB, docB)).to.eql(docB)
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

    expect(legibleMergeable.merge(docA, legibleMergeable.merge(docB, docC))).to.eql(expected)
    expect(legibleMergeable.merge(legibleMergeable.merge(docB, docA), docC)).to.eql(expected)
    expect(legibleMergeable.merge(docB, legibleMergeable.merge(docC, docA))).to.eql(expected)
    expect(legibleMergeable.merge(docB, legibleMergeable.merge(docB, docB))).to.eql(docB)

    expect(legibleMergeable.merge(docA, docA)).to.eql(docA)
    expect(legibleMergeable.merge(docB, docB)).to.eql(docB)
    expect(legibleMergeable.merge(docC, docC)).to.eql(docC)
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

    expect(legibleMergeable.merge(docA, docB)).to.eql(expected)
    expect(legibleMergeable.merge(docB, docA)).to.eql(expected)
    expect(legibleMergeable.merge(docA, docA)).to.eql(docA)
    expect(legibleMergeable.merge(docB, docB)).to.eql(docB)
  })

  xit('tree', function () {
  })
})
