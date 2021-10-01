# legibleMergeable

This is kinda a CRDT (Conflict-free Replicated Data Type), but a really *really* simple one. It can just represent an arbitrary object or a tree of objects with atomic non-CRDT (JSON) values. Atomic values are strings, numbers, booleans, null, arrays and non-CRDT objects.

It's not designed for realtime data input. Rather it's purpose is to have an easy solution to sync between multiple devices, where it's really improbable that a property was modified at the same time.

The main goal for driving this project was readability: The serialized JSON Dumps you get to save the document on disk or to sent it somewhere over the network, almost looks like the initial object representation. I guess this has let to some unpopular design choices 😬

Conflicts are resolved by Last-Write-Wins (LWW). It doesn't matter in which order different modified states are applied (associative, commutive and idompotent), conflicting changes will always be deterministically resolved. It will always prefer the newest change.

> Currently it uses UTC Timestamps to track versions. It is strongly advised to not use the wall-clock, as it can be easily manipulated, be wrong or is just not exact enough. However the alternative would be to use a counter with a client UUID for *every* tracked property. UUIDs are not that compact, talk about readability... As mentioned before: The purpose of this CRDT was never for realtime concurrent editing. Just to enable seamless offline data editing with a bit smarter merging capabilities. For that expectations I think a timestamp is enough for now.

Anyway judge for yourself, I gather this is rather legible:

```json
{
  1: {
    "id": 1,
    "title": "Buy Broccoli",
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

A few notes:

* This is a nested `Mergeable`. The root object here is used as unordered list.
* In the real world where you have multiple clients that can add an object, you probably should use some form UUID (like nanoid) as id to prevent collisions.
* The `^m` is the modification identifier and denotes that the current object is a `Mergeable` and holds all modification dates of all properties of that object.
* The `^m` can have an empty object as value. Which just means, that no property was modified yet.
* A child Mergeable gets only parsed and merged if it has the modification identifier. Otherwise it would be handled as atomic object.
* If a date for a property exists but there is no value, it means that it was deleted (Also called tombstone). This information has to be kept, in case this document is merged with some older one, that doesn't know yet of the deletion.

## Usage

```
legibleMergeable.create([dump, options])
legibleMergeable.merge(a, b[, options])
has(key)
get(key[, fallback])
set(key, value[, options])
delete(key, value[, options])
refresh(key[, options])
modify(fn(item)[, options])
size()
base()
dump()
meta()
clone()
merge(b)
filter(fn(item, key, date)[, options])
map(fn(item, key, date)[, options])
```

## MergeableArray: Ordered List

The order of the list is one atomic value. Concurrent moves are not merged.

What happens to added properties from other clients?

```json
[
  {
    "id": 1,
    "title": "Buy Sugar",
    "done": false,
    "^m": { "title": "2020-10-23T15:50:02.064Z" }
  },
  {
    "id": 2,
    "title": "Change Lightbulb",
    "done": true,
    "^m": { "done": "2020-10-23T15:50:02.064Z" }
  },
  {
    "^m": {
      1: "2020-10-21T10:00:00.000Z",
      2: "2020-10-21T10:00:00.000Z"
      "^order": "2021-09-10" // 1
    },
    "^id": "id",
    "^order": "2021-09-10", // 2
  },
)
```

Where to put it? 1 or 2?

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
