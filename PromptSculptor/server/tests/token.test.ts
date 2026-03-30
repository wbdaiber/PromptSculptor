import test from 'node:test';
import assert from 'node:assert';
import {
  generateResetToken,
  hashToken,
  validateToken,
  isTokenExpired,
  getTokenTimeRemaining,
  sanitizeTokenForLogging,
  isValidTokenFormat,
  TOKEN_CONFIG
} from '../services/tokenService.js';

test('generateResetToken should generate a valid token object', () => {
  const expiryMinutes = 30;
  const tokenData = generateResetToken(expiryMinutes);

  assert.ok(tokenData.token, 'Token should be defined');
  assert.ok(tokenData.token.length > 32, 'Token should be longer than 32 characters');
  assert.ok(tokenData.hashedToken, 'Hashed token should be defined');
  assert.strictEqual(tokenData.hashedToken, hashToken(tokenData.token), 'Hashed token should match');
  assert.ok(tokenData.expiresAt instanceof Date, 'expiresAt should be a Date');

  const now = new Date();
  const diffMs = tokenData.expiresAt.getTime() - now.getTime();
  const diffMinutes = diffMs / 60000;

  assert.ok(diffMinutes > 29, 'Expiry should be at least 29 minutes from now');
  assert.ok(diffMinutes <= 30, 'Expiry should be at most 30 minutes from now');
});

test('hashToken should be consistent', () => {
  const token = 'test-token-123';
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);
  assert.strictEqual(hash1, hash2, 'Hashes should be consistent');
  // SHA-256 for 'test-token-123'
  assert.strictEqual(hash1, '19b6b086eebb807f54e6327309dec0ff347a6c3c30bf3bb396f167513eba3475');
});

test('validateToken should return valid for correct token', () => {
  const tokenData = generateResetToken();
  const result = validateToken(tokenData.token, tokenData.hashedToken, tokenData.expiresAt);
  assert.strictEqual(result.isValid, true, 'Result should be valid');
});

test('validateToken should return invalid for wrong token', () => {
  const tokenData = generateResetToken();
  const result = validateToken('wrong-token', tokenData.hashedToken, tokenData.expiresAt);
  assert.strictEqual(result.isValid, false, 'Result should be invalid');
  assert.strictEqual(result.error, 'Invalid token');
});

test('validateToken should return expired for expired token', () => {
  const tokenData = generateResetToken();
  const expiredDate = new Date(Date.now() - 1000);
  const result = validateToken(tokenData.token, tokenData.hashedToken, expiredDate);
  assert.strictEqual(result.isValid, false, 'Result should be invalid');
  assert.strictEqual(result.isExpired, true, 'Should be marked as expired');
  assert.strictEqual(result.error, 'Token has expired');
});

test('validateToken should return used for used token', () => {
  const tokenData = generateResetToken();
  const result = validateToken(tokenData.token, tokenData.hashedToken, tokenData.expiresAt, true);
  assert.strictEqual(result.isValid, false, 'Result should be invalid');
  assert.strictEqual(result.isUsed, true, 'Should be marked as used');
  assert.strictEqual(result.error, 'Token has already been used');
});

test('isTokenExpired should work correctly', () => {
  const future = new Date(Date.now() + 10000);
  const past = new Date(Date.now() - 10000);
  assert.strictEqual(isTokenExpired(future), false, 'Future token should not be expired');
  assert.strictEqual(isTokenExpired(past), true, 'Past token should be expired');
});

test('getTokenTimeRemaining should return correct minutes', () => {
  const tenMinutesFuture = new Date(Date.now() + 10 * 60 * 1000 + 2000);
  assert.strictEqual(getTokenTimeRemaining(tenMinutesFuture), 10, 'Should return 10 minutes');
});

test('sanitizeTokenForLogging should mask token', () => {
  const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
  const sanitized = sanitizeTokenForLogging(token);
  assert.strictEqual(sanitized, 'abcd...7890');
});

test('sanitizeTokenForLogging should handle short tokens', () => {
  assert.strictEqual(sanitizeTokenForLogging('short'), '***');
});

test('isValidTokenFormat should validate token string', () => {
  const validToken = 'A'.repeat(TOKEN_CONFIG.MIN_TOKEN_LENGTH);
  const invalidShort = 'A'.repeat(TOKEN_CONFIG.MIN_TOKEN_LENGTH - 1);
  const invalidChars = 'A'.repeat(TOKEN_CONFIG.MIN_TOKEN_LENGTH - 1) + '!';

  assert.strictEqual(isValidTokenFormat(validToken), true, 'Length equal to min should be valid');
  assert.strictEqual(isValidTokenFormat(invalidShort), false, 'Shorter than min should be invalid');
  assert.strictEqual(isValidTokenFormat(invalidChars), false, 'Invalid characters should be invalid');
});
