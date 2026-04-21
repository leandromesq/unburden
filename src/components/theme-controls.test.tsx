import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { I18nProvider } from "@/i18n/I18nProvider";

function renderControls() {
  return render(
    <I18nProvider initialLocale="en">
      <LocaleToggle />
      <ThemeToggle />
    </I18nProvider>,
  );
}

describe("theme and locale controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
    document.documentElement.lang = "en";
    document.body.dataset.theme = "dark";
  });

  test("renders a locale menu from the supported locales", () => {
    renderControls();

    const localeToggle = screen.getByRole("button", {
      name: "Interface language",
    });

    expect(localeToggle).toHaveTextContent("English");

    fireEvent.click(localeToggle);

    expect(
      screen.getByRole("menuitemradio", { name: "Portuguese (BR)" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  test("updates locale selection through the menu", async () => {
    renderControls();

    fireEvent.click(
      screen.getByRole("button", { name: "Interface language" }),
    );
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Portuguese (BR)" }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("omniboost-locale")).toBe("pt-BR");
      expect(document.documentElement.lang).toBe("pt-BR");
    });
  });

  test("uses moon and sun labels for the theme toggle", () => {
    renderControls();

    expect(screen.getByRole("button", { name: "Moon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sun" })).toBeInTheDocument();
  });
});
