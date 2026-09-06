# Vigilens APA (Advanced People & Spatial Analytics)

Standalone Next.js frontend application for **Vigilens Advanced People Analytics**, featuring:
- **Module 1**: Workspace & Camera Setup Wizard (Floor plan placement & walkable connection graph)
- **Module 2**: Footage Upload & Live Multi-Status Processing Queue
- **Module 3**: People Directory & Multi-Day Spatio-Temporal Journey Drilldowns
- **Module 4**: AI Assistant Natural Language Q&A Chat UI (LangChain RAG interface)
- **Module 5**: Staff Enrollment Admin with Face Photo Upload

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local` (preconfigured by default):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_PORT=3001
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🐳 Docker Deployment

Build and run with Docker:
```bash
docker build -t vigilens-apa .
docker run -p 3001:3001 --env-file .env.local vigilens-apa
```
