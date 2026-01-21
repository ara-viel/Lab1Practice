# Data Validation & Normalization System

## Problem Solved
When importing 12 years of data from multiple sources, formats are inconsistent. This system automatically detects and fixes these issues.

## Data Format Issues Handled

### 1. **Commodity Names**
- ✅ Different cases: "Rice" → "rice" → "RICE" → normalized to "Rice"
- ✅ Extra whitespace: " Rice  " → "Rice"
- ✅ Title-cased consistently

### 2. **Price Values**
- ✅ Currency symbols: "₱100.50" → 100.50
- ✅ Different symbols: "$100", "€100", "¥100" → 100
- ✅ Thousand separators: "1,000.50" → 1000.50
- ✅ Different decimals: "100" vs "100.5" → standardized to 2 decimals
- ✅ Invalid values rejected with error message

### 3. **Dates**
- ✅ ISO format: "2024-01-21" ✓
- ✅ US format: "01/21/2024" → converted
- ✅ ISO date objects: handled
- ✅ Invalid dates default to current date with warning

### 4. **Store Names**
- ✅ Mixed case: "Pasig Market" → "PASIG MARKET"
- ✅ Extra spaces: "Pasig  Market" → "PASIG MARKET"
- ✅ All uppercase standardized

### 5. **Municipality Names**
- ✅ Mixed case: "pasig city" → "Pasig City"
- ✅ Extra spaces handled
- ✅ Title-cased consistently

### 6. **Missing or Invalid Data**
- ✅ Empty values detected
- ✅ Negative prices rejected
- ✅ Required fields validation
- ✅ Detailed error reporting per record

## Features

### Data Validation Report
Before importing, users see:
- ✅ **Summary** - Total records, valid count, issues found
- ✅ **Valid Records** - Preview of records that will be imported
- ✅ **Issues Found** - Records with problems (with error details)
- ✅ **Duplicates** - Potential duplicate records flagged
- ✅ **Statistics** - Distribution by municipality/commodity, price range

### Quality Report
After validation:
- Records per municipality
- Records per commodity
- Price statistics (min/max)
- Missing optional fields count

### Data Cleaning
All imported records are automatically:
- ✅ Standardized (consistent naming)
- ✅ Normalized (proper formats)
- ✅ Validated (no invalid data)
- ✅ Deduplicated (warnings for duplicates)

## Usage Example

When importing CSV with inconsistent data:

```
Commodity,Store,Municipality,Price,Date
"rice",PASIG MARKET,Pasig City,₱100.50,01/21/2024
RICE,pasig market,"pasig city","100.5",2024-01-21
"  RiCe  "," PASIG MARKET ","  PASIG CITY  ","100","2024-01-21"
```

Results in:
```json
{
  "commodity": "Rice",
  "store": "PASIG MARKET",
  "municipality": "Pasig City",
  "price": 100.50,
  "timestamp": "2024-01-21T00:00:00.000Z"
}
```

## Error Handling

Invalid records are flagged with specific errors:
- "Commodity is required"
- "Price must be a valid number"
- "Price cannot be negative"
- "Previous price cannot be negative"
- "SRP cannot be negative"

Users can review and choose to proceed with only valid records.

## Benefits for Your Use Case

With 12 years × 10 municipalities × multiple commodities:
1. **Consistency** - No mixed formats in database
2. **Reliability** - Invalid data prevented from entering
3. **Transparency** - Clear report of what was imported
4. **Flexibility** - Handles various data sources
5. **Maintainability** - Clean data easier to analyze/report
