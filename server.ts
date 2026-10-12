import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 15MB for logos and ward backup packages
app.use(express.json({ limit: '15mb' }));

// Data storage directory
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const WARDS_FILE = path.join(DATA_DIR, 'wards.json');
const WARD_DATA_FILE = path.join(DATA_DIR, 'ward-storage.json');

// Default initial wards
const DEFAULT_WARDS = [
  {
    id: 'teratai',
    name: 'Ruang Rawat Inap Teratai - Lantai 3',
    code: 'TERATAI',
    floor: 'Lantai 3',
    building: 'Gedung Teratai (Bedah & Penyakit Dalam)',
    colorTheme: 'purple',
    description: 'Ruangan rawat inap terpadu bedah dan rawat inap umum lantai 3',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'melati',
    name: 'Ruang Rawat Inap Melati - Lantai 2',
    code: 'MELATI',
    floor: 'Lantai 2',
    building: 'Gedung Melati (Maternal & Anak)',
    colorTheme: 'teal',
    description: 'Ruangan rawat inap ibu, anak dan perawatan pasca melahirkan lantai 2',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

function loadWards(): any[] {
  try {
    if (fs.existsSync(WARDS_FILE)) {
      const content = fs.readFileSync(WARDS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Server] Notice reading wards file:', err);
  }
  return DEFAULT_WARDS;
}

function saveWardsToFile(wards: any[]) {
  try {
    fs.writeFileSync(WARDS_FILE, JSON.stringify(wards, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to write wards file:', err);
  }
}

function loadWardStorage(): Record<string, any> {
  try {
    if (fs.existsSync(WARD_DATA_FILE)) {
      const content = fs.readFileSync(WARD_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[Server] Notice reading ward storage file:', err);
  }
  return {};
}

function saveWardStorageToFile(data: Record<string, any>) {
  try {
    fs.writeFileSync(WARD_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to write ward storage file:', err);
  }
}

// In-memory state initialized from file
let serverWards = loadWards();
let serverWardStorage = loadWardStorage();

// Connected SSE clients for live synchronization across all devices
type SSEClient = {
  id: number;
  res: Response;
};
let sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastSync(eventData: any) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// --- SSE Realtime Sync Stream across All Devices ---
app.get('/api/sync/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders?.();

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial data to connecting device immediately
  res.write(
    `data: ${JSON.stringify({
      type: 'init',
      wards: serverWards,
      serverTime: new Date().toISOString(),
    })}\n\n`
  );

  // Keep-alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// --- REST Endpoints for Wards ---
app.get('/api/wards', (_req: Request, res: Response) => {
  res.json({
    success: true,
    wards: serverWards,
    serverTime: new Date().toISOString(),
  });
});

app.post('/api/wards', (req: Request, res: Response) => {
  const newWard = req.body;
  if (!newWard || !newWard.id || !newWard.name) {
    return res.status(400).json({ success: false, message: 'ID dan nama ruangan wajib diisi' });
  }

  const cleanId = newWard.id.trim().toLowerCase();
  const idx = serverWards.findIndex((w: any) => w.id.trim().toLowerCase() === cleanId);
  const formattedWard = {
    ...newWard,
    id: cleanId,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    serverWards[idx] = { ...serverWards[idx], ...formattedWard };
  } else {
    serverWards.push(formattedWard);
  }

  saveWardsToFile(serverWards);
  broadcastSync({
    type: 'ward_saved',
    ward: formattedWard,
    wards: serverWards,
    updatedWardId: cleanId,
  });

  return res.json({ success: true, ward: formattedWard, wards: serverWards });
});

app.put('/api/wards/:id', (req: Request, res: Response) => {
  const wardId = req.params.id.trim().toLowerCase();
  const updates = req.body;

  const idx = serverWards.findIndex((w: any) => w.id.trim().toLowerCase() === wardId);
  let updatedWard: any;

  if (idx >= 0) {
    updatedWard = {
      ...serverWards[idx],
      ...updates,
      id: wardId,
      updatedAt: new Date().toISOString(),
    };
    serverWards[idx] = updatedWard;
  } else {
    updatedWard = {
      id: wardId,
      name: updates.name || `Ruang ${wardId}`,
      code: updates.code || wardId.toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates,
    };
    serverWards.push(updatedWard);
  }

  saveWardsToFile(serverWards);
  broadcastSync({
    type: 'ward_updated',
    ward: updatedWard,
    wards: serverWards,
    updatedWardId: wardId,
  });

  return res.json({ success: true, ward: updatedWard, wards: serverWards });
});

app.delete('/api/wards/:id', (req: Request, res: Response) => {
  const wardId = req.params.id.trim().toLowerCase();
  if (serverWards.length <= 1) {
    return res.status(400).json({
      success: false,
      message: 'Tidak dapat menghapus satu-satunya ruangan yang tersedia',
    });
  }

  const deletedWard = serverWards.find((w: any) => w.id.trim().toLowerCase() === wardId);
  serverWards = serverWards.filter((w: any) => w.id.trim().toLowerCase() !== wardId);
  saveWardsToFile(serverWards);

  // Also remove from ward storage if exists
  if (serverWardStorage[wardId]) {
    delete serverWardStorage[wardId];
    saveWardStorageToFile(serverWardStorage);
  }

  broadcastSync({
    type: 'ward_deleted',
    deletedWardId: wardId,
    deletedWard,
    wards: serverWards,
  });

  return res.json({ success: true, deletedWardId: wardId, wards: serverWards });
});

// Bulk sync all wards (merging client and server)
app.post('/api/wards/sync-all', (req: Request, res: Response) => {
  const { wards } = req.body;
  if (Array.isArray(wards) && wards.length > 0) {
    const map = new Map<string, any>();
    // First keep existing server wards
    serverWards.forEach((w: any) => {
      if (w && w.id) map.set(w.id.trim().toLowerCase(), w);
    });
    // Overlay or add client wards
    wards.forEach((w: any) => {
      if (w && w.id && w.name) {
        const id = w.id.trim().toLowerCase();
        map.set(id, { ...map.get(id), ...w, id });
      }
    });
    serverWards = Array.from(map.values());
    saveWardsToFile(serverWards);
    broadcastSync({
      type: 'wards_bulk_synced',
      wards: serverWards,
    });
  }
  return res.json({ success: true, wards: serverWards });
});

// Per-ward complete package storage (settings, nurses, schedules, patients)
app.get('/api/ward-data/:wardId', (req: Request, res: Response) => {
  const wardId = req.params.wardId.trim().toLowerCase();
  const data = serverWardStorage[wardId];
  if (data) {
    return res.json({ success: true, exists: true, data });
  }
  return res.json({ success: true, exists: false, data: null });
});

app.post('/api/ward-data/:wardId', (req: Request, res: Response) => {
  const wardId = req.params.wardId.trim().toLowerCase();
  const data = req.body;
  if (!data) {
    return res.status(400).json({ success: false, message: 'Data ruangan kosong' });
  }

  serverWardStorage[wardId] = {
    ...data,
    wardId,
    syncedAt: new Date().toISOString(),
  };
  saveWardStorageToFile(serverWardStorage);

  broadcastSync({
    type: 'ward_data_synced',
    wardId,
    data: serverWardStorage[wardId],
  });

  return res.json({ success: true, wardId });
});

// --- Start Server with Vite or Static Dist ---
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CareShift Server] Berjalan di port ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

startServer();
