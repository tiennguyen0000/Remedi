#!/bin/bash

# Health Check Script for ReMedi System
echo "🏥 Kiểm tra Sức khỏe Hệ thống ReMedi"
echo "======================================="
echo ""

# Check Docker Compose
echo "📦 Docker Services Status:"
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>&1 | grep -v "attribute.*version"
echo ""

# Check Backend API
echo "🔌 Backend API Health:"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ FastAPI (8000) - OK"
else
    echo "  ❌ FastAPI (8000) - FAILED"
fi

if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "  ✅ LangGraph (8001) - OK"
else
    echo "  ⚠️  LangGraph (8001) - No health endpoint (normal)"
fi
echo ""

# Check Nginx Proxy
echo "🌐 Nginx Proxy:"
if curl -s http://localhost:8081/api/metrics > /dev/null 2>&1; then
    echo "  ✅ Nginx proxy to backend - OK"
else
    echo "  ❌ Nginx proxy - FAILED"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✅ Frontend (3000) - OK"
else
    echo "  ❌ Frontend (3000) - FAILED"
fi

if curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo "  ✅ Nginx (8081) - OK"
else
    echo "  ❌ Nginx (8081) - FAILED"
fi
echo ""

# Check Database
echo "🗄️  Database & Storage:"
if docker compose exec -T postgres pg_isready -U admin > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL - Ready"
else
    echo "  ❌ PostgreSQL - Not Ready"
fi

if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis - OK"
else
    echo "  ❌ Redis - FAILED"
fi

if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "  ✅ MinIO - OK"
else
    echo "  ⚠️  MinIO - Check manually"
fi
echo ""

# Summary
echo "📊 Summary:"
ALL_SERVICES=$(docker compose ps --filter "status=running" --format "{{.Service}}" 2>&1 | grep -v "attribute.*version" | wc -l)
echo "  Đang chạy: $ALL_SERVICES/7 services"
echo ""
echo "✅ Hoàn tất kiểm tra!"
