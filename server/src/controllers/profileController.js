import User from '../models/User.js';
import EkycRequest from '../models/EkycRequest.js';

const profileFields = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  avatar: user.avatar,
  role: user.role,
  isVerified: user.isVerified,
  trustScore: user.trustScore,
});

export const getMyProfile = async (req, res) => {
  try {
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
    let { idCardNumber, idCardFrontUrl, idCardBackUrl, selfieUrl } = req.body || {};

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

    const trimmedCardNumber = String(idCardNumber || '').trim();
    if (!trimmedCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số Căn cước công dân (CCCD)',
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

    if (!idCardFrontUrl || !idCardBackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ cả 2 mặt ảnh Căn cước công dân (mặt trước và mặt sau)',
      });
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
      ekyc.idCardNumber = trimmedCardNumber;
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
        idCardNumber: trimmedCardNumber,
        idCardFrontUrl,
        idCardBackUrl,
        selfieUrl: selfieUrl || '',
        status: 'pending',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gửi hồ sơ định danh eKYC thành công! Quản trị viên sẽ sớm kiểm duyệt hồ sơ của bạn.',
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
