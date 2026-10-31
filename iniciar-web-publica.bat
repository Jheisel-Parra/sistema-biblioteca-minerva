@echo off
title Portal Web Publico - Libreria Minerva
color 0a

echo ========================================================
echo   PORTAL WEB PUBLICO - LIBRERIA MINERVA
echo   Iniciando servidor de la pagina web...
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend-biblioteca"
set "WEB_DIR=%ROOT_DIR%web-publica-minerva"

:: Verificar si el Backend (Puerto 4000) ya esta encendido; si no, encenderlo para obtener los libros de la BD
netstat -ano | findstr ":4000.*LISTENING" >nul
if %errorlevel% neq 0 (
    echo [1/2] Iniciando Servidor Backend de Base de Datos (Puerto 4000)...
    start "Backend - Minerva (Puerto 4000)" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Servidor Backend (Puerto 4000) ya se encuentra activo.
)

echo [2/2] Iniciando Pagina Web Publica (Puerto 5174)...
start "Web Publica - Minerva (Puerto 5174)" cmd /k "cd /d "%WEB_DIR%" && npm run dev"

echo.
echo ========================================================
echo  ^>^> Pagina Web Publica iniciada correctamente.
echo  ^>^> URL Web Publica: http://localhost:5174
echo ========================================================
echo.
echo Abriendo pagina web en el navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5174
