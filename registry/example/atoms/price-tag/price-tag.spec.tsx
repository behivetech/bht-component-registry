import { render, screen } from "@testing-library/react";
import { PriceTag } from "./price-tag.js";

describe("PriceTag", () => {
  it("formats the amount as currency for the locale", () => {
    render(<PriceTag amount={1999.5} locale="en-US" />);
    expect(screen.getByText("$1,999.50")).toBeTruthy();
  });

  it("respects the currency's own decimal rules", () => {
    render(<PriceTag amount={1999} currency="JPY" locale="ja-JP" />);
    expect(screen.getByText("￥1,999")).toBeTruthy();
  });

  it("shows the previous price and the saving when discounted", () => {
    render(<PriceTag amount={15} compareAt={20} locale="en-US" />);
    expect(screen.getByText("$20.00").tagName).toBe("S");
    expect(screen.getByText("−25%")).toBeTruthy();
  });

  it("ignores a compareAt that is not actually higher", () => {
    render(<PriceTag amount={20} compareAt={20} locale="en-US" />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("applies additional className", () => {
    const { container } = render(<PriceTag amount={1} className="custom" />);
    expect(container.firstElementChild?.className).toContain("custom");
  });
});
