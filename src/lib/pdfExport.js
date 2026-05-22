import jsPDF from 'jspdf';

function hasText(value) {
  return Boolean(value && String(value).trim());
}

function getImageFormat(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}

function addHeaderLogo(doc, logoDataUrl, pageWidth, margin) {
  if (!logoDataUrl) return;
  try {
    const logoWidth = 32;
    const logoHeight = 16;
    doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), pageWidth - margin - logoWidth, 8, logoWidth, logoHeight, undefined, 'FAST');
  } catch (error) {
    console.warn('Unable to add logo to PDF header:', error);
  }
}

function addSectionTitle(doc, title, margin, y) {
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  return y + 8;
}

function addParagraph(doc, text, margin, y, contentWidth) {
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(String(text || '').trim(), contentWidth);
  doc.text(lines, margin, y);
  return y + lines.length * 5 + 10;
}

// ─── Status color map → RGB ───────────────────────────────────────────────────
const STATUS_COLORS = {
  'Complete':        [16, 185, 129],   // emerald
  'In Progress':     [59, 130, 246],   // blue
  'Open Issue':      [245, 158, 11],   // amber
  'Failed':          [239, 68, 68],    // red
  'Deferred':        [100, 116, 139],  // slate
  'Locked by Client':[139, 92, 246],   // purple
};

function statusColor(status) {
  return STATUS_COLORS[status] || [100, 116, 139];
}

// ─── Asset Status Summary section ─────────────────────────────────────────────
function addAssetSummarySection(doc, assets, margin, y, contentWidth, pageHeight, addPageIfNeeded) {
  if (!assets || assets.length === 0) return y;

  addPageIfNeeded(60);
  y = addSectionTitle(doc, 'Asset / Equipment Status', margin, y);

  // Count per status
  const allStatuses = ['Complete', 'In Progress', 'Open Issue', 'Failed', 'Deferred', 'Locked by Client'];
  const counts = allStatuses.map(s => ({ status: s, count: assets.filter(a => a.status === s).length }));
  const total  = assets.length;

  // ── Summary pill row ──────────────────────────────────────────────────────
  // "All (7)" pill
  const pillH = 9;
  const pillPad = 4;
  let px = margin;

  // "All" pill — amber fill (matches the UI)
  doc.setFillColor(245, 158, 11);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(px, y, 28, pillH, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`All (${total})`, px + pillPad, y + 6.2);
  px += 32;

  counts.forEach(({ status, count }) => {
    const label = `${status} (${count})`;
    const w = doc.getTextWidth(label) + pillPad * 2 + 6; // dot + padding
    if (px + w > margin + contentWidth) return; // skip if overflow
    const [r, g, b] = statusColor(status);

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 235);
    doc.roundedRect(px, y, w, pillH, 2, 2, 'FD');

    // Colored dot
    doc.setFillColor(r, g, b);
    doc.circle(px + pillPad + 1.5, y + pillH / 2, 1.5, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, px + pillPad + 5, y + 6.2);
    px += w + 4;
  });

  y += pillH + 6;

  // ── Progress bar (Complete / total) ──────────────────────────────────────
  const completeCount = assets.filter(a => a.status === 'Complete').length;
  const pct = total > 0 ? completeCount / total : 0;
  const barW = contentWidth;
  const barH = 5;

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(margin, y, barW, barH, 2, 2, 'F');
  if (pct > 0) {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin, y, Math.max(4, barW * pct), barH, 2, 2, 'F');
  }
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${completeCount} of ${total} complete (${Math.round(pct * 100)}%)`, margin + barW + 3, y + 4);
  y += barH + 10;

  // ── Asset table ───────────────────────────────────────────────────────────
  addPageIfNeeded(16);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('ID',     margin + 2,   y + 5.5);
  doc.text('Name',   margin + 28,  y + 5.5);
  doc.text('Type',   margin + 100, y + 5.5);
  doc.text('Status', margin + 135, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  const sorted = [...assets].sort((a, b) => (a.asset_id || '').localeCompare(b.asset_id || ''));
  sorted.forEach((asset) => {
    const nameLines = doc.splitTextToSize(asset.asset_name || '', 68);
    const rowH = Math.max(7, nameLines.length * 5 + 2);
    addPageIfNeeded(rowH + 2);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(asset.asset_id || '',   margin + 2,   y + 5);
    doc.text(nameLines,              margin + 28,  y + 5);
    doc.text(asset.asset_type || '', margin + 100, y + 5);

    // Status with colored dot
    const [r, g, b] = statusColor(asset.status);
    doc.setFillColor(r, g, b);
    doc.circle(margin + 138, y + 3.5, 1.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.text(asset.status || '', margin + 141, y + 5);

    y += rowH;
  });

  return y + 10;
}

// ─── Daily Report PDF ─────────────────────────────────────────────────────────

export function generateDailyReportPDF({ project, log, entries, issues, assets = [], companyName, logoDataUrl }) {
  const doc = new jsPDF();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPageIfNeeded = (needed = 30) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Header band
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 44, 'F');
  addHeaderLogo(doc, logoDataUrl, pageWidth, margin);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Daily Activity Report', margin, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${project.project_name} — ${project.client_name || ''}`, margin, 29);
  doc.text(`${project.location || ''} | ${log.log_date} | ${project.activity_type || ''}`, margin, 37);
  if (companyName) doc.text(`Prepared by: ${companyName}`, pageWidth - margin, 29, { align: 'right' });
  doc.text(`Project #: ${project.project_number || 'N/A'}`, pageWidth - margin, 37, { align: 'right' });

  y = 56;
  doc.setTextColor(30, 41, 59);

  // Executive Summary
  if (hasText(log.executive_summary)) {
    y = addSectionTitle(doc, 'Executive Summary', margin, y);
    y = addParagraph(doc, log.executive_summary, margin, y, contentWidth);
  }

  // Asset Status Summary
  if (assets.length > 0) {
    addPageIfNeeded(50);
    y = addAssetSummarySection(doc, assets, margin, y, contentWidth, pageHeight, addPageIfNeeded);
  }

  // Activity Log
  addPageIfNeeded(40);
  y = addSectionTitle(doc, 'Activity Log', margin, y);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Time',  margin + 2,  y + 5.5);
  doc.text('Entry', margin + 25, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  const sortedEntries = [...entries].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  sortedEntries.forEach((entry) => {
    const lines = doc.splitTextToSize(entry.content, contentWidth - 27);
    const rowHeight = Math.max(7, lines.length * 5 + 2);
    addPageIfNeeded(rowHeight + 2);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    doc.setFontSize(9); doc.setTextColor(30, 41, 59);
    doc.text(entry.time_stamp || '', margin + 2, y + 5);
    doc.text(lines, margin + 25, y + 5);
    y += rowHeight;
  });

  // Issues & Action Items
  y += 10;
  if (issues && issues.length > 0) {
    addPageIfNeeded(40);
    y = addSectionTitle(doc, 'Issues & Action Items', margin, y);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('#',           margin + 2,   y + 5.5);
    doc.text('Description', margin + 12,  y + 5.5);
    doc.text('Status',      margin + 100, y + 5.5);
    doc.text('Owner',       margin + 125, y + 5.5);
    doc.text('Target',      margin + 155, y + 5.5);
    y += 8;
    doc.setFont('helvetica', 'normal');
    issues.forEach((issue, idx) => {
      const lines = doc.splitTextToSize(issue.description || '', 85);
      const rowHeight = Math.max(7, lines.length * 5 + 2);
      addPageIfNeeded(rowHeight + 2);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      doc.setFontSize(8); doc.setTextColor(30, 41, 59);
      doc.text(String(issue.issue_number || idx + 1), margin + 2,   y + 5);
      doc.text(lines,                                  margin + 12,  y + 5);
      doc.text(issue.status      || '',                margin + 100, y + 5);
      doc.text(issue.owner       || '',                margin + 125, y + 5);
      doc.text(issue.target_date || '',                margin + 155, y + 5);
      y += rowHeight;
    });
    y += 10;
  }

  // Lookahead
  if (hasText(log.lookahead)) {
    addPageIfNeeded(30);
    y = addSectionTitle(doc, 'Lookahead', margin, y);
    y = addParagraph(doc, log.lookahead, margin, y, contentWidth);
  }

  const safeProjectName = String(project.project_name || 'Project').replace(/[\\/:*?"<>|]/g, '_');
  doc.save(`Daily_Report_${safeProjectName}_${log.log_date}.pdf`);
}

// ─── Punch List PDF (unchanged) ───────────────────────────────────────────────

export function generatePunchListPDF({ project, items, companyName, logoDataUrl }) {
  const doc = new jsPDF();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPageIfNeeded = (needed = 30) => {
    if (y + needed > pageHeight - 20) { doc.addPage(); y = 20; }
  };

  doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageWidth, 44, 'F');
  addHeaderLogo(doc, logoDataUrl, pageWidth, margin);
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Punch List Report', margin, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${project.project_name} — ${project.client_name || ''}`, margin, 29);
  doc.text(`${project.location || ''} | ${project.activity_type || ''}`, margin, 37);
  if (companyName) doc.text(`Prepared by: ${companyName}`, pageWidth - margin, 29, { align: 'right' });

  y = 56; doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249); doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('#',           margin + 2,   y + 5.5);
  doc.text('Description', margin + 12,  y + 5.5);
  doc.text('Status',      margin + 95,  y + 5.5);
  doc.text('Owner',       margin + 120, y + 5.5);
  doc.text('Target',      margin + 148, y + 5.5);
  doc.text('Closed',      margin + 168, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item.description || '', 80);
    const rowHeight = Math.max(7, lines.length * 5 + 2);
    addPageIfNeeded(rowHeight + 2);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    doc.setFontSize(8); doc.setTextColor(30, 41, 59);
    doc.text(String(item.item_number || ''), margin + 2,   y + 5);
    doc.text(lines,                          margin + 12,  y + 5);
    doc.text(item.status      || '',         margin + 95,  y + 5);
    doc.text(item.owner       || '',         margin + 120, y + 5);
    doc.text(item.target_date || '',         margin + 148, y + 5);
    doc.text(item.date_closed || '',         margin + 168, y + 5);
    y += rowHeight;
  });

  const safeProjectName = String(project.project_name || 'Project').replace(/[\\/:*?"<>|]/g, '_');
  doc.save(`Punch_List_${safeProjectName}.pdf`);
}
