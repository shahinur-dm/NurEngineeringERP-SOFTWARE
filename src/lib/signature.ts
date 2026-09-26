import fs from "fs";
import path from "path";

/**
 * Owner Handwritten Signature Asset
 */
export const SIGNATURE_IMAGE_SRC = "/signature.png";

let _signatureBuffer: Buffer | null = null;

export function getSignatureBuffer(): Buffer | null {
  if (_signatureBuffer) return _signatureBuffer;
  try {
    const filePath = path.join(process.cwd(), "public", "signature.png");
    if (fs.existsSync(filePath)) {
      _signatureBuffer = fs.readFileSync(filePath);
      return _signatureBuffer;
    }
  } catch (err) {
    console.error("Error loading signature buffer:", err);
  }
  return null;
}
