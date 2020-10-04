const expect = require('chai').expect
const generate = require('../dist/legible-mergeable.js')._positionFunctions.generate
const compare = require('../dist/legible-mergeable.js')._positionFunctions.compare

describe('position', function () {
  it('compare', function () {
    expect(compare([534], [333])).to.equal(1)
    expect(compare([0], [1295])).to.equal(-1)
    expect(compare([159, 222], [160])).to.equal(-1)
    expect(compare([362, 556], [362])).to.equal(1)
    expect(compare([999, 577], [999, 577])).to.equal(0)
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
  })
})
