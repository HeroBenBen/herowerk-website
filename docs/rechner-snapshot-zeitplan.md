# Zeitplan für den Wertevorrat des Rechenkerns

Der Zeitplan ruft alle 15 Minuten folgenden Befehl auf:

```text
/usr/bin/php /home/www/website/api/werte-auffrischen.php 2>&1
```

Der Takt begrenzt die regelmäßige Verzögerung einer Änderung im Sheet auf höchstens
15 Minuten plus Abrufzeit. Er verursacht 96 Abrufe täglich. Innerhalb der
Vorhaltedauer von einer Stunde gibt es vier planmäßige Versuche.

Das Skript schreibt genau eine Zeile ins Protokoll. `OK` bedeutet, dass der Snapshot
erneuert wurde oder ein anderer Lauf die gemeinsame Sperre bereits hält. `FEHLER`
bedeutet, dass keine neue gültige Fassung geschrieben wurde. In diesem Fall bleibt
der vorhandene Snapshot unverändert liegen.
