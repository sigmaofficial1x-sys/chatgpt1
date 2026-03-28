import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ambientLayers, categories, effects, moods, presets, templates } from './lib/constants';

const navItems = ['Dashboard', 'Create Tone', 'My Projects', 'Settings'];

const initialForm = {
  category: 'Cinematic',
  mood: 'Calm',
  durationSeconds: 30,
  customDuration: 30,
  ambient: ['Rain'],
  selectedEffects: ['Zoom in/out'],
  autoVibe: true,
  template: '',
  title: 'ToneForge Session'
};

function App() {
  const [activeNav, setActiveNav] = useState('Create Tone');
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [error, setError] = useState('');
  const audioCtxRef = useRef(null);
  const nodeRefs = useRef([]);

  const previewFile = files[0];
  const previewUrl = useMemo(() => (previewFile ? URL.createObjectURL(previewFile) : ''), [previewFile]);

  useEffect(() => {
    loadProjects();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    nodeRefs.current.forEach((node) => node.stop?.());
    nodeRefs.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setAudioOn(false);
  };

  const playAudio = async () => {
    stopAudio();
    const ctx = new window.AudioContext();
    audioCtxRef.current = ctx;

    const moodMap = { Dark: 110, Happy: 260, Aggressive: 160, Sad: 130, Calm: 180 };
    const base = moodMap[form.mood] || 170;

    const oscillator = ctx.createOscillator();
    oscillator.type = form.category === 'Horror' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = base;

    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();

    nodeRefs.current.push(oscillator);

    if (form.ambient.includes('Rain') || form.ambient.includes('Wind')) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.15;
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.05;
      whiteNoise.connect(noiseGain).connect(ctx.destination);
      whiteNoise.start();
      nodeRefs.current.push(whiteNoise);
    }

    setAudioOn(true);
  };

  const loadProjects = async () => {
    const { data } = await axios.get('/api/projects');
    setProjects(data.projects || []);
  };

  const handleTemplate = async (templateName) => {
    setForm((prev) => ({ ...prev, template: templateName }));
    const { data } = await axios.get('/api/templates');
    const t = data.templates[templateName];
    if (!t) return;
    setForm((prev) => ({ ...prev, category: t.category, mood: t.mood, ambient: t.layers, selectedEffects: t.effects, template: templateName }));
  };

  const detectVibe = async (file) => {
    const fd = new FormData();
    fd.append('media', file);
    const { data } = await axios.post('/api/vibe-detect', fd);
    setForm((prev) => ({ ...prev, category: data.category, mood: data.mood }));
  };

  const toggleInList = (key, value) => {
    setForm((prev) => {
      const has = prev[key].includes(value);
      return { ...prev, [key]: has ? prev[key].filter((entry) => entry !== value) : [...prev[key], value] };
    });
  };

  const submit = async () => {
    setError('');
    if (!files.length) {
      setError('Please upload at least one image, GIF, or video.');
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      files.forEach((file) => fd.append('mediaFiles', file));
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('mood', form.mood);
      fd.append('durationSeconds', String(form.durationSeconds));
      fd.append('ambientLayers', JSON.stringify(form.ambient));
      fd.append('effects', JSON.stringify(form.selectedEffects));
      const { data } = await axios.post('/api/projects', fd);
      setProjects((prev) => [...data.batch, ...prev]);
      setActiveNav('My Projects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen p-4 md:p-6 gap-4 md:gap-6">
      <aside className="glass neon-border rounded-2xl p-4 md:p-6 w-72 hidden md:block">
        <h1 className="text-xl font-bold text-neon-cyan">ToneForge AI</h1>
        <p className="text-xs text-slate-300 mt-1">Visual to Sound Engine</p>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${activeNav === item ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/10'}`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <section className="glass rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Tone</h2>
            <div className="flex gap-2">
              <button className={`px-3 py-1 rounded-lg text-xs ${batchMode ? 'bg-neon-pink/30' : 'bg-white/10'}`} onClick={() => setBatchMode((v) => !v)}>Batch Mode</button>
              <select value={form.template} onChange={(e) => handleTemplate(e.target.value)} className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 text-xs">
                <option value="">Template Mode</option>
                {templates.map((template) => <option key={template}>{template}</option>)}
              </select>
            </div>
          </div>

          <input className="w-full rounded-xl border border-dashed border-neon-cyan/40 bg-slate-900/70 p-3" type="file" multiple={batchMode} accept="image/*,video/*,.gif" onChange={async (e) => {
            const selected = Array.from(e.target.files || []);
            setFiles(selected);
            if (form.autoVibe && selected[0]) await detectVibe(selected[0]);
          }} />

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="input">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Mood">
              <select value={form.mood} onChange={(e) => setForm((p) => ({ ...p, mood: e.target.value }))} className="input">
                {moods.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Duration">
            <div className="flex flex-wrap gap-2">
              {presets.map((value) => (
                <button key={value} className={`px-2 py-1 rounded text-xs ${form.durationSeconds === value ? 'bg-neon-violet/40' : 'bg-white/10'}`} onClick={() => setForm((p) => ({ ...p, durationSeconds: value }))}>{value >= 60 ? `${Math.round(value / 60)}m` : `${value}s`}</button>
              ))}
              <input type="number" value={form.customDuration} onChange={(e) => setForm((p) => ({ ...p, customDuration: Number(e.target.value), durationSeconds: Number(e.target.value) }))} className="input w-28" min={1} />
            </div>
          </Field>

          <TagList label="Ambient Layers" items={ambientLayers} active={form.ambient} onToggle={(item) => toggleInList('ambient', item)} />
          <TagList label="Visual Effects" items={effects} active={form.selectedEffects} onToggle={(item) => toggleInList('selectedEffects', item)} />

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.autoVibe} onChange={(e) => setForm((p) => ({ ...p, autoVibe: e.target.checked }))} />
            Auto-detect vibe from media
          </label>

          {error ? <p className="text-red-400 text-sm">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button onClick={submit} className="bg-gradient-to-r from-neon-cyan to-neon-pink px-4 py-2 rounded-xl text-slate-900 font-semibold">Generate Tone + Video</button>
            {!audioOn ? (
              <button onClick={playAudio} className="px-4 py-2 rounded-xl bg-white/10">Preview Tone</button>
            ) : (
              <button onClick={stopAudio} className="px-4 py-2 rounded-xl bg-white/10">Stop Tone</button>
            )}
          </div>

          {loading && <LoadingBanner />}
        </section>

        <section className="space-y-4">
          <div className="glass rounded-2xl p-4 md:p-6">
            <h3 className="font-semibold mb-3">Preview Player (9:16)</h3>
            <div className="mx-auto w-[280px] h-[500px] rounded-2xl overflow-hidden bg-black relative border border-white/20">
              {previewFile ? (
                previewFile.type.startsWith('video') ? (
                  <video src={previewUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover animate-pulse" />
                )
              ) : (
                <div className="h-full grid place-content-center text-slate-400 text-sm">Upload media to preview</div>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 md:p-6">
            <h3 className="font-semibold mb-3">My Projects</h3>
            <div className="max-h-[340px] overflow-auto space-y-2 pr-1">
              {projects.map((project) => (
                <div key={project.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                  <div className="flex items-center justify-between">
                    <strong>{project.category} • {project.mood}</strong>
                    <span className={project.status === 'Done' ? 'text-emerald-400' : 'text-amber-300'}>{project.status}</span>
                  </div>
                  <p className="text-slate-300">Duration: {project.durationSeconds}s</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <a href={project.outputs?.mp3DownloadUrl} className="text-neon-cyan hover:underline">Download MP3</a>
                    <a href={project.outputs?.mp4DownloadUrl} className="text-neon-pink hover:underline">Download MP4</a>
                    {project.optimizedUrl ? <a href={project.optimizedUrl} className="text-emerald-300 hover:underline">Cloudinary URL</a> : <span className="text-slate-500">Cloudinary not configured</span>}
                  </div>
                </div>
              ))}
              {!projects.length && <p className="text-slate-400 text-sm">No projects yet.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function TagList({ label, items, active, onToggle }) {
  return (
    <div>
      <p className="text-sm text-slate-300 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item} onClick={() => onToggle(item)} className={`px-3 py-1 rounded-full text-xs ${active.includes(item) ? 'bg-neon-cyan/30 text-neon-cyan' : 'bg-white/10'}`}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingBanner() {
  return (
    <div className="rounded-xl p-3 bg-neon-violet/20 border border-neon-violet/30">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
        <p className="text-sm">Generating AI tone, ambient layers, and visual render...</p>
      </div>
    </div>
  );
}

export default App;
