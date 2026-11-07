// Synthetische Blätter aus den unveränderten gebündelten Parameterzeilen, kein Snapshotzugriff.
import fs from 'node:fs';
import vm from 'node:vm';
const c = vm.createContext({ console });
for (const file of ['kv_engine.gs', 'Code.gs']) vm.runInContext(fs.readFileSync('apps-script/rechner-backend/' + file, 'utf8'), c);
const plain = v => JSON.parse(JSON.stringify(v));
export const sheets = {
  KV_Parameter: [['Schlüssel', 'Wert'], ...plain(c.KV_PARAMETER_ROWS_())],
  KV_FoerderPerioden: [['key','ab','bis','label','klima','grenze','eu','cap','eff','kind','stufen','pk','quelle'], ...plain(c.KV_PERIODEN_ROWS_())],
  KV_JAZ: [['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade'], ...plain(c.KV_JAZ_ROWS_())],
  'Förder_Parameter': [['Schlüssel', 'Wert'], ...plain(c.FOERDER_ROWS_())],
  Dimensionierung: [['Schlüssel','Wert'], ['ww_abzug_kwh_pro_person_jahr',700]],
};
