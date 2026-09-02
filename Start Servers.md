# How to start the backend and frontend

Install once from the repo root (`leave-request-system`) using the committed lockfiles:

```powershell
npm ci
npm run ci:all
```

Then start both:

```powershell
npm run dev
```

- Backend: http://localhost:4000/api/health
- Frontend: http://localhost:5173

`Ctrl+C` stops both.

# How to start the backend or frontend separately

Backend:

```powershell
cd backend
npm run dev
```

Frontend (second terminal):

```powershell
cd frontend
npm run dev
```
