* research how to compress modification dates if there are extacly same of multiple properties
* more options: set date when calling create(), pass mod key into static funktions (is kept in instances)
* same()/compare() are mergeables the same?
* fix merging: always merge mergeables, even if their parent date doesn't match (do i really want that?)
* NICE TO HAVE: throw error if the new date in `set()` is before the previous mod date (relative to the wall clock) (but this could be wanted) OR throw error if dates in merging are in the past relative to wall clock (this would make the merge coupled with outside info tho)

## hash

to compare two states and check whether they diverged

states can be the same but their modification dates can differ. so i need to hash both

i also need to know when a merge didnt/wont change anything

* calculate on demand
* calculate every time sonething changes

just conpare the latest date

```
doc.hasChangedSince(date)

doc.compare(docB)
```

use cases

* comparing latest date
  * prevent merge (and upload)
  * detect change in formular 

## static merge should handle raw dumps

so far i use a specialized dump { state, '^m' } for the merge. which is kinda stupid, because i only do that, to recognize a mergeable. and because the merge tests dont create a mergeable instance.

the solution: offer support for instances *and* dumps 💁‍♀️ this would also enable the use of the merge function without ever needing the Mergeable Class

```
transferObject = { _state: {}, _modifications: {}, __isMergeable: true }

dump = { ..., ^m: {} }

dump <-> transferObject

transferObject is a subset of Mergeable

dump <-> internal

-------

// so far
dump > instance

// dump > transferObject > instance
// dump > transferObject > dump

legibleMergeable.merge(instance, dump)
legibleMergeable.merge(dump, dump)

// returns dump (without needing to convert to an instance)
forceDump, forceInstance?

TODO: measure perfomance improvement not to create class
console.time('t') consol

```

## soft delete

encourage "soft delete" in readme: use some flag to hide the item. the flag should be always refreshed. merging: the flag gets always compared to the latest modification date(?)

## manual order

should not be part of core. nevertheless i'm not sure if i should not at least offer some helper methods

const list = legibleMergeable.fromArray([ d1, d2, { ^m: { 1: ..., 'order': date } } ], 'id' )

list.dumpAsArray() or just dump()

may this even be a case where i should extend Mergeable for smthng like MergeableArray

then i could overwrite all the imprtant functions. include a `_order` property, which is just handled as primitive value and represents the order of the top level as an array of identifiers. reorder() just takes a list of ids in their represantative order and sets the modification date – which means ordering the list is one action

```
arrayToObject (array, customIndex) {
return array.reduce((acc, value, i) => {
  const key = customIndex == null ? i : customIndex

  acc[value[key]] = value

  return acc
}, {})
}
```
