import { describe, expect, it } from "vitest";

import { LOCALE_META, SUPPORTED_LOCALES, TRANSLATIONS } from "../lib/localization";

describe("OmniWave localization contract", () => {
  it("ships four complete first-class locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["ar", "en", "fr", "es"]);
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_META[locale].nativeName).toBeTruthy();
      expect(TRANSLATIONS[locale].home).toBeTruthy();
      expect(TRANSLATIONS[locale].settings).toBeTruthy();
      expect(TRANSLATIONS[locale].themeNames).toHaveProperty("aurora");
      expect(TRANSLATIONS[locale].themeNames).toHaveProperty("sunset");
    }
  });

  it("marks Arabic as right-to-left and the remaining locales as left-to-right", () => {
    expect(LOCALE_META.ar.direction).toBe("rtl");
    expect(LOCALE_META.en.direction).toBe("ltr");
    expect(LOCALE_META.fr.direction).toBe("ltr");
    expect(LOCALE_META.es.direction).toBe("ltr");
  });
});
