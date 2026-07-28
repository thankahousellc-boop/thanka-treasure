// Dependency-free Code 128-B encoder.
//
// Returns the concatenated module-width string for a value. Reading the string
// left to right, the first digit is a black bar, the next a white space, then
// alternating. Each digit is the width of that bar/space in modules (1–4).
//
// Code set B covers ASCII 32–126 (space through "~"), which is all we need for
// SKUs (uppercase letters, digits, and dashes). Keeping the encoded value short
// keeps the printed barcode narrow — that is the whole point of encoding the SKU
// rather than a long human-readable string.

const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

export function encodeCode128B(value: string): string {
  if (value.length === 0) {
    throw new Error("Code128-B cannot encode an empty value.");
  }

  const codes: number[] = [START_B];

  for (const char of value) {
    const code = char.charCodeAt(0) - 32;
    if (code < 0 || code > 94) {
      throw new Error(
        `Code128-B cannot encode character: ${JSON.stringify(char)}`,
      );
    }
    codes.push(code);
  }

  // Weighted modulo-103 checksum: start value plus each data value times its
  // 1-based position.
  let checksum = START_B;
  for (let position = 1; position < codes.length; position += 1) {
    checksum += codes[position] * position;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  return codes.map((code) => PATTERNS[code]).join("");
}
