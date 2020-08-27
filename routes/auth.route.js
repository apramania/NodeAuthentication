const express = require('express')
const router = express.Router()

const {
    validSign,
    validLogin,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../helpers/valid')

//Load Controllers
const {
    registerController,
    activationController,
    loginController,
    forgotPasswordController,
    resetPasswordController,
    googleController
} = require('../controllers/auth.controller.js')

router.post('/register', validSign , registerController)
router.post('/login', validLogin , loginController)
router.put('/forgotpassword', forgotPasswordValidator , forgotPasswordController)
router.put('/resetpassword', resetPasswordValidator , resetPasswordController)
router.post('/activation', activationController)


router.post('/googlelogin', googleController)

module.exports = router