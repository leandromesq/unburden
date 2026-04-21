import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";

function LocaleProbe() {
  const { locale } = useI18n();

  return <span>{locale}</span>;
}

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
      name: "UI language",
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
      screen.getByRole("button", { name: "UI language" }),
    );
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Portuguese (BR)" }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("omniboost-locale")).toBe("pt-BR");
      expect(document.documentElement.lang).toBe("pt-BR");
    });
  });

  test("hydrates locale from persisted storage", async () => {
    window.localStorage.setItem("omniboost-locale", "en");
    document.documentElement.lang = "pt-BR";

    render(
      <I18nProvider initialLocale="pt-BR">
        <LocaleProbe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("en")).toBeInTheDocument();
      expect(document.documentElement.lang).toBe("en");
    });
  });

  test("uses moon and sun labels for the theme toggle", () => {
    renderControls();

    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
  });

  test("hydrates theme from persisted storage", async () => {
    window.localStorage.setItem("omniboost-theme", "light");

    renderControls();

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.body.dataset.theme).toBe("light");
    });
  });
});
