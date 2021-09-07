# legibleMergeable

In favor of simplicity rather than trying to take on everything, this library can make simple objects and its properties to a CRDT (Conflict-free Replicated Data Type). The output JSON is totally simple & legible. Among other things, because it doesn't keep a history.

> Not for use in production. I use it only in a private app.

It doesn't matter in which order different customized states are applied (associative, commutive and idompotent), conflicting changes will always be deterministically resolved. It will always prefer the newest change.

> Currently it uses UTC Timestamps for this, which is flawed and should probably be replaced by some logical clock or hybrid.

The merge will not merge characters in strings, it will only merge added, deleted and changed properties. If you have nested Mergeables a deletion of a parent object always overwrites any (later) modification of the deleted child object.

When exporting the Mergeable as JSON it stays an object and thus stays legible.

Judge for yourself, this is rather legible (compared to other CRDTs):

```json
{
  1: {
    "id": 1,
    "title": "Buy Sugar",
    "done": false,
    "^m": { "title": "2020-10-23T15:50:02.064Z" }
  },
  2: {
    "id": 2,
    "title": "Change Lightbulb",
    "done": true,
    "^m": { "done": "2020-10-23T15:50:02.064Z" }
  },
  "^m": {
    1: "2020-10-21T10:00:00.000Z",
    2: "2020-10-21T10:00:00.000Z"
  },
]
```

Inside the objects is a property included for modification dates as `^m`. This is also used to detect a nested Mergeable. The child object gets only parsed and merged if the it has the identifier. The identifier can have an empty object.

## Usage MergeableArray

All list elements are expected to be a simple JSON object with at least an unique `id`. The objects can have any arbitrary properties and values. The JSON datatypes are allowed: string, number, boolean, arrays and objects.

Manipulating methods can be passed optionally a date timestamp to specify when it was modified. When not provided it will take the current time, this option shouldn't be needed.

### Create

Create a mergeable array with or without an exisiting normal array or mergeable array as parsed JSON.

```javascript
const alice = legibleMergeable.Array()
const bob = legibleMergeable.Array([
    { id: randomId(), title: 'Test', done: false }
])
```

The method `legibleMergeable.Array([payload[, options]]) can be passed options. Following options are available:

* `positions`: NOT IMPLEMENTED YET! Disable positions with `{ positions: false }`. No positions will be generated, no positions are considered when merging and existing positions are discarded. This can be useful when the array is supposed to be sorted by a property and not manually.
* `identifier`: NOT IMPLEMENTED YET! Define own name for identifier in the objects instead of the default `id`.

### Add Element

Add an element at the end of the array with `push(element[, date])` or after another item `insert(element, afterId[, date])`.

```javascript
alice.insert.push({
    id: randomId(),
    done: false,
    title: 'Change Lightbulb'
})

bob.insert.insert({
    id: randomId(),
    done: true,
    title: 'Buy Oatmilk'
})
```

### Get

```javascript
state()
has(id)
get(id)
```

### `move(id, afterId[, date])`

```javascript
bob.move(1, 2)
```

### `delete(id[, date])`

```javascript
bob.delete(1)
```

### `reposition()`

NOT IMPLEMENTED YET!

Re-computes the position. Takes the order of the array and computes new positions. Can be useful when positions got very long. Business logic should make sure that all states have synchronized and/or older ones are ignored. All modification dates are set to the current timestamp.

### `clone()`

```javascript
const caroline = alice.clone()
```

### `merge(MergeableArray)`

```javascript
alice.merge(bob)

const caroline = legibleMergeable.merge(bob, caroline)
```

### Helper

```javascript
size()
first()
last()
base()
meta()
```

### Dump

```javascript
dump()
toString()
```

## Usage MergableObject

```
legibleMergeable.Object()
has(key)
get(key)
set(key, value[, date])
delete(key, value[, date])
id()
size()
base()
dump()
toString()
clone()
merge()
```

## Vue Implementation

For an example implementation check out the `demo.html`.

```html
<div v-for="item in list.state()"
     :key="item.get('id')">
    <input type="checkbox"
           :checked="item.get('done')"
           @change="item.set('done', $event.target.checked)" />

    <input type="text"
           :value="item.get('title')"
           @input="item.set('title', $event.target.value)" />

    <button @click="list.delete(item.id())">
        X
    </button>
</div>
```
