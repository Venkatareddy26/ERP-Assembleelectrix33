import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from '../src/lib/latest-request.ts';

test('late refresh responses cannot commit after a workspace switch or a newer refresh', async () => {
  const requests = createLatestRequest();
  let visible;
  let resolveDemo;
  const delayedDemo = new Promise(resolve => { resolveDemo = resolve; });
  const demoRequest = requests.start();
  const pending = delayedDemo.then(result => { if (demoRequest.isCurrent()) visible = result; });
  requests.cancel(); // switching workspaces invalidates immediately, before its effect
  assert.equal(demoRequest.signal.aborted, true);
  const actualRequest = requests.start();
  if (actualRequest.isCurrent()) visible = 'actual';
  resolveDemo('demo');
  await pending;
  assert.equal(visible, 'actual');
  const refresh = requests.start();
  assert.equal(actualRequest.isCurrent(), false);
  assert.equal(refresh.isCurrent(), true);
  requests.cancel();
  assert.equal(refresh.isCurrent(), false);
});
