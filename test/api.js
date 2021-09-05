const expect = require('chai').expect

const legibleMergeable = require('../dist/legible-mergeable.js').legibleMergeable
const Mergeable = require('../dist/legible-mergeable.js').Mergeable
const MODIFICATIONS_KEY = Mergeable.MODIFICATIONS_KEY

const newDate = date => (new Date(date)).toISOString()

/* eslint-disable no-unused-expressions */

describe('api', function () {
  describe('create', function () {
    it('an empty object', function () {
      const item = legibleMergeable.create()

      expect(item.base()).to.eql({})
      expect(item.dump()).to.eql({ [MODIFICATIONS_KEY]: {} })
    })

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
          price: newDate('2020-08-26')
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
      const date = newDate(new Date())
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
      expect(changes.isOpen).to.equal(date)
      expect(changes.price).to.equal(date)
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
      expect(changes.isOpen).to.be.not.null
      expect(changes.price).to.be.not.null
      expect(changes.name).to.be.not.null
      expect(changes.id).to.be.undefined
    })

    it('a mergeable object with changes', function () {
      const date = newDate('2020-09-06')
      const original = {
        id: 1,
        name: 'Oatmilk',
        price: 240,
        isOpen: true,
        [MODIFICATIONS_KEY]: {
          name: newDate('2020-08-03'),
          isOpen: newDate('2020-08-05'),
          price: newDate('2020-09-01')
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
      expect(changes.name).to.equal(date)
      expect(changes.isCold).to.equal(date)
      expect(changes.isOpen).to.equal(date)
      expect(changes.price).to.equal(newDate('2020-09-01'))
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
      const date = newDate('2020-08-04')
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
      expect(changes.name).to.equal(date)
      expect(changes.price).to.equal(date)
      expect(changes.isCold).to.equal('2020-08-05')
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
          [MODIFICATIONS_KEY]: { list: newDate('2020-08-05') }
        },
        [MODIFICATIONS_KEY]: {}
      },
      noMergeable: { uid: 'bar', age: 21 }
    })

    it('get nested objects', function () {
      const item = legibleMergeable.create(getSample())

      expect(item.get(7)).to.be.an.instanceof(Mergeable)
      expect(item.get('foo')).to.be.an.instanceof(Mergeable)
      expect(item.get('foo').get('nested')).to.be.an.instanceof(Mergeable)
      expect(item.get('noMergeable')).not.to.be.an.instanceof(Mergeable)
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

    xit('merge', function () {
      // const replicaA = legibleMergeable.create({
      //   1: {
      //     name: 'Thriller', price: 9.99, authors: ['Peter'],
      //     [MODIFICATIONS_KEY]: { name: '2021-08-03', price: '2021-08-01' }
      //   },

      //   2: {
      //     name: 'Novel', price: 5.99, authors: ['Fridolin', 'Gustav'],
      //     [MODIFICATIONS_KEY]: { name: '2021-08-03', price: '2021-08-01' }
      //   },

      //   [MODIFICATIONS_KEY]: {
      //     1: '2021-08-01'
      //   }
      // })

      // const replicaB = replicaA.clone()
      // const date = newDate('2021-08-10')
      // replicaB.delete(2, date)
      // replicaB.get(1).set('name', 'Science Fiction', date)
      // replicaB.get(1).set('authors', ['Bob'], date)
      // replicaB.delete('size', date)

      // const replicaC1 = legibleMergeable.merge(replicaA, replicaB)
      // const replicaC2 = replicaB.merge(replicaA)

      // const dump = replicaC1.dump()
      // const modifications = dump[MODIFICATIONS_KEY]
      // delete dump[MODIFICATIONS_KEY]

      // const expected = {
      //   1: {
      //     name: 'Thriller', price: 9.99, authors: ['Peter'],
      //     [MODIFICATIONS_KEY]: { name: '2021-08-03', price: '2021-08-01' }
      //   },

      //   2: {
      //     name: 'Novel', price: 5.99, authors: ['Fridolin', 'Gustav'],
      //     [MODIFICATIONS_KEY]: { name: '2021-08-03', price: '2021-08-01' }
      //   },

      //   [MODIFICATIONS_KEY]: {
      //     1: '2021-08-01',
      //   }
      // }

      // expect(replicaC1).to.eql(replicaC2)
      // expect(dump).to.eql(expected)
      // expect(replicaA.size()).to.equal(4)
      // expect(replicaB.size()).to.equal(3)
      // expect(modifications.name).to.equal(date)
      // expect(modifications.price).to.equal(date)
      // expect(modifications.isCold).to.equal(newDate('2020-08-05'))
      // expect(modifications.isOpen).to.be.undefined
    })
  })
})
