export class AbstractMergeable {
  static get MODIFICATIONS_KEY () {
    return '^M3Rg34bL3'
  }

  constructor () {
    if (this.constructor === AbstractMergeable) {
      throw new Error('Can\'t instantiate the abstract class AbstractMergeable!')
    }
  }
}
