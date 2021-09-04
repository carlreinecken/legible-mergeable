const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect
const CHANGES_KEY = legibleMergeable.KEY.MODIFICATIONS

function merge (docA, docB) {
  const result = legibleMergeable._mergeFunction(docA, docA[CHANGES_KEY], docB, docB[CHANGES_KEY])
  return { ...result.state, [CHANGES_KEY]: result.modifications }
}

function parseDateValuesInObject (modifications) {
  return Object.keys(modifications).reduce((acc, key) => {
    acc[key] = new Date(modifications[key])
    return acc
  }, {})
}

describe('merge objects', function () {
  it('two with changed properties', function () {
    const docA = {
      name: 'gustav',
      age: 22,
      hungry: false,
      pet: 'pig',
      [CHANGES_KEY]: parseDateValuesInObject({ hungry: '2020-07-14', pet: '2020-09-01' })
    }

    const docB = {
      name: 'gustav',
      age: 44,
      hungry: null,
      pet: 'dog',
      [CHANGES_KEY]: parseDateValuesInObject({ age: '2020-07-02', hungry: '2020-07-02', pet: '2020-08-31' })
    }

    const expected = {
      name: 'gustav',
      age: 44,
      hungry: false,
      pet: 'pig',
      [CHANGES_KEY]: parseDateValuesInObject({ hungry: '2020-07-14', pet: '2020-09-01', age: '2020-07-02' })
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('two with new and deleted properties', function () {
    const docA = { age: 13, [CHANGES_KEY]: { pet: new Date('2020-09-01') } }

    const docB = {
      name: 'gustav',
      age: 13,
      pet: 'dog',
      [CHANGES_KEY]: parseDateValuesInObject({ name: '2020-08-09', pet: '2020-08-31' })
    }

    const expected = {
      name: 'gustav',
      age: 13,
      [CHANGES_KEY]: parseDateValuesInObject({ name: '2020-08-09', pet: '2020-09-01' })
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('three', function () {
    const docA = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'pig',
      [CHANGES_KEY]: parseDateValuesInObject({ hungry: '2020-07-14', pet: '2020-06-30' })
    }

    const docB = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'goat',
      [CHANGES_KEY]: parseDateValuesInObject({ hungry: '2020-07-02', pet: '2020-07-24' })
    }

    const docC = {
      name: 'alice',
      age: 19,
      hungry: true,
      pet: 'dog',
      [CHANGES_KEY]: { age: new Date('2020-07-02') }
    }

    const expected = {
      name: 'alice',
      age: 19,
      hungry: false,
      pet: 'goat',
      [CHANGES_KEY]: parseDateValuesInObject({ age: '2020-07-02', hungry: '2020-07-14', pet: '2020-07-24' })
    }

    expect(merge(docA, merge(docB, docC))).to.eql(expected)
    expect(merge(merge(docB, docA), docC)).to.eql(expected)
    expect(merge(docB, merge(docC, docA))).to.eql(expected)
    expect(merge(docB, merge(docB, docB))).to.eql(docB)

    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
    expect(merge(docC, docC)).to.eql(docC)
  })
})
