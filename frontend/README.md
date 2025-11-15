# Remedi Frontend

Frontend application cho hệ thống thu gom và trao đổi thuốc.

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **React Hook Form** - Form handling
- **Chart.js** - Data visualization

## 📁 Project Structure

```
frontend/
├── client/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── Layout/       # Layout components
│   ├── pages/            # Page components (routes)
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.tsx   # Authentication hook
│   │   └── useNotifications.tsx
│   ├── lib/              # Utilities
│   │   ├── api.ts        # API client (calls to FastAPI backend)
│   │   └── utils.ts      # Helper functions
│   ├── types/            # TypeScript type definitions
│   └── shared/           # Shared types with backend
├── public/               # Static assets
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind configuration
└── package.json          # Dependencies and scripts
```

## 🚀 Development

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm dev
```

Frontend sẽ chạy tại `http://localhost:8080`

### Build for production

```bash
pnpm build
```

Output sẽ được tạo trong folder `dist/spa/`

## 🔌 API Integration

Frontend kết nối với **FastAPI backend** thông qua Vite proxy:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:80',  // Nginx reverse proxy
    changeOrigin: true,
  }
}
```

Tất cả API calls được thực hiện qua `client/lib/api.ts`:

```typescript
// Example API call
import { apiClient } from "@/lib/api";

// Login
await apiClient.login("user@example.com");

// Get submissions
const submissions = await apiClient.getMySubmissions();

// Submit medicine
await apiClient.submitMedicine({
  id_loai_thuoc: "uuid",
  id_nha_thuoc: "uuid",
  so_luong: 10,
  don_vi_tinh: "viên",
});
```

## 🔐 Authentication

Authentication sử dụng `useAuth` hook:

```typescript
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { user, login, logout } = useAuth();

  // Login
  await login({ email: "user@example.com" });

  // Access current user
  console.log(user.ho_ten, user.role);

  // Logout
  logout();
}
```

User data được lưu trong:

- `localStorage['remedi:user']` - User object
- `localStorage['userId']` - User ID (for API headers)

## 📄 Main Pages

- `/` - Landing page
- `/login` - Login page
- `/register` - Register page
- `/dashboard` - Dashboard (statistics)
- `/medicine-management` - Thu gom & Trao đổi thuốc
- `/review-submissions` - Duyệt hồ sơ (Admin/CTV only)
- `/voucher` - Đổi điểm thưởng
- `/forum` - Diễn đàn
- `/settings` - Cài đặt

## 🎨 UI Components

Sử dụng shadcn/ui components từ `@/components/ui/`:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// ... more components
```

## 🐛 Debugging

Frontend có console logs chi tiết cho mọi action. Xem browser DevTools Console:

- `[MedicineManagement]` - Medicine management logs
- `[API]` - API client logs
- `[useAuth]` - Authentication logs
- `[Dashboard]` - Dashboard logs

Chi tiết xem file `DEBUG_LOGS.md` ở root project.

## 📦 Key Dependencies

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "chart.js": "^4.5.1",
  "react-chartjs-2": "^5.3.1",
  "@radix-ui/*": "Latest",
  "tailwindcss": "^3.4.17",
  "vite": "^7.1.2"
}
```

## 🔗 Related

- Backend API: `../fastapi/` - FastAPI backend
- Database: PostgreSQL
- Reverse Proxy: Nginx

## 📝 Development Notes

- Vite dev server chạy trên port 8080
- API calls được proxy tới `http://localhost:80` (nginx)
- Hot reload enabled
- TypeScript strict mode enabled
