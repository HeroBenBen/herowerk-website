const fs = require('node:fs');
const path = require('node:path');
// Historische Rohantworten bleiben unverändert und werden weiterhin gesiegelt.
const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/jaz-bwp/index.json'), 'utf8'));
// T1245: unabhängige Erwartung direkt aus der freigegebenen BWP-Quelldatei.
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/kv-jaz-portfolio.json'), 'utf8'));
function selected(model,system){
 const clean=model.replace(/aroTHERM (?:pro|plus|perform) /,'').replace(/^2× Wolf CHA-16$/, '2× Wolf CHA-16/20');
 const single=clean.replace(/^\d+× /,'');
 return source.werte.find(r=>r.satz===(system==='Heizkörper'?'A':'B')&&r.system===system&&
  (single.startsWith('Wolf')?r.geraet.startsWith(single+(single.includes('16/20')||single.includes('20/24')?' mit':'/400V')):r.geraet.replace(/aroTHERM (?:pro|plus|perform) /,'').replace(/ (?:230|400)V$/,'')===single));
}
function expectedJaz(model) {
 const hk=selected(model,'Heizkörper'),fbh=selected(model,'Fußbodenheizung');if(!hk||!fbh)return null;
 const suffix=/^\d+× /.test(model)?' je Gerät; projektbezogen prüfen':'';
 return [['JAZ Heizkörper¹',hk.alle_ergebnisse.jazTotalWithSupplementaryHeater+suffix],['JAZ Fußbodenheizung¹',fbh.alle_ergebnisse.jazTotalWithSupplementaryHeater+suffix]];
}
const footnote='¹ JAZ = Jahresarbeitszahl. Beispielrechnung mit dem BWP-JAZ-Rechner nach VDI 4650 Blatt 1 für einen Altbau in Hannover. Heizkörper: Vorlauf/Rücklauf 55/45 °C; Fußbodenheizung: Vorlauf/Rücklauf 35/28 °C. Warmwasseranteil 18 %, Speicher 50 °C; einschließlich erforderlichem elektrischem Zusatzheizer. Individuelle Anlagenwerte können abweichen.';
function expectedFootnote(model){const r=selected(model,'Heizkörper');return footnote+' Angenommene Gesamtlast '+r.gesamtlast_kw+' kW. Abruf '+r.abgerufen_utc.slice(0,10)+'.'+(/^\d+× /.test(model)?' Kaskade: Wert des Einzelgeräts als Annahme.':'');}
function expectedFootnoteHtml(model){
 const heading='<strong style="color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">¹ JAZ</strong>';
 const scop='\n              <strong style="color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">² SCOP</strong> = Seasonal Coefficient of Performance. Norm-Effizienz nach EN 14825, marktüblicher Herstellervergleich.\n            ';
 return expectedFootnote(model).replace('¹ JAZ',heading)+'<br>'+scop;
}
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function expectedDetail(detail){const out=structuredClone(detail),jaz=expectedJaz(out.card.modell);if(!jaz)return out;
 const values=Object.fromEntries(jaz);out.card.specs=out.card.specs.map(([name,value])=>[name,values[name]||value]);
 out.table=out.table.replace(/(<td>JAZ (?:Heizkörper|Fußbodenheizung)¹<\/td><td><strong>)([^<]+)(<\/strong>)/g,(all,open,old,close)=>{const label=open.match(/<td>([^<]+)/)[1];return open+values[label]+close;});
 out.jazFootnote=expectedFootnoteHtml(out.card.modell);return out;
}
module.exports={index,expectedJaz,footnote,expectedFootnote,expectedFootnoteHtml,plain,expectedDetail};
