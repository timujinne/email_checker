#!/bin/bash
# Test script for /api/smart-filter/apply endpoint

echo "Testing /api/smart-filter/apply endpoint..."
echo "=============================================="

curl -X POST http://localhost:8080/api/smart-filter/apply \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "metadata": {
        "name": "Test Filter",
        "description": "Test filter from curl",
        "version": "1.0"
      },
      "scoring": {
        "weights": {
          "email_quality": 0.10,
          "company_relevance": 0.45,
          "geographic_priority": 0.30,
          "engagement": 0.15
        },
        "thresholds": {
          "high_priority": 100,
          "medium_priority": 50,
          "low_priority": 10
        }
      }
    },
    "timestamp": "2025-10-30T12:00:00Z"
  }'

echo ""
echo "=============================================="
echo "Test complete!"
