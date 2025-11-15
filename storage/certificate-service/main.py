"""
Certificate Generator Service
Automatically generates PDF certificates for approved submissions
"""
import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from certificate_generator import CertificateGenerator
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'postgres'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'database': os.getenv('POSTGRES_DB', 'medicine_recycling'),
    'user': os.getenv('POSTGRES_USER', 'admin'),
    'password': os.getenv('POSTGRES_PASSWORD', 'admin123')
}

# Certificate storage
CERT_DIR = Path('/app/certificates')
CERT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize generator
cert_generator = CertificateGenerator(output_dir=str(CERT_DIR))


def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)


def check_and_generate_certificates():
    """
    Check for approved submissions without certificates and generate them
    """
    print("[Certificate Service] Checking for submissions needing certificates...")
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get approved submissions without certificates
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
            ORDER BY h.thoi_gian_xu_ly DESC
        """)
        
        submissions = cur.fetchall()
        
        if not submissions:
            print("[Certificate Service] No submissions need certificates")
            cur.close()
            conn.close()
            return
        
        print(f"[Certificate Service] Found {len(submissions)} submissions needing certificates")
        
        generated_count = 0
        for submission in submissions:
            try:
                submission_id = submission['id']
                
                # Check if certificate file already exists
                existing_files = list(CERT_DIR.glob(f"cert_{submission_id[:8]}*.pdf"))
                if existing_files:
                    print(f"[Certificate Service] Certificate already exists for {submission_id[:8]}, skipping...")
                    # Update database with existing file path
                    cert_path = f"/certificates/{existing_files[0].name}"
                    cur.execute(
                        "UPDATE ho_so_xu_ly SET duong_dan_chung_nhan = %s WHERE id = %s",
                        (cert_path, submission_id)
                    )
                    conn.commit()
                    continue
                
                # Generate new certificate
                print(f"[Certificate Service] Generating certificate for submission {submission_id[:8]}...")
                
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
                    submission_date=submission['thoi_gian_xu_ly'],
                    points_awarded=submission['diem_da_trao'] or 0
                )
                
                # Update database with certificate path
                cert_path = f"/certificates/{cert_filename}"
                cur.execute(
                    "UPDATE ho_so_xu_ly SET duong_dan_chung_nhan = %s WHERE id = %s",
                    (cert_path, submission_id)
                )
                conn.commit()
                
                generated_count += 1
                print(f"[Certificate Service] ✓ Generated certificate: {cert_filename}")
                
            except Exception as e:
                print(f"[Certificate Service] ✗ Failed to generate certificate for {submission['id'][:8]}: {str(e)}")
                conn.rollback()
                continue
        
        cur.close()
        conn.close()
        
        print(f"[Certificate Service] Successfully generated {generated_count} new certificates")
        
    except Exception as e:
        print(f"[Certificate Service] Error: {str(e)}")


def listen_for_new_submissions():
    """
    Listen for database changes using polling (since we don't have NOTIFY/LISTEN in basic setup)
    """
    print("[Certificate Service] Starting certificate generation service...")
    print(f"[Certificate Service] Certificate directory: {CERT_DIR}")
    
    # Initial check
    check_and_generate_certificates()
    
    # Poll every 30 seconds
    poll_interval = int(os.getenv('POLL_INTERVAL', 30))
    print(f"[Certificate Service] Polling interval: {poll_interval} seconds")
    
    while True:
        try:
            time.sleep(poll_interval)
            check_and_generate_certificates()
        except KeyboardInterrupt:
            print("\n[Certificate Service] Shutting down...")
            break
        except Exception as e:
            print(f"[Certificate Service] Unexpected error: {str(e)}")
            time.sleep(poll_interval)


if __name__ == "__main__":
    # Wait for database to be ready
    max_retries = 10
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = get_db_connection()
            conn.close()
            print("[Certificate Service] Database connection successful")
            break
        except Exception as e:
            retry_count += 1
            print(f"[Certificate Service] Waiting for database... ({retry_count}/{max_retries})")
            time.sleep(3)
    
    if retry_count >= max_retries:
        print("[Certificate Service] Failed to connect to database")
        exit(1)
    
    # Start service
    listen_for_new_submissions()
