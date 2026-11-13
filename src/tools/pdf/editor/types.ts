export type EditorTool = 'select' | 'text' | 'draw' | 'highlight' | 'signature' | 'redact';

export interface PageInstance {
  /** Stable id for this page slot in the editor (survives reorder/duplicate). */
  id: string;
  /** Index into the original source PDF this page's content comes from. */
  originalIndex: number;
  /** Rotation added on top of the page's own embedded rotation, in degrees (0/90/180/270). */
  extraRotation: number;
}

interface AnnotationBase {
  id: string;
  pageId: string;
  /** Coordinates are stored as fractions (0..1) of the page's own width/height,
   * so they stay correct regardless of zoom level or export resolution. */
  x: number;
  y: number;
}

export interface TextAnnotation extends AnnotationBase {
  type: 'text';
  text: string;
  size: number; // fraction of page height, so it scales sensibly across page sizes
  color: string;
}

export interface DrawAnnotation extends AnnotationBase {
  type: 'draw';
  /** Points relative to (x, y), each as a fraction of page width/height. */
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number; // fraction of page width
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight';
  w: number;
  h: number;
  color: string;
}

export interface SignatureAnnotation extends AnnotationBase {
  type: 'signature';
  w: number;
  h: number;
  dataUrl: string;
}

export interface RedactAnnotation extends AnnotationBase {
  type: 'redact';
  w: number;
  h: number;
}

export type Annotation = TextAnnotation | DrawAnnotation | HighlightAnnotation | SignatureAnnotation | RedactAnnotation;

export interface EditorSnapshot {
  pages: PageInstance[];
  annotations: Annotation[];
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
