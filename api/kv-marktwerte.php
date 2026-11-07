<?php
// Veröffentlichte Referenzen gemäß T1247; keine Vorbelegungen. Nur serverseitig lesen.
return json_decode(<<<'JSON'
{
  "gaspreis": {
    "wert": 12.72,
    "einheit": "ct/kWh brutto",
    "quelle": "enercity BasisGas, Allgemeine Preise Grundversorgung, Grundpreistarif II (11.118 bis 70.937 kWh/Jahr)",
    "stand": "01.01.2026"
  },
  "n01_preis_oel": {
    "wert": 1.72,
    "einheit": "Euro/Liter einschließlich Steuern",
    "quelle": "EU-Kommission, Weekly Oil Bulletin, Verbraucherpreis Heizöl Deutschland",
    "stand": "02.11.2026"
  },
  "grundpreisGas": {
    "wert": 250.38,
    "einheit": "Euro/Jahr",
    "quelle": "enercity BasisGas",
    "stand": "01.01.2026"
  },
  "strompreis": {
    "wert": 32.93,
    "einheit": "ct/kWh",
    "quelle": "Rabot Energy, Neukunden-Arbeitspreis, Analyse 8 Städte inkl. Hannover",
    "stand": "Juni 2026"
  },
  "wpArbeitspreis": {
    "wert": 24.23,
    "einheit": "ct/kWh brutto",
    "quelle": "enercity HeizStrom, Preisblatt 03/2025",
    "stand": "01.03.2025"
  },
  "wpGrundpreis": {
    "wert": 70.27,
    "einheit": "Euro/Jahr brutto (Eintarifzähler)",
    "quelle": "enercity HeizStrom, Preisblatt 03/2025",
    "stand": "01.03.2025"
  }
}
JSON, true, 512, JSON_THROW_ON_ERROR);
