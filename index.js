const port = process.env.PORT || 5000
const { body, validationResult } = require('express-validator'); // Validate isEmail, isPassword is in correct format
const express = require('express');                              // Import Express
const mongoose = require('mongoose');                            // Import Moongoes For database connectivity
const bcrypt = require('bcryptjs');                              // Encrypt the password 
const jwt = require('jsonwebtoken');                             // Generate the token for the browser
const app = express();                                           // Import express methods                                              // Secure the port no. for backend
var cors = require('cors')

app.use(express.json());                                         // Give Support of JSON to get & post
app.use(cors());

// MiddleWare
const fetchuser = async (req, res, next) => {

    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using a valid token" })
    }
    try {
        const data = jwt.verify(token, 'secret_dev')
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({ errors: "Please authenticate using a valid token" })
    }

}

//Create a Connection to MongoDB database 
mongoose.connect("mongodb+srv://dev:33858627@job-portal.kkg1cqf.mongodb.net/job-portal");

// Schema for creating user model
const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Schema for creating Jobs model
const Jobs = mongoose.model('Jobs', {
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: "All"
    },
    role: {
        type: String,
        default: "General"
    },
    date: {
        type: Date,
        default: Date.now
    },
    avilable: {
        type: Boolean,
        default: true
    }

})

// Schema for creating Jobs model
const ApplyJob = mongoose.model('applyJob', {
    id: {
        type: String,
        required: true
    }
    , username: {
        type: String,
        required: true
    }
    , email: {
        type: String,
        required: true
    }
    , number: {
        type: String,
        required: true
    }
    , role: {
        type: String,
        required: true
    }
    , location: {
        type: String,
        required: true
    }
})


// Route 1 : Create an endpoint at ip/ for checking connection to backend
app.all('/', (req, res) => {
    res.send('api working')

})

// Route 2 : Create an endpoint at ip/auth for regestring the user in data base & sending token
app.post('/signup',
    body('email').isEmail(),                                    // checks email is valid or not
    body('name').isLength({ min: 2 }),                          // check the length of name is more than 2 char or not
    body('password').isLength({ min: 8 }),                      // check the length of password is min8 char or not
    async (req, res) => {
        const errors = validationResult(req);
        let success = false;
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: success, errors: "Enter Valid email/password" });
        }
        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: success, errors: "existing user found with this email" });
        }
        const salt = bcrypt.genSaltSync(10);
        const hash = await bcrypt.hashSync(req.body.password, salt);
        const user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: hash
        });
        user.save().then(() => console.log("User Saved"));
        const data = {
            user: {
                id: user.id
            }
        }
        const token = jwt.sign(data, 'secret_dev');
        success = true;
        res.json({ success, token })
    })

// Route 3 : Create an endpoint at ip/login for login the user and giving token
app.post('/login', body('email').isEmail(), body('password').isLength({ min: 8 }), async (req, res) => {
    const errors = validationResult(req);
    let success = false;
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: "enter valid email/password" });
    }
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = await bcrypt.compare(req.body.password, user.password);
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            success = true;
            const token = jwt.sign(data, 'secret_dev');
            res.json({ success, token });
        }
        else {
            return res.status(400).json({ success: success, errors: "please try with correct email/password" })
        }
    }
    else {
        return res.status(400).json({ success: success, errors: "please try with correct email/password" })
    }

})

// Route 4 : Create an endpoint at ip/getUser details for finding user in database
app.post('/getuser', fetchuser, async (req, res) => {
    try {

        const userid = req.user.id;
        const user = await Users.findById(userid).select("-password");
        res.send(user);
    } catch (error) {
        console.log(error);
    }

})

// Route 5 : Create an endpoint at ip/addjobs for saving the jobs in database
app.post('/addjob', body('title', 'Enter a valid title').isLength({ min: 1 }), body('description', 'Enter a bigger description').isLength({ min: 2 }), async (req, res) => {

    //Check For Validation Error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, location, role } = req.body;
    const job = new Jobs({
        title,
        description,
        location,
        role
    });
    job.save().then(() => res.json({ "Success": "job saved" }));
})

// Route 6 : Create an endpoint at ip/addjobs for saving the jobs in database
app.post('/applyjob', async (req, res) => {

    try {
        const { id, username, email, number, role, location } = req.body;
        const applyjob = new ApplyJob({
            id, username, email, number, role, location
        });
        applyjob.save().then(() => res.json({ success: true,}));
    } catch (error) {
        return res.status(400).json({ success: false, errors: "please fill all info" })
    }

})


// Route 6 : Create an endpoint at ip/fetchalljobs for getting user jobs from database
app.get('/fetchalljobs', fetchuser, async (req, res) => {
    const jobs = await Jobs.find({ avilable: true });
    res.json(jobs)
})

// Print the current active port on console
app.listen(port, () => {
    console.log(`Job-Portal listening on port ${port}`)
})