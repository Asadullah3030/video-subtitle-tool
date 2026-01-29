import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:5000/api';

const STYLES = [
    { id: 'classic', name: '📝 Classic', color: '#FFFFFF', bg: 'none' },
    { id: 'boxed', name: '📦 Boxed', color: '#FFFFFF', bg: '#000000' },
    { id: 'neon', name: '💚 Neon', color: '#00FF00', bg: 'none' },
    { id: 'cinema', name: '🎬 Cinema', color: '#FFD700', bg: 'none' },
    { id: 'modern', name: '🔮 Modern', color: '#FFFFFF', bg: '#6366f1' },
];

const FONTS = ['Arial', 'Impact', 'Georgia', 'Verdana', 'Courier New'];

function App() {
    const [videos, setVideos] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState({});

    // Subtitle Settings
    const [style, setStyle] = useState('classic');
    const [fontSize, setFontSize] = useState(24);
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [bgColor, setBgColor] = useState('none');
    const [position, setPosition] = useState('bottom');
    const [font, setFont] = useState('Arial');
    const [previewText, setPreviewText] = useState('This is your subtitle preview');

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await axios.get(`${API}/videos/all`);
            setVideos(res.data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const applyStyle = (id) => {
        const s = STYLES.find(x => x.id === id);
        if (s) {
            setStyle(id);
            setTextColor(s.color);
            setBgColor(s.bg);
        }
    };

    const handleUpload = async () => {
        if (!file) return alert('Select a video!');
        setUploading(true);
        
        const formData = new FormData();
        formData.append('video', file);

        try {
            await axios.post(`${API}/videos/upload`, formData, {
                onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total))
            });
            setFile(null);
            setProgress(0);
            fetchVideos();
        } catch (e) {
            alert('Upload failed!');
        }
        setUploading(false);
    };

    const handleProcess = async (id) => {
        setProcessing(p => ({ ...p, [id]: true }));

        // Send all settings to backend
        const settings = {
            style,
            fontSize,
            fontColor: textColor,
            bgColor: bgColor === 'none' ? 'transparent' : bgColor,
            position,
            fontFamily: font
        };

        try {
            await axios.post(`${API}/videos/process/${id}`, settings);

            const poll = setInterval(async () => {
                const res = await axios.get(`${API}/videos/status/${id}`);
                const data = res.data.data;
                
                if (data.status === 'completed') {
                    clearInterval(poll);
                    setProcessing(p => ({ ...p, [id]: false }));
                    fetchVideos();
                    if (data.transcription) {
                        setPreviewText(data.transcription.substring(0, 60));
                    }
                    alert('✅ Subtitles generated!');
                } else if (data.status === 'failed') {
                    clearInterval(poll);
                    setProcessing(p => ({ ...p, [id]: false }));
                    alert('❌ Processing failed!');
                }
            }, 2000);
        } catch (e) {
            setProcessing(p => ({ ...p, [id]: false }));
            alert('Error!');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete?')) return;
        await axios.delete(`${API}/videos/${id}`);
        fetchVideos();
    };

    return (
        <div className="app">
            {/* Header */}
            <header>
                <h1>🎬 SubtitlePro</h1>
                <span>AI Video Subtitles</span>
            </header>

            <div className="main">
                {/* Left Panel */}
                <div className="left">
                    {/* Upload */}
                    <div className="card">
                        <h3>📤 Upload</h3>
                        <div className="upload" onClick={() => document.getElementById('file').click()}>
                            <input type="file" id="file" hidden accept="video/*" 
                                onChange={(e) => setFile(e.target.files[0])} />
                            {file ? `🎥 ${file.name}` : '📁 Click to select'}
                        </div>
                        {uploading && (
                            <div className="prog"><div style={{ width: `${progress}%` }}></div></div>
                        )}
                        <button className="btn" onClick={handleUpload} disabled={!file || uploading}>
                            🚀 {uploading ? `${progress}%` : 'Upload'}
                        </button>
                    </div>

                    {/* Videos */}
                    <div className="card">
                        <h3>📹 Videos</h3>
                        <div className="vlist">
                            {videos.length === 0 ? (
                                <p className="empty">No videos</p>
                            ) : videos.map(v => (
                                <div key={v._id} className="vitem">
                                    <div className="vinfo">
                                        <span className="vname">{v.originalName}</span>
                                        <span className={`tag ${v.status}`}>
                                            {v.status === 'uploaded' && '📤 Ready'}
                                            {v.status === 'processing' && '⏳ Processing'}
                                            {v.status === 'completed' && '✅ Done'}
                                            {v.status === 'failed' && '❌ Failed'}
                                        </span>
                                    </div>
                                    <div className="vbtns">
                                        {v.status === 'uploaded' && (
                                            <button onClick={() => handleProcess(v._id)} disabled={processing[v._id]}>
                                                {processing[v._id] ? '⏳' : '🎯'}
                                            </button>
                                        )}
                                        {v.status === 'completed' && (
                                            <>
                                                <button onClick={() => window.open(`${API}/videos/download/${v._id}`)}>📥</button>
                                                <button onClick={() => window.open(`${API}/videos/download-srt/${v._id}`)}>📄</button>
                                            </>
                                        )}
                                        <button className="del" onClick={() => handleDelete(v._id)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="right">
                    {/* Preview */}
                    <div className="card">
                        <h3>👁️ Preview</h3>
                        <div className="preview">
                            <div className={`sub ${position}`}>
                                <span style={{
                                    fontSize: `${fontSize * 0.75}px`,
                                    fontFamily: font,
                                    color: textColor,
                                    backgroundColor: bgColor === 'none' ? 'transparent' : bgColor,
                                    padding: bgColor !== 'none' ? '6px 14px' : '2px 6px',
                                    borderRadius: bgColor !== 'none' ? '4px' : '0',
                                    textShadow: bgColor === 'none' ? '2px 2px 4px #000' : 'none',
                                    display: 'inline-block'
                                }}>
                                    {previewText}
                                </span>
                            </div>
                        </div>
                        <textarea 
                            value={previewText} 
                            onChange={(e) => setPreviewText(e.target.value)}
                            placeholder="Edit text..."
                        />
                    </div>

                    {/* Settings */}
                    <div className="card">
                        <h3>🎨 Settings</h3>

                        {/* Style */}
                        <div className="set">
                            <label>Style</label>
                            <div className="styles">
                                {STYLES.map(s => (
                                    <button key={s.id} className={style === s.id ? 'active' : ''} 
                                        onClick={() => applyStyle(s.id)}>
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font */}
                        <div className="set">
                            <label>Font</label>
                            <select value={font} onChange={(e) => setFont(e.target.value)}>
                                {FONTS.map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>

                        {/* Size */}
                        <div className="set">
                            <label>Size: {fontSize}px</label>
                            <input type="range" min="16" max="48" value={fontSize} 
                                onChange={(e) => setFontSize(Number(e.target.value))} />
                        </div>

                        {/* Text Color */}
                        <div className="set">
                            <label>Text Color</label>
                            <div className="colors">
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                                <span>{textColor}</span>
                                {['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF0000'].map(c => (
                                    <button key={c} style={{ background: c }} 
                                        className={textColor === c ? 'active' : ''} 
                                        onClick={() => setTextColor(c)} />
                                ))}
                            </div>
                        </div>

                        {/* Background Color */}
                        <div className="set">
                            <label>Background Color</label>
                            <div className="colors">
                                <input type="color" value={bgColor === 'none' ? '#000000' : bgColor} 
                                    onChange={(e) => setBgColor(e.target.value)} />
                                <span>{bgColor === 'none' ? 'None' : bgColor}</span>
                                <button className={`no ${bgColor === 'none' ? 'active' : ''}`} 
                                    onClick={() => setBgColor('none')}>✕</button>
                                {['#000000', '#1a1a2e', '#6366f1', '#ef4444'].map(c => (
                                    <button key={c} style={{ background: c }} 
                                        className={bgColor === c ? 'active' : ''} 
                                        onClick={() => setBgColor(c)} />
                                ))}
                            </div>
                        </div>

                        {/* Position */}
                        <div className="set">
                            <label>Position</label>
                            <div className="pos">
                                {['top', 'center', 'bottom'].map(p => (
                                    <button key={p} className={position === p ? 'active' : ''} 
                                        onClick={() => setPosition(p)}>
                                        {p === 'top' ? '⬆️' : p === 'center' ? '⏺️' : '⬇️'} {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer>🎬 SubtitlePro v2.0</footer>
        </div>
    );
}

export default App;