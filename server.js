import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dti-price-monitoring';
const DB_NAME = process.env.DB_NAME || 'dtiApp';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: DB_NAME,
}).then(() => {
  console.log('✅ Connected to MongoDB');
  console.log(`📚 Using database: ${mongoose.connection.name}`);
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Price Schema
const priceSchema = new mongoose.Schema({
  commodity: String,
  store: String,
  municipality: String,
  price: Number,
  prevPrice: Number,
  srp: Number,
  timestamp: Date,
}, { timestamps: true });

const PriceData = mongoose.model('PriceData', priceSchema);

// Routes
// Get all price data
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await PriceData.find().sort({ timestamp: -1 });
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new price data
app.post('/api/prices', async (req, res) => {
  try {
    const newPrice = new PriceData(req.body);
    await newPrice.save();
    res.status(201).json(newPrice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete price data
app.delete('/api/prices/:id', async (req, res) => {
  try {
    await PriceData.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
