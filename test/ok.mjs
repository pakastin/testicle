export default (t, factory) => {
  t.plan(3);

  const test = factory({
    passed (a, message) {
      t.pass(message);
    }
  });

  test('Should pass', (t) => {
    t.plan(3);
    t.ok(true, 'true');
    t.ok(1, '1');
    t.ok('ok', '"ok"');
  });
};
