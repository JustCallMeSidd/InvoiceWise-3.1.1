/**
 * InvoiceWise — A4 Invoice Print & PDF Generator
 * Renders a pixel-perfect, GST Rule 46 compliant tax invoice layout
 * Optimized for A4 printing and PDF export with zero external dependencies.
 */

(function () {
  function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
      if ((n = n.toString()).length > 9) return 'overflow';
      let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n_array) return '';
      let str = '';
      str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
      str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
      str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
      str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
      str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
      return str;
    }

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = 'Rupees ' + inWords(integerPart).trim();
    if (decimalPart > 0) {
      result += ' and ' + inWords(decimalPart).trim() + ' Paise';
    }
    result += ' Only';
    return result;
  }

  function formatMoney(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function generateInvoiceHTML(inv, company) {
    const lineItems = inv.lineItems || [];
    const isInterState = inv.supplyType === 'inter';

    // GST rate-wise breakdown
    const taxSummaryMap = {};
    lineItems.forEach(item => {
      const rate = item.gst_rate || 0;
      if (!taxSummaryMap[rate]) {
        taxSummaryMap[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      taxSummaryMap[rate].taxable += item.taxableValue || 0;
      taxSummaryMap[rate].cgst += item.cgst || 0;
      taxSummaryMap[rate].sgst += item.sgst || 0;
      taxSummaryMap[rate].igst += item.igst || 0;
      taxSummaryMap[rate].totalTax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
    });

    const logoHtml = company.businessLogoBase64 || company.logoUrl ? 
      `<img src="${company.businessLogoBase64 || company.logoUrl}" alt="Company Logo" class="inv-logo" />` :
      `<div class="inv-logo-text">${company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'IW'}</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice — ${inv.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 20px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
    }
    .header-table td {
      vertical-align: top;
    }
    .inv-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .inv-subtitle {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 2px;
    }
    .inv-logo {
      max-height: 55px;
      max-width: 180px;
      object-fit: contain;
    }
    .inv-logo-text {
      width: 48px;
      height: 48px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .meta-box {
      text-align: right;
    }
    .meta-table {
      margin-left: auto;
      border-collapse: collapse;
      font-size: 11px;
    }
    .meta-table td {
      padding: 2px 6px;
    }
    .meta-table td.label {
      color: #64748b;
      font-weight: 600;
      text-align: right;
    }
    .meta-table td.value {
      font-weight: 700;
      color: #0f172a;
      font-family: monospace;
    }

    .address-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .address-grid td {
      width: 50%;
      padding: 12px 15px;
      vertical-align: top;
      background: #f8fafc;
    }
    .address-grid td:first-child {
      border-right: 1px solid #e2e8f0;
    }
    .party-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-details {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.5;
    }
    .gstin-tag {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 6px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      font-family: monospace;
      font-size: 10px;
      border-radius: 3px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 8px;
      text-align: left;
      border: 1px solid #0f172a;
    }
    .items-table td {
      padding: 8px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      vertical-align: top;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; font-size: 10px; }

    .totals-area {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .totals-area td {
      vertical-align: top;
    }
    .words-box {
      width: 58%;
      padding-right: 20px;
    }
    .words-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .words-value {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 4px;
      border-left: 3px solid #0f172a;
    }

    .calc-table {
      width: 42%;
      border-collapse: collapse;
      margin-left: auto;
    }
    .calc-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .calc-table td.label {
      color: #475569;
      font-weight: 600;
    }
    .calc-table td.value {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
      font-family: monospace;
    }
    .calc-table tr.grand-total td {
      background: #0f172a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      padding: 8px 10px;
      border: none;
    }
    .calc-table tr.grand-total td.value {
      color: #38bdf8;
    }

    .tax-breakdown-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .tax-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
      page-break-inside: avoid;
    }
    .tax-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 8.5px;
    }
    .tax-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      font-family: monospace;
    }

    .footer-section {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 15px;
      page-break-inside: avoid;
    }
    .footer-section td {
      vertical-align: top;
      padding-top: 10px;
    }
    .terms-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .terms-body {
      font-size: 9.5px;
      color: #475569;
      white-space: pre-line;
      line-height: 1.4;
    }
    .signatory-box {
      text-align: right;
    }
    .signatory-company {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 45px;
    }
    .signatory-line {
      border-top: 1px dashed #94a3b8;
      display: inline-block;
      width: 180px;
      padding-top: 4px;
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .invoice-wrapper {
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">

    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td style="width: 50%;">
          ${logoHtml}
          <div style="margin-top: 8px;">
            <div class="party-name" style="font-size: 15px;">${company.businessName || 'Your Business Name'}</div>
            <div class="party-details">
              ${company.businessAddress ? company.businessAddress.replace(/\n/g, '<br>') : ''}<br>
              ${company.businessPhone ? 'Phone: ' + company.businessPhone : ''} ${company.businessEmail ? ' | Email: ' + company.businessEmail : ''}
              ${company.businessGSTIN ? '<br><span class="gstin-tag">GSTIN: ' + company.businessGSTIN + '</span>' : ''}
              ${company.businessPAN ? ' <span style="font-size:10px;color:#64748b;">PAN: ' + company.businessPAN + '</span>' : ''}
            </div>
          </div>
        </td>
        <td class="meta-box" style="width: 50%;">
          <div class="inv-title">Tax Invoice</div>
          <div class="inv-subtitle">${inv.supplyType === 'inter' ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST/SGST)'}</div>
          <br>
          <table class="meta-table">
            <tr>
              <td class="label">Invoice No:</td>
              <td class="value">${inv.invoiceNumber || 'INV-0001'}</td>
            </tr>
            <tr>
              <td class="label">Invoice Date:</td>
              <td class="value">${inv.date || new Date().toISOString().split('T')[0]}</td>
            </tr>
            <tr>
              <td class="label">Due Date:</td>
              <td class="value">${inv.dueDate || '—'}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td class="value" style="text-transform:uppercase; color:${inv.status === 'paid' ? '#16a34a' : (inv.status === 'overdue' ? '#dc2626' : '#2563eb')}">${inv.status || 'Draft'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Address Grid -->
    <table class="address-grid">
      <tr>
        <td>
          <div class="party-title">Billed To (Customer)</div>
          <div class="party-name">${inv.customer ? inv.customer.name : 'Walk-in Customer'}</div>
          <div class="party-details">
            ${inv.customer && inv.customer.address ? inv.customer.address.replace(/\n/g, '<br>') : 'No address provided'}<br>
            ${inv.customer && inv.customer.phone ? 'Phone: ' + inv.customer.phone : ''} ${inv.customer && inv.customer.email ? ' | Email: ' + inv.customer.email : ''}
            <br>
            ${inv.customer && inv.customer.gstin ? '<span class="gstin-tag">GSTIN: ' + inv.customer.gstin + '</span>' : '<span style="font-size:10px;color:#64748b;">Unregistered / B2C</span>'}
            ${inv.customer && inv.customer.state ? ' | State: ' + inv.customer.state : ''}
          </div>
        </td>
        <td>
          <div class="party-title">Place of Supply & Transport</div>
          <div class="party-details">
            <strong>State of Supply:</strong> ${inv.placeOfSupply || (inv.customer ? inv.customer.state : company.businessState) || 'As per Customer State'}<br>
            <strong>Reverse Charge:</strong> ${inv.reverseCharge === 'yes' ? 'YES (Tax payable by Recipient)' : 'NO'}<br>
            ${inv.poNumber ? '<strong>P.O. Number:</strong> ' + inv.poNumber + '<br>' : ''}
            ${inv.vehicleNo ? '<strong>Vehicle No:</strong> ' + inv.vehicleNo + '<br>' : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 30px;">#</th>
          <th>Item / Service Description</th>
          <th class="text-center" style="width: 60px;">HSN/SAC</th>
          <th class="text-right" style="width: 45px;">Qty</th>
          <th class="text-right" style="width: 65px;">Rate (₹)</th>
          <th class="text-right" style="width: 45px;">Disc %</th>
          <th class="text-right" style="width: 70px;">Taxable (₹)</th>
          <th class="text-center" style="width: 45px;">GST</th>
          <th class="text-right" style="width: 80px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, idx) => `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td>
              <strong>${item.name || 'Item'}</strong>
              ${item.description ? `<br><span style="font-size:9.5px;color:#64748b;">${item.description}</span>` : ''}
            </td>
            <td class="text-center font-mono">${item.hsn_sac || '—'}</td>
            <td class="text-right font-mono">${item.qty || 1} ${item.unit || ''}</td>
            <td class="text-right font-mono">${Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="text-right font-mono">${item.discount_pct || 0}%</td>
            <td class="text-right font-mono">${Number(item.taxableValue || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="text-center font-mono">${item.gst_rate || 0}%</td>
            <td class="text-right font-mono" style="font-weight:700;">${Number(item.total || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals Area -->
    <table class="totals-area">
      <tr>
        <td class="words-box">
          <div class="words-label">Amount in Words</div>
          <div class="words-value">${numberToWords(inv.grandTotal || 0)}</div>

          ${company.businessBankAcc ? `
            <div style="margin-top: 15px; font-size: 10px; color: #334155; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <strong style="color:#0f172a; text-transform:uppercase; font-size:9px;">Bank Details for Payment</strong><br>
              <strong>Bank:</strong> ${company.businessBankName || '—'} | <strong>A/C No:</strong> ${company.businessBankAcc}<br>
              <strong>IFSC Code:</strong> ${company.businessBankIFSC || '—'}
            </div>
          ` : ''}
        </td>
        <td>
          <table class="calc-table">
            <tr>
              <td class="label">Taxable Value:</td>
              <td class="value">${formatMoney(inv.subtotal)}</td>
            </tr>
            ${isInterState ? `
              <tr>
                <td class="label">IGST Total:</td>
                <td class="value">${formatMoney(inv.totalTax)}</td>
              </tr>
            ` : `
              <tr>
                <td class="label">CGST Total:</td>
                <td class="value">${formatMoney(inv.totalTax / 2)}</td>
              </tr>
              <tr>
                <td class="label">SGST/UTGST Total:</td>
                <td class="value">${formatMoney(inv.totalTax / 2)}</td>
              </tr>
            `}
            ${inv.shippingCharges ? `
              <tr>
                <td class="label">Shipping / Freight:</td>
                <td class="value">${formatMoney(inv.shippingCharges)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total">
              <td class="label" style="color:#fff;">Grand Total:</td>
              <td class="value">${formatMoney(inv.grandTotal)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Tax Breakdown Summary Table -->
    <div class="tax-breakdown-title">GST Tax Rate Summary</div>
    <table class="tax-table">
      <thead>
        <tr>
          <th class="text-center">GST Rate</th>
          <th class="text-right">Taxable Amount (₹)</th>
          ${isInterState ? `
            <th class="text-right">IGST (₹)</th>
          ` : `
            <th class="text-right">CGST (₹)</th>
            <th class="text-right">SGST/UTGST (₹)</th>
          `}
          <th class="text-right">Total Tax (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(taxSummaryMap).map(rate => {
          const row = taxSummaryMap[rate];
          return `
            <tr>
              <td class="text-center font-mono">${rate}%</td>
              <td class="text-right font-mono">${Number(row.taxable).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              ${isInterState ? `
                <td class="text-right font-mono">${Number(row.igst).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              ` : `
                <td class="text-right font-mono">${Number(row.cgst).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td class="text-right font-mono">${Number(row.sgst).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              `}
              <td class="text-right font-mono" style="font-weight:700;">${Number(row.totalTax).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- Footer Terms & Signatory -->
    <table class="footer-section">
      <tr>
        <td style="width: 60%;">
          <div class="terms-title">Terms & Conditions</div>
          <div class="terms-body">${inv.terms || company.invoiceTerms || '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue invoices.'}</div>
          ${inv.notes ? `<div class="terms-title" style="margin-top:8px;">Notes</div><div class="terms-body">${inv.notes}</div>` : ''}
        </td>
        <td class="signatory-box" style="width: 40%;">
          <div class="signatory-company">For ${company.businessName || 'Your Business Name'}</div>
          <div class="signatory-line">Authorised Signatory</div>
        </td>
      </tr>
    </table>

  </div>

  <script>
    window.onload = function() {
      // Auto trigger print dialog on popup open
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
  }

  window.printInvoice = function (invoice, companySettings) {
    const html = generateInvoiceHTML(invoice, companySettings || {});
    const printWin = window.open('', '_blank', 'width=900,height=950,scrollbars=yes');
    if (!printWin) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print invoices.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  function generateManufacturingHTML(batch, company) {
    const logoHtml = company.businessLogoBase64 || company.logoUrl ? 
      `<img src="${company.businessLogoBase64 || company.logoUrl}" alt="Company Logo" style="max-height:60px;max-width:180px;object-fit:contain;" />` :
      `<div style="font-size:20px;font-weight:800;color:#0f172a">${company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'IW'}</div>`;

    const ingredients = batch.ingredientsConsumed || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manufacturing Report — ${batch.batchNumber || batch.id}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; background: #fff; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .wrapper { max-width: 800px; margin: 0 auto; padding: 20px; }
    .top-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
    .report-badge { background: #0f172a; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; display: inline-block; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; }
    .info-card h4 { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; border-bottom: 1px dashed #cbd5e1; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-val { font-weight: 700; color: #0f172a; }
    .table-title { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .data-table th { background: #0f172a; color: #fff; font-weight: 700; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .data-table tr:nth-child(even) { background: #f8fafc; }
    .total-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .sign-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
    .sign-box { width: 48%; text-align: center; vertical-align: bottom; padding-top: 40px; }
    .sign-line { border-top: 1px solid #94a3b8; font-weight: 700; font-size: 11px; color: #475569; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="top-header">
      <div>
        ${logoHtml}
        <div style="font-size:12px;font-weight:700;color:#334155;margin-top:4px">${company.businessName || 'InvoiceWise Enterprise'}</div>
        ${company.businessGSTIN ? `<div style="font-size:10px;color:#64748b">GSTIN: ${company.businessGSTIN}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="brand-title">Manufacturing Report</div>
        <div class="report-badge">${batch.batchNumber || batch.id}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <h4>Production Overview</h4>
        <div class="info-row"><span class="info-label">Product Name</span><span class="info-val">${batch.productName}</span></div>
        <div class="info-row"><span class="info-label">Bottle / Unit Size</span><span class="info-val">${batch.bottleSize || 'N/A'} ${batch.bottleSizeUnit || ''}</span></div>
        <div class="info-row"><span class="info-label">Quantity Produced</span><span class="info-val">${batch.quantityProduced || 0} Units</span></div>
        <div class="info-row"><span class="info-label">Total Volume</span><span class="info-val">${batch.totalVolumeInL ? batch.totalVolumeInL + ' L' : 'N/A'}</span></div>
      </div>
      <div class="info-card">
        <h4>Batch Meta &amp; Execution</h4>
        <div class="info-row"><span class="info-label">Manufacturing ID</span><span class="info-val">${batch.mfgId || batch.id}</span></div>
        <div class="info-row"><span class="info-label">Batch Number</span><span class="info-val">${batch.batchNumber || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Date &amp; Time</span><span class="info-val">${batch.date || ''} ${batch.time || ''}</span></div>
        <div class="info-row"><span class="info-label">Operator</span><span class="info-val">${batch.operatorName || 'System Operator'}</span></div>
      </div>
    </div>

    <div class="table-title">Raw Material Consumption Log</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Raw Material Name</th>
          <th>Consumed Quantity</th>
          <th>Unit Cost (₹)</th>
          <th style="text-align:right">Total Cost (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${ingredients.map(ing => `
          <tr>
            <td><strong>${ing.rawMaterialName}</strong></td>
            <td>${ing.consumedQty} ${ing.unit}</td>
            <td>₹${Number(ing.unitCost||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td style="text-align:right;font-weight:700">₹${Number(ing.totalCost||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-card">
      <div>
        <div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#1e3a8a">Estimated Total Production Cost</div>
        <div style="font-size:18px;font-weight:800;color:#1e40af">₹${Number(batch.estimatedTotalCost||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
      </div>
      <div style="font-size:11px;color:#3b82f6;font-weight:600">
        Status: <strong style="color:#15803d">COMPLETED ✓</strong>
      </div>
    </div>

    ${batch.notes ? `
      <div style="margin-bottom:20px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">
        <strong style="color:#475569;font-size:10px;text-transform:uppercase">Production Notes:</strong>
        <p style="font-size:11px;color:#334155;margin-top:2px">${batch.notes}</p>
      </div>
    ` : ''}

    <table class="sign-table">
      <tr>
        <td class="sign-box">
          <div class="sign-line">Operator Signature</div>
        </td>
        <td style="width:4%"></td>
        <td class="sign-box">
          <div class="sign-line">Quality / Plant Manager</div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
  }

  window.printManufacturingBatch = function (batch, companySettings) {
    const html = generateManufacturingHTML(batch, companySettings || {});
    const printWin = window.open('', '_blank', 'width=900,height=950,scrollbars=yes');
    if (!printWin) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print reports.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  function generateAuditLedgerHTML(appState, filters, companySettings) {
    companySettings = companySettings || {};
    const d = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const cName = companySettings.businessName || companySettings.companyName || 'InvoiceWise ERP';
    const cGst  = companySettings.businessGstin || companySettings.businessGSTIN || companySettings.gstin || companySettings.gstNumber || 'N/A';
    const cPan  = companySettings.businessPan || companySettings.businessPAN || companySettings.pan || 'N/A';
    const cAddr = companySettings.address || companySettings.businessAddress || '';
    const cPhone= companySettings.phone || companySettings.contactNumber || companySettings.businessPhone || '';
    const cEmail= companySettings.email || companySettings.businessEmail || '';
    const logo  = companySettings.businessLogoBase64 || '';

    const esc = str => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const fmtMoney = amt => '₹' + Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Lookup caches for name resolution
    const rmMap = {};
    (appState.rawMaterials || []).forEach(r => { if (r.id) rmMap[r.id] = r; });

    const prodMap = {};
    (appState.products || []).forEach(p => { if (p.id) prodMap[p.id] = p; });

    // ─── 1. Raw Materials Data ────────────────────────────────────────────────
    const rmbMap = {};
    (appState.rawMaterialBatches || []).forEach(b => {
      if (b.batchId) rmbMap[b.batchId] = b;
      if (b.supplierBatchNumber) rmbMap[b.supplierBatchNumber] = b;
    });

    let rmRows = (appState.rawMaterialTxns || []).map((t, idx) => {
      const bInfo = rmbMap[t.supplierBatchNumber] || rmbMap[t.batch_id] || rmbMap[t.rawMaterialBatchId] || {};
      const rmItem = rmMap[t.raw_material_id || t.rawMaterialId] || {};
      const actionStr = t.action || (t.type === 'IN' ? 'Purchase Inward' : 'Material Deduction');
      const isOk = t.type === 'IN' || actionStr.toLowerCase().includes('inward') || actionStr.toLowerCase().includes('purchase');
      const resolvedName = t.rawMaterialName || t.raw_material_name || bInfo.rawMaterialName || rmItem.name || 'Raw Material';
      return {
        seq: idx + 1,
        timestamp: t.createdAt || t.timestamp || `${t.date || ''} ${t.time || ''}`.trim() || '-',
        date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : (t.timestamp ? t.timestamp.split('T')[0] : '-')),
        correlationId: t.auditCorrelationId || '-',
        action: actionStr,
        type: isOk ? 'IN' : 'OUT',
        itemName: resolvedName,
        vendorName: t.vendorName || bInfo.vendorName || '-',
        batchNo: t.supplierBatchNumber || t.batch_id || t.rawMaterialBatchId || bInfo.supplierBatchNumber || bInfo.batchId || '-',
        qty: t.quantity !== undefined ? t.quantity : 0,
        unit: t.unit || bInfo.unit || rmItem.unit || '',
        remainingStock: t.remainingStock !== undefined ? `${t.remainingStock} ${t.unit || rmItem.unit || ''}` : (bInfo.remainingQuantity !== undefined ? `${bInfo.remainingQuantity} ${bInfo.unit || ''}` : '-'),
        purchaseDate: t.purchaseDate || t.date || bInfo.purchaseDate || '-',
        notes: t.notes || bInfo.notes || '-'
      };
    });

    // ─── 2. Manufacturing Data ───────────────────────────────────────────────
    let mfgRows = [];
    let mfgSeq = 1;

    (appState.batches || []).forEach(b => {
      const consumptions = b.consumptions || [];
      if (consumptions.length > 0) {
        consumptions.forEach(c => {
          mfgRows.push({
            seq: mfgSeq++,
            timestamp: b.createdAt || `${b.date || ''} 00:00:00`,
            date: b.date || (b.createdAt ? b.createdAt.split('T')[0] : '-'),
            correlationId: b.auditCorrelationId || '-',
            mfgBatchId: b.batchNumber || b.mfgId || b.id || '-',
            recipeName: `${b.recipeName || 'Recipe'} ${b.recipeVersion ? '(v' + b.recipeVersion + ')' : ''}`.trim(),
            consumedRm: `${c.rawMaterialName || 'Material'} (${c.consumedQty || c.quantity || 0} ${c.unit || ''})`,
            rmBatchLot: c.batchId || c.rawMaterialBatchId || '-',
            productOutput: b.productName || 'Finished Product',
            fgBatchLot: b.finishedGoodsBatchId || '-',
            producedQty: `+ ${b.quantityProduced !== undefined ? b.quantityProduced : (b.actualQty || 0)} ${b.unit || 'Bottles'}`,
            operator: b.operatorName || b.operator || 'System',
            status: b.status || 'COMPLETED',
            notes: b.notes || '-'
          });
        });
      } else {
        mfgRows.push({
          seq: mfgSeq++,
          timestamp: b.createdAt || `${b.date || ''} 00:00:00`,
          date: b.date || (b.createdAt ? b.createdAt.split('T')[0] : '-'),
          correlationId: b.auditCorrelationId || '-',
          mfgBatchId: b.batchNumber || b.mfgId || b.id || '-',
          recipeName: `${b.recipeName || 'Recipe'} ${b.recipeVersion ? '(v' + b.recipeVersion + ')' : ''}`.trim(),
          consumedRm: '-',
          rmBatchLot: '-',
          productOutput: b.productName || 'Finished Product',
          fgBatchLot: b.finishedGoodsBatchId || '-',
          producedQty: `+ ${b.quantityProduced !== undefined ? b.quantityProduced : (b.actualQty || 0)} ${b.unit || 'Bottles'}`,
          operator: b.operatorName || b.operator || 'System',
          status: b.status || 'COMPLETED',
          notes: b.notes || '-'
        });
      }
    });

    (appState.manufacturingAudit || []).forEach(a => {
      const mfgId = a.manufacturingBatchId || a.batchId;
      const isAlreadyMapped = mfgRows.some(r => r.mfgBatchId === mfgId && (r.consumedRm.includes(a.rawMaterialName || '---')));
      if (!isAlreadyMapped && (a.eventType === 'MANUFACTURING_CONSUMPTION' || a.eventType === 'MANUFACTURING_BATCH_COMPLETED' || a.manufacturingBatchId)) {
        mfgRows.push({
          seq: mfgSeq++,
          timestamp: a.timestamp || a.createdAt || `${a.date || ''} 00:00:00`,
          date: a.date || (a.timestamp ? a.timestamp.split('T')[0] : '-'),
          correlationId: a.auditCorrelationId || a.auditId || '-',
          mfgBatchId: a.manufacturingBatchId || a.batchId || '-',
          recipeName: a.recipeName || 'Formulation',
          consumedRm: a.rawMaterialName ? `${a.rawMaterialName} (${a.rawMaterialQuantityConsumed || a.quantityChanged || 0} ${a.unit || ''})` : '-',
          rmBatchLot: a.rawMaterialBatchId || a.batchId || '-',
          productOutput: a.productName || 'Finished Good',
          fgBatchLot: a.finishedGoodsBatchId || '-',
          producedQty: a.manufacturedQuantity ? `+ ${a.manufacturedQuantity} ${a.manufacturedUnit || 'pcs'}` : '-',
          operator: a.operatorName || 'System',
          status: a.eventType || a.action || 'LOGGED',
          notes: a.details || a.notes || '-'
        });
      }
    });

    // ─── 3. Finished Goods Data ───────────────────────────────────────────────
    let fgRows = (appState.finishedGoodsTxns || []).map((t, idx) => {
      const pItem = prodMap[t.productId || t.fgId] || {};
      const actionStr = t.action || (t.type === 'IN' ? 'Production Yield' : 'Inventory Deduction');
      const isOk = t.type === 'IN' || actionStr.toLowerCase().includes('production') || actionStr.toLowerCase().includes('inward');
      const resolvedName = t.productName || t.finishedGoodName || pItem.name || 'Finished Good';
      return {
        seq: idx + 1,
        timestamp: t.createdAt || t.timestamp || `${t.date || ''} ${t.time || ''}`.trim() || '-',
        date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : (t.timestamp ? t.timestamp.split('T')[0] : '-')),
        correlationId: t.auditCorrelationId || '-',
        action: actionStr,
        type: isOk ? 'IN' : 'OUT',
        productName: resolvedName,
        fgBatchId: t.finishedGoodsBatchId || t.batchNumber || '-',
        mfgBatchId: t.manufacturingBatchId || t.referenceId || '-',
        qty: t.quantity !== undefined ? t.quantity : 0,
        unit: t.unit || 'pcs',
        remainingStock: t.remainingStock !== undefined ? `${t.remainingStock} ${t.unit || 'pcs'}` : '-',
        refId: t.referenceId || '-',
        user: t.operatorName || t.user || 'System',
        notes: t.notes || '-'
      };
    });

    // ─── 4. Sales Invoices Data ───────────────────────────────────────────────
    let totalSalesValue = 0;
    let salesRows = (appState.invoices || []).map((inv, idx) => {
      const custName = inv.customerName || (inv.customer && inv.customer.name) || 'Walk-in Customer';
      const custGstin = inv.customerGstin || (inv.customer && inv.customer.gstin) || (inv.customerStateCode ? `State: ${inv.customerStateCode}` : '-');
      const itemsSummary = (inv.items || []).map(it => `${it.quantity || it.qty || 1}× ${it.name || it.productName || 'Item'}`).join(', ') || 'Invoice Line Items';
      const taxable = inv.taxableSubtotal !== undefined ? inv.taxableSubtotal : (inv.subtotal || 0);
      const taxTotal = inv.totalTax !== undefined ? inv.totalTax : ((inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0));
      const grandTotal = inv.grandTotal !== undefined ? inv.grandTotal : 0;
      totalSalesValue += Number(grandTotal || 0);
      const statusUpper = String(inv.status || 'DRAFT').toUpperCase();
      const payMode = inv.paymentMode ? `${inv.paymentMode.toUpperCase()}` : 'Cash/Bank';

      return {
        seq: idx + 1,
        date: inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : '-'),
        invoiceNumber: inv.invoiceNumber || inv.id || `INV-${idx+1}`,
        correlationId: inv.auditCorrelationId || '-',
        customerName: custName,
        customerGstin: custGstin,
        itemsSummary: itemsSummary,
        taxable: taxable,
        taxTotal: taxTotal,
        grandTotal: grandTotal,
        status: statusUpper,
        paymentMode: payMode,
        notes: inv.notes || `Invoice ${inv.invoiceNumber || inv.id} billed to ${custName}`
      };
    });

    // ─── 5. Filtering (If active) ────────────────────────────────────────────
    let filterDescription = 'All Modules — Complete System Audit Trail (No Filters)';
    if (filters && (filters.search || filters.startDate || filters.endDate || filters.product || filters.batch)) {
      const parts = [];
      if (filters.search) parts.push(`Query: "${filters.search}"`);
      if (filters.startDate) parts.push(`From: ${filters.startDate}`);
      if (filters.endDate) parts.push(`To: ${filters.endDate}`);
      if (filters.product) parts.push(`Item: ${filters.product}`);
      if (filters.batch) parts.push(`Batch: ${filters.batch}`);
      filterDescription = parts.join(' | ');

      const sQuery = (filters.search || '').toLowerCase();
      const sStart = filters.startDate || '';
      const sEnd   = filters.endDate || '';
      const sProd  = (filters.product || '').toLowerCase();
      const sBatch = (filters.batch || '').toLowerCase();

      const matchDate = dStr => {
        if (!dStr) return true;
        if (sStart && dStr < sStart) return false;
        if (sEnd && dStr > sEnd) return false;
        return true;
      };

      rmRows = rmRows.filter(r => {
        if (!matchDate(r.date)) return false;
        if (sProd && !r.itemName.toLowerCase().includes(sProd)) return false;
        if (sBatch && !(r.batchNo.toLowerCase().includes(sBatch) || r.correlationId.toLowerCase().includes(sBatch))) return false;
        if (sQuery) {
          const str = `${r.correlationId} ${r.itemName} ${r.vendorName} ${r.batchNo} ${r.action} ${r.notes}`.toLowerCase();
          if (!str.includes(sQuery)) return false;
        }
        return true;
      });

      mfgRows = mfgRows.filter(r => {
        if (!matchDate(r.date)) return false;
        if (sProd && !(r.recipeName.toLowerCase().includes(sProd) || r.productOutput.toLowerCase().includes(sProd) || r.consumedRm.toLowerCase().includes(sProd))) return false;
        if (sBatch && !(r.mfgBatchId.toLowerCase().includes(sBatch) || r.rmBatchLot.toLowerCase().includes(sBatch) || r.fgBatchLot.toLowerCase().includes(sBatch) || r.correlationId.toLowerCase().includes(sBatch))) return false;
        if (sQuery) {
          const str = `${r.correlationId} ${r.mfgBatchId} ${r.recipeName} ${r.productOutput} ${r.consumedRm} ${r.operator} ${r.notes}`.toLowerCase();
          if (!str.includes(sQuery)) return false;
        }
        return true;
      });

      fgRows = fgRows.filter(r => {
        if (!matchDate(r.date)) return false;
        if (sProd && !r.productName.toLowerCase().includes(sProd)) return false;
        if (sBatch && !(r.fgBatchId.toLowerCase().includes(sBatch) || r.mfgBatchId.toLowerCase().includes(sBatch) || r.correlationId.toLowerCase().includes(sBatch))) return false;
        if (sQuery) {
          const str = `${r.correlationId} ${r.productName} ${r.fgBatchId} ${r.mfgBatchId} ${r.action} ${r.notes}`.toLowerCase();
          if (!str.includes(sQuery)) return false;
        }
        return true;
      });

      salesRows = salesRows.filter(r => {
        if (!matchDate(r.date)) return false;
        if (sProd && !r.itemsSummary.toLowerCase().includes(sProd)) return false;
        if (sBatch && !(r.invoiceNumber.toLowerCase().includes(sBatch) || r.correlationId.toLowerCase().includes(sBatch))) return false;
        if (sQuery) {
          const str = `${r.correlationId} ${r.invoiceNumber} ${r.customerName} ${r.itemsSummary} ${r.status} ${r.notes}`.toLowerCase();
          if (!str.includes(sQuery)) return false;
        }
        return true;
      });
    }

    // Re-index sequences after filter
    rmRows.forEach((r, i) => r.seq = i + 1);
    mfgRows.forEach((r, i) => r.seq = i + 1);
    fgRows.forEach((r, i) => r.seq = i + 1);
    salesRows.forEach((r, i) => r.seq = i + 1);

    // ─── 5b. Deletion Memory Records ─────────────────────────────────────────
    const deletionRows = (appState.manufacturingAudit || [])
      .filter(a => a.eventType === 'DATA_DELETION' || a.category === 'DELETIONS')
      .map((a, idx) => ({
        seq: idx + 1,
        timestamp: a.timestamp || `${a.date || ''} ${a.time || ''}`,
        date: a.date || (a.timestamp ? a.timestamp.split('T')[0] : '-'),
        time: a.time || (a.timestamp && a.timestamp.includes('T') ? a.timestamp.split('T')[1].split('.')[0] : ''),
        module: 'DELETION',
        modClass: 'badge-mod-critical',
        correlationId: a.auditCorrelationId || a.auditId || '-',
        action: a.transactionType || 'RECORD_DELETION',
        refId: a.entityId || '-',
        itemName: a.itemName || `${(a.entityType || 'RECORD').toUpperCase()}: ${a.entityName || '-'}`,
        entityType: a.entityType || 'record',
        entityName: a.entityName || '',
        deletionReason: a.deletionReason || a.reason || 'No reason specified',
        deductedQty: a.deductedQty || 0,
        deductedVal: a.deductedVal || 0,
        unit: a.unit || '',
        user: a.operatorName || 'User',
        notes: `Reason: "${a.deletionReason || a.reason || ''}" · Deleted on ${a.date} at ${a.time}`
      }));

    // ─── 6. Unified Master Chronological Stream ──────────────────────────────
    const allRows = [
      ...rmRows.map(r => ({
        timestamp: r.timestamp,
        date: r.date,
        module: 'RAW MATERIAL',
        modClass: 'badge-mod-rm',
        correlationId: r.correlationId,
        action: r.action,
        refId: r.batchNo,
        detail: `${r.itemName} (Vendor: ${r.vendorName})`,
        qtyFlow: `${r.type === 'IN' ? '+' : '-'} ${r.qty} ${r.unit}`.trim(),
        balance: r.remainingStock,
        user: r.vendorName,
        notes: r.notes
      })),
      ...mfgRows.map(m => ({
        timestamp: m.timestamp,
        date: m.date,
        module: 'MANUFACTURING',
        modClass: 'badge-mod-mfg',
        correlationId: m.correlationId,
        action: `Batch Commit (${m.status})`,
        refId: m.mfgBatchId,
        detail: `${m.recipeName} → ${m.productOutput} [${m.consumedRm}]`,
        qtyFlow: m.producedQty,
        balance: '-',
        user: m.operator,
        notes: m.notes
      })),
      ...fgRows.map(f => ({
        timestamp: f.timestamp,
        date: f.date,
        module: 'FINISHED GOODS',
        modClass: 'badge-mod-fg',
        correlationId: f.correlationId,
        action: f.action,
        refId: f.fgBatchId,
        detail: `${f.productName} (Linked MFG: ${f.mfgBatchId})`,
        qtyFlow: `${f.type === 'IN' ? '+' : '-'} ${f.qty} ${f.unit}`.trim(),
        balance: f.remainingStock,
        user: f.user,
        notes: f.notes
      })),
      ...salesRows.map(s => ({
        timestamp: `${s.date} 00:00:00`,
        date: s.date,
        module: 'SALES',
        modClass: 'badge-mod-sales',
        correlationId: s.correlationId,
        action: `Tax Invoice (${s.status})`,
        refId: s.invoiceNumber,
        detail: `${s.customerName} · ${s.itemsSummary}`,
        qtyFlow: fmtMoney(s.grandTotal),
        balance: '-',
        user: s.customerName,
        notes: s.notes
      })),
      ...deletionRows.map(d => ({
        timestamp: d.timestamp,
        date: d.date,
        module: 'DELETION',
        modClass: 'badge-mod-critical',
        correlationId: d.correlationId,
        action: d.action,
        refId: d.refId,
        detail: `${d.itemName} [${d.entityType.toUpperCase()}] · Reason: "${d.deletionReason}"`,
        qtyFlow: d.deductedQty > 0 ? `-${d.deductedQty} ${d.unit}` : '-',
        balance: '-',
        user: d.user,
        notes: d.notes
      }))
    ].sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    allRows.forEach((r, i) => r.seq = i + 1);

    const totalAuditEvents = allRows.length;

    // ─── Build HTML Tables ───────────────────────────────────────────────────

    // Section 1: Raw Material
    const rmTableBody = rmRows.length === 0
      ? `<tr><td colspan="11" class="text-center" style="padding:15px;color:#64748b">No Raw Material records found matching criteria</td></tr>`
      : rmRows.map(r => `
        <tr>
          <td class="text-center font-mono">${r.seq}</td>
          <td class="font-mono" style="white-space:nowrap">${esc(r.date)}</td>
          <td class="font-mono" style="color:#0284c7;font-weight:700">${esc(r.correlationId)}</td>
          <td><span class="badge ${r.type === 'IN' ? 'badge-in' : 'badge-out'}">${esc(r.action)}</span></td>
          <td><strong>${esc(r.itemName)}</strong></td>
          <td>${esc(r.vendorName)}</td>
          <td class="font-mono">${esc(r.batchNo)}</td>
          <td class="font-mono text-right" style="font-weight:700;color:${r.type === 'IN' ? '#166534' : '#991b1b'}">
            ${r.type === 'IN' ? '+' : '-'} ${r.qty} ${esc(r.unit)}
          </td>
          <td class="font-mono text-right" style="font-weight:600">${esc(r.remainingStock)}</td>
          <td class="font-mono" style="white-space:nowrap">${esc(r.purchaseDate)}</td>
          <td style="color:#475569;font-size:7.2pt">${esc(r.notes)}</td>
        </tr>
      `).join('');

    // Section 2: Manufacturing
    const mfgTableBody = mfgRows.length === 0
      ? `<tr><td colspan="12" class="text-center" style="padding:15px;color:#64748b">No Manufacturing records found matching criteria</td></tr>`
      : mfgRows.map(m => `
        <tr>
          <td class="text-center font-mono">${m.seq}</td>
          <td class="font-mono" style="white-space:nowrap">${esc(m.date)}</td>
          <td class="font-mono" style="color:#0284c7;font-weight:700">${esc(m.correlationId)}</td>
          <td class="font-mono" style="color:#7c3aed;font-weight:700">${esc(m.mfgBatchId)}</td>
          <td><strong>${esc(m.recipeName)}</strong></td>
          <td style="color:#b91c1c">${esc(m.consumedRm)}</td>
          <td class="font-mono">${esc(m.rmBatchLot)}</td>
          <td style="color:#15803d;font-weight:600">${esc(m.productOutput)}</td>
          <td class="font-mono">${esc(m.fgBatchLot)}</td>
          <td class="font-mono text-right" style="color:#15803d;font-weight:700">${esc(m.producedQty)}</td>
          <td>${esc(m.operator)}</td>
          <td style="color:#475569;font-size:7.2pt">${esc(m.status)} · ${esc(m.notes)}</td>
        </tr>
      `).join('');

    // Section 3: Finished Goods
    const fgTableBody = fgRows.length === 0
      ? `<tr><td colspan="11" class="text-center" style="padding:15px;color:#64748b">No Finished Goods records found matching criteria</td></tr>`
      : fgRows.map(f => `
        <tr>
          <td class="text-center font-mono">${f.seq}</td>
          <td class="font-mono" style="white-space:nowrap">${esc(f.date)}</td>
          <td class="font-mono" style="color:#0284c7;font-weight:700">${esc(f.correlationId)}</td>
          <td><span class="badge ${f.type === 'IN' ? 'badge-in' : 'badge-out'}">${esc(f.action)}</span></td>
          <td><strong>${esc(f.productName)}</strong></td>
          <td class="font-mono" style="color:#059669;font-weight:600">${esc(f.fgBatchId)}</td>
          <td class="font-mono">${esc(f.mfgBatchId)}</td>
          <td class="font-mono text-right" style="font-weight:700;color:${f.type === 'IN' ? '#166534' : '#991b1b'}">
            ${f.type === 'IN' ? '+' : '-'} ${f.qty} ${esc(f.unit)}
          </td>
          <td class="font-mono text-right" style="font-weight:600">${esc(f.remainingStock)}</td>
          <td class="font-mono">${esc(f.refId)}</td>
          <td style="color:#475569;font-size:7.2pt">${esc(f.notes)}</td>
        </tr>
      `).join('');

    // Section 4: Sales Invoices
    const salesTableBody = salesRows.length === 0
      ? `<tr><td colspan="12" class="text-center" style="padding:15px;color:#64748b">No Sales Invoices found matching criteria</td></tr>`
      : salesRows.map(s => {
        let badgeCls = 'badge-pending';
        if (['PAID', 'COMPLETED', 'OK'].includes(s.status)) badgeCls = 'badge-paid';
        else if (['SENT'].includes(s.status)) badgeCls = 'badge-sent';
        else if (['CANCELLED'].includes(s.status)) badgeCls = 'badge-cancelled';

        return `
          <tr>
            <td class="text-center font-mono">${s.seq}</td>
            <td class="font-mono" style="white-space:nowrap">${esc(s.date)}</td>
            <td class="font-mono" style="color:#1d4ed8;font-weight:700">${esc(s.invoiceNumber)}</td>
            <td class="font-mono" style="color:#0284c7">${esc(s.correlationId)}</td>
            <td><strong>${esc(s.customerName)}</strong></td>
            <td class="font-mono" style="font-size:7pt">${esc(s.customerGstin)}</td>
            <td style="font-size:7.2pt">${esc(s.itemsSummary)}</td>
            <td class="font-mono text-right">${fmtMoney(s.taxable)}</td>
            <td class="font-mono text-right">${fmtMoney(s.taxTotal)}</td>
            <td class="font-mono text-right" style="font-weight:700;color:#0f172a">${fmtMoney(s.grandTotal)}</td>
            <td><span class="badge ${badgeCls}">${esc(s.status)}</span></td>
            <td style="color:#475569;font-size:7.2pt">${esc(s.paymentMode)} · ${esc(s.notes)}</td>
          </tr>
        `;
      }).join('');

    // Section 5: Unified Chronological Stream
    const allTableBody = allRows.length === 0
      ? `<tr><td colspan="11" class="text-center" style="padding:15px;color:#64748b">No chronological audit events found</td></tr>`
      : allRows.map(a => `
        <tr>
          <td class="text-center font-mono">${a.seq}</td>
          <td class="font-mono" style="white-space:nowrap;font-size:7pt">${esc(a.timestamp)}</td>
          <td><span class="badge ${a.modClass}">${esc(a.module)}</span></td>
          <td class="font-mono" style="color:#0284c7;font-weight:700">${esc(a.correlationId)}</td>
          <td><strong>${esc(a.action)}</strong></td>
          <td class="font-mono">${esc(a.refId)}</td>
          <td>${esc(a.detail)}</td>
          <td class="font-mono text-right" style="font-weight:700">${esc(a.qtyFlow)}</td>
          <td class="font-mono text-right">${esc(a.balance)}</td>
          <td>${esc(a.user)}</td>
          <td style="color:#475569;font-size:7.2pt">${esc(a.notes)}</td>
        </tr>
      `).join('');

    // Section 6: Mandatory Deletions & Audit Memory
    const deletionTableBody = deletionRows.length === 0
      ? `<tr><td colspan="7" class="text-center" style="padding:15px;color:#64748b">No deletion events recorded in audit memory</td></tr>`
      : deletionRows.map(d => `
        <tr style="background:#fff5f5">
          <td class="text-center font-mono">${d.seq}</td>
          <td class="font-mono" style="white-space:nowrap;font-size:7pt"><strong>${esc(d.date)}</strong> ${esc(d.time)}</td>
          <td class="font-mono" style="color:#b91c1c;font-weight:700">${esc(d.correlationId)}</td>
          <td><strong style="color:#991b1b">${esc(d.itemName)}</strong></td>
          <td><span class="badge badge-mod-critical">${esc(d.entityType.toUpperCase())}</span></td>
          <td class="font-mono text-right" style="color:#b91c1c;font-weight:700">${d.deductedQty > 0 ? `-${d.deductedQty} ${esc(d.unit)}` : '-'}</td>
          <td style="color:#7f1d1d;font-weight:600;background:#fef2f2">"${esc(d.deletionReason)}"</td>
        </tr>
      `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(cName)} — Comprehensive Audit &amp; Traceability Dossier</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 10mm 8mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
        color: #0f172a !important;
      }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.35;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #0369a1; }
    .close-btn {
      background: #475569;
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      margin-left: 10px;
    }
    .close-btn:hover { background: #334155; }
    .report-wrap {
      max-width: 100%;
      margin: 0 auto;
      padding: 16px 20px;
      background: #ffffff;
    }
    .header-card {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .company-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px 0;
      letter-spacing: -0.3px;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 4px 0 2px 0;
    }
    .doc-sub {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 6px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .kpi-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      font-family: "SFMono-Regular", Consolas, monospace;
    }
    .kpi-lbl {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .section-card {
      margin-bottom: 24px;
      page-break-inside: auto;
    }
    .section-header {
      background: #1e293b;
      color: #ffffff;
      padding: 7px 12px;
      border-radius: 4px 4px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-badge {
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 7.5pt;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.4pt;
      table-layout: auto;
      page-break-inside: auto;
      border: 1px solid #cbd5e1;
      border-top: none;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background: #334155 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 5px 6px;
      border: 1px solid #475569;
      text-align: left;
      white-space: nowrap;
    }
    td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      vertical-align: middle;
      word-break: break-word;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .font-mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 7.2pt;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .badge-in { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-out { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-sent { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-pending { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-mod-rm { background: #cffafe; color: #155e75; border: 1px solid #67e8f9; }
    .badge-mod-mfg { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .badge-mod-fg { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .badge-mod-sales { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-mod-critical { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .sign-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sign-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      text-align: center;
      font-size: 7.5pt;
      color: #475569;
    }
    .sign-title { font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .footer {
      border-top: 1px solid #cbd5e1;
      margin-top: 20px;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Screen Navigation Bar (Hidden during Print) -->
  <div class="no-print-bar no-print">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-weight:700;font-size:14px;letter-spacing:0.5px">📄 INVOICEWISE AUDIT DOSSIER</span>
      <span style="background:#0284c7;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px">A4 Landscape</span>
      <span style="color:#94a3b8;font-size:12px">Tip: In print preview, choose Destination 'Save as PDF'</span>
    </div>
    <div>
      <button class="print-btn" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save as PDF
      </button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="report-wrap">
    <!-- Executive Header Card -->
    <div class="header-card">
      <div>
        <div class="company-title">${esc(cName)}</div>
        <div style="font-size:8pt;color:#475569;line-height:1.4">
          ${cAddr ? `<span>${esc(cAddr)}</span><br/>` : ''}
          <strong>GSTIN:</strong> ${esc(cGst)} &nbsp;|&nbsp; <strong>PAN:</strong> ${esc(cPan)}
          ${cPhone ? `&nbsp;|&nbsp; <strong>Tel:</strong> ${esc(cPhone)}` : ''}
          ${cEmail ? `&nbsp;|&nbsp; <strong>Email:</strong> ${esc(cEmail)}` : ''}
        </div>
        <div class="doc-title">Comprehensive Audit &amp; Traceability Dossier</div>
        <div class="doc-sub">Full System Ledger: Raw Materials, Manufacturing BOM, Finished Goods &amp; Sales Tax Invoices</div>
      </div>
      <div style="text-align:right">
        ${logo ? `<img src="${logo}" style="max-height:55px;max-width:180px;object-fit:contain;margin-bottom:6px" alt="Logo" /><br/>` : ''}
        <div style="font-size:7.5pt;color:#64748b;line-height:1.4">
          <strong>Report Generated:</strong> ${esc(d)}<br/>
          <strong>Verification Authority:</strong> InvoiceWise Cryptographic Engine<br/>
          <strong>Audit Scope:</strong> ${esc(filterDescription)}<br/>
          <span style="display:inline-block;margin-top:4px;padding:2px 6px;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:3px;font-size:7pt;font-weight:700">
            ✓ IMMUTABLE AUDIT TRAIL VERIFIED
          </span>
        </div>
      </div>
    </div>

    <!-- Executive KPI Dashboard Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val">${totalAuditEvents}</div>
        <div class="kpi-lbl">Total Audit Records</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#0e7490">${rmRows.length}</div>
        <div class="kpi-lbl">Raw Material Movements</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#7e22ce">${mfgRows.length}</div>
        <div class="kpi-lbl">Mfg Production Runs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#047857">${fgRows.length}</div>
        <div class="kpi-lbl">Finished Goods Moves</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#1d4ed8">${salesRows.length} (${fmtMoney(totalSalesValue)})</div>
        <div class="kpi-lbl">Invoices Billed (Total Value)</div>
      </div>
    </div>

    <!-- ─── SECTION 1: RAW MATERIAL INWARD & MOVEMENTS ──────────────────────── -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span>🌿 Section 1: Raw Materials Inward, Lots &amp; Inventory Movements</span>
        </div>
        <span class="section-badge">${rmRows.length} Records</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:75px">Date</th>
            <th style="width:115px">Audit Correlation ID</th>
            <th style="width:95px">Action / Type</th>
            <th>Raw Material Item</th>
            <th>Vendor / Supplier</th>
            <th style="width:105px">Supplier Batch / Lot #</th>
            <th class="text-right" style="width:85px">Movement</th>
            <th class="text-right" style="width:85px">Balance Stock</th>
            <th style="width:80px">Purchase Date</th>
            <th style="width:150px">Notes &amp; Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rmTableBody}
        </tbody>
      </table>
    </div>

    <div class="page-break"></div>

    <!-- ─── SECTION 2: MANUFACTURING PRODUCTION & CONSUMPTION ───────────────── -->
    <div class="section-card">
      <div class="section-header" style="background:#581c87">
        <div class="section-title">
          <span>⚙️ Section 2: Manufacturing Production Runs &amp; BOM Material Consumption</span>
        </div>
        <span class="section-badge">${mfgRows.length} Records</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:75px">Date</th>
            <th style="width:115px">Audit Correlation ID</th>
            <th style="width:115px">MFG Batch ID</th>
            <th>BOM Recipe &amp; Version</th>
            <th>Consumed Raw Material</th>
            <th style="width:105px">RM Lot #</th>
            <th>Product Output</th>
            <th style="width:105px">FG Batch Lot</th>
            <th class="text-right" style="width:95px">Produced Yield</th>
            <th style="width:90px">Operator</th>
            <th style="width:140px">Status &amp; QC Details</th>
          </tr>
        </thead>
        <tbody>
          ${mfgTableBody}
        </tbody>
      </table>
    </div>

    <div class="page-break"></div>

    <!-- ─── SECTION 3: FINISHED GOODS & PACKAGING MOVEMENTS ─────────────────── -->
    <div class="section-card">
      <div class="section-header" style="background:#064e3b">
        <div class="section-title">
          <span>📦 Section 3: Finished Goods Pool &amp; Packaging Movement Ledger</span>
        </div>
        <span class="section-badge">${fgRows.length} Records</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:75px">Date</th>
            <th style="width:115px">Audit Correlation ID</th>
            <th style="width:100px">Action / Movement</th>
            <th>Finished Good / SKU</th>
            <th style="width:110px">FG Batch Lot #</th>
            <th style="width:110px">Linked MFG Batch</th>
            <th class="text-right" style="width:85px">Movement</th>
            <th class="text-right" style="width:85px">Remaining Stock</th>
            <th style="width:90px">Reference / Inv #</th>
            <th style="width:150px">Notes &amp; Destination</th>
          </tr>
        </thead>
        <tbody>
          ${fgTableBody}
        </tbody>
      </table>
    </div>

    <div class="page-break"></div>

    <!-- ─── SECTION 4: SALES INVOICES & CUSTOMER BILLING ───────────────────── -->
    <div class="section-card">
      <div class="section-header" style="background:#1e3a8a">
        <div class="section-title">
          <span>🧾 Section 4: Sales Invoices &amp; Revenue Audit Ledger</span>
        </div>
        <span class="section-badge">${salesRows.length} Invoices</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:75px">Date</th>
            <th style="width:105px">Invoice #</th>
            <th style="width:115px">Audit Correlation ID</th>
            <th>Customer Name</th>
            <th style="width:110px">GSTIN / State</th>
            <th>Billed Items &amp; Quantities</th>
            <th class="text-right" style="width:80px">Taxable (₹)</th>
            <th class="text-right" style="width:75px">GST Tax (₹)</th>
            <th class="text-right" style="width:85px">Grand Total (₹)</th>
            <th class="text-center" style="width:75px">Status</th>
            <th style="width:125px">Payment &amp; Notes</th>
          </tr>
        </thead>
        <tbody>
          ${salesTableBody}
        </tbody>
      </table>
    </div>

    <div class="page-break"></div>

    <!-- ─── SECTION 5: UNIFIED CHRONOLOGICAL MASTER STREAM ─────────────────── -->
    <div class="section-card">
      <div class="section-header" style="background:#0f172a">
        <div class="section-title">
          <span>🔗 Section 5: Master Unified Chronological Event Stream (All Modules Combined)</span>
        </div>
        <span class="section-badge">${allRows.length} Total Events</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:110px">Timestamp</th>
            <th style="width:95px">Module</th>
            <th style="width:115px">Audit Correlation ID</th>
            <th style="width:110px">Event / Action</th>
            <th style="width:105px">Primary Ref / Lot #</th>
            <th>Item / Formulation Description</th>
            <th class="text-right" style="width:85px">Flow (+ / -)</th>
            <th class="text-right" style="width:75px">Balance</th>
            <th style="width:95px">User / Party</th>
            <th style="width:130px">Audit Notes</th>
          </tr>
        </thead>
        <tbody>
          ${allTableBody}
        </tbody>
      </table>
    </div>

    <!-- ─── SECTION 6: MANDATORY DELETION REASONS & AUDIT MEMORY ───────────────── -->
    <div class="section-card page-break">
      <div class="section-header" style="background:#991b1b">
        <div class="section-title">
          <span>🗑️ Section 6: Mandatory Deletion Reasons &amp; Immutable Audit Memory</span>
        </div>
        <span class="section-badge" style="background:#7f1d1d">${deletionRows.length} Deletion Events</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px">#</th>
            <th style="width:120px">Date &amp; Exact Time</th>
            <th style="width:130px">Audit Correlation ID</th>
            <th>Deleted Record / Material / Vendor</th>
            <th style="width:100px">Entity Type</th>
            <th class="text-right" style="width:110px">Deducted Stock</th>
            <th>Mandatory Reason for Deletion</th>
          </tr>
        </thead>
        <tbody>
          ${deletionTableBody}
        </tbody>
      </table>
    </div>

    <!-- Regulatory Sign-off Box -->
    <div class="sign-grid">
      <div class="sign-box">
        <div class="sign-title">Prepared &amp; Verified By</div>
        <div>Lead Production Pharmacist / Chemist</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Quality Assurance &amp; Compliance</div>
        <div>QA Compliance Auditor (FDA / GMP / ISO)</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Authorized Company Signatory</div>
        <div>Executive Officer / Plant Director</div>
      </div>
    </div>

    <!-- Document Footer -->
    <div class="footer">
      <div>InvoiceWise ERP &copy; ${new Date().getFullYear()} — Enterprise Audit &amp; Traceability Engine</div>
      <div>Rule 46 GST, GMP &amp; FDA 21 CFR Part 11 Compliant Audit Dossier</div>
      <div>Page Printed: ${esc(d)}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;
  }

  window.printAuditLedger = function (appState, filters, companySettings) {
    const html = generateAuditLedgerHTML(appState, filters, companySettings || {});
    const printWin = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');
    if (!printWin) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print reports.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };
})();
