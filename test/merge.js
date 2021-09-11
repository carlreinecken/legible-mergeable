const expect = require('chai').expect

const legibleMergeable = require('../dist/legible-mergeable.js')
const mergeFunction = legibleMergeable._mergeFunction
const MODS_KEY = legibleMergeable.MERGEABLE_MARKER

/* eslint-disable no-unused-expressions */

function merge (a, b) {
  return mergeFunction({ a, b })
}

describe('merge objects', function () {
  it('two with changed properties', function () {
    const docA = {
      state: {
        name: 'gustav',
        age: 22,
        hungry: false,
        pet: 'pig'
      },
      [MODS_KEY]: { hungry: '2020-07-14', pet: '2020-09-01' }
    }

    const docB = {
      state: {
        name: 'gustav',
        age: 44,
        hungry: null,
        pet: 'dog'
      },
      [MODS_KEY]: { age: '2020-07-02', hungry: '2020-07-02', pet: '2020-08-31' }
    }

    const expected = {
      state: {
        name: 'gustav',
        age: 44,
        hungry: false,
        pet: 'pig'
      },
      [MODS_KEY]: { hungry: '2020-07-14', pet: '2020-09-01', age: '2020-07-02' }
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('two with new and deleted properties', function () {
    const docA = { state: { age: 13 }, [MODS_KEY]: { pet: '2020-09-01' } }

    const docB = {
      state: {
        name: 'gustav',
        age: 13,
        pet: 'dog'
      },
      [MODS_KEY]: { name: '2020-08-09', pet: '2020-08-31' }
    }

    const expected = {
      state: {
        name: 'gustav',
        age: 13
      },
      [MODS_KEY]: { name: '2020-08-09', pet: '2020-09-01' }
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('three', function () {
    const docA = {
      state: {
        name: 'alice',
        age: 42,
        hungry: false,
        pet: 'pig'
      },
      [MODS_KEY]: { hungry: '2020-07-14', pet: '2020-06-30' }
    }

    const docB = {
      state: {
        name: 'alice',
        age: 42,
        hungry: false,
        pet: 'goat'
      },
      [MODS_KEY]: { hungry: '2020-07-02', pet: '2020-07-24' }
    }

    const docC = {
      state: {
        name: 'alice',
        age: 19,
        hungry: true,
        pet: 'dog'
      },
      [MODS_KEY]: { age: '2020-07-02' }
    }

    const expected = {
      state: {
        name: 'alice',
        age: 19,
        hungry: false,
        pet: 'goat'
      },
      [MODS_KEY]: { age: '2020-07-02', hungry: '2020-07-14', pet: '2020-07-24' }
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
      state: {
        1: { state: { name: 'gustav', age: 22 }, [MODS_KEY]: {} },
        2: { state: { name: 'bob', age: 44 }, [MODS_KEY]: { age: '2021-09-03' } }
      },
      [MODS_KEY]: {}
    }

    const docB = {
      state: {
        2: { state: { name: 'hi bob', age: 12 }, [MODS_KEY]: { name: '2021-09-02' } }
      },
      [MODS_KEY]: { 1: '2021-09-01' }
    }

    const expected = {
      state: {
        2: { state: { name: 'hi bob', age: 44 }, [MODS_KEY]: { name: '2021-09-02', age: '2021-09-03' } }
      },
      [MODS_KEY]: { 1: '2021-09-01' }
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  xit('tree', function () {
  })
})
