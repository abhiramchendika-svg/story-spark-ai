# Google OAuth Login - Bug Fixes & Implementation

## Fixed Issues

### 1. **Password Field Optional for Google Users**
   - **File:** `backend/src/app/modules/user/user.interface.ts`
   - **Change:** Made `password` optional in `IUser` interface
   - ```typescript
     password?: string;  // Now optional
     ```

### 2. **User Model Schema Updated**
   - **File:** `backend/src/app/modules/user/user.model.ts`
   - **Changes:**
     - Made password field optional: `password: { type: String, required: false, default: "" }`
     - Updated pre-save hook to only hash password if it exists and is not empty

### 3. **Login Service Enhanced**
   - **File:** `backend/src/app/modules/auth/auth.service.ts`
   - **Changes:**
     - Added validation to check if password exists before comparison
     - Displays helpful message if user tries password login on Google account:
       ```
       "Please use Google login for this account!"
       ```

### 4. **Google Login Service Improved**
   - **File:** `backend/src/app/modules/auth/auth.service.ts`
   - **Changes:**
     - Added null check for `google_client_id` configuration
     - Fixed variable naming (renamed `name` to `googleName` to avoid conflicts)
     - Properly uses existing user's name when user already exists
     - Better error handling with distinction between `ApiError` and other errors
     - Creates complete user object with all required fields

## Implementation Flow

### Frontend → Backend
1. User clicks "Login with Google"
2. Google OAuth dialog appears
3. User authenticates with Google
4. Frontend receives ID token
5. Frontend sends token to backend: `POST /api/v1/auth/google-login`

### Backend Processing
1. Verifies ID token with Google OAuth client
2. Extracts user info: `email`, `name`, `picture`
3. Checks if user exists in database
4. **If new user:** Creates account with:
   - Empty/no password (for Google auth)
   - Profile avatar from Google
   - Default role and subscription
5. **If existing user:** Uses stored data
6. Generates JWT tokens
7. Returns access token to frontend

## Key Improvements

✅ **Google users can now login without password**
✅ **Regular users cannot use Google flow (and vice versa)**
✅ **Proper error handling for missing configuration**
✅ **Complete user object creation**
✅ **Database schema supports both password and OAuth-based auth**

## Testing Checklist

- [ ] Set `GOOGLE_CLIENT_ID` in backend `.env`
- [ ] Set `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
- [ ] Backend running: `npm run dev` on port 5000
- [ ] Frontend running: `npm run dev` on port 5173
- [ ] Click "Login with Google" on login page
- [ ] Complete Google authentication
- [ ] Should redirect to dashboard with valid token

## Troubleshooting

### Error: "Google OAuth not configured"
- Check that `GOOGLE_CLIENT_ID` is set in backend `.env`

### Error: "Invalid Google token"
- Verify token comes from correct Google OAuth app
- Check `audience` matches your Google Client ID

### Error: "User already exists"
- This shouldn't happen - code handles existing users
- If it does, check database for duplicates

### Error: "Please use Google login for this account!"
- User tried password login on Google-authenticated account
- Advise user to use Google login instead

## Files Modified

1. `backend/src/app/modules/user/user.interface.ts`
2. `backend/src/app/modules/user/user.model.ts`
3. `backend/src/app/modules/auth/auth.service.ts`
4. `backend/src/app/modules/auth/auth.controller.ts`
5. `backend/src/app/modules/auth/auth.router.ts`
6. `backend/src/config/index.ts`
7. `frontend/src/main.tsx`
8. `frontend/src/components/login/login.component.tsx`
9. `frontend/src/redux/apis/auth.api.ts`
10. `backend/.env.example` (added `GOOGLE_CLIENT_ID`)
11. `frontend/.env.example` (added `VITE_GOOGLE_CLIENT_ID`)

## Next Steps (Optional)

- Add Google login to signup/register page
- Add account linking (connect Google to existing email account)
- Add GitHub OAuth as alternative
- Add logout functionality
- Add profile verification for Google users
