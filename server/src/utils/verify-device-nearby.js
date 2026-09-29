// Read-only HTTP checks against MongoDB. Does not seed or modify records/indexes.
import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import Device from '../models/Device.js';
import deviceRoutes from '../routes/deviceRoutes.js';
import ownerAnalyticsRoutes from '../routes/ownerAnalyticsRoutes.js';
import { errorHandler } from '../middlewares/errorHandler.js';

let server;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const indexes = await Device.collection.indexes();
  assert.ok(indexes.some(index => index.key.location === '2dsphere'), 'Missing live location 2dsphere index');
  console.log('PASS live MongoDB location 2dsphere index');
  const app = express();
  app.use('/api/devices', ownerAnalyticsRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/devices/nearby`;
  const all = await Device.find({}).lean();
  const center = all.find(d => /iphone 15 pro max/i.test(d.name) && d.status === 'available' && !d.isDeleted);
  assert.ok(center, 'Need the existing seeded iPhone');
  const [lng, lat] = center.location.coordinates;
  console.log(JSON.stringify({ center: center.name, lat, lng, source: 'MongoDB' }));
  // Independent great-circle calculation verifies membership and ordering.
  const radians = degrees => degrees * Math.PI / 180;
  const distance = device => {
    const [x, y] = device.location.coordinates;
    const a = Math.sin(radians(y - lat) / 2) ** 2 +
      Math.cos(radians(lat)) * Math.cos(radians(y)) * Math.sin(radians(x - lng) / 2) ** 2;
    return 6378100 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  };
  let previous = [];
  let fiveKm;
  for (const radius of [500, 1000, 5000, 10000]) {
    const response = await fetch(`${base}?${new URLSearchParams({ lat, lng, maxDistance: radius })}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.count, body.data.length);
    const ids = body.data.map(d => d._id);
    assert.ok(ids.includes(String(center._id)));
    assert.ok(previous.every(id => ids.includes(id)), 'Increasing radius must retain previous results');
    const expected = all.filter(d => d.status === 'available' && d.isDeleted === false &&
      d.location?.coordinates?.length === 2 && distance(d) <= radius).map(d => String(d._id));
    assert.deepEqual([...ids].sort(), expected.sort());
    let lastDistance = -1;
    for (const d of body.data) {
      for (const key of ['_id', 'name', 'brand', 'images', 'pricePerDay', 'ratingAvg', 'location', 'status', 'addressText']) {
        assert.ok(Object.hasOwn(d, key), `Missing ${key}`);
      }
      assert.equal(d.location.type, 'Point');
      const meters = distance(d);
      assert.ok(meters >= lastDistance - 0.01, 'Results must be nearest first');
      lastDistance = meters;
    }
    previous = ids;
    if (radius === 5000) fiveKm = ids;
    console.log(`PASS ${radius}m: ${ids.length} devices; membership, fields, filters, order`);
  }
  const defaultResponse = await fetch(`${base}?${new URLSearchParams({ lat, lng })}`);
  assert.equal(defaultResponse.status, 200);
  assert.deepEqual((await defaultResponse.json()).data.map(d => d._id).sort(), fiveKm.sort());
  const invalid = ['', 'lat=abc&lng=105', 'lat=100&lng=105', 'lat=10&lng=200',
    'lat=10&lng=105&maxDistance=-1', 'lat=10', 'lng=105', 'lat=&lng=105',
    'lat=10&lng=105&maxDistance=0', 'lat=10&lng=105&maxDistance=',
    'lat=Infinity&lng=105', 'lat=10&lng=NaN', 'lat=-91&lng=105', 'lat=10&lng=-181',
    'lat=10&lng=105&maxDistance=Infinity', 'lat=10&lng=105&maxDistance=abc',
    'lat=10&lat=11&lng=105', 'lat[x]=10&lng=105', 'lat=10&lng[]=105',
    'lat=10&lng=105&maxDistance=500&maxDistance=1000'];
  for (const query of invalid) {
    const response = await fetch(`${base}?${query}`);
    assert.equal(response.status, 400, query);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.message, /lat|lng|maxDistance/); // Never the dynamic ID controller.
  }
  for (const [latitude, longitude] of [[0, 0], [-90, -180], [90, 180]]) {
    assert.equal((await fetch(`${base}?lat=${latitude}&lng=${longitude}&maxDistance=1`)).status, 200);
  }
  console.log(`PASS ${invalid.length} invalid queries, static route precedence, coordinate boundaries, default 5000m`);
  console.log(`INFO excluded stored records: ${all.filter(d => d.isDeleted || d.status !== 'available').length}`);
} catch (error) {
  console.error(error.name, error.code || '', error.name === 'AssertionError' ? error.message : 'Nearby verification failed (connection details omitted).');
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
