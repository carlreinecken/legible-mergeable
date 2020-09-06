const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect

/* eslint-disable no-unused-expressions */

describe('create', function () {
  it('a mergeable object', function () {
    const base = {
      id: 1,
      name: 'Oatmilk',
      price: 140
    }

    const item = legibleMergeable.create(base)

    expect(item.toBase()).to.eql(base)
    expect(item.dump()).to.eql({
      ...base,
      _changes: {}
    })
  })

  it('a mergeable object with changes', function () {
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 140,
      _changes: {
        price: new Date('2020-08-26')
      }
    }

    const item = legibleMergeable.create(original)
    expect(item.dump()).to.eql(original)

    delete original._changes
    expect(item.toBase()).to.eql(original)
  })
})

describe('manipulate', function () {
  it('a mergeable object', function () {
    const date = new Date()
    const item = legibleMergeable.create({
      id: 1,
      name: 'Oatmilk',
      price: 140
    })

    item.set('price', 135, date)
    item.set('isOpen', false, date)

    const { _changes, ...dump } = item.dump()
    const expected = {
      id: 1,
      name: 'Oatmilk',
      price: 135,
      isOpen: false
    }

    expect(dump).to.eql(expected)
    expect(_changes.isOpen.getTime()).to.equal(date.getTime())
    expect(_changes.price.getTime()).to.equal(date.getTime())
    expect(_changes.name).to.be.undefined
    expect(_changes.id).to.be.undefined
  })

  it('a mergeable object with changes', function () {
    const date = new Date('2020-09-06')
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 240,
      isOpen: true,
      _changes: {
        name: new Date('2020-08-03'),
        isOpen: new Date('2020-08-05'),
        price: new Date('2020-09-01')
      }
    }
    const item = legibleMergeable.create(original)

    if (item.get('price') > 200) {
      item.set('name', 'Almondmilk', date)
      item.delete('isOpen', date)
    }
    if (!item.has('isOpen')) {
      item.set('isCold', true, date)
    }

    const { _changes, ...dump } = item.dump()
    const expected = {
      id: 1,
      name: 'Almondmilk',
      price: 240,
      isCold: true
    }

    expect(dump).to.eql(expected)
    expect(_changes.name.getTime()).to.equal(date.getTime())
    expect(_changes.isCold.getTime()).to.equal(date.getTime())
    expect(_changes.isOpen.getTime()).to.equal(date.getTime())
    expect(_changes.price.getTime()).to.equal((new Date('2020-09-01').getTime()))
    expect(_changes.id).to.be.undefined
  })
})

describe('merge', function () {
  it('a cloned and changed object', function () {
    const replicaA = legibleMergeable.create({
      name: 'Oatmilk',
      price: 120,
      isCold: true,
      isOpen: false,
      _changes: {
        name: '2020-08-03',
        isCold: '2020-08-05'
      }
    })

    const replicaB = replicaA.clone()
    const date = new Date('2020-08-04')
    replicaB.set('name', 'Almondmilk', date)
    replicaB.set('isCold', false, date)
    replicaB.delete('price', date)

    const replicaC1 = replicaA.merge(replicaB)
    const replicaC2 = replicaB.merge(replicaA)

    const { _changes, ...dump } = replicaC1
    const expected = {
      name: 'Almondmilk',
      isCold: true,
      isOpen: false
    }

    expect(replicaC1).to.eql(replicaC2)
    expect(dump).to.eql(expected)
    expect(_changes.name.getTime()).to.equal(date.getTime())
    expect(_changes.price.getTime()).to.equal(date.getTime())
    expect(_changes.isCold.getTime()).to.equal((new Date('2020-08-05')).getTime())
    expect(_changes.isOpen).to.be.undefined
  })
})
