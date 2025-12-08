require("dotenv").config(); 
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());        


app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/images', express.static('public/images')); 

let db, lessonsCollection, ordersCollection;

async function start() {
  const client = new MongoClient(process.env.MONGODB_URI);

  
  await client.connect();
  console.log("Connected to MongoDB");


  db = client.db(process.env.DB_NAME); 
  // Collections required by coursework: lesson and order
  lessonsCollection = db.collection("lesson");
  ordersCollection = db.collection("order");


  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

start();

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.get("/lessons", async (req, res) => {
  const lessons = await lessonsCollection.find().toArray();
  res.json(lessons);
});


app.post("/orders", async (req, res) => {
  try {
    const { name, phone, lessons } = req.body;

    if (!name || !phone || !lessons || !Array.isArray(lessons)) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const order = {
      name,
      phone,
      lessons,        
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
