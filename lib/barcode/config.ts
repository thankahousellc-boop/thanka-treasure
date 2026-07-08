import { settingsRepository } from "@/lib/repositories/settings-repository";

export const BARCODE_CONFIG_KEY = "barcode_config";

// Admin-configurable rule for composing a product's scannable code. The code is
// built from the listed attribute keys (in order) plus a unique product suffix.
export type BarcodeConfig = {
  // attribute_definitions.key values, in the order they appear in the code.
  attributeKeys: string[];
  prefix: string;
  separator: string;
};

export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  attributeKeys: [],
  prefix: "",
  separator: "-",
};

export async function getBarcodeConfig(): Promise<BarcodeConfig> {
  const stored = await settingsRepository.get<Partial<BarcodeConfig>>(
    BARCODE_CONFIG_KEY,
  );

  return {
    attributeKeys: Array.isArray(stored?.attributeKeys)
      ? stored!.attributeKeys.filter(
          (key): key is string => typeof key === "string",
        )
      : DEFAULT_BARCODE_CONFIG.attributeKeys,
    prefix:
      typeof stored?.prefix === "string"
        ? stored.prefix
        : DEFAULT_BARCODE_CONFIG.prefix,
    separator:
      typeof stored?.separator === "string" && stored.separator.length > 0
        ? stored.separator
        : DEFAULT_BARCODE_CONFIG.separator,
  };
}

export async function setBarcodeConfig(config: BarcodeConfig) {
  await settingsRepository.set(BARCODE_CONFIG_KEY, config);
}
