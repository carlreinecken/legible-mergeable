export default class LegibleMergeableError extends Error {
  constructor (message) {
    super(message)
    this.name = 'LegibleMergeableError'
  }
}
