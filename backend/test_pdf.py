from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from io import BytesIO

try:
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold',
        borderWidth=2,
        borderColor=colors.HexColor('#3b82f6'),
        borderPadding=5,
        backColor=colors.HexColor('#eff6ff')
    )
    
    story.append(Paragraph("Test Section", heading2_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph("This is test content with justified alignment.", body_style))
    
    # Test table
    data = [['Column 1', 'Column 2'], ['Value 1', 'Value 2']]
    t = Table(data, colWidths=[3*inch, 3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Test PageBreak
    story.append(PageBreak())
    story.append(Paragraph("Page 2", heading2_style))
    
    doc.build(story)
    print("PDF build successful - no errors")
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
