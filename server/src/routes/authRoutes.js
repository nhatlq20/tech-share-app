import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import User from '../models/User.js';

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

router.post('/register', async (req, res) => {
  try {
    const { username, name, email, phone, password } = req.body || {};
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedUsername || !name?.trim() || !normalizedEmail || !phone?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, name, email, phone, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
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
        message: 'An account with this email already exists',
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
      isVerified: false,
      trustScore: 100,
    });

    const userWithAccountEmail = {
      ...user.toObject(),
      email: account.email,
    };
    const token = createToken(userWithAccountEmail);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
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

export default router;
