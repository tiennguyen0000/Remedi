import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Settings } from "./Settings";
import { useAuth } from "@/hooks/useAuth";

const NavItem = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </Link>
  );
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[9998] backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/80 border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 grid place-items-center text-white font-bold shadow-md shadow-blue-200">
                R
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Remedi
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-2">
              <NavItem to="/">Trang chủ</NavItem>
              <NavItem to="/submit">Thu gom & Trao đổi thuốc</NavItem>
              <NavItem to="/voucher">Voucher</NavItem>
              <NavItem to="/forum">Diễn đàn</NavItem>
              {user &&
                (user.role === "ADMIN" || user.role === "CONGTACVIEN") && (
                  <NavItem to="/admin">
                    {user.role === "ADMIN" ? "Quản lý hệ thống" : "Kết quả phân loại"}
                  </NavItem>
                )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <button
                onClick={() => setOpen((v) => !v)}
                className="p-2 rounded-md"
                aria-label="Open menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {user ? (
              <>
                <NotificationDropdown />
                <div className="hidden sm:block text-sm mr-1 text-muted-foreground">
                  {user.ho_ten} · {user.role}
                </div>
                <Settings />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-lg hover:bg-accent"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-background border-t">
          <div className="px-4 py-3 flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md"
            >
              Trang chủ
            </Link>
            <Link
              to="/submit"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md"
            >
              Thu gom & Trao đổi thuốc
            </Link>
            <Link
              to="/voucher"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md"
            >
              Voucher
            </Link>
            <Link
              to="/forum"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md"
            >
              Diễn đàn
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md"
            >
              Cài đặt
            </Link>
            {user && (user.role === "ADMIN" || user.role === "CONGTACVIEN") && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md"
              >
                {user.role === "ADMIN" ? "Quản lý hệ thống" : "Kết quả phân loại"}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
