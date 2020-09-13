const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect
const CHANGES_KEY = legibleMergeable.KEY.MODIFICATIONS

/* eslint-disable no-unused-expressions */

describe('create', function () {
  it('a mergeable object', function () {
    const base = {
      id: 1,
      name: 'Oatmilk',
      price: 140
    }

    const item = legibleMergeable.Object(base)

    expect(item.toBase()).to.eql(base)
    expect(item.dump()).to.eql({
      ...base,
      [CHANGES_KEY]: {}
    })
  })

  it('a mergeable array', function () {
    // const list = legibleMergeable.Array()

    // expect(item.toBase()).to.eql(base)
    // expect(item.dump()).to.eql({
    //   ...base,
    //   [CHANGES_KEY]: {}
    // })
  })

  it('a mergeable object with changes', function () {
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 140,
      [CHANGES_KEY]: {
        price: new Date('2020-08-26')
      }
    }

    const item = legibleMergeable.Object(original)
    expect(item.dump()).to.eql(original)

    delete original[CHANGES_KEY]
    expect(item.toBase()).to.eql(original)
  })
})

describe('manipulate', function () {
  it('a mergeable object', function () {
    const date = new Date()
    const item = legibleMergeable.Object({
      id: 1,
      name: 'Oatmilk',
      price: 140
    })

    item.set('price', 135, date)
    item.set('isOpen', false, date)

    const dump = item.dump()
    const changes = dump[CHANGES_KEY]
    delete dump[CHANGES_KEY]

    const expected = {
      id: 1,
      name: 'Oatmilk',
      price: 135,
      isOpen: false
    }

    expect(dump).to.eql(expected)
    expect(changes.isOpen.getTime()).to.equal(date.getTime())
    expect(changes.price.getTime()).to.equal(date.getTime())
    expect(changes.name).to.be.undefined
    expect(changes.id).to.be.undefined
  })

  it('a mergeable object with changes', function () {
    const date = new Date('2020-09-06')
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 240,
      isOpen: true,
      [CHANGES_KEY]: {
        name: new Date('2020-08-03'),
        isOpen: new Date('2020-08-05'),
        price: new Date('2020-09-01')
      }
    }
    const item = legibleMergeable.Object(original)

    if (item.get('price') > 200) {
      item.set('name', 'Almondmilk', date)
      item.delete('isOpen', date)
    }
    if (!item.has('isOpen')) {
      item.set('isCold', true, date)
    }

    const dump = item.dump()
    const changes = dump[CHANGES_KEY]
    delete dump[CHANGES_KEY]

    const expected = {
      id: 1,
      name: 'Almondmilk',
      price: 240,
      isCold: true
    }

    expect(dump).to.eql(expected)
    expect(changes.name.getTime()).to.equal(date.getTime())
    expect(changes.isCold.getTime()).to.equal(date.getTime())
    expect(changes.isOpen.getTime()).to.equal(date.getTime())
    expect(changes.price.getTime()).to.equal((new Date('2020-09-01').getTime()))
    expect(changes.id).to.be.undefined
  })
})

describe('merge', function () {
  it('a cloned and changed object', function () {
    const replicaA = legibleMergeable.Object({
      name: 'Oatmilk',
      price: 120,
      isCold: true,
      isOpen: false,
      [CHANGES_KEY]: {
        name: '2020-08-03',
        isCold: '2020-08-05'
      }
    })

    const replicaB = replicaA.clone()
    const date = new Date('2020-08-04')
    replicaB.set('name', 'Almondmilk', date)
    replicaB.set('isCold', false, date)
    replicaB.delete('price', date)

    const replicaC1 = legibleMergeable.merge(replicaA, replicaB)
    const replicaC2 = replicaB.merge(replicaA)

    const dump = replicaC1.dump()
    const changes = dump[CHANGES_KEY]
    delete dump[CHANGES_KEY]

    const expected = {
      name: 'Almondmilk',
      isCold: true,
      isOpen: false
    }

    expect(replicaC1).to.eql(replicaC2)
    expect(dump).to.eql(expected)
    expect(replicaA.size()).to.equal(4)
    expect(replicaB.size()).to.equal(3)
    expect(changes.name.getTime()).to.equal(date.getTime())
    expect(changes.price.getTime()).to.equal(date.getTime())
    expect(changes.isCold.getTime()).to.equal((new Date('2020-08-05')).getTime())
    expect(changes.isOpen).to.be.undefined
  })
})
