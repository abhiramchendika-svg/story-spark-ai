# Google OAuth Setup Guide

This guide explains how to set up Google OAuth 2.0 authentication for the Story Spark AI application.

## Prerequisites

- Google Cloud Console account
- Both backend and frontend running

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter "Story Spark AI" as project name
   - Click "Create"

---

## Step 2: Enable Google+ API

1. In the Google Cloud Console, search for "Google+ API"
2. Click on "Google+ API" from the results
3. Click the "Enable" button

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **Credentials** section (left sidebar)
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Click "Configure Consent Screen"
   - Choose **External** user type
   - Fill in the required information:
     - **App name:** Story Spark AI
     - **User support email:** your-email@gmail.com
     - **Developer contact:** your-email@gmail.com
   - Click **Save and Continue**
   - You can skip "Scopes" step
   - Click **Save and Continue**
   - Click **Back to Dashboard**

4. Now create OAuth client ID:
   - Go back to **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Name: "Story Spark AI Web"
   - Add Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:5173` (Vite dev server)
   - Add Authorized redirect URIs:
     - `http://localhost:5000/api/v1/auth/google-callback`
     - `http://localhost:5173/login`
   - Click **Create**

---

## Step 4: Copy Your Client ID

After creating OAuth credentials, you'll see a dialog with:
- **Client ID** (this is what you need)
- Client Secret

Copy the **Client ID**.

---

## Step 5: Configure Environment Variables

### Frontend (.env)

Create or update `frontend/.env` file:

```env
VITE_BASE_URL=http://localhost:5000/api/v1
VITE_GOOGLE_CLIENT_ID=your_client_id_from_step_4
```

### Backend (.env)

Create or update `backend/.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_4
```

---

## Step 6: How It Works

### Frontend Flow:
1. User clicks "Login with Google" button
2. Google login dialog appears
3. User signs in with Google account
4. Frontend receives ID token from Google
5. Frontend sends token to backend API (`/auth/google-login`)

### Backend Flow:
1. Backend receives ID token from frontend
2. Backend verifies token with Google OAuth client
3. Backend extracts user info (email, name, picture)
4. If user doesn't exist, automatically creates account
5. If user exists, logs them in
6. Backend returns JWT access token
7. Frontend stores access token and redirects to dashboard

---

## Step 7: Test Google Login

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. Open browser: `http://localhost:5173`

3. Go to Login page

4. Click "Login with Google"

5. Complete Google authentication flow

6. You should be redirected to dashboard

---

## Troubleshooting

### "Invalid Client ID" Error
- Double-check that `VITE_GOOGLE_CLIENT_ID` is correctly set in frontend `.env`
- Ensure the Client ID matches what's in Google Cloud Console

### "Redirect URI mismatch"
- Make sure authorized URIs in Google Cloud Console match your app's URLs
- For development, use `http://localhost` (not `https`)

### "User not found" after successful Google login
- This is normal - the backend will create a new account automatically
- Check that MongoDB connection is working

### CORS Errors
- Make sure backend has CORS enabled for your frontend URL
- Update `CORS_ORIGINS` in backend `.env`:
  ```env
  CORS_ORIGINS=http://localhost:5173
  ```

---

## Security Notes

1. **Never commit `.env` files** to GitHub - they're already in `.gitignore`
2. **Never share your Client ID publicly** in commits
3. In production:
   - Use HTTPS URLs
   - Update `secure: true` in cookie settings
   - Use environment-specific credentials
   - Add production domain to Google Console authorized URIs

---

## API Endpoint

**POST** `/api/v1/auth/google-login`

**Request Body:**
```json
{
  "token": "google_id_token_from_frontend"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully with Google!",
  "data": {
    "accessToken": "jwt_access_token_here"
  }
}
```

---

## Next Steps

After Google OAuth is set up, consider:
1. Add similar OAuth for GitHub/GitHub login
2. Add logout functionality
3. Add profile update functionality
4. Add account linking (connect Google to existing account)
