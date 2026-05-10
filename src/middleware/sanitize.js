// ============================================
// Input Sanitizer — Strip karakter berbahaya
// ============================================

/**
 * Middleware: Sanitasi semua string di req.body, req.query, req.params
 * Menghapus karakter berbahaya yang bisa digunakan untuk XSS/injection
 */
function sanitizeInput(req, _res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        // Hapus tag HTML
        obj[key] = obj[key].replace(/<[^>]*>/g, '');
        // Hapus karakter control (kecuali newline/tab)
        obj[key] = obj[key].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }

    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
}

module.exports = { sanitizeInput };
