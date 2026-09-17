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
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const account = await Account.findOne({
      email: String(email).trim().toLowerCase(),
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

    const user = await User.findOne({ accountId: account._id }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found for this account',
      });
    }

    const userWithAccountEmail = {
      ...user,
      email: account.email,
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
        role: user.role || 'rental',
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
    const { name, email, phone, password, role } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !phone?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingAccount = await Account.findOne({ email: normalizedEmail });
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const allowedRoles = ['owner', 'rental'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Only owner or rental accounts can register publicly',
      });
    }

    const normalizedRole = role === 'rental' ? 'renter' : role;
    const roleRecord = await mongoose.connection.db.collection('roles').findOne({
      code: normalizedRole,
    });

    if (!roleRecord) {
      return res.status(500).json({
        success: false,
        message: 'Selected role is not configured on the server',
      });
    }

    const username = normalizedEmail.split('@')[0];
    const passwordHash = await bcrypt.hash(password, 10);
    const account = await Account.create({
      username,
      email: normalizedEmail,
      passwordHash,
      roleId: roleRecord._id,
      isActive: true,
    });

    const user = await User.create({
      accountId: account._id,
      name: name.trim(),
      phone: phone.trim(),
      role,
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
