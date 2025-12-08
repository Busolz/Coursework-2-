require("dotenv").config(); // load environment variables from .env in development
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json()); // parse JSON bodies
app.use(cors());        // enable CORS (allow frontend on GitHub Pages to call backend)

// Logger middleware (required by coursework) — prints method + url for each request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// === STATIC FILES MIDDLEWARE (required by handbook)
// Serve images from a "public/images" folder in your backend repo.
// Example: a lesson document with image: "/images/math.jpg" will be served.
// Make sure you push the public/images folder to the backend repo if you use this.
app.use('/images', express.static('public/images')); 
// If you host images in frontend repo, you don't need this. But handbook asks for static file middleware in backend.

let db, lessonsCollection, ordersCollection;

async function start() {
  // Create MongoDB client from URI in env
  const client = new MongoClient(process.env.MONGODB_URI);

  // Connect to Atlas
  await client.connect();
  console.log("Connected to MongoDB");

  // Select DB name from env
  db = client.db(process.env.DB_NAME); 
  // Collections required by coursework: lesson and order
  lessonsCollection = db.collection("lesson");
  ordersCollection = db.collection("order");

  // Start Express server on the provided PORT
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

start();

// Test route to confirm server is alive
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// GET /lessons (return all lessons)
// This returns the documents exactly as stored (including image or spaces fields).
app.get("/lessons", async (req, res) => {
  const lessons = await lessonsCollection.find().toArray();
  res.json(lessons);
});

// POST /orders - create a new order
app.post("/orders", async (req, res) => {
  try {
    const { name, phone, lessons } = req.body;

    // Basic validation: check required fields
    if (!name || !phone || !lessons || !Array.isArray(lessons)) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const order = {
      name,
      phone,
      lessons,        // array of lesson ids (strings)
      createdAt: new Date()
    };

    const result = await ordersCollection.insertOne(order);

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: result.insertedId
    });

  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /lessons/:id - update a lesson's fields (e.g., spaces)
app.put("/lessons/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;
    const updatedData = req.body; // expects an object like { spaces: 3 } or any other fields to set

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

// GET /search?q=term - search lessons (backend full-text-like search using regex)
// Note: using regex on numeric `price` or `spaces` fields is not exact, but matches the coursework expectation.
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    const results = await lessonsCollection.find({
      $or: [
        { subject: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        // price and spaces may be numbers in DB; if so, you may need to convert or store them as strings.
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
