const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect
const MODIFICATIONS_KEY = legibleMergeable.KEY.MODIFICATIONS
const POSITIONS_KEY = legibleMergeable.KEY.POSITIONS

/* eslint-disable no-unused-expressions */

xdescribe('create', function () {
  it('a mergeable object', function () {
    const base = {
      id: 1,
      name: 'Oatmilk',
      price: 140
    }

    const item = legibleMergeable.Object(base)

    expect(item.base()).to.eql(base)
    expect(item.dump()).to.eql({
      ...base,
      [MODIFICATIONS_KEY]: {}
    })
  })

  xit('a mergeable array (position objects)', function () {
    const date = new Date('2020-09-13').toISOString()
    const list = legibleMergeable.Array()
    const item = {
      id: 1,
      name: 'Hazelnutmilk',
      purchased: false
    }

    list.push(item, date)

    expect(list.base()).to.eql([item])
    console.log(list.meta(), POSITIONS_KEY)
    const meta = list.meta()
    expect(meta[MODIFICATIONS_KEY]).to.eql({ [item.id]: date })
    expect(meta[POSITIONS_KEY][item.id]).to.not.be.undefined
  })

  it('a mergeable object with changes', function () {
    const original = {
      id: 1,
      name: 'Oatmilk',
      price: 140,
      [MODIFICATIONS_KEY]: {
        price: new Date('2020-08-26')
      }
    }

    const item = legibleMergeable.Object(original)
    expect(item.dump()).to.eql(original)

    delete original[MODIFICATIONS_KEY]
    expect(item.base()).to.eql(original)
  })
})

xdescribe('manipulate', function () {
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
    const changes = dump[MODIFICATIONS_KEY]
    delete dump[MODIFICATIONS_KEY]

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
      [MODIFICATIONS_KEY]: {
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
    const changes = dump[MODIFICATIONS_KEY]
    delete dump[MODIFICATIONS_KEY]

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

xdescribe('merge', function () {
  it('a cloned and changed object', function () {
    const replicaA = legibleMergeable.Object({
      name: 'Oatmilk',
      price: 120,
      isCold: true,
      isOpen: false,
      [MODIFICATIONS_KEY]: {
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
    const changes = dump[MODIFICATIONS_KEY]
    delete dump[MODIFICATIONS_KEY]

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
