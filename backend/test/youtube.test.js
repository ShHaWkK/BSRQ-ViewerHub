import { extractVideoId } from '../utils/youtube.js';

test('extraction ID YouTube', () => {
  expect(extractVideoId('https://youtu.be/ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
  expect(extractVideoId('https://www.youtube.com/watch?v=ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
  expect(extractVideoId('ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
  expect(extractVideoId('invalid')).toBe(null);
});
