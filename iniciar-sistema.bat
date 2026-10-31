@echo off
title Sistema Biblioteca Minerva - Servidores
color 0b

echo ========================================================
echo   LIBRERIA ^& CENTRO CULTURAL MINERVA, C.A.
echo   Iniciando servidores del sistema...
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend-biblioteca"
set "FRONTEND_DIR=%ROOT_DIR%frontend-biblioteca"
set "WEB_DIR=%ROOT_DIR%web-publica-minerva"

:: Verificar y crear archivo .env en el backend si se descargo en una PC nueva
if not exist "%BACKEND_DIR%\.env" (
    echo [Configuracion Inicial] Creando archivo .env por defecto...
    (
        echo DATABASE_URL="file:./dev.db"
        echo PORT=4000
        echo JWT_SECRET="biblioteca_jwt_secret_key_segura_2026_sistema"
    ) > "%BACKEND_DIR%\.env"
)

:: Verificar si existe la base de datos SQLite; si no existe, crearla y sembrarla automaticamente
if not exist "%BACKEND_DIR%\prisma\dev.db" (
    echo.
    echo ========================================================
    echo  [Primera Ejecucion Detectada]
    echo  No se encontro base de datos local ^(dev.db^).
    echo  Creando estructura de tablas y datos iniciales...
    echo ========================================================
    pushd "%BACKEND_DIR%"
    call npx prisma generate
    call npx prisma db push
    call node prisma/seed.js
    popd
    echo.
    echo  ^>^> Base de datos inicial creada exitosamente.
    echo  ^>^> Credenciales de Administrador por defecto:
    echo     Correo:     admin@biblioteca.com  ^(o Cedula: V-24123456^)
    echo     Contrasena: admin123
    echo ========================================================
    echo.
)

echo [1/3] Iniciando Servidor Backend (Puerto 4000)...
start "Backend - Minerva (Puerto 4000)" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/3] Iniciando Sistema Interno de Gestion (Puerto 5173)...
start "Sistema de Gestion - Minerva (Puerto 5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

timeout /t 1 /nobreak >nul

echo [3/3] Iniciando Pagina Web Publica (Puerto 5174)...
start "Web Publica - Minerva (Puerto 5174)" cmd /k "cd /d "%WEB_DIR%" && npm run dev"

echo.
echo ========================================================
echo  ^>^> Todos los servidores se estan ejecutando:
echo  ^>^> Backend API:        http://localhost:4000
echo  ^>^> Sistema de Gestion: http://localhost:5173
echo  ^>^> Pagina Web Publica: http://localhost:5174
echo ========================================================
echo.
echo Abriendo aplicaciones en el navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5173
start http://localhost:5174
