/**
 * ListStates Component Tests
 *
 * Pins the shared loading and notice states that the pages build on: the
 * spinner's role and label, and the notice's icon, heading level and the
 * order of its icon, title, message and children.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Notice, Spinner, errorMessage } from "./ListStates";

describe("Spinner", () => {
  it("announces its label as a status", () => {
    render(<Spinner label="Loading things..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading things...");
  });
});

describe("Notice", () => {
  it("shows the icon, a level 3 title and the message, in that order", () => {
    render(
      <Notice
        icon={<svg data-testid="icon" />}
        title="Nothing here"
        message="Come back later."
      />,
    );

    const icon = screen.getByTestId("icon");
    const title = screen.getByRole("heading", {
      level: 3,
      name: "Nothing here",
    });
    const message = screen.getByText("Come back later.");
    expect(icon.compareDocumentPosition(title)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(title.compareDocumentPosition(message)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders children after the message", () => {
    render(
      <Notice icon={<svg />} title="Nothing here" message="Come back later.">
        <a href="/elsewhere">Go elsewhere</a>
      </Notice>,
    );

    const message = screen.getByText("Come back later.");
    const link = screen.getByRole("link", { name: "Go elsewhere" });
    expect(message.compareDocumentPosition(link)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders without children", () => {
    render(<Notice icon={<svg />} title="Only" message="Message." />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("errorMessage", () => {
  it("uses an Error's message and the fallback for anything else", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(errorMessage("boom", "fallback")).toBe("fallback");
  });
});
