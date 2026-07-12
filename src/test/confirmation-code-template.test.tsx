import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConfirmationCodeEmail from "@/emails/templates/ConfirmationCode.js";

describe("ConfirmationCodeEmail", () => {
  it("renders the confirmation code and supporting copy", () => {
    const html = renderToStaticMarkup(<ConfirmationCodeEmail code="123456" />);

    expect(html).toContain("123456");
    expect(html).toContain("Confirm your email");
  });
});
