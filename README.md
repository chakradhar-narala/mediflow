# MediFlow - Healthcare Management System

A comprehensive healthcare management platform built with React and Express.js, featuring appointment booking, patient management, and integrated payment processing.

## 🌟 Features

- **Patient Management** - Manage patient profiles and medical history
- **Appointment Scheduling** - Book and manage medical appointments
- **Doctor Directory** - Browse and select healthcare professionals
- **Secure Authentication** - JWT-based user authentication with bcryptjs encryption
- **Payment Integration** - Razorpay integration for secure payments
- **Responsive Design** - Fully responsive UI with Tailwind CSS
- **File Management** - Image and document upload capabilities

## 💻 Tech Stack

### Frontend
- React 19.2.6
- React Router DOM v7
- Tailwind CSS v4.3.0
- Axios for API calls
- React Toastify for notifications

### Backend
- Node.js with Express.js
- SQLite3 database
- JWT authentication
- Bcryptjs for password hashing
- Razorpay payment gateway
- Multer for file uploads
- CORS enabled

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/chakradhar-narala/mediflow.git
cd mediflow
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
DATABASE_PATH=./database.db
```

Start the backend server:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Backend will run on `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
```

Start the frontend development server:

```bash
npm start
```

Frontend will run on `http://localhost:3000`

## 📦 Available Scripts

### Backend Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Frontend Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from create-react-app (irreversible)
```

## 🌐 Deployment Guide

### Deploy Frontend to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Select your GitHub repository
   - Set the root directory to `frontend`

3. **Configure Environment Variables**:
   - In Vercel project settings, add Environment Variables:
     - `REACT_APP_API_URL`: Your backend API URL
     - `REACT_APP_RAZORPAY_KEY_ID`: Your Razorpay key

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main

### Deploy Backend to Render

1. **Create Render Account**:
   - Sign up at [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository `mediflow`

3. **Configure the Service**:
   - **Name**: mediflow-backend
   - **Root Directory**: `backend`
   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or upgrade as needed)

4. **Add Environment Variables**:
   - Click "Environment"
   - Add the following variables:
     ```
     PORT=5000
     NODE_ENV=production
     JWT_SECRET=your_strong_jwt_secret
     RAZORPAY_KEY_ID=your_razorpay_key
     RAZORPAY_KEY_SECRET=your_razorpay_secret
     DATABASE_PATH=./database.db
     ```

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically deploy on every push to main
   - Your backend URL will be: `https://mediflow-backend.onrender.com`

6. **Update Frontend Environment**:
   - After backend deployment, update frontend's `REACT_APP_API_URL` in Vercel:
     ```
     REACT_APP_API_URL=https://mediflow-backend.onrender.com
     ```

## 🔐 Security Best Practices

- Keep your `.env` files in `.gitignore` (never commit secrets)
- Use strong JWT secrets (minimum 32 characters)
- Keep dependencies updated: `npm audit fix`
- Use HTTPS in production (handled by Vercel & Render)
- Validate all user inputs
- Use secure password hashing (bcryptjs is already configured)

## 🐛 Troubleshooting

### Backend won't start
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be v14+
```

### Frontend can't connect to backend
- Verify backend is running
- Check `REACT_APP_API_URL` matches your backend URL
- Ensure backend has CORS enabled
- Check browser console for error details

### Database errors
- Ensure `sqlite3` is properly installed
- Check write permissions in the backend directory
- Delete old database file and restart to initialize fresh

### Port already in use
```bash
# Backend
lsof -i :5000  # List process using port 5000
kill -9 <PID>  # Kill the process

# Frontend
lsof -i :3000
kill -9 <PID>
```

## 📧 Environment Variables Reference

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development/production |
| JWT_SECRET | Secret key for JWT | random_string_32_chars_min |
| RAZORPAY_KEY_ID | Razorpay public key | - |
| RAZORPAY_KEY_SECRET | Razorpay secret key | - |
| DATABASE_PATH | SQLite database path | ./database.db |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:5000 |
| REACT_APP_RAZORPAY_KEY_ID | Razorpay public key | - |

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to repository
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## 📄 License

ISC License - feel free to use this project

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review error messages carefully

---

**Happy Coding! 🎉**
