import test from 'node:test';
import assert from 'node:assert';
import {
  generateResetToken,
  hashToken,
  validateToken,
  generateTestToken,
  isTokenExpired,
  getTokenTimeRemaining,
  sanitizeTokenForLogging,
  isValidTokenFormat,
  TOKEN_CONFIG
} from '../services/tokenService.js';

test('isTokenExpired', () => {
  const pastDate = new Date(Date.now() - 1000); // 1 second ago
  const futureDate = new Date(Date.now() + 10000); // 10 seconds from now

  assert.strictEqual(isTokenExpired(pastDate), true, 'Past date should be expired');
  assert.strictEqual(isTokenExpired(futureDate), false, 'Future date should not be expired');
});

test('getTokenTimeRemaining', () => {
  const now = Date.now();
  const fiveMinutesFromNow = new Date(now + 5 * 60 * 1000);
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

  assert.strictEqual(getTokenTimeRemaining(fiveMinutesFromNow), 5, 'Should return 5 minutes remaining');
  assert.strictEqual(getTokenTimeRemaining(fiveMinutesAgo), -5, 'Should return -5 minutes remaining');
});

test('generateResetToken', () => {
  const expiryMinutes = 10;
  const tokenData = generateResetToken(expiryMinutes);

  assert.ok(tokenData.token, 'Should have a raw token');
  assert.ok(tokenData.hashedToken, 'Should have a hashed token');
  assert.ok(tokenData.expiresAt instanceof Date, 'Should have an expiresAt Date');

  const expectedExpiry = Date.now() + expiryMinutes * 60 * 1000;
  const actualExpiry = tokenData.expiresAt.getTime();

  // Allow for small time difference (1 second)
  assert.ok(Math.abs(actualExpiry - expectedExpiry) < 1000, 'Expiry date should be correct');
});

test('hashToken', () => {
  const token = 'test-token';
  const hashed1 = hashToken(token);
  const hashed2 = hashToken(token);

  assert.strictEqual(hashed1, hashed2, 'Hash should be consistent');
  assert.match(hashed1, /^[a-f0-9]{64}$/, 'Should be a 64-character hex string (SHA-256)');
});

test('validateToken', () => {
  const tokenData = generateResetToken(30);
  const { token, hashedToken, expiresAt } = tokenData;

  // Valid token
  const validResult = validateToken(token, hashedToken, expiresAt, false);
  assert.strictEqual(validResult.isValid, true, 'Should be valid');

  // Used token
  const usedResult = validateToken(token, hashedToken, expiresAt, true);
  assert.strictEqual(usedResult.isValid, false, 'Should be invalid if used');
  assert.strictEqual(usedResult.isUsed, true);

  // Expired token
  const expiredDate = new Date(Date.now() - 1000);
  const expiredResult = validateToken(token, hashedToken, expiredDate, false);
  assert.strictEqual(expiredResult.isValid, false, 'Should be invalid if expired');
  assert.strictEqual(expiredResult.isExpired, true);

  // Invalid token hash
  const invalidResult = validateToken('wrong-token', hashedToken, expiresAt, false);
  assert.strictEqual(invalidResult.isValid, false, 'Should be invalid if hash does not match');
});

test('generateTestToken', () => {
  const tokenData = generateTestToken();
  assert.ok(tokenData.token);

  const expectedExpiry = Date.now() + 5 * 60 * 1000;
  assert.ok(Math.abs(tokenData.expiresAt.getTime() - expectedExpiry) < 1000, 'Test token should expire in 5 minutes');
});

test('sanitizeTokenForLogging', () => {
  const longToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
  const sanitizedLong = sanitizeTokenForLogging(longToken);
  assert.strictEqual(sanitizedLong, 'abcd...7890', 'Should show first/last 4 characters');

  const shortToken = '1234567';
  const sanitizedShort = sanitizeTokenForLogging(shortToken);
  assert.strictEqual(sanitizedShort, '***', 'Should be fully masked if 8 characters or less');

  const eightCharToken = '12345678';
  assert.strictEqual(sanitizeTokenForLogging(eightCharToken), '***', 'Should be fully masked if exactly 8 chars');
});

test('isValidTokenFormat', () => {
  // Valid token (>= 32 chars, base64url)
  const validToken = 'A'.repeat(32);
  assert.strictEqual(isValidTokenFormat(validToken), true, 'Should be valid format');

  const validBase64Url = 'Abc_123-Def_456-Ghi_789-Jkl_012_'; // 32 chars
  assert.strictEqual(isValidTokenFormat(validBase64Url), true, 'Should be valid base64url');

  // Too short
  assert.strictEqual(isValidTokenFormat('A'.repeat(31)), false, 'Should be too short');

  // Invalid characters
  assert.strictEqual(isValidTokenFormat('A'.repeat(32) + '+/='), false, 'Should not allow non-base64url characters');

  // Not a string
  assert.strictEqual(isValidTokenFormat(123 as any), false, 'Should not be a string');
  assert.strictEqual(isValidTokenFormat(null as any), false, 'Should not be null');
});
