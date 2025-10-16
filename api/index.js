let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../dist/backend/server.js').then(mod => mod.default);
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
