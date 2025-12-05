require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());

// Logger middleware (required for coursework)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

let db, lessonsCollection, ordersCollection;

async function start() {
  const client = new MongoClient(process.env.MONGODB_URI);

  await client.connect();
  console.log("Connected to MongoDB");

  db = client.db(process.env.DB_NAME);
  lessonsCollection = db.collection("lesson");
  ordersCollection = db.collection("order");

  // 2. Start Express server
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

start();

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// GET /lessons (required)
app.get("/lessons", async (req, res) => {
  const lessons = await lessonsCollection.find().toArray();
  res.json(lessons);
});

// POST /orders - create a new order
// app.post("/orders", async (req, res) => {
//   try {
//     const { name, phone, lessons } = req.body;

//     if (!name || !phone || !lessons || !Array.isArray(lessons)) {
//       return res.status(400).json({ error: "Invalid order data" });
//     }

//     const order = {
//       name,
//       phone,
//       lessons,
//       createdAt: new Date()
//     };

//     const result = await ordersCollection.insertOne(order);

//     res.json({
//       success: true,
//       message: "Order placed successfully",
//       orderId: result.insertedId
//     });

//   } catch (error) {
//     console.error("Error saving order:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// PUT /lessons/:id - update a lesson
app.put("/lessons/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;
    const updatedData = req.body;

    const result = await lessonsCollection.updateOne(
      { _id: new ObjectId(lessonId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({
      success: true,
      message: "Lesson updated",
      updated: updatedData
    });

  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /search?q=term - search lessons
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    const results = await lessonsCollection.find({
      $or: [
        { subject: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { price: { $regex: q, $options: "i" } },
        { spaces: { $regex: q, $options: "i" } }
      ]
    }).toArray();

    res.json(results);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

