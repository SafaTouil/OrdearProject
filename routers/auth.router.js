const express = require('express');
const router = express.Router();
const cookieParser = require("cookie-parser");
const AuthController = require('../controllers/auth.controller');

router.use(cookieParser());

router.post ('/registerClient', AuthController.registerClient);
router.post ('/activateAccount', AuthController.activateAccount);
router.post ('/login', AuthController.login);
router.put ('/forgotPwd', AuthController.forgotPasswordWithCode);
router.post ('/verifCode', AuthController.verifCodeForgotPassword);
router.put ('/resetPwd', AuthController.resetPassword);
router.post('/logout', AuthController.logout);

module.exports = router;