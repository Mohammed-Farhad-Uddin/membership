const { User } = require('../models/user');
const sendMail = require('../utils/sendMail');
const { sendToken } = require('../utils/sendToken');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cloudinary = require("cloudinary");
const fs = require("fs");

exports.register = async (req, res) => {
    try {
        const { name, email, password, dob, phone, role} = req.body;

        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({
                success: false,
                message: "User already registered"
            });
        }

        const  avatar  = req.files.avatar.tempFilePath;

        console.log(req.files.avatar);
        // console.log(req.files);
        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "users",
            width: 150,
            crop: "scale",
        });
        fs.rmSync("./tmp", { recursive: true });


        const otp = Math.floor(Math.random() * 1000000);

        let userData = {
            name,
            email,
            password,
            phone: Number(phone),
            dob,
            role,
            // age: Number(age),
            avatar: {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            },
            otp,
            otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
        }

        user = await User.create(userData);

        await sendMail(email, "Verify Your Account", `Your OTP is ${otp}`);

        sendToken(res, user, 201, "OTP is send to your email, Please verify your email first");

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.verifyUser = async (req, res, next) => {
    try {
        const otp = Number(req.body.otp);

        const user = await User.findById(req.user._id);

        if (user.otp !== otp || user.otp_expiry < Date.now()) {
            return res.status(401).json({ success: false, message: "OTP is invalid or has been expired" });
        }

        user.verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        sendToken(res, user, 200, "Account Verified");
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



///Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({ success: false, message: "Please enter all fields" });
        }

        let user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        if (!user.verified) {
            return res.status(403).json({ success: false, message: "Please verify your account first" })
        }

        let matchedPassword = await user.comparePassword(password);

        if (!matchedPassword) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        sendToken(res, user, 200, "User logged in successfully");

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



///Logout
exports.logout = async (req, res) => {
    try {

        res.status(200).cookie("token", null, { expires: new Date(Date.now()) }).json({ success: true, message: 'Logged out successfully!' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


///My Profile
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Please login first!"
            });
        }
        res.status(200).json({
            success: true,
            user,
            message: `Welcome ${user.name}`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



//Update User Password (user)
exports.updatePassword = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id).select("+password");

        const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

        if (!isPasswordMatched) {
            return res.status(400).json({ success: false, message: "User password mismatch!" });
        }

        if (req.body.newPassword !== req.body.confirmPassword) {
            return res.status(400).json({ success: false, message: "Password does not match!" });
        }


        user.password = req.body.newPassword;
        await user.save();

        sendToken(res, user, 200, "Password updated successfully");
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


//Update User Profile (user)
exports.updateProfile = async (req, res) => {

    try {

        const avatar = req.files.avatar.tempFilePath;

        const updateData = {
            name: req.body.name,
            dob: req.body.dob,
            phone: Number(req.body.phone),
        };

        if (avatar) {

            const user = await User.findById(req.user.id);

            await cloudinary.v2.uploader.destroy(user.avatar.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                folder: "users",
                width: 150,
                crop: "scale",
            });
            fs.rmSync("./tmp", { recursive: true });
            updateData.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }

        const updateUser = await User.findByIdAndUpdate(req.user._id, updateData, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        })

        res.status(200).json({
            success: true
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


//Update Email (user)
exports.updateRequestUsername = async (req, res, next) => {

    try {
        const otp = Math.floor(Math.random() * 1000000);

        const user = await User.findById(req.user._id);
        user.updateUserOTP = otp;
        user.updateUserOTP_expiry = new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000);
        await user.save();
        try {
            await sendMail(req.body.email, "Verify Your Username", `Your OTP is ${otp}`);

            const newEmail = user.getEmailToken(req.body.email)

            const options = {
                httpOnly: true,
                expires: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000)
            };

            res.status(200).cookie("newEmail", newEmail, options).json({
                success: true,
                user
            });
        } catch (error) {
            user.updateUserOTP = undefined;
            user.updateUserOTP_expiry = undefined;
            await user.save();

            res.status(403).cookie("newEmail", null, { expires: new Date(Date.now()) }).json({
                success: false,
                message: error.message,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.updateUsername = async (req, res, next) => {
    try {
        const { newEmail } = req.cookies;

        if (!newEmail) {
            return res.status(401).json({
                success: false,
                message: "email invalid"
            });
        }
        const decoded = jwt.verify(newEmail, process.env.JWT_SECRET);

        const otp = Number(req.body.updateUserOTP);

        const user = await User.findById(req.user._id);

        if (user.updateUserOTP !== otp || user.updateUserOTP_expiry < Date.now()) {
            return res.status(401).json({ success: false, message: "OTP is invalid or has been expired" });
        }

        user.updateUserOTP = null;
        user.updateUserOTP_expiry = null;
        user.email = decoded.email;

        await user.save();

        sendToken(res, user, 200, "Username updated successfully!");
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};



//Forgot Password========
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Username does not registered yet" });
        }
        if (!user.verified) {
            return res.status(403).json({ success: false, message: "Please verify your account first" })
        }
        // Get Reset Password Token
        const resetToken = crypto.randomBytes(30).toString("hex");

        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpire = new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000);

        await user.save({ validateBeforeSave: false });

        // const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
        const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;
        const message = `Your password reset token is : \n\n ${resetPasswordUrl} \n\n if you have not requested this email then, please ignore it`

        try {
            await sendMail(user.email, "Your Account Password Reset", message);

            res.status(200).json({
                success: true,
                message: `Email sent to ${user.email} successfully`,
            })

        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(400).json({ success: false, message: err.message });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//Reset Password
exports.resetPassword = async (req, res, next) => {
    try {
        //creating token hash
        const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

        // find reset token in database
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Reset password token is invalid or has been expired" });
        }

        if (req.body.password !== req.body.confirmPassword) {
            return res.status(400).json({ success: false, message: "Password does not match" });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        sendToken(res, user, 200, "Password reset successfully!");

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
