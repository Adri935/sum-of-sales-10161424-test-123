// Helper function to parse data URLs
function parseDataUrl(url) {
  if (!url.startsWith('data:')) return null;
  
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) return null;
  
  const header = url.substring(5, commaIndex);
  const payload = url.substring(commaIndex + 1);
  
  const parts = header.split(';');
  const mime = parts[0] || 'text/plain';
  const isBase64 = parts.includes('base64');
  
  return { mime, isBase64, payload };
}

// Helper function to decode base64 to text
function decodeBase64ToText(b64) {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error('Base64 decoding error:', e);
    return '';
  }
}

// Helper function to parse CSV text
function parseCsv(text) {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  // Detect delimiter
  const delimiters = [',', ';', '\t'];
  let delimiter = ',';
  let maxDelimiters = 0;
  
  const firstLine = text.split('\n')[0];
  for (const delim of delimiters) {
    const count = (firstLine.match(new RegExp(delim, 'g')) || []).length;
    if (count > maxDelimiters) {
      maxDelimiters = count;
      delimiter = delim;
    }
  }
  
  // Parse rows
  const rows = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1] || '';
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && nextChar === '"') {
      current += char;
      i++;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === '\n' && !inQuotes) {
      rows.push(current.split(delimiter));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last row if it exists
  if (current !== '') {
    rows.push(current.split(delimiter));
  }
  
  // Determine if first row is header
  let headers = null;
  if (rows.length > 0) {
    const firstRow = rows[0];
    const isHeader = firstRow.every(cell => isNaN(parseFloat(cell)) || cell.trim() === '');
    
    if (isHeader) {
      headers = firstRow;
      rows.shift();
    }
  }
  
  return { headers, rows };
}

// Main application logic
async function init() {
  const totalSalesElement = document.getElementById('total-sales');
  
  try {
    // Get the CSV attachment URL
    const attachments = [
      {
        "name": "data.csv",
        "url": "data:text/csv;base64,UHJvZHVjdHMsU2FsZXMKUGhvbmVzLDEwMDAKQm9va3MsMTIzLjQ1Ck5vdGVib29rcywxMTEuMTEK"
      }
    ];
    
    const csvAttachment = attachments.find(att => att.name === 'data.csv');
    
    if (!csvAttachment) {
      throw new Error('CSV attachment not found');
    }
    
    let csvText = '';
    
    if (csvAttachment.url.startsWith('data:')) {
      // Handle data URL
      const parsed = parseDataUrl(csvAttachment.url);
      if (!parsed) {
        throw new Error('Invalid data URL');
      }
      
      if (parsed.isBase64) {
        csvText = decodeBase64ToText(parsed.payload);
      } else {
        csvText = decodeURIComponent(parsed.payload);
      }
    } else {
      // Handle HTTP URL
      const response = await fetch(csvAttachment.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      csvText = await response.text();
    }
    
    // Parse CSV
    const { headers, rows } = parseCsv(csvText);
    
    // Find sales column (assume it's named 'Sales' or second column)
    let salesColumnIndex = 1; // Default to second column
    if (headers) {
      const salesHeaderIndex = headers.findIndex(h => h.toLowerCase() === 'sales');
      if (salesHeaderIndex !== -1) {
        salesColumnIndex = salesHeaderIndex;
      }
    }
    
    // Calculate total sales
    let totalSales = 0;
    for (const row of rows) {
      const salesValue = parseFloat(row[salesColumnIndex]);
      if (!isNaN(salesValue)) {
        totalSales += salesValue;
      }
    }
    
    // Display total sales
    totalSalesElement.textContent = totalSales.toFixed(2);
  } catch (error) {
    console.error('Error processing sales data:', error);
    totalSalesElement.textContent = 'Error loading data';
    totalSalesElement.classList.add('text-danger');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);