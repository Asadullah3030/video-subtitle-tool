import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STYLES = [
    { id: 'classic', name: '📝 Classic', color: '#FFF', bg: 'none' },
    { id: 'boxed', name: '📦 Boxed', color: '#FFF', bg: '#000000' },
    { id: 'neon', name: '💚 Neon', color: '#00FF00', bg: 'none' },
    { id: 'cinema', name: '🎬 Cinema', color: '#FFD700', bg: 'none' },
    { id: 'modern', name: '🔮 Modern', color: '#FFF', bg: '#6366f1' }
];

const FONTS = ['Arial', 'Impact', 'Georgia', 'Verdana', 'Courier New'];

function App() {
    const [videos, setVideos] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState({});
    const [style, setStyle] = useState('classic');
    const [fontSize, setFontSize] = useState(24);
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [bgColor, setBgColor] = useState('none');
    const [position, setPosition] = useState('bottom');
    const [font, setFont] = useState('Arial');
    const [previewText, setPreviewText] = useState('Your subtitle text here...');

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await axios.get(API + '/videos/all');
            setVideos(res.data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const applyStyle = (id) => {
        const s = STYLES.find(function(x) { return x.id === id; });
        if (s) {
            setStyle(id);
            setTextColor(s.color);
            setBgColor(s.bg);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Select a video!');
            return;
        }
        setUploading(true);
        
        const formData = new FormData();
        formData.append('video', file);

        try {
            await axios.post(API + '/videos/upload', formData, {
                onUploadProgress: function(e) {
                    setProgress(Math.round((e.loaded * 100) / e.total));
                }
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
        setProcessing(function(p) { return { ...p, [id]: true }; });

        const settings = {
            style: style,
            fontSize: fontSize,
            fontColor: textColor,
            bgColor: bgColor === 'none' ? 'transparent' : bgColor,
            position: position,
            fontFamily: font
        };

        try {
            await axios.post(API + '/videos/process/' + id, settings);

            const poll = setInterval(async function() {
                const res = await axios.get(API + '/videos/status/' + id);
                const data = res.data.data;
                
                if (data.status === 'completed') {
                    clearInterval(poll);
                    setProcessing(function(p) { return { ...p, [id]: false }; });
                    fetchVideos();
                    if (data.transcription) {
                        setPreviewText(data.transcription.substring(0, 60));
                    }
                    alert('Subtitles generated!');
                } else if (data.status === 'failed') {
                    clearInterval(poll);
                    setProcessing(function(p) { return { ...p, [id]: false }; });
                    alert('Processing failed!');
                }
            }, 2000);
        } catch (e) {
            setProcessing(function(p) { return { ...p, [id]: false }; });
            alert('Error!');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete?')) return;
        await axios.delete(API + '/videos/' + id);
        fetchVideos();
    };

    const openDownload = (id) => {
        window.open(API + '/videos/download/' + id);
    };

    const openSRT = (id) => {
        window.open(API + '/videos/download-srt/' + id);
    };

    return (
        <div className="app">
            <header>
                <h1>🎬 SubtitlePro</h1>
                <span>AI Video Subtitles</span>
            </header>

            <div className="main">
                <div className="left">
                    <div className="card">
                        <h3>📤 Upload</h3>
                        <div className="upload" onClick={function() { document.getElementById('file').click(); }}>
                            <input 
                                type="file" 
                                id="file" 
                                hidden 
                                accept="video/*" 
                                onChange={function(e) { setFile(e.target.files[0]); }} 
                            />
                            {file ? '🎥 ' + file.name : '📁 Click to select'}
                        </div>
                        
                        {uploading && (
                            <div className="prog">
                                <div style={{ width: progress + '%' }}></div>
                            </div>
                        )}
                        
                        <button className="btn" onClick={handleUpload} disabled={!file || uploading}>
                            🚀 {uploading ? progress + '%' : 'Upload'}
                        </button>
                    </div>

                    <div className="card">
                        <h3>📹 Videos</h3>
                        <div className="vlist">
                            {videos.length === 0 ? (
                                <p className="empty">No videos</p>
                            ) : (
                                videos.map(function(v) {
                                    return (
                                        <div key={v._id} className="vitem">
                                            <div className="vinfo">
                                                <span className="vname">{v.originalName}</span>
                                                <span className={'tag ' + v.status}>
                                                    {v.status === 'uploaded' && '📤 Ready'}
                                                    {v.status === 'processing' && '⏳ Processing'}
                                                    {v.status === 'completed' && '✅ Done'}
                                                    {v.status === 'failed' && '❌ Failed'}
                                                </span>
                                            </div>
                                            <div className="vbtns">
                                                {v.status === 'uploaded' && (
                                                    <button 
                                                        onClick={function() { handleProcess(v._id); }} 
                                                        disabled={processing[v._id]}
                                                    >
                                                        {processing[v._id] ? '⏳' : '🎯'}
                                                    </button>
                                                )}
                                                {v.status === 'completed' && (
                                                    <React.Fragment>
                                                        <button onClick={function() { openDownload(v._id); }}>📥</button>
                                                        <button onClick={function() { openSRT(v._id); }}>📄</button>
                                                    </React.Fragment>
                                                )}
                                                <button className="del" onClick={function() { handleDelete(v._id); }}>🗑️</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="right">
                    <div className="card">
                        <h3>👁️ Preview</h3>
                        <div className="preview">
                            <div className={'sub ' + position}>
                                <span style={{
                                    fontSize: (fontSize * 0.75) + 'px',
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
                            onChange={function(e) { setPreviewText(e.target.value); }}
                            placeholder="Edit text..."
                        />
                    </div>

                    <div className="card">
                        <h3>🎨 Settings</h3>

                        <div className="set">
                            <label>Style</label>
                            <div className="styles">
                                {STYLES.map(function(s) {
                                    return (
                                        <button 
                                            key={s.id} 
                                            className={style === s.id ? 'active' : ''} 
                                            onClick={function() { applyStyle(s.id); }}
                                        >
                                            {s.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="set">
                            <label>Font</label>
                            <select value={font} onChange={function(e) { setFont(e.target.value); }}>
                                {FONTS.map(function(f) {
                                    return <option key={f} value={f}>{f}</option>;
                                })}
                            </select>
                        </div>

                        <div className="set">
                            <label>Size: {fontSize}px</label>
                            <input 
                                type="range" 
                                min="16" 
                                max="48" 
                                value={fontSize} 
                                onChange={function(e) { setFontSize(Number(e.target.value)); }} 
                            />
                        </div>

                        <div className="set">
                            <label>Text Color</label>
                            <div className="colors">
                                <input 
                                    type="color" 
                                    value={textColor} 
                                    onChange={function(e) { setTextColor(e.target.value); }} 
                                />
                                <span>{textColor}</span>
                                {['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF0000'].map(function(c) {
                                    return (
                                        <button 
                                            key={c} 
                                            style={{ background: c }} 
                                            className={textColor === c ? 'active' : ''} 
                                            onClick={function() { setTextColor(c); }} 
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="set">
                            <label>Background</label>
                            <div className="colors">
                                <input 
                                    type="color" 
                                    value={bgColor === 'none' ? '#000000' : bgColor} 
                                    onChange={function(e) { setBgColor(e.target.value); }} 
                                />
                                <span>{bgColor === 'none' ? 'None' : bgColor}</span>
                                <button 
                                    className={'no ' + (bgColor === 'none' ? 'active' : '')} 
                                    onClick={function() { setBgColor('none'); }}
                                >
                                    ✕
                                </button>
                                {['#000000', '#1a1a2e', '#6366f1', '#ef4444'].map(function(c) {
                                    return (
                                        <button 
                                            key={c} 
                                            style={{ background: c }} 
                                            className={bgColor === c ? 'active' : ''} 
                                            onClick={function() { setBgColor(c); }} 
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="set">
                            <label>Position</label>
                            <div className="pos">
                                {['top', 'center', 'bottom'].map(function(p) {
                                    return (
                                        <button 
                                            key={p} 
                                            className={position === p ? 'active' : ''} 
                                            onClick={function() { setPosition(p); }}
                                        >
                                            {p === 'top' ? '⬆️' : p === 'center' ? '⏺️' : '⬇️'} {p}
                                        </button>
                                    );
                                })}
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