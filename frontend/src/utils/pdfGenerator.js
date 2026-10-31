import { jsPDF } from 'jspdf';
import { formatDate } from './formatters';

export function generateInvoicePDF(invoice, customer) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Header / Branding
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SubFlow', margin, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Subscription Management System', margin, 21);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin - 25, 17);

  y = 38;

  // Invoice Details & Customer Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', margin, y);

  doc.text('Invoice Details:', pageWidth / 2 + 10, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  // Customer Details
  const customerName = customer?.name || customer?.full_name || 'Customer';
  const company = customer?.company || customer?.company_name || '';
  const email = customer?.email || '';
  const phone = customer?.phone || '';
  const address = customer?.address || '';

  doc.text(customerName, margin, y);
  if (company) {
    y += 4.5;
    doc.text(company, margin, y);
  }
  if (email) {
    y += 4.5;
    doc.text(email, margin, y);
  }
  if (phone) {
    y += 4.5;
    doc.text(phone, margin, y);
  }
  if (address) {
    y += 4.5;
    doc.text(address, margin, y, { maxWidth: 75 });
  }

  // Invoice Info on the right
  let rightY = 44;
  const invNumber = invoice?.number || `INV-${invoice?.id?.slice(0, 8)}`;
  const status = (invoice?.status || 'draft').toUpperCase();

  doc.text(`Invoice Number: ${invNumber}`, pageWidth / 2 + 10, rightY);
  rightY += 4.5;
  doc.text(`Issue Date: ${formatDate(invoice?.issue_date || invoice?.created_at)}`, pageWidth / 2 + 10, rightY);
  rightY += 4.5;
  doc.text(`Due Date: ${formatDate(invoice?.due_date || invoice?.created_at)}`, pageWidth / 2 + 10, rightY);
  rightY += 4.5;
  doc.text(`Status: ${status}`, pageWidth / 2 + 10, rightY);

  if (invoice?.subscription?.number) {
    rightY += 4.5;
    doc.text(`Subscription: ${invoice.subscription.number}`, pageWidth / 2 + 10, rightY);
  }

  y = Math.max(y, rightY) + 12;

  // Line Items Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Description', margin + 4, y + 5.5);
  doc.text('Qty', pageWidth - margin - 75, y + 5.5, { align: 'right' });
  doc.text('Unit Price', pageWidth - margin - 50, y + 5.5, { align: 'right' });
  doc.text('Tax', pageWidth - margin - 25, y + 5.5, { align: 'right' });
  doc.text('Amount', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const lines = invoice?.invoice_lines || [];
  if (lines.length === 0) {
    doc.text('Subscription recurring service fee', margin + 4, y + 4);
    doc.text('1', pageWidth - margin - 75, y + 4, { align: 'right' });
    doc.text(`$${Number(invoice?.subtotal || invoice?.total || 0).toFixed(2)}`, pageWidth - margin - 50, y + 4, { align: 'right' });
    doc.text(`$${Number(invoice?.tax_total || 0).toFixed(2)}`, pageWidth - margin - 25, y + 4, { align: 'right' });
    doc.text(`$${Number(invoice?.total || 0).toFixed(2)}`, pageWidth - margin - 4, y + 4, { align: 'right' });
    y += 10;
  } else {
    lines.forEach((line) => {
      const desc = line.description || line.product?.name || 'Subscription item';
      const qty = line.quantity || 1;
      const unitPrice = Number(line.unit_price || 0).toFixed(2);
      const taxAmt = Number(line.tax_amount || 0).toFixed(2);
      const lineTot = Number(line.line_total || line.amount || (qty * unitPrice)).toFixed(2);

      doc.text(desc, margin + 4, y + 4, { maxWidth: 85 });
      doc.text(String(qty), pageWidth - margin - 75, y + 4, { align: 'right' });
      doc.text(`$${unitPrice}`, pageWidth - margin - 50, y + 4, { align: 'right' });
      doc.text(`$${taxAmt}`, pageWidth - margin - 25, y + 4, { align: 'right' });
      doc.text(`$${lineTot}`, pageWidth - margin - 4, y + 4, { align: 'right' });

      // subtle separator
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 7, pageWidth - margin, y + 7);

      y += 9;
    });
  }

  y += 4;

  // Financial Totals block
  const totalBoxWidth = 70;
  const totalBoxX = pageWidth - margin - totalBoxWidth;

  const subtotal = Number(invoice?.subtotal || invoice?.total || 0).toFixed(2);
  const discountTotal = Number(invoice?.discount_total || 0).toFixed(2);
  const taxTotal = Number(invoice?.tax_total || 0).toFixed(2);
  const grandTotal = Number(invoice?.total || 0).toFixed(2);
  const amountPaid = Number(invoice?.amount_paid || 0).toFixed(2);
  const balanceDue = Math.max(0, Number(grandTotal) - Number(amountPaid)).toFixed(2);

  doc.setFontSize(8.5);
  doc.text('Subtotal:', totalBoxX, y);
  doc.text(`$${subtotal}`, pageWidth - margin - 4, y, { align: 'right' });
  y += 5;

  if (Number(discountTotal) > 0) {
    doc.text('Discount:', totalBoxX, y);
    doc.text(`-$${discountTotal}`, pageWidth - margin - 4, y, { align: 'right' });
    y += 5;
  }

  doc.text('Tax Total:', totalBoxX, y);
  doc.text(`$${taxTotal}`, pageWidth - margin - 4, y, { align: 'right' });
  y += 6;

  // Grand Total box
  doc.setFillColor(248, 250, 252);
  doc.rect(totalBoxX - 2, y - 4, totalBoxWidth + 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Due:', totalBoxX, y + 1.5);
  doc.text(`$${grandTotal}`, pageWidth - margin - 4, y + 1.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount Paid:', totalBoxX, y);
  doc.text(`$${amountPaid}`, pageWidth - margin - 4, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balanceDue === '0.00' ? 22 : 225, balanceDue === '0.00' ? 101 : 29, balanceDue === '0.00' ? 52 : 72);
  doc.text('Balance Outstanding:', totalBoxX, y);
  doc.text(`$${balanceDue}`, pageWidth - margin - 4, y, { align: 'right' });

  // Footer notes
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for choosing SubFlow. For billing questions, please visit your customer self-service portal.', margin, y);
  doc.text(`Generated on ${new Date().toLocaleDateString()} — Page 1 of 1`, margin, y + 4.5);

  // Save the PDF
  const filename = `${invNumber || 'invoice'}.pdf`;
  doc.save(filename);
}

