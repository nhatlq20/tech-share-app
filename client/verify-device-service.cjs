const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

const apiClient = axios.create({ baseURL: 'http://localhost/api' });
let received;
let offline = false;
let failureStatus;
const devices = [{ _id: 'test-device', title: 'Sony' }];
apiClient.get = async (url, config) => {
  received = { url, ...config };
  if (failureStatus) throw { response: { status: failureStatus } };
  if (offline) throw new Error('Offline test');
  if (url.startsWith('/devices/')) {
    return { status: 200, data: { success: true, data: { _id: url.split('/').pop(), title: 'Backend detail', images: ['https://example.com/device.jpg'] } } };
  }
  return { status: 200, data: { success: true, count: 1, data: devices, pagination: { page: 2, limit: 5, totalItems: 6, totalPages: 2 } } };
};
const source = fs.readFileSync(`${__dirname}/src/services/deviceService.ts`, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const exportsObject = {};
vm.runInNewContext(compiled.outputText, {
  exports: exportsObject,
  require: id => { assert.equal(id, '../config/api'); return { apiClient }; },
  console: { log() {}, error() {} },
});

(async () => {
  const { deviceService, FALLBACK_DEVICES } = exportsObject;
  const result = await deviceService.getDevices({ category: 'camera', q: ' sony ', page: 2, limit: 5, sort: 'price_asc' });
  assert.equal(result, devices, 'Preserves Device[] return value');
  assert.equal(received.url, '/devices');
  assert.deepEqual(JSON.parse(JSON.stringify(received.params)), { category: 'camera', q: 'sony', page: 2, limit: 5, sort: 'price_asc' });
  await deviceService.getDevices({ category: 'all', search: ' Sony ' });
  assert.equal(received.params.q, 'Sony');
  assert.equal(received.params.category, undefined);
  await deviceService.getDevices();
  assert.equal(received.params.q, undefined);
  offline = true;
  for (const [sort, field, direction] of [['price_asc', 'dailyRate', 1], ['price_desc', 'dailyRate', -1], ['rating_desc', 'rating', -1]]) {
    const list = await deviceService.getDevices({ sort });
    assert.ok(list.every((d, i) => i === 0 || direction * (d[field] - list[i - 1][field]) >= 0));
  }
  const first = await deviceService.getDevices({ page: 1, limit: 5, sort: 'newest' });
  const second = await deviceService.getDevices({ page: 2, limit: 5, sort: 'newest' });
  assert.equal(first.length + second.length, FALLBACK_DEVICES.length);
  assert.ok(!first.some(a => second.some(b => a._id === b._id)));
  const combination = await deviceService.getDevices({ category: 'camera', q: 'sony', page: 1, limit: 5, sort: 'price_asc' });
  assert.equal(combination.length, 1);
  assert.equal(combination[0].category, 'camera');
  console.log('PASS service: Axios params, search alias, Device[] compatibility, fallback sorts, pagination and combined filters.');
  offline = false;
  for (const id of ['6ab00bc7f19b4739f545402f', '64e0a12f9b1c2b001a000003']) {
    const detail = await deviceService.getDeviceById(id, { throwOnError: true });
    assert.equal(received.url, `/devices/${id}`);
    assert.equal(detail._id, id);
    assert.equal(detail.title, 'Backend detail');
  }
  for (const status of [400, 404, 500]) {
    failureStatus = status;
    await assert.rejects(deviceService.getDeviceById('abc', { throwOnError: true }), error => error.response.status === status);
    assert.equal(await deviceService.getDeviceById('abc'), null, 'Preserve existing callers; never supply a fallback device');
  }
  failureStatus = undefined;
  offline = true;
  await assert.rejects(deviceService.getDeviceById('abc', { throwOnError: true }));
  console.log('PASS detail service: exact IDs, backend response, 400/404/500/network errors, no fallback, existing caller compatibility.');

  // Nearby devices service verification
  offline = false;
  failureStatus = undefined;
  apiClient.get = async (url, config) => {
    received = { url, ...config };
    if (failureStatus) throw { response: { status: failureStatus } };
    if (offline) throw new Error('Offline test');
    if (url === '/devices/nearby') {
      return { status: 200, data: { success: true, count: 2, data: [{ _id: 'dev-1', title: 'Device 1' }, { _id: 'dev-2', title: 'Device 2' }] } };
    }
    return { status: 200, data: { success: true, data: [] } };
  };
  const nearbyResult = await deviceService.getNearbyDevices({ latitude: 21.0285, longitude: 105.7826, maxDistance: 5000 });
  assert.equal(received.url, '/devices/nearby');
  assert.deepEqual(JSON.parse(JSON.stringify(received.params)), { lat: 21.0285, lng: 105.7826, maxDistance: 5000 });
  assert.equal(nearbyResult.length, 2);
  assert.equal(nearbyResult[0]._id, 'dev-1');
  failureStatus = 500;
  await assert.rejects(deviceService.getNearbyDevices({ latitude: 21.0285, longitude: 105.7826 }));
  console.log('PASS nearby service: /devices/nearby endpoint, lat/lng/maxDistance params, data unwrapping, error propagation without fake fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });

