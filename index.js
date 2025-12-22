const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const app = express();

// Firebase Admin Setup
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_SERVICE_KEY) {
  const decoded = Buffer.from(
    process.env.FIREBASE_SERVICE_KEY,
    "base64"
  ).toString("utf8");
  serviceAccount = JSON.parse(decoded);
} else {
  try {
    serviceAccount = require("./smart-deals-firebase-admin-key.json");
  } catch (error) {
    console.error("No Firebase credentials found");
  }
}

// Initialize Firebase Admin only once
if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logging info");
  next();
};

const verifyFireBaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

const verifyJWTToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }

    req.token_email = decoded.email;
    next();
  });
};

const uri = process.env.MONGO_URI;

// MongoDB Client
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  const db = client.db("smart_db");

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

app.get("/", (req, res) => {
  res.send("f society");
});

// JWT related APIs
app.post("/getToken", async (req, res) => {
  try {
    const loggedUser = req.body;
    const token = jwt.sign(
      { email: loggedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.send({ token: token });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).send({ error: "Failed to generate token" });
  }
});

// Users API
app.get("/users", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");
    const cursor = usersCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ error: "Failed to fetch users" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");
    const newUser = req.body;

    const existingUser = await usersCollection.findOne({
      email: newUser.email,
    });

    if (existingUser) {
      return res.send({ message: "User already exists", user: existingUser });
    }

    const result = await usersCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create user" });
  }
});

// Products API
app.get("/products", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const email = req.query.email;
    const query = {};
    if (email) {
      query.email = email;
    }
    const cursor = productsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Failed to fetch products" });
  }
});

app.get("/recent-products", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching recent products:", error);
    res.status(500).send({ error: "Failed to fetch recent products" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await productsCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send({ error: "Failed to fetch product" });
  }
});

app.post("/products", verifyFireBaseToken, async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const newProduct = req.body;
    const result = await productsCollection.insertOne(newProduct);
    res.send(result);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).send({ error: "Failed to create product" });
  }
});

app.patch("/products/:id", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const id = req.params.id;
    const updatedProduct = req.body;
    const query = { _id: new ObjectId(id) };
    const update = {
      $set: { name: updatedProduct.name, price: updatedProduct.price },
    };
    const result = await productsCollection.updateOne(query, update);
    res.send(result);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ error: "Failed to update product" });
  }
});

app.delete("/products/:id", verifyFireBaseToken, async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection("products");
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await productsCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send({ error: "Failed to delete product" });
  }
});

// Bids related API
app.get("/bids", verifyFireBaseToken, async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const bidsCollection = db.collection("bids");
    const productsCollection = db.collection("products");

    const email = req.query.email;
    const query = {};

    if (email) {
      query.buyer_email = email;
      if (email !== req.token_email) {
        return res.status(403).send({ message: "forbidden access!" });
      }
    }

    const cursor = bidsCollection.find(query);
    const bids = await cursor.toArray();

    const bidsWithProducts = await Promise.all(
      bids.map(async (bid) => {
        const product = await productsCollection.findOne({
          _id: new ObjectId(bid.product),
        });

        return {
          ...bid,
          product_details: product,
        };
      })
    );

    res.send(bidsWithProducts);
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).send({ error: "Failed to fetch bids" });
  }
});

app.get("/products/bids/:productId", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const bidsCollection = db.collection("bids");
    const productId = req.params.productId;
    const query = { product: productId };
    const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching product bids:", error);
    res.status(500).send({ error: "Failed to fetch product bids" });
  }
});

app.post("/bids", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const bidsCollection = db.collection("bids");
    const newBid = req.body;
    const result = await bidsCollection.insertOne(newBid);
    res.send(result);
  } catch (error) {
    console.error("Error creating bid:", error);
    res.status(500).send({ error: "Failed to create bid" });
  }
});

app.patch("/bids/:id", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const bidsCollection = db.collection("bids");
    const id = req.params.id;
    const updatedBid = req.body;
    const query = { _id: new ObjectId(id) };
    const update = {
      $set: {
        bid_name: updatedBid.buyer_name,
        bid_price: updatedBid.bid_price,
      },
    };
    const result = await bidsCollection.updateOne(query, update);
    res.send(result);
  } catch (error) {
    console.error("Error updating bid:", error);
    res.status(500).send({ error: "Failed to update bid" });
  }
});

app.delete("/bids/:id", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const bidsCollection = db.collection("bids");
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await bidsCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error("Error deleting bid:", error);
    res.status(500).send({ error: "Failed to delete bid" });
  }
});

// For local development
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 5000;
  app.listen(port, async () => {
    await connectToDatabase();
    console.log("smart server is running on port: ", port);
  });
}

// Export for Vercel
module.exports = app;
