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

// Price Schema (BRAND, COMMODITY, MONTH, PRICE, SIZE, STORE, VARIANT, YEARS, SRP)
const priceSchema = new mongoose.Schema({
  brand: { type: String, default: "", trim: true },
  commodity: { type: String, required: true, trim: true },
  month: { type: String, default: "", trim: true },
  price: { type: Number, required: true, default: 0 },
  srp: { type: mongoose.Schema.Types.Mixed, default: "" },
  size: { type: String, default: "", trim: true },
  store: { type: String, default: "", trim: true },
  variant: { type: String, default: "", trim: true },
  category: { type: String, default: "", trim: true },
  years: { type: String, default: "", trim: true },
  timestamp: { type: Date, default: Date.now },
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
    const payload = { ...req.body };
    if (!payload.commodity) payload.commodity = 'Unknown';
    if (typeof payload.price !== 'number' || payload.price === null) payload.price = 0;
    if (!payload.brand) payload.brand = '';
    if (!payload.month) payload.month = '';
    if (!payload.years) payload.years = new Date().getFullYear().toString();
    if (!payload.size) payload.size = '';
    if (!payload.store) payload.store = '';
    if (!payload.variant) payload.variant = '';
    if (!payload.category) payload.category = '';
    if (!payload.timestamp) payload.timestamp = new Date();

    const newPrice = new PriceData(payload);
    await newPrice.save();
    res.status(201).json(newPrice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update price data
app.put('/api/prices/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    if (!update.category) update.category = '';
    if (!update.timestamp) update.timestamp = new Date();

    const updated = await PriceData.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Record not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete price data
app.delete('/api/prices/:id', async (req, res) => {
  try {
    const deleted = await PriceData.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migration endpoint - update old schema to new schema
app.post('/api/migrate', async (req, res) => {
  try {
    const collection = mongoose.connection.collection('pricedatas');
    const currentYear = new Date().getFullYear();
    const defaultYear = currentYear > 2025 ? currentYear.toString() : '2025';

    const result = await collection.updateMany(
      {},
      [
        {
          $set: {
            brand: { $ifNull: ['$brand', ''] },
            commodity: { $ifNull: ['$commodity', 'Unknown'] },
            month: { $ifNull: ['$month', ''] },
            price: { $ifNull: ['$price', 0] },
            size: { $ifNull: ['$size', ''] },
            store: { $ifNull: ['$store', ''] },
            variant: { $ifNull: ['$variant', ''] },
            years: { $ifNull: ['$years', defaultYear] },
            category: { $ifNull: ['$category', ''] }
          }
        },
        {
          $unset: ['prevPrice', 'municipality', 'srp']
        }
      ]
    );

    res.json({
      message: 'Migration completed',
      matched: result.matchedCount,
      modified: result.modifiedCount,
      summary: {
        added: ['brand', 'commodity', 'month', 'price', 'size', 'store', 'variant', 'years', 'category'],
        removed: ['prevPrice', 'municipality', 'srp']
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
