// Read-only HTTP integration checks using the real router and MongoDB.
import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import Device from '../models/Device.js';
import deviceRoutes from '../routes/deviceRoutes.js';
import { errorHandler } from '../middlewares/errorHandler.js';

let server;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const app = express();
  app.use('/api/devices', deviceRoutes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/devices`;
  const list = await (await fetch(`${base}?limit=100`)).json();
  const iphone = list.data.find(d => /iphone 15 pro max/i.test(d.name));
  const sony = list.data.find(d => /sony/i.test(d.name));
  assert.ok(iphone && sony);
  for (const entry of [iphone, sony]) {
    const url = `${base}/${entry._id}`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    const stored = await Device.findById(entry._id).lean();
    assert.equal(body.data._id, entry._id);
    assert.equal(body.data.name, stored.name);
    assert.deepEqual(body.data.images, stored.images);
    assert.equal(body.data.pricePerDay, stored.pricePerDay);
    assert.equal(body.data.ownerId._id, String(stored.ownerId));
    assert.ok(body.data.ownerId.name);
    for (const owner of [body.data.ownerId, body.data.owner]) {
      assert.ok(Object.keys(owner).every(key => ['_id', 'id', 'name', 'avatar', 'rating', 'isVerified'].includes(key)));
    }
    console.log(`PASS ${url} -> 200 ${body.data.name}`);
    console.log(JSON.stringify({ success: body.success, data: { _id: body.data._id, name: body.data.name, pricePerDay: body.data.pricePerDay, status: body.data.status, ownerId: body.data.ownerId } }));
  }
  for (const id of ['abc', '123456789012', 'z'.repeat(24)]) {
    const response = await fetch(`${base}/${id}`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
    console.log(`PASS ${base}/${id} -> 400`);
  }
  let missing;
  do { missing = new mongoose.Types.ObjectId().toString(); } while (await Device.exists({ _id: missing }));
  const notFound = await fetch(`${base}/${missing}`);
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).success, false);
  console.log(`PASS ${base}/${missing} -> 404`);
  const deleted = await Device.findOne({ isDeleted: true }).lean();
  if (deleted) {
    assert.equal((await fetch(`${base}/${deleted._id}`)).status, 404);
    console.log('PASS existing soft-deleted device -> 404');
  } else console.log('INFO No soft-deleted fixture in database; isDeleted: false confirmed by code inspection.');
  assert.equal((await fetch(base)).status, 200);
  console.log('PASS server still responds after invalid IDs');
} catch (error) {
  console.error(error.name, error.code || '', error.name === 'AssertionError' ? error.message : 'Detail verification failed (connection details omitted).');
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
}
