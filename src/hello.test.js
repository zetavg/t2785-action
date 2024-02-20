const hello = require('./hello');

test('adds 1 + 2 to equal 3', () => {
  expect(hello(1, 2)).toBe(3);
});
