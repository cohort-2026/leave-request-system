# How to start the backend and frontend

From the repo root (`leave-request-system`):

```powershell
npx --yes concurrently "npm --prefix backend run dev" "npm --prefix frontend run dev"
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
