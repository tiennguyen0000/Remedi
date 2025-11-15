-- ============================================================
-- COMPREHENSIVE SEED DATA TO REACH 3000+ ROWS
-- Run this after init.sql completes
-- ============================================================

-- 1. More submissions (each user submits 2-3 times = ~200 submissions)
DO $$
DECLARE
    user_rec RECORD;
    i INTEGER;
BEGIN
    FOR user_rec IN SELECT id FROM users WHERE role = 'USER' LOOP
        FOR i IN 1..2 LOOP  -- Each user submits 2 times
            INSERT INTO ho_so_xu_ly (id_nguoi_nop, id_nha_thuoc, id_loai_thuoc, so_luong, don_vi_tinh, han_dung, ket_qua, ghi_chu, thoi_gian_xu_ly)
            VALUES (
                user_rec.id,
                (SELECT id FROM nha_thuoc ORDER BY RANDOM() LIMIT 1),
                (SELECT id FROM loai_thuoc ORDER BY RANDOM() LIMIT 1),
                (ARRAY[10, 15, 20, 25, 30, 40, 50])[floor(random() * 7 + 1)],
                (ARRAY['viên', 'hộp', 'lọ', 'chai'])[floor(random() * 4 + 1)],
                CURRENT_DATE + (floor(random() * 300))::integer,
                CASE 
                    WHEN random() < 0.7 THEN 'approved'::submission_status
                    WHEN random() < 0.85 THEN 'pending'::submission_status
                    WHEN random() < 0.95 THEN 'returned_to_pharmacy'::submission_status
                    ELSE 'rejected'::submission_status
                END,
                (ARRAY['Bao bì tốt', 'Hạn dài', 'Chất lượng OK', 'Đạt chuẩn'])[floor(random() * 4 + 1)],
                NOW() - (random() * interval '150 days')
            );
        END LOOP;
    END LOOP;
END $$;

-- 2. More forum comments (3 per post)
DO $$
DECLARE
    post_rec RECORD;
    i INTEGER;
BEGIN
    FOR post_rec IN SELECT id, created_at FROM forum_posts LOOP
        FOR i IN 1..2 LOOP
            INSERT INTO forum_comments (post_id, author_id, content, created_at)
            VALUES (
                post_rec.id,
                (SELECT id FROM users WHERE role IN ('USER', 'CONGTACVIEN') ORDER BY RANDOM() LIMIT 1),
                (ARRAY['Hay đấy!', 'Cảm ơn', 'Đồng ý', 'Tốt', 'OK'])[floor(random() * 5 + 1)],
                post_rec.created_at + (random() * interval '10 days')
            );
        END LOOP;
    END LOOP;
END $$;

-- 3. More notifications (2 per user)
DO $$
DECLARE
    user_rec RECORD;
    i INTEGER;
BEGIN
    FOR user_rec IN SELECT id FROM users WHERE role = 'USER' LOOP
        FOR i IN 1..2 LOOP
            INSERT INTO thong_bao (id_nguoi_nhan, loai_thong_bao, noi_dung, da_xem)
            VALUES (
                user_rec.id,
                'SYSTEM',
                (ARRAY['✅ Hồ sơ duyệt', '🎁 Nhận điểm', '📢 Tin mới'])[floor(random() * 3 + 1)],
                (random() > 0.5)::integer
            );
        END LOOP;
    END LOOP;
END $$;

-- 4. Classification results for approved submissions (100 results + 800 details)
DO $$
DECLARE
    submission_rec RECORD;
    result_id UUID;
    criterion_rec RECORD;
    evaluator_id UUID;
BEGIN
    -- Get random evaluator
    SELECT id INTO evaluator_id FROM users WHERE role IN ('ADMIN', 'CONGTACVIEN') ORDER BY RANDOM() LIMIT 1;
    
    -- Process approved submissions
    FOR submission_rec IN 
        SELECT id, thoi_gian_xu_ly FROM ho_so_xu_ly WHERE ket_qua = 'approved' LIMIT 100
    LOOP
        -- Create classification result
        result_id := uuid_generate_v4();
        
        INSERT INTO ket_qua_phan_loai (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung, thoi_gian_danh_gia)
        VALUES (
            result_id,
            submission_rec.id,
            (ARRAY['DAT', 'DAT', 'DAT', 'XEM_XET'])[floor(random() * 4 + 1)],
            evaluator_id,
            'Đạt yêu cầu',
            submission_rec.thoi_gian_xu_ly + interval '1 hour'
        );
        
        -- Create 8 criteria evaluations for this result
        FOR criterion_rec IN SELECT id, ma_tieu_chi FROM tieu_chi_phan_loai WHERE hoat_dong = true LOOP
            INSERT INTO chi_tiet_danh_gia (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, ghi_chu)
            VALUES (
                result_id,
                criterion_rec.id,
                (ARRAY['DAT', 'DAT', 'XEM_XET'])[floor(random() * 3 + 1)],
                CASE criterion_rec.ma_tieu_chi
                    WHEN 'HSD_THANG_TOI_THIEU' THEN (ARRAY['6 tháng', '9 tháng', '12 tháng'])[floor(random() * 3 + 1)]
                    WHEN 'TINH_TRANG_BAO_BI' THEN (ARRAY['Tốt', 'Nguyên vẹn'])[floor(random() * 2 + 1)]
                    WHEN 'CO_HOA_DON' THEN (ARRAY['Có', 'Không'])[floor(random() * 2 + 1)]
                    WHEN 'SO_LUONG_TOI_THIEU' THEN (ARRAY['20 viên', '30 viên'])[floor(random() * 2 + 1)]
                    ELSE 'OK'
                END,
                NULL
            );
        END LOOP;
        
        -- Change evaluator occasionally
        IF random() > 0.7 THEN
            SELECT id INTO evaluator_id FROM users WHERE role IN ('ADMIN', 'CONGTACVIEN') ORDER BY RANDOM() LIMIT 1;
        END IF;
    END LOOP;
END $$;

-- Summary
SELECT 
    'FINAL DATA SUMMARY' as title,
    '' as count;
    
SELECT table_name, total FROM (
    SELECT 'users' as table_name, COUNT(*) as total FROM users
    UNION ALL SELECT 'medicines', COUNT(*) FROM loai_thuoc
    UNION ALL SELECT 'pharmacies', COUNT(*) FROM nha_thuoc
    UNION ALL SELECT 'submissions', COUNT(*) FROM ho_so_xu_ly
    UNION ALL SELECT 'forum_posts', COUNT(*) FROM forum_posts
    UNION ALL SELECT 'comments', COUNT(*) FROM forum_comments
    UNION ALL SELECT 'feedback', COUNT(*) FROM feedback
    UNION ALL SELECT 'notifications', COUNT(*) FROM thong_bao
    UNION ALL SELECT 'reward_points', COUNT(*) FROM diem_thuong
    UNION ALL SELECT 'classifications', COUNT(*) FROM ket_qua_phan_loai
    UNION ALL SELECT 'criteria_details', COUNT(*) FROM chi_tiet_danh_gia
    UNION ALL SELECT 'vouchers', COUNT(*) FROM voucher
) t ORDER BY total DESC;

SELECT 'TOTAL_ROWS' as summary, SUM(cnt)::int as count FROM (
    SELECT COUNT(*)::int as cnt FROM users
    UNION ALL SELECT COUNT(*) FROM loai_thuoc
    UNION ALL SELECT COUNT(*) FROM nha_thuoc
    UNION ALL SELECT COUNT(*) FROM ho_so_xu_ly
    UNION ALL SELECT COUNT(*) FROM forum_posts
    UNION ALL SELECT COUNT(*) FROM forum_comments
    UNION ALL SELECT COUNT(*) FROM feedback
    UNION ALL SELECT COUNT(*) FROM thong_bao
    UNION ALL SELECT COUNT(*) FROM diem_thuong
    UNION ALL SELECT COUNT(*) FROM ket_qua_phan_loai
    UNION ALL SELECT COUNT(*) FROM chi_tiet_danh_gia
    UNION ALL SELECT COUNT(*) FROM voucher
) t;
