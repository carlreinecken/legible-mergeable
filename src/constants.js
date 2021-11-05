export const MERGEABLE_MARKER = '^lm'
// TODO: Evaluate where this needs to be implemented: Property keys starting
// with the MARKER are ignored when iterating over the mergeable.
export const POSITION_KEY = MERGEABLE_MARKER + '.position'

export const MERGE_RESULT_IS_IDENTICAL = 'MERGE_RESULT_IS_IDENTICAL'
export const WRONG_TYPE_GIVEN_EXPECTED_OBJECT = 'WRONG_TYPE_GIVEN_EXPECTED_OBJECT'

export const POSITION = {
  DEFAULT_MIN: 0,
  DEFAULT_MAX: parseInt('zzzzzz', 36),
  IDENTIFIER_SEPARATOR: ' ',
  INNER_RANGE_SIZE: 10000000
}
