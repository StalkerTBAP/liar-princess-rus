# Render glyph coverage cells: each char -> cellW*cellH bytes (0..255), ink centered at centerX, baseline at baseY
param([string]$out,[string]$font,[string]$style='Regular',[double]$size,[double]$scaleX=1,[int]$cellW,[int]$cellH,[double]$centerX,[double]$baseY,[string]$charsFile,[double]$bold=0,[double]$maxW=999,[double]$shear=0)
Add-Type -AssemblyName System.Drawing
$chars=[System.IO.File]::ReadAllText($charsFile,[System.Text.Encoding]::UTF8)
$fam=New-Object System.Drawing.FontFamily($font)
$st=[System.Drawing.FontStyle]$style
$asc=$size*$fam.GetCellAscent($st)/$fam.GetEmHeight($st)
$fmt=[System.Drawing.StringFormat]::GenericTypographic
$ms=New-Object System.IO.MemoryStream
$bmp=New-Object System.Drawing.Bitmap $cellW,$cellH,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[System.Drawing.Graphics]::FromImage($bmp);$g.SmoothingMode='AntiAlias';$g.PixelOffsetMode='HighQuality'
foreach($ch in $chars.ToCharArray()){
 $p=New-Object System.Drawing.Drawing2D.GraphicsPath
 $p.AddString([string]$ch,$fam,[int]$st,[single]$size,(New-Object System.Drawing.PointF(0,0)),$fmt)
 $m=New-Object System.Drawing.Drawing2D.Matrix;$m.Scale([single]$scaleX,1);if($shear -ne 0){$m.Shear([single](-$shear),0,[System.Drawing.Drawing2D.MatrixOrder]::Append)};$p.Transform($m)
 $b=$p.GetBounds();if($b.Width -gt $maxW){$m3=New-Object System.Drawing.Drawing2D.Matrix;$m3.Scale([single]($maxW/$b.Width),1);$p.Transform($m3);$b=$p.GetBounds()};$dx=$centerX-($b.X+$b.Width/2);$dy=$baseY-$asc
 $m2=New-Object System.Drawing.Drawing2D.Matrix;$m2.Translate([single]$dx,[single]$dy);$p.Transform($m2)
 $g.Clear([System.Drawing.Color]::Transparent);$g.FillPath([System.Drawing.Brushes]::White,$p)
 if($bold -gt 0){$pen=New-Object System.Drawing.Pen([System.Drawing.Color]::White,[single]$bold);$pen.LineJoin='Round';$g.DrawPath($pen,$p)}
 $r=New-Object System.Drawing.Rectangle 0,0,$cellW,$cellH
 $d=$bmp.LockBits($r,'ReadOnly',$bmp.PixelFormat);$buf=New-Object byte[] ($cellW*$cellH*4)
 [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0,$buf,0,$buf.Length);$bmp.UnlockBits($d)
 $a=New-Object byte[] ($cellW*$cellH);for($i=0;$i -lt $a.Length;$i++){$a[$i]=$buf[$i*4+3]}
 $ms.Write($a,0,$a.Length)}
[System.IO.File]::WriteAllBytes($out,$ms.ToArray())
