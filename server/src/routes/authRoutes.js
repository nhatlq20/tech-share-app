import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail, sendForgotPasswordOtpEmail } from '../services/emailService.js';

const router = express.Router();

const createToken = user => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing in .env');
  }

  return jwt.sign(
    {
      id: user._id,
      accountId: user.accountId,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' }
  );
};

router.post('/login', async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body || {};
    const loginIdentifier = String(identifier || username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required',
      });
    }

    const account = await Account.findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier.toLowerCase() },
      ],
      isActive: { $ne: false },
    }).select('+passwordHash');

    if (!account || !account.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const roleRecord = await mongoose.connection.db.collection('roles').findOne({
      _id: account.roleId,
    });
    const accountRole = ['admin', 'owner', 'renter'].includes(roleRecord?.code)
      ? roleRecord.code
      : 'renter';

    // Existing profiles may predate the accounts/users link and only contain email.
    let user = await User.findOne({ accountId: account._id }).lean()
      || await User.findOne({ email: account.email }).lean();

    if (!user) {
      const fallbackName = account.username || account.email.split('@')[0];

      user = await User.create({
        accountId: account._id,
        name: fallbackName,
        email: account.email,
        role: accountRole,
        isVerified: false,
        trustScore: 100,
      });
      user = user.toObject();
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found for this account',
      });
    }

    const userWithAccountEmail = {
      ...user,
      email: account.email,
      role: accountRole,
    };
    const token = createToken(userWithAccountEmail);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: account.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        role: accountRole,
        isVerified: user.isVerified,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/send-otp
 * Generates and sends a 6-digit OTP code to the requested email for registration.
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email, username, name } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc để nhận mã OTP',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng email không hợp lệ',
      });
    }

    // Check if account with email or username already exists
    const existingAccount = await Account.findOne({
      $or: [
        { email: normalizedEmail },
        ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
      ],
    });

    if (existingAccount) {
      if (existingAccount.email === normalizedEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email này đã được đăng ký tài khoản trong hệ thống',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Tên người dùng (username) này đã có người sử dụng',
      });
    }

    // Check cooldown / rate limiting (60s)
    const latestOtp = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'register',
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      const COOLDOWN_MS = 60 * 1000;
      if (elapsedMs < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${remainingSec} giây trước khi yêu cầu gửi lại mã OTP mới`,
          remainingSeconds: remainingSec,
        });
      }
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Upsert or clear previous OTP for this email
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'register' });
    await Otp.create({
      email: normalizedEmail,
      otp: otpCode,
      purpose: 'register',
      expiresAt,
    });

    // Send email using Nodemailer
    await sendOtpEmail(normalizedEmail, otpCode, name?.trim());

    return res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi mã OTP qua email. Vui lòng thử lại sau.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Validates whether the provided OTP code is correct and not expired.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedOtp = String(otp || '').trim();

    if (!normalizedEmail || !normalizedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email và mã xác thực OTP là bắt buộc',
      });
    }

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'register',
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn (hiệu lực trong 5 phút).',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mã OTP chính xác',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Xác thực OTP thất bại',
      error: error.message,
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, name, email, phone, password, otp } = req.body || {};
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedOtp = String(otp || '').trim();

    if (!normalizedUsername || !name?.trim() || !normalizedEmail || !phone?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, name, email, phone, and password are required',
      });
    }

    if (!normalizedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP là bắt buộc để đăng ký tài khoản',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Verify OTP first
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'register',
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra hoặc gửi lại mã mới.',
      });
    }

    const existingAccount = await Account.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists',
      });
    }

    const roleRecord = await mongoose.connection.db.collection('roles').findOne({
      code: 'renter',
    });

    if (!roleRecord) {
      return res.status(500).json({
        success: false,
        message: 'Selected role is not configured on the server',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await Account.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      roleId: roleRecord._id,
      isActive: true,
    });

    const user = await User.create({
      accountId: account._id,
      name: name.trim(),
      email: account.email,
      phone: phone.trim(),
      role: 'renter',
      isVerified: true, // Verified via email OTP!
      trustScore: 100,
    });

    // Delete used OTP
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'register' });

    const userWithAccountEmail = {
      ...user.toObject(),
      email: account.email,
    };
    const token = createToken(userWithAccountEmail);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: account.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

/**
 * Mask email for privacy/security display, e.g. "phainon33m5@gmail.com" -> "ph******m5@gmail.com"
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 3) {
    return `${local[0]}***@${domain}`;
  }
  const prefix = local.slice(0, 2);
  const suffix = local.slice(-2);
  const stars = '*'.repeat(Math.max(3, local.length - 4));
  return `${prefix}${stars}${suffix}@${domain}`;
};

/**
 * POST /api/auth/forgot-password
 * Search account by username or email. If found, generate & send OTP to registered email.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier, username, email } = req.body || {};
    const searchKey = String(identifier || username || email || '').trim();

    if (!searchKey) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên tài khoản (username) hoặc địa chỉ email',
      });
    }

    // Find active account by username or email
    const account = await Account.findOne({
      $or: [
        { username: searchKey },
        { email: searchKey.toLowerCase() },
      ],
      isActive: { $ne: false },
    });

    if (!account || !account.email) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với tên đăng nhập hoặc email này',
      });
    }

    // Cooldown check (60s)
    const latestOtp = await Otp.findOne({
      email: account.email,
      purpose: 'reset_password',
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      const COOLDOWN_MS = 60 * 1000;
      if (elapsedMs < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${remainingSec} giây trước khi yêu cầu gửi lại mã OTP mới`,
          remainingSeconds: remainingSec,
          email: account.email,
          maskedEmail: maskEmail(account.email),
        });
      }
    }

    // Find profile info to personalize email
    const user = await User.findOne({ accountId: account._id }).lean()
      || await User.findOne({ email: account.email }).lean();

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Remove old reset_password OTPs and store the new one
    await Otp.deleteMany({ email: account.email, purpose: 'reset_password' });
    await Otp.create({
      email: account.email,
      otp: otpCode,
      purpose: 'reset_password',
      expiresAt,
    });

    // Send reset OTP email
    await sendForgotPasswordOtpEmail(
      account.email,
      otpCode,
      user?.name || account.username || ''
    );

    return res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      email: account.email,
      maskedEmail: maskEmail(account.email),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xử lý yêu cầu quên mật khẩu. Vui lòng thử lại sau.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/verify-reset-otp
 * Verifies that the entered reset password OTP is correct and unexpired.
 */
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedOtp = String(otp || '').trim();

    if (!normalizedEmail || !normalizedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email và mã xác thực OTP là bắt buộc',
      });
    }

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'reset_password',
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn (hiệu lực trong 5 phút).',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP chính xác',
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Xác thực OTP thất bại',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP and updates account password with a new hashed password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedOtp = String(otp || '').trim();
    const password = String(newPassword || '');

    if (!normalizedEmail || !normalizedOtp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, mã OTP và mật khẩu mới là bắt buộc',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự',
      });
    }

    // Verify OTP first
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'reset_password',
      otp: normalizedOtp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng gửi lại mã mới.',
      });
    }

    // Find account
    const account = await Account.findOne({
      email: normalizedEmail,
      isActive: { $ne: false },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản tương ứng với email này',
      });
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(password, 10);
    await Account.updateOne({ _id: account._id }, { passwordHash });

    // Clean up OTP records
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'reset_password' });

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đặt lại mật khẩu thất bại. Vui lòng thử lại sau.',
      error: error.message,
    });
  }
});

export default router;

