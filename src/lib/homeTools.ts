/** The tools shown per category on the home page (the rest are behind "+N more"). */
export const HOME_TOP_TOOLS: Record<string, string[]> = {
  pdf: ['editor', 'merge', 'compress', 'to-text'],
  image: ['to-text', 'compress', 'convert', 'resize'],
  video: ['compress', 'trim', 'convert', 'resolution'],
  audio: ['convert', 'compress', 'trim', 'extract'],
  developer: ['json-formatter', 'base64', 'hash', 'jwt-decoder'],
  text: ['word-counter', 'case-converter', 'text-cleaner', 'dedupe'],
  utilities: ['unzip', 'archive', 'qr', 'password'],
};

/** First four tools shown on the home Convert and Compress cards ("category/slug"). */
export const HOME_TOP_COLLECTION: Record<'convert' | 'compress', string[]> = {
  convert: ['image/convert', 'pdf/to-images', 'video/convert', 'audio/convert'],
  compress: ['pdf/compress', 'image/compress', 'video/compress', 'audio/compress'],
};
