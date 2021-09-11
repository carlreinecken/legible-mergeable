const expect = require('chai').expect

const legibleMergeable = require('../dist/legible-mergeable.js')
const mergeFunction = legibleMergeable._mergeFunction
const __isMergeable = true

/* eslint-disable no-unused-expressions */

function merge (a, b) {
  return mergeFunction({ a, b })
}

describe('merge objects', function () {
  it('two with changed properties', function () {
    const docA = {
      _state: {
        name: 'gustav',
        age: 22,
        hungry: false,
        pet: 'pig'
      },
      _modifications: { hungry: '2020-07-14', pet: '2020-09-01' },
      __isMergeable
    }

    const docB = {
      _state: {
        name: 'gustav',
        age: 44,
        hungry: null,
        pet: 'dog'
      },
      _modifications: { age: '2020-07-02', hungry: '2020-07-02', pet: '2020-08-31' },
      __isMergeable
    }

    const expected = {
      _state: {
        name: 'gustav',
        age: 44,
        hungry: false,
        pet: 'pig'
      },
      _modifications: { hungry: '2020-07-14', pet: '2020-09-01', age: '2020-07-02' },
      __isMergeable
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('two with new and deleted properties', function () {
    const docA = { _state: { age: 13 }, _modifications: { pet: '2020-09-01' }, __isMergeable }

    const docB = {
      _state: {
        name: 'gustav',
        age: 13,
        pet: 'dog'
      },
      _modifications: { name: '2020-08-09', pet: '2020-08-31' },
      __isMergeable
    }

    const expected = {
      _state: {
        name: 'gustav',
        age: 13
      },
      _modifications: { name: '2020-08-09', pet: '2020-09-01' },
      __isMergeable
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('three', function () {
    const docA = {
      _state: {
        name: 'alice',
        age: 42,
        hungry: false,
        pet: 'pig'
      },
      _modifications: { hungry: '2020-07-14', pet: '2020-06-30' },
      __isMergeable
    }

    const docB = {
      _state: {
        name: 'alice',
        age: 42,
        hungry: false,
        pet: 'goat'
      },
      _modifications: { hungry: '2020-07-02', pet: '2020-07-24' },
      __isMergeable
    }

    const docC = {
      _state: {
        name: 'alice',
        age: 19,
        hungry: true,
        pet: 'dog'
      },
      _modifications: { age: '2020-07-02' },
      __isMergeable
    }

    const expected = {
      _state: {
        name: 'alice',
        age: 19,
        hungry: false,
        pet: 'goat'
      },
      _modifications: { age: '2020-07-02', hungry: '2020-07-14', pet: '2020-07-24' },
      __isMergeable
    }

    expect(merge(docA, merge(docB, docC))).to.eql(expected)
    expect(merge(merge(docB, docA), docC)).to.eql(expected)
    expect(merge(docB, merge(docC, docA))).to.eql(expected)
    expect(merge(docB, merge(docB, docB))).to.eql(docB)

    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
    expect(merge(docC, docC)).to.eql(docC)
  })

  it('nested properties, list as top level', function () {
    const docA = {
      _state: {
        1: { _state: { name: 'gustav', age: 22 }, _modifications: {}, __isMergeable },
        2: { _state: { name: 'bob', age: 44 }, _modifications: { age: '2021-09-03' }, __isMergeable }
      },
      _modifications: {},
      __isMergeable
    }

    const docB = {
      _state: {
        2: { _state: { name: 'hi bob', age: 12 }, _modifications: { name: '2021-09-02' }, __isMergeable }
      },
      _modifications: { 1: '2021-09-01' },
      __isMergeable
    }

    const expected = {
      _state: {
        2: { _state: { name: 'hi bob', age: 44 }, _modifications: { name: '2021-09-02', age: '2021-09-03' }, __isMergeable }
      },
      _modifications: { 1: '2021-09-01' },
      __isMergeable
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  xit('tree', function () {
  })
})
