import { describe, expect, it } from 'vitest';
import {
  getDeliveryFormatOptionsForTarget,
  getProfileOptionsForSelection,
} from '@/lib/endatix-api/reporting/export-format-types';
import { normalizeExportCapabilities } from '@/lib/endatix-api/reporting/normalize-export-capabilities';

describe('normalizeExportCapabilities', () => {
  it('maps numeric enum values from the API', () => {
    const normalized = normalizeExportCapabilities([
      {
        target: 1 as unknown as 'Codebook',
        deliveryFormat: 1 as unknown as 'Json',
        profile: 1 as unknown as 'Shoji',
        wireKey: 'codebook-shoji',
        label: 'Codebook (Shoji)',
        itemTypeName: 'Endatix.Core.Entities.DynamicExportRow',
      },
    ]);

    expect(normalized).toEqual([
      {
        target: 'Codebook',
        deliveryFormat: 'Json',
        profile: 'Shoji',
        wireKey: 'codebook-shoji',
        label: 'Codebook (Shoji)',
        itemTypeName: 'Endatix.Core.Entities.DynamicExportRow',
        description: '',
      },
    ]);
  });
});

describe('export format create helpers', () => {
  it('falls back to JSON delivery for codebook when capabilities are empty', () => {
    const options = getDeliveryFormatOptionsForTarget('Codebook', []);

    expect(options).toEqual([{ value: 'Json', label: 'JSON' }]);
  });

  it('falls back to native and shoji profiles for codebook JSON', () => {
    const options = getProfileOptionsForSelection('Codebook', 'Json', []);

    expect(options.map((option) => option.value)).toEqual(['Native', 'Shoji']);
  });
});
