# Firebase Notification Dashboard

A modern, full-featured Node.js backend service for managing Firebase Cloud Messaging (FCM) notifications with a beautiful web dashboard. Features user authentication, service management, FCM token registration, and push notification broadcasting.

## ✨ Features

- 🔐 **JWT-based Authentication** - Secure user login and session management
- 🗄️ **MySQL Database** - Robust data persistence with connection pooling
- 🎨 **Modern UI** - Beautiful gradient-based dashboard with dark/light mode
- 🔥 **Firebase Integration** - Full Firebase Admin SDK support for FCM
- 📱 **Native App Support** - Includes Android app example with Capacitor
- 🚀 **RESTful API** - Complete API for service and token management
- 📊 **Real-time Dashboard** - Monitor services, tokens, and send test notifications
- 🎯 **Notification Testing** - Built-in notification testing center

## 📋 Requirements

- Node.js 16+ 
- MySQL 5.7+ or MariaDB 10.3+
- Firebase Admin SDK credentials
- Java 21 (for native app)
- Android SDK Command-line Tools (for native app)
- Docker (optional)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd firebase-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup MySQL Database

Create a new MySQL database:

```sql
CREATE DATABASE firebase_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'firebase_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON firebase_dashboard.* TO 'firebase_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Configure Environment

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=firebase_user
DB_PASSWORD=your_secure_password
DB_NAME=firebase_dashboard

# Application Configuration
DEFAULT_USER_USERNAME=admin
DEFAULT_USER_PASSWORD=admin
JWT_SECRET=your_super_secret_jwt_key_change_this
HTTP_PORT=5000
```

### 5. Place Firebase Service Account Key

Download your Firebase service account key from Firebase Console and save it as `serviceAccountKey.json` in the project root.

### 6. Run the Application

```bash
npm start
```

The application will:
- Connect to MySQL database
- Create tables automatically if they don't exist
- Create a default admin user
- Start the server at `http://localhost:5000`

## 🔄 Migrating from SQLite to MySQL

If you're upgrading from an older SQLite version:

### Option 1: Fresh Start (Recommended)

Just follow the Quick Start guide above. The new database will be created automatically.

### Option 2: Migrate Existing Data

1. **Export SQLite Data**:

```bash
sqlite3 your_database.db .dump > backup.sql
```

2. **Convert and Import** (manual process):
   - Extract `INSERT` statements from `backup.sql`
   - Adjust syntax for MySQL (mainly AUTO_INCREMENT instead of AUTOINCREMENT)
   - Import into MySQL

3. **Update Environment**: Change your `.env` from `DB_FILE` to MySQL configuration

## 🎨 UI Improvements

The new version includes:

- **Modern Gradient Design**: Beautiful purple/blue gradients throughout
- **Smooth Animations**: Fade-in effects, hover transitions, and micro-interactions
- **Enhanced Cards**: Subtle shadows, hover effects, and gradient accents
- **Better Typography**: Improved font hierarchy and readability
- **Dark/Light Mode**: Toggle between themes with smooth transitions
- **Responsive Design**: Mobile-first approach with breakpoints
- **Custom Scrollbars**: Styled scrollbars matching the theme
- **Icon Enhancements**: Better icon placement and visual hierarchy

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL server hostname | `localhost` |
| `DB_PORT` | MySQL server port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | `firebase_dashboard` |
| `DEFAULT_USER_USERNAME` | Default admin username | `admin` |
| `DEFAULT_USER_PASSWORD` | Default admin password | `admin` |
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `HTTP_PORT` | Server port | `5000` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | (required) |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | (required) |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | (required) |

## 📱 Building the Native App

Build the frontend and native app using Capacitor:

```bash
npm run buildapp
```

If you get the error "file not found", create a folder called `dist` inside the `native-app` folder.

After building, you can find the release APK here:

```
native-app/android/app/build/outputs/apk/release
```

### Native App Environment Variables

Create a `.env` file in the `native-app` folder:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_LOGGER_PACKAGE_NAME="com.yourname.firebase"
```

- `VITE_API_URL`: The base URL for your backend API
- `VITE_LOGGER_PACKAGE_NAME`: Your Android app's package name

**Note**: Restart the dev/build process after modifying `.env` values.

## 🐳 Docker Support

Build and run using Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

Run with Docker:

```bash
docker build -t firebase-dashboard .
docker run -p 5000:5000 --env-file .env firebase-dashboard
```

Or use Docker Compose:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=firebase_dashboard
    depends_on:
      - db
    volumes:
      - ./serviceAccountKey.json:/app/serviceAccountKey.json

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=firebase_dashboard
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## 📚 API Endpoints

### Authentication

#### `POST /auth/login`

Authenticate a user and start a session.

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
  "success": true,
  "message": "Login successful"
}
```

### Services

#### `GET /services`

Get all services (requires authentication).

**Response:**
```json
{
  "services": [
    {
      "id": 1,
      "name": "My App",
      "url": "https://myapp.com",
      "secret": "abc123...",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `POST /services`

Create a new service (requires authentication).

**Body:**
```json
{
  "name": "My App",
  "url": "https://myapp.com"
}
```

#### `DELETE /services/:id`

Delete a service (requires authentication).

### FCM Tokens

#### `GET /tokens`

Get all FCM tokens (requires authentication).

#### `POST /api/register-token`

Register a new FCM token (requires service secret).

**Headers:**
```
Authorization: Bearer <service-secret>
```

**Body:**
```json
{
  "token": "fcm-token-here",
  "type": "android"
}
```

#### `DELETE /tokens/:id`

Delete a token (requires authentication).

### Notifications

#### `POST /api/broadcast`

Send a notification to all devices of a service (requires service secret).

**Headers:**
```
Authorization: Bearer <service-secret>
```

**Body:**
```json
{
  "title": "Hello",
  "body": "This is a test notification",
  "data": {
    "custom": "data"
  }
}
```

## 🛠️ Development

### Running in Development Mode

```bash
npm run dev
```

### Project Structure

```
firebase-api/
├── database.js          # MySQL database configuration and migrations
├── server.js           # Express server setup
├── utils.js            # Utility functions
├── middleware/
│   └── auth.js         # Authentication middleware
├── routes/
│   ├── auth.js         # Authentication routes
│   ├── services.js     # Service management routes
│   ├── tokens.js       # Token management routes
│   └── index.js        # Dashboard and notification routes
├── views/              # EJS templates
│   ├── layouts/
│   ├── partials/
│   ├── dashboard.ejs
│   ├── login.ejs
│   └── ...
├── public/
│   ├── css/
│   │   └── style.css   # Enhanced modern styling
│   └── js/
│       └── main.js
└── native-app/         # Android app with Capacitor

```

## 🎯 Features Breakdown

### Database (MySQL)

- **Connection Pooling**: Efficient database connections with `mysql2/promise`
- **Auto-Migration**: Tables are created automatically on startup
- **Foreign Keys**: Proper relationships between tables
- **Indexes**: Optimized queries with strategic indexes
- **UTF8MB4**: Full Unicode support including emojis

### Security

- **Session Management**: Secure express-session configuration
- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configured for cross-origin requests
- **Input Validation**: Sanitization utilities
- **Service Secrets**: Unique authentication per service

### UI/UX

- **Gradient Themes**: Modern purple/blue gradient design
- **Smooth Animations**: CSS transitions and keyframe animations
- **Responsive**: Mobile-first design with breakpoints
- **Dark/Light Mode**: Theme toggle with smooth transitions
- **Custom Components**: Styled forms, buttons, cards, and tables

## 📝 Notes

- A default admin user is created automatically on first run
- Change the default credentials immediately in production
- MySQL is recommended for production; offers better performance and scalability than SQLite
- Service secrets should be kept secure and rotated periodically
- The native app is built with React + Vite + Capacitor

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🆘 Support

For issues and questions:
- Check existing issues
- Create a new issue with detailed information
- Provide error logs and environment details

---

**Made with ❤️ using Node.js, Express, MySQL, and Firebase**