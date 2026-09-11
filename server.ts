import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { INITIAL_INVENTORY_ITEMS } from "./src/data/initialData";
import { InventoryItem } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Persistent DB File handling
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "inventory-db.json");

interface DbSchema {
  version: number;
  lastUpdated: string;
  items: InventoryItem[];
}

function saveDatabase(data: DbSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to database file:", err);
  }
}

function loadDatabase(): DbSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not load existing db, initializing fresh:", err);
  }

  const initial: DbSchema = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    items: INITIAL_INVENTORY_ITEMS,
  };
  saveDatabase(initial);
  return initial;
}

let db = loadDatabase();

function updateDatabase(mutator: (items: InventoryItem[]) => InventoryItem[]): DbSchema {
  const updatedItems = mutator(db.items);
  db = {
    version: db.version + 1,
    lastUpdated: new Date().toISOString(),
    items: updatedItems,
  };
  saveDatabase(db);
  return db;
}

// ======================== API ROUTES ========================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Network helper: returns local network IP addresses so other computers can connect
app.get("/api/network-info", (_req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  res.json({
    hostIps: addresses,
    port: PORT,
    urls: addresses.map((ip) => `http://${ip}:${PORT}`),
  });
});

// Lightweight status check for live polling across computers
app.get("/api/inventory/status", (_req, res) => {
  res.json({
    version: db.version,
    count: db.items.length,
    lastUpdated: db.lastUpdated,
  });
});

// Full inventory catalog
app.get("/api/inventory", (_req, res) => {
  res.json({
    version: db.version,
    lastUpdated: db.lastUpdated,
    items: db.items,
  });
});

// Add new part
app.post("/api/inventory", (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.partNumber || !body.itemName) {
      res.status(400).json({ error: "partNumber and itemName are required" });
      return;
    }

    const newItem: InventoryItem = {
      id: body.id || `part-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      partNumber: String(body.partNumber).trim(),
      itemName: String(body.itemName).trim(),
      partDescription: String(body.partDescription || "").trim(),
      category: body.category || "Truck Parts",
      imageUrl: body.imageUrl || "",
      supplierName: String(body.supplierName || "Universal Fleet Supplies").trim(),
      unitPrice: Number(body.unitPrice) || 0,
      quantityInStock: Math.max(0, Number(body.quantityInStock) || 0),
      reorderLevel: Math.max(0, Number(body.reorderLevel) || 0),
      lastRestockedDate: body.lastRestockedDate || new Date().toISOString().split("T")[0],
      compatibility: body.compatibility ? String(body.compatibility).trim() : undefined,
      oemReference: body.oemReference ? String(body.oemReference).trim() : undefined,
    };

    const newDb = updateDatabase((items) => [newItem, ...items]);
    res.status(201).json({ success: true, item: newItem, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to create part" });
  }
});

// Update part
app.put("/api/inventory/:id", (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    let updatedItem: InventoryItem | null = null;
    const newDb = updateDatabase((items) => {
      return items.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            ...body,
            id: item.id, // ID cannot be altered
            unitPrice: Number(body.unitPrice ?? item.unitPrice),
            quantityInStock: Math.max(0, Number(body.quantityInStock ?? item.quantityInStock)),
            reorderLevel: Math.max(0, Number(body.reorderLevel ?? item.reorderLevel)),
          };
          return updatedItem;
        }
        return item;
      });
    });

    if (!updatedItem) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ success: true, item: updatedItem, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to update part" });
  }
});

// Adjust stock delta
app.patch("/api/inventory/:id/stock", (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body;

    if (typeof delta !== "number") {
      res.status(400).json({ error: "delta must be a number" });
      return;
    }

    let updatedItem: InventoryItem | null = null;
    const newDb = updateDatabase((items) => {
      return items.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantityInStock + delta);
          updatedItem = {
            ...item,
            quantityInStock: newQty,
            lastRestockedDate:
              delta > 0 ? new Date().toISOString().split("T")[0] : item.lastRestockedDate,
          };
          return updatedItem;
        }
        return item;
      });
    });

    if (!updatedItem) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ success: true, item: updatedItem, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// Delete single part
app.delete("/api/inventory/:id", (req, res) => {
  try {
    const { id } = req.params;
    const newDb = updateDatabase((items) => items.filter((item) => item.id !== id));
    res.json({ success: true, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Batch delete parts
app.post("/api/inventory/batch-delete", (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: "ids must be an array" });
      return;
    }
    const idSet = new Set(ids);
    const newDb = updateDatabase((items) => items.filter((item) => !idSet.has(item.id)));
    res.json({ success: true, count: ids.length, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to batch delete" });
  }
});

// Reset catalog or wipe to zero
app.post("/api/inventory/reset", (req, res) => {
  try {
    const { wipe } = req.body || {};
    const replacementItems: InventoryItem[] = wipe
      ? []
      : JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS));

    const newDb = updateDatabase(() => replacementItems);
    res.json({ success: true, items: newDb.items, version: newDb.version });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset inventory" });
  }
});

// ======================== VITE MIDDLEWARE & SERVER START ========================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mashkay Autoparts Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
