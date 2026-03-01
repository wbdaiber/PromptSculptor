import { isSafeRedirect } from '../utils/sanitizer.js';

const testCases = [
  { url: '/app/admin', expected: true },
  { url: '/settings', expected: true },
  { url: 'https://google.com', expected: false },
  { url: 'http://evil.com', expected: false },
  { url: '//evil.com', expected: false },
  { url: '/\\evil.com', expected: false },
  { url: 'javascript:alert(1)', expected: false },
  { url: '', expected: false },
  { url: null, expected: false },
  { url: undefined, expected: false },
  { url: 'relative/path', expected: false },
];

let failed = false;
for (const { url, expected } of testCases) {
  const result = isSafeRedirect(url as any);
  if (result !== expected) {
    console.error(`Test failed for URL: "${url}". Expected ${expected}, got ${result}`);
    failed = true;
  } else {
    console.log(`Test passed for URL: "${url}"`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('All redirect validation tests passed!');
}
