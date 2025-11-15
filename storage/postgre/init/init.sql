-- ============================================================
-- REMEDI DATABASE INITIALIZATION SCRIPT
-- Medicine Collection & Exchange Platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS & TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'CONGTACVIEN', 'USER');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'returned_to_pharmacy', 'recalled');
CREATE TYPE notification_type AS ENUM ('SYSTEM', 'SUBMISSION', 'VOUCHER', 'USER', 'FORUM', 'FORUM_COMMENT');
CREATE TYPE voucher_status AS ENUM ('active', 'inactive', 'expired');

-- ============================================================
-- TABLE: users (formerly nguoi_nop)
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ho_ten VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20),
    email VARCHAR(255),
    dia_chi TEXT,
    role user_role NOT NULL DEFAULT 'USER',
    diem_tich_luy INTEGER NOT NULL DEFAULT 0,
    password_hash VARCHAR(255) NOT NULL,
    yeu_cau_cong_tac_vien BOOLEAN NOT NULL DEFAULT false,
    ngay_tao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR so_dien_thoai IS NOT NULL),
    CONSTRAINT unique_email UNIQUE (email),
    CONSTRAINT unique_phone UNIQUE (so_dien_thoai)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(so_dien_thoai) WHERE so_dien_thoai IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);

-- Add current_session_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_id UUID;

-- ============================================================
-- TABLE: user_sessions (User Sessions for Single Login)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- Add foreign key constraint for current_session_id
ALTER TABLE users ADD CONSTRAINT fk_users_current_session 
    FOREIGN KEY (current_session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE: loai_thuoc (Medicine Types)
-- ============================================================

CREATE TABLE loai_thuoc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ten_hoat_chat VARCHAR(255) NOT NULL,
    thuong_hieu VARCHAR(255) NOT NULL,
    ham_luong VARCHAR(100) NOT NULL,
    dang_bao_che VARCHAR(100) NOT NULL,
    ghi_chu TEXT
);

CREATE INDEX idx_loai_thuoc_ten ON loai_thuoc(ten_hoat_chat);
CREATE INDEX idx_loai_thuoc_thuong_hieu ON loai_thuoc(thuong_hieu);

-- ============================================================
-- TABLE: nha_thuoc (Pharmacies)
-- ============================================================

CREATE TABLE nha_thuoc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ten_nha_thuoc VARCHAR(255) NOT NULL,
    dia_chi TEXT NOT NULL,
    so_dien_thoai VARCHAR(20),
    gio_mo_cua VARCHAR(100),
    vi_do DECIMAL(10, 8),
    kinh_do DECIMAL(11, 8),
    ghi_chu TEXT
);

CREATE INDEX idx_nha_thuoc_location ON nha_thuoc(vi_do, kinh_do);

-- ============================================================
-- TABLE: ho_so_xu_ly (Submissions)
-- ============================================================

CREATE TABLE ho_so_xu_ly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_nguoi_nop UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_nha_thuoc UUID NOT NULL REFERENCES nha_thuoc(id) ON DELETE CASCADE,
    id_loai_thuoc UUID NOT NULL REFERENCES loai_thuoc(id) ON DELETE CASCADE,
    so_luong INTEGER NOT NULL,
    don_vi_tinh VARCHAR(50) NOT NULL,
    han_dung DATE,
    ket_qua submission_status NOT NULL DEFAULT 'pending',
    duong_dan_chung_nhan TEXT,
    diem_da_trao INTEGER DEFAULT 0,
    ghi_chu TEXT,
    thoi_gian_xu_ly TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ho_so_xu_ly_user ON ho_so_xu_ly(id_nguoi_nop);
CREATE INDEX idx_ho_so_xu_ly_status ON ho_so_xu_ly(ket_qua);
CREATE INDEX idx_ho_so_xu_ly_date ON ho_so_xu_ly(thoi_gian_xu_ly);

-- ============================================================
-- TABLE: thong_bao (Notifications)
-- ============================================================

CREATE TABLE thong_bao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_nguoi_gui UUID REFERENCES users(id) ON DELETE CASCADE,
    id_nguoi_nhan UUID REFERENCES users(id) ON DELETE CASCADE,
    noi_dung TEXT NOT NULL,
    loai_thong_bao notification_type NOT NULL DEFAULT 'SYSTEM',
    ngay_tao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    da_xem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_thong_bao_receiver ON thong_bao(id_nguoi_nhan);
CREATE INDEX idx_thong_bao_status ON thong_bao(da_xem);
CREATE INDEX idx_thong_bao_date ON thong_bao(ngay_tao);

-- ============================================================
-- TABLE: diem_thuong (Reward Points)
-- ============================================================

CREATE TABLE diem_thuong (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_nguoi_nop UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diem INTEGER NOT NULL,
    ly_do TEXT,
    trang_thai VARCHAR(50),
    ngay_cong TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diem_thuong_user ON diem_thuong(id_nguoi_nop);

-- ============================================================
-- TABLE: voucher (Vouchers)
-- ============================================================

CREATE TABLE voucher (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ten_voucher VARCHAR(255) NOT NULL,
    mo_ta TEXT,
    diem_can_thiet INTEGER NOT NULL,
    so_luong_con_lai INTEGER NOT NULL,
    ngay_het_han DATE,
    trang_thai voucher_status NOT NULL DEFAULT 'active',
    ngay_tao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voucher_status ON voucher(trang_thai);
CREATE INDEX idx_voucher_expiry ON voucher(ngay_het_han);

-- ============================================================
-- TABLE: voucher_usage (Voucher Usage History)
-- ============================================================

CREATE TABLE voucher_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES voucher(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    points_used INTEGER NOT NULL
);

CREATE INDEX idx_voucher_usage_user ON voucher_usage(user_id);
CREATE INDEX idx_voucher_usage_voucher ON voucher_usage(voucher_id);

-- ============================================================
-- TABLE: tieu_chi_phan_loai (Classification Criteria)
-- ============================================================

CREATE TABLE tieu_chi_phan_loai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ma_tieu_chi VARCHAR(50) NOT NULL UNIQUE,
    ten_tieu_chi VARCHAR(255) NOT NULL,
    mo_ta TEXT,
    kieu_du_lieu VARCHAR(20) NOT NULL CHECK (kieu_du_lieu IN ('SO', 'CHUOI', 'BOOL', 'DATE')),
    hoat_dong BOOLEAN NOT NULL DEFAULT true,
    ngay_tao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tieu_chi_ma ON tieu_chi_phan_loai(ma_tieu_chi);
CREATE INDEX idx_tieu_chi_hoat_dong ON tieu_chi_phan_loai(hoat_dong);

-- ============================================================
-- TABLE: ket_qua_phan_loai (Classification Results - Overall)
-- ============================================================

CREATE TABLE ket_qua_phan_loai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ho_so_xu_ly UUID NOT NULL UNIQUE REFERENCES ho_so_xu_ly(id) ON DELETE CASCADE,
    ket_qua_tong VARCHAR(20) NOT NULL CHECK (ket_qua_tong IN ('DAT', 'KHONG_DAT', 'XEM_XET')),
    nguoi_danh_gia UUID REFERENCES users(id) ON DELETE SET NULL,
    ghi_chu_chung TEXT,
    thoi_gian_danh_gia TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ket_qua_ho_so ON ket_qua_phan_loai(id_ho_so_xu_ly);
CREATE INDEX idx_ket_qua_tong ON ket_qua_phan_loai(ket_qua_tong);

-- ============================================================
-- TABLE: chi_tiet_danh_gia (Classification Criteria Details)
-- ============================================================

CREATE TABLE chi_tiet_danh_gia (
    id_ket_qua UUID NOT NULL REFERENCES ket_qua_phan_loai(id) ON DELETE CASCADE,
    id_tieu_chi UUID NOT NULL REFERENCES tieu_chi_phan_loai(id) ON DELETE CASCADE,
    ket_qua VARCHAR(20) NOT NULL CHECK (ket_qua IN ('DAT', 'KHONG_DAT', 'XEM_XET')),
    gia_tri_do VARCHAR(255),
    bang_chung_url TEXT,
    ghi_chu TEXT,
    PRIMARY KEY (id_ket_qua, id_tieu_chi)
);

CREATE INDEX idx_chi_tiet_ket_qua ON chi_tiet_danh_gia(id_ket_qua);
CREATE INDEX idx_chi_tiet_tieu_chi ON chi_tiet_danh_gia(id_tieu_chi);
CREATE INDEX idx_chi_tiet_ket_qua_val ON chi_tiet_danh_gia(ket_qua);

-- ============================================================
-- TABLE: feedback (User Feedback)
-- ============================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_nguoi_nop UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    noi_dung TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    ngay_tao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_user ON feedback(id_nguoi_nop);
CREATE INDEX idx_feedback_date ON feedback(ngay_tao);

-- ============================================================
-- TABLE: forum_posts (Forum Posts with Image/File Support)
-- ============================================================

CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    images TEXT[], -- Array of image URLs (stored in MinIO)
    attachments TEXT[], -- Array of file URLs (stored in MinIO)
    tags TEXT[],
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX idx_forum_posts_tags ON forum_posts USING gin(tags);

-- ============================================================
-- TABLE: forum_comments (Forum Comments with Image Support)
-- ============================================================

CREATE TABLE forum_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    images TEXT[], -- Array of image URLs
    parent_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_comments_post ON forum_comments(post_id);
CREATE INDEX idx_forum_comments_author ON forum_comments(author_id);
CREATE INDEX idx_forum_comments_parent ON forum_comments(parent_id);

-- ============================================================
-- TABLE: message (Chat Messages)
-- ============================================================

CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'user_chat' CHECK (message_type IN ('user_chat', 'admin_chat', 'chatbot')),
    conversation_id UUID, -- For grouping messages in a conversation
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_sender ON message(sender_id);
CREATE INDEX idx_message_recipient ON message(recipient_id);
CREATE INDEX idx_message_conversation ON message(conversation_id);
CREATE INDEX idx_message_type ON message(message_type);
CREATE INDEX idx_message_created ON message(created_at DESC);

-- ============================================================
-- TABLE: message_detail (Message Metadata & Status)
-- ============================================================

CREATE TABLE message_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES message(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_delivered BOOLEAN NOT NULL DEFAULT false,
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- For additional data like attachments, reactions, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_detail_message ON message_detail(message_id);
CREATE INDEX idx_message_detail_user ON message_detail(user_id);
CREATE INDEX idx_message_detail_read ON message_detail(is_read) WHERE is_read = false;
CREATE INDEX idx_message_detail_delivered ON message_detail(is_delivered);

-- Function to update message updated_at
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message updated_at
CREATE TRIGGER trigger_update_message_updated_at
    BEFORE UPDATE ON message
    FOR EACH ROW
    EXECUTE FUNCTION update_message_updated_at();

-- Trigger for message_detail updated_at
CREATE TRIGGER trigger_update_message_detail_updated_at
    BEFORE UPDATE ON message_detail
    FOR EACH ROW
    EXECUTE FUNCTION update_message_updated_at();

-- ============================================================
-- INSERT SAMPLE DATA
-- ============================================================

-- Sample Users (password: password123)
INSERT INTO users (ho_ten, so_dien_thoai, email, dia_chi, role, password_hash, diem_tich_luy, ngay_tao) VALUES
('Nguyen Van A', '0901234567', 'vana@example.com', '123 Nguyen Trai, Hanoi', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 120, '2025-11-09 10:00:00+00'),
('Tran Thi B', '0912345678', 'thib@example.com', '456 Le Loi, HCMC', 'CONGTACVIEN', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 250, '2025-11-08 09:00:00+00'),
('Le Van C', '0923456789', 'admin@example.com', '789 Hai Ba Trung, Hanoi', 'ADMIN', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 500, '2025-11-07 08:00:00+00'),
('Pham Thi D', '0934567890', 'phamtd@example.com', '321 Tran Phu, Da Nang', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 80, '2025-11-06 07:00:00+00'),
('Nguyen Van D', '0945678901', 'nguyend@example.com', '654 Nguyen Hue, HCMC', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 150, '2025-11-05 06:00:00+00'),
('Hoang Thi E', '0956789012', 'hoange@example.com', '22 Bach Dang, Hai Phong', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 200, '2025-11-04 05:00:00+00'),
('Vu Van F', '0967890123', 'vuvf@example.com', '88 Tran Hung Dao, Can Tho', 'CONGTACVIEN', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 310, '2025-11-03 04:00:00+00'),
('Do Thi G', '0978901234', 'dothig@example.com', '100 Ly Thuong Kiet, Hue', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 90, '2025-11-02 03:00:00+00'),
('Bui Van H', '0989012345', 'buih@example.com', '50 Nguyen Van Cu, Nha Trang', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 175, '2025-11-01 02:00:00+00'),
('Le Thi I', '0990123456', 'lethi@example.com', '33 Le Loi, Vung Tau', 'USER', '$2b$12$TMUMjwe3UjP.OAXpIpPwyO6MUQ/VfUCq7ta5IsbKQn98Q2u0FbWk2', 65, '2025-10-31 01:00:00+00');

-- Sample Medicine Types
INSERT INTO loai_thuoc (ten_hoat_chat, thuong_hieu, ham_luong, dang_bao_che, ghi_chu) VALUES
('Paracetamol', 'Hapacol', '500mg', 'Viên nén', 'Thuốc giảm đau, hạ sốt'),
('Ibuprofen', 'Brufen', '400mg', 'Viên nang', 'Chống viêm, giảm đau'),
('Amoxicillin', 'Amoxil', '500mg', 'Viên nang', 'Kháng sinh'),
('Vitamin C', 'Redoxon', '1000mg', 'Viên sủi', 'Bổ sung vitamin'),
('Omeprazole', 'Losec', '20mg', 'Viên nang', 'Thuốc dạ dày'),
('Cetirizine', 'Zyrtec', '10mg', 'Viên nén', 'Thuốc chống dị ứng'),
('Metformin', 'Glucophage', '500mg', 'Viên nén', 'Điều trị tiểu đường type 2'),
('Salbutamol', 'Ventolin', '100mcg', 'Bình xịt', 'Giãn phế quản'),
('Simvastatin', 'Zocor', '20mg', 'Viên nén', 'Hạ mỡ máu'),
('Cefuroxime', 'Zinacef', '250mg', 'Viên nén', 'Kháng sinh cephalosporin'),
('Prednisone', 'Deltasone', '5mg', 'Viên nén', 'Corticosteroid'),
('Aspirin', 'Bayer', '81mg', 'Viên nén', 'Ngăn ngừa huyết khối'),
('Loratadine', 'Claritin', '10mg', 'Viên nén', 'Chống dị ứng thế hệ 2'),
('Atorvastatin', 'Lipitor', '10mg', 'Viên nén', 'Thuốc hạ cholesterol'),
('Losartan', 'Cozaar', '50mg', 'Viên nén', 'Thuốc huyết áp');

-- Sample Pharmacies
INSERT INTO nha_thuoc (ten_nha_thuoc, dia_chi, so_dien_thoai, gio_mo_cua, vi_do, kinh_do, ghi_chu) VALUES
('Nhà thuốc An Khang', '123 Trần Hưng Đạo, Q1, HCMC', '0283123456', '7:00 - 22:00', 10.7769, 106.7009, 'Nhà thuốc uy tín, phục vụ tận tâm'),
('Nhà thuốc Sức Khỏe', '456 Nguyễn Trãi, Thanh Xuân, Hanoi', '0243234567', '6:30 - 23:00', 21.0285, 105.8542, 'Có dịch vụ giao hàng'),
('Nhà thuốc Hạnh Phúc', '789 Lê Lợi, Hải Châu, Da Nang', '0236345678', '7:00 - 21:00', 16.0544, 108.2022, 'Gần bệnh viện C'),
('Nhà thuốc Long Châu', '321 Hai Bà Trưng, Q3, HCMC', '0283456789', '24/7', 10.7860, 106.6917, 'Mở cửa 24/7'),
('Nhà thuốc Minh Châu', '12B Phố Huế, Hai Bà Trưng, Hanoi', '0243940123', '7:00 - 21:00', 21.0035, 105.8470, 'Có dịch vụ tư vấn dược'),
('Nhà thuốc Vạn An', '88 Cách Mạng Tháng 8, Q10, HCMC', '0283912345', '8:00 - 20:00', 10.7735, 106.6930, 'Gần bệnh viện Nhi Đồng'),
('Nhà thuốc Bình An', '50 Bạch Đằng, Ngô Quyền, Hải Phòng', '0225389000', '8:00 - 22:00', 20.8440, 106.6881, 'Phục vụ 24/7 cuối tuần'),
('Nhà thuốc Sông Hồng', '7 Trần Phú, Hà Đông, Hanoi', '0243356789', '7:30 - 20:30', 20.9945, 105.7896, 'Có chương trình thu hồi thuốc'),
('Nhà thuốc Hòa Bình', '14 Đống Đa, Hải Châu, Da Nang', '0236367890', '8:00 - 21:00', 16.0710, 108.2230, 'Có thu mua thuốc hết hạn'),
('Nhà thuốc An Nhiên', '3 Lý Thường Kiệt, TP Huế', '0234321000', '8:00 - 19:00', 16.4672, 107.5906, NULL);

-- Sample Submissions
INSERT INTO ho_so_xu_ly (
    id_nguoi_nop,
    id_nha_thuoc,
    id_loai_thuoc,
    so_luong,
    don_vi_tinh,
    han_dung,
    ket_qua,
    duong_dan_chung_nhan,
    ghi_chu,
    thoi_gian_xu_ly
) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc An Khang'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Paracetamol' AND thuong_hieu = 'Hapacol'),
    20,
    'viên',
    '2026-12-31',
    'approved',
    NULL,
    'Thuốc còn nguyên seal',
    '2025-11-09 11:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Sức Khỏe'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Amoxicillin' AND thuong_hieu = 'Amoxil'),
    10,
    'hộp',
    '2026-06-30',
    'pending',
    NULL,
    'Đã mở nhưng còn đủ',
    '2025-11-09 12:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Hạnh Phúc'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Vitamin C' AND thuong_hieu = 'Redoxon'),
    50,
    'viên',
    '2026-08-15',
    'approved',
    NULL,
    'Bao bì nguyên vẹn',
    '2025-11-08 14:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'hoange@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Long Châu'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Ibuprofen' AND thuong_hieu = 'Brufen'),
    30,
    'viên',
    '2026-10-20',
    'pending',
    NULL,
    'Còn hạn dài',
    '2025-11-10 09:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'dothig@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Minh Châu'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Omeprazole' AND thuong_hieu = 'Losec'),
    15,
    'viên',
    '2026-04-10',
    'rejected',
    NULL,
    'Hạn sử dụng quá ngắn',
    '2025-11-07 16:45:00+00'
),
(
    (SELECT id FROM users WHERE email = 'buih@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Vạn An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Cetirizine' AND thuong_hieu = 'Zyrtec'),
    25,
    'viên',
    '2026-11-30',
    'approved',
    NULL,
    'Chất lượng tốt',
    '2025-11-06 10:20:00+00'
),
(
    (SELECT id FROM users WHERE email = 'lethi@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Bình An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Metformin' AND thuong_hieu = 'Glucophage'),
    40,
    'viên',
    '2026-07-25',
    'pending',
    NULL,
    'Cần kiểm tra kỹ',
    '2025-11-11 13:10:00+00'
),
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Sông Hồng'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Aspirin' AND thuong_hieu = 'Bayer'),
    60,
    'viên',
    '2026-09-05',
    'approved',
    NULL,
    'Số lượng lớn, chất lượng đảm bảo',
    '2025-11-05 11:30:00+00'
);

-- Sample Vouchers
INSERT INTO voucher (ten_voucher, mo_ta, diem_can_thiet, so_luong_con_lai, ngay_het_han, trang_thai) VALUES
('Giảm giá 10%', 'Giảm 10% cho đơn hàng từ 100k', 50, 100, '2026-12-31', 'active'),
('Giảm giá 20%', 'Giảm 20% cho đơn hàng từ 200k', 100, 50, '2026-12-31', 'active'),
('Miễn phí vận chuyển', 'Miễn phí vận chuyển cho mọi đơn hàng', 30, 200, '2026-12-31', 'active'),
('Giảm giá 15%', 'Giảm 15% cho đơn hàng từ 150k', 75, 80, '2026-06-30', 'active'),
('Giảm giá 30%', 'Giảm 30% cho đơn hàng từ 300k - Ưu đãi đặc biệt', 150, 30, '2026-03-31', 'active'),
('Tặng quà tặng', 'Tặng 1 hộp khẩu trang y tế khi mua từ 200k', 80, 60, '2026-12-31', 'active'),
('Voucher VIP', 'Giảm 50% tối đa 500k cho khách hàng VIP', 300, 10, '2026-12-31', 'active'),
('Ưu đãi sinh nhật', 'Giảm 25% nhân dịp sinh nhật hệ thống', 60, 150, '2025-12-31', 'active');

-- Sample Classification Criteria
-- Sample Forum Posts
INSERT INTO forum_posts (author_id, title, content, tags, views, created_at) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
'Cách bảo quản thuốc đúng cách tại nhà', 
'Việc bảo quản thuốc đúng cách rất quan trọng để đảm bảo hiệu quả điều trị. Dưới đây là một số lưu ý:\n\n1. Bảo quản ở nơi khô ráo, thoáng mát\n2. Tránh ánh nắng trực tiếp\n3. Để xa tầm tay trẻ em\n4. Kiểm tra hạn sử dụng thường xuyên',
ARRAY['bảo quản', 'sức khỏe', 'hướng dẫn'], 
    45,
    '2025-11-08 14:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'thib@example.com'),
'Thuốc hết hạn có nên vứt vào thùng rác không?',
'Mọi người cho mình hỏi, thuốc hết hạn thì xử lý thế nào cho đúng? Có nên bỏ vào thùng rác sinh hoạt không?',
ARRAY['môi trường', 'xử lý thuốc'],
    32,
    '2025-11-09 09:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'hoange@example.com'),
'Kinh nghiệm quyên góp thuốc cho người nghèo',
'Mình vừa tham gia chương trình quyên góp thuốc. Chia sẻ một số điều học được:\n\n- Kiểm tra kỹ hạn sử dụng\n- Phân loại theo loại thuốc\n- Đóng gói cẩn thận\n- Ghi rõ thông tin',
ARRAY['từ thiện', 'chia sẻ', 'cộng đồng'],
    67,
    '2025-11-07 10:15:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
'Hỏi về quy trình thu hồi thuốc',
'Cho mình hỏi quy trình thu hồi thuốc ở đây như thế nào? Mình có một số thuốc không dùng hết muốn đóng góp.',
ARRAY['hỏi đáp', 'quy trình'],
    28,
    '2025-11-06 15:20:00+00'
),
(
    (SELECT id FROM users WHERE email = 'dothig@example.com'),
'Chia sẻ về chương trình tích điểm',
'Chương trình tích điểm rất hay! Mình đã đổi được voucher giảm giá. Cảm ơn hệ thống đã tạo động lực cho mọi người tham gia.',
ARRAY['tích điểm', 'ưu đãi', 'chia sẻ'],
    53,
    '2025-11-05 11:40:00+00'
);

-- Sample Forum Comments
INSERT INTO forum_comments (post_id, author_id, content, created_at) VALUES
(
    (SELECT id FROM forum_posts WHERE title = 'Cách bảo quản thuốc đúng cách tại nhà'),
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    'Cảm ơn bạn đã chia sẻ! Rất hữu ích.',
    '2025-11-08 15:00:00+00'
),
(
    (SELECT id FROM forum_posts WHERE title = 'Thuốc hết hạn có nên vứt vào thùng rác không?'),
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    'Không nên vứt vào thùng rác thường. Hãy đem đến các điểm thu gom thuốc hết hạn hoặc nhà thuốc để họ xử lý đúng cách.',
    '2025-11-09 10:00:00+00'
),
(
    (SELECT id FROM forum_posts WHERE title = 'Kinh nghiệm quyên góp thuốc cho người nghèo'),
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    'Bạn làm rất tốt! Mình cũng đang chuẩn bị tham gia chương trình này.',
    '2025-11-07 11:30:00+00'
),
(
    (SELECT id FROM forum_posts WHERE title = 'Kinh nghiệm quyên góp thuốc cho người nghèo'),
    (SELECT id FROM users WHERE email = 'buih@example.com'),
    'Chương trình này rất ý nghĩa. Cảm ơn bạn đã chia sẻ kinh nghiệm.',
    '2025-11-07 14:20:00+00'
),
(
    (SELECT id FROM forum_posts WHERE title = 'Hỏi về quy trình thu hồi thuốc'),
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    'Bạn có thể vào mục "Nộp hồ sơ" để đăng ký thu hồi thuốc. Quy trình rất đơn giản.',
    '2025-11-06 16:00:00+00'
),
(
    (SELECT id FROM forum_posts WHERE title = 'Chia sẻ về chương trình tích điểm'),
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    'Mình cũng vừa đổi voucher! Hệ thống tích điểm rất công bằng và minh bạch.',
    '2025-11-05 13:15:00+00'
);

-- Sample Feedback
INSERT INTO feedback (id_nguoi_nop, noi_dung, rating, ngay_tao) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    'Dịch vụ rất tốt, quy trình nhanh gọn',
    5,
    '2025-11-09 16:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    'Cần cải thiện thời gian xử lý hồ sơ',
    3,
    '2025-11-09 17:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'hoange@example.com'),
    'Hệ thống dễ sử dụng, giao diện thân thiện',
    5,
    '2025-11-08 14:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    'Chương trình tích điểm rất hấp dẫn!',
    4,
    '2025-11-07 10:45:00+00'
),
(
    (SELECT id FROM users WHERE email = 'buih@example.com'),
    'Cảm ơn đã có điểm thu gom thuốc tiện lợi',
    5,
    '2025-11-06 09:20:00+00'
),
(
    (SELECT id FROM users WHERE email = 'dothig@example.com'),
    'Nên thêm nhiều voucher hơn',
    4,
    '2025-11-05 16:10:00+00'
),
(
    (SELECT id FROM users WHERE email = 'lethi@example.com'),
    'App chạy mượt, không bị lag',
    5,
    '2025-11-04 11:55:00+00'
);

-- Sample Classification Criteria
INSERT INTO tieu_chi_phan_loai (ma_tieu_chi, ten_tieu_chi, mo_ta, kieu_du_lieu, hoat_dong) VALUES
('HSD_THANG_TOI_THIEU', 'Hạn sử dụng tối thiểu (tháng)', 'Thuốc phải còn ít nhất 6 tháng hạn sử dụng', 'SO', true),
('TINH_TRANG_BAO_BI', 'Tình trạng bao bì', 'Bao bì phải còn nguyên vẹn, không rách nát', 'CHUOI', true),
('CO_HOA_DON', 'Có hóa đơn mua hàng', 'Thuốc cần có hóa đơn hoặc tem phiếu hợp lệ', 'BOOL', true),
('DANG_BAO_CHE_HOP_LE', 'Dạng bào chế hợp lệ', 'Chỉ nhận viên nén, viên nang, dung dịch đóng chai', 'CHUOI', true),
('SO_LUONG_TOI_THIEU', 'Số lượng tối thiểu', 'Tối thiểu 10 viên/hộp', 'SO', true),
('NGUON_GOC_RO_RANG', 'Nguồn gốc rõ ràng', 'Thuốc phải có nguồn gốc xuất xứ rõ ràng', 'BOOL', true),
('KHONG_BI_BAN', 'Không bị bẩn/hư hỏng', 'Thuốc không bị ẩm mốc, biến dạng, đổi màu', 'CHUOI', true),
('NHAN_MAC_DAY_DU', 'Nhãn mác đầy đủ', 'Phải có đầy đủ thông tin trên nhãn', 'BOOL', true);

-- Sample Reward Points
INSERT INTO diem_thuong (id_nguoi_nop, diem, ly_do, trang_thai) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    20,
    'Nộp thuốc Paracetamol - Hồ sơ đạt yêu cầu',
    'COMPLETED'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    50,
    'Nộp thuốc Vitamin C - Số lượng lớn, chất lượng tốt',
    'COMPLETED'
),
(
    (SELECT id FROM users WHERE email = 'buih@example.com'),
    25,
    'Nộp thuốc Cetirizine - Bao bì nguyên vẹn',
    'COMPLETED'
),
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    60,
    'Nộp thuốc Aspirin - Số lượng lớn, chất lượng xuất sắc',
    'COMPLETED'
);

-- Sample Classification Results
-- Result 1: Approved submission - All criteria passed
INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia) VALUES
(
    'a1b2c3d4-e5f6-4789-a012-345678901234',
    (SELECT id FROM ho_so_xu_ly WHERE ghi_chu = 'Thuốc còn nguyên seal' LIMIT 1),
    'DAT',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    'Hồ sơ đạt tất cả tiêu chí. Thuốc chất lượng tốt, đóng gói cẩn thận.',
    '2025-11-09 11:15:00+00'
);

INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu) VALUES
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_THANG_TOI_THIEU'), 'DAT', '13 tháng', 'Còn hạn dài'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TINH_TRANG_BAO_BI'), 'DAT', 'Nguyên seal', 'Bao bì hoàn hảo'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_HOA_DON'), 'DAT', 'Có', 'Có hóa đơn VAT'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'DANG_BAO_CHE_HOP_LE'), 'DAT', 'Viên nén', NULL),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'SO_LUONG_TOI_THIEU'), 'DAT', '20 viên', 'Đủ số lượng'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NGUON_GOC_RO_RANG'), 'DAT', 'Có', 'Nhà thuốc uy tín'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KHONG_BI_BAN'), 'DAT', 'Sạch sẽ', 'Không dấu hiệu hư hỏng'),
('a1b2c3d4-e5f6-4789-a012-345678901234', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_MAC_DAY_DU'), 'DAT', 'Có', 'Đầy đủ thông tin');

-- Result 2: Approved submission - Vitamin C
INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia) VALUES
(
    'b2c3d4e5-f6a7-4890-b123-456789012345',
    (SELECT id FROM ho_so_xu_ly WHERE ghi_chu = 'Bao bì nguyên vẹn' LIMIT 1),
    'DAT',
    (SELECT id FROM users WHERE role = 'CONGTACVIEN' LIMIT 1),
    'Đạt yêu cầu. Vitamin C chất lượng cao.',
    '2025-11-08 14:45:00+00'
);

INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu) VALUES
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_THANG_TOI_THIEU'), 'DAT', '9 tháng', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TINH_TRANG_BAO_BI'), 'DAT', 'Nguyên vẹn', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_HOA_DON'), 'DAT', 'Có', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'DANG_BAO_CHE_HOP_LE'), 'DAT', 'Viên sủi', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'SO_LUONG_TOI_THIEU'), 'DAT', '50 viên', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NGUON_GOC_RO_RANG'), 'DAT', 'Có', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KHONG_BI_BAN'), 'DAT', 'Tốt', NULL),
('b2c3d4e5-f6a7-4890-b123-456789012345', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_MAC_DAY_DU'), 'DAT', 'Có', NULL);

-- Result 3: Rejected submission - Short expiry date
INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia) VALUES
(
    'c3d4e5f6-a7b8-4901-c234-567890123456',
    (SELECT id FROM ho_so_xu_ly WHERE ghi_chu = 'Hạn sử dụng quá ngắn' LIMIT 1),
    'KHONG_DAT',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    'Không đạt do hạn sử dụng quá ngắn (chỉ còn 4 tháng). Không đủ điều kiện thu hồi.',
    '2025-11-07 16:30:00+00'
);

INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu) VALUES
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_THANG_TOI_THIEU'), 'KHONG_DAT', '4 tháng', 'Không đủ 6 tháng tối thiểu'),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TINH_TRANG_BAO_BI'), 'DAT', 'Bình thường', NULL),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_HOA_DON'), 'XEM_XET', 'Không có', 'Chỉ có tem phiếu'),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'DANG_BAO_CHE_HOP_LE'), 'DAT', 'Viên nang', NULL),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'SO_LUONG_TOI_THIEU'), 'DAT', '15 viên', NULL),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NGUON_GOC_RO_RANG'), 'DAT', 'Có', NULL),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KHONG_BI_BAN'), 'DAT', 'Tốt', NULL),
('c3d4e5f6-a7b8-4901-c234-567890123456', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_MAC_DAY_DU'), 'DAT', 'Có', NULL);

-- Result 4: Under review - Cetirizine
INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia) VALUES
(
    'd4e5f6a7-b8c9-4012-d345-678901234567',
    (SELECT id FROM ho_so_xu_ly WHERE ghi_chu = 'Chất lượng tốt' LIMIT 1),
    'XEM_XET',
    (SELECT id FROM users WHERE role = 'CONGTACVIEN' LIMIT 1),
    'Cần xem xét thêm về nguồn gốc. Đang chờ bổ sung giấy tờ.',
    '2025-11-06 10:30:00+00'
);

INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu) VALUES
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_THANG_TOI_THIEU'), 'DAT', '11 tháng', NULL),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TINH_TRANG_BAO_BI'), 'DAT', 'Tốt', NULL),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_HOA_DON'), 'XEM_XET', 'Chưa có', 'Đang yêu cầu bổ sung'),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'DANG_BAO_CHE_HOP_LE'), 'DAT', 'Viên nén', NULL),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'SO_LUONG_TOI_THIEU'), 'DAT', '25 viên', NULL),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NGUON_GOC_RO_RANG'), 'XEM_XET', 'Chưa rõ', 'Cần xác minh'),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KHONG_BI_BAN'), 'DAT', 'Tốt', NULL),
('d4e5f6a7-b8c9-4012-d345-678901234567', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_MAC_DAY_DU'), 'DAT', 'Có', NULL);

-- Result 5: Approved - Aspirin
INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia) VALUES
(
    'e5f6a7b8-c9d0-4123-e456-789012345678',
    (SELECT id FROM ho_so_xu_ly WHERE ghi_chu = 'Số lượng lớn, chất lượng đảm bảo' LIMIT 1),
    'DAT',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    'Hồ sơ xuất sắc. Số lượng lớn, chất lượng cao. Đề xuất thưởng điểm cao.',
    '2025-11-05 11:45:00+00'
);

INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu) VALUES
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_THANG_TOI_THIEU'), 'DAT', '10 tháng', 'Đủ hạn sử dụng'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TINH_TRANG_BAO_BI'), 'DAT', 'Xuất sắc', 'Đóng gói chuyên nghiệp'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_HOA_DON'), 'DAT', 'Có', 'Hóa đơn điện tử'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'DANG_BAO_CHE_HOP_LE'), 'DAT', 'Viên nén', NULL),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'SO_LUONG_TOI_THIEU'), 'DAT', '60 viên', 'Số lượng lớn'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NGUON_GOC_RO_RANG'), 'DAT', 'Có', 'Nguồn gốc rõ ràng'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KHONG_BI_BAN'), 'DAT', 'Hoàn hảo', 'Như mới'),
('e5f6a7b8-c9d0-4123-e456-789012345678', (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_MAC_DAY_DU'), 'DAT', 'Có', 'Đầy đủ chi tiết');

-- Sample Notifications
INSERT INTO thong_bao (id_nguoi_nhan, loai_thong_bao, noi_dung, da_xem) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    'SYSTEM',
    '✅ Hồ sơ nộp Paracetamol của bạn đã được duyệt. Bạn nhận được 20 điểm thưởng!',
    1
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    'SYSTEM',
    '⏳ Hồ sơ nộp Amoxicillin của bạn đang được xem xét.',
    0
),
(
    (SELECT id FROM users WHERE email = 'hoange@example.com'),
    'SYSTEM',
    '📋 Hồ sơ nộp Ibuprofen đã được tiếp nhận và đang chờ duyệt.',
    0
),
(
    (SELECT id FROM users WHERE email = 'dothig@example.com'),
    'SYSTEM',
    '❌ Rất tiếc, hồ sơ Omeprazole của bạn bị từ chối do hạn sử dụng quá ngắn.',
    1
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    'SYSTEM',
    '🎉 Chúc mừng! Bạn nhận được 50 điểm thưởng từ hồ sơ đã nộp.',
    1
),
(
    (SELECT id FROM users WHERE email = 'buih@example.com'),
    'SYSTEM',
    '🎁 Bạn có đủ điểm để đổi voucher "Giảm giá 10%". Hãy kiểm tra ngay!',
    0
);

-- ============================================================
-- COMPLETED
-- ============================================================
-- Database initialized successfully
-- Default password for all users: password123
-- MinIO configured for image/file storage
-- ============================================================


-- ============================================================
-- ADDITIONAL INSERTS (keeping existing users unchanged)
-- ============================================================

-- ========== MORE Medicine Types (loai_thuoc) ==========
-- Removed duplicate medicine types that were already inserted above
INSERT INTO loai_thuoc (ten_hoat_chat, thuong_hieu, ham_luong, dang_bao_che, ghi_chu) VALUES
('Lorazepam', 'Ativan', '1mg', 'Viên nén', 'Thuốc an thần ngắn ngày'),
('Insulin Glargine', 'Lantus', '100IU/ml', 'Ống tiêm', 'Insulin tác dụng kéo dài');

-- ========== MORE Pharmacies (nha_thuoc) ==========
-- Removed duplicate pharmacies that were already inserted above
INSERT INTO nha_thuoc (ten_nha_thuoc, dia_chi, so_dien_thoai, gio_mo_cua, vi_do, kinh_do, ghi_chu) VALUES
('Nhà thuốc Phúc Lộc', '90 Nguyễn Văn Cừ, Nha Trang', '0258371234', '7:00 - 22:00', 12.2447, 109.1945, 'Nhận thu gom trả điểm'),
('Nhà thuốc Trường Sơn', '200 Lê Lợi, Vinh', '0238381234', '8:00 - 20:00', 18.6796, 105.6817, NULL);

-- ========== MORE Submissions (ho_so_xu_ly) ==========
INSERT INTO ho_so_xu_ly (
    id_nguoi_nop,
    id_nha_thuoc,
    id_loai_thuoc,
    so_luong,
    don_vi_tinh,
    han_dung,
    ket_qua,
    duong_dan_chung_nhan,
    ghi_chu,
    thoi_gian_xu_ly
) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Minh Châu'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Cetirizine' AND thuong_hieu = 'Zyrtec'),
    30,
    'viên',
    '2026-05-01',
    'approved',
    NULL,
    'Còn 95%',
    '2025-11-10 08:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Vạn An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Lorazepam' AND thuong_hieu = 'Ativan'),
    5,
    'hộp',
    '2025-12-15',
    'pending',
    NULL,
    'Mở 1 hộp, còn 80%',
    '2025-11-10 09:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Bình An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Metformin' AND thuong_hieu = 'Glucophage'),
    50,
    'ống',
    '2027-01-01',
    'approved',
    NULL,
    'Hộp nguyên',
    '2025-11-10 09:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Sông Hồng'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Salbutamol' AND thuong_hieu = 'Ventolin'),
    2,
    'bình',
    '2025-11-30',
    'rejected',
    NULL,
    'Lọ bị vỡ',
    '2025-11-10 10:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Hòa Bình'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Simvastatin' AND thuong_hieu = 'Zocor'),
    120,
    'viên',
    '2028-06-30',
    'approved',
    NULL,
    'Số lượng lớn, kiểm tra kỹ',
    '2025-11-10 10:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc An Nhiên'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Cefuroxime' AND thuong_hieu = 'Zinacef'),
    12,
    'viên',
    '2026-03-15',
    'pending',
    NULL,
    'Cần kiểm tra hóa đơn',
    '2025-11-10 11:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Phúc Lộc'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Prednisone' AND thuong_hieu = 'Deltasone'),
    25,
    'viên',
    '2026-09-01',
    'approved',
    NULL,
    'Chất lượng tốt',
    '2025-11-10 11:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Trường Sơn'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Aspirin' AND thuong_hieu = 'Bayer'),
    3,
    'hộp',
    '2025-12-01',
    'pending',
    NULL,
    'Gói nhỏ',
    '2025-11-10 12:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Minh Châu'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Loratadine' AND thuong_hieu = 'Claritin'),
    6,
    'ống',
    '2026-08-20',
    'approved',
    NULL,
    'Đóng nguyên seal',
    '2025-11-10 12:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Vạn An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Insulin Glargine' AND thuong_hieu = 'Lantus'),
    1,
    'ống',
    '2025-11-25',
    'pending',
    NULL,
    'Lọ insulin chưa mở',
    '2025-11-10 13:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Bình An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Paracetamol' AND thuong_hieu = 'Hapacol'),
    15,
    'viên',
    '2026-02-28',
    'approved',
    NULL,
    'Hộp còn tem',
    '2025-11-10 13:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Sông Hồng'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Ibuprofen' AND thuong_hieu = 'Brufen'),
    8,
    'hộp',
    '2026-04-15',
    'pending',
    NULL,
    'Mở 2 hộp',
    '2025-11-10 14:00:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Hòa Bình'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Amoxicillin' AND thuong_hieu = 'Amoxil'),
    40,
    'viên',
    '2027-03-01',
    'approved',
    NULL,
    'Số lượng tiêu chuẩn',
    '2025-11-10 14:30:00+00'
);

-- ========== MORE Vouchers (voucher) ==========
INSERT INTO voucher (ten_voucher, mo_ta, diem_can_thiet, so_luong_con_lai, ngay_het_han, trang_thai, ngay_tao) VALUES
('Voucher 5k', 'Giảm 5k cho đơn hàng từ 50k', 20, 500, '2026-06-30', 'active', '2025-11-10 07:00:00+00'),
('Voucher 15%', 'Giảm 15% cho đơn hàng từ 150k', 150, 200, '2026-12-31', 'active', '2025-11-10 07:10:00+00'),
('Voucher Free Gift', 'Quà tặng khi mua trên 200k', 200, 50, '2027-03-31', 'active', '2025-11-10 07:20:00+00'),
('Voucher 50k', 'Giảm 50k cho đơn hàng trên 500k', 400, 30, '2026-09-30', 'active', '2025-11-10 07:30:00+00'),
('Voucher BOGOF', 'Mua 1 tặng 1 (áp dụng sản phẩm chọn lọc)', 250, 100, '2026-05-31', 'active', '2025-11-10 07:40:00+00'),
('Voucher Ship 0đ', 'Miễn phí vận chuyển cho đơn hàng >100k', 30, 1000, '2028-01-01', 'active', '2025-11-10 07:50:00+00'),
('Voucher NewUser', 'Giảm cho người dùng mới', 10, 100, '2026-12-31', 'inactive', '2025-11-10 08:00:00+00'),
('Voucher Weekend', 'Giảm 10% cuối tuần', 40, 300, '2026-11-30', 'active', '2025-11-10 08:10:00+00'),
('Voucher Member', 'Giảm dành cho thành viên Silver trở lên', 60, 150, '2027-06-30', 'active', '2025-11-10 08:20:00+00'),
('Voucher Holiday', 'Ưu đãi dịp lễ', 80, 500, '2026-12-25', 'active', '2025-11-10 08:30:00+00'),
('Voucher FlashSale', 'Giảm lớn trong khung giờ Flash', 120, 50, '2025-12-31', 'active', '2025-11-10 08:40:00+00'),
('Voucher Student', 'Ưu đãi sinh viên', 25, 400, '2027-09-30', 'active', '2025-11-10 08:50:00+00');

-- ========== Voucher Usage (voucher_usage) ==========
INSERT INTO voucher_usage (voucher_id, user_id, redeemed_at, points_used) VALUES
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 5k' LIMIT 1), (SELECT id FROM users WHERE email = 'vana@example.com' LIMIT 1), '2025-11-09 18:00:00+00', 20),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 15%' LIMIT 1), (SELECT id FROM users WHERE email = 'thib@example.com' LIMIT 1), '2025-11-09 18:30:00+00', 150),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Free Gift' LIMIT 1), (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1), '2025-11-09 19:00:00+00', 200),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 50k' LIMIT 1), (SELECT id FROM users WHERE email = 'phamtd@example.com' LIMIT 1), '2025-11-09 19:30:00+00', 400),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher BOGOF'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), '2025-11-09 20:00:00+00', 250),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Ship 0đ'), (SELECT id FROM users WHERE email = 'vana@example.com'), '2025-11-10 09:00:00+00', 30),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher NewUser'), (SELECT id FROM users WHERE email = 'thib@example.com'), '2025-11-10 09:15:00+00', 10),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Weekend'), (SELECT id FROM users WHERE email = 'admin@example.com'), '2025-11-10 09:30:00+00', 40),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Member'), (SELECT id FROM users WHERE email = 'phamtd@example.com'), '2025-11-10 09:45:00+00', 60),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Holiday'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), '2025-11-10 10:00:00+00', 80),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher FlashSale'), (SELECT id FROM users WHERE email = 'vana@example.com'), '2025-11-10 10:15:00+00', 120),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Student'), (SELECT id FROM users WHERE email = 'thib@example.com'), '2025-11-10 10:30:00+00', 25),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 5k'), (SELECT id FROM users WHERE email = 'admin@example.com'), '2025-11-10 11:00:00+00', 20),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 15%'), (SELECT id FROM users WHERE email = 'phamtd@example.com'), '2025-11-10 11:30:00+00', 150),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Free Gift'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), '2025-11-10 12:00:00+00', 200);

-- ========== MORE Classification Criteria (tieu_chi_phan_loai) ==========
INSERT INTO tieu_chi_phan_loai (ma_tieu_chi, ten_tieu_chi, mo_ta, kieu_du_lieu, hoat_dong, ngay_tao) VALUES
('TEM_NHAN_HOP_LE', 'Tem nhãn hợp lệ', 'Kiểm tra tem bảo hành/nhãn mác', 'BOOL', true, '2025-11-10 06:00:00+00'),
('NHUONG_TINH_CHAT', 'Không thuộc chất bị cấm', 'Không chứa chất cấm/thuốc phiện', 'BOOL', true, '2025-11-10 06:05:00+00'),
('TONG_TRONG', 'Trọng lượng/khối lượng', 'So sánh khối lượng với tiêu chuẩn', 'SO', true, '2025-11-10 06:10:00+00'),
('NHAN_HIEU_HOP_LE', 'Thuộc nhãn hiệu an toàn', 'Nhãn hiệu và logo hợp lệ', 'CHUOI', true, '2025-11-10 06:15:00+00'),
('KIEM_TRA_NUOC', 'Kiểm tra chất lỏng', 'Không có tạp chất hoặc đổi màu', 'CHUOI', true, '2025-11-10 06:20:00+00'),
('NHAN_BAO_QUAN', 'Phương thức bảo quản đúng', 'Bảo quản theo hướng dẫn nhà sản xuất', 'CHUOI', true, '2025-11-10 06:25:00+00'),
('HSD_TOI_DA', 'Hạn sử dụng còn ít nhất 12 tháng', 'Yêu cầu 12 tháng cho một số thuốc', 'SO', true, '2025-11-10 06:30:00+00'),
('CO_TEM_KIEM_DINH', 'Có tem kiểm định', 'Tem kiểm định hợp lệ nếu có', 'BOOL', true, '2025-11-10 06:35:00+00');

-- ========== Classification Results (ket_qua_phan_loai) for new submissions ==========
-- COMMENTED OUT: This INSERT has incorrect column structure. 
-- The columns id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url belong to chi_tiet_danh_gia table, not ket_qua_phan_loai.
-- TODO: Properly restructure this data if needed in the future.
/*
INSERT INTO ket_qua_phan_loai (id_ho_so_xu_ly, id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url, ghi_chu, thoi_gian_danh_gia) VALUES
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'vana@example.com') AND thoi_gian_xu_ly = '2025-11-10 08:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TEM_NHAN_HOP_LE'),
    'DAT',
    'TRUE',
    NULL,
    'Tem ok',
    '2025-11-10 09:00:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'vana@example.com') AND thoi_gian_xu_ly = '2025-11-10 08:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHUONG_TINH_CHAT'),
    'DAT',
    'TRUE',
    NULL,
    'Không chất cấm',
    '2025-11-10 09:05:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'thib@example.com') AND thoi_gian_xu_ly = '2025-11-10 09:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TONG_TRONG'),
    'XEM_XET',
    '5',
    NULL,
    'Khối lượng thấp',
    '2025-11-10 09:40:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'admin@example.com') AND thoi_gian_xu_ly = '2025-11-10 09:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_HIEU_HOP_LE'),
    'DAT',
    'Zin',
    NULL,
    'Nhãn đúng',
    '2025-11-10 10:00:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'phamtd@example.com') AND thoi_gian_xu_ly = '2025-11-10 10:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KIEM_TRA_NUOC'),
    'KHONG_DAT',
    'Bị vỡ',
    NULL,
    'Lọ bị rò',
    '2025-11-10 10:20:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'nguyend@example.com') AND thoi_gian_xu_ly = '2025-11-10 10:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_BAO_QUAN'),
    'DAT',
    'Giữ nhiệt độ tốt',
    NULL,
    'Bảo quản tốt',
    '2025-11-10 10:40:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'vana@example.com') AND thoi_gian_xu_ly = '2025-11-10 11:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'HSD_TOI_DA'),
    'XEM_XET',
    '6',
    NULL,
    'HSD < 6 tháng, yêu cầu kiểm tra',
    '2025-11-10 11:20:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'thib@example.com') AND thoi_gian_xu_ly = '2025-11-10 11:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'CO_TEM_KIEM_DINH'),
    'DAT',
    'TRUE',
    NULL,
    'Có tem kiểm định',
    '2025-11-10 11:40:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'nguyend@example.com') AND thoi_gian_xu_ly = '2025-11-10 12:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TEM_NHAN_HOP_LE'),
    'DAT',
    'TRUE',
    NULL,
    'HSD đủ',
    '2025-11-10 12:10:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'vana@example.com') AND thoi_gian_xu_ly = '2025-11-10 13:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHUONG_TINH_CHAT'),
    'DAT',
    'TRUE',
    NULL,
    'Nguồn gốc ok',
    '2025-11-10 12:40:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'thib@example.com') AND thoi_gian_xu_ly = '2025-11-10 13:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TONG_TRONG'),
    'DAT',
    '10',
    NULL,
    'Trọng lượng đúng',
    '2025-11-10 13:10:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'admin@example.com') AND thoi_gian_xu_ly = '2025-11-10 14:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'NHAN_HIEU_HOP_LE'),
    'XEM_XET',
    'Nhãn mờ',
    NULL,
    'Cần kiểm tra thêm',
    '2025-11-10 13:40:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'phamtd@example.com') AND thoi_gian_xu_ly = '2025-11-10 14:30:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'KIEM_TRA_NUOC'),
    'DAT',
    'Không đổi màu',
    NULL,
    'Chất lỏng bình thường',
    '2025-11-10 14:10:00+00'
),
(
    (SELECT id FROM ho_so_xu_ly WHERE id_nguoi_nop = (SELECT id FROM users WHERE email = 'vana@example.com') AND thoi_gian_xu_ly = '2025-11-09 11:00:00+00'),
    (SELECT id FROM tieu_chi_phan_loai WHERE ma_tieu_chi = 'TEM_NHAN_HOP_LE'),
    'DAT',
    'TRUE',
    NULL,
    'HSD ok',
    '2025-11-10 15:00:00+00'
);
*/

-- ========== MORE Notifications (thong_bao) ==========
INSERT INTO thong_bao (id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem) VALUES
(NULL, (SELECT id FROM users WHERE email = 'vana@example.com'), 'Hồ sơ của bạn đã được duyệt.', 'SUBMISSION', '2025-11-09 11:05:00+00', 0),
(NULL, (SELECT id FROM users WHERE email = 'thib@example.com'), 'Bạn có voucher mới.', 'VOUCHER', '2025-11-09 12:00:00+00', 0),
((SELECT id FROM users WHERE email = 'admin@example.com'), (SELECT id FROM users WHERE email = 'vana@example.com'), 'Yêu cầu bổ sung hóa đơn.', 'SYSTEM', '2025-11-09 12:30:00+00', 0),
(NULL, (SELECT id FROM users WHERE email = 'admin@example.com'), 'Bạn được nâng cấp thành cộng tác viên.', 'SYSTEM', '2025-11-09 13:00:00+00', 1),
(NULL, (SELECT id FROM users WHERE email = 'phamtd@example.com'), 'Có bình luận mới trên bài viết của bạn.', 'USER', '2025-11-09 14:00:00+00', 0),
(NULL, (SELECT id FROM users WHERE email = 'nguyend@example.com'), 'Voucher sắp hết hạn trong 7 ngày.', 'VOUCHER', '2025-11-10 06:00:00+00', 0),
((SELECT id FROM users WHERE email = 'admin@example.com'), (SELECT id FROM users WHERE email = 'vana@example.com'), 'Cảm ơn bạn đã đóng góp.', 'USER', '2025-11-10 06:30:00+00', 1),
(NULL, (SELECT id FROM users WHERE email = 'thib@example.com'), 'Hệ thống bảo trì định kỳ.', 'SYSTEM', '2025-11-10 07:00:00+00', 0);

-- ========== MORE Reward Points (diem_thuong) ==========

-- ========== MORE Forum Posts ==========
INSERT INTO forum_posts (author_id, title, content, images, attachments, tags, views, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email = 'thib@example.com'), 'Kinh nghiệm giao nhận thuốc an toàn', 'Chia sẻ cách đóng gói và giao thuốc an toàn khi trao đổi.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['giao nhận', 'an toàn'], 12, '2025-11-09 10:00:00+00', '2025-11-09 10:00:00+00'),
((SELECT id FROM users WHERE email = 'vana@example.com'), 'Nên giữ hóa đơn trong bao lâu?', 'Thảo luận thời hạn lưu trữ hóa đơn mua thuốc.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['hóa đơn', 'lưu trữ'], 8, '2025-11-09 11:00:00+00', '2025-11-09 11:00:00+00'),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'Ai thu gom thuốc hết hạn tại Hà Nội?', 'Tìm địa điểm thu gom thuốc hết hạn tại Hà Nội.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['thu gom', 'hà nội'], 21, '2025-11-09 12:00:00+00', '2025-11-09 12:00:00+00'),
((SELECT id FROM users WHERE email = 'phamtd@example.com'), 'Làm sao kiểm tra hạn sử dụng nhanh?', 'Cách đọc hạn sử dụng trên bao bì.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['hdsd', 'hướng dẫn'], 10, '2025-11-09 13:00:00+00', '2025-11-09 13:00:00+00'),
((SELECT id FROM users WHERE email = 'nguyend@example.com'), 'Các loại bao bì an toàn cho thuốc', 'So sánh bao bì và mức độ an toàn.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['bao bì', 'an toàn'], 7, '2025-11-09 14:30:00+00', '2025-11-09 14:30:00+00'),
((SELECT id FROM users WHERE email = 'vana@example.com'), 'Giải đáp về thu đổi điểm voucher', 'Hỏi đáp cách dùng điểm đổi voucher.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['voucher', 'điểm'], 16, '2025-11-09 15:00:00+00', '2025-11-09 15:00:00+00'),
((SELECT id FROM users WHERE email = 'thib@example.com'), 'Cách phân loại thuốc cũ và mới', 'Tiêu chí phân loại thuốc khi nhận đổi.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['phân loại', 'tiêu chí'], 9, '2025-11-09 16:00:00+00', '2025-11-09 16:00:00+00'),
((SELECT id FROM users WHERE email = 'admin@example.com'), 'Chia sẻ điểm tích lũy hữu ích', 'Cách tích lũy điểm nhanh và an toàn.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['điểm', 'kinh nghiệm'], 5, '2025-11-09 17:00:00+00', '2025-11-09 17:00:00+00'),
((SELECT id FROM users WHERE email = 'phamtd@example.com'), 'Ai có kinh nghiệm gửi thuốc từ tỉnh lên TP?', 'Logistics gửi thuốc giữa tỉnh và thành phố.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['logistics'], 4, '2025-11-09 18:00:00+00', '2025-11-09 18:00:00+00'),
((SELECT id FROM users WHERE email = 'nguyend@example.com'), 'Thuốc không còn tem có nên nhận?', 'Kinh nghiệm xử lý trường hợp mất tem.', ARRAY[]::text[], ARRAY[]::text[], ARRAY['tem', 'quy định'], 14, '2025-11-09 19:00:00+00', '2025-11-09 19:00:00+00');

-- ========== MORE Forum Comments ==========
INSERT INTO forum_comments (post_id, author_id, content, images, parent_id, created_at, updated_at) VALUES
((SELECT id FROM forum_posts WHERE title = 'Kinh nghiệm giao nhận thuốc an toàn'), (SELECT id FROM users WHERE email = 'vana@example.com'), 'Cần đóng gói bằng túi chống sốc và cách ly hóa chất.', ARRAY[]::text[], NULL, '2025-11-09 10:30:00+00', '2025-11-09 10:30:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Nên giữ hóa đơn trong bao lâu?'), (SELECT id FROM users WHERE email = 'thib@example.com'), 'Giữ hóa đơn ít nhất 2 năm theo quy định.', ARRAY[]::text[], NULL, '2025-11-09 11:10:00+00', '2025-11-09 11:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Ai thu gom thuốc hết hạn tại Hà Nội?'), (SELECT id FROM users WHERE email = 'admin@example.com'), 'Tôi biết vài điểm thu gom ở Hà Nội, sẽ cập nhật sau.', ARRAY[]::text[], NULL, '2025-11-09 12:10:00+00', '2025-11-09 12:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Làm sao kiểm tra hạn sử dụng nhanh?'), (SELECT id FROM users WHERE email = 'phamtd@example.com'), 'Dùng điện thoại chụp close-up để kiểm tra hạn.', ARRAY[]::text[], NULL, '2025-11-09 13:10:00+00', '2025-11-09 13:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Các loại bao bì an toàn cho thuốc'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), 'Bao bì thủy tinh kín khí là tốt nhất.', ARRAY[]::text[], NULL, '2025-11-09 14:40:00+00', '2025-11-09 14:40:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Giải đáp về thu đổi điểm voucher'), (SELECT id FROM users WHERE email = 'vana@example.com'), 'Dùng điểm để đổi voucher là cách tiết kiệm.', ARRAY[]::text[], NULL, '2025-11-09 15:10:00+00', '2025-11-09 15:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Cách phân loại thuốc cũ và mới'), (SELECT id FROM users WHERE email = 'thib@example.com'), 'Nên phân loại theo dạng bào chế trước khi nhận.', ARRAY[]::text[], NULL, '2025-11-09 16:10:00+00', '2025-11-09 16:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Chia sẻ điểm tích lũy hữu ích'), (SELECT id FROM users WHERE email = 'admin@example.com'), 'Tôi đổi voucher sau khi nộp 3 lần.', ARRAY[]::text[], NULL, '2025-11-09 17:10:00+00', '2025-11-09 17:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Ai có kinh nghiệm gửi thuốc từ tỉnh lên TP?'), (SELECT id FROM users WHERE email = 'phamtd@example.com'), 'Có nhà xe nhận gửi thuốc, cần kiểm tra giấy tờ.', ARRAY[]::text[], NULL, '2025-11-09 18:10:00+00', '2025-11-09 18:10:00+00'),
((SELECT id FROM forum_posts WHERE title = 'Thuốc không còn tem có nên nhận?'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), 'Nếu mất tem, cần đánh dấu và báo quản lý.', ARRAY[]::text[], NULL, '2025-11-09 19:10:00+00', '2025-11-09 19:10:00+00');

-- ========== MORE Feedback ==========

-- ========== Extended Analytics Dataset ==========
-- Additional submissions to cover various months and statuses
INSERT INTO ho_so_xu_ly (
    id_nguoi_nop,
    id_nha_thuoc,
    id_loai_thuoc,
    so_luong,
    don_vi_tinh,
    han_dung,
    ket_qua,
    duong_dan_chung_nhan,
    ghi_chu,
    thoi_gian_xu_ly
) VALUES
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Minh Châu'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Cetirizine' AND thuong_hieu = 'Zyrtec'),
    18,
    'viên',
    '2026-08-01',
    'approved',
    NULL,
    'Đợt thu gom tháng 5',
    '2025-05-12 08:45:00+00'
),
(
    (SELECT id FROM users WHERE email = 'thib@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Vạn An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Lorazepam' AND thuong_hieu = 'Ativan'),
    12,
    'hộp',
    '2026-09-15',
    'returned_to_pharmacy',
    NULL,
    'Cần bổ sung giấy tờ',
    '2025-06-18 09:30:00+00'
),
(
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Bình An'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Metformin' AND thuong_hieu = 'Glucophage'),
    40,
    'ống',
    '2026-12-01',
    'rejected',
    NULL,
    'Bao bì rách nhiều',
    '2025-07-22 10:05:00+00'
),
(
    (SELECT id FROM users WHERE email = 'phamtd@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Sông Hồng'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Salbutamol' AND thuong_hieu = 'Ventolin'),
    6,
    'bình',
    '2026-05-30',
    'approved',
    NULL,
    'Chất lượng tốt',
    '2025-08-14 11:40:00+00'
),
(
    (SELECT id FROM users WHERE email = 'nguyend@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc Hòa Bình'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Simvastatin' AND thuong_hieu = 'Zocor'),
    75,
    'viên',
    '2027-02-10',
    'recalled',
    NULL,
    'Thu hồi do bảo quản sai nhiệt độ',
    '2025-09-09 13:15:00+00'
),
(
    (SELECT id FROM users WHERE email = 'vana@example.com'),
    (SELECT id FROM nha_thuoc WHERE ten_nha_thuoc = 'Nhà thuốc An Nhiên'),
    (SELECT id FROM loai_thuoc WHERE ten_hoat_chat = 'Cefuroxime' AND thuong_hieu = 'Zinacef'),
    20,
    'viên',
    '2026-11-05',
    'approved',
    NULL,
    'Đợt thu gom tháng 10',
    '2025-10-16 16:20:00+00'
);

-- Additional voucher usage spanning multiple months
INSERT INTO voucher_usage (voucher_id, user_id, redeemed_at, points_used) VALUES
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 5k'), (SELECT id FROM users WHERE email = 'vana@example.com'), '2025-05-18 10:00:00+00', 20),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 15%'), (SELECT id FROM users WHERE email = 'thib@example.com'), '2025-06-21 11:20:00+00', 150),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Free Gift'), (SELECT id FROM users WHERE email = 'admin@example.com'), '2025-07-05 08:40:00+00', 200),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher 50k'), (SELECT id FROM users WHERE email = 'phamtd@example.com'), '2025-08-12 14:10:00+00', 400),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher BOGOF'), (SELECT id FROM users WHERE email = 'nguyend@example.com'), '2025-09-03 09:55:00+00', 250),
((SELECT id FROM voucher WHERE ten_voucher = 'Voucher Ship 0đ'), (SELECT id FROM users WHERE email = 'vana@example.com'), '2025-10-19 17:25:00+00', 30);

-- Additional reward points history for user trend
INSERT INTO diem_thuong (id_nguoi_nop, diem, ly_do, trang_thai, ngay_cong) VALUES
((SELECT id FROM users WHERE email = 'vana@example.com'), 35, 'Tham gia sự kiện tháng 5', 'COMPLETED', '2025-05-20 09:00:00+00'),
((SELECT id FROM users WHERE email = 'thib@example.com'), 60, 'Nộp thuốc tháng 6', 'COMPLETED', '2025-06-18 10:15:00+00'),
((SELECT id FROM users WHERE email = 'admin@example.com'), 45, 'Bài viết diễn đàn chất lượng', 'COMPLETED', '2025-07-24 11:30:00+00'),
((SELECT id FROM users WHERE email = 'phamtd@example.com'), 80, 'Hồ sơ được duyệt tháng 8', 'COMPLETED', '2025-08-16 12:45:00+00'),
((SELECT id FROM users WHERE email = 'nguyend@example.com'), 25, 'Đổi voucher ưu đãi', 'COMPLETED', '2025-09-07 15:05:00+00'),
((SELECT id FROM users WHERE email = 'vana@example.com'), 55, 'Tham gia chương trình cộng đồng', 'COMPLETED', '2025-10-11 16:20:00+00');

-- ============================================================
-- COMPLETED ADDITIONAL INSERTS
-- ============================================================
