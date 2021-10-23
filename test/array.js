/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import lm from '../src/main.js'

const { expect } = chai
const MARKER = lm.MERGEABLE_MARKER

describe('array', function () {
  it('filter simple state', function () {
    const elements = { 0: 'Abc', 1: 'df', 2: 'g', 3: '' }

    const filteredByStringLength = lm.filter(elements, item => item.length > 1)
    const filteredById = lm.filter(elements, (_, key) => key > 1)

    expect(filteredByStringLength).to.be.eql(['Abc', 'df'])
    expect(filteredById).to.be.eql(['g', ''])
  })

  it('filter nested', function () {
    const list = { 100: { age: 12 } }

    lm.set(list, 101, { age: 23 })
    lm.set(list, 102, { age: 72 })

    const filtered = lm.filter(list, item => item.age % 3 === 0)

    expect(filtered).to.be.eql([{ age: 12 }, { age: 72 }])
  })

  it('filter by modifications')

  it('filter without callback gives back array without marker', function () {
    const elements = { 0: 'Abc', 2: 'g', 3: '', [MARKER]: {} }

    const filtered = lm.filter(elements)

    expect(filtered).to.be.eql(['Abc', 'g', ''])
  })

  it('map nested', function () {
    const list = {
      hqm: { base: 2, multiplier: 3, [MARKER]: {} },
      owz: { base: -56, multiplier: 0.9, [MARKER]: {} },
      vpt: { base: 7, multiplier: 21, [MARKER]: {} },
      hox: { base: 24, multiplier: 2 }
    }

    const mapped = lm.map(list, item => item.base * item.multiplier)

    expect(mapped).to.be.eql([6, -50.4, 147, 48])
  })
})
