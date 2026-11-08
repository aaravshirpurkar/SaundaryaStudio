$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*SaundaryaStudio*next*' }
foreach ($p in $procs) {
  Write-Output ("Killing {0}: {1}" -f $p.ProcessId, $p.CommandLine)
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
if (-not $procs) { Write-Output "No project node processes found" }