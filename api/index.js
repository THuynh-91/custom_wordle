import express from 'express';

let app;

async function getApp() {
  if (!app) {
    const serverModule = await import('../dist/backend/server.js');
    app = serverModule.default;
  }
  return app;
}

export default async function handler(req, res) {
  try {
    const expressApp = await getApp();
    expressApp(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
