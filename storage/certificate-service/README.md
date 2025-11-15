# Certificate Generation Service 📄

## Tổng quan

Service tự động tạo **PDF certificates** (giấy xác nhận) chuyên nghiệp cho các hồ sơ nộp thuốc đã được duyệt.

---

## ✨ Tính năng

### 🎨 Certificate Design
- **Template đẹp mắt**: Thiết kế chuyên nghiệp với border trang trí, màu sắc hài hòa
- **Song ngữ**: Tiếng Việt và English
- **Thông tin đầy đủ**:
  - 👤 Tên người nộp
  - 💊 Thông tin thuốc (tên, hàm lượng, số lượng)
  - 🏪 Nhà thuốc
  - ⭐ Điểm thưởng
  - 📅 Ngày cấp
  - 🔐 Verification stamp

### 🔄 Auto-generation
- **Polling**: Tự động check database mỗi 30 giây
- **Smart check**: Chỉ generate cho submissions:
  - `ket_qua = 'approved'`
  - `duong_dan_chung_nhan` NULL hoặc rỗng
- **Duplicate prevention**: Kiểm tra file đã tồn tại trước khi tạo mới
- **Database update**: Tự động cập nhật `duong_dan_chung_nhan` sau khi generate

### 📦 Storage
- **Docker volume**: `certificates` volume được share giữa services
- **Path convention**: `/certificates/cert_{submission_id}_{timestamp}.pdf`
- **Access control**: FastAPI serve files với authentication required

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│               certificate-service                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  1. Poll database every 30s                  │  │
│  │  2. Find approved submissions without cert   │  │
│  │  3. Check if PDF already exists              │  │
│  │  4. Generate beautiful PDF certificate       │  │
│  │  5. Save to /app/certificates/               │  │
│  │  6. Update database with file path           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────────┘
              │ Write PDF
              ▼
    ┌─────────────────────┐
    │  certificates volume │ ◄─── Read-only mount
    └─────────┬───────────┘
              │ Read PDF
              ▼
┌─────────────────────────────────────────────────────┐
│                    fastapi                          │
│  API Endpoints:                                     │
│  • GET /api/certificates/{submission_id}.pdf       │
│  • GET /api/certificates/download/{filename}       │
└─────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
storage/certificate-service/
├── Dockerfile                  # Service container
├── requirements.txt            # Python dependencies
├── main.py                     # Main polling service
└── certificate_generator.py   # PDF generator class
```

---

## 🚀 Deployment

### Docker Compose

Service được định nghĩa trong `docker-compose.yml`:

```yaml
certificate-service:
  build: ./storage/certificate-service
  restart: unless-stopped
  depends_on:
    - db-init
    - postgres
  environment:
    POSTGRES_HOST: postgres
    POSTGRES_DB: medicine_recycling
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: admin123
    POLL_INTERVAL: 30  # seconds
  volumes:
    - certificates:/app/certificates
  networks:
    - backend
```

### Build and Start

```bash
# Build certificate service
docker compose build certificate-service

# Start service
docker compose up -d certificate-service

# View logs
docker compose logs -f certificate-service

# Check generated certificates
docker exec certificate-service ls -la /app/certificates
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `postgres` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_DB` | `medicine_recycling` | Database name |
| `POSTGRES_USER` | `admin` | Database user |
| `POSTGRES_PASSWORD` | `admin123` | Database password |
| `POLL_INTERVAL` | `30` | Check interval in seconds |

### Certificate Storage

- **Container path**: `/app/certificates/`
- **Volume name**: `certificates`
- **Shared with**: `fastapi` service (read-only)

---

## 📊 Database Schema

Service sử dụng field có sẵn:

```sql
-- Table: ho_so_xu_ly
ALTER TABLE ho_so_xu_ly 
ADD COLUMN IF NOT EXISTS duong_dan_chung_nhan TEXT;

-- Example value:
-- '/certificates/cert_abc12345_20251114_123456.pdf'
```

---

## 🎨 Certificate Template

### Design Elements

```
╔════════════════════════════════════════════════════╗
║  Decorative Border (Blue gradient)                 ║
║                                                    ║
║           [REMEDI Logo Area]                       ║
║        Medicine Collection Platform                ║
║                                                    ║
║  ┌────────────────────────────────────────────┐   ║
║  │        GIẤY XÁC NHẬN                       │   ║
║  │  Certificate of Medicine Submission        │   ║
║  └────────────────────────────────────────────┘   ║
║                                                    ║
║  Chứng nhận rằng / This is to certify that        ║
║           [NGUYEN VAN A]                           ║
║           ───────────────                          ║
║                                                    ║
║  ┌─────────────────────────────────────────────┐  ║
║  │ 📋 Thuốc: Paracetamol 500mg                │  ║
║  │ 💊 Hàm lượng: 500mg                         │  ║
║  │ 📦 Số lượng: 100 viên                       │  ║
║  │ 🏪 Nhà thuốc: Phòng khám ABC                │  ║
║  │ ⭐ Điểm thưởng: +50 điểm                    │  ║
║  └─────────────────────────────────────────────┘  ║
║                                                    ║
║  Ngày cấp: 14/11/2025                              ║
║  Mã hồ sơ: abc12345-xyz789-...                    ║
║                                                    ║
║                               ┌───────────┐        ║
║                               │  REMEDI   │        ║
║                               │ VERIFIED  │        ║
║                               └───────────┘        ║
║                               Verification         ║
║                                                    ║
║     Auto-generated by REMEDI System                ║
╚════════════════════════════════════════════════════╝
```

### Color Scheme

- Primary: `#1e40af` (Blue 800)
- Secondary: `#3b82f6` (Blue 500)
- Accent: `#60a5fa` (Blue 400)
- Success: `#059669` (Green 600)
- Text: `#374151` (Gray 700)

---

## 🔍 How It Works

### 1. Service Startup

```python
# main.py
1. Connect to database
2. Run initial check for existing submissions
3. Start polling loop (every 30s)
```

### 2. Certificate Generation Flow

```python
# For each approved submission without certificate:

1. Check if PDF file exists in /app/certificates/
   └─ If exists: Update database, skip generation

2. Generate PDF using CertificateGenerator
   ├─ Draw decorative border
   ├─ Draw header (REMEDI logo)
   ├─ Draw title (GIẤY XÁC NHẬN)
   ├─ Draw content (user, medicine info)
   └─ Draw footer (date, signature, stamp)

3. Save PDF to /app/certificates/cert_{id}_{timestamp}.pdf

4. Update database:
   UPDATE ho_so_xu_ly 
   SET duong_dan_chung_nhan = '/certificates/cert_xxx.pdf'
   WHERE id = '{submission_id}'
```

### 3. File Access

```python
# FastAPI serves certificates with authentication
GET /api/certificates/{submission_id}.pdf
GET /api/certificates/download/{filename}

# Nginx proxies to FastAPI
http://localhost:8081/api/certificates/download/cert_xxx.pdf
```

---

## 📝 Logs

### Startup

```
[Certificate Service] Waiting for database... (1/10)
[Certificate Service] Database connection successful
[Certificate Service] Starting certificate generation service...
[Certificate Service] Certificate directory: /app/certificates
[Certificate Service] Polling interval: 30 seconds
```

### Generation

```
[Certificate Service] Checking for submissions needing certificates...
[Certificate Service] Found 5 submissions needing certificates
[Certificate Service] Generating certificate for submission abc12345...
Generated certificate: cert_abc12345_20251114_123456.pdf
[Certificate Service] ✓ Generated certificate: cert_abc12345_20251114_123456.pdf
[Certificate Service] Successfully generated 5 new certificates
```

### Duplicate Prevention

```
[Certificate Service] Certificate already exists for abc12345, skipping...
```

---

## 🐛 Troubleshooting

### Certificates not generated

```bash
# Check service logs
docker compose logs certificate-service

# Check if service is running
docker compose ps | grep certificate

# Check database for approved submissions
docker exec postgres psql -U admin -d medicine_recycling \
  -c "SELECT id, ket_qua, duong_dan_chung_nhan FROM ho_so_xu_ly WHERE ket_qua='approved'"
```

### Permission errors

```bash
# Check volume permissions
docker exec certificate-service ls -la /app/certificates

# Recreate volume if needed
docker compose down -v
docker compose up -d
```

### PDF file not accessible

```bash
# Check if file exists
docker exec certificate-service ls /app/certificates

# Check FastAPI can read
docker exec fastapi ls /app/certificates

# Test download endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/certificates/download/cert_xxx.pdf \
  -o test.pdf
```

---

## 🔮 Future Enhancements

- [ ] QR code with submission ID
- [ ] Digital signature integration
- [ ] Custom templates per pharmacy
- [ ] Email delivery to users
- [ ] Batch certificate generation endpoint
- [ ] Certificate revocation system
- [ ] Multi-language support (Chinese, Japanese)
- [ ] A4/Letter size options

---

## 📊 Performance

- **Generation time**: ~500ms per certificate
- **File size**: ~100-200KB per PDF
- **Polling overhead**: Minimal (30s interval)
- **Storage**: Linear growth with submissions

---

**Version**: 1.0.0  
**Last Updated**: 14/11/2025  
**Service Type**: Background Worker
