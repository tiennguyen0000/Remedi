-- ============================================================
-- GENERATE CLASSIFICATION RESULTS (100 results + 800 details = 900 rows)
-- Run after seed_data.sql
-- ============================================================

-- Generate 100 classification results for approved submissions
WITH approved_submissions AS (
    SELECT id, id_nguoi_nop, thoi_gian_xu_ly
    FROM ho_so_xu_ly 
    WHERE ket_qua = 'approved'
    ORDER BY RANDOM()
    LIMIT 100
),
random_evaluators AS (
    SELECT id FROM users WHERE role IN ('ADMIN', 'CONGTACVIEN') ORDER BY RANDOM()
),
results AS (
    INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia)
    SELECT 
        uuid_generate_v4(),
        s.id,
        (ARRAY['DAT', 'DAT', 'DAT', 'XEM_XET', 'KHONG_DAT'])[floor(random() * 5 + 1)::int],
        (SELECT id FROM random_evaluators LIMIT 1 OFFSET floor(random() * (SELECT COUNT(*) FROM random_evaluators))::int),
        (ARRAY[
            'Hồ sơ đạt tất cả tiêu chí',
            'Chất lượng tốt, số lượng phù hợp',
            'Đạt yêu cầu cơ bản',
            'Cần xem xét thêm về nguồn gốc',
            'Một số tiêu chí chưa đạt',
            'Bao bì nguyên vẹn, hạn sử dụng tốt',
            'Thuốc đảm bảo chất lượng',
            'Số lượng lớn, chất lượng xuất sắc'
        ])[floor(random() * 8 + 1)],
        s.thoi_gian_xu_ly + interval '2 hours'
    FROM approved_submissions s
    RETURNING id, id_ho_so_xu_ly, ket_qua_tong
)
-- Generate detailed criteria evaluations (8 criteria each = 800 rows)
INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu)
SELECT 
    r.id,
    c.id,
    CASE 
        WHEN r.ket_qua_tong = 'DAT' THEN 
            (ARRAY['DAT', 'DAT', 'DAT', 'DAT', 'XEM_XET'])[floor(random() * 5 + 1)::int]
        WHEN r.ket_qua_tong = 'KHONG_DAT' THEN
            (ARRAY['DAT', 'DAT', 'KHONG_DAT', 'XEM_XET'])[floor(random() * 4 + 1)::int]
        ELSE
            (ARRAY['DAT', 'XEM_XET', 'XEM_XET'])[floor(random() * 3 + 1)::int]
    END,
    CASE c.ma_tieu_chi
        WHEN 'HSD_THANG_TOI_THIEU' THEN (ARRAY['6 tháng', '8 tháng', '10 tháng', '12 tháng', '15 tháng'])[floor(random() * 5 + 1)]
        WHEN 'TINH_TRANG_BAO_BI' THEN (ARRAY['Nguyên seal', 'Nguyên vẹn', 'Tốt', 'Đã mở', 'Bình thường'])[floor(random() * 5 + 1)]
        WHEN 'CO_HOA_DON' THEN (ARRAY['Có', 'Không có', 'Chỉ có tem'])[floor(random() * 3 + 1)]
        WHEN 'DANG_BAO_CHE_HOP_LE' THEN (ARRAY['Viên nén', 'Viên nang', 'Viên sủi', 'Dung dịch'])[floor(random() * 4 + 1)]
        WHEN 'SO_LUONG_TOI_THIEU' THEN (ARRAY['10 viên', '20 viên', '30 viên', '50 viên', '100 viên'])[floor(random() * 5 + 1)]
        WHEN 'NGUON_GOC_RO_RANG' THEN (ARRAY['Có', 'Chưa rõ', 'Đang xác minh'])[floor(random() * 3 + 1)]
        WHEN 'KHONG_BI_BAN' THEN (ARRAY['Sạch sẽ', 'Tốt', 'Hoàn hảo', 'Bình thường'])[floor(random() * 4 + 1)]
        WHEN 'NHAN_MAC_DAY_DU' THEN (ARRAY['Có', 'Đầy đủ', 'Còn rõ ràng'])[floor(random() * 3 + 1)]
        ELSE 'OK'
    END,
    CASE 
        WHEN random() > 0.7 THEN (ARRAY[
            'Đạt yêu cầu',
            'Tốt',
            'Cần kiểm tra thêm',
            'Đủ điều kiện',
            NULL
        ])[floor(random() * 5 + 1)]
        ELSE NULL
    END
FROM results r
CROSS JOIN tieu_chi_phan_loai c
WHERE c.hoat_dong = true;

-- Summary
SELECT 
    'Classification Results Generated' as status,
    COUNT(*) as total_results
FROM ket_qua_phan_loai;

SELECT 
    'Detailed Evaluations Generated' as status,
    COUNT(*) as total_details
FROM chi_tiet_danh_gia;
