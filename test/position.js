/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import { POSITION } from '../src/constants.js'
import { generate, compare, previous, next } from '../src/position-functions.js'

const { expect } = chai

describe('position', function () {
  it('compare', function () {
    expect(compare([534], [333])).to.equal(1)
    expect(compare([0], [1295])).to.equal(-1)
    expect(compare([159, 222], [160])).to.equal(-1)
    expect(compare([362, 556], [362])).to.equal(1)
    expect(compare([999, 577], [999, 577])).to.equal(0)
    expect(compare([], [10])).to.equal(-1)
    expect(compare([], [])).to.equal(0)
  })

  it('previous position', function () {
    expect(previous([[333], [534], [4], [511]], [333])).to.eql([4])
    expect(previous([[44, 12], [112], [44, 3], [44, 9]], [50])).to.eql([44, 12])
    expect(previous([[112], [44]], [44])).to.eql([POSITION.DEFAULT_MIN])
    expect(previous([[22], [33]], [1])).to.eql([POSITION.DEFAULT_MIN])
    expect(previous([[], [1]], [1])).to.eql([POSITION.DEFAULT_MIN])
    expect(previous([], [10])).to.eql([POSITION.DEFAULT_MIN])
    expect(previous([], [])).to.eql([POSITION.DEFAULT_MIN])
  })

  it('next position', function () {
    expect(next([[333], [534], [4], [511]], [333])).to.eql([511])
    expect(next([[44, 12], [33], [44, 3], [44, 9]], [34])).to.eql([44, 3])
    expect(next([[44, 12], [33], [44, 3], [44, 9]], [1])).to.eql([33])
    expect(next([[7889], [44]], [7889])).to.eql([POSITION.DEFAULT_MAX])
    expect(next([[], [1]], [1])).to.eql([POSITION.DEFAULT_MAX])
    expect(next([], [10])).to.eql([POSITION.DEFAULT_MAX])
    expect(next([], [])).to.eql([POSITION.DEFAULT_MAX])
  })

  describe('generate position', function () {
    it('with one new identifier', function () {
      const result = generate([543], [333])
      expect(result.length).to.equal(2)
      expect(typeof result[0]).to.equal('number')
      expect(result[0]).to.be.within(333, 543)
    })

    it('with a new nesting level', function () {
      const result = generate([124], [125])
      expect(result.length).to.equal(2)
      expect(result[0]).to.equal(124)
      expect(typeof result[1]).to.equal('number')
    })

    it('with a new nesting level in nested level', function () {
      const result = generate([1188, 18], [1188, 20])
      expect(result.length).to.equal(3)
      expect(result[0]).to.equal(1188)
      expect(result[1]).to.equal(18)
      expect(typeof result[2]).to.equal('number')
    })

    it('with NO new nesting level, because difference is just about the threshold', function () {
      const threshold = 10000000
      const min = 10
      const max = threshold * 2 + min + 1
      const result = generate([2000, min], [2000, max])
      expect(result.length).to.equal(2)
      expect(result[0]).to.equal(2000)
      expect(result[1]).to.be.within(min, max)
    })

    it('with no nesting level, because first level has large enough difference', function () {
      const threshold = 10000000
      const min = 100
      const max = threshold * 2 + min + 1
      const result = generate([min, 42], [max, 44])
      expect(result.length).to.equal(1)
      expect(result[0]).to.be.within(min, max)
    })

    it('fail when no space in between', function () {
      try {
        generate([17216], [17216])
      } catch (error) {
        expect(error.message).to.contain('no space')
      }
    })

    it('fail when no space in between nested', function () {
      try {
        generate([17216, 1], [17216, 1])
      } catch (error) {
        expect(error.message).to.contain('no space')
      }
    })

    it('with a new nesting level in nested level', function () {
      const result = generate([1188, 18], [1188, 20])
      expect(result.length).to.equal(3)
      expect(result[0]).to.equal(1188)
      expect(result[1]).to.equal(18)
      expect(typeof result[2]).to.equal('number')
    })

    it('with a new nesting level in two nested levels', function () {
      const result = generate([4861, 631], [4861, 632])
      expect(result.length).to.equal(3)
      expect(result[0]).to.equal(4861)
      expect(result[1]).to.equal(631)
      expect(typeof result[2]).to.equal('number')
    })

    it('between 0 and a small upperbound', function () {
      const upperBound = [0, 2000]
      const result = generate(null, upperBound)
      expect(result.length).to.equal(3)
      expect(result[0]).to.equal(0)
      expect(result[1]).to.equal(0)
      expect(typeof result[2]).to.equal('number')
    })
  })
})
