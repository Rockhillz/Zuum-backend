const express = require('express');
const { tokenRequired } = require('../middleware/Auth.middleware')
const { updateProfileValidator } = require('../middleware/User.middleware');
const { getProfile, updateProfile, deleteProfile } = require('../controllers/User.controller');
const router = express.Router();

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     description: Retrieves the profile information for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: Profile ID
 *                 image:
 *                   type: string
 *                   description: Profile image URL
 *                 cover_image:
 *                   type: string
 *                   description: Cover image URL
 *                 bio:
 *                   type: string
 *                   description: User biography
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Profile creation timestamp
 *                 username:
 *                   type: string
 *                   description: User's username
 *                 email:
 *                   type: string
 *                   description: User's email
 *                 phone_number:
 *                   type: string
 *                   description: User's phone number
 *                 identity:
 *                   type: string
 *                   description: User's identity type
 *                 email_verified:
 *                   type: boolean
 *                   description: Whether email is verified
 *                 is_admin:
 *                   type: boolean
 *                   description: Whether user is an admin
 *                 deactivated:
 *                   type: boolean
 *                   description: Whether user account is deactivated
 *               example:
 *                 id: 1
 *                 image: "https://example.com/image.jpg"
 *                 cover_image: "https://example.com/cover.jpg"
 *                 bio: "Software developer"
 *                 username: "Myles"
 *                 email: "example@gmail.com"
 *                 phone_number: 08049387362
 *                 identity: "artist"
 *                 email_verified: true
 *                 is_admin: false
 *                 deactivated: true,
 *                 created_at: "2025-03-07T12:00:00Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.get('/profile', tokenRequired, getProfile);


/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     description: Updates the authenticated user's profile and user details. Email updates trigger a verification email.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username
 *               email:
 *                 type: string
 *                 description: New email (triggers verification)
 *               phone_number:
 *                 type: string
 *                 description: New phone number
 *               bio:
 *                 type: string
 *                 description: New biography
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *               cover_image:
 *                 type: string
 *                 format: binary
 *                 description: Cover image file
 *           required: [] 
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 emailVerificationSent:
 *                   type: boolean
 *                   description: Indicates if an email verification was sent
 *               example:
 *                 message: "Profile updated successfully"
 *                 emailVerificationSent: true
 *       400:
 *         description: Validation errors
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.put('/profile', tokenRequired, ...updateProfileValidator, updateProfile);

/**
 * @swagger
 * /api/user/profile:
 *   delete:
 *     summary: Delete user profile
 *     description: Deletes the authenticated user's profile. Does not affect the user account itself.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *               example:
 *                 status: true
 *                 message: "Profile deleted successfully"
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.delete('/profile', tokenRequired, deleteProfile);

module.exports = router;
