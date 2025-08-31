@echo off
echo Starting Talk to PDF Application...
echo.

REM Create .env file if it doesn't exist
if not exist backend\.env (
    echo Creating .env file from template...
    copy backend\.env.example backend\.env
    echo.
    echo Please edit backend\.env with your API keys before running the application.
    echo.
)

REM Start backend server
echo Starting backend server on port 8000...
start "Backend Server" cmd /k "cd backend && "C:/Users/sumeet mohanty/AppData/Local/Programs/Python/Python312/python.exe" main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo Starting frontend server on port 3000...
start "Frontend Server" cmd /k "cd frontend && python -m http.server 3000"

REM Wait a moment for frontend to start
timeout /t 2 /nobreak >nul

REM Open browser
echo Opening application in browser...
start http://localhost:3000

echo.
echo Talk to PDF Application is now running!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this launcher...
pause >nul
