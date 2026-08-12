module.exports = {
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 0, getPage: () => Promise.resolve() }),
  }),
};