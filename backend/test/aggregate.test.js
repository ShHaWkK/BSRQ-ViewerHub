test('total = somme des streams', () => {
  const streams = [{ current: 10 }, { current: 5 }, { current: 2 }];
  const total = streams.reduce((s, a) => s + a.current, 0);
  expect(total).toBe(17);
});
