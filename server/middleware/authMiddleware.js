import jwt from 'jsonwebtoken'
import User from '../models/User.js';

export const Protect = async (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message: "unauthorized, token missing"
            })
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");

        if(!user || user.accountStatus === "deactivated"){
            return res.status(401).json({
                message: "Account is unavailable",
            });
        }

        if (user.enforceTrackedSessions && !decoded.sid) {
            return res.status(401).json({ message: "Please sign in again to continue" });
        }

        if (decoded.sid && !user.securitySessions?.some((session) => session.sessionId === decoded.sid)) {
            return res.status(401).json({ message: "This session has been signed out" });
        }

        req.user = user;
        req.authSessionId = decoded.sid || "";
        req.user.currentSecuritySessionId = req.authSessionId;

        next();
    } catch {
        return res.status(401).json({
            message: "invalid token",
        })
    }
}
