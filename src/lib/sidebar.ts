// Sidebar ein- oder ausgeklappt. Die Wahl liegt im Cookie „sidebar“, damit das Inline-Skript
// sie vor dem ersten Zeichnen auf <html data-sidebar> setzen kann (kein Springen beim Laden).

export const SIDEBAR_SCRIPT = `(function(){try{if(/(?:^|; )sidebar=collapsed/.test(document.cookie))document.documentElement.dataset.sidebar="collapsed"}catch(e){}})()`;

export function toggleSidebar() {
  const html = document.documentElement;
  const collapse = html.dataset.sidebar !== "collapsed";
  if (collapse) {
    html.dataset.sidebar = "collapsed";
    document.cookie = "sidebar=collapsed; path=/; max-age=31536000; SameSite=Lax";
  } else {
    delete html.dataset.sidebar;
    document.cookie = "sidebar=; path=/; max-age=0; SameSite=Lax";
  }
}
