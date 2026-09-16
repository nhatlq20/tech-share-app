import mongoose from 'mongoose';
import {
  User,
  Device,
  Booking,
  Review,
  Message,
  Notification,
  WalletTransaction,
  Voucher,
  Dispute,
  EkycRequest,
  AiCache,
} from '../models/index.js';

console.log('🧪 STARTING MONGOOSE SCHEMA & OBJECTID STANDARDIZATION CHECKS...\n');

const models = [
  { name: 'User', model: User },
  { name: 'Device', model: Device },
  { name: 'Booking', model: Booking },
  { name: 'Review', model: Review },
  { name: 'Message', model: Message },
  { name: 'Notification', model: Notification },
  { name: 'WalletTransaction', model: WalletTransaction },
  { name: 'Voucher', model: Voucher },
  { name: 'Dispute', model: Dispute },
  { name: 'EkycRequest', model: EkycRequest },
  { name: 'AiCache', model: AiCache },
];

let allPassed = true;

for (const { name, model } of models) {
  console.log(`--- [Checking Model: ${name}] ---`);

  // 1. Verify no manual 'id' field is defined in schema.paths
  const hasManualId = model.schema.paths['id'] !== undefined;
  if (hasManualId) {
    console.error(`❌ [FAILED] Model ${name} defines a manual 'id' in schema.paths!`);
    allPassed = false;
  } else {
    console.log(`✅ Model ${name}: NO manual 'id' field (NoSQL Standard)`);
  }

  // 2. Verify '_id' exists and is an ObjectId
  const idPath = model.schema.paths['_id'];
  const isObjectId = idPath && idPath.instance === 'ObjectId';
  if (isObjectId) {
    console.log(`✅ Model ${name}: '_id' is default Mongoose BSON ObjectId`);
  } else {
    console.error(`❌ [FAILED] Model ${name}: '_id' is not an ObjectId! (${idPath?.instance})`);
    allPassed = false;
  }

  // 3. Verify virtual getter 'id' is available
  const hasVirtualId = model.schema.virtuals['id'] !== undefined;
  if (hasVirtualId) {
    console.log(`✅ Model ${name}: Virtual getter 'id' is ready for Mobile Client`);
  } else {
    console.error(`❌ [FAILED] Model ${name}: Missing virtual getter 'id'!`);
    allPassed = false;
  }

  // 4. Instantiate dummy document and verify runtime behavior
  const dummyDoc = new model();
  const rawId = dummyDoc._id;
  const virtualId = dummyDoc.id;

  if (rawId instanceof mongoose.Types.ObjectId && virtualId === rawId.toString()) {
    console.log(`✅ Model ${name}: dummyDoc._id = ${rawId} | dummyDoc.id = "${virtualId}" (100% Match)`);
  } else {
    console.error(`❌ [FAILED] Model ${name}: dummyDoc.id does not match dummyDoc._id.toString()!`);
    allPassed = false;
  }

  // 5. Verify toJSON()
  const jsonDoc = dummyDoc.toJSON();
  if (jsonDoc.id && !jsonDoc.__v) {
    console.log(`✅ Model ${name}: toJSON() includes virtual 'id', hides '__v'`);
  } else {
    console.error(`❌ [FAILED] Model ${name}: toJSON() is invalid!`);
    allPassed = false;
  }

  console.log('');
}

// 6. Verify all Foreign Key references point to correct models
console.log('--- [Checking All Foreign Key References for ObjectId Standard] ---');
const fkChecks = [
  { model: Device, field: 'ownerId', expectedRef: 'User' },
  { model: Booking, field: 'deviceId', expectedRef: 'Device' },
  { model: Booking, field: 'renterId', expectedRef: 'User' },
  { model: Booking, field: 'ownerId', expectedRef: 'User' },
  { model: Review, field: 'bookingId', expectedRef: 'Booking' },
  { model: Review, field: 'deviceId', expectedRef: 'Device' },
  { model: Review, field: 'renterId', expectedRef: 'User' },
  { model: Review, field: 'ownerId', expectedRef: 'User' },
  { model: Message, field: 'bookingId', expectedRef: 'Booking' },
  { model: Message, field: 'senderId', expectedRef: 'User' },
  { model: Message, field: 'receiverId', expectedRef: 'User' },
  { model: Notification, field: 'userId', expectedRef: 'User' },
  { model: WalletTransaction, field: 'userId', expectedRef: 'User' },
  { model: WalletTransaction, field: 'relatedBookingId', expectedRef: 'Booking' },
  { model: Dispute, field: 'bookingId', expectedRef: 'Booking' },
  { model: Dispute, field: 'raisedBy', expectedRef: 'User' },
  { model: Dispute, field: 'resolvedBy', expectedRef: 'User' },
  { model: EkycRequest, field: 'userId', expectedRef: 'User' },
  { model: EkycRequest, field: 'reviewedBy', expectedRef: 'User' },
];

for (const { model, field, expectedRef } of fkChecks) {
  const path = model.schema.paths[field];
  const isFKObjectId = path && path.instance === 'ObjectId' && path.options.ref === expectedRef;
  if (isFKObjectId) {
    console.log(`✅ ${model.modelName}.${field} -> ObjectId (ref: '${expectedRef}')`);
  } else {
    console.error(`❌ [FAILED] ${model.modelName}.${field} is not an ObjectId referencing '${expectedRef}'! (${path?.instance}, ref: ${path?.options?.ref})`);
    allPassed = false;
  }
}

console.log('\n==================================================');
if (allPassed) {
  console.log('🎉 ALL 11 SCHEMAS PASSED MONGOOSE OBJECTID STANDARDS!');
  console.log('==================================================');
  process.exit(0);
} else {
  console.error('❌ ERRORS DETECTED DURING SCHEMA VERIFICATION!');
  console.log('==================================================');
  process.exit(1);
}
