const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");

// const serviceAccount = require("./smart-deals-firebase-admin-key.json");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Use the environment variable on the live site
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Use the local file on your computer
  serviceAccount = require("./smart-deals-firebase-admin-key.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logging info");
  next();
};

const verifyFireBaseToken = async (req, res, next) => {
  // console.log(" in the verify middleware", req.headers.authorization);
  // console.log(" inside the middleware", req.headers);

  const authorization = req.headers.authorization;

  if (!authorization) {
    // do not allow to go
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    // do not allow to go
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    // console.log("after token validation: ", userInfo);

    next();
  } catch (error) {
    // console.log("Invalid token!", error);

    return res.status(401).send({ message: "unauthorized access" });
  }
};

const verifyJWTToken = (req, res, next) => {
  // console.log("In middleware", req.headers);

  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = req.headers.authorization.split(" ")[1];
  // console.log(token);

  if (!token) {
    // do not allow to go
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }

    // console.log("after decoded: ", decoded);
    req.token_email = decoded.email;

    next();
  });
};

const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("f society");
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("smart_db");
    const productsCollection = database.collection("products");
    const bidsCollection = database.collection("bids");
    const usersCollection = database.collection("users");

    console.log("✅ Connected to MongoDB!");

    // jwt related apis
    app.post("/getToken", async (req, res) => {
      const loggedUser = req.body;

      const token = jwt.sign(
        { email: loggedUser.email },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      // console.log("Token generated for:", loggedUser.email);

      res.send({ token: token });
    });

    // users api
    app.get("/users", async (req, res) => {
      try {
        const cursor = usersCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const existingUser = await usersCollection.findOne({
        email: newUser.email,
      });

      if (existingUser) {
        return res.send({ message: "User already exists", user: existingUser });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // products api
    app.get("/products", async (req, res) => {
      //   const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(5).project({title: 1, price_min: 1, price_max: 1, image: 1});
      // console.log(req.query);
      // console.log("Query params:", JSON.stringify(req.query, null, 2));
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/recent-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.post("/products", verifyFireBaseToken, async (req, res) => {
      // console.log("headers in the post: ", req.headers);
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: { name: updatedProduct.name, price: updatedProduct.price },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/products/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // bids related api with firebase token verify
    // app.get("/bids", verifyJWTToken, async (req, res) => {
    //   const email = req.query.email;
    //   const query = {};

    //   if (email) {
    //     query.buyer_email = email;
    //   }

    //   // verify user have access to see this data
    //   if (email !== req.token_email) {
    //     return res.status(403).send({message: "forbidden access!"})
    //   }

    //   const cursor = bidsCollection.find(query);
    //   const bids = await cursor.toArray();

    //   const bidsWithProducts = await Promise.all(
    //     bids.map(async (bid) => {
    //       const product = await productsCollection.findOne({
    //         _id: new ObjectId(bid.product),
    //       });

    //       return {
    //         ...bid,
    //         product_details: product,
    //       };
    //     })
    //   );

    //   res.send(bidsWithProducts);
    // });

    app.get("/bids", verifyFireBaseToken, async (req, res) => {
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
    });

    app.get("/products/bids/:productId", async (req, res) => {
      const productId = req.params.productId;
      const query = { product: productId };
      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get(
    //   "/products/bids/:productId",
    //   verifyFireBaseToken,
    //   async (req, res) => {
    //     const productId = req.params.productId;
    //     const query = { product: productId };
    //     const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   }
    // );

    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.patch("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBid = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          bid_name: updatedBid.buyer_name,
          bid_price: updatedBid.bid_price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("smart server is running on port: ", port);
});
