@echo off
setlocal
set "HERE=%~dp0"
pushd "%HERE%" || exit /b 1

py --version
if errorlevel 1 (
  echo ERRO: Python nao encontrado no comando "py".
  echo Instale o Python 3 e marque "Add to PATH".
  pause
  popd
  exit /b 1
)

py -m pip --version
if errorlevel 1 (
  echo ERRO: pip nao disponivel.
  pause
  popd
  exit /b 1
)

py -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERRO: falha ao instalar dependencias.
  pause
  popd
  exit /b 1
)

start "" "http://127.0.0.1:8766/"
py app.py

pause
popd
