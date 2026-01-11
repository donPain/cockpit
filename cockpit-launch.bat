@echo off
set "HERE=%~dp0"
start "" "%SystemRoot%\System32\mshta.exe" "%HERE%cockpit.html"
