// MongoDB Indexing Script
// Run this in MongoDB shell to add recommended indexes for optimal performance
// This will make queries much faster

// Connect to your database
use dtiApp

// ===== INDEXES FOR TIMESTAMP QUERIES (Primary Sorting) =====
// These improve .sort({ timestamp: -1 }) operations
db.PriceData.createIndex({ timestamp: -1 });
db.BasicNecessities.createIndex({ timestamp: -1 });
db.PrimeCommodities.createIndex({ timestamp: -1 });
db.ConstructionMaterials.createIndex({ timestamp: -1 });

// ===== INDEXES FOR FILTERING =====
// These improve commodity and store filtering
db.PriceData.createIndex({ commodity: 1, store: 1 });
db.BasicNecessities.createIndex({ commodity: 1, store: 1 });
db.PrimeCommodities.createIndex({ commodity: 1, store: 1 });
db.ConstructionMaterials.createIndex({ commodity: 1, store: 1 });

// ===== INDEXES FOR MONTH/YEAR FILTERING =====
// These improve date-based filtering
db.PriceData.createIndex({ month: 1, years: 1 });
db.BasicNecessities.createIndex({ month: 1, years: 1 });
db.PrimeCommodities.createIndex({ month: 1, years: 1 });
db.ConstructionMaterials.createIndex({ month: 1, years: 1 });

// ===== COMPOSITE INDEXES FOR COMPLEX QUERIES =====
// These improve queries that filter by commodity, store, AND timestamp
db.PriceData.createIndex({ commodity: 1, store: 1, timestamp: -1 });
db.BasicNecessities.createIndex({ commodity: 1, store: 1, timestamp: -1 });
db.PrimeCommodities.createIndex({ commodity: 1, store: 1, timestamp: -1 });
db.ConstructionMaterials.createIndex({ commodity: 1, store: 1, timestamp: -1 });

// ===== OPTIONAL: INDEX FOR BRAND FILTERING =====
// If you frequently filter by brand, uncomment these
// db.PriceData.createIndex({ brand: 1 });
// db.BasicNecessities.createIndex({ brand: 1 });
// db.PrimeCommodities.createIndex({ brand: 1 });
// db.ConstructionMaterials.createIndex({ brand: 1 });

// ===== VERIFY INDEXES WERE CREATED =====
// Run these commands to verify the indexes exist
db.PriceData.getIndexes();
db.BasicNecessities.getIndexes();
db.PrimeCommodities.getIndexes();
db.ConstructionMaterials.getIndexes();

// ===== DROP INDEXES (if needed) =====
// Uncomment these only if you need to remove indexes
// db.PriceData.dropIndex("timestamp_-1");
// db.BasicNecessities.dropIndex("timestamp_-1");
// db.PrimeCommodities.dropIndex("timestamp_-1");
// db.ConstructionMaterials.dropIndex("timestamp_-1");

// ===== ANALYZE QUERY PERFORMANCE =====
// Use explain() to see if indexes are being used
// This should show "COLLSCAN" before indexes and nothing after
db.PriceData.find({ commodity: "Rice", store: "Puregold" }).sort({ timestamp: -1 }).explain("executionStats");

// Expected output with proper indexes:
// "executionStats" : {
//   "executionStages" : {
//     "stage" : "SORT",  // Should use indexed sort, not COLLSCAN
//     ...
//   }
// }

console.log("✅ Indexes created successfully!");
console.log("Database queries should now be significantly faster.");
