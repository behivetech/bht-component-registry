import { render, screen } from "@testing-library/react";
import { RatingStars } from "./rating-stars.js";

describe("RatingStars", () => {
  it("announces the rating once, as text, rather than star by star", () => {
    render(<RatingStars value={4.3} count={128} />);
    expect(screen.getByRole("img", { name: "4.3 out of 5 stars, 128 reviews" })).toBeTruthy();
  });

  // Each star carries its fill on a style variable; that's the stable handle,
  // since CSS-module class names are hashed under test.
  const starsOf = (container: HTMLElement) =>
    container.querySelectorAll<HTMLElement>('[style*="--acme-star-fill"]');

  it("renders one star per point of max", () => {
    const { container } = render(<RatingStars value={7.5} max={10} />);
    expect(starsOf(container)).toHaveLength(10);
  });

  it("fills a fractional star by its fraction", () => {
    const { container } = render(<RatingStars value={2.25} />);
    const stars = starsOf(container);
    expect(stars[1]?.style.getPropertyValue("--acme-star-fill")).toBe("100%");
    expect(stars[2]?.style.getPropertyValue("--acme-star-fill")).toBe("25%");
    expect(stars[3]?.style.getPropertyValue("--acme-star-fill")).toBe("0%");
  });

  it("clamps out-of-range values", () => {
    render(<RatingStars value={9} />);
    expect(screen.getByRole("img", { name: "5 out of 5 stars" })).toBeTruthy();
  });
});
