const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const toolkit = require('@reduxjs/toolkit');

const pending = [];
const deviceService = {
  getDevices: params => new Promise((resolve, reject) => pending.push({ params, resolve, reject })),
};
const exported = {};
const source = fs.readFileSync(`${__dirname}/src/store/slices/deviceSlice.ts`, 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exported,
  require: id => id === '@reduxjs/toolkit' ? toolkit : { deviceService },
});
const { default: reducer, fetchDevices, refreshDevices } = exported;

(async () => {
  for (const [oldThunk, newThunk] of [
    [refreshDevices, fetchDevices], [fetchDevices, refreshDevices],
    [refreshDevices, refreshDevices], [fetchDevices, fetchDevices],
  ]) {
    for (const oldFails of [false, true]) {
      const store = toolkit.configureStore({ reducer });
      const oldTask = store.dispatch(oldThunk({ category: 'all', search: 'iphone' }));
      const oldRequest = pending.shift();
      const newTask = store.dispatch(newThunk({ category: 'camera', search: 'sony' }));
      const newRequest = pending.shift();
      newRequest.resolve([{ _id: 'sony', title: 'Sony' }]);
      await newTask;
      if (oldFails) oldRequest.reject(new Error('Old request failed'));
      else oldRequest.resolve([{ _id: 'iphone', title: 'iPhone' }]);
      await oldTask;
      const state = store.getState();
      assert.equal(state.searchQuery, 'sony');
      assert.equal(state.selectedCategory, 'camera');
      assert.equal(state.filteredDevices[0]._id, 'sony');
      assert.equal(state.error, null);
      assert.equal(state.isLoading, false);
      assert.equal(state.isRefreshing, false);
      assert.equal(state.isInitialLoading, false);
    }
  }
  for (const thunk of [fetchDevices, refreshDevices]) {
    const store = toolkit.configureStore({ reducer });
    const task = store.dispatch(thunk({ search: 'sony' }));
    pending.shift().reject(new Error('Current request failed'));
    await task;
    assert.equal(store.getState().error, 'Current request failed');
    assert.equal(store.getState().isLoading, false);
    assert.equal(store.getState().isRefreshing, false);
    assert.equal(store.getState().isInitialLoading, false);
  }
  console.log('PASS 10 request cases: latest search/refresh wins; stale success/error ignored; loading flags and current failures handled.');
})().catch(error => { console.error(error); process.exitCode = 1; });
