@echo off
title Sistema Biblioteca Minerva - Servidores
color 0b

echo ========================================================
echo   LIBRERIA ^& CENTRO CULTURAL MINERVA, C.A.
echo   Iniciando servidores del sistema...
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%"
set "BACKEND_DIR=%SCRIPT_DIR%..\backend-biblioteca"

echo [1/2] Iniciando Servidor Backend (Puerto 4000)...
start "Backend - Minerva (Puerto 4000)" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Servidor Frontend (Puerto 5173)...
start "Frontend - Minerva (Puerto 5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ========================================================
echo  ^>^> Ambos servidores se estan ejecutando correctamente.
echo  ^>^> Backend:  http://localhost:4000
echo  ^>^> Frontend: http://localhost:5173
echo ========================================================
echo.
echo Abriendo aplicacion en el navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5173
