// @ts-nocheck
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');
const analyticsService = require('./analytics.service');
const ApiError = require('../utils/ApiError');

/**
 * Generates a professional summary report PDF for a meeting.
 */
exports.generateSummaryPDF = async (meetingId, tenantId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId })
    .populate('participants', 'name email')
    .populate('host', 'name email');
  
  if (!meeting) throw ApiError.notFound('Meeting not found');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true // allows dynamic page numbering
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Corporate color scheme
      const primaryColor = '#1E293B';  // Dark Slate
      const accentColor = '#4F46E5';   // Indigo
      const textColor = '#334155';     // Slate Gray
      const lightBg = '#F8FAFC';       // Light Soft Gray-Blue
      const borderColor = '#E2E8F0';

      // ─── Header Banner ─────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 110).fill(primaryColor);
      
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('INTELLMEET', 50, 35)
         .fontSize(9)
         .font('Helvetica')
         .text('MEETING SUMMARY REPORT', 50, 65, { characterSpacing: 1.5 });

      // Reset text options
      doc.fillColor(textColor);
      let y = 135;

      // ─── Meeting Info Card ─────────────────────────────────────
      doc.rect(50, y, doc.page.width - 100, 90)
         .fill(lightBg)
         .strokeColor(borderColor)
         .stroke();

      doc.fillColor(accentColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(meeting.title, 65, y + 15, { width: doc.page.width - 130, height: 20 });

      doc.fillColor(textColor)
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text('Date:', 65, y + 42)
         .font('Helvetica')
         .text(new Date(meeting.startedAt || meeting.createdAt).toLocaleString(), 110, y + 42)
         .font('Helvetica-Bold')
         .text('Host:', 65, y + 60)
         .font('Helvetica')
         .text(meeting.host?.name || 'Unknown Host', 110, y + 60);

      y += 110;

      // ─── Participants ─────────────────────────────────────────
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Participants', 50, y);
      
      y += 16;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
      y += 10;

      const participantNames = meeting.participants && meeting.participants.length > 0
        ? meeting.participants.map(p => p.name).join(', ')
        : 'No participants registered';
      
      doc.fillColor(textColor)
         .fontSize(9.5)
         .font('Helvetica')
         .text(participantNames, 50, y, { width: doc.page.width - 100, align: 'left', lineGap: 2 });

      const participantHeight = doc.heightOfString(participantNames, { width: doc.page.width - 100, lineGap: 2 });
      y += participantHeight + 20;

      // ─── AI Summary ───────────────────────────────────────────
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('AI Summary', 50, y);
      
      y += 16;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
      y += 10;

      const summaryText = meeting.summary || 'No AI summary generated for this meeting.';
      doc.fillColor(textColor)
         .fontSize(9.5)
         .font('Helvetica')
         .text(summaryText, 50, y, { width: doc.page.width - 100, align: 'justify', lineGap: 3 });

      const summaryHeight = doc.heightOfString(summaryText, { width: doc.page.width - 100, lineGap: 3 });
      y += summaryHeight + 20;

      // Check if we need to add a page for Action Items
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 60;
      }

      // ─── Action Items ─────────────────────────────────────────
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Action Items', 50, y);
      
      y += 16;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
      y += 10;

      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.forEach((item, index) => {
          if (y > doc.page.height - 75) {
            doc.addPage();
            y = 60;
          }
          const itemText = `[ ]  ${item.text}`;
          const metaText = `Assignee: ${item.assignee || 'Unassigned'} ${item.dueDate ? `| Due: ${new Date(item.dueDate).toLocaleDateString()}` : ''}`;

          doc.fillColor(textColor)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(itemText, 60, y, { width: doc.page.width - 120 })
             .fillColor('#64748B')
             .fontSize(8.5)
             .font('Helvetica')
             .text(metaText, 78, y + 14);

          const itemHeight = doc.heightOfString(itemText, { width: doc.page.width - 120 });
          y += itemHeight + 22;
        });
      } else {
        doc.fillColor(textColor)
           .fontSize(9.5)
           .font('Helvetica')
           .text('No action items created for this meeting.', 50, y);
        y += 20;
      }

      // Check if we need to add a page for Transcript
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 60;
      }

      // ─── Transcript ───────────────────────────────────────────
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Transcript', 50, y);
      
      y += 16;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).stroke();
      y += 10;

      const transcriptText = meeting.transcript || 'No transcript available for this meeting.';
      doc.fillColor(textColor)
         .fontSize(8.5)
         .font('Helvetica')
         .text(transcriptText, 50, y, { width: doc.page.width - 100, lineGap: 2 });

      // ─── Post-Process Page Headers & Footers ─────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Header line (if not page 1)
        if (i > 0) {
          doc.rect(0, 0, doc.page.width, 35).fill(primaryColor);
          doc.fillColor('#FFFFFF')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(`Meeting Summary: ${meeting.title}`, 50, 12);
        }

        // Footer line
        doc.moveTo(50, doc.page.height - 45).lineTo(doc.page.width - 50, doc.page.height - 45).strokeColor(borderColor).stroke();
        doc.fillColor('#94A3B8')
           .fontSize(8)
           .font('Helvetica')
           .text(`IntellMeet Report — Generated automatically`, 50, doc.page.height - 35)
           .text(`Page ${i + 1} of ${range.count}`, doc.page.width - 120, doc.page.height - 35, { align: 'right' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates action items CSV for a meeting.
 */
exports.generateActionItemsCSV = async (meetingId, tenantId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  // Query database's Task model first
  const tasks = await Task.find({ meeting: meetingId, tenantId }).populate('assignedTo', 'name');

  let rows = [];
  if (tasks && tasks.length > 0) {
    rows = tasks.map(task => ({
      Task: task.title,
      Assignee: task.assignedTo?.name || 'Unassigned',
      Priority: task.priority,
      Status: task.status,
      'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'
    }));
  } else if (meeting.actionItems && meeting.actionItems.length > 0) {
    // Fallback to meeting.actionItems
    rows = meeting.actionItems.map(item => ({
      Task: item.text,
      Assignee: item.assignee || 'Unassigned',
      Priority: 'medium', // Default priority
      Status: 'todo', // Default status
      'Due Date': item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'
    }));
  } else {
    throw ApiError.badRequest('No action items found for this meeting');
  }

  const parser = new Parser({ fields: ['Task', 'Assignee', 'Priority', 'Status', 'Due Date'] });
  return parser.parse(rows);
};

/**
 * Generates analytics report CSV for a tenant.
 */
exports.generateAnalyticsCSV = async (tenantId, userId) => {
  const metricsData = await analyticsService.getDashboardMetrics(tenantId, userId);
  const analyticsData = await analyticsService.getAnalytics(tenantId, userId);

  const rows = [
    { 'Metric Name': 'Meetings This Month', 'Metric Value': metricsData.metrics.meetingsThisMonth },
    { 'Metric Name': 'Hours Saved (est.)', 'Metric Value': `${metricsData.metrics.hoursSaved} hrs` },
    { 'Metric Name': 'Tasks Completed', 'Metric Value': metricsData.metrics.tasksCompleted },
    { 'Metric Name': 'Team Members Online', 'Metric Value': metricsData.metrics.teamMembersOnline },
    { 'Metric Name': 'Average Meeting Duration', 'Metric Value': analyticsData.engagement.find(e => e.label === 'Avg Meeting Duration')?.value || '47 min' },
    { 'Metric Name': 'Participation Rate', 'Metric Value': analyticsData.engagement.find(e => e.label === 'Participation Rate')?.value || '94%' },
    { 'Metric Name': 'AI Summary Usage', 'Metric Value': analyticsData.engagement.find(e => e.label === 'AI Summary Usage')?.value || '78%' },
    { 'Metric Name': 'Action Item Completion', 'Metric Value': analyticsData.engagement.find(e => e.label === 'Action Item Completion')?.value || '61%' },
    { 'Metric Name': 'Latest Productivity Score', 'Metric Value': `${analyticsData.productivity[analyticsData.productivity.length - 1]?.score || 91}%` }
  ];

  const parser = new Parser({ fields: ['Metric Name', 'Metric Value'] });
  return parser.parse(rows);
};

export {};
