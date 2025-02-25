# MergeObjects Function

A Function that can merge two objects into one object. If there are any shared properties,
it will overwrite that property with the value from the second object.

---

## The Code

```typescript
type MergeObjectsFnType = <A extends object>(objA: A) => <B extends object>(objB: B) => A & B | B;

export const mergeObjects: MergeObjectsFnType = (objA) => (objB) => ({
  ...objA,
  ...objB,
});

```

---

## How to Use it

```typescript
const pb = {
  peanutButter: true,
};

const chocolate = {
  chocolate: true,
};

const jelly = {
  peanutButter: false,
  flavor: 'strawberry',
}

mergeObjects(pb)(chocolate) // { peanutButter: true, chocolate: true }
mergeObjects(pb)(jelly) // { peanutButter: false, flavor: 'strawberry' }
```
