# 🏥 REMEDI - Medicine Collection & Exchange Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**Nền tảng thu gom và trao đổi thuốc thừa, hết hạn - Vì một cộng đồng khỏe mạnh và môi trường xanh**

[Tính năng](#-tính-năng-chính) • [Kiến trúc](#-kiến-trúc-hệ-thống) • [Công nghệ](#-công-nghệ-sử-dụng) • [Cài đặt](#-cài-đặt) • [API](#-api-documentation)

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cài đặt](#-cài-đặt)

---

## 🌟 Giới thiệu

**REMEDI** là một nền tảng web toàn diện giúp thu gom thuốc thừa và hết hạn từ người dân, xử lý phân loại, và trao đổi thuốc còn hạn đến những người cần. Hệ thống không chỉ bảo vệ môi trường mà còn tạo ra giá trị xã hội thông qua việc chia sẻ nguồn lực y tế.

### 🎯 Mục tiêu

- ♻️ **Thu gom an toàn**: Xử lý thuốc hết hạn đúng quy định, giảm ô nhiễm môi trường
- 🤝 **Chia sẻ cộng đồng**: Chuyển giao thuốc còn hạn đến người cần
- 🎁 **Khuyến khích tham gia**: Hệ thống điểm thưởng và voucher hấp dẫn
- 🤖 **AI Chatbot**: Hỗ trợ người dùng 24/7 với công nghệ LangGraph
- 📊 **Quản lý minh bạch**: Theo dõi và thống kê toàn diện

---

## ✨ Tính năng chính

### 👤 Người dùng (USER)

- ✅ Đăng ký/Đăng nhập với JWT Authentication
- 📝 Nộp hồ sơ thu gom thuốc (thừa/hết hạn)
- 📍 Tìm kiếm nhà thuốc gần nhất (Map integration)
- 📊 Theo dõi lịch sử nộp thuốc
- ⭐ Tích lũy điểm thưởng
- 🎫 Đổi voucher từ điểm tích lũy
- 💬 Tham gia diễn đàn cộng đồng
- 🤖 Chat với AI Chatbot hỗ trợ
- 🔔 Nhận thông báo realtime

### 👔 Cộng tác viên (CONGTACVIEN)

- Tất cả tính năng của USER
- ✔️ Duyệt hồ sơ nộp thuốc
- 📋 Quản lý classification results
- 📈 Xem báo cáo chi tiết

### 🔐 Admin (ADMIN)

- Tất cả tính năng của CONGTACVIEN
- 👥 Quản lý người dùng
- 🏪 Quản lý danh sách nhà thuốc
- 💊 Quản lý loại thuốc
- 🎁 Quản lý voucher
- 📊 Dashboard thống kê toàn hệ thống
- 🤖 Quản lý AI Chatbot
- ⚙️ Cấu hình hệ thống

---

## 🏗️ Kiến trúc hệ thống

### Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Port 8081)                       │
│                      Reverse Proxy & Gateway                    │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             ▼                                    ▼
┌────────────────────────┐           ┌────────────────────────────┐
│  Frontend (Port 3000)  │           │  FastAPI (Port 8000)       │
│  ────────────────────  │           │  ──────────────────────    │
│  • React + TypeScript  │◄─────────►│  • REST API                │
│  • Vite + TailwindCSS  │           │  • WebSocket Server        │
│  • Radix UI            │           │  • JWT Auth                │
│  • Chart.js            │           │  • AsyncPG (PostgreSQL)    │
│  • Leaflet Maps        │           │  • Redis Cache             │
└────────────────────────┘           └──────────┬─────────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────────┐
                                     │ LangGraph (Port 8001)    │
                                     │ ──────────────────────   │
                                     │ • AI Chatbot Service     │
                                     │ • LangChain + Groq LLM   │
                                     │ • State Management       │
                                     │ • Knowledge Base         │
                                     └──────────────────────────┘
                                                │
                    ┌───────────────────────────┼─────────────────┐
                    ▼                           ▼                 ▼
        ┌───────────────────┐                            ┌──────────────┐
        │ PostgreSQL (5432) │                            │ MinIO (9000) │
        │ ─────────────────  │                            │ ────────────  │
        │ • Main Database   │                            │ • File Storage│
        │ • User Data       │                            │ • Images      │
        │ • Submissions     │                            │ • Certificates│
        └───────────────────┘                            └──────────────┘
```

### Luồng dữ liệu

```mermaid
graph LR
    A[User Browser] -->|HTTP/WebSocket| B[NGINX]
    B -->|Route /api| C[FastAPI Backend]
    B -->|Route /| D[Frontend SPA]
    C -->|Query| E[(PostgreSQL)]
    C -->|Upload/Download| F[(MinIO)]
    C -->|Chat Request| G[LangGraph Service]
    G -->|LLM| H[Groq API]
    G -->|Query System| C
    C -->|WebSocket| A
```

---

## 🛠️ Công nghệ sử dụng

### Backend Layer

#### FastAPI Service (Port 8000)
| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| **FastAPI** | Latest | REST API Framework, WebSocket support |
| **Uvicorn** | Latest | ASGI server với hot-reload |
| **AsyncPG** | Latest | Async PostgreSQL driver |
| **Python-Jose** | Latest | JWT token generation/validation |
| **Bcrypt** | Latest | Password hashing |
| **Pydantic** | 2.0+ | Data validation & serialization |
| **HTTPX** | Latest | Async HTTP client |
| **WebSockets** | Latest | Real-time communication |

**Chức năng chính:**
- 🔐 Authentication & Authorization (JWT + Session)
- 📡 RESTful API endpoints
- 🔌 WebSocket server for real-time notifications
- 💾 Database operations với connection pooling
- 📤 File upload/download với MinIO
- 🔗 Integration với LangGraph service

#### LangGraph Service (Port 8001)
| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| **LangGraph** | Latest | Workflow orchestration |
| **LangChain** | Latest | LLM framework |
| **LangChain-Groq** | Latest | Groq LLM integration |
| **FastAPI** | Latest | REST API for chatbot |
| **Psycopg2** | Latest | PostgreSQL driver |
| **Boto3** | Latest | MinIO S3 client |

**Chức năng chính:**
- 🤖 AI Chatbot với state management
- 🧠 Multi-agent workflow (Router → Intent Detection → Tools)
- 📚 Knowledge base queries
- 🔧 System integration tools
- 💬 Conversational AI with context

### Frontend Layer

#### React SPA (Port 3000)
| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| **React** | 18+ | UI Framework |
| **TypeScript** | Latest | Type safety |
| **Vite** | Latest | Build tool & dev server |
| **TailwindCSS** | Latest | Utility-first CSS |
| **Radix UI** | Latest | Accessible components |
| **React Router** | Latest | Client-side routing |
| **Chart.js** | 4.5+ | Data visualization |
| **React-Leaflet** | 4.2+ | Map integration |
| **Zod** | Latest | Schema validation |

**Pages & Components:**
- 🏠 Dashboard (Home + Analytics)
- 📝 Submission Form & History
- 🗺️ Pharmacy Map (Leaflet integration)
- 🎫 Voucher Management
- 💬 Forum & Comments
- 🤖 Chatbot Widget
- 👤 User Profile & Settings
- 🔐 Auth Pages (Login/Register)

### Infrastructure Layer

#### Database
```
PostgreSQL 15
├── Users & Authentication
├── Medicine Types & Pharmacies
├── Submissions & Classifications
├── Vouchers & Redemptions
├── Forum & Comments
├── Notifications
└── Feedback & Ratings
```

#### Storage
- **MinIO**: S3-compatible object storage for certificates & images

#### Reverse Proxy
- **NGINX**: Load balancing, SSL termination, static file serving

---



## 🚀 Cài đặt

### Yêu cầu hệ thống

- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB)
- **Storage**: Tối thiểu 10GB

> 💡 **Windows Users**: Hệ thống đã được tối ưu hóa cho Docker trên Windows. Đảm bảo Docker Desktop đang chạy và WSL 2 được bật. File `.gitattributes` đã được cấu hình để đảm bảo line endings đúng cho shell scripts.

### Hướng dẫn cài đặt nhanh

#### 1️⃣ Clone repository

```bash
git clone <repository-url>
cd 4de
```

#### 2️⃣ Cấu hình Environment Variables

Tạo file `.env` (hoặc sửa file có sẵn):

```bash
# Copy từ example
cp .env.example .env

# Hoặc sử dụng editor yêu thích
nano .env
```

**Cấu hình tối thiểu:**

```env
# Groq API (Bắt buộc cho chatbot)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=medicine_recycling
DATABASE_URL=postgresql://admin:admin123@postgres:5432/medicine_recycling

# JWT Secret (Thay đổi trong production!)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000
```

> 🔑 **Lấy Groq API Key**: Truy cập [https://console.groq.com](https://console.groq.com) để đăng ký miễn phí

#### 3️⃣ Build và khởi động services

```bash
# Build tất cả images và start containers
docker compose up --build -d

# Hoặc chỉ start (nếu đã build trước đó)
docker compose up -d
```

#### 4️⃣ Kiểm tra trạng thái

```bash
# Xem logs
docker compose logs -f

# Kiểm tra containers đang chạy
docker compose ps

# Health check (Linux/Mac)
./health-check.sh

# Health check (Windows - Git Bash hoặc WSL)
bash health-check.sh
```

> **⚠️ Windows Troubleshooting**: Nếu gặp lỗi line endings, chạy: `git config core.autocrlf input && git rm --cached -r . && git reset --hard`

#### 5️⃣ Truy cập ứng dụng

| Service | URL | Mô tả |
|---------|-----|-------|
| **Frontend** | http://localhost:3000 | Giao diện người dùng |
| **API Gateway** | http://localhost:8081 | NGINX reverse proxy |
| **FastAPI Docs** | http://localhost:8000/docs | Swagger UI |
| **LangGraph API** | http://localhost:8001 | Chatbot service |
| **PostgreSQL** | localhost:5432 | Database |
| **MinIO** | http://localhost:9000 | Object storage |

### Dừng và xóa dữ liệu

```bash
# Dừng services
docker compose down

# Dừng và xóa volumes (⚠️ Mất dữ liệu!)
docker compose down -v

# Rebuild từ đầu
docker compose down -v && docker compose up --build -d
```

---


