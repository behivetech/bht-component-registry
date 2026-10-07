import { RatingStars } from "./rating-stars.js";

export const BasicRatingStars = () => <RatingStars value={4} />;

export const FractionalRatingStars = () => <RatingStars value={4.3} count={128} />;

export const TenStarRating = () => <RatingStars value={7.5} max={10} />;

export const RatingStarsSizes = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
    <RatingStars size="sm" value={3.5} count={12} />
    <RatingStars size="md" value={3.5} count={12} />
    <RatingStars size="lg" value={3.5} count={12} />
  </div>
);
