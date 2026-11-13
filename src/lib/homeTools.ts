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
