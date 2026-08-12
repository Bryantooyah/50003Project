// Combined stub for pdfjs-dist under Jest.
//
// Covers two unrelated import sites in WritingSampleForm.tsx:
//   import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url" — Vite-only
//     `?url` syntax Jest can't resolve; needs a default export (a string).
//   import * as pdfjsLib from "pdfjs-dist" — the real package is pure ESM
//     (import.meta.url), which Jest's CommonJS transform can't load from
//     node_modules; needs GlobalWorkerOptions/getDocument as named exports.
//
// `__esModule: true` + `default` makes `esModuleInterop`-style default
// imports receive just the string, not this whole object; named properties
// still work as-is for the namespace import.
module.exports = {
  __esModule: true,
  default: "",
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 0,
      getPage: () => Promise.resolve({ getTextContent: () => Promise.resolve({ items: [] }) }),
    }),
  }),
};
