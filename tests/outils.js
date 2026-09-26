/* Outils communs aux tests : le navigateur piloté, et comment le lancer.
   Si la variable CHROMIUM donne le chemin d'un Chromium déjà installé, on
   l'utilise ; sinon Playwright prend le sien (npx playwright install chromium). */
var pw;
try { pw = require("playwright-core"); } catch (e) { pw = require("playwright"); }
module.exports = {
  playwright: pw,
  lancement: process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {}
};
