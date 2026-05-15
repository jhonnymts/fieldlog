import jsPDF from 'jspdf';

export function generateDailyReportPDF({ project, log, entries, issues, companyName }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPageIfNeeded = (needed = 30) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Activity Report', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project.project_name} — ${project.client_name || ''}`, margin, 28);
  doc.text(`${project.location || ''} | ${log.log_date} | ${project.activity_type || ''}`, margin, 35);
  if (companyName) doc.text(`Prepared by: ${companyName}`, pageWidth - margin, 28, { align: 'right' });
  doc.text(`Project #: ${project.project_number || 'N/A'}`, pageWidth - margin, 35, { align: 'right' });

  y = 52;
  doc.setTextColor(30, 41, 59);

  if (log.executive_summary) {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Executive Summary', margin, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(log.executive_summary, contentWidth);
    doc.text(summaryLines, margin, y); y += summaryLines.length * 5 + 10;
  }

  addPageIfNeeded(40);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Activity Log', margin, y); y += 8;
  doc.setFillColor(241, 245, 249); doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Time', margin + 2, y + 5.5); doc.text('Entry', margin + 25, y + 5.5); y += 8;

  doc.setFont('helvetica', 'normal');
  const sortedEntries = [...entries].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  sortedEntries.forEach((entry) => {
    const lines = doc.splitTextToSize(entry.content, contentWidth - 27);
    const rowHeight = Math.max(7, lines.length * 5 + 2);
    addPageIfNeeded(rowHeight + 2);
    doc.setDrawColor(226, 232, 240); doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    doc.setFontSize(9); doc.text(entry.time_stamp || '', margin + 2, y + 5); doc.text(lines, margin + 25, y + 5); y += rowHeight;
  });

  y += 10;
  if (issues && issues.length > 0) {
    addPageIfNeeded(40);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Issues & Action Items', margin, y); y += 8;
    doc.setFillColor(241, 245, 249); doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('#', margin + 2, y + 5.5); doc.text('Description', margin + 12, y + 5.5); doc.text('Status', margin + 100, y + 5.5); doc.text('Owner', margin + 125, y + 5.5); doc.text('Target', margin + 155, y + 5.5); y += 8;
    doc.setFont('helvetica', 'normal');
    issues.forEach((issue, idx) => {
      const lines = doc.splitTextToSize(issue.description || '', 85);
      const rowHeight = Math.max(7, lines.length * 5 + 2);
      addPageIfNeeded(rowHeight + 2);
      doc.setDrawColor(226, 232, 240); doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      doc.text(String(issue.issue_number || idx + 1), margin + 2, y + 5); doc.text(lines, margin + 12, y + 5); doc.text(issue.status || '', margin + 100, y + 5); doc.text(issue.owner || '', margin + 125, y + 5); doc.text(issue.target_date || '', margin + 155, y + 5); y += rowHeight;
    });
    y += 10;
  }

  if (log.lookahead) {
    addPageIfNeeded(30);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Lookahead', margin, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const lookaheadLines = doc.splitTextToSize(log.lookahead, contentWidth);
    doc.text(lookaheadLines, margin, y);
  }

  doc.save(`Daily_Report_${project.project_name}_${log.log_date}.pdf`);
}

export function generatePunchListPDF({ project, items, companyName }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPageIfNeeded = (needed = 30) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
  };

  doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text('Punch List Report', margin, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${project.project_name} — ${project.client_name || ''}`, margin, 28);
  doc.text(`${project.location || ''} | ${project.activity_type || ''}`, margin, 35);
  if (companyName) doc.text(`Prepared by: ${companyName}`, pageWidth - margin, 28, { align: 'right' });

  y = 52; doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249); doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 2, y + 5.5); doc.text('Description', margin + 12, y + 5.5); doc.text('Status', margin + 95, y + 5.5); doc.text('Owner', margin + 120, y + 5.5); doc.text('Target', margin + 148, y + 5.5); doc.text('Closed', margin + 168, y + 5.5); y += 8;

  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item.description || '', 80);
    const rowHeight = Math.max(7, lines.length * 5 + 2);
    addPageIfNeeded(rowHeight + 2);
    doc.setDrawColor(226, 232, 240); doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    doc.text(String(item.item_number || ''), margin + 2, y + 5); doc.text(lines, margin + 12, y + 5); doc.text(item.status || '', margin + 95, y + 5); doc.text(item.owner || '', margin + 120, y + 5); doc.text(item.target_date || '', margin + 148, y + 5); doc.text(item.date_closed || '', margin + 168, y + 5); y += rowHeight;
  });

  doc.save(`Punch_List_${project.project_name}.pdf`);
}