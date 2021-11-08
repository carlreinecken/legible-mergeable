/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import {
  generate,
  compare,
  previous,
  next,
  MIN_SIZE,
  MAX_SIZE,
  maxSizeAtDepth,
  SAFE_ZONE
} from '../src/position-functions.js'
import { PositionHasNoRoomError } from '../src/errors.js'

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
    expect(previous([[112], [44]], [44])).to.eql([MIN_SIZE])
    expect(previous([[22], [33]], [1])).to.eql([MIN_SIZE])
    expect(previous([[], [1]], [1])).to.eql([MIN_SIZE])
    expect(previous([], [10])).to.eql([MIN_SIZE])
    expect(previous([], [])).to.eql([MIN_SIZE])
  })

  it('next position', function () {
    expect(next([[333], [534], [4], [511]], [333])).to.eql([511])
    expect(next([[44, 12], [33], [44, 3], [44, 9]], [34])).to.eql([44, 3])
    expect(next([[44, 12], [33], [44, 3], [44, 9]], [1])).to.eql([33])
    expect(next([[7889], [44]], [7889])).to.eql([MAX_SIZE])
    expect(next([[], [1]], [1])).to.eql([MAX_SIZE])
    expect(next([], [10])).to.eql([MAX_SIZE])
    expect(next([], [])).to.eql([MAX_SIZE])
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

    it('with no new nesting level, because difference is just as big as the SAFE_ZONE', function () {
      const min = 10
      const max = SAFE_ZONE * 2 + min
      const result = generate([200, min], [200, max])

      expect(result).to.have.lengthOf(2)
      expect(result[0]).to.equal(200)
      expect(result[1]).to.be.within(min, max)
    })

    it('with a new nesting level, because difference is just 1 larger than the SAFE_ZONE', function () {
      const min = 10
      const max = SAFE_ZONE + min - 1
      const result = generate([200, min], [200, max])

      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.equal(200)
      expect(result[1]).to.equal(min)
      expect(result[2]).to.be.within(0, maxSizeAtDepth(2))
    })

    it('with no new nesting and swapped positions', function () {
      const result = generate([2000], [119])

      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.be.above(119).and.below(2000)
    })

    describe('bug with following segments', function () {
      // [0,6] & [0,2] => [0,(6-MAX)] not [0,(2-6)]

      it('set "next" to MAX if previous heads are not the same', function () {
        const result = generate([0, 6000], [200, 1700])

        expect(result).to.have.lengthOf(2)
        expect(result[0]).to.be.eql(0)
        expect(result[1]).to.be.above(6000)
      })

      it('set "next" to MAX if previous heads are not the same (nested)', function () {
        const result = generate([0, 0, 6000], [0, 200, 1700])

        expect(result).to.have.lengthOf(3)
        expect(result[0]).to.be.eql(0)
        expect(result[1]).to.be.eql(0)
        expect(result[2]).to.be.above(6000)
      })

      it('set "next" to MAX if previous heads are not the same (considering order)', function () {
        const result = generate([119, 400], [50, 200])

        expect(result).to.have.lengthOf(2)
        expect(result[0]).to.be.eql(50)
        expect(result[1]).to.be.above(200)
      })
    })

    it('fail when no space in between', function () {
      expect(() => generate([17216], [17216])).to.throw(PositionHasNoRoomError)
    })

    it('fail when no space in between nested', function () {
      expect(() => generate([17216, 1], [17216, 1])).to.throw(PositionHasNoRoomError)
    })

    it('with a new nesting level in nested level', function () {
      const result = generate([1188, 18], [1188, 20])
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.equal(1188)
      expect(result[1]).to.equal(18)
      expect(typeof result[2]).to.equal('number')
    })

    it('with a new nesting level in two nested levels', function () {
      const result = generate([4861, 631], [4861, 632])
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.equal(4861)
      expect(result[1]).to.equal(631)
      expect(typeof result[2]).to.equal('number')
    })

    it('between null and a small upperbound', function () {
      const upperBound = [0, 200]
      const result = generate(null, upperBound)
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.equal(0)
      expect(result[1]).to.equal(0)
      expect(typeof result[2]).to.equal('number')
    })

    it('between a small lowerbound and null', function () {
      const result = generate([119], null)

      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.be.above(119)
    })
  })
})
