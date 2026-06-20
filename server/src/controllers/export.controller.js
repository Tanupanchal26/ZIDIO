const { generatePDF, generateCSV } = require('../services/export.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.exportPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pdfBuffer = await generatePDF(id, req.tenantId);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=meeting-${id}.pdf`);
  res.status(200).send(pdfBuffer);
});

exports.exportCSV = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const csvBuffer = await generateCSV(id, req.tenantId);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=action-items-${id}.csv`);
  res.status(200).send(csvBuffer);
});
