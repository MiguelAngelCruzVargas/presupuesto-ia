@echo off
chcp 65001 >nul
cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║           PresuGenius - Gestor de Servicios IA             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:MENU
echo [1] Iniciar Todo (Proxy + Client) - Recomendado
echo [2] Detener todos los procesos
echo [3] Reiniciar (Detener + Iniciar)
echo [4] Solo Gemini Proxy (puerto 4001)
echo [5] Solo Client Vite (puerto 3005)
echo [6] Ver procesos activos
echo [7] Limpiar puertos 3005 y 4001
echo [0] Salir
echo.
set /p option="Selecciona una opción: "

if "%option%"=="1" goto START_ALL
if "%option%"=="2" goto STOP_ALL
if "%option%"=="3" goto RESTART
if "%option%"=="4" goto START_PROXY
if "%option%"=="5" goto START_CLIENT
if "%option%"=="6" goto SHOW_PROCESSES
if "%option%"=="7" goto CLEAN_PORTS
if "%option%"=="0" goto END
goto MENU

:START_ALL
echo.
echo ══════════════════════════════════════════════════════════
echo  Iniciando Gemini Proxy y Client Vite...
echo ══════════════════════════════════════════════════════════
call :CLEAN_PORTS
timeout /t 2 /nobreak >nul

echo.
echo Iniciando servicios con npm run dev:all...
echo (Esto iniciará el proxy en 4001 y el cliente en 3005)
echo.
start "PresuGenius - Proxy + Client" cmd /k "cd /d %~dp0 && npm run dev:all"

echo.
echo ✅ Servicios iniciados correctamente
echo    - Gemini Proxy: http://localhost:4001
echo    - Client Vite: http://localhost:3005
echo.
echo 💡 Abre tu navegador en: http://localhost:3005
echo.
pause
goto MENU

:STOP_ALL
echo.
echo ══════════════════════════════════════════════════════════
echo  Deteniendo todos los procesos...
echo ══════════════════════════════════════════════════════════

echo Matando procesos de Node.js...
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo ✅ Procesos Node.js detenidos
) else (
    echo ⚠️  No se encontraron procesos Node.js activos
)

echo Liberando puerto 3005...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3005') do (
    taskkill /F /PID %%a 2>nul
)

echo Liberando puerto 4001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo ✅ Todos los procesos detenidos
echo.
pause
goto MENU

:RESTART
echo.
echo ══════════════════════════════════════════════════════════
echo  Reiniciando servicios...
echo ══════════════════════════════════════════════════════════
call :STOP_ALL
timeout /t 2 /nobreak >nul
call :START_ALL
goto MENU

:START_PROXY
echo.
echo ══════════════════════════════════════════════════════════
echo  Iniciando solo Gemini Proxy (puerto 4001)...
echo ══════════════════════════════════════════════════════════
call :CLEAN_PORT_4001
timeout /t 1 /nobreak >nul
start "PresuGenius - Gemini Proxy" cmd /k "cd /d %~dp0 && npm run gemini-proxy"
echo ✅ Gemini Proxy iniciado en http://localhost:4001
echo.
pause
goto MENU

:START_CLIENT
echo.
echo ══════════════════════════════════════════════════════════
echo  Iniciando solo Client Vite (puerto 3005)...
echo ══════════════════════════════════════════════════════════
call :CLEAN_PORT_3005
timeout /t 1 /nobreak >nul
start "PresuGenius - Client" cmd /k "cd /d %~dp0 && npm run dev"
echo ✅ Client Vite iniciado en http://localhost:3005
echo.
pause
goto MENU

:SHOW_PROCESSES
echo.
echo ══════════════════════════════════════════════════════════
echo  Procesos Node.js activos:
echo ══════════════════════════════════════════════════════════
tasklist | findstr node.exe
echo.
echo ══════════════════════════════════════════════════════════
echo  Puertos 3005 y 4001:
echo ══════════════════════════════════════════════════════════
netstat -ano | findstr :3005
netstat -ano | findstr :4001
echo.
pause
goto MENU

:CLEAN_PORTS
call :CLEAN_PORT_3005
call :CLEAN_PORT_4001
goto :eof

:CLEAN_PORT_3005
echo Liberando puerto 3005...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3005 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    if %errorlevel%==0 echo ✅ Puerto 3005 liberado
)
goto :eof

:CLEAN_PORT_4001
echo Liberando puerto 4001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
    if %errorlevel%==0 echo ✅ Puerto 4001 liberado
)
goto :eof

:END
echo.
echo ══════════════════════════════════════════════════════════
echo  ¿Deseas detener los servicios antes de salir?
echo ══════════════════════════════════════════════════════════
set /p stop="[S]í / [N]o: "
if /i "%stop%"=="S" call :STOP_ALL
echo.
echo Hasta luego! 👋
timeout /t 2 /nobreak >nul
exit
