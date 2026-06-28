const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

// Extract text from PDF
async function extractTextFromPDF(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Extract text from DOCX
async function extractTextFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

// Extract text from TXT
async function extractTextFromTXT(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return text;
  } catch (error) {
    console.error('TXT extraction error:', error);
    throw new Error('Failed to read TXT file');
  }
}

// Main extraction function — supports PDF, DOCX, DOC, TXT, CSV, PPTX, JPG/PNG
async function extractText(filePath, fileType) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return await extractTextFromPDF(filePath);
    case 'docx':
    case 'doc':
      return await extractTextFromDOCX(filePath);
    case 'txt':
    case 'csv':
      return await extractTextFromTXT(filePath);
    case 'pptx':
    case 'ppt':
      // Mammoth also handles some pptx; fallback to returning file name
      try { return await extractTextFromDOCX(filePath); } catch { return `[Presentation file: ${filePath}]`; }
    case 'jpg':
    case 'jpeg':
    case 'png':
      // Image files: return placeholder (OCR would need tesseract.js)
      return `[Image file uploaded. OCR not available yet. Please describe the content in the chat.]`;
    default:
      return `[File uploaded: ${filePath}. Type: ${fileType}]`;
  }
}

// Alias used by notesRoutes
const extractTextFromFile = extractText;

// Clean extracted text
function cleanText(text) {
  if (!text) return '';

  return text
    .normalize('NFKD') // Normalize unicode characters
    .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

module.exports = {
  extractText,
  extractTextFromFile,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  cleanText,
};
