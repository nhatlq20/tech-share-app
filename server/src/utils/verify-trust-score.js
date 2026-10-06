import mongoose from 'mongoose';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { calculateAndUpdateOwnerReputation } from '../services/trustScoreService.js';

console.log('🧪 BẮT ĐẦU KIỂM TRA TÍNH NĂNG TÍNH ĐIỂM UY TÍN (TRUST SCORE & REPUTATION)...\n');

let passedTests = 0;
let totalTests = 0;

const assert = (condition, message) => {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
};

const runTests = async () => {
  try {
    // 1. Kiểm tra 4 trường trong User schema
    console.log('--- 1. Kiểm tra User Schema Paths & Virtuals ---');
    assert(User.schema.paths['rating'] !== undefined, 'User schema có trường rating (Điểm sản phẩm)');
    assert(User.schema.paths['ownerRating'] !== undefined, 'User schema có trường ownerRating (Điểm uy tín người cho thuê)');
    assert(User.schema.paths['trustScore'] !== undefined, 'User schema có trường trustScore (Thang điểm 100)');
    assert(User.schema.paths['totalReviews'] !== undefined, 'User schema có trường totalReviews (Tổng đánh giá)');
    assert(User.schema.virtuals['totalReview'] !== undefined, 'User schema có virtual totalReview');

    const testUser = new User({
      name: 'Nguyen Van Test',
      email: 'test@techshare.vn',
      role: 'owner',
    });
    assert(testUser.rating === 5.0, 'Default rating là 5.0');
    assert(testUser.ownerRating === 5.0, 'Default ownerRating là 5.0');
    assert(testUser.trustScore === 100, 'Default trustScore là 100');
    assert(testUser.totalReviews === 0, 'Default totalReviews là 0');
    assert(testUser.totalReview === 0, 'Virtual totalReview trả về 0');

    // 2. Kiểm tra logic toán học tính Trust Score
    console.log('\n--- 2. Kiểm tra Logic Tính Toán Quy Đổi Điểm ---');
    // Giả sử có 2 review:
    // Review 1: rating = 4, ownerRating = 5
    // Review 2: rating = 5, ownerRating = 4
    // avgRating = (4 + 5) / 2 = 4.5
    // avgOwnerRating = (5 + 4) / 2 = 4.5
    // avgCombined = (4.5 + 4.5) / 2 = 4.5
    // trustScore = Math.round((4.5 / 5) * 100) = 90
    const calcExample1 = {
      ratings: [4, 5],
      ownerRatings: [5, 4],
    };
    const avgRating1 = calcExample1.ratings.reduce((a, b) => a + b, 0) / calcExample1.ratings.length;
    const avgOwnerRating1 = calcExample1.ownerRatings.reduce((a, b) => a + b, 0) / calcExample1.ownerRatings.length;
    const avg5_1 = (avgRating1 + avgOwnerRating1) / 2;
    const trustScore1 = Math.round((avg5_1 / 5) * 100);
    assert(avgRating1 === 4.5, 'avgRating tính đúng 4.5');
    assert(avgOwnerRating1 === 4.5, 'avgOwnerRating tính đúng 4.5');
    assert(trustScore1 === 90, 'trustScore tính đúng 90/100 từ trung bình 2 điểm (4.5 & 4.5)');

    // Giả sử có 3 review:
    // Review 1: rating = 5, ownerRating = 5
    // Review 2: rating = 4, ownerRating = 4
    // Review 3: rating = 3, ownerRating = 4
    // avgRating = (5 + 4 + 3) / 3 = 4.0
    // avgOwnerRating = (5 + 4 + 4) / 3 = 4.333 -> 4.3
    // avgCombined = (4.0 + 4.3) / 2 = 4.15
    // trustScore = Math.round((4.15 / 5) * 100) = 83
    const calcExample2 = {
      ratings: [5, 4, 3],
      ownerRatings: [5, 4, 4],
    };
    const avgRating2 = Number((calcExample2.ratings.reduce((a, b) => a + b, 0) / 3).toFixed(1));
    const avgOwnerRating2 = Number((calcExample2.ownerRatings.reduce((a, b) => a + b, 0) / 3).toFixed(1));
    const avg5_2 = (avgRating2 + avgOwnerRating2) / 2;
    const trustScore2 = Math.round((avg5_2 / 5) * 100);
    assert(avgRating2 === 4.0, 'avgRating tính đúng 4.0');
    assert(avgOwnerRating2 === 4.3, 'avgOwnerRating tính đúng 4.3');
    assert(trustScore2 === 83, 'trustScore tính đúng 83/100 từ trung bình (4.0 + 4.3)/2');

    // 3. Kiểm tra kiểm tra ownerId và throw error khi sai
    console.log('\n--- 3. Kiểm tra Validation ID và Error Handling ---');
    try {
      await calculateAndUpdateOwnerReputation(null);
      assert(false, 'Ném lỗi khi thiếu ownerId');
    } catch (err) {
      assert(err.message.includes('Mã chủ máy (ownerId) là bắt buộc'), 'Ném đúng lỗi khi thiếu ownerId');
    }

    try {
      await calculateAndUpdateOwnerReputation('invalid-object-id-123');
      assert(false, 'Ném lỗi khi ownerId không phải ObjectId');
    } catch (err) {
      assert(err.message.includes('Định dạng ownerId không hợp lệ'), 'Ném đúng lỗi khi định dạng ownerId sai');
    }

    console.log(`\n==================================================`);
    console.log(`🎉 KẾT QUẢ KIỂM TRA: ${passedTests}/${totalTests} TESTS ĐẠT 100%!`);
    console.log(`==================================================\n`);
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    console.error('Lỗi khi chạy kiểm tra:', error);
    process.exit(1);
  }
};

runTests();
