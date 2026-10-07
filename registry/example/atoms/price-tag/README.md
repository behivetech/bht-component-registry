# Price Tag

A formatted price with an optional "was" price and the percentage saved.
Formatting goes through `Intl.NumberFormat`, so symbols, decimals and grouping
follow the locale and currency instead of being hand-rolled.

## Usage

```jsx
import { PriceTag } from '@example/atoms.price-tag';

<PriceTag amount={19.99} />
```

## Discounts

Pass `compareAt` with the previous price. It renders struck through, and the
saving is computed and shown as a percentage.

```jsx
<PriceTag amount={14.99} compareAt={19.99} />
```

## Currency and locale

```jsx
<div style={{ display: "flex", gap: "1.5rem" }}>
  <PriceTag amount={1999} currency="EUR" locale="fr-FR" />
  <PriceTag amount={1999} currency="JPY" locale="ja-JP" />
  <PriceTag amount={1999} currency="GBP" locale="en-GB" />
</div>
```

## Sizes

```jsx
<div style={{ display: "flex", gap: "1.5rem", alignItems: "baseline" }}>
  <PriceTag size="sm" amount={9.5} />
  <PriceTag size="md" amount={9.5} />
  <PriceTag size="lg" amount={9.5} />
</div>
```
