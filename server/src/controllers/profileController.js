import mongoose from 'mongoose';
import User from '../models/User.js';
import Device from '../models/Device.js';
import EkycRequest from '../models/EkycRequest.js';
import { calculateAndUpdateOwnerReputation } from '../services/trustScoreService.js';

const profileFields = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  avatar: user.avatar,
  role: user.role,
  isVerified: user.isVerified,
  // 4 trường uy tín được lưu trực tiếp trong collection 'users'
  rating: user.rating !== undefined && user.rating !== null ? Number(user.rating) : 5.0,
  ownerRating: user.ownerRating !== undefined && user.ownerRating !== null ? Number(user.ownerRating) : 5.0,
  trustScore: user.trustScore !== undefined && user.trustScore !== null ? Number(user.trustScore) : 100,
  totalReviews: user.totalReviews !== undefined && user.totalReviews !== null ? Number(user.totalReviews) : 0,
  totalReview: user.totalReviews !== undefined && user.totalReviews !== null ? Number(user.totalReviews) : 0,
});

export const getMyProfile = async (req, res) => {
  try {
    // Load trực tiếp thông tin người dùng từ collection 'users'
    const user = await User.findById(req.auth.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Chỉ xác thực isVerified = true khi đã có đơn eKYC được Admin duyệt (hoặc role admin)
    const hasApprovedEkyc = await EkycRequest.exists({ userId: user._id, status: 'approved' });
    const isEkycVerified = user.role === 'admin' ? true : Boolean(hasApprovedEkyc);

    if (user.isVerified !== isEkycVerified && user.role !== 'admin') {
      user.isVerified = isEkycVerified;
      await User.updateOne({ _id: user._id }, { isVerified: isEkycVerified });
    }

    return res.json({
      success: true,
      user: {
        ...profileFields(user),
        isVerified: isEkycVerified,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load profile',
    });
  }
};


/**
 * POST /api/profile/me/recalculate-trust-score
 * Tính toán lại 4 trường uy tín từ collection reviews cho người dùng hiện tại
 */
export const recalculateMyTrustScore = async (req, res) => {
  try {
    const result = await calculateAndUpdateOwnerReputation(req.auth.id);
    return res.json({
      success: true,
      message: 'Tính toán lại điểm uy tín thành công từ collection reviews',
      data: {
        rating: result.rating,
        ownerRating: result.ownerRating,
        trustScore: result.trustScore,
        totalReviews: result.totalReviews,
        totalReview: result.totalReview,
      },
      user: profileFields(result.user),
    });
  } catch (error) {
    console.error('Recalculate trust score error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tính toán lại điểm uy tín',
      error: error.message,
    });
  }
};


export const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'address', 'avatar'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.auth.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: profileFields(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(400).json({
      success: false,
      message: 'Unable to update profile',
      error: error.message,
    });
  }
};

export const uploadMyAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Avatar image is required' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      return res.status(500).json({ success: false, message: 'Cloudinary is not configured' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'techshare/avatars');

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    const cloudinaryData = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok || !cloudinaryData.secure_url) {
      console.error('Cloudinary upload error:', cloudinaryData);
      return res.status(502).json({ success: false, message: 'Avatar upload failed' });
    }

    const user = await User.findByIdAndUpdate(
      req.auth.id,
      { $set: { avatar: cloudinaryData.secure_url } },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Avatar updated successfully',
      user: profileFields(user),
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Unable to upload avatar' });
  }
};

/**
 * GET /api/profile/ekyc
 * Lấy trạng thái hồ sơ eKYC của người dùng hiện tại
 */
export const getMyEkyc = async (req, res) => {
  try {
    const ekyc = await EkycRequest.findOne({ userId: req.auth.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      ekyc: ekyc || null,
    });
  } catch (error) {
    console.error('Get my eKYC error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải trạng thái eKYC',
      error: error.message,
    });
  }
};

/**
 * POST /api/profile/ekyc/upload
 * Upload ảnh CCCD lên Cloudinary
 */
export const uploadEkycImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Ảnh giấy tờ là bắt buộc' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      return res.status(500).json({ success: false, message: 'Cloudinary chưa được cấu hình' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'techshare/ekyc');

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    const cloudinaryData = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok || !cloudinaryData.secure_url) {
      console.error('Cloudinary eKYC upload error:', cloudinaryData);
      return res.status(502).json({ success: false, message: 'Tải ảnh CCCD lên máy chủ thất bại' });
    }

    return res.status(200).json({
      success: true,
      url: cloudinaryData.secure_url,
    });
  } catch (error) {
    console.error('Upload eKYC image error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Không thể tải ảnh lên' });
  }
};

/**
 * POST /api/profile/ekyc
 * Gửi đơn định danh điện tử kèm số CCCD và ảnh CCCD 2 mặt đến admin
 */
export const submitEkyc = async (req, res) => {
  try {
    let { idCardNumber, address, idCardFrontUrl, idCardBackUrl, selfieUrl } = req.body || {};

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // Nếu ảnh CCCD được gửi dưới dạng file multipart, tự động upload lên Cloudinary
    if (req.files?.idCardFront?.[0] && cloudName && uploadPreset) {
      const file = req.files.idCardFront[0];
      const formData = new FormData();
      formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'techshare/ekyc');
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        idCardFrontUrl = uploadData.secure_url;
      }
    }

    if (req.files?.idCardBack?.[0] && cloudName && uploadPreset) {
      const file = req.files.idCardBack[0];
      const formData = new FormData();
      formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'techshare/ekyc');
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        idCardBackUrl = uploadData.secure_url;
      }
    }

    // 1. Kiểm tra tài khoản người dùng
    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản người dùng.',
      });
    }
    const verificationPurpose = user.role === 'renter' ? 'renter' : 'owner';

    // 2. Validate số CCCD
    const trimmedCardNumber = String(idCardNumber || '').trim();
    if (!trimmedCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số Căn cước công dân (CCCD).',
      });
    }

    // CCCD Việt Nam thường có 12 số (hoặc CMND cũ 9 số)
    const cccdRegex = /^[0-9]{9,12}$/;
    if (!cccdRegex.test(trimmedCardNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Số CCCD không hợp lệ. Vui lòng nhập từ 9 đến 12 chữ số.',
      });
    }

    // 3. Validate Địa chỉ nhà
    const trimmedAddress = String(address || '').trim();
    if (!trimmedAddress) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ nhà chi tiết.',
      });
    }

    if (trimmedAddress.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ nhà quá ngắn. Vui lòng nhập đầy đủ số nhà, tên đường, phường/xã, quận/huyện.',
      });
    }

    // 4. Validate ảnh CCCD 2 mặt
    if (!idCardFrontUrl || !idCardBackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ cả 2 mặt ảnh Căn cước công dân (mặt trước và mặt sau).',
      });
    }

    // Đồng bộ cập nhật địa chỉ vào User nếu chưa có
    if (!user.address || user.address !== trimmedAddress) {
      user.address = trimmedAddress;
      await user.save();
    }

    // Kiểm tra xem đã có hồ sơ nào chưa
    let ekyc = await EkycRequest.findOne({ userId: req.auth.id });

    if (ekyc) {
      if (ekyc.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản của bạn đã được định danh điện tử (eKYC) thành công trước đó.',
        });
      }

      if (ekyc.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Hồ sơ eKYC của bạn đang được quản trị viên xét duyệt. Vui lòng kiên nhẫn chờ đợi.',
        });
      }

      // Cập nhật lại hồ sơ nếu trước đó bị từ chối
      ekyc.fullName = user.name || '';
      ekyc.email = user.email || '';
      ekyc.phone = user.phone || '';
      ekyc.idCardNumber = trimmedCardNumber;
      ekyc.address = trimmedAddress;
      ekyc.verificationPurpose = verificationPurpose;
      ekyc.idCardFrontUrl = idCardFrontUrl;
      ekyc.idCardBackUrl = idCardBackUrl;
      ekyc.selfieUrl = selfieUrl || '';
      ekyc.status = 'pending';
      ekyc.rejectReason = '';
      ekyc.reviewedBy = null;
      ekyc.reviewedAt = null;
      await ekyc.save();
    } else {
      ekyc = await EkycRequest.create({
        userId: req.auth.id,
        fullName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        idCardNumber: trimmedCardNumber,
        address: trimmedAddress,
        verificationPurpose,
        idCardFrontUrl,
        idCardBackUrl,
        selfieUrl: selfieUrl || '',
        status: 'pending',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gửi hồ sơ định danh eKYC thành công! Quản trị viên sẽ kiểm tra và đối chiếu thủ công hồ sơ của bạn.',
      ekyc,
    });
  } catch (error) {
    console.error('Submit eKYC error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi hồ sơ eKYC. Vui lòng thử lại sau.',
      error: error.message,
    });
  }
};

export const getMyWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).populate({
      path: 'wishlist',
      populate: { path: 'ownerId', select: 'name avatar phone' },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const activeWishlist = (user.wishlist || []).filter(Boolean);

    return res.status(200).json({
      success: true,
      wishlist: activeWishlist,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách yêu thích',
      error: error.message,
    });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId || !mongoose.Types.ObjectId.isValid(deviceId)) {
      return res.status(400).json({ success: false, message: 'ID thiết bị không hợp lệ' });
    }

    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const currentWishlist = (user.wishlist || []).map((id) => id?.toString());
    const isExisted = currentWishlist.includes(deviceId.toString());

    let updatedUser;
    let isInWishlist = false;

    if (isExisted) {
      updatedUser = await User.findByIdAndUpdate(
        req.auth.id,
        { $pull: { wishlist: deviceId } },
        { new: true }
      ).populate({
        path: 'wishlist',
        populate: { path: 'ownerId', select: 'name avatar phone' },
      });
      isInWishlist = false;
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.auth.id,
        { $addToSet: { wishlist: deviceId } },
        { new: true }
      ).populate({
        path: 'wishlist',
        populate: { path: 'ownerId', select: 'name avatar phone' },
      });
      isInWishlist = true;
    }

    const activeWishlist = (updatedUser?.wishlist || []).filter(Boolean);

    return res.status(200).json({
      success: true,
      isInWishlist,
      wishlist: activeWishlist,
      message: isInWishlist
        ? 'Đã thêm thiết bị vào danh sách yêu thích'
        : 'Đã xóa thiết bị khỏi danh sách yêu thích',
    });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật danh sách yêu thích',
      error: error.message,
    });
  }
};

