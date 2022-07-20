// https://secret-diary-2566.herokuapp.com/

//requiring modules
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require('mongoose');
const session = require('express-session');

const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose");
const { authenticate } = require("passport");

//creating express app
const app = express();

// using modules in app
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// session
app.use(session({
    secret: "Our Little secret.",
    resave: false,
    saveUninitialized: false
}));
//passport initializing
app.use(passport.initialize());
app.use(passport.session());

//connecting to mongoDB database
mongoose.connect("mongodb+srv://admin-akhil:Akhil_nair1@cluster0.hsaivef.mongodb.net/diaryDB", { useNewUrlParser: true });


// User schema 
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String
});

// using passportLocalMongoose plugin
userSchema.plugin(passportLocalMongoose);

// Creating model of userSchema
const User = new mongoose.model("User", userSchema);

// passport
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Function for giving today's date in "DD-MM-YYYY" format
function today() {
    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();

    let t = (date + "-" + month + "-" + year);
    return t;
}

// Item Schema -> How the posts(writings of users) are saved in database
const itemSchema = {
    title: String,
    date: String,
    content: String
};
// Creating a odel of item Schema
const Item = mongoose.model("Item", itemSchema);

// Default Items For Checking the working of the app
const item1 = new Item({
    title: "Write About Anything",
    date: "19-10-2022",
    content: "Click On + button.Don't be afraid.\nYour secrets are safe with us.\nEnjoy Writing :)"
});
const item2 = new Item({
    title: "Welcome To Secret Diary",
    date: "18-11-2022",
    content: "The 3 posts are created by us.\nYou can delete them if you want."
});
const item3 = new Item({
    title: "Something About App",
    date: "1-1-2022",
    content: "If you want to Update your post ,just edit the post by writing what you want inplace of what was wrong and then click update.\nClick on 'My Secrets' on the navbar to go to your diary.\n\nYour post will only be saved if it has both title and content in it\n\nPlease Keep your posts short ,max length of 600 letters.\nThankyou.\nEnjoy Writing :)"
});

const defaultItems = [item1, item2, item3];


// Diary Schema -> users id(loggedIn user id) And the araay of posts of type itemSchema
// This is how the data is stored in the database
const diarySchema = {
    id: String,
    items: [itemSchema]
};

// Creating model of diarySchema
const List = mongoose.model("List", diarySchema);

const dateString = today();


app.get("/", function (req, res) {
    res.render("login2");
});
app.get("/register", function (req, res) {
    res.render("register");
});
app.post("/register", function (req, res) {
    // Register new user 
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            // if registered -> authenicate and login user and redirect to writing section
            passport.authenticate("local")(req, res, function () {
                res.render("write", { date: dateString });
            });
        }
    });

});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        passport: req.body.password
    });
    // Login user if credentials entered are correct
    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/");
        } else {
            passport.authenticate("local", { failureRedirect: '/' })(req, res, function () {
                res.render("write", { date: dateString });
 
            });
        }
    })
});

app.get("/write", function (req, res) {
    // land to writing section (write) if user is authenticated
    if (req.isAuthenticated()) {
        res.render("write", { date: dateString });
    } else {
        res.redirect("/");

    }
})



// Direct to the diary page where the posts of user is displayed
app.get("/diary", function (req, res) {

    // allow only iss user is authenticated
    if (req.isAuthenticated()){
    const diaryId = req.user.id;

    List.findOne({ id: diaryId }, function (err, foundList) {
        if (!err) {
            if (!foundList) {
                const list = new List({
                    id: diaryId,
                    items: defaultItems
                });
                list.save();
                res.redirect("/diary");
            } else {
                res.render("diary", { newListItems: foundList.items });
            }
        }
    })
    }else{
        res.redirect("/");
    }

});
app.post("/write", function (req, res) {
    const diaryId = req.user.id;
    const listTitle = req.body.title;
    const itemDate = today();
    const itemText = req.body.text;;
    if(itemText.length!=0 && listTitle.length!=0){

    const item = new Item({
        title: listTitle,
        date: itemDate,
        content: itemText
    });

    List.findOne({ id: diaryId }, function (err, foundList) {
        if (!err) {
            if (!foundList) {
                // console.log("Empty");
                const list = new List({
                    id: diaryId,
                    items: defaultItems
                });
                list.items.push(item);
                list.save();

            } else {
                foundList.items.push(item);
                foundList.save();
            }
            res.redirect("/diary");
            // location.reload();

        } else {
            console.log(err);
        }
    })
    }else{
        res.redirect("/write");
    }
});
// viewing the post of the user on a new page 
app.get("/:postName", function (req, res) {
    // only allow if user is authenticated 
    if(req.isAuthenticated()){
    const requestedTitle = _.lowerCase(req.params.postName);
    const diaryId = req.user.id;  //the id of the logged in user
    List.findOne({ id: diaryId }, function (err, foundList) {
        if (!err) {
            if (foundList) {
                foundList.items.forEach(function (diary) {
                    const storedTitle = _.lowerCase(diary.title);
                    if (storedTitle === requestedTitle) {
                        res.render("post", {
                            titleName: diary.title,
                            content: diary.content,
                            date: diary.date,
                            diaryId:diary._id
                        });
                    }
                });
            } else {
                console.log("Empty");
            }
        } else {
            console.log(err);
        }
    });
    }else{
        res.redirect("/");
    }
});

// Delete/Update route 
app.post("/delete",function(req,res){

    const postContent=req.body.text;
    const buttonPressed = req.body.btn;
    const diaryId = req.body.diaryId;
    console.log(req.body);

    List.findOne({id:req.user.id}).then(foundList=>{
        
            if(foundList){
                console.log("---->",diaryId);
                console.log("&&&&&")
                for( var i = 0; i < foundList.items.length; i++){ 
                    console.log(foundList.items[i]._id);
                    if(diaryId === foundList.items[i]._id.toString()){
                        if(buttonPressed === "1"){ //delete post
                            foundList.items.splice(i, 1); 
                        }
                        else{ //update post
                            foundList.items[i].content = postContent;
                        }
                        break;
                    }
                    
                }


                List.updateOne({id:req.user.id},foundList).catch(err=>{console.log(err)});
                
            }
        }
    )
    // Once the action is performed redirect to diary page 
    res.redirect("/diary");  
// location.reload();
});



// logOut user 
app.post("/logout", function (req, res) {
    // Using passport function 
    req.logOut(function (err) {
        if (err) {
            console.log(err);
        } else {
            // after logging out the user redirect to logIn page 
            res.redirect("/");
        }
    });
});



// Server is ready to listen 
let port = process.env.PORT;
if(port == null || port ==""){
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started Successfully");
});