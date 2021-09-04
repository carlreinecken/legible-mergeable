const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect
const MODIFICATIONS_KEY = legibleMergeable.KEY.MODIFICATIONS

/* eslint-disable no-unused-expressions */

describe('api', function () {
  describe('create', function () {
    it('a mergeable object', function () {
      const base = {
        id: 1,
        name: 'Oatmilk',
        price: 140
      }

      const item = legibleMergeable.create(base)

      expect(item.base()).to.eql(base)

      base[MODIFICATIONS_KEY] = {}
      expect(item.dump()).to.eql(base)
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

      const item = legibleMergeable.create(original)
      expect(item.dump()).to.eql(original)

      delete original[MODIFICATIONS_KEY]
      expect(item.base()).to.eql(original)
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

    it('a mergeable object with the proxy via the use getter', function () {
      const item = legibleMergeable.create({
        id: 7,
        name: 'Oatmilk',
        price: 140
      })

      item.use.price = 42
      item.use.isOpen = true
      delete item.use.name

      const dump = item.dump()
      const changes = dump[MODIFICATIONS_KEY]
      delete dump[MODIFICATIONS_KEY]

      const expected = {
        id: 7,
        price: 42,
        isOpen: true
      }

      expect(dump).to.eql(expected)
      expect(item.use.isOpen).to.eql(true)
      expect(item.use.price).to.eql(42)
      expect(item.use.name).to.be.undefined
      expect(changes.isOpen.getTime()).to.be.not.null
      expect(changes.price.getTime()).to.be.not.null
      expect(changes.name.getTime()).to.be.not.null
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
      const item = legibleMergeable.create(original)

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

  describe('merge', function () {
    it('a cloned and changed object', function () {
      const replicaA = legibleMergeable.create({
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

  describe('recursive', function () {
    const getSample = () => ({
      7: { uid: 7, name: 'gustav', [MODIFICATIONS_KEY]: {} },
      foo: {
        uid: 'foo',
        age: 8,
        nested: {
          list: [1, 2, 4, 8, 16, 32, 64],
          [MODIFICATIONS_KEY]: { list: new Date('2020-08-05') }
        },
        [MODIFICATIONS_KEY]: {}
      },
      noMergeable: { uid: 'bar', age: 21 }
    })

    it('get nested objects', function () {
      const item = legibleMergeable.create(getSample())

      expect(item.get(7)).to.be.an.instanceof(legibleMergeable)
      expect(item.get('foo')).to.be.an.instanceof(legibleMergeable)
      expect(item.get('foo').get('nested')).to.be.an.instanceof(legibleMergeable)
      expect(item.get('noMergeable')).not.to.be.an.instanceof(legibleMergeable)
    })

    it('change properties of nested objects', function () {
      const item = legibleMergeable.create(getSample())

      item.get(7).delete('name')
      item.get('foo').set('age', 10)
      item.get('foo').get('nested').set('age', 44)

      expect(item.get(7).get('name')).to.be.undefined
      expect(item.get('foo').get('age')).to.be.eql(10)
      expect(item.get('foo').get('nested').get('age')).to.be.eql(44)
    })

    it('get base', function () {
      const raw = getSample()
      const item = legibleMergeable.create(raw)

      const expectedBase = {
        7: { uid: 7, name: 'gustav' },
        foo: { uid: 'foo', age: 8, nested: { list: [1, 2, 4, 8, 16, 32, 64] } },
        noMergeable: { uid: 'bar', age: 21 }
      }

      expect(item.base()).to.eql(expectedBase).but.to.not.equal(expectedBase)
    })

    it('get base and dump', function () {
      const raw = getSample()
      const item = legibleMergeable.create(raw)

      const expectedDump = raw
      expectedDump[MODIFICATIONS_KEY] = {}

      expect(item.dump()).to.eql(expectedDump).but.to.not.equal(expectedDump)
    })

    it('clone', function () {
      const item = legibleMergeable.create(getSample())
      const itemClone = item.clone().dump()

      expect(item.dump()).to.eql(itemClone).but.to.not.equal(itemClone)
    })
  })
})
