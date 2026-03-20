// scripts/inject-theme.js
// Usage : node scripts/inject-theme.js
//
// Ce script fait deux choses sur tous les fichiers HTML :
//   1. Injecte le snippet anti-FOUC dans <head> si absent
//   2. Ajoute theme.js + hamburger.js avant main.js si absent

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const SNIPPET = `<script>document.documentElement.setAttribute("data-theme",localStorage.getItem("rsb_theme")||"dark");</script>`;

function walk(dir, results = []) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules') walk(full, results);
    else if (f.endsWith('.html')) results.push(full);
  });
  return results;
}

// Calcule le chemin relatif vers /js/ depuis un fichier HTML
function jsPath(htmlFile, filename) {
  const rel = path.relative(path.dirname(htmlFile), path.join(ROOT, 'js', filename));
  return rel.replace(/\\/g, '/');
}

let injectedTheme  = 0;
let injectedScript = 0;
let skipped        = 0;

walk(ROOT).forEach(file => {
  let content  = fs.readFileSync(file, 'utf8');
  let modified = false;
  const rel    = file.replace(ROOT, '');

  // 1. Snippet anti-FOUC
  if (!content.includes('rsb_theme')) {
    content  = content.replace('<head>', `<head>\n  ${SNIPPET}`);
    modified = true;
    injectedTheme++;
    console.log(`✓ thème    ${rel}`);
  }

  // 2. Ajouter theme.js + hamburger.js juste avant main.js
  const mainJsPattern = /(<script\b[^>]*src=["'][^"']*main\.js["'][^>]*><\/script>)/;
  if (mainJsPattern.test(content)) {
    const themeFile = jsPath(file, 'theme.js');
    const hambFile  = jsPath(file, 'hamburger.js');
    const alreadyHasTheme = content.includes('theme.js');
    const alreadyHasHamb  = content.includes('hamburger.js');

    if (!alreadyHasTheme || !alreadyHasHamb) {
      const inject = [
        !alreadyHasTheme ? `<script src="${themeFile}"></script>` : '',
        !alreadyHasHamb  ? `<script src="${hambFile}"></script>`  : '',
      ].filter(Boolean).join('\n  ');

      content  = content.replace(mainJsPattern, `${inject}\n  $1`);
      modified = true;
      injectedScript++;
      console.log(`✓ scripts  ${rel}`);
    }
  }

  if (modified) fs.writeFileSync(file, content, 'utf8');
  else {
    skipped++;
    console.log(`○ skip     ${rel}`);
  }
});

console.log(`\n✅ Terminé — ${injectedTheme} snippets thème, ${injectedScript} scripts ajoutés, ${skipped} inchangés.`);
