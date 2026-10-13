// Hell/Dunkel: Standard ist die Systemeinstellung. Eine eigene Wahl liegt im Cookie „theme“
// (light | dark), damit das Inline-Skript sie vor dem ersten Zeichnen lesen kann.

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_COOKIE = "theme";

export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:null;var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function readThemeChoice(): ThemeChoice {
  const m = document.cookie.match(/(?:^|; )theme=(light|dark)/);
  return m ? (m[1] as ThemeChoice) : "system";
}

export function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; SameSite=Lax`;
  }
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
