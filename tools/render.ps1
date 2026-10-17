param([string]$out,[string]$fonts,[string]$text,[int]$size=40)
Add-Type -AssemblyName System.Drawing
$list=$fonts.Split('|');$bmp=New-Object System.Drawing.Bitmap 1900,($list.Count*70)
$g=[System.Drawing.Graphics]::FromImage($bmp);$g.Clear([System.Drawing.Color]::Black);$g.TextRenderingHint='AntiAliasGridFit'
$y=0;foreach($f in $list){$fn=New-Object System.Drawing.Font($f,$size,[System.Drawing.FontStyle]::Italic,[System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("$text  [$f]",$fn,[System.Drawing.Brushes]::White,4,$y);$y+=70}
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
