const express = require('express');
const router = express.Router();
const cookieParser = require("cookie-parser");
const AuthRouter = require('./auth.router');
const userSpaceRouter = require('./user.router');
const passportRouter = require('./passport.rouer');

router.use(cookieParser());

router.use('/auth', AuthRouter);
router.use('/user', userSpaceRouter);
router.use('/auth', passportRouter);

module.exports = router;


