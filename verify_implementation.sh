#!/bin/bash

# File Upload Implementation Verification Script

echo "================================================================"
echo "File Upload Implementation Verification"
echo "================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check modified file
echo "1. Checking modified component..."
if [ -f "web/assets/js/components/filter-tester.js" ]; then
    LINE_COUNT=$(wc -l < "web/assets/js/components/filter-tester.js")
    if [ "$LINE_COUNT" -ge 700 ]; then
        echo -e "${GREEN}✅ filter-tester.js exists ($LINE_COUNT lines)${NC}"
    else
        echo -e "${RED}❌ filter-tester.js too short ($LINE_COUNT lines, expected 700+)${NC}"
    fi
else
    echo -e "${RED}❌ filter-tester.js not found${NC}"
fi

# Check test files
echo ""
echo "2. Checking test files..."
if [ -f "test_emails.txt" ]; then
    EMAIL_COUNT=$(wc -l < "test_emails.txt")
    echo -e "${GREEN}✅ test_emails.txt exists ($EMAIL_COUNT emails)${NC}"
else
    echo -e "${RED}❌ test_emails.txt not found${NC}"
fi

if [ -f "test_emails.csv" ]; then
    CSV_LINES=$(wc -l < "test_emails.csv")
    echo -e "${GREEN}✅ test_emails.csv exists ($CSV_LINES lines)${NC}"
else
    echo -e "${RED}❌ test_emails.csv not found${NC}"
fi

# Check documentation
echo ""
echo "3. Checking documentation..."
for doc in "FILE_UPLOAD_TESTING_GUIDE.md" "IMPLEMENTATION_SUMMARY.md" "QUICKSTART_FILE_UPLOAD.md"; do
    if [ -f "$doc" ]; then
        SIZE=$(du -h "$doc" | cut -f1)
        echo -e "${GREEN}✅ $doc exists ($SIZE)${NC}"
    else
        echo -e "${RED}❌ $doc not found${NC}"
    fi
done

# Check key methods
echo ""
echo "4. Checking key methods in filter-tester.js..."
METHODS=(
    "switchSource"
    "handleFileSelect"
    "validateFile"
    "parseFile"
    "parseTxtFile"
    "parseCsvFile"
    "extractDomain"
    "formatFileSize"
)

for method in "${METHODS[@]}"; do
    if grep -q "$method" "web/assets/js/components/filter-tester.js" 2>/dev/null; then
        echo -e "${GREEN}✅ Method $method found${NC}"
    else
        echo -e "${RED}❌ Method $method not found${NC}"
    fi
done

# Summary
echo ""
echo "================================================================"
echo "Verification Complete"
echo "================================================================"
echo ""
echo "Next steps:"
echo "1. Start server: python3 web_server.py"
echo "2. Open: http://localhost:8080/smart-filter.html"
echo "3. Navigate to Filter Tester section"
echo "4. Test file upload with test_emails.txt"
echo "5. Test file upload with test_emails.csv"
echo ""
echo "See QUICKSTART_FILE_UPLOAD.md for detailed instructions"
echo "================================================================"
