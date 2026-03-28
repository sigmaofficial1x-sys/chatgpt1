import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = {
  projects: []
};

const templates = {
  'Dark Reel Pack': { category: 'Cinematic', mood: 'Dark', layers: ['Wind', 'Night ambience'], effects: ['Wave distortion', 'Light flicker'] },
  'Kids Story Pack': { category: 'Kids', mood: 'Happy', layers: ['Ocean Waves'], effects: ['Zoom in/out', 'Particle effects'] },
  'Motivation Viral Pack': { category: 'Motivation', mood: 'Aggressive', layers: ['Fire'], effects: ['Zoom in/out', 'Light flicker'] }
};

function configureCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  return true;
}

async function uploadToCloudinary(fileBuffer, folder = 'toneforge') {
  if (!configureCloudinary()) return null;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get('/api/templates', (_, res) => {
  res.json({ templates });
});

app.post('/api/vibe-detect', upload.single('media'), (req, res) => {
  const filename = (req.file?.originalname || '').toLowerCase();
  let category = 'Cinematic';
  let mood = 'Calm';

  if (/dark|night|shadow|crime/.test(filename)) {
    category = 'Gangster';
    mood = 'Dark';
  } else if (/kid|cartoon|toy/.test(filename)) {
    category = 'Kids';
    mood = 'Happy';
  } else if (/sad|rain/.test(filename)) {
    category = 'Emotional';
    mood = 'Sad';
  }

  res.json({ category, mood, confidence: 0.68 });
});

app.post('/api/projects', upload.array('mediaFiles'), async (req, res) => {
  const body = req.body || {};
  const durationSeconds = Number(body.durationSeconds || 30);
  const files = req.files || [];

  const projectSetId = uuidv4();
  const created = [];

  for (const file of files) {
    const id = uuidv4();
    const now = new Date().toISOString();

    let cloudinaryUrl = null;
    let optimizedUrl = null;

    try {
      const result = await uploadToCloudinary(file.buffer);
      if (result) {
        cloudinaryUrl = result.secure_url;
        optimizedUrl = cloudinary.url(result.public_id, {
          resource_type: 'video',
          quality: 'auto',
          fetch_format: 'auto'
        });
      }
    } catch (error) {
      cloudinaryUrl = null;
      optimizedUrl = null;
    }

    const project = {
      id,
      projectSetId,
      createdAt: now,
      status: 'Done',
      title: body.title || 'ToneForge Project',
      category: body.category || 'Cinematic',
      mood: body.mood || 'Calm',
      durationSeconds,
      ambientLayers: JSON.parse(body.ambientLayers || '[]'),
      effects: JSON.parse(body.effects || '[]'),
      mediaType: file.mimetype,
      sourceName: file.originalname,
      thumbnail: optimizedUrl || cloudinaryUrl || null,
      cloudinaryUrl,
      optimizedUrl,
      outputs: {
        mp3DownloadUrl: `/api/projects/${id}/download/audio`,
        mp4DownloadUrl: `/api/projects/${id}/download/video`
      }
    };

    db.projects.unshift(project);
    created.push(project);
  }

  res.status(201).json({
    message: 'Projects generated',
    batch: created,
    projectSetId
  });
});

app.get('/api/projects', (_, res) => {
  res.json({ projects: db.projects });
});

app.get('/api/projects/:id/download/:kind', (req, res) => {
  const project = db.projects.find((entry) => entry.id === req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (req.params.kind === 'audio') {
    const payload = `ToneForge audio placeholder for ${project.sourceName}`;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename=\"${project.id}.mp3\"`);
    return res.send(Buffer.from(payload));
  }

  const payload = `ToneForge video placeholder for ${project.sourceName}`;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename=\"${project.id}.mp4\"`);
  return res.send(Buffer.from(payload));
});

app.listen(PORT, () => {
  console.log(`ToneForge API running on ${PORT}`);
});
