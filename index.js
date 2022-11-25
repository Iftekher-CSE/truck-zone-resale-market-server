const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

// mongodb connection

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function run() {
    try {
        // Collections
        const categoriesCollection = client.db("truckZone").collection("truckCategory");
        const trucksCollection = client.db("truckZone").collection("allTrucks");
        const usersCollection = client.db("truckZone").collection("users");
        const bookingsCollection = client.db("truckZone").collection("bookings");

        // add new user, update old user, provide jwt
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = usersCollection.updateOne(filter, updateDoc, options);

            // provide Jwt
            const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN, {
                expiresIn: "7d",
            });
            res.send({ result, token });
        });

        // get all truck cat
        app.get("/truck-categories", async (req, res) => {
            const result = await categoriesCollection.find({}).toArray();
            res.send(result);
        });

        // get products based on cat
        app.get("/trucks/:cat", async (req, res) => {
            const cat = req.params.cat;
            const query = { catName: cat };
            const trucks = await trucksCollection.find(query).toArray();
            res.send(trucks);
        });

        //get truck categories name
        app.get("/categoryName", async (req, res) => {
            const categoryName = await categoriesCollection.find({}).project({ catName: 1 }).toArray();
            res.send(categoryName);
        });

        // post a truck to database
        app.post("/trucks", async (req, res) => {
            const truck = req.body;
            const result = await trucksCollection.insertOne(truck);
            res.send(result);
        });

        // get all users based on user type query
        app.get("/allUsers", async (req, res) => {
            const accountType = req.query.accountType;
            const users = await usersCollection.find({ accountType: accountType }).toArray();
            res.send(users);
        });

        // make admin
        app.put("/users/make-admin/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    admin: true,
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);

            res.send(result);
        });

        // get a users based on email query
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            res.send(user);
        });

        // delete a user from db
        app.delete("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.deleteOne({ email: email });
            res.send(result);
        });

        // make seller verified
        app.put("/user/admin/verify/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    sellerVerified: true,
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // post a booking
        app.post("/bookings", async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        // get booking based on email query
        app.get("/bookings/:email", async (req, res) => {
            const email = req.params.email;
            const result = await bookingsCollection.find({ custEmail: email }).toArray();
            res.send(result);
        });
    } finally {
    }
}

run().catch(err => console.log(err));

app.get("/", (req, res) => {
    res.send("Truck Zone Server is running");
});

app.listen(port, () => {
    console.log(`Truck Zone Server is running on ${port}`);
});
