# Rating Stars

A read-only star rating. Fractional values are drawn with a clipped fill
rather than rounded to a half, so 4.3 and 4.7 look different. The stars are
decorative — the value is announced once through an `aria-label`.

## Usage

```jsx
import { RatingStars } from '@example/atoms.rating-stars';

<RatingStars value={4.3} count={128} />
```

## Scale

`max` sets the number of stars; `value` is on the same scale.

```jsx
<RatingStars value={7.5} max={10} />
```

## Sizes

```jsx
<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
  <RatingStars size="sm" value={3.5} />
  <RatingStars size="md" value={3.5} />
  <RatingStars size="lg" value={3.5} />
</div>
```
