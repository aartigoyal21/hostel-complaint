const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const session = require("express-session");

app.use(express.urlencoded({ extended: true }));

app.set("view engine","ejs");
app.set("views", path.join(__dirname,"views"));

app.use(express.static("public"));

app.use(session({
    secret:"secretkey",
    resave:false,
    saveUninitialized:true
}));

app.get("/", (req,res)=>{
    res.redirect("/signup");
});

app.get("/signup",(req,res)=>{
    res.render("signup");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/home",(req,res)=>{

    if(!req.session.user){
        return res.redirect("/login");
    }

    res.render("index",{user:req.session.user});
});

app.post("/signup",(req,res)=>{

    const {name,roll,email,password} = req.body;

    const users = JSON.parse(fs.readFileSync("users.json"));

    users.push({name,roll,email,password});

    fs.writeFileSync("users.json",JSON.stringify(users,null,2));

    res.redirect("/login");

});

app.post("/login",(req,res)=>{

    const {email,password} = req.body;

    const users = JSON.parse(fs.readFileSync("users.json"));

    const user = users.find(u => u.email === email && u.password === password);

  if(user){

    req.session.user = user.name;

    res.redirect("/home");

}else{

        res.send("Invalid Login");

    }

});

app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.redirect("/login");
});


app.get("/register",(req,res)=>{

    if(!req.session.user){
        return res.redirect("/login");
    }

    res.render("register");

});


app.post("/submit-complaint",(req,res)=>{

    const { name, room, email, category, description } = req.body;

    console.log("Complaint Received:");
    console.log(name, room, email, category, description);

    res.send("Complaint Submitted Successfully!");

});


app.listen(3000,()=>{
    console.log("Server running on http://localhost:3000");
});