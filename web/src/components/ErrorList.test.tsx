import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ErrorList from "./ErrorList";

describe("ErrorList", () => {
  it("shows one line per message", () => {
    render(<ErrorList messages={["title must not be empty", "status is required"]} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("title must not be empty")).toBeInTheDocument();
    expect(screen.getByText("status is required")).toBeInTheDocument();
  });

  it("renders nothing without messages", () => {
    const { container } = render(<ErrorList messages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
