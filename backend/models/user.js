const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Your Name"],
        minLength: [4, "Name should have more than 4 character"],
        maxLength: [30, "Name can't exceed 30 characters'"],
        trim: true,
        lowercase: true,
        validate: [validator.isAlpha, "Only alpha characters are allowed"]
    },
    email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true,
        validate: [validator.isEmail, "Please enter e valid email"],
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Please Enter Your Password"],
        // validate: [validator.isStrongPassword,"Provide a strong password"],
        select: false,
        trim: true
    },
    // age: {
    //     type: Number,
    //     // required: [true, "Please Enter Your age"],
    //     validate: {
    //         validator: (v) => v >= 18,
    //         message: (props) => `${props.value} is less than 18 year`
    //     }
    // },
    dob: {
        type: String,
        required: [true, "Please Enter Your Date of Birth"],
        validate: [validator.isDate, "Enter a valid date"],
    },
    phone: {
        type: String,
        unique: true,
        validate: [validator.isMobilePhone, "Enter a valid number"],
        required: [true, "Please Enter Your Phone number"],
        
    },
    // avatar: { //ei ta k array akare rakha hoi nai krn ek ta user er jnno ek ta image ba avatar takbe
    //     public_id: {
    //         type: String,
    //         required: true,
    //     },
    //     url: {
    //         type: String,
    //         required: true
    //     }
    // },
    role: {
        type: String,
        default: 'user',
        lowercase: true,
        // enum: ['admin', 'user', 'member'],
        enum: {
            values: ['admin', 'user', 'member','account'],
            message: (props) => `${props.value} is not supported`
        },
        required: true
    },
    verified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    otp: Number,
    otp_expiry: Date,

    updateUserOTP: Number,
    updateUserOTP_expiry: Date,

    // createdAt: {
    //     type: Date,
    //     immutable: true,//means ei ta kokonu change kora jabe na
    //     default: Date.now,
    // },
    // updatedAt: {
    //     type: Date,
    //     default: () => Date.now(),
    // },
},
    {
        timestamps: true,//ei ta time k tract rakbe. automatic createdAt updatedAt ei gula generate hobe
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    // if (this.isModified("email") && this.updateUserOTP === null && this.updateUserOTP_expiry === null) {
    //     return next();
    // }
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt);
    next();
})


userSchema.methods = {
    getJWTToken: function () {
        return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
        });
    },
    getEmailToken: function (email) {
        return jwt.sign({ email: email }, process.env.JWT_SECRET, {
            expiresIn: process.env.OTP_EXPIRE * 60 * 1000,
        });
    },
    comparePassword: async function (password) {
        return await bcrypt.compare(password, this.password)
    }
}

// userSchema.methods.getJWTToken = function () {
//     return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
//     });
// };

// userSchema.methods.comparePassword = async function (password) {
//     return await bcrypt.compare(password, this.password)
// }

userSchema.index({ otp_expiry: 1 }, { expireAfterSeconds: 0 });

// userSchema.virtual("replaceEmail").get(function(){
//     return this.email
// })

exports.User = mongoose.model('User', userSchema);