@echo off
cls
title Script de Backup do Site - Lobos

:: =================================================================
:: Caminhos configurados para o seu projeto.
:: =================================================================
set "PASTA_DO_SITE=D:\SCripts\SiteLobos"
set "PASTA_DE_BACKUP=D:\SCripts\BackupSiteLobo"
:: =================================================================

echo Pasta do Site: "%PASTA_DO_SITE%"
echo Pasta de Backup: "%PASTA_DE_BACKUP%"
echo.
if not exist "%PASTA_DO_SITE%" (
    echo ERRO: A pasta do site nao foi encontrada! Verifique o caminho.
    pause
    exit
)
if not exist "%PASTA_DE_BACKUP%" mkdir "%PASTA_DE_BACKUP%"

:: --- Criando o Backup Inicial Permanente ---
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%h%time:~3,2%m"
set "PASTA_BACKUP_INICIAL=%PASTA_DE_BACKUP%\Backup_Inicial_%TIMESTAMP%"

echo =================================================================
echo  FAZENDO O PRIMEIRO BACKUP (PERMANENTE)...
echo =================================================================
robocopy "%PASTA_DO_SITE%" "%PASTA_BACKUP_INICIAL%" /MIR /R:2 /W:5
echo.
echo Backup inicial concluido em: "%PASTA_BACKUP_INICIAL%"
echo =================================================================
echo.

set "contador=0"

:loop
set /a contador+=1
if %contador% GTR 3 set "contador=1"

echo Proximo backup rotativo (slot %contador%) em 30 minutos. Pressione Ctrl+C para cancelar.
timeout /t 1800 /nobreak > nul

set "PASTA_BACKUP_ATUAL=%PASTA_DE_BACKUP%\Backup_Recente_%contador%"
set "TIMESTAMP_ATUAL=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%h%time:~3,2%m"

echo.
echo =================================================================
echo  FAZENDO BACKUP ROTATIVO (Slot: %contador%) em %TIMESTAMP_ATUAL%
echo =================================================================
robocopy "%PASTA_DO_SITE%" "%PASTA_BACKUP_ATUAL%" /MIR /R:2 /W:5
echo.
echo Backup rotativo concluido em: "%PASTA_BACKUP_ATUAL%"
echo =================================================================
echo.

goto :loop