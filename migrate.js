import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dti-price-monitoring';
const DB_NAME = process.env.DB_NAME || 'dtiApp';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: DB_NAME,
    });

    console.log('✅ Connected to MongoDB');
    console.log(`📚 Database: ${mongoose.connection.name}`);

    const db = mongoose.connection;
    const collection = db.collection('pricedatas');

    // Check collection existence
    const stats = await collection.stats().catch(() => null);
    if (!stats) {
      console.log('📭 Collection does not exist yet. No migration needed.');
      process.exit(0);
    }

    console.log(`📊 Total documents: ${stats.count}`);

    // Update all documents to new schema
    // Get current year or default to 2025 if future
    const currentYear = new Date().getFullYear();
    const defaultYear = currentYear > 2025 ? currentYear.toString() : '2025';

    const result = await collection.updateMany(
      {},
      {
        $set: {
          commodity: { $ifNull: ['$commodity', 'Unknown'] },
          brand: { $ifNull: ['$brand', ''] },
          price: { $ifNull: ['$price', 0] },
          month: { $ifNull: ['$month', ''] },
          years: { $ifNull: ['$years', defaultYear] },
          size: { $ifNull: ['$size', ''] },
          store: { $ifNull: ['$store', ''] },
          variant: { $ifNull: ['$variant', ''] },
        },
        $unset: {
          prevPrice: '',
          municipality: '',
          srp: ''
        }
      }
    );

    console.log(`✅ Updated documents: ${result.modifiedCount}`);
    console.log(`ℹ️  Unchanged documents: ${result.matchedCount - result.modifiedCount}`);

    console.log('\n📋 Migration Summary:');
    console.log('  • Added: commodity, brand, price, month, years, size, store, variant');
    console.log('  • Removed: prevPrice, municipality, srp');
    console.log('  • Default values applied to missing fields');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
