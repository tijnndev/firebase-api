# Firebase API

A Node.js-based backend service that manages users, services, and Firebase Cloud Messaging (FCM) tokens using SQLite. It supports user authentication, service creation, token registration, and push notification broadcasting via FCM.

As an example (Android) app that works with the api, view the folder `native-app`.

## Features

- JWT-based authentication
- SQLite database for local persistence
- Firebase Admin integration for sending FCM notifications
- Endpoints for:
  - User login
  - Service creation and listing
  - FCM token registration
  - Broadcasting messages to service-specific tokens

## Requirements

- Node.js
- Firebase Admin SDK credentials
- Java 21
- Android SDK Command-line Tools
- Capacitor (for native app builds)
- Docker (optional)

## Environment Variables

Create a `.env` file in the project root with the following:

```env
JWT_SECRET=your_jwt_secret
DB_FILE=./data.sqlite
DEFAULT_USER_USERNAME=admin
DEFAULT_USER_PASSWORD=your-default-password
HTTP_PORT=3000
```
---

## Installation & Development

```bash
npm install
npm run dev
```

## Building the Native App

Here's the updated documentation with the `.env` file section added:

---

## Building the Native App

Build the frontend and native app using Capacitor:

```bash
npm run buildapp
```

If you get the error "file not found", just create a folder called `dist` inside the `native-app` folder.

After building, you can find the release APK here:

```
native-app/android/app/build/outputs/apk/release
```

---

## Environment Variables (`.env`)

To configure your app, create a `.env` file in the root of the project with the following content:

```env
VITE_API_URL="http://localhost:3000/api"
VITE_LOGGER_PACKAGE_NAME="com.yourname.firebase"
```
---
### Explanation:

- `VITE_API_URL`:  
  The base URL for your backend API.  
  This is used in frontend HTTP requests (e.g., Axios or Fetch).

- `VITE_LOGGER_PACKAGE_NAME`:  
  The Android package name used for logging or push notifications.  
  This should match your native app's Java package (e.g., in `MainActivity.java`).

Make sure to restart the dev/build process after modifying `.env` values.

## Running the Web Application
```bash
npm run dev
```
---

## Docker Support

Build and run using Docker:

```Dockerfile
FROM node:latest
WORKDIR /app
COPY . /app
RUN npm install
CMD ["npm", "start"]
```

Then run:

```bash
docker build -t firebase-server .
docker run -p 3000:3000 --env-file .env firebase-server
```

---

## API Endpoints

### `POST /login`

Authenticate a user.

**Body:**

```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "your-jwt-token"
}
```

---

### `GET /services`

Returns all created services.

**Headers:**

```
Authorization: Bearer <jwt>
```

---

### `GET /tokens`

Returns all registered tokens.

**Headers:**

```
Authorization: Bearer <jwt>
```

---

### `POST /create-service`

Create a new service.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Body:**

```json
{
  "name": "My App"
}
```

---

### `POST /register-token`

Register a new FCM token for a service.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Body:**

```json
{
  "token": "your-fcm-token",
  "serviceId": 1
}
```

---

### `POST /broadcast`

Send an FCM push notification to all tokens registered under a service.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Body:**

```json
{
  "title": "Alert",
  "body": "Something happened!",
  "serviceId": 1
}
```
---

## Notes

- A default user is created on startup if none exists.
- SQLite is used for simplicity. For production, consider PostgreSQL or MySQL.
- Native app is built with React Native + Capacitor and runs on Android via the CLI or Android Studio.

## License

MIT