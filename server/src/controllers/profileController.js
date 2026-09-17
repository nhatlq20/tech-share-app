import User from '../models/User.js';

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

    return res.json({
      success: true,
      user: profileFields(user),
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
