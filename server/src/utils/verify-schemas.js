import mongoose from 'mongoose';
import { User, Device, Booking, Review, Notification } from '../models/index.js';

console.log('🧪 BẮT ĐẦU KIỂM TRA CHUẨN HOÁ MONGOOSE SCHEMAS & OBJECTID...\n');

const models = [
  { name: 'User', model: User },
  { name: 'Device', model: Device },
  { name: 'Booking', model: Booking },
  { name: 'Review', model: Review },
  { name: 'Notification', model: Notification },
];

let allPassed = true;

for (const { name, model } of models) {
  console.log(`--- [Kiểm tra Model: ${name}] ---`);

  // 1. Kiểm tra không có trường 'id' khai báo thủ công trong schema.paths
  const hasManualId = model.schema.paths['id'] !== undefined;
  if (hasManualId) {
    console.error(`❌ [THẤT BẠI] Model ${name} đang khai báo trường 'id' thủ công trong schema.paths!`);
    allPassed = false;
  } else {
    console.log(`✅ Model ${name}: KHÔNG có trường 'id' thủ công (Chuẩn NoSQL)`);
  }

  // 2. Kiểm tra trường '_id' tồn tại và là ObjectId
  const idPath = model.schema.paths['_id'];
  const isObjectId = idPath && idPath.instance === 'ObjectId';
  if (isObjectId) {
    console.log(`✅ Model ${name}: '_id' là kiểu BSON ObjectId mặc định của Mongoose`);
  } else {
    console.error(`❌ [THẤT BẠI] Model ${name}: '_id' không phải là ObjectId! (${idPath?.instance})`);
    allPassed = false;
  }

  // 3. Kiểm tra virtual getter 'id' có sẵn
  const hasVirtualId = model.schema.virtuals['id'] !== undefined;
  if (hasVirtualId) {
    console.log(`✅ Model ${name}: Virtual getter 'id' đã sẵn sàng phục vụ Mobile Client`);
  } else {
    console.error(`❌ [THẤT BẠI] Model ${name}: Thiếu virtual getter 'id'!`);
    allPassed = false;
  }

  // 4. Khởi tạo Document mẫu và kiểm tra hành vi runtime
  const dummyDoc = new model();
  const rawId = dummyDoc._id;
  const virtualId = dummyDoc.id;

  if (rawId instanceof mongoose.Types.ObjectId && virtualId === rawId.toString()) {
    console.log(`✅ Model ${name}: dummyDoc._id = ${rawId} | dummyDoc.id = "${virtualId}" (Trùng khớp 100%)`);
  } else {
    console.error(`❌ [THẤT BẠI] Model ${name}: dummyDoc.id không khớp với dummyDoc._id.toString()!`);
    allPassed = false;
  }

  // 5. Kiểm tra toJSON()
  const jsonDoc = dummyDoc.toJSON();
  if (jsonDoc.id && !jsonDoc.__v) {
    console.log(`✅ Model ${name}: toJSON() bao gồm virtual 'id', đã ẩn '__v'`);
  } else {
    console.error(`❌ [THẤT BẠI] Model ${name}: toJSON() không hợp lệ!`);
    allPassed = false;
  }

  console.log('');
}

// 6. Kiểm tra các trường Foreign Key (tham chiếu) đều là ObjectId
console.log('--- [Kiểm tra các trường Foreign Key tham chiếu] ---');
const fkChecks = [
  { model: Device, field: 'owner', expectedRef: 'User' },
  { model: Booking, field: 'device', expectedRef: 'Device' },
  { model: Booking, field: 'renter', expectedRef: 'User' },
  { model: Booking, field: 'owner', expectedRef: 'User' },
  { model: Review, field: 'booking', expectedRef: 'Booking' },
  { model: Review, field: 'device', expectedRef: 'Device' },
  { model: Review, field: 'reviewer', expectedRef: 'User' },
  { model: Review, field: 'targetUser', expectedRef: 'User' },
  { model: Notification, field: 'recipient', expectedRef: 'User' },
];

for (const { model, field, expectedRef } of fkChecks) {
  const path = model.schema.paths[field];
  const isFKObjectId = path && path.instance === 'ObjectId' && path.options.ref === expectedRef;
  if (isFKObjectId) {
    console.log(`✅ ${model.modelName}.${field} -> ObjectId (ref: '${expectedRef}')`);
  } else {
    console.error(`❌ [THẤT BẠI] ${model.modelName}.${field} không phải ObjectId ref tới '${expectedRef}'! (${path?.instance}, ref: ${path?.options?.ref})`);
    allPassed = false;
  }
}

console.log('\n==================================================');
if (allPassed) {
  console.log('🎉 TOÀN BỘ 5 SCHEMAS ĐÃ ĐẠT CHUẨN OBJECTID CỦA MONGOOSE!');
  console.log('==================================================');
  process.exit(0);
} else {
  console.error('❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM TRA SCHEMAS!');
  console.log('==================================================');
  process.exit(1);
}
