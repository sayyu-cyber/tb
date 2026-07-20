# Thaasbai — Deployment Guide

## Deploy to Netlify

### Method 1: Netlify CLI (Fastest)

```bash
# 1. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Install dependencies
npm install

# 4. Build the project
npm run build

# 5. Deploy to production
netlify deploy --prod --dir=.next
```

### Method 2: Git + Netlify Dashboard (Recommended)

#### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial Thaasbai commit"
gh repo create thaasbai --public --source=. --push
```

#### Step 2: Connect to Netlify
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site" → "Import an existing project"**
3. Select your GitHub repository
4. Netlify will auto-detect Next.js settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

#### Step 3: Add Environment Variables
In Netlify Dashboard → Site settings → Environment variables, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | your_api_key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your_project.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your_project_id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | your_project.appspot.com |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 123456789 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 1:... |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | your_vapid_key |

#### Step 4: Update Firebase Authorized Domains
In Firebase Console → Authentication → Settings → Authorized domains, add:
```
your-site-name.netlify.app
```

### Method 3: Drag & Drop (Quick Test)
1. Run `npm run build` locally
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag and drop your `.next` folder

---

## Firebase Setup Checklist

Before deploying, make sure:

- [ ] Firebase project created
- [ ] Authentication enabled (Google + Email/Password)
- [ ] Firestore Database created
- [ ] Environment variables added to Netlify
- [ ] Netlify domain added to Firebase authorized domains

---

## Troubleshooting

### Build fails on Netlify
- Make sure Node version is set to 18+ in build settings
- Check that all env vars are prefixed with `NEXT_PUBLIC_`

### Firebase Auth not working
- Verify authorized domains include your Netlify URL
- Check browser console for CORS errors

### Images not loading
- Add your image domains to `next.config.js` images.domains array
