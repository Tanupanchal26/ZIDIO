const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Meeting = require('../models/Meeting.model');
const ApiError = require('../utils/ApiError');

exports.generatePDF = async (meetingId, tenantId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(`Meeting Summary: ${meeting.title}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date: ${new Date(meeting.startedAt || meeting.createdAt).toLocaleString()}`);
      doc.moveDown();

      // Summary
      if (meeting.summary) {
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(meeting.summary);
        doc.moveDown();
      }

      // Action Items
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        doc.fontSize(16).text('Action Items', { underline: true });
        doc.moveDown(0.5);
        meeting.actionItems.forEach((item, index) => {
          doc.fontSize(12).text(`${index + 1}. ${item.text} - ${item.assignee || 'Unassigned'}`);
        });
        doc.moveDown();
      }

      // Transcript
      if (meeting.transcript) {
        doc.fontSize(16).text('Transcript', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(meeting.transcript);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

exports.generateCSV = async (meetingId, tenantId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, tenantId });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  // Typically CSV would be for action items or participants.
  // We'll export action items as CSV.
  if (!meeting.actionItems || meeting.actionItems.length === 0) {
    throw ApiError.badRequest('No action items to export');
  }

  const fields = ['text', 'assignee', 'dueDate'];
  const opts = { fields };
  const parser = new Parser(opts);
  const csv = parser.parse(meeting.actionItems.map(item => ({
    text: item.text,
    assignee: item.assignee || 'Unassigned',
    dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'
  })));

  return Buffer.from(csv);
};
