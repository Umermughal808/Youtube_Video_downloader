from flask import Flask, request, jsonify, send_from_directory
import subprocess
import os
import uuid
import threading
import time
import re
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DOWNLOAD_FOLDER = 'downloads'
download_progress = {}

def extract_progress(line, download_id):
    """Extract download progress from yt-dlp output"""
    # Match progress patterns like "[download] 45.2% of 123.45MiB at 1.23MiB/s ETA 00:30"
    progress_match = re.search(r'\[download\]\s+(\d+\.?\d*)%', line)
    if progress_match:
        percentage = float(progress_match.group(1))
        download_progress[download_id] = {
            'percentage': percentage,
            'status': 'downloading',
            'message': line.strip()
        }
    elif 'has already been downloaded' in line:
        download_progress[download_id] = {
            'percentage': 100,
            'status': 'completed',
            'message': 'Download completed'
        }

def download_video_thread(url, filepath, download_id, quality):
    """Download video in a separate thread"""
    try:
        # Quality format selection
        if quality == 'best':
            format_selector = 'best[height<=2160]'  # 4K max
        elif quality == 'high':
            format_selector = 'best[height<=1080]'  # 1080p max
        elif quality == 'medium':
            format_selector = 'best[height<=720]'   # 720p max
        else:
            format_selector = 'best'
        
        process = subprocess.Popen([
            'yt-dlp',
            '--newline',  # Force newline for each progress update
            '-f', format_selector,
            '-o', filepath,
            url
        ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, 
           universal_newlines=True, bufsize=1)
        
        # Read output line by line for progress tracking
        for line in iter(process.stdout.readline, ''):
            if line:
                extract_progress(line, download_id)
        
        process.wait()
        
        if process.returncode == 0:
            download_progress[download_id] = {
                'percentage': 100,
                'status': 'completed',
                'message': 'Download completed successfully'
            }
        else:
            download_progress[download_id] = {
                'percentage': 0,
                'status': 'error',
                'message': 'Download failed'
            }
            
    except Exception as e:
        download_progress[download_id] = {
            'percentage': 0,
            'status': 'error',
            'message': f'Error: {str(e)}'
        }

@app.route('/download', methods=['POST'])
def download_video():
    data = request.get_json()
    url = data.get('url')
    quality = data.get('quality', 'best')  # Default to best quality
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
    download_id = str(uuid.uuid4())
    filename = f"{download_id}.%(ext)s"
    filepath = os.path.join(DOWNLOAD_FOLDER, filename)

    # Initialize progress tracking
    download_progress[download_id] = {
        'percentage': 0,
        'status': 'starting',
        'message': 'Initializing download...'
    }

    # Start download in separate thread
    thread = threading.Thread(target=download_video_thread, 
                            args=(url, filepath, download_id, quality))
    thread.daemon = True
    thread.start()

    return jsonify({
        'download_id': download_id,
        'message': 'Download started'
    })

@app.route('/progress/<download_id>')
def get_progress(download_id):
    """Get download progress for a specific download"""
    progress = download_progress.get(download_id, {
        'percentage': 0,
        'status': 'not_found',
        'message': 'Download not found'
    })
    
    # If download is completed, find the actual filename
    if progress['status'] == 'completed':
        for file in os.listdir(DOWNLOAD_FOLDER):
            if file.startswith(download_id):
                progress['filename'] = file
                progress['download_url'] = f"http://localhost:5000/file/{file}"
                break
    
    return jsonify(progress)

@app.route('/file/<filename>')
def serve_file(filename):
    return send_from_directory(DOWNLOAD_FOLDER, filename)

@app.route('/quality-options/<path:url>')
def get_quality_options(url):
    """Get available quality options for a video"""
    try:
        result = subprocess.run([
            'yt-dlp', '--list-formats', '--no-warnings', url
        ], capture_output=True, text=True, timeout=30)
        
        # Parse formats and extract quality options
        formats = []
        lines = result.stdout.split('\n')
        for line in lines:
            if 'mp4' in line and ('x' in line or 'p' in line):
                formats.append(line.strip())
        
        return jsonify({'formats': formats[:10]})  # Return top 10 formats
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, threaded=True)