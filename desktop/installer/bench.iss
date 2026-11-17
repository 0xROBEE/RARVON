; Bench for desktop (beta): the Windows installer.
; Built by `npm run build:desktop`, which fills ..\stage first and passes the version.
; Installs for the current user only: no administrator rights needed.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{6F1B7C2E-4A5D-4E8B-9C3F-B3E1C0A1D7E2}
AppName=Bench
AppVersion={#AppVersion}
AppVerName=Bench {#AppVersion} (beta)
AppPublisher=ROBEE
AppPublisherURL=https://github.com/ROBEE404
AppCopyright=Copyright (c) 2026 ROBEE. All rights reserved.
DefaultDirName={localappdata}\Programs\Bench
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
MinVersion=10.0
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\out
OutputBaseFilename=Bench-setup-{#AppVersion}
SetupIconFile=..\bench-engine\bench.ico
UninstallDisplayIcon={app}\Bench.exe
UninstallDisplayName=Bench (beta)
LicenseFile=license.txt
WizardStyle=modern
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
CloseApplications=yes
ShowLanguageDialog=auto

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[InstallDelete]
; An update replaces the site completely, so no old page files are left behind.
Type: filesandordirs; Name: "{app}\web"

[Files]
Source: "..\stage\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autoprograms}\Bench"; Filename: "{app}\Bench.exe"; Comment: "Free tools for your files, on your computer"
Name: "{autodesktop}\Bench"; Filename: "{app}\Bench.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Bench.exe"; Description: "{cm:LaunchProgram,Bench}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Close Bench (and any FFmpeg job it started) before removing its files.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /T /IM Bench.exe"; Flags: runhidden; RunOnceId: "CloseBench"
