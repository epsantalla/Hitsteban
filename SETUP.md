# Estebox - Web Application Setup

Estebox is a collection of party games built with Next.js, React, and Tailwind CSS. Its first game, **Songster** (guess the song), integrates the Spotify Web Playback SDK. The steps below get Songster running (the only game that needs Spotify credentials so far).

## Prerequisites

1. **Install Node.js**: You need Node.js installed to run this project. Download it from [nodejs.org](https://nodejs.org/). We recommend the LTS version.
2. **Spotify Premium Account**: The Spotify Web Playback SDK requires a Premium account to stream audio directly.
3. **Spotify Developer App**: You need to create an app in the Spotify Developer Dashboard to get your credentials.

## Step 1: Set Up Spotify Developer App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**.
3. Fill in the App name and Description.
4. For the **Redirect URI**, enter: `http://127.0.0.1:3000/api/auth/callback/spotify`
5. Check the box to agree to the Terms of Service and click **Save**.
6. Open the newly created app and click **Settings**.
7. Copy the **Client ID** and **Client Secret**.

## Step 2: Configure Environment Variables

1. In the root of this project folder (`Hitsteban`), copy the `.env.local.example` file and rename it to `.env.local`.
   - On Windows, you can do this by opening the folder, copying the file, pasting it, and renaming it.
2. Open `.env.local` in any text editor.
3. Replace the placeholder values with your actual Spotify Client ID and Client Secret.
4. Generate a random string for `NEXTAUTH_SECRET` (e.g., just type a long sequence of random characters and numbers).

## Step 3: Install Dependencies

1. Open your terminal (PowerShell or Command Prompt).
2. Navigate to this directory:
   ```cmd
   cd C:\Users\Esteban\Desktop\Hitsteban
   ```
3. Run the following command to install all required packages:
   ```cmd
   npm install
   ```

## Step 4: Run the Application

1. While still in the terminal in the project directory, start the Next.js development server:
   ```cmd
   npm run dev
   ```
2. Open your web browser and go to [http://127.0.0.1:3000](http://127.0.0.1:3000).

## How to Play (Songster)

1. From the Estebox menu, select **Songster**.
2. Click "Log in with Spotify Premium" and authorize the app.
3. Enter a Spotify Playlist ID. You can find this in the URL of any public Spotify playlist.
   - Example: For the URL `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`, the ID is `37i9dQZF1DXcBWIGoYBM5M`.
4. Tap **Start Game**.
5. The first song will begin playing.
6. **Phase 1**: Hold (or click) anywhere on the screen to reveal the song details.
7. **Phase 2**: Hold (or click) again to skip to the next randomized song.
