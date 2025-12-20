const bcrypt = require("bcrypt");
const crypto = require("crypto");

/* =========================
   CONSTANTS & VALIDATION
========================= */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;
const SALT_ROUNDS = 12;

/* Fail fast if env is misconfigured */
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must be exactly 32 characters (AES-256 requirement)"
  );
}

/* =========================
   PASSWORD FUNCTIONS
========================= */

/* Hash password using bcrypt */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/* Strong password policy */
function validatePassword(password) {
  /**
   * Rules:
   * - Min 12 characters
   * - 1 uppercase
   * - 1 lowercase
   * - 1 number
   * - 1 special character
   */
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{12,}$/;

  return regex.test(password);
}

/* =========================
   ENCRYPT / DECRYPT (AES-256)
========================= */

/* Encrypt sensitive fields (loginId, email, mobile) */
function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf8"),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/* Decrypt encrypted fields */
function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(":")) return null;

  const [ivHex, encryptedHex] = encryptedText.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf8"),
    iv
  );

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  hashPassword,
  validatePassword,
  encrypt,
  decrypt
};
