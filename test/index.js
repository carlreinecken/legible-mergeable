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
        price: '2020-08-26'
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
    const date = new Date()
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 240,
      isOpen: true,
      _changes: {
        name: '2020-08-03',
        isOpen: '2020-08-05'
      }
    }
    const item = legibleMergeable.create(original)

    item.set('name', 'Almondmilk', date)
    item.delete('isOpen', date)
    item.set('isCold', true, date)

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
    expect(_changes.price).to.be.undefined
    expect(_changes.id).to.be.undefined
  })
})
