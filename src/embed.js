// Läuft der Store Builder eingebettet im Salesboard (iframe) — oder mit ?embed=1 —, nimmt er dessen Aussehen an
// und lässt die eigene Titelzeile weg. Direkt aufgerufen sieht er aus wie bisher.
export var IS_EMBED = (function() {
  try {
    return window.self !== window.top || /[?&]embed=1(&|$)/.test(window.location.search);
  } catch (e) {
    return true; // Zugriff auf window.top gesperrt = wir stecken in einem fremden Rahmen
  }
})();
