require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const upload = require("./middleware/uploadMiddleware");
const authMiddleware = require("./middleware/auth");
const User = require("./models/User");
const Complaint = require("./models/Complaint");
//=========================================================================
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
//=========================================================================
const app = express();

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

//=========================================================================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5002/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: "", // google login mein password nahi hota
        role: "student",
        profilePic: profile.photos[0].value
      });

      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
//========================================================================  
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
//=========================================================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

//=========================================================================
app.use(session({
  secret: "googleloginsecret",
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
//=========================================================================

// Home
app.get("/", (req, res) => {
  res.render("index");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Signup page
app.get("/signup", (req, res) => {
  res.render("signup");
});

//=========================================================================
// Google login
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {

    const userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profilePic: req.user.profilePic || "",
    };

    const token = jwt.sign(userData, process.env.JWT_SECRET || "mysecretkey", {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });

    res.redirect("/dashboard");
  }
);
//================================= ============================

// Signup save to MongoDB
app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.send("User already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      hostelBlock: req.body.hostelBlock,
      roomNo: req.body.roomNo,
      profilePic: req.file ? "/uploads/" + req.file.filename : "",
      role: "student",
    });

    await newUser.save();

    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.send("Error saving user to MongoDB");
  }
});

// Real login with MongoDB + bcrypt + JWT
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ email });

    if (!foundUser) {
      return res.send("User not found");
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);

    if (!isMatch) {
      return res.send("Invalid password");
    }

    const userData = {
      id: foundUser._id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      profilePic: foundUser.profilePic || "",
    };

    const token = jwt.sign(userData, process.env.JWT_SECRET || "mysecretkey", {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    res.send("Login error");
  }
});

// Protected dashboard
app.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const userData = {
      name: user?.name || req.user.name || "Student",
      profilePic: user?.profilePic || req.user.profilePic || "",
    };

    res.render("dashboard", { user: userData });
  } catch (error) {
    console.log(error);
    res.send("Dashboard error");
  }
});
// Complaint form page
app.get("/complaint/new", authMiddleware, (req, res) => {
  res.render("complaintForm");
});

// Admin dashboard
app.get("/admin/dashboard", authMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("user")
      .sort({ createdAt: -1 });

    res.render("adminDashboard", { complaints });
  } catch (error) {
    console.log(error);
    res.send("Error loading admin dashboard");
  }
});

// Complaint form
app.post("/complaint/new", authMiddleware, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const newComplaint = new Complaint({
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      roomNo: req.body.roomNo,
      status: "Pending",
      user: req.user.id
    });

    await newComplaint.save();

    console.log("Complaint saved successfully");
    res.redirect("/complaints/my");
  } catch (err) {
    console.log("Complaint save error:", err);
    res.send("Error saving complaint");
  }
});
// My complaints from MongoDB
app.get("/complaints/my", authMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.render("myComplaints", { complaints });
  } catch (error) {
    console.log(error);
    res.send("Error loading complaints");
  }
});

// Update complaint status
app.post("/admin/complaint/:id/status", authMiddleware, async (req, res) => {
  try {
    await Complaint.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(error);
    res.send("Error updating status");
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// 404
app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
