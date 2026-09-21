// Read-only integration checks against the configured database. Never runs seeds.
import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import Device from '../models/Device.js';
import deviceRoutes from '../routes/deviceRoutes.js';

let server;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const app = express();
  app.use('/api/devices', deviceRoutes);
  app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/devices`;
  const all = await Device.find({ status: 'available', isDeleted: false }).lean();
  assert.ok(all.length > 5, 'Need at least six available devices to verify distinct pages');
  assert.ok(all.some(d => d.category === 'camera' && /sony/i.test(`${d.name} ${d.brand} ${d.description}`)), 'Need seeded Sony camera for combination checks');
  const fields = { price_asc: ['pricePerDay', 1], price_desc: ['pricePerDay', -1], rating_desc: ['ratingAvg', -1], newest: ['createdAt', -1] };
  let checks = 0;
  async function check(query = {}, expectedPage = 1, expectedLimit = 10) {
    const response = await fetch(`${base}?${new URLSearchParams(query)}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    let expected = all.filter(d => (!query.category || query.category === 'all' || d.category === query.category.trim().toLowerCase()) &&
      (!query.q || [d.name, d.brand, d.description].some(value => value.toLowerCase().includes(query.q.trim().toLowerCase()))));
    const [field, direction] = Object.hasOwn(fields, query.sort) ? fields[query.sort] : fields.newest;
    expected.sort((a, b) => direction * (a[field] - b[field]) || String(a._id).localeCompare(String(b._id)));
    assert.deepEqual(body.pagination, { page: expectedPage, limit: expectedLimit, totalItems: expected.length, totalPages: Math.ceil(expected.length / expectedLimit) });
    expected = expected.slice((expectedPage - 1) * expectedLimit, expectedPage * expectedLimit);
    assert.equal(body.success, true);
    assert.equal(body.count, expected.length);
    assert.deepEqual(body.data.map(d => d._id), expected.map(d => String(d._id)));
    assert.ok(body.data.every(d => d.title === d.name && d.dailyRate === d.pricePerDay));
    checks++;
    console.log(`PASS /api/devices?${new URLSearchParams(query)} (${body.count}/${body.pagination.totalItems})`);
    return body;
  }
  await check();
  await check({ category: 'camera' });
  await check({ q: 'sony' });
  await check({ category: 'camera', q: 'sony' });
  const first = await check({ page: '1', limit: '5' }, 1, 5);
  const second = await check({ page: '2', limit: '5' }, 2, 5);
  assert.ok(second.data.length && !first.data.some(a => second.data.some(b => a._id === b._id)));
  for (const sort of Object.keys(fields)) await check({ sort });
  await check({ category: 'camera', page: '1', limit: '5' }, 1, 5);
  await check({ q: 'sony', page: '1', limit: '5' }, 1, 5);
  await check({ q: 'sony', sort: 'price_asc' });
  await check({ category: 'camera', q: 'sony', page: '1', limit: '5', sort: 'price_asc' }, 1, 5);
  await check({ q: 'no-matching-device-s024' });
  await check({ q: '.*' });
  await check({ page: '999999', limit: '5' }, 999999, 5);
  for (const page of ['0', '-1', 'abc', '1.5', '1e3', '9007199254740991']) await check({ page });
  for (const limit of ['0', '-10', 'abc', '2.5', '9007199254740992']) await check({ limit });
  await check({ limit: '99999' }, 1, 100);
  for (const sort of ['bad', '__proto__', 'constructor', '-pricePerDay']) await check({ sort });
  for (const query of ['q=sony&q=iphone', 'category=camera&category=audio', 'q[x]=sony', 'category[x]=camera', 'q[]=sony', 'category[]=camera']) {
    const response = await fetch(`${base}?${query}`);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(typeof body.message, 'string');
    checks++;
    console.log(`PASS /api/devices?${query} -> 400`);
  }
  console.log(`PASS: ${checks} API cases; page 1 and page 2 do not overlap.`);
} catch (error) {
  console.error(error.name, error.code || '', error.name === 'AssertionError' ? error.message : 'Integration check failed (connection details omitted).');
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
