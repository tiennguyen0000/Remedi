"""
Professional PDF Certificate Generator
Beautiful certificate design with Vietnamese style
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from pathlib import Path
import uuid


class CertificateGenerator:
    """Generate beautiful PDF certificates for medicine submissions"""
    
    def __init__(self, output_dir: str = "/app/certificates"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _draw_decorative_border(self, c, width, height):
        """Draw decorative border around certificate"""
        # Outer border - Gold/Blue gradient effect
        c.setStrokeColor(colors.HexColor('#1e3a8a'))  # Dark blue
        c.setLineWidth(4)
        c.rect(1.5*cm, 1.5*cm, width - 3*cm, height - 3*cm, stroke=1, fill=0)
        
        # Inner border
        c.setStrokeColor(colors.HexColor('#3b82f6'))  # Blue 500
        c.setLineWidth(1.5)
        c.rect(2*cm, 2*cm, width - 4*cm, height - 4*cm, stroke=1, fill=0)
        
        # Corner decorations
        corner_size = 1.5*cm
        corners = [
            (2*cm, height - 2*cm),  # Top left
            (width - 2*cm, height - 2*cm),  # Top right
            (2*cm, 2*cm),  # Bottom left
            (width - 2*cm, 2*cm),  # Bottom right
        ]
        
        c.setStrokeColor(colors.HexColor('#60a5fa'))  # Light blue
        c.setLineWidth(2)
        
        for x, y in corners:
            # Top-left corner decorations
            if y > height/2:  # Top corners
                c.line(x, y, x + corner_size, y)
                c.line(x, y, x, y - corner_size)
            else:  # Bottom corners
                c.line(x, y, x + corner_size, y)
                c.line(x, y, x, y + corner_size)
    
    def _draw_header(self, c, width, height):
        """Draw certificate header"""
        # Logo area with background
        c.setFillColor(colors.HexColor('#eff6ff'))  # Light blue background
        c.roundRect(width/2 - 6*cm, height - 5.5*cm, 12*cm, 2.5*cm, 0.5*cm, fill=1, stroke=0)
        
        # REMEDI logo text
        c.setFillColor(colors.HexColor('#1e40af'))  # Blue 800
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(width/2, height - 3.8*cm, "🏥 REMEDI")
        
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#64748b'))  # Slate 500
        c.drawCentredString(width/2, height - 4.5*cm, "Nền tảng Thu gom & Trao đổi Thuốc")
        c.setFont("Helvetica-Oblique", 9)
        c.drawCentredString(width/2, height - 5*cm, "Medicine Collection & Exchange Platform")
    
    def _draw_title(self, c, width, height):
        """Draw certificate title"""
        # Main title background
        c.setFillColor(colors.HexColor('#1e40af'))
        c.roundRect(width/2 - 7*cm, height - 8*cm, 14*cm, 1.8*cm, 0.5*cm, fill=1, stroke=0)
        
        # Title text
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredString(width/2, height - 7.3*cm, "GIẤY XÁC NHẬN")
        
        # Subtitle
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 8.8*cm, "Certificate of Medicine Submission")
        
        # Decorative line
        c.setStrokeColor(colors.HexColor('#60a5fa'))
        c.setLineWidth(1.5)
        c.line(width/2 - 6*cm, height - 9.2*cm, width/2 + 6*cm, height - 9.2*cm)
    
    def _draw_content(self, c, width, height, user_name, medicine_info, pharmacy_name, points_awarded):
        """Draw certificate main content"""
        y_pos = height - 11*cm
        
        # Recipient section
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#475569'))
        c.drawCentredString(width/2, y_pos, "Chứng nhận rằng (This is to certify that)")
        
        y_pos -= 1*cm
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawCentredString(width/2, y_pos, user_name.upper())
        
        # Underline for name
        name_width = c.stringWidth(user_name.upper(), "Helvetica-Bold", 16)
        c.setStrokeColor(colors.HexColor('#3b82f6'))
        c.setLineWidth(1)
        c.line(width/2 - name_width/2, y_pos - 0.2*cm, width/2 + name_width/2, y_pos - 0.2*cm)
        
        # Main text
        y_pos -= 1.5*cm
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor('#374151'))
        c.drawCentredString(width/2, y_pos, "Đã thực hiện nộp thuốc thành công tại hệ thống REMEDI")
        y_pos -= 0.5*cm
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawCentredString(width/2, y_pos, "Has successfully submitted medicine to REMEDI system")
        
        # Medicine details box
        y_pos -= 1.5*cm
        box_height = 4*cm
        c.setFillColor(colors.HexColor('#f8fafc'))  # Very light gray
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.setLineWidth(1)
        c.roundRect(3.5*cm, y_pos - box_height, width - 7*cm, box_height, 0.5*cm, fill=1, stroke=1)
        
        # Details inside box
        detail_y = y_pos - 0.8*cm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        
        # Medicine name
        c.drawString(4.5*cm, detail_y, "📋 Thuốc (Medicine):")
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#334155'))
        medicine_name = medicine_info.get('ten_hoat_chat', 'N/A')
        if medicine_info.get('thuong_hieu'):
            medicine_name += f" - {medicine_info['thuong_hieu']}"
        c.drawString(10*cm, detail_y, medicine_name)
        
        # Concentration
        detail_y -= 0.7*cm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        c.drawString(4.5*cm, detail_y, "💊 Hàm lượng (Concentration):")
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(10*cm, detail_y, medicine_info.get('ham_luong', 'N/A'))
        
        # Quantity
        detail_y -= 0.7*cm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        c.drawString(4.5*cm, detail_y, "📦 Số lượng (Quantity):")
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#334155'))
        quantity_text = f"{medicine_info.get('so_luong', 0)} {medicine_info.get('don_vi_tinh', '')}"
        c.drawString(10*cm, detail_y, quantity_text)
        
        # Pharmacy
        detail_y -= 0.7*cm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        c.drawString(4.5*cm, detail_y, "🏪 Nhà thuốc (Pharmacy):")
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(10*cm, detail_y, pharmacy_name)
        
        # Points awarded - highlighted
        detail_y -= 0.7*cm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        c.drawString(4.5*cm, detail_y, "⭐ Điểm thưởng (Points):")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor('#059669'))  # Green
        c.drawString(10*cm, detail_y, f"+{points_awarded} điểm")
        
        return y_pos - box_height - 1*cm
    
    def _draw_footer(self, c, width, height, submission_id, submission_date, y_pos):
        """Draw certificate footer with signature and verification"""
        # Date and ID
        y_pos -= 1*cm
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawString(4*cm, y_pos, f"Ngày cấp (Issue date): {submission_date.strftime('%d/%m/%Y')}")
        c.drawString(4*cm, y_pos - 0.5*cm, f"Mã hồ sơ (ID): {submission_id}")
        
        # System verification stamp
        stamp_x = width - 6*cm
        stamp_y = y_pos - 1*cm
        
        # Stamp circle
        c.setStrokeColor(colors.HexColor('#2563eb'))
        c.setLineWidth(2.5)
        c.circle(stamp_x, stamp_y, 2*cm, stroke=1, fill=0)
        
        # Inner circle
        c.setLineWidth(1)
        c.circle(stamp_x, stamp_y, 1.7*cm, stroke=1, fill=0)
        
        # Stamp text
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawCentredString(stamp_x, stamp_y + 0.3*cm, "REMEDI")
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(stamp_x, stamp_y - 0.3*cm, "VERIFIED")
        c.setFont("Helvetica", 7)
        c.drawCentredString(stamp_x, stamp_y - 0.8*cm, submission_date.strftime('%Y'))
        
        # Signature line
        c.setStrokeColor(colors.HexColor('#94a3b8'))
        c.setLineWidth(1)
        c.line(stamp_x - 2*cm, stamp_y - 2.5*cm, stamp_x + 2*cm, stamp_y - 2.5*cm)
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawCentredString(stamp_x, stamp_y - 2.9*cm, "Xác nhận của hệ thống")
        c.setFont("Helvetica-Oblique", 7)
        c.drawCentredString(stamp_x, stamp_y - 3.3*cm, "(System Verification)")
        
        # Bottom text
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor('#94a3b8'))
        c.drawCentredString(width/2, 2.3*cm, "Giấy xác nhận này được tạo tự động bởi hệ thống REMEDI")
        c.drawCentredString(width/2, 1.9*cm, "This certificate is automatically generated by REMEDI system")
        c.drawCentredString(width/2, 1.5*cm, "www.remedi.vn")
    
    def generate_certificate(
        self,
        submission_id: str,
        user_name: str,
        medicine_info: dict,
        pharmacy_name: str,
        submission_date: datetime,
        points_awarded: int = 0
    ) -> str:
        """
        Generate a professional PDF certificate
        
        Returns:
            str: Filename of generated PDF
        """
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"cert_{submission_id[:8]}_{timestamp}.pdf"
        filepath = self.output_dir / filename
        
        # Check if file already exists
        if filepath.exists():
            print(f"Certificate already exists: {filename}")
            return filename
        
        # Create PDF
        c = canvas.Canvas(str(filepath), pagesize=A4)
        width, height = A4
        
        # Draw all elements
        self._draw_decorative_border(c, width, height)
        self._draw_header(c, width, height)
        self._draw_title(c, width, height)
        y_pos = self._draw_content(c, width, height, user_name, medicine_info, pharmacy_name, points_awarded)
        self._draw_footer(c, width, height, submission_id, submission_date, y_pos)
        
        # Save PDF
        c.save()
        
        print(f"Generated certificate: {filename}")
        return filename

