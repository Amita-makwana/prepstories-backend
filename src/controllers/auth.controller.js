import passport from "passport";
import { generateToken } from "../utils/generateToken.js";

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"]
});

export const googleCallback = [
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);


    res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
       path: "/"
});
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    //   path: "/"
    // });

    const base = process.env.CLIENT_URL || "http://localhost:5173";
    const sep = base.includes("?") ? "&" : "?";
    res.redirect(`${base}${sep}login=success`);
  }
];

export const logout = (req, res) => {
  // res.clearCookie("token");
  res.clearCookie("token", {
  httpOnly: true,
  secure: true,
  sameSite: "none"
});
  res.json({ success: true, message: "Logged out successfully" });
};

export const getMe = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};
