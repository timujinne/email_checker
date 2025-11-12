#!/bin/bash
# Example usage of /api/lists/bulk-update endpoint

BASE_URL="http://localhost:8080"

echo "============================================"
echo "Bulk Update API Examples"
echo "============================================"
echo ""

# Example 1: Update country and priority for multiple lists
echo "Example 1: Update country and priority for 2 lists"
echo "-------------------------------------------"
curl -X POST "$BASE_URL/api/lists/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "Норвегия Производители землеройной техники (полностью проверен).lvp",
      "Норвегия лесозаготовка (полностью проверен).lvp"
    ],
    "updates": {
      "country": "Norway",
      "priority": 100,
      "category": "Manufacturing"
    }
  }'
echo -e "\n\n"

# Example 2: Reset processed flags
echo "Example 2: Reset processed flags for 3 lists"
echo "-------------------------------------------"
curl -X POST "$BASE_URL/api/lists/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "Норвегия Производители землеройной техники (полностью проверен).lvp",
      "Норвегия лесозаготовка (полностью проверен).lvp",
      "РФ Строительная техника(полностью проверен).lvp"
    ],
    "updates": {
      "processed": false
    }
  }'
echo -e "\n\n"

# Example 3: Update descriptions
echo "Example 3: Update descriptions for 2 lists"
echo "-------------------------------------------"
curl -X POST "$BASE_URL/api/lists/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "Норвегия Производители землеройной техники (полностью проверен).lvp",
      "Норвегия лесозаготовка (полностью проверен).lvp"
    ],
    "updates": {
      "description": "Updated via bulk API - ready for reprocessing"
    }
  }'
echo -e "\n\n"

# Example 4: Error case - invalid priority
echo "Example 4: Error case - invalid priority (should fail)"
echo "-------------------------------------------"
curl -X POST "$BASE_URL/api/lists/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": ["test.txt"],
    "updates": {
      "priority": 1000
    }
  }'
echo -e "\n\n"

# Example 5: Error case - non-existent file
echo "Example 5: Non-existent file (partial success)"
echo "-------------------------------------------"
curl -X POST "$BASE_URL/api/lists/bulk-update" \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "Норвегия Производители землеройной техники (полностью проверен).lvp",
      "non_existent_file_12345.txt"
    ],
    "updates": {
      "country": "Norway"
    }
  }'
echo -e "\n\n"

echo "============================================"
echo "Examples completed!"
echo "============================================"
