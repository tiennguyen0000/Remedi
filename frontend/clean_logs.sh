#!/bin/bash
# Clean up debug console.log statements in frontend code

cd /mnt/d/Desktop/Desktop/LAB/4de/frontend

echo "🧹 Cleaning up console.log statements..."

# Comment out [API], [useAuth], [MedicineManagement] debug logs
find client -name "*.tsx" -o -name "*.ts" | while read file; do
  # Comment out debug logs with specific prefixes
  sed -i 's/^\(\s*\)console\.log(\[.*\]/\1\/\/ console.log([/g' "$file"
  
  # Keep error logs
  # sed -i 's/^\(\s*\)\/\/ console\.error/\1console.error/g' "$file"
done

echo "✅ Cleaned up debug console.log statements"
echo ""
echo "📊 Remaining console statements:"
grep -r "console\." client --include="*.tsx" --include="*.ts" | grep -v "// console" | wc -l
