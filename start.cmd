@echo off
rem TU SHUO - one click start. Keep this file ASCII only: cmd reads .cmd in the local codepage.
setlocal
set "HERE=%~dp0"
set "RT=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%RT%" (
  "%RT%" "%HERE%start.py" %*
  goto :done
)
if exist "%HERE%.venv\Scripts\python.exe" (
  "%HERE%.venv\Scripts\python.exe" "%HERE%start.py" %*
  goto :done
)
where py >nul 2>nul && (
  py -3 "%HERE%start.py" %*
  goto :done
)
where python >nul 2>nul && (
  python "%HERE%start.py" %*
  goto :done
)
echo No usable Python 3 found. Install Python 3 from python.org, then double click start.py
pause

:done
endlocal
