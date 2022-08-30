const jwt = require('jsonwebtoken');
const {User} = require('../models/user');

exports.isAuth = async (req, res, next) => {
    try {
        const { token } = req.cookies;
   
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please Login First"
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



exports.isVerified = (req, res, next)  => {
        if (!req.user.verified) {
            return res.status(403).json({success: false, message:"Verify Your Account first"})
        }
        next(); 
}


exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {//...roles kore ei ta array howar por roles.includes function hocce.//upore req.user =await User.findById(decodedData.id) e sob data store kora hoice 
            return next(new ErrorHandler(`Role : ${req.user.role} does not allow to access this resource`, 403))
        }
        next();
    }
}