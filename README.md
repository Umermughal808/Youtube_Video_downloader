
✅ YouTube Video Downloader Chrome Extension
=====================================================
In CMD or Terminal on opening this project in your Vs Code:
cd to the server folder, then run:

pip install flask flask-cors yt-dlp


🟢 STEP 1: Run the Flask Server
---------------------------------
cd to the server folder
python server.py


🟢 STEP 2: Load Chrome Extension
---------------------------------
1. Go to chrome://extensions/
2. Enable Developer Mode
3. Click "Load Unpacked"
4. Select the folder youtube-downloader-extension


🟢 STEP 3: Test on YouTube
-----------------------------
1. Open any YouTube video
2. Wait for the red ⬇ Download button
3. Click it — backend will fetch video using yt-dlp

🟢 Note:
-------------

If the Download button will not appear then just refresh the youtube page with video opened and wait for about 10 seconds it will automatically appear 


