const userModel=require("../models/users.model");
const jwt=require("jsonwebtoken");
const tokenBlacklistModel=require("../models/blackList.model");


async function authMiddleware(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(401).json({
            message:"Unauthorized access, token missing",
            status:"failed"
        })
    }
    const isBlacklisted=await tokenBlacklistModel.findOne({token});
    if(isBlacklisted){
        return res.status(401).json({
            message:"Unauthorized access, token is blacklisted"
        })
    }

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        const user=await userModel.findById(decoded.userId);
        req.user=user;
        return next();
    } catch(err){
        return res.status(401).json({
            message:"Unauthorized access, invalid token"
        })
    }
}

async function authSystemUserMiddleware(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(401).json({
            message:"Unauthorized access, token missing",
            status:"failed"
        })
    }
    const isBlacklisted=await tokenBlacklistModel.findOne({token});
    if(isBlacklisted){
        return res.status(401).json({
            message:"Unauthorized access, token is blacklisted"
        })
    }

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        const user=await userModel.findById(decoded.userId).select("+systemUser");
        if(!user.systemUser){
            return res.status(403).json({
                message:"Forbidden access, system user only"
            })
        }
        req.user=user;
        return next();
    }
    catch(err){
        return res.status(401).json({
            message:"Unauthorized access, invalid token"
        })
    }
}


module.exports={
    authMiddleware,
    authSystemUserMiddleware
};