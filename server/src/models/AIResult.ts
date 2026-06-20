// @ts-nocheck
const mongoose = require('mongoose');

const transcriptChunkSchema = new mongoose.Schema({
  text:    { type: String, required: true },
  speaker: { type: String, default: '' },
  ts:      { type: Number, default: Date.now },
}, { _id: false });

const actionItemSchema = new mongoose.Schema({
  text:     { type: String, required: true },
  assignee: { type: String, default: null },
  dueDate:  { type: String, default: null },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  done:     { type: Boolean, default: false },
}, { _id: false });

const aiResultSchema = new mongoose.Schema({
  meeting:          { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
  transcript:       { type: String, default: '' },
  transcriptChunks: { type: [transcriptChunkSchema], default: [] },
  summary:          { type: String, default: '' },
  minutes:          { type: String, default: '' },
  actionItems:      { type: [actionItemSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('AIResult', aiResultSchema);

export {};
