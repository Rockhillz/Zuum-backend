require('dotenv').config();
const db = require('../config/db.conf.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const SECRET_KEY = process.env.SECRET_KEY;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

console.log(SECRET_KEY)

const transporter = require('../helpers/transport.js');
const { generateOtp, saveOtp, validateOtp } = require("../utils/otp-utils.js");

exports.signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        // Check if email already exists
        const emailCheck = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(409).json({ error: "Email already exists. Please log in or use a different email." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const new_user = await db.query(
            "INSERT INTO users (username, email, password, email_verified) VALUES ($1, $2, $3, $4) RETURNING id",
            [username, email, hashedPassword, false]
        );

        const userId = new_user.rows[0].id;

        // Create the Profile
        await db.query(
            "INSERT INTO profile (user_id) VALUES ($1)",
            [userId]
        )

        // Generate and save OTP
        const otp = generateOtp();
        await saveOtp(email, otp);

        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 15 minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "User registered successfully. Please verify your email." });
    } catch (error) {
        console.log(error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(406).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: error.message });
    }
};



exports.login = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        // If user does not exist
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = rows[0];

        // Unhash password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;

    try {
        // Find user in the database
        const { rows: users } = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];

        // Generate a reset token (valid for 15 mins)
        const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });

        // Generate and save OTP
        const otp = generateOtp();
        await saveOtp(email, otp);
        
        // Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset",
            html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 15 minutes.</p>`,
        };


        await transporter.sendMail(mailOptions);

        res.json({ message: "Reset link sent to your email" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, otp, newPassword } = req.body;

    try {
        const { valid, reason, otpId } = await validateOtp(email, otp);

        if (!valid) {
            return res.status(400).json({ error: reason });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in the database
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, decoded.id]);


        // Mark OTP as used
        await db.query("UPDATE otp SET status = 'success' WHERE id = $1", [otpId]);

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.verifyEmail = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, otp } = req.body;

    try {
        const { valid, reason, otpId } = await validateOtp(email, otp);

        if (!valid) {
            return res.status(400).json({ error: reason });
        }

        // Update user email_verified field
        await db.query("UPDATE users SET email_verified = true WHERE email = $1", [email]);

        // Mark OTP as used
        await db.query("UPDATE otp SET status = 'success' WHERE id = $1", [otpId]);

        res.json({ message: "Email verified successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resendOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;

    try {
        // Generate new OTP
        const newOtp = generateOtp();
        await saveOtp(email, newOtp);

        // Send OTP via Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Resend OTP Verification Code",
            html: `<p>Your new OTP code is <strong>${newOtp}</strong>. It will expire in 15 minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "New OTP sent to your email" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALL_BACK,
    passReqToCallback: true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
        // Check if the user already exists in the database
        const [users] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
        if (users.length > 0) {
            return done(null, users[0]); 
        }
        // User does not exist, proceed to create a new user
        const newUser = {
            username: profile.displayName,
            email: profile.emails[0].value, // Ensure you're accessing the correct email
            google_id: profile.id
        };
        await db.query(
            'INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)', 
            [newUser.username, newUser.email, newUser.google_id]
        );
        const [createdUser] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
        return done(null, createdUser[0]);
    } catch (error) {
        console.error('Error in Google OAuth strategy:', error.sqlMessage || error.message); // Log the error message
        return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        done(null, users[0]);
    } catch (error) {
        console.error('Error in deserializeUser:', error.sqlMessage || error.message); // Log the error message
        done(error, null);
    }
});

