const express = require('express');
const multer = require('multer');
const tar = require('tar');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
const extractDir = path.join(__dirname, 'extracted');
const dataDir = path.join(__dirname, 'data');
const recordsFile = path.join(dataDir, 'records.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(recordsFile)) {
  fs.writeFileSync(recordsFile, JSON.stringify([], null, 2), 'utf8');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});

const upload = multer({ storage });

function readRecords() {
  try {
    return JSON.parse(fs.readFileSync(recordsFile, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeRecords(records) {
  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2), 'utf8');
}

function normalizePhone(raw) {
  if (!raw) return '';
  let value = String(raw).trim();
  value = value.replace(/[^\d+]/g, '');
  value = value.replace(/^\+/, '');

  if (value.startsWith('62')) return '62' + value.slice(2);
  if (value.startsWith('0')) return '62' + value.slice(1);
  if (value.startsWith('8')) return '62' + value;

  return value;
}

function extractTarGz(filePath) {
  return new Promise((resolve, reject) => {
    const uniqueDir = path.join(extractDir, 'backup-' + Date.now());
    fs.mkdirSync(uniqueDir, { recursive: true });

    tar.x({
      file: filePath,
      cwd: uniqueDir,
    })
      .then(() => resolve(uniqueDir))
      .catch(reject);
  });
}

function findDatabase(extractedDir) {
  const dbPaths = [
    'msgstore.db',
    'wa.db',
    'com.whatsapp/databases/msgstore.db',
  ];

  for (const dbPath of dbPaths) {
    const fullPath = path.join(extractedDir, dbPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);

      if (file === 'msgstore.db' || file === 'wa.db') {
        return fullPath;
      }

      if (fs.statSync(fullPath).isDirectory()) {
        const result = searchDir(fullPath);
        if (result) return result;
      }
    }
    return null;
  }

  return searchDir(extractedDir);
}

function extractMessagesFromDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);

      const messages = [];

      db.all(
        'SELECT * FROM messages LIMIT 1000',
        (err, rows) => {
          if (err) {
            db.close();
            return reject(err);
          }

          messages.push(...(rows || []));
          db.close();
          resolve(messages);
        }
      );
    });
  });
}

app.get('/', (req, res) => {
  const records = readRecords();
  const total = records.length;
  const valid = records.filter(r => r.status === 'valid').length;
  const invalid = records.filter(r => r.status === 'invalid').length;
  const duplicates = records.filter(r => r.status === 'duplicate').length;

  res.render('index', { total, valid, invalid, duplicates, records });
});

app.post('/api/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
  }

  const filePath = req.file.path;

  try {
    const extractedDir = await extractTarGz(filePath);
    const dbPath = findDatabase(extractedDir);

    if (!dbPath) {
      throw new Error('Database WhatsApp tidak ditemukan dalam file.');
    }

    const messages = await extractMessagesFromDb(dbPath);

    const existing = readRecords();
    const seen = new Set(existing.map(r => r.phoneNormalized));
    const imported = [];

    for (const msg of messages) {
      const rawPhone = msg.key_remote_jid ? msg.key_remote_jid.split('@')[0] : '';
      const normalized = normalizePhone(rawPhone);

      if (!normalized || seen.has(normalized)) continue;

      seen.add(normalized);
      imported.push({
        id: uuidv4(),
        rawPhone,
        phoneNormalized: normalized,
        message: msg.data ? msg.data.substring(0, 100) : '',
        status: 'valid',
        source: 'whatsapp_backup',
        createdAt: new Date().toISOString(),
      });
    }

    const combined = [...existing, ...imported];
    writeRecords(combined);

    fs.rmSync(extractedDir, { recursive: true, force: true });
    fs.rmSync(filePath, { force: true });

    res.json({
      success: true,
      message: 'Import berhasil dari backup WhatsApp.',
      summary: {
        total: imported.length,
        valid: imported.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Open browser: http://127.0.0.1:${PORT}\n`);
});
