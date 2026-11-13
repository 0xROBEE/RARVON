export type ToolStatus = 'available' | 'coming-soon' | 'experimental';

/** Shown wherever a tool is flagged experimental — kept in one place so the wording stays consistent. */
export const EXPERIMENTAL_NOTE = 'This tool works, but hasn\u2019t been verified across every browser and device yet \u2014 results may vary depending on your specific browser\u2019s hardware video support.';

export type ToolAction = 'convert' | 'compress' | 'edit' | 'resize' | 'extract' | 'generate' | 'optimize' | 'analyze';

export interface ToolMeta {
  slug: string;
  category: string;
  name: string;
  shortDescription: string;
  description: string;
  status: ToolStatus;
  comingSoonReason?: string;
  keywords: string[];
  /** Primary user intents this tool serves, used for cross-category search grouping (e.g. searching "compress" surfaces every compress-tagged tool regardless of category). */
  actions: ToolAction[];
  /** 'wide' opts a tool page out of the standard max-w-3xl article layout for tools that need a full document-workspace canvas (e.g. the PDF Editor). */
  layout?: 'wide';
  faq?: { q: string; a: string }[];
}

export const actionMeta: { value: ToolAction; label: string; description: string }[] = [
  { value: 'convert', label: 'Convert', description: 'Change a file from one format to another.' },
  { value: 'compress', label: 'Compress', description: 'Make a file smaller.' },
  { value: 'edit', label: 'Edit', description: 'Modify, rearrange or annotate a file.' },
  { value: 'resize', label: 'Resize', description: 'Change dimensions or scale.' },
  { value: 'extract', label: 'Extract', description: 'Pull specific content out of a file.' },
  { value: 'generate', label: 'Generate', description: 'Create something new from scratch.' },
  { value: 'optimize', label: 'Optimize', description: 'Clean up or streamline a file.' },
  { value: 'analyze', label: 'Analyze', description: 'Inspect or understand a file\u2019s contents.' },
];

export interface CategoryMeta {
  slug: string;
  name: string;
  description: string;
}

export const categories: CategoryMeta[] = [
  { slug: 'pdf', name: 'PDF', description: 'Merge, split, compress and edit PDF files entirely in your browser.' },
  { slug: 'image', name: 'Image', description: 'Convert, compress, resize and edit images without uploading them anywhere.' },
  { slug: 'video', name: 'Video', description: 'Video processing tools. Most require heavier browser tech and are being rolled out carefully.' },
  { slug: 'audio', name: 'Audio', description: 'Convert, trim and compress audio, or pull the soundtrack out of a video — all in your browser.' },
  { slug: 'developer', name: 'Developer', description: 'Everyday utilities for formatting, encoding and generating data.' },
  { slug: 'text', name: 'Text', description: 'Clean up, count and reshape text instantly.' },
  { slug: 'utilities', name: 'Utilities', description: 'Small, focused tools for everyday tasks.' },
];

export const tools: ToolMeta[] = [
  // PDF
  {
    slug: 'editor', category: 'pdf', name: 'PDF Editor',
    shortDescription: 'Open a PDF and edit pages, annotate, sign or redact it directly.',
    description: 'PDF Editor is a lightweight document editor: navigate and reorder pages, rotate, duplicate or delete them, add text, freehand drawing, highlights and a signature, and redact sensitive areas \u2014 all in one place, entirely in your browser.',
    status: 'available', keywords: ['edit pdf', 'annotate pdf', 'pdf redaction', 'sign pdf online', 'pdf whiteout'],
    actions: ['edit'],
    layout: 'wide',
    faq: [
      { q: 'Does this edit the original PDF text?', a: 'No. This adds new content \u2014 text boxes, drawings, highlights, a signature \u2014 on top of your PDF, the same way a sticky note or a printed annotation would. Rewriting the PDF\u2019s own existing text isn\u2019t supported yet; that\u2019s a much harder problem this tool doesn\u2019t pretend to solve.' },
      { q: 'Is redaction actually secure?', a: 'Yes, for any page you redact: that page is flattened into an image on export, so the blacked-out content can\u2019t be recovered by selecting or extracting text from it. The trade-off is that the whole page\u2019s text stops being selectable, not just the redacted part \u2014 other pages are unaffected.' },
    ],
  },
  {
    slug: 'merge', category: 'pdf', name: 'Merge PDF',
    shortDescription: 'Combine multiple PDFs into one file.',
    description: 'Merge PDF joins several PDF files into a single document, in the order you arrange them. Your files are read and combined entirely on your device.',
    status: 'available', keywords: ['combine pdf', 'join pdf'],
    actions: ['edit'],
    faq: [{ q: 'Are my files uploaded anywhere?', a: 'No. Merging happens in your browser using WebAssembly-backed PDF libraries, so the files never leave your device.' }],
  },
  {
    slug: 'split', category: 'pdf', name: 'Split PDF',
    shortDescription: 'Break a PDF into individual pages or ranges.',
    description: 'Split PDF extracts each page, or a page range you choose, into separate PDF files you can download individually.',
    status: 'available', keywords: ['split pdf pages'],
    actions: ['edit', 'extract'],
  },
  {
    slug: 'compress', category: 'pdf', name: 'Compress PDF',
    shortDescription: 'Shrink file size by re-rendering pages at a lower quality.',
    description: 'Compress PDF re-renders each page as a compressed JPEG and rebuilds the PDF around it, trading a little sharpness for a smaller file. Best for scans and image-heavy documents; text stops being selectable in the output.',
    status: 'available', keywords: ['reduce pdf size', 'shrink pdf'],
    actions: ['compress'],
  },
  {
    slug: 'rotate', category: 'pdf', name: 'Rotate PDF',
    shortDescription: 'Rotate one or all pages of a PDF.',
    description: 'Rotate PDF lets you turn individual pages or the whole document by 90, 180 or 270 degrees.',
    status: 'available', keywords: ['turn pdf pages'],
    actions: ['edit'],
  },
  {
    slug: 'extract', category: 'pdf', name: 'Extract PDF Pages',
    shortDescription: 'Pull specific pages out into a new PDF.',
    description: 'Extract PDF Pages creates a new PDF containing only the pages you select from the original document.',
    status: 'available', keywords: ['extract pages'],
    actions: ['extract'],
  },
  {
    slug: 'delete-pages', category: 'pdf', name: 'Delete PDF Pages',
    shortDescription: 'Remove specific pages and keep the rest.',
    description: 'Delete PDF Pages removes the pages you choose and saves a new PDF with everything else intact and in order.',
    status: 'available', keywords: ['remove pdf pages'],
    actions: ['edit'],
  },
  {
    slug: 'reorder', category: 'pdf', name: 'Reorder PDF Pages',
    shortDescription: 'Drag pages into a new order.',
    description: 'Reorder PDF Pages lets you drag and drop thumbnails to change page order, then export the result.',
    status: 'available', keywords: ['rearrange pdf pages'],
    actions: ['edit'],
  },
  {
    slug: 'to-images', category: 'pdf', name: 'PDF to Images',
    shortDescription: 'Export each page as a PNG or JPG image.',
    description: 'PDF to Images renders every page of a PDF to a standalone image file you can download.',
    status: 'available', keywords: ['pdf to jpg', 'pdf to png'],
    actions: ['convert'],
  },
  {
    slug: 'from-images', category: 'pdf', name: 'Images to PDF',
    shortDescription: 'Combine images into a single PDF.',
    description: 'Images to PDF lays out one or more images, one per page, into a new PDF file.',
    status: 'available', keywords: ['jpg to pdf', 'png to pdf'],
    actions: ['convert'],
  },
  {
    slug: 'metadata', category: 'pdf', name: 'PDF Metadata Viewer/Editor',
    shortDescription: 'View and edit title, author and other PDF metadata.',
    description: 'PDF Metadata Viewer/Editor reads the document information dictionary of a PDF and lets you edit and re-save it.',
    status: 'available', keywords: ['pdf properties', 'pdf author title'],
    actions: ['edit', 'analyze'],
  },
  {
    slug: 'page-numbers', category: 'pdf', name: 'Add Page Numbers',
    shortDescription: 'Stamp page numbers onto every page.',
    description: 'Add Page Numbers draws a page number in the corner or footer of every page, with a starting number and format you choose.',
    status: 'available', keywords: ['paginate pdf', 'number pdf pages'],
    actions: ['edit', 'generate'],
  },
  {
    slug: 'watermark', category: 'pdf', name: 'Add Watermark',
    shortDescription: 'Stamp repeating or centered text over every page.',
    description: 'Add Watermark overlays text — like "DRAFT" or "CONFIDENTIAL" — across every page, with control over size, angle, opacity and color.',
    status: 'available', keywords: ['stamp pdf', 'draft watermark'],
    actions: ['edit'],
  },
  {
    slug: 'sign', category: 'pdf', name: 'Sign PDF',
    shortDescription: 'Draw or upload a signature and place it on a page.',
    description: 'Sign PDF lets you draw a signature (or upload an image of one) and place it on any page. This adds a visual signature image to the document — it is not a cryptographic digital signature and doesn\u2019t provide legal signing guarantees.',
    status: 'available', keywords: ['esign pdf', 'add signature'],
    actions: ['edit'],
    faq: [{ q: 'Is this a legally binding digital signature?', a: 'No. This places an image of a signature onto the page, the same as printing, signing and rescanning a document. It doesn\u2019t use certificate-based cryptographic signing, so it won\u2019t satisfy processes that specifically require that.' }],
  },

  // Image
  {
    slug: 'convert', category: 'image', name: 'Image Converter',
    shortDescription: 'Convert JPG, PNG, WebP, GIF, BMP, ICO, SVG and more.',
    description: 'Image Converter opens JPG, PNG, WebP, GIF, BMP, ICO and SVG files \u2014 plus AVIF, TIFF or HEIC where your specific browser can open them \u2014 and re-encodes to PNG, JPEG, WebP or AVIF, detecting at runtime which output formats your browser can actually produce rather than assuming.',
    status: 'available', keywords: ['jpg to png', 'png to jpg', 'webp converter', 'avif converter', 'heic to jpg', 'svg to png'],
    actions: ['convert'],
    faq: [
      { q: 'Why isn\u2019t my output format in the list?', a: 'Only formats this browser can actually encode via its own canvas API are offered \u2014 AVIF support in particular varies by browser and version. If a format is missing, your browser doesn\u2019t support producing it yet.' },
      { q: 'Can I convert a photo to SVG?', a: 'No. SVG is a vector format and a photo is pixel data \u2014 turning one into the other isn\u2019t a format conversion, it\u2019s image tracing, which this tool doesn\u2019t attempt. SVG works the other direction: as an input, rendered to a raster format at a resolution you choose.' },
      { q: 'Why did my HEIC or TIFF file fail to open?', a: 'Most browsers other than Safari can\u2019t decode HEIC at all, and very few browsers can open TIFF directly \u2014 this isn\u2019t a bug in the tool, it\u2019s a real browser limitation. Exporting to JPEG from your device\u2019s photo app first works around it.' },
    ],
  },
  {
    slug: 'compress', category: 'image', name: 'Image Compressor',
    shortDescription: 'Reduce image file size with adjustable quality.',
    description: 'Image Compressor re-encodes JPG, PNG or WebP images at a quality level you choose, so you can balance size against clarity.',
    status: 'available', keywords: ['reduce image size'],
    actions: ['compress'],
  },
  {
    slug: 'resize', category: 'image', name: 'Image Resizer',
    shortDescription: 'Resize images with a live preview and instant size estimate.',
    description: 'Image Resizer shows a live preview you can drag to resize, with exact width/height fields, percentage scaling, resolution and social-media presets, and an instantly updating file size estimate \u2014 computed by actually re-encoding at your current settings, not guessed.',
    status: 'available', keywords: ['scale image', 'resize photo', 'social media image size'],
    actions: ['resize'],
    faq: [
      { q: 'Is the file size shown exact?', a: 'It\u2019s a real encode of your image at the current width, height, format and quality \u2014 the same operation the download uses \u2014 so it\u2019s accurate for those settings. It\u2019s labeled an estimate only because it updates a moment after you stop adjusting, rather than on every single pixel of a drag.' },
    ],
  },
  {
    slug: 'crop', category: 'image', name: 'Image Cropper',
    shortDescription: 'Crop an image to a custom or fixed-ratio region.',
    description: 'Image Cropper lets you drag a selection over an image and export just that region.',
    status: 'available', keywords: ['cut image'],
    actions: ['resize', 'edit'],
  },
  {
    slug: 'rotate', category: 'image', name: 'Image Rotator',
    shortDescription: 'Rotate or flip an image.',
    description: 'Image Rotator turns an image by 90-degree increments or flips it horizontally or vertically.',
    status: 'available', keywords: ['flip image', 'turn image'],
    actions: ['edit'],
  },
  {
    slug: 'metadata', category: 'image', name: 'Image Metadata Viewer',
    shortDescription: 'Inspect EXIF and file metadata.',
    description: 'Image Metadata Viewer reads EXIF data (camera, GPS, timestamps) embedded in JPG files and displays it, without uploading the image anywhere.',
    status: 'available', keywords: ['exif viewer'],
    actions: ['analyze'],
  },
  {
    slug: 'remove-metadata', category: 'image', name: 'Remove EXIF Metadata',
    shortDescription: 'Strip EXIF data and download a cleaned copy.',
    description: 'Remove EXIF Metadata re-encodes an image without its EXIF block — camera model, GPS location, timestamps and the rest — and gives you a cleaned copy to download.',
    status: 'available', keywords: ['strip exif', 'remove gps data', 'scrub metadata'],
    actions: ['optimize', 'edit'],
    faq: [{ q: 'Does this guarantee every trace of metadata is gone?', a: 'It removes the EXIF/XMP/IPTC metadata blocks by re-drawing the image onto a canvas and re-encoding it, which strips this metadata by construction, since canvas output never carries it. It doesn\u2019t alter pixel data.' }],
  },

  // Video
  {
    slug: 'trim', category: 'video', name: 'Trim Video',
    shortDescription: 'Cut a video down to a start and end point.',
    description: 'Trim Video cuts an MP4 or WebM file to a start and end time using WebCodecs, entirely in your browser. When possible it copies the existing encoded video without re-compressing it, so quality is unchanged.',
    status: 'experimental', keywords: ['cut video', 'video clip'],
    actions: ['edit'],
    faq: [{ q: 'Why is this limited to MP4 and WebM?', a: 'This tool uses WebCodecs, a browser API for hardware-accelerated encoding and decoding, rather than a large FFmpeg WebAssembly build. That keeps the tool small and fast, but it means container/codec support depends on what your specific browser exposes \u2014 MP4 (H.264) and WebM (VP9) are the combinations this tool is scoped around, since they have the broadest hardware support across current browsers.' }],
  },
  {
    slug: 'resolution', category: 'video', name: 'Change Video Resolution',
    shortDescription: 'Scale a video up or down.',
    description: 'Change Video Resolution re-encodes an MP4 or WebM video at a new width and height using WebCodecs, with common presets or exact dimensions.',
    status: 'experimental', keywords: ['downscale video', 'video resize'],
    actions: ['resize'],
  },
  {
    slug: 'convert', category: 'video', name: 'Video Converter',
    shortDescription: 'Convert between MP4 and WebM.',
    description: 'Video Converter changes a video between MP4 (H.264) and WebM (VP9) \u2014 deliberately scoped to combinations we\u2019ve verified this browser can actually encode, detected at runtime, rather than promising every format under the sun.',
    status: 'experimental', keywords: ['mp4 to webm', 'webm to mp4'],
    actions: ['convert'],
    faq: [{ q: 'Why not more formats?', a: 'Every additional codec depends on what the browser\u2019s own hardware/software encoder actually supports, which varies by device. We\u2019d rather support two combinations reliably than list many and have some silently fail on some devices.' }],
  },
  {
    slug: 'compress', category: 'video', name: 'Video Compressor',
    shortDescription: 'Shrink a video by re-encoding at a lower bitrate.',
    description: 'Video Compressor re-encodes an MP4 or WebM video at a lower quality/bitrate using WebCodecs, trading some quality for a smaller file \u2014 the same pattern as the Audio and Image Compressors.',
    status: 'experimental', keywords: ['shrink video', 'reduce video size'],
    actions: ['compress'],
  },
  {
    slug: 'extract-audio', category: 'video', name: 'Extract Audio from Video',
    shortDescription: 'Pull the audio track out of a video file.',
    description: 'Extract Audio saves the soundtrack of a video as a standalone audio file.',
    status: 'coming-soon',
    comingSoonReason: 'A different implementation of this already works: see Audio \u2192 Extract Audio, which captures the audio track directly via the browser\u2019s captureStream() API. This entry stays Coming Soon since it would just duplicate that tool.',
    keywords: ['video to mp3'],
    actions: ['extract'],
  },

  // Developer
  {
    slug: 'json-formatter', category: 'developer', name: 'JSON Formatter',
    shortDescription: 'Pretty-print and validate JSON.',
    description: 'JSON Formatter indents and validates JSON, and points out the exact location of syntax errors.',
    status: 'available', keywords: ['json beautify', 'json validator'],
    actions: ['edit'],
  },
  {
    slug: 'json-minifier', category: 'developer', name: 'JSON Minifier',
    shortDescription: 'Strip whitespace from JSON.',
    description: 'JSON Minifier removes all unnecessary whitespace from JSON to produce the smallest valid output.',
    status: 'available', keywords: ['json compress'],
    actions: ['compress', 'optimize'],
  },
  {
    slug: 'base64', category: 'developer', name: 'Base64 Encoder/Decoder',
    shortDescription: 'Encode or decode Base64 text and files.',
    description: 'Base64 Encoder/Decoder converts text or files to and from Base64.',
    status: 'available', keywords: ['base64 converter'],
    actions: ['convert'],
  },
  {
    slug: 'url-encode', category: 'developer', name: 'URL Encoder/Decoder',
    shortDescription: 'Percent-encode or decode a URL or string.',
    description: 'URL Encoder/Decoder converts text to and from percent-encoded (URL-safe) form.',
    status: 'available', keywords: ['uri encode', 'percent encoding'],
    actions: ['convert'],
  },
  {
    slug: 'uuid', category: 'developer', name: 'UUID Generator',
    shortDescription: 'Generate random UUID v4 values.',
    description: 'UUID Generator creates one or many RFC-4122 version 4 UUIDs using the browser\u2019s cryptographically secure random number generator.',
    status: 'available', keywords: ['guid generator'],
    actions: ['generate'],
  },
  {
    slug: 'hash', category: 'developer', name: 'Hash Generator',
    shortDescription: 'Generate SHA-1, SHA-256 or SHA-512 hashes.',
    description: 'Hash Generator computes cryptographic hashes of text or files using the Web Crypto API.',
    status: 'available', keywords: ['sha256 generator', 'checksum'],
    actions: ['generate', 'analyze'],
  },
  {
    slug: 'timestamp', category: 'developer', name: 'Timestamp Converter',
    shortDescription: 'Convert between Unix timestamps and dates.',
    description: 'Timestamp Converter translates Unix timestamps to human-readable dates and back, in any timezone.',
    status: 'available', keywords: ['unix time converter'],
    actions: ['convert'],
  },
  {
    slug: 'color', category: 'developer', name: 'Color Converter',
    shortDescription: 'Convert colors between HEX, RGB and HSL.',
    description: 'Color Converter translates a color between HEX, RGB and HSL notation and shows a live preview.',
    status: 'available', keywords: ['hex to rgb', 'rgb to hsl'],
    actions: ['convert'],
  },
  {
    slug: 'jwt-decoder', category: 'developer', name: 'JWT Decoder',
    shortDescription: 'Decode a JSON Web Token\u2019s header and payload.',
    description: 'JWT Decoder splits a JSON Web Token into its header and payload and pretty-prints both as JSON. It does not verify the signature — it only decodes what\u2019s already readable without a secret key.',
    status: 'available', keywords: ['jwt decode', 'json web token', 'bearer token'],
    actions: ['analyze'],
    faq: [{ q: 'Does this verify the signature?', a: 'No. Verifying a signature needs the secret or public key used to sign it, which this tool never asks for. It only decodes the header and payload, which are just Base64URL-encoded JSON, not encrypted.' }],
  },
  {
    slug: 'regex-tester', category: 'developer', name: 'Regex Tester',
    shortDescription: 'Test a regular expression against sample text.',
    description: 'Regex Tester highlights matches and capture groups for a regular expression against text you provide, live as you type.',
    status: 'available', keywords: ['regular expression', 'regex match'],
    actions: ['analyze'],
  },

  // Text
  {
    slug: 'word-counter', category: 'text', name: 'Word Counter',
    shortDescription: 'Count words, characters, sentences and paragraphs.',
    description: 'Word Counter gives you a live count of words, characters, sentences, paragraphs and estimated reading time.',
    status: 'available', keywords: ['character counter'],
    actions: ['analyze'],
  },
  {
    slug: 'case-converter', category: 'text', name: 'Case Converter',
    shortDescription: 'Convert text to upper, lower, title or sentence case.',
    description: 'Case Converter switches text between UPPERCASE, lowercase, Title Case, Sentence case and camelCase.',
    status: 'available', keywords: ['uppercase lowercase'],
    actions: ['convert'],
  },
  {
    slug: 'text-cleaner', category: 'text', name: 'Text Cleaner',
    shortDescription: 'Strip extra whitespace, line breaks and formatting.',
    description: 'Text Cleaner trims extra spaces, collapses repeated line breaks and removes invisible formatting characters.',
    status: 'available', keywords: ['remove extra spaces'],
    actions: ['optimize'],
  },
  {
    slug: 'dedupe', category: 'text', name: 'Remove Duplicate Lines',
    shortDescription: 'Remove repeated lines from a list.',
    description: 'Remove Duplicate Lines de-duplicates a list of lines, optionally ignoring case and whitespace.',
    status: 'available', keywords: ['unique lines'],
    actions: ['optimize'],
  },
  {
    slug: 'sort-lines', category: 'text', name: 'Line Sorter',
    shortDescription: 'Sort lines alphabetically, numerically or by length.',
    description: 'Line Sorter reorders the lines of a text block alphabetically, numerically, by length, or randomly.',
    status: 'available', keywords: ['alphabetize lines'],
    actions: ['edit'],
  },

  // Audio
  {
    slug: 'trim', category: 'audio', name: 'Trim Audio',
    shortDescription: 'Cut an audio clip down to a start and end point.',
    description: 'Trim Audio lets you pick a start and end time and exports just that section as a lossless WAV file.',
    status: 'available', keywords: ['cut audio', 'audio clip'],
    actions: ['edit'],
  },
  {
    slug: 'convert', category: 'audio', name: 'Audio Converter',
    shortDescription: 'Convert audio to WAV or a compressed WebM/Opus file.',
    description: 'Audio Converter decodes an audio file in your browser and re-exports it as either lossless WAV or a smaller, compressed WebM (Opus) file.',
    status: 'available', keywords: ['audio format converter'],
    actions: ['convert'],
    faq: [{ q: 'Why only WAV and WebM/Opus, not MP3?', a: 'Browsers can decode MP3 natively, but none expose a built-in MP3 encoder, and adding one would mean shipping a fairly large WebAssembly encoder just for this. WAV (via a simple built-in writer) and WebM/Opus (via the browser\u2019s own MediaRecorder) both work without that, and Opus is a modern, efficient codec that most players and editors support.' }],
  },
  {
    slug: 'compress', category: 'audio', name: 'Audio Compressor',
    shortDescription: 'Shrink an audio file by re-encoding it at a lower bitrate.',
    description: 'Audio Compressor re-encodes an audio file as WebM (Opus) at a bitrate you choose, trading some quality for a smaller file.',
    status: 'available', keywords: ['reduce audio size', 'shrink mp3'],
    actions: ['compress'],
  },
  {
    slug: 'extract', category: 'audio', name: 'Extract Audio',
    shortDescription: 'Pull the soundtrack out of a video file.',
    description: 'Extract Audio plays a video file and captures its audio track directly via the browser\u2019s captureStream() API, saving the result as a WebM (Opus) audio file — without needing to decode the video\u2019s container format itself.',
    status: 'available', keywords: ['video to audio', 'get audio from video'],
    actions: ['extract'],
    faq: [{ q: 'Why does this take as long as the video\u2019s length?', a: 'It works by playing the video and capturing its audio track live, since that\u2019s the most reliable way to pull audio out of an arbitrary video container without a dedicated demuxer. That means it runs in real time rather than instantly.' }],
  },

  // Utilities
  {
    slug: 'qr', category: 'utilities', name: 'QR Code Generator',
    shortDescription: 'Turn text or a URL into a downloadable QR code.',
    description: 'QR Code Generator creates a scannable QR code from any text or URL, rendered directly in your browser.',
    status: 'available', keywords: ['generate qr code'],
    actions: ['generate'],
  },
  {
    slug: 'password', category: 'utilities', name: 'Password Generator',
    shortDescription: 'Generate strong random passwords.',
    description: 'Password Generator creates random passwords with the length and character sets you choose, using a cryptographically secure random source.',
    status: 'available', keywords: ['random password'],
    actions: ['generate'],
  },
  {
    slug: 'random-number', category: 'utilities', name: 'Random Number Generator',
    shortDescription: 'Generate random numbers in a range.',
    description: 'Random Number Generator produces one or many random integers or decimals within a range you set, using a cryptographically secure random source.',
    status: 'available', keywords: ['rng', 'random integer', 'dice roll'],
    actions: ['generate'],
  },
  {
    slug: 'url-shortener', category: 'utilities', name: 'URL Shortener',
    shortDescription: 'Shorten a long URL.',
    description: 'URL Shortener creates a short link for a long URL.',
    status: 'coming-soon',
    comingSoonReason: 'A real short link has to resolve from somewhere, which means a lookup server. We built the interface and the architecture to plug in a backend later, rather than faking a shortener that only works on your own device.',
    keywords: ['shorten link'],
    actions: ['generate'],
  },
  {
    slug: 'archive', category: 'utilities', name: 'File Compressor',
    shortDescription: 'Bundle multiple files into a ZIP archive.',
    description: 'File Compressor adds any files you choose into a single ZIP archive, with an adjustable compression level, entirely in your browser. It won\u2019t shrink already-compressed formats much \u2014 ZIP can\u2019t compress what\u2019s already compressed \u2014 but it\u2019s useful for bundling files together regardless.',
    status: 'available', keywords: ['zip files', 'create zip', 'archive creator', 'compress files'],
    actions: ['compress', 'generate'],
    faq: [
      { q: 'Will this make my files much smaller?', a: 'It depends what\u2019s in them. Plain text, JSON, or uncompressed formats shrink well. Photos, videos, PDFs and other ZIPs are already compressed internally, so bundling them saves little beyond convenience \u2014 having one file instead of many.' },
      { q: 'What if two files have the same name?', a: 'If you don\u2019t rename one yourself, a number is added automatically (e.g. "photo (1).jpg") so both are kept in the archive rather than one silently overwriting the other.' },
    ],
  },
];

export function getTool(category: string, slug: string): ToolMeta | undefined {
  return tools.find((t) => t.category === category && t.slug === slug);
}

export function getCategory(slug: string): CategoryMeta | undefined {
  return categories.find((c) => c.slug === slug);
}

export function toolsForCategory(category: string): ToolMeta[] {
  return tools.filter((t) => t.category === category);
}

export function relatedTools(tool: ToolMeta, max = 3): ToolMeta[] {
  return tools
    .filter((t) => t.category === tool.category && !(t.category === tool.category && t.slug === tool.slug) && t.status !== 'coming-soon')
    .slice(0, max);
}

export const popularToolKeys = [
  'pdf/merge', 'pdf/compress', 'image/convert', 'image/compress',
  'developer/json-formatter', 'utilities/qr',
];
