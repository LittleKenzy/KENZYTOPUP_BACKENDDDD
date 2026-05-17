// ============================================
// Mission Config — Konstanta untuk fitur misi harian
// Jangan hardcode nilai ini di tempat lain!
// ============================================

module.exports = {
  /** Poin yang diberikan per misi harian yang diselesaikan */
  MISSION_POINTS: 10,

  /** Offset timezone WIB dari UTC (jam) */
  TIMEZONE_OFFSET: 7, // WIB = UTC+7

  /** Channel share yang valid */
  VALID_CHANNELS: ['whatsapp', 'instagram', 'tiktok', 'copy'],
};
