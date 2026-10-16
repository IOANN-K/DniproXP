@echo off
cd /d "%~dp0"
echo Starting DniproXP at http://127.0.0.1:5173
call npx --yes pnpm@10.0.0 --filter web dev --host 127.0.0.1 --port 5173 --strictPort
pause
