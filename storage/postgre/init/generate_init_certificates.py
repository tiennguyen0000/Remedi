#!/usr/bin/env python3
"""
Generate PDF certificates for all approved submissions during database initialization
This script runs after init.sql to create certificates for pre-inserted data
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from pathlib import Path
from certificate_generator import CertificateGenerator

# Database configuration from environment
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'postgres'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'database': os.getenv('POSTGRES_DB', 'medicine_recycling'),
    'user': os.getenv('POSTGRES_USER', 'admin'),
    'password': os.getenv('PGPASSWORD', 'admin123')
}

# Certificate storage directory - mounted volume
CERT_DIR = Path('/certificates')
CERT_DIR.mkdir(parents=True, exist_ok=True)

def wait_for_database(max_retries=30):
    """Wait for database to be ready"""
    print("[Init Certificates] Waiting for database...")
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            conn.close()
            print("[Init Certificates] ✓ Database connection successful")
            return True
        except Exception as e:
            retry_count += 1
            if retry_count < max_retries:
                print(f"[Init Certificates] Waiting for database... ({retry_count}/{max_retries})")
                import time
                time.sleep(1)
            else:
                print(f"[Init Certificates] ✗ Failed to connect: {str(e)}")
                return False
    
    return False

def generate_certificates_for_approved():
    """Generate certificates for all approved submissions without certificates"""
    print("[Init Certificates] Starting certificate generation for initial data...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all approved submissions without certificates
        cur.execute("""
            SELECT 
                h.id, h.so_luong, h.don_vi_tinh, h.thoi_gian_xu_ly,
                h.diem_da_trao, h.duong_dan_chung_nhan,
                u.ho_ten,
                lt.ten_hoat_chat, lt.thuong_hieu, lt.ham_luong,
                nt.ten_nha_thuoc
            FROM ho_so_xu_ly h
            LEFT JOIN users u ON h.id_nguoi_nop = u.id
            LEFT JOIN loai_thuoc lt ON h.id_loai_thuoc = lt.id
            LEFT JOIN nha_thuoc nt ON h.id_nha_thuoc = nt.id
            WHERE h.ket_qua = 'approved' 
            AND (h.duong_dan_chung_nhan IS NULL OR h.duong_dan_chung_nhan = '')
            ORDER BY h.thoi_gian_xu_ly ASC
        """)
        
        submissions = cur.fetchall()
        
        if not submissions:
            print("[Init Certificates] No approved submissions need certificates")
            cur.close()
            conn.close()
            return 0
        
        print(f"[Init Certificates] Found {len(submissions)} approved submissions needing certificates")
        
        # Initialize certificate generator
        cert_generator = CertificateGenerator(output_dir=str(CERT_DIR))
        
        generated_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, submission in enumerate(submissions, 1):
            try:
                submission_id = submission['id']
                
                # Check if certificate file already exists
                existing_files = list(CERT_DIR.glob(f"cert_{submission_id[:8]}*.pdf"))
                if existing_files:
                    print(f"[Init Certificates] [{idx}/{len(submissions)}] Certificate exists for {submission_id[:8]}, updating path...")
                    cert_path = f"/certificates/{existing_files[0].name}"
                    cur.execute(
                        "UPDATE ho_so_xu_ly SET duong_dan_chung_nhan = %s WHERE id = %s",
                        (cert_path, submission_id)
                    )
                    conn.commit()
                    skipped_count += 1
                    continue
                
                # Generate new certificate
                print(f"[Init Certificates] [{idx}/{len(submissions)}] Generating certificate for {submission_id[:8]}...")
                
                # Calculate points awarded (if not already set, use default 50 points)
                points = submission['diem_da_trao'] or 50
                
                cert_filename = cert_generator.generate_certificate(
                    submission_id=submission_id,
                    user_name=submission['ho_ten'] or 'Unknown User',
                    medicine_info={
                        'ten_hoat_chat': submission['ten_hoat_chat'] or 'N/A',
                        'thuong_hieu': submission['thuong_hieu'] or '',
                        'ham_luong': submission['ham_luong'] or '',
                        'so_luong': submission['so_luong'],
                        'don_vi_tinh': submission['don_vi_tinh']
                    },
                    pharmacy_name=submission['ten_nha_thuoc'] or 'N/A',
                    submission_date=submission['thoi_gian_xu_ly'] or datetime.now(),
                    points_awarded=points
                )
                
                # Update database with certificate path
                cert_path = f"/certificates/{cert_filename}"
                cur.execute(
                    "UPDATE ho_so_xu_ly SET duong_dan_chung_nhan = %s WHERE id = %s",
                    (cert_path, submission_id)
                )
                conn.commit()
                
                generated_count += 1
                print(f"[Init Certificates] ✓ Generated: {cert_filename}")
                
            except Exception as e:
                error_count += 1
                print(f"[Init Certificates] ✗ Failed for {submission['id'][:8]}: {str(e)}")
                conn.rollback()
                continue
        
        cur.close()
        conn.close()
        
        print(f"\n[Init Certificates] ═══════════════════════════════════")
        print(f"[Init Certificates] Certificate Generation Summary:")
        print(f"[Init Certificates]   - Generated: {generated_count} new certificates")
        print(f"[Init Certificates]   - Skipped:   {skipped_count} (already exists)")
        print(f"[Init Certificates]   - Errors:    {error_count}")
        print(f"[Init Certificates]   - Total:     {len(submissions)} approved submissions")
        print(f"[Init Certificates] ═══════════════════════════════════\n")
        
        return generated_count
        
    except Exception as e:
        print(f"[Init Certificates] ✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  REMEDI - Initial Certificate Generation")
    print("="*60 + "\n")
    
    # Wait for database
    if not wait_for_database():
        print("[Init Certificates] ✗ Database not available, exiting")
        sys.exit(1)
    
    # Generate certificates
    try:
        count = generate_certificates_for_approved()
        
        if count > 0:
            print(f"[Init Certificates] ✓ Successfully generated {count} certificates")
            print(f"[Init Certificates] ✓ Certificates saved to: {CERT_DIR}")
            sys.exit(0)
        else:
            print("[Init Certificates] ℹ No new certificates generated")
            sys.exit(0)
            
    except Exception as e:
        print(f"[Init Certificates] ✗ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

