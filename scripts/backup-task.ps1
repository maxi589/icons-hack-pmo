# Richtet die tägliche Windows-Aufgabe „hack-vienna Backup“ auf Maxis PC ein (einmal ausführen, ohne Admin-Rechte).
# Sie startet scripts/backup.mjs jeden Tag um 12:00 ohne sichtbares Fenster. War der PC aus, läuft sie, sobald er wieder an ist.
# Ergebnis des letzten Laufs: backup\_letzte-sicherung.txt im OneDrive-Projektordner.
# Aufruf im Repo:  powershell -ExecutionPolicy Bypass -File scripts\backup-task.ps1
# Entfernen:       Unregister-ScheduledTask -TaskName "hack-vienna Backup" -Confirm:$false

$repo = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless `"$node`" --env-file=.env.local scripts/backup.mjs" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At 12:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "hack-vienna Backup" -Description "Sichert alle Tabellen und Dateien von hack-vienna HQ in den OneDrive-Projektordner (scripts/backup.mjs)." -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Get-ScheduledTask -TaskName "hack-vienna Backup" | Select-Object TaskName, State
