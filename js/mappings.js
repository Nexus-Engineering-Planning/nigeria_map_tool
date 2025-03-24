import manualLgaCorrections from './manualLgaCorrections.js';

/**
 * Normalize LGA names for better matching.
 * @param {String} name - The LGA name to normalize.
 * @returns {String} - Normalized LGA name.
 */
function normalizeName(name) {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/&/g, 'and')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Build dictionaries from the loaded GeoJSON data.
 * @param {Object} stateGeoJSON - GeoJSON object for states.
 * @param {Object} lgaGeoJSON - GeoJSON object for LGAs.
 * @param {Object} wardGeoJSON - GeoJSON object for Wards.
 * @returns {Object} - An object containing state_to_lga and lga_to_ward dictionaries.
 */
function buildDictionaries(stateGeoJSON, lgaGeoJSON, wardGeoJSON) {
  const state_to_lga = {};
  const lga_to_ward = {};

  lgaGeoJSON.features.forEach(feature => {
    const stateName = feature.properties.statename;
    const lgaName = feature.properties.lganame;

    if (!stateName || !lgaName) return;

    if (!state_to_lga[stateName]) {
      state_to_lga[stateName] = [];
    }

    if (!state_to_lga[stateName].includes(lgaName)) {
      state_to_lga[stateName].push(lgaName);
    }
  });

  wardGeoJSON.features.forEach(feature => {
    const lgaName = feature.properties.lganame;
    const wardName = feature.properties.wardname;

    if (!lgaName || !wardName) return;

    if (!lga_to_ward[lgaName]) {
      lga_to_ward[lgaName] = [];
    }

    if (!lga_to_ward[lgaName].includes(wardName)) {
      lga_to_ward[lgaName].push(wardName);
    }
  });

  console.log('✅ state_to_lga mapping:', state_to_lga);
  console.log('✅ lga_to_ward mapping:', lga_to_ward);

  return { state_to_lga, lga_to_ward };
}

function buildReverseMappings(state_to_lga, lga_to_ward) {
  const lga_to_state = {};
  const ward_to_lga = {};

  for (const [state, lgas] of Object.entries(state_to_lga)) {
    lgas.forEach(lga => {
      lga_to_state[lga] = state;
    });
  }

  for (const [lga, wards] of Object.entries(lga_to_ward)) {
    wards.forEach(ward => {
      ward_to_lga[ward] = lga;
    });
  }

  console.log('✅ lga_to_state mapping:', lga_to_state);
  console.log('✅ ward_to_lga mapping:', ward_to_lga);

  return { lga_to_state, ward_to_lga };
}

function buildSenatorialToLga(senatorialData, lgaGeoJSON) {
  const senatorial_to_lga = {};
  const geojson_lga_names = {};
  const appliedCorrections = new Set();
  const unmatched = [];

  lgaGeoJSON.features.forEach(feature => {
    const originalName = feature.properties.lganame;
    const normalized = normalizeName(originalName);
    geojson_lga_names[normalized] = originalName;
  });

  senatorialData.forEach(record => {
    const district = record['Senatorial_District'] || record['district'] || record['senatorial_district'];
    const rawLgaName = record['LGAs'] || record['lga'] || record['LGA'];

    if (!district || !rawLgaName) return;

    const normalizedLgaName = normalizeName(rawLgaName);
    const correction = manualLgaCorrections[normalizedLgaName];
    const correctedNames = Array.isArray(correction)
      ? correction
      : [correction || normalizedLgaName];

    if (correction) appliedCorrections.add(normalizedLgaName);

    correctedNames.forEach(correctedName => {
      const normalizedCorrected = normalizeName(correctedName);
      const matchedLgaName = geojson_lga_names[normalizedCorrected];

      if (!matchedLgaName) {
        console.warn(`⚠️ Could not match LGA "${rawLgaName}" (normalized: "${normalizedLgaName}", corrected: "${correctedName}") in district "${district}"`);
        unmatched.push(normalizedLgaName);
        return;
      }

      if (!senatorial_to_lga[district]) {
        senatorial_to_lga[district] = [];
      }

      if (!senatorial_to_lga[district].includes(matchedLgaName)) {
        senatorial_to_lga[district].push(matchedLgaName);
      }
    });
  });

  console.log('✅ Manual corrections applied for:', [...appliedCorrections]);
  console.log('📝 Unmatched LGA names (normalized):', [...new Set(unmatched)]);
  console.log('✅ senatorial_to_lga mapping (fuzzy matched):', senatorial_to_lga);

  return senatorial_to_lga;
}

export { buildDictionaries, buildReverseMappings, buildSenatorialToLga };
