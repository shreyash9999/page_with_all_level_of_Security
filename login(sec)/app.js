//jshint esversion:6
//required modules
const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')



app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

//imp to place the code here
//also required to have all 3 as we use session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}))

//ask app to use passport and session
app.use(passport.initialize());
app.use(passport.session());


// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


//connecting mongoDB
mongoose.connect("mongodb://127.0.0.1:27017/Auth",{UseNewUrlParser:true}).then(()=>{
    console.log("connnect success");
}).catch((err)=>{
    console.error(err);
});


//making the model
const userSchema = new mongoose.Schema({
    email:String,
    password: String,
    googleId: String,
    secret: String
});

//implementing passport-local-mongoose as plugin in tge mongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//initializing the module
const User = new mongoose.model("User",userSchema);


//place is imp
//asking passport to use staratergy 
passport.use(User.createStrategy());


//askig passport to encrypt
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// passport.serializeUser(function(user, cb) {
//     cb(null,user.id)
// });
  
// passport.deserializeUser(function(id, cb) {
//     User.findById(id).then((err,user)=>{
//         cb(err,user);
// });
// });

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
 

//imp place
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//home page
app.get("/", function(req, res) {
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google",{ scope: ["profile"] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    }); 

//login pg
app.get("/login", function(req, res) {
    res.render("login");
});


//register pg
app.get("/register",(req, res)=> {
    res.render("register");
});

//secets pg checking is already login or not 
app.get("/secrets",(req, res)=> {
    User.find({"secret":{$ne:null}}).then((founduser)=>{res.render("secrets",{usersWithSecrets: founduser})

    }).catch((err)=>{console.error(err)});
});



//registring the user
app.post("/register", (req, res)=> {
    User.register({
        username: req.body.username},req.body.password,(err,user)=>{
            if(err){
                console.error(err)
                res.redirect("/register")}
            else{
                passport.authenticate("local")(req,res,()=>{
                    res.redirect("/secrets");
                });

            }
            
        })
});


//login in the user if has regester
app.post("/login",(req,res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });


    req.login(user,(err)=>{
        if(err){
            console.error(err);
        }else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets");
            });
        }
    });
});


app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",(req,res)=>{
    const submitSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id).then((foundUser)=>{
                foundUser.secret = submitSecret;
                foundUser.save().then(()=>{
                    res.redirect("/secrets");
                });
    }).catch((err)=>{
        console.error(err);
    });
});

//logout of the page and delete the cooki
app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        console.error(err);
    });
    res.redirect("/");
});


//heee u know it haaa!!!
app.listen(3000, function() {
    console.log("server up on 3000");
});