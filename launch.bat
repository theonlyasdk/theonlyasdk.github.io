@echo off
rem Jekyll blog launcher: dev serve, production build, test, or new post.
rem   Usage: launch.bat [0-4]   (no argument = interactive menu)
rem     [0] -> exit
rem     [1] -> local dev (bundle exec jekyll serve --livereload)
rem     [2] -> production build (JEKYLL_ENV=production jekyll build)
rem     [3] -> build + test (production build + html-proofer)
rem     [4] -> new post (tools\new_post.py)
setlocal

rem Option passed on the command line: run it once, then exit.
if not "%~1"=="" (
  set "choice=%~1"
  set "once=1"
  goto run_choice
)

:menu
echo.
echo   theonlyasdk.github.io - what do you want to do?
echo   [0] Exit
echo   [1] Local dev
echo   [2] Production build
echo   [3] Build + test
echo   [4] New post
echo.
set "choice="
set /p "choice=Choose 0-4: "

:run_choice
if "%choice%"=="0" goto done
if "%choice%"=="1" goto dev
if "%choice%"=="2" goto build
if "%choice%"=="3" goto test
if "%choice%"=="4" goto new_post
if defined once (
  echo Unknown option "%~1". Use 0, 1, 2, 3 or 4.
  exit /b 1
)
goto menu

:dev
echo.
echo Starting local dev server...
call bundle exec jekyll serve --livereload --host 127.0.0.1
if defined once exit /b %errorlevel%
goto menu

:build
echo.
echo Building production site...
set "JEKYLL_ENV=production"
call bundle exec jekyll build
if defined once exit /b %errorlevel%
goto menu

:test
echo.
echo Building production site for test...
set "JEKYLL_ENV=production"
call bundle exec jekyll build
if errorlevel 1 (
  echo Build failed, skipping html-proofer.
  if defined once exit /b %errorlevel%
  goto menu
)
echo.
echo Running html-proofer...
call bundle exec htmlproofer "_site" --disable-external --ignore-urls "/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/"
if defined once exit /b %errorlevel%
goto menu

:new_post
echo.
set "post_title="
set /p "post_title=Post title: "
if "%post_title%"=="" (
  echo Post title cannot be empty.
  if defined once exit /b 1
  goto menu
)
call python tools\new_post.py "%post_title%"
if defined once exit /b %errorlevel%
goto menu

:done
echo.
echo Goodbye.
exit /b 0
