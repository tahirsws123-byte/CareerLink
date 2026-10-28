import jwt from "jsonwebtoken";

const generateToken = (id, sessionId) => {
  return jwt.sign({ id, sid: sessionId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export default generateToken