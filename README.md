# 🚀 Lovable AI Clone - Frontend

A modern, high-performance Web Application Builder frontend inspired by Lovable.dev. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Sandpack** for real-time in-browser code compilation.

---

## ✨ Features

- ⚡ **Real-Time AI Code Generation**: Live streaming AI chat with granular file diffs and instant code updates.
- 🌐 **In-Browser Live Sandbox (`Sandpack`)**: Runs React, TypeScript, and Tailwind applications live in your browser without external containers.
- 🔧 **Auto-Fix & Compilation Error Watcher**: Detects runtime JSX/JS errors and provides a 1-click AI auto-fix action.
- 📦 **One-Click Code Export**: Download full project source code as a formatted `.zip` archive.
- 👥 **Project Sharing & Collaboration**: Invite members, assign roles (`OWNER`, `EDITOR`, `VIEWER`), and copy shareable links.
- 💳 **Subscription & Pro Tier Upgrade**: Full pricing plan modals integrated with Stripe checkout session APIs.
- 🚀 **Standalone Live Website Deployment**: Deploy and share live full-screen web applications (`/live/:projectId`).

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Sandbox Engine**: `@codesandbox/sandpack-react`
- **Icons**: `lucide-react`
- **Routing**: `react-router-dom` v6

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ 
- **npm** or **bun**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rayshivam30/Lovable-frontend.git
   cd Lovable-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8080
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Deployment (Vercel / Netlify)

1. Connect your GitHub repository to **[Vercel](https://vercel.com)** or **[Netlify](https://netlify.com)**.
2. Set Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend-api.com`
4. Click **Deploy**.
