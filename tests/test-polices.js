const {chromium} = require('./outils').playwright;
const path = require('path');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1100, height:700}});
  const externes = []; p.on('request', r=>{ const u=r.url(); if (/googleapis|gstatic/.test(u)) externes.push(u); });
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(1200);
  const R = await p.evaluate(async ()=>{
    await document.fonts.ready; await document.fonts.load("400 16px \"IBM Plex Mono\""); await document.fonts.load("800 16px \"Bricolage Grotesque\"");
    return {
      public_sans: document.fonts.check('400 16px "Public Sans"'),
      bricolage: document.fonts.check('700 16px "Bricolage Grotesque"'),
      plex: document.fonts.check('400 16px "IBM Plex Mono"'),
      chargees: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)
    };
  });
  R.appels_google = externes.length;
  await p.screenshot({path:require('path').join(__dirname,'captures','polices.png')});
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
