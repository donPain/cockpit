@echo off
set "PROFILE=Profile 6"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 1

set "USERDATA=%LOCALAPPDATA%\Google\Chrome\User Data"
if not exist "%USERDATA%\%PROFILE%\" (
  start "" "%CHROME%" "chrome://version/"
  exit /b 0
)

start "" "%CHROME%" --profile-directory="%PROFILE%" --new-window "chrome://newtab/"
