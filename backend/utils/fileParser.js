import csv from 'csv-parser';
import XLSX from 'xlsx';
import { Readable } from 'stream';
import logger from './logger.js';

/**
 * Parse CSV file buffer and return array of records
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed records
 */
export const parseCSVFile = async (buffer) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = Readable.from(buffer);
    
    stream
      .pipe(csv())
      .on('data', (data) => {
        // Clean and normalize the data
        const cleanRecord = {};
        Object.keys(data).forEach(key => {
          const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          const value = data[key] ? data[key].trim() : '';
          cleanRecord[cleanKey] = value;
        });
        records.push(cleanRecord);
      })
      .on('end', () => {
        logger.debug(`Parsed ${records.length} records from CSV`, { recordCount: records.length });
        resolve(records);
      })
      .on('error', (error) => {
        logger.error('Error parsing CSV', { error: error.message, stack: error.stack });
        reject(error);
      });
  });
};

/**
 * Parse Excel file buffer and return array of records
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<Array>} Array of parsed records
 */
export const parseExcelFile = async (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const records = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (records.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }
    
    // Extract headers from first row
    const headers = records[0].map(header => 
      header ? header.toString().trim().toLowerCase().replace(/\s+/g, '_') : ''
    );
    
    // Convert data rows to objects
    const parsedRecords = records.slice(1).map((row, index) => {
      const record = {};
      headers.forEach((header, colIndex) => {
        if (header && row[colIndex] !== undefined) {
          record[header] = row[colIndex] ? row[colIndex].toString().trim() : '';
        }
      });
      return record;
    }).filter(record => Object.keys(record).length > 0); // Remove empty rows
    
    logger.debug(`Parsed ${parsedRecords.length} records from Excel`, { recordCount: parsedRecords.length });
    return parsedRecords;
    
  } catch (error) {
    logger.error('Error parsing Excel file', { error: error.message, stack: error.stack });
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate file headers against expected columns
 * @param {Array} records - Parsed records
 * @param {Array} requiredHeaders - Required header names
 * @param {Array} optionalHeaders - Optional header names
 * @returns {Object} Validation result
 */
export const validateFileHeaders = (records, requiredHeaders = [], optionalHeaders = []) => {
  if (!records || records.length === 0) {
    return {
      isValid: false,
      errors: ['No records found in file'],
      missingHeaders: requiredHeaders
    };
  }
  
  const firstRecord = records[0];
  const foundHeaders = Object.keys(firstRecord);
  const missingHeaders = requiredHeaders.filter(header => !foundHeaders.includes(header));
  const unexpectedHeaders = foundHeaders.filter(header => 
    !requiredHeaders.includes(header) && !optionalHeaders.includes(header)
  );
  
  const errors = [];
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  if (unexpectedHeaders.length > 0) {
    errors.push(`Unexpected headers: ${unexpectedHeaders.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    missingHeaders,
    unexpectedHeaders,
    foundHeaders
  };
};

/**
 * Generate CSV template with headers
 * @param {Array} headers - Array of header names
 * @param {Array} sampleData - Sample data rows
 * @returns {string} CSV content
 */
export const generateCSVTemplate = (headers, sampleData = []) => {
  const csvRows = [headers.join(',')];
  
  // Add sample data if provided
  sampleData.forEach(row => {
    const csvRow = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma or quote
      const escapedValue = value.toString().replace(/"/g, '""');
      return `"${escapedValue}"`;
    });
    csvRows.push(csvRow.join(','));
  });
  
  return csvRows.join('\n');
};

/**
 * Generate Excel template with headers and sample data
 * @param {Array} headers - Array of header names
 * @param {Array} sampleData - Sample data rows
 * @returns {Buffer} Excel file buffer
 */
export const generateExcelTemplate = (headers, sampleData = []) => {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    
    // Add sample data if provided
    if (sampleData.length > 0) {
      const dataRows = sampleData.map(row => 
        headers.map(header => row[header] || '')
      );
      XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: 'A2' });
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return buffer;
    
  } catch (error) {
    logger.error('Error generating Excel template', { error: error.message, stack: error.stack });
    throw new Error(`Failed to generate Excel template: ${error.message}`);
  }
};

/**
 * Clean and normalize record data
 * @param {Object} record - Raw record data
 * @param {Object} fieldMappings - Field name mappings
 * @returns {Object} Cleaned record
 */
export const cleanRecordData = (record, fieldMappings = {}) => {
  const cleaned = {};
  
  Object.keys(record).forEach(key => {
    const value = record[key];
    const mappedKey = fieldMappings[key] || key;
    
    // Clean the value
    let cleanedValue = '';
    if (value !== null && value !== undefined) {
      cleanedValue = value.toString().trim();
    }
    
    cleaned[mappedKey] = cleanedValue;
  });
  
  return cleaned;
};

/**
 * Validate file size
 * @param {Buffer} buffer - File buffer
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if file size is valid
 */
export const validateFileSize = (buffer, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return buffer.length <= maxSizeBytes;
};

/**
 * Get file extension from buffer or filename
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {string} File extension
 */
export const getFileExtension = (buffer, filename = '') => {
  // Try to get extension from filename first
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ['csv', 'xlsx', 'xls'].includes(ext)) {
      return ext;
    }
  }
  
  // Try to detect from buffer content
  const header = buffer.slice(0, 8);
  
  // Check for Excel file signatures
  if (header[0] === 0x50 && header[1] === 0x4B) {
    return 'xlsx';
  }
  
  // Check for CSV (text file)
  const text = buffer.toString('utf8', 0, 1000);
  if (text.includes(',') && text.includes('\n')) {
    return 'csv';
  }
  
  return 'unknown';
};

export default {
  parseCSVFile,
  parseExcelFile,
  validateFileHeaders,
  generateCSVTemplate,
  generateExcelTemplate,
  cleanRecordData,
  validateFileSize,
  getFileExtension
};



