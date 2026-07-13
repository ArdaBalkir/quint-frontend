Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("c:\Users\ardab\Documents\Projects\Online QUINT\quint-vite\src\assets\Rat-White-Walk.png")
Write-Output ("{0}x{1}" -f $img.Width, $img.Height)
