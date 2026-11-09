import { PriceTag } from "./price-tag.js";

export const BasicPriceTag = () => <PriceTag amount={19.99} />;

export const DiscountedPriceTag = () => <PriceTag amount={14.99} compareAt={19.99} />;

export const EuroPriceTag = () => <PriceTag amount={1999} currency="EUR" locale="fr-FR" />;

export const YenPriceTag = () => <PriceTag amount={1999} currency="JPY" locale="ja-JP" />;

/** All three sizes side by side, so the scale can be judged at once. */
export const PriceTagSizes = () => (
  <div style={{ display: "flex", gap: "1.5rem", alignItems: "baseline" }}>
    <PriceTag size="sm" amount={9.5} compareAt={12} />
    <PriceTag size="md" amount={9.5} compareAt={12} />
    <PriceTag size="lg" amount={9.5} compareAt={12} />
  </div>
);
