import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema managing user identity, credentials, roles, and status.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address.'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters.'],
      select: false
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER'
    },
    avatar: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    passwordChangedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.passwordChangedAt;
        return ret;
      }
    }
  }
);

/**
 * Pre-save lifecycle hook to hash modified password strings before saving to MongoDB,
 * and automatically update passwordChangedAt timestamp for existing users.
 */
userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Update passwordChangedAt timestamp ONLY when modifying password on an existing user.
  // We subtract 1 second (1000ms) to ensure passwordChangedAt is slightly in the past
  // relative to any new JWT token issued immediately after password reset.
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

/**
 * Instance method to compare an incoming plain text password against the hashed password.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance method to check if user changed password after the JWT token was issued (iat).
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed after token issued
  return false;
};

export const User = mongoose.model('User', userSchema);
