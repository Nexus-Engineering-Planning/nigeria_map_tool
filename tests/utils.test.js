import { describe, it, expect } from 'vitest';
import { normalize, bbox, buildLgaToDistrictMap } from '../js/utils.js';

// ─── normalize() ────────────────────────────────────────────────

describe('normalize', () => {
  it('returns empty string for falsy input', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });

  it('lowercases input', () => {
    expect(normalize('LAGOS')).toBe('lagos');
    expect(normalize('Abuja')).toBe('abuja');
  });

  it('strips whitespace', () => {
    expect(normalize('Eti Osa')).toBe('etiosa');
    expect(normalize('  padded  ')).toBe('padded');
  });

  it('strips hyphens', () => {
    expect(normalize('Ife-Central')).toBe('ifecentral');
  });

  it('strips slashes', () => {
    expect(normalize('Nasarawa/Toto')).toBe('nasarawatoto');
  });

  it('strips underscores', () => {
    expect(normalize('some_name')).toBe('somename');
  });

  it('strips trailing "lga"', () => {
    expect(normalize('Ikeja LGA')).toBe('ikeja');
    expect(normalize('ikejlga')).toBe('ikej'); // only trailing
  });

  it('strips trailing "lgarea"', () => {
    expect(normalize('Ikeja LG Area')).toBe('ikeja');
  });

  it('strips trailing "municipal"', () => {
    expect(normalize('Jos North Municipal')).toBe('josnorth');
  });

  it('handles combined transformations', () => {
    // hyphens + spaces + trailing LGA
    expect(normalize('Ife-North LGA')).toBe('ifenorth');
  });
});

// ─── bbox() ─────────────────────────────────────────────────────

describe('bbox', () => {
  it('computes bounds from a simple Polygon Feature', () => {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[3, 6], [4, 6], [4, 7], [3, 7], [3, 6]]],
      },
    };
    expect(bbox(feature)).toEqual([[3, 6], [4, 7]]);
  });

  it('computes bounds from a FeatureCollection', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [3, 6] },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [10, 12] },
        },
      ],
    };
    expect(bbox(fc)).toEqual([[3, 6], [10, 12]]);
  });

  it('skips features with null geometry', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [8, 9] },
        },
      ],
    };
    expect(bbox(fc)).toEqual([[8, 9], [8, 9]]);
  });

  it('returns Nigeria default bounds for empty FeatureCollection', () => {
    const fc = { type: 'FeatureCollection', features: [] };
    expect(bbox(fc)).toEqual([[2.68, 4.27], [14.68, 13.89]]);
  });

  it('returns Nigeria default bounds when all geometries are null', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null },
        { type: 'Feature', geometry: null },
      ],
    };
    expect(bbox(fc)).toEqual([[2.68, 4.27], [14.68, 13.89]]);
  });

  it('handles MultiPolygon geometry', () => {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]],
        ],
      },
    };
    expect(bbox(feature)).toEqual([[0, 0], [6, 6]]);
  });
});

// ─── buildLgaToDistrictMap() ────────────────────────────────────

describe('buildLgaToDistrictMap', () => {
  it('builds a mapping from normalized LGA names to districts', () => {
    const senatorialData = [
      { Senatorial_District: 'Lagos Central', LGAs: 'Eti-Osa' },
      { Senatorial_District: 'Lagos West', LGAs: 'Ikeja' },
    ];
    const result = buildLgaToDistrictMap(senatorialData, {});
    expect(result.get('etiosa')).toBe('Lagos Central');
    expect(result.get('ikeja')).toBe('Lagos West');
  });

  it('applies single corrections', () => {
    const senatorialData = [
      { Senatorial_District: 'Kano Central', LGAs: 'Kano Municipal' },
    ];
    // The normalized form of "Kano Municipal" is "kano" (strips trailing "municipal")
    // Correction maps "kano" → "kanomunicipal" (different normalized form)
    const corrections = { kano: 'kanomunicipalarea' };
    const result = buildLgaToDistrictMap(senatorialData, corrections);
    expect(result.get('kanomunicipalarea')).toBe('Kano Central');
  });

  it('applies array corrections (one LGA maps to multiple)', () => {
    const senatorialData = [
      { Senatorial_District: 'Nasarawa West', LGAs: 'Nasarawa' },
    ];
    // "nasarawa" corrects to two different LGA names
    const corrections = { nasarawa: ['nasarawa', 'nasarawaeggon'] };
    const result = buildLgaToDistrictMap(senatorialData, corrections);
    expect(result.get('nasarawa')).toBe('Nasarawa West');
    expect(result.get('nasarawaeggon')).toBe('Nasarawa West');
  });

  it('handles alternative key names (district/lga)', () => {
    const senatorialData = [
      { district: 'Oyo South', lga: 'Ibadan North' },
    ];
    const result = buildLgaToDistrictMap(senatorialData, {});
    expect(result.get('ibadannorth')).toBe('Oyo South');
  });

  it('skips records with missing district or LGA', () => {
    const senatorialData = [
      { Senatorial_District: 'Lagos Central', LGAs: '' },
      { Senatorial_District: '', LGAs: 'Ikeja' },
      { Senatorial_District: 'Valid', LGAs: 'Valid LGA' },
    ];
    const result = buildLgaToDistrictMap(senatorialData, {});
    expect(result.size).toBe(1);
    expect(result.get('valid')).toBe('Valid');
  });
});
