# TeleDrive

TeleDrive is a cloud storage solution built on top of Telegram. It allows you to use your Telegram channels as unlimited cloud storage, complete with a beautiful Google Photos-like frontend interface, chunked uploads for large files, and dynamic thumbnail generation.

## Project Structure

TeleDrive is divided into three main components:

- `frontend`: A web interface built with React, Vite, and standard modern tools. It provides a visual file browser, image/video lightbox, and download manager.
- `backend`: A FastAPI-based server that talks to MongoDB to index your files and heavily integrates with Pyrogram to stream downloads straight from Telegram servers.
- `cli`: A set of command-line tools to upload files in bulk to your Telegram channels, taking care of chunking files larger than Telegram limits, creating thumbnails, resuming uploads, and more.

## Architecture

Instead of downloading everything from Telegram to the server and serving it to the client, the `backend` server streams media directly from Telegram's servers through Pyrogram to the user's browser whenever possible. This includes fast range requests for seamless video streaming.

The `cli/uploader.py` builds specific metadata-rich captions for the messages it uploads to Telegram. The backend then parses these captions to build its database index.

## Features

- **Chunked Uploads/Downloads**: Bypass Telegram's file limit size using split files which are transparently stitched back together when downloading.
- **Image & Video Previews**: Google Photos-style responsive file grid.
- **Optimized Thumbnails**: Support for predictive prefetching and even bundled zipped thumbnails (`[THUMB_ZIP]`) to eliminate rate limits on thumbnail loads.

## Setup Requirements

- Python 3.10+
- Node.js 18+
- MongoDB instance
- Telegram API ID and API Hash
- A Telegram Session String or Bot Token depending on limits required

Check out the respective folders (`frontend/`, `backend/`, and `cli/`) for specific environment variable setups and `requirements.txt` / `package.json` installs.
