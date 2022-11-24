const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
