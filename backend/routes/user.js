const express = require('express');
const { register, verifyUser, login, logout, getMyProfile, updateRequestUsername, updateUsername, updatePassword, updateProfile, forgotPassword, resetPassword, deleteUser, deleteSingleteUser, updateUserRole } = require('../controllers/user');
const { isAuth, isVerified, authorizeRoles } = require('../middleware/isAuth');

const router = express.Router();

router.route('/register').post(register);
router.route('/verify').post(isAuth, verifyUser);
router.route('/login').post(login);
router.route('/logout').get(isAuth, isVerified, logout);
router.route('/me').get(isAuth, isVerified, getMyProfile);
router.route('/updatePassword').put(isAuth, isVerified, updatePassword);
router.route('/updateProfile').put(isAuth, isVerified, updateProfile);

router.route('/updateRequestUsername').post(isAuth, isVerified, updateRequestUsername);
router.route('/updateUsername').post(isAuth, isVerified, updateUsername);

router.route('/forgotPassword').post(forgotPassword);
router.route('/password/reset/:token').post(resetPassword);

router.route('/delete').get(isAuth, isVerified, deleteUser);
router.route('/delete/:id').get(isAuth, isVerified, authorizeRoles("admin"), deleteSingleteUser);

router.route('/updateUserRole/:id').get(isAuth, isVerified, authorizeRoles("admin"), updateUserRole);

module.exports = router