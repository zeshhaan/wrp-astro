#!/usr/bin/env python3
"""Generate PDF Invoice for WRP Dubai"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from datetime import datetime

# Create the PDF
output_path = "/Users/zeeshan/src/ameen/wrp-astro/docs/INVOICE-WRP-NOV-2025.pdf"
doc = SimpleDocTemplate(output_path, pagesize=A4,
                        rightMargin=1.5*cm, leftMargin=1.5*cm,
                        topMargin=1.5*cm, bottomMargin=1.5*cm)

# Styles
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='InvoiceTitle', fontSize=28, leading=34,
                          fontName='Helvetica-Bold', textColor=colors.HexColor('#1a1a1a')))
styles.add(ParagraphStyle(name='SectionHeader', fontSize=11, leading=14,
                          fontName='Helvetica-Bold', textColor=colors.HexColor('#666666'),
                          spaceAfter=6))
styles.add(ParagraphStyle(name='CompanyName', fontSize=14, leading=18,
                          fontName='Helvetica-Bold', textColor=colors.HexColor('#1a1a1a')))
styles.add(ParagraphStyle(name='NormalText', fontSize=10, leading=14,
                          fontName='Helvetica', textColor=colors.HexColor('#333333')))
styles.add(ParagraphStyle(name='SmallText', fontSize=9, leading=12,
                          fontName='Helvetica', textColor=colors.HexColor('#666666')))
styles.add(ParagraphStyle(name='RightAlign', fontSize=10, leading=14,
                          fontName='Helvetica', alignment=TA_RIGHT))
styles.add(ParagraphStyle(name='TotalAmount', fontSize=16, leading=20,
                          fontName='Helvetica-Bold', textColor=colors.HexColor('#1a1a1a')))
styles.add(ParagraphStyle(name='Footer', fontSize=8, leading=10,
                          fontName='Helvetica', textColor=colors.HexColor('#999999'),
                          alignment=TA_CENTER))

story = []

# Header with Invoice Title and Number
header_data = [
    [Paragraph("INVOICE", styles['InvoiceTitle']),
     Paragraph("<b>Invoice #:</b> INV-2025-11-001<br/><b>Date:</b> November 27, 2025<br/><b>Due:</b> Upon Receipt", styles['RightAlign'])]
]
header_table = Table(header_data, colWidths=[10*cm, 7*cm])
header_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
]))
story.append(header_table)
story.append(Spacer(1, 0.8*cm))

# Horizontal line
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
story.append(Spacer(1, 0.6*cm))

# From and Bill To sections
from_content = """<b>Mohammed Zeeshan</b><br/>
IT Consultant<br/>
License No: 41639 (Ajman Free Zone)<br/><br/>
hello@zeeshan.deno.dev<br/>
+971 54 435 4211<br/>
dub.sh/zeeshan-web"""

bill_to_content = """<b>WRP CAR POLISH SERVICES LLC</b><br/>
Al Qusais Industrial Area 1<br/>
Dubai, UAE<br/><br/>
info@wrpdetailing.ae<br/>
+971 54 717 3000"""

address_data = [
    [Paragraph("FROM", styles['SectionHeader']), Paragraph("BILL TO", styles['SectionHeader'])],
    [Paragraph(from_content, styles['NormalText']), Paragraph(bill_to_content, styles['NormalText'])]
]
address_table = Table(address_data, colWidths=[8.5*cm, 8.5*cm])
address_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(address_table)
story.append(Spacer(1, 0.8*cm))

# Services Table
story.append(Paragraph("SERVICES", styles['SectionHeader']))
story.append(Spacer(1, 0.2*cm))

# Service descriptions
service1_desc = """<b>Website Development</b><br/>
<font size="9">Complete website built with Astro 5 framework, deployed on Cloudflare.<br/>
• 10+ pages (Home, Services, Portfolio, About, Contact)<br/>
• 5 service pages with dynamic content collections<br/>
• Contact form with database integration<br/>
• Mobile-responsive luxury design<br/>
• Cloudflare hosting included</font>"""

service2_desc = """<b>SEO Service - Month 1 (Foundation)</b><br/>
<font size="9">Complete on-site and technical SEO setup:<br/>
• 6 types of Schema.org structured data<br/>
• Meta tags optimization (title, description, OG, Twitter)<br/>
• Sitemap, robots.txt, canonical URLs<br/>
• Image optimization with alt tags (60+ images)<br/>
• Internal linking structure (30+ links)<br/>
• Google Search Console &amp; Microsoft Clarity setup<br/>
• Google Reviews integration (weekly sync)<br/>
• Off-site SEO: Google Maps optimization, backlinks</font>"""

services_data = [
    [Paragraph("<b>#</b>", styles['NormalText']),
     Paragraph("<b>Description</b>", styles['NormalText']),
     Paragraph("<b>Standard</b>", styles['NormalText']),
     Paragraph("<b>Amount</b>", styles['NormalText'])],
    ["1", Paragraph(service1_desc, styles['NormalText']), "AED 2,000", "AED 1,500"],
    ["2", Paragraph(service2_desc, styles['NormalText']), "AED 1,500", "AED 1,500"],
]

services_table = Table(services_data, colWidths=[1*cm, 11*cm, 2.5*cm, 2.5*cm])
services_table.setStyle(TableStyle([
    # Header row
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    # All cells
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    # Grid
    ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#e0e0e0')),
    ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#eeeeee')),
]))
story.append(services_table)
story.append(Spacer(1, 0.5*cm))

# Totals
totals_data = [
    ["", "", "Subtotal:", "AED 3,500"],
    ["", "", "Bundle Discount:", "- AED 500"],
    ["", "", "TOTAL DUE:", "AED 3,000"],
]
totals_table = Table(totals_data, colWidths=[1*cm, 9*cm, 3.5*cm, 3.5*cm])
totals_table.setStyle(TableStyle([
    ('ALIGN', (2, 0), (2, -1), 'RIGHT'),  # Labels right-aligned
    ('ALIGN', (3, 0), (3, -1), 'RIGHT'),  # Amounts right-aligned
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),  # Normal font for first two rows
    ('FONTNAME', (2, 2), (-1, 2), 'Helvetica-Bold'),  # Bold total row
    ('FONTSIZE', (0, 0), (-1, 1), 10),  # Normal size
    ('FONTSIZE', (2, 2), (-1, 2), 11),  # Slightly larger for total
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LINEABOVE', (2, 2), (-1, 2), 1, colors.HexColor('#1a1a1a')),
    ('BACKGROUND', (2, 2), (-1, 2), colors.HexColor('#f5f5f5')),
]))
story.append(totals_table)
story.append(Spacer(1, 0.8*cm))

# Payment Details
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("PAYMENT DETAILS", styles['SectionHeader']))
story.append(Spacer(1, 0.2*cm))

bank_details = """<b>Bank Transfer (Preferred)</b><br/><br/>
<b>Account Holder:</b> MOHAMMED ZEESHAN<br/>
<b>Bank Name:</b> Al Hilal Bank<br/>
<b>Account Number:</b> 0143 5421 1001<br/>
<b>IBAN:</b> AE76 0530 0000 1435 4211 001<br/>
<b>SWIFT:</b> HLALAEAA<br/>
<b>Currency:</b> AED"""

story.append(Paragraph(bank_details, styles['NormalText']))
story.append(Spacer(1, 0.5*cm))

# Notes
story.append(Paragraph("NOTES", styles['SectionHeader']))
notes_text = """• This invoice covers website development and the first month of SEO services<br/>
• Monthly SEO service (AED 1,500/month) can be continued as a separate retainer<br/>
• Full website ownership and source code included<br/>
• Cloudflare hosting is included at no additional cost<br/>
• Marketing materials (posters, flyers, etc.) provided complimentary"""
story.append(Paragraph(notes_text, styles['SmallText']))
story.append(Spacer(1, 1*cm))

# Footer
story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e0e0e0')))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Thank you for your business!", styles['Footer']))
story.append(Paragraph("For questions, contact hello@zeeshan.deno.dev | +971 54 435 4211", styles['Footer']))

# Build PDF
doc.build(story)
print(f"Invoice generated: {output_path}")
