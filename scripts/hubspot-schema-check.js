#!/usr/bin/env node
// Job 8 — HubSpot-Property-Mapping-Test (Pipeline Abschnitt G).
// Validiert den Funnel-Webhook-Payload (Beispiel-Payload aus
// schemas/hubspot-webhook-payload.sample.json) gegen
// schemas/hubspot-property-schema.json (Subset von JSON-Schema:
// type/required/properties/enum — ohne externe Dependency).
// T1-6b-Stand: Webhook-Anschluss kommt erst in T2 — dieses Gate sichert ab
// jetzt, dass Schema und Payload-Form synchron bleiben.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const schema = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'schemas', 'hubspot-property-schema.json'), 'utf8')
);
const payload = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'schemas', 'hubspot-webhook-payload.sample.json'), 'utf8')
);

const errors = [];

function typeOf(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

function validate(obj, sch, ptr) {
  if (sch.type && typeOf(obj) !== sch.type) {
    errors.push(`${ptr}: erwartet ${sch.type}, ist ${typeOf(obj)}`);
    return;
  }
  for (const req of sch.required || []) {
    if (!(req in obj)) errors.push(`${ptr}: Pflichtfeld "${req}" fehlt`);
  }
  for (const [key, sub] of Object.entries(sch.properties || {})) {
    if (key in obj) {
      if (sub.type && typeOf(obj[key]) !== sub.type)
        errors.push(`${ptr}.${key}: erwartet ${sub.type}, ist ${typeOf(obj[key])}`);
      if (sub.enum && !sub.enum.includes(obj[key]))
        errors.push(`${ptr}.${key}: "${obj[key]}" nicht in enum [${sub.enum.join(', ')}]`);
      if (sub.pattern && typeof obj[key] === 'string' && !new RegExp(sub.pattern).test(obj[key]))
        errors.push(`${ptr}.${key}: "${obj[key]}" verletzt pattern ${sub.pattern}`);
      if (sub.properties || sub.required) validate(obj[key], sub, `${ptr}.${key}`);
    }
  }
  if (sch.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!(sch.properties && key in sch.properties))
        errors.push(`${ptr}: unbekanntes Feld "${key}"`);
    }
  }
}

validate(payload, schema, 'payload');

if (errors.length) {
  errors.forEach((e) => console.error(`FAIL: ${e}`));
  process.exit(1);
}
console.log(
  `HubSpot-Schema-Check OK (${Object.keys(schema.properties || {}).length} Properties geprüft).`
);
