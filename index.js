const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const paymentCollection = client.db("truckZone").collection("payments");

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

        // get not sold products based on cat
        app.get("/trucks/:cat", async (req, res) => {
            const cat = req.params.cat;
            const query = { catName: cat, $or: [{ sold: null }, { sold: false }] };
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

        // make admin and !admin
        app.put("/users/make-admin/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const user = await usersCollection.findOne(filter);
            const updateDoc = {
                $set: {
                    admin: !user.admin,
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

        // make seller verified and !verified
        app.put("/user/admin/verify/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const user = await usersCollection.findOne(filter);
            const updatedDoc = {
                $set: {
                    sellerVerified: !user.sellerVerified,
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

        // post a payment info
        app.post("/payment", async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            // update status in booking collection and product collection
            const bookingId = payment.bookingId;
            const productId = payment.productId;
            const filterBooking = { _id: ObjectId(bookingId) };
            const filterProduct = { _id: ObjectId(productId) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: { sold: true, transactionId: payment.transactionId },
            };
            const resultBookingUpdate = await bookingsCollection.updateOne(filterBooking, updatedDoc, options);
            const resultProductUpdate = await trucksCollection.updateOne(filterProduct, updatedDoc, options);
            res.send(result);
        });

        // get booking based on email parameter
        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            const result = await bookingsCollection.find({ custEmail: email }).toArray();
            res.send(result);
        });

        // get a booking based on id query
        app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const result = await bookingsCollection.findOne({ _id: ObjectId(id) });
            res.send(result);
        });

        // create payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const price = req.body.price;
            console.log("price from payment intent:", price);
            const amount = parseFloat(price) * 100;

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    // "payment_method_types": ["card"],
                    payment_method_types: ["card"],
                });
                res.send({ clientSecret: paymentIntent.client_secret });
            } catch (err) {
                console.log(err);
            }
        });

        // get products based on email query
        app.get("/allTrucks/:email", async (req, res) => {
            const email = req.params.email;
            const result = await trucksCollection.find({ sellerEmail: email }).toArray();
            res.send(result);
        });

        // delete a product from db
        app.delete("/allTrucks/:id", async (req, res) => {
            const id = req.params.id;
            const result = await trucksCollection.deleteOne({ _id: ObjectId(id) });
            res.send(result);
        });

        // make product advertised and not advertised
        app.put("/allTrucks/advertised/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const product = await trucksCollection.findOne(filter);
            // console.log(isAdvertised);
            const updatedDoc = {
                $set: {
                    advertised: !product.advertised,
                },
            };
            const result = await trucksCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // make product reported and !reported
        app.put("/allTrucks/reported/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const product = await trucksCollection.findOne(filter);
            // console.log(isAdvertised);
            const updatedDoc = {
                $set: {
                    reported: !product.reported,
                },
            };
            const result = await trucksCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // get advertised products
        app.get("/allTruck-advertised", async (req, res) => {
            const result = await trucksCollection
                .find({ advertised: true, $or: [{ sold: null }, { sold: false }] })
                // .find({ advertised: true, sold: true })
                // .find({ advertised: true, sold: false })
                .toArray();
            res.send(result);
        });

        // get all reported products
        app.get("/allTruck-reported", async (req, res) => {
            const result = await trucksCollection.find({ reported: true }).toArray();
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
