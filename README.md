# CareerLink

CareerLink is a full-stack professional networking portfolio project built with React, Vite, Express, and MongoDB. It includes profiles, a social feed, connections, messaging, jobs and applications, groups, events, company pages, articles, and notifications.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB, local or hosted

## Local setup

1. Install frontend and backend dependencies:

   ```sh
   npm install
   npm install --prefix server
   ```

2. Copy `server/.env.example` to `server/.env` and set at least `MONGO_URI` and a private `JWT_SECRET` (32 or more random bytes).
3. Start the API and web app:

   ```sh
   npm run dev
   ```

   The web app runs at `http://localhost:5173` and the API at `http://localhost:5000`.

Google sign-in, email/OTP, and media uploads need their corresponding Google OAuth, SMTP, and Cloudinary settings in `server/.env`. Keep real credentials out of Git.

## Checks

```sh
npm test --prefix server
npm run lint
npm run build
```

For a hosted demo, set `VITE_API_BASE_URL` to the backend URL ending in `/api`, and configure the backend MongoDB connection plus its frontend origin/CORS settings. Configure Google OAuth, email, or Cloudinary credentials only if you want to use those integrations. Keep secrets private and use values appropriate for your hosting environment.

The backend exports its Express app through Vercel Functions and still starts a persistent server with `npm start`. To deploy it as a separate Vercel project:

1. Set the Vercel project's **Root Directory** to `server`.
2. Set **Framework Preset** to `Other`; leave **Build Command** and **Output Directory** unset. Vercel installs dependencies from `server/package.json` and deploys `server/api/` as functions. Do not use `npm run build` or configure a start command for this backend project.
3. Add the required backend environment variables in Vercel, including `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGINS` (or `CLIENT_URL`) with the production frontend origin.
4. Deploy the frontend separately and set its `VITE_API_BASE_URL` to the backend deployment URL ending in `/api`.

Vercel Functions do not keep the hourly notification scheduler running, and their request-size limit is below this app's largest upload limits. Use the included persistent Render service for the full scheduled-notification and large-upload behavior unless those features are adapted for serverless hosting.
