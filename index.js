const express = require("express");
const session = require("express-session"); //for session
const MongoDBSession = require("connect-mongodb-session")(session); //package to store session in mongodb
const app = express();
const path = require("path");
const User = require("./models/User");
const bcrpyt = require("bcrypt");

const mongoURI = "mongodb://127.0.0.1:27017/SessionDemo";

const mongoose = require("mongoose");
mongoose.connect(mongoURI).then(() => {
  console.log("DB Connection success");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

//connect-mongodb-session config -- will get passes to session middleware
const store = new MongoDBSession({
  uri: mongoURI,
  collection: "mySessionDemo",
});

app.use(
  session({
    secret: "key that will sign",
    resave: false, //for not creating a new session for every request
    saveUninitialized: false,
    store: store,
  })
);

const isAuth = (req, res, next) => {
  if (req.session.isAuth) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  //   req.session.isAuth = true;
  //   console.log(req.session);
  //   console.log(req.session.id);
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res.status(409).redirect("/register");
    }

    const hashedPassword = await bcrpyt.hash(password, 8);
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).redirect("/login");
  } catch (error) {
    res.status(500).send({ message: "Server Error" });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).redirect("/login");
  }
  const isMatch = await bcrpyt.compare(password, user.password);
  if (!isMatch) {
    return res.redirect("/login");
  }
  req.session.isAuth = true;
  res.redirect("/dashboard");
});

app.get("/dashboard", isAuth, (req, res) => {
  res.render("dashboard");
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

app.listen(3000, () => {
  console.log("Server running at 3000");
});
