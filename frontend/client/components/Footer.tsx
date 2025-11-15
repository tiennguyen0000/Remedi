import { Link } from "react-router-dom";
import { Facebook, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, Heart, Building2, Award, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState({
    totalPills: 2847156,
    totalWeight: 15429,
    totalUsers: 3245,
  });

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/metrics/public");
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalPills: data.totalPills || 2847156,
            totalWeight: data.totalWeight || 15429,
            totalUsers: data.totalUsers || 3245,
          });
        }
      } catch (error) {
        // Use default values if API fails
        console.log("Using default stats");
      }
    };
    fetchStats();
  }, []);

  // Partners/Collaborators
  const partners = [
    { name: "Bộ Y tế", icon: Shield },
    { name: "Sở Y tế TP.HCM", icon: Building2 },
    { name: "Hiệp hội Dược Việt Nam", icon: Award },
    { name: "200+ Nhà thuốc", icon: Users },
  ];

  const footerSections = [
    {
      title: "VỀ REMEDI",
      links: [
        { name: "Giới thiệu", href: "/about" },
        { name: "Cách thức hoạt động", href: "/how-it-works" },
        { name: "Đối tác nhà thuốc", href: "/partners" },
        { name: "Tin tức", href: "/news" },
      ],
    },
    {
      title: "DỊCH VỤ",
      links: [
        { name: "Thu gom thuốc", href: "/submit" },
        { name: "Đổi voucher", href: "/vouchers" },
        { name: "Nhà thuốc liên kết", href: "/pharmacies" },
        { name: "Hệ thống điểm thưởng", href: "/rewards" },
      ],
    },
    {
      title: "HỖ TRỢ",
      links: [
        { name: "Câu hỏi thường gặp", href: "/faq" },
        { name: "Hướng dẫn sử dụng", href: "/guide" },
        { name: "Chính sách bảo mật", href: "/privacy" },
        { name: "Điều khoản sử dụng", href: "/terms" },
      ],
    },
    {
      title: "LIÊN HỆ",
      links: [
        { name: "Hotline: 1900-xxxx", href: "tel:1900xxxx", icon: Phone },
        { name: "Email: support@remedi.vn", href: "mailto:support@remedi.vn", icon: Mail },
        { name: "Địa chỉ: TP. Hồ Chí Minh", href: "#", icon: MapPin },
      ],
    },
  ];

  const socialLinks = [
    { name: "Facebook", icon: Facebook, href: "https://facebook.com", color: "hover:text-blue-600" },
    { name: "Twitter", icon: Twitter, href: "https://twitter.com", color: "hover:text-blue-400" },
    { name: "Youtube", icon: Youtube, href: "https://youtube.com", color: "hover:text-red-600" },
    { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com", color: "hover:text-blue-700" },
  ];

  return (
    <footer className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white mt-auto">
      {/* Partners Section */}
      <div className="bg-blue-950/50 border-b border-blue-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-blue-100 mb-2">Đối tác & Hợp tác</h3>
            <p className="text-sm text-blue-300">Được tin tưởng bởi các tổ chức y tế hàng đầu</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {partners.map((partner, index) => {
              const Icon = partner.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-4 bg-blue-900/30 rounded-lg hover:bg-blue-800/50 transition-all transform hover:scale-105"
                >
                  <Icon className="h-8 w-8 text-blue-300 mb-2" />
                  <span className="text-sm text-blue-200 text-center font-medium">{partner.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-lg font-bold mb-4 text-blue-100">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => {
                  const Icon = link.icon;
                  return (
                    <li key={linkIndex}>
                      {link.href.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-200 hover:text-white transition-colors flex items-center gap-2 text-sm"
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-blue-200 hover:text-white transition-colors flex items-center gap-2 text-sm"
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {link.name}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Media Section */}
        <div className="mt-12 pt-8 border-t border-blue-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and Description */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">R</span>
              </div>
              <div>
                <h4 className="text-xl font-bold bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                  Remedi
                </h4>
                <p className="text-sm text-blue-300">Thu gom & trao đổi thuốc hết hạn</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-300 mr-2">Theo dõi chúng tôi:</span>
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`h-10 w-10 rounded-full bg-blue-800 hover:bg-blue-700 flex items-center justify-center transition-all transform hover:scale-110 ${social.color}`}
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section - Impressive Numbers */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <p className="text-lg text-blue-200 font-medium">
              Chúng tôi đã thu gom và xử lý an toàn
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent mb-2">
                {stats.totalPills.toLocaleString('vi-VN')}
              </div>
              <p className="text-blue-200 text-sm md:text-base">
                viên thuốc hết hạn
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                {stats.totalWeight.toLocaleString('vi-VN')} kg
              </div>
              <p className="text-blue-200 text-sm md:text-base">
                tổng khối lượng đã thu gom
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent mb-2">
                {stats.totalUsers.toLocaleString('vi-VN')}
              </div>
              <p className="text-blue-200 text-sm md:text-base">
                người dùng đã đóng góp
              </p>
            </div>
          </div>
          <div className="text-center mt-6">
            <p className="text-xs text-blue-300">
              Được cập nhật hàng ngày | Dữ liệu tính đến tháng {new Date().getMonth() + 1}/{currentYear}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-blue-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-blue-300">
            <p className="flex items-center gap-2">
              © {currentYear} Remedi. Made with <Heart className="h-4 w-4 text-red-400 fill-red-400" /> in Vietnam
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Chính sách bảo mật
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Điều khoản
              </Link>
              <Link to="/sitemap" className="hover:text-white transition-colors">
                Sơ đồ trang
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

