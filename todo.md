* [x] recursive objects
* [x] set with callback, so previous value can be easier modified
* option to set date when calling create()
* some hash
* rename state to iterator?
* api to modify a whole Mergeable
* research how to compress modification dates if there are extacly same of multiple properties
* NICE TO HAVE: api add mergeable item less verbose
* NICE TO HAVE: throw error if the new date in `set()` is before the previous mod date (relative to the wall clock) (but this could be wanted) OR throw error if dates in merging are in the past relative to wall clock (this would make the merge coupled with outside info tho)

## api to modify a whole Mergeable and detect the changes made and set only their modification date

this would need to compare the new item with the old one (computing the state as hash? or using a proxy). but it's probably such a practility boost. a vue formular wouldnt need to reference the Mergeable in the inputs itself but only a simple base() object

```javascript
list.get(1).transaction(item => {
  item.done = true
  // item.title is not modified
  item.title = item.title
  
  // nested transaction should be no problem, this should only set a modification date on item.subtask.0
  item.subtask.get(0).transaction(sub => {
    sub.done = true
  })

  // this should only set a modification date on item.subtask.1
  item.subtask.delete(1)
}, date)
```

## hash

to compare two states and check whether they diverged

states can be the same but their modification dates can differ. so i need to hash both

i also need to know when a merge didnt change anything

## iterator

when iterating in Vuejs over an object to access its children

just rename state() to iterator()

## add mergeable item

this is way to verbose.. NICE TO HAVE! this is only needed if a dump is added.

```
list.set(44, legibleMergeable.create({ title: ' hi' }))

// too confusing
list.create(44, { title: 'hi' })

// also to verbose
list.set(44, { title: 'hi', '^m': {} })

// better
list.setMergeable(44, { title: 'hi' })

// better
list.set(44, { title: 'hi' }, { mergeable: true })
```

## NICE TO HAVE: improve api of accessing on nested mergeables

needed? i transactions would make this superflous

```
list.get('devs').get(2).set('name', 'Gustav')
    
list.set('devs.2.name', 'Gustav')

list.set('devs', 2, 'name', 'Gustav')

list.set(['devs', 2, 'name'], 'Gustav')
```

## manual order

should not be part of core. nevertheless i'm not sure if i should not at least offer some helper methods

const list = legibeMergeable.fromArray([ d1, d2, { ^m: { 1: ..., 'order': date } } ], 'id' )

list.dumpAsArray() or just dump()

may this even be a case where i should extend Mergeable for smthng like MergeableArray

then i could overwrite all the imprtant functions. include a `_order` property, which is just handled as primitive value and represents the order of the top level as an array of identifiers. reorder() just takes a list of ids in their represantative order and sets the modification date

for merging i would need to inject the order into the state.. thats disgusting oO

```javascript
arrayToObject (array, customIndex) {
return array.reduce((acc, value, i) => {
  const key = customIndex == null ? i : customIndex

  acc[value[key]] = value

  return acc
}, {})
}
```
