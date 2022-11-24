const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { query } = require("express");
require("dotenv").config();

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

        // get all truck cat
        app.get("/truck-categories", async (req, res) => {
            const result = await categoriesCollection.find({}).toArray();
            res.send(result);
        });

        // get products based on cat
        app.get("/trucks/:id", async (req, res) => {
            const id = req.params.id;
            const query = { catName: id };
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
