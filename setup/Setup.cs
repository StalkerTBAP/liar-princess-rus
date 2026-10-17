// Установщик русификатора The Liar Princess and the Blind Prince (Steam).
// Собирается build-setup.js через csc.exe из .NET Framework 4 (C# 5), без зависимостей.
// Логика та же, что в install.ps1: изменённые файлы дописываются в конец data.dat,
// оглавление архива переписывается, в exe меняются 4 места. Формат data.dat.rus_backup совместим.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using Microsoft.Win32;

static partial class Rus
{
    const string ExeName = "PrincessAndPrince.exe";
    const string AppId = "3901910";
    const string Title = "Русификатор The Liar Princess and the Blind Prince";

    [STAThread]
    static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        // После повышения прав установщик перезапускается с --install/--uninstall <папка>
        if (args.Length >= 2 && (args[0] == "--install" || args[0] == "--uninstall"))
        {
            if (args.Length == 3 && args[2] == "--quiet")   // для проверок: без окон, результат в коде выхода
            {
                try { Run(args[0] == "--install", args[1]); return 0; }
                catch (UserError) { return 2; }
                catch { return 1; }
            }
            bool ok = RunWithMessages(args[0] == "--install", args[1], false);
            return ok ? 0 : 1;
        }
        Application.Run(new MainForm());
        return 0;
    }

    // ---------- поиск игры ----------

    public static bool IsGameDir(string d)
    {
        return !string.IsNullOrEmpty(d) && File.Exists(Path.Combine(d, ExeName)) && File.Exists(Path.Combine(d, "data.dat"));
    }

    public static string FindGame()
    {
        string self = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        if (IsGameDir(self)) return self;
        string parent = Path.GetDirectoryName(self);
        if (IsGameDir(parent)) return parent;

        var roots = new List<string>();
        AddReg(roots, Registry.CurrentUser, @"Software\Valve\Steam", "SteamPath");
        AddReg(roots, Registry.LocalMachine, @"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath");
        AddReg(roots, Registry.LocalMachine, @"SOFTWARE\Valve\Steam", "InstallPath");
        roots.Add(@"C:\Program Files (x86)\Steam");
        return FindInSteam(roots);
    }

    // Ищет игру в библиотеках Steam: корни Steam + пути из libraryfolders.vdf
    public static string FindInSteam(List<string> roots)
    {
        var libs = new List<string>();
        foreach (string r in roots)
        {
            AddUnique(libs, r);
            string vdf = Path.Combine(r, @"steamapps\libraryfolders.vdf");
            if (!File.Exists(vdf)) continue;
            try
            {
                foreach (Match m in Regex.Matches(File.ReadAllText(vdf), "\"path\"\\s+\"([^\"]+)\""))
                    AddUnique(libs, m.Groups[1].Value.Replace(@"\\", @"\"));
            }
            catch { }
        }
        foreach (string lib in libs)
        {
            string apps = Path.Combine(lib, "steamapps");
            string acf = Path.Combine(apps, "appmanifest_" + AppId + ".acf");
            try
            {
                if (File.Exists(acf))
                {
                    Match m = Regex.Match(File.ReadAllText(acf), "\"installdir\"\\s+\"([^\"]+)\"");
                    if (m.Success)
                    {
                        string d = Path.Combine(apps, "common", m.Groups[1].Value);
                        if (IsGameDir(d)) return d;
                    }
                }
                string common = Path.Combine(apps, "common");
                if (Directory.Exists(common))
                    foreach (string d in Directory.GetDirectories(common))
                        if (IsGameDir(d)) return d;
            }
            catch { }
        }
        return null;
    }

    static void AddReg(List<string> list, RegistryKey hive, string key, string value)
    {
        try
        {
            using (RegistryKey k = hive.OpenSubKey(key))
                if (k != null && k.GetValue(value) is string) AddUnique(list, ((string)k.GetValue(value)).Replace('/', '\\'));
        }
        catch { }
    }

    static void AddUnique(List<string> list, string p)
    {
        if (string.IsNullOrEmpty(p)) return;
        foreach (string x in list) if (string.Equals(x.TrimEnd('\\'), p.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)) return;
        list.Add(p);
    }

    // ---------- установка ----------

    public class UserError : Exception { public UserError(string m) : base(m) { } }

    static byte[] Hex(string h)
    {
        var b = new byte[h.Length / 2];
        for (int i = 0; i < b.Length; i++) b[i] = Convert.ToByte(h.Substring(i * 2, 2), 16);
        return b;
    }

    static bool Same(byte[] a, int off, byte[] b)
    {
        if (off + b.Length > a.Length) return false;
        for (int i = 0; i < b.Length; i++) if (a[off + i] != b[i]) return false;
        return true;
    }

    // Патч exe: символы из 1–2 байт UTF-8 (кириллица) рисуются полуширинными, как латиница
    static void PatchExe(string exe, bool revert, bool dryRun)
    {
        byte[] bytes = File.ReadAllBytes(exe);
        bool changed = false;
        for (int i = 0; i < PatchOff.Length; i++)
        {
            byte[] from = Hex(revert ? PatchNew[i] : PatchOrig[i]), to = Hex(revert ? PatchOrig[i] : PatchNew[i]);
            int off = (int)PatchOff[i];
            if (Same(bytes, off, to)) continue;
            if (!Same(bytes, off, from))
                throw new UserError("Эта версия игры не поддерживается — похоже, игра обновилась.\n\nСкачайте свежую версию русификатора:\n" + Url);
            Array.Copy(to, 0, bytes, off, to.Length);
            changed = true;
        }
        if (changed && !dryRun) File.WriteAllBytes(exe, bytes);
    }

    static byte[] ReadBytes(FileStream fs, long off, int len)
    {
        var b = new byte[len];
        fs.Position = off;
        int r = 0;
        while (r < len)
        {
            int n = fs.Read(b, r, len - r);
            if (n <= 0) throw new IOException("Ошибка чтения data.dat");
            r += n;
        }
        return b;
    }

    static long Align(long v) { return (v + 511) / 512 * 512; }

    public static string Run(bool install, string dir)
    {
        if (!IsGameDir(dir)) throw new UserError("В этой папке нет игры (нужны " + ExeName + " и data.dat).");
        if (Process.GetProcessesByName("PrincessAndPrince").Length > 0) throw new UserError("Закройте игру и попробуйте ещё раз.");
        string exe = Path.Combine(dir, ExeName), dat = Path.Combine(dir, "data.dat"), backup = dat + ".rus_backup";
        if (install) PatchExe(exe, false, true);   // проверка версии до любых изменений

        using (var fs = new FileStream(dat, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            byte[] hdr = ReadBytes(fs, 0, 0x28);
            if (Encoding.ASCII.GetString(hdr, 0, 8) != "FAFULLFS") throw new UserError("data.dat: неизвестный формат.");
            // откат прошлой установки
            if (File.Exists(backup))
            {
                byte[] bk = File.ReadAllBytes(backup);
                fs.Position = 0; fs.Write(bk, 0, 0x28); fs.SetLength(BitConverter.ToInt64(bk, 0x28)); fs.Flush();
                File.Delete(backup);
                hdr = ReadBytes(fs, 0, 0x28);
            }
            if (!install)
            {
                PatchExe(exe, true, false);
                return "Русификатор удалён, игра возвращена в исходное состояние.";
            }

            long origLen = fs.Length;
            var bk2 = new byte[0x30];
            Array.Copy(hdr, bk2, 0x28);
            Array.Copy(BitConverter.GetBytes(origLen), 0, bk2, 0x28, 8);
            File.WriteAllBytes(backup, bk2);

            uint count = BitConverter.ToUInt32(hdr, 8);
            long nameOff = BitConverter.ToInt64(hdr, 0x10), entOff = BitConverter.ToInt64(hdr, 0x20);
            int nameSize = (int)BitConverter.ToInt64(hdr, 0x18);
            byte[] names = ReadBytes(fs, nameOff, nameSize);
            byte[] ents = ReadBytes(fs, entOff, (int)count * 48);
            var index = new Dictionary<string, int>();
            for (int i = 0; i < count; i++)
            {
                int no = (int)BitConverter.ToInt64(ents, i * 48 + 8), e = no;
                while (names[e] != 0) e++;
                index[Encoding.ASCII.GetString(names, no, e - no)] = i;
            }

            Assembly asm = Assembly.GetExecutingAssembly();
            long pos = origLen;
            int n = 0;
            foreach (string res in asm.GetManifestResourceNames())
            {
                if (!res.StartsWith("files/")) continue;
                string rel = res.Substring(6);
                int i;
                if (!index.TryGetValue(rel, out i)) throw new UserError("В архиве игры нет файла " + rel + ".");
                byte[] data;
                using (Stream s = asm.GetManifestResourceStream(res)) { data = new byte[s.Length]; s.Read(data, 0, data.Length); }
                pos = Align(pos);
                fs.Position = pos; fs.Write(data, 0, data.Length);
                Array.Copy(BitConverter.GetBytes((long)data.Length), 0, ents, i * 48 + 24, 8);
                Array.Copy(BitConverter.GetBytes(pos), 0, ents, i * 48 + 32, 8);
                pos += data.Length; n++;
            }
            long newEnt = Align(pos);
            fs.Position = newEnt; fs.Write(ents, 0, ents.Length);
            long newName = newEnt + ents.Length;
            fs.Write(names, 0, names.Length);
            Array.Copy(BitConverter.GetBytes(newName), 0, hdr, 0x10, 8);
            Array.Copy(BitConverter.GetBytes(newEnt), 0, hdr, 0x20, 8);
            fs.Position = 0; fs.Write(hdr, 0, 0x28); fs.Flush();
        }
        PatchExe(exe, false, false);
        return "Готово! Русификатор установлен.\n\n" +
               "Если игра запускается не на английском: Steam → правой кнопкой по игре → Свойства → Язык → English.\n\n" +
               "После обновления игры Steam может откатить перевод — тогда просто запустите установщик ещё раз.";
    }

    // Возвращает true при успехе. В GUI при нехватке прав предлагает перезапуск от администратора.
    public static bool RunWithMessages(bool install, string dir, bool canElevate)
    {
        try
        {
            MessageBox.Show(Run(install, dir), Title, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return true;
        }
        catch (UserError e)
        {
            MessageBox.Show(e.Message, Title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (UnauthorizedAccessException)
        {
            if (canElevate && Elevate(install, dir)) return true;
            MessageBox.Show("Нет доступа к файлам игры. Запустите установщик от имени администратора.", Title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (IOException e)
        {
            MessageBox.Show("Не удалось открыть файлы игры (игра или Steam их используют?).\n\n" + e.Message, Title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (Exception e)
        {
            MessageBox.Show("Ошибка: " + e.Message, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        return false;
    }

    static bool Elevate(bool install, string dir)
    {
        try
        {
            var psi = new ProcessStartInfo(Assembly.GetExecutingAssembly().Location,
                (install ? "--install" : "--uninstall") + " \"" + dir.TrimEnd('\\') + "\"");
            psi.Verb = "runas";
            psi.UseShellExecute = true;
            Process p = Process.Start(psi);
            p.WaitForExit();
            return p.ExitCode == 0;
        }
        catch { return false; }   // пользователь отказал в UAC
    }
}

class MainForm : Form
{
    TextBox path;
    Label status;
    Button install, uninstall;

    public MainForm()
    {
        Text = "Русификатор — The Liar Princess and the Blind Prince";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 9.5f);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(560, 250);
        try { Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location); } catch { }

        var head = new Label { Text = "Русификатор The Liar Princess and the Blind Prince", Font = new Font("Segoe UI", 12f, FontStyle.Bold), Location = new Point(16, 14), AutoSize = true };
        var ver = new Label { Text = "Версия " + Rus.Version + " · для Steam-версии игры", ForeColor = SystemColors.GrayText, Location = new Point(18, 42), AutoSize = true };
        var lbl = new Label { Text = "Папка игры:", Location = new Point(16, 78), AutoSize = true };
        path = new TextBox { Location = new Point(16, 100), Width = 430 };
        var browse = new Button { Text = "Обзор…", Location = new Point(454, 98), Width = 90, Height = 28 };
        status = new Label { Location = new Point(16, 134), Size = new Size(528, 40) };
        install = new Button { Text = "Установить", Location = new Point(16, 190), Size = new Size(200, 40), Font = new Font("Segoe UI", 10.5f, FontStyle.Bold) };
        uninstall = new Button { Text = "Удалить", Location = new Point(226, 190), Size = new Size(120, 40) };
        var link = new LinkLabel { Text = "Страница проекта", Location = new Point(420, 202), AutoSize = true };

        browse.Click += delegate
        {
            using (var dlg = new FolderBrowserDialog { Description = "Выберите папку игры (где лежит PrincessAndPrince.exe)" })
                if (dlg.ShowDialog(this) == DialogResult.OK) path.Text = dlg.SelectedPath;
        };
        path.TextChanged += delegate { UpdateStatus(); };
        install.Click += delegate { Act(true); };
        uninstall.Click += delegate { Act(false); };
        link.LinkClicked += delegate { try { Process.Start(Rus.Url); } catch { } };

        Controls.AddRange(new Control[] { head, ver, lbl, path, browse, status, install, uninstall, link });
        AcceptButton = install;

        string found = Rus.FindGame();
        path.Text = found ?? "";
        UpdateStatus();
        ActiveControl = install.Enabled ? (Control)install : browse;
    }

    void UpdateStatus()
    {
        string d = path.Text.Trim();
        bool ok = Rus.IsGameDir(d);
        install.Enabled = uninstall.Enabled = ok;
        if (ok)
        {
            bool installed = File.Exists(Path.Combine(d, "data.dat.rus_backup"));
            status.ForeColor = Color.ForestGreen;
            status.Text = installed ? "Игра найдена. Русификатор уже установлен — можно переустановить или удалить."
                                    : "Игра найдена. Нажмите «Установить».";
        }
        else
        {
            status.ForeColor = Color.Firebrick;
            status.Text = d.Length == 0 ? "Игра не найдена автоматически. Нажмите «Обзор…» и выберите папку игры\n(Steam → правой кнопкой по игре → Управление → Просмотреть локальные файлы)."
                                        : "В этой папке нет PrincessAndPrince.exe и data.dat.";
        }
    }

    void Act(bool inst)
    {
        UseWaitCursor = true; install.Enabled = uninstall.Enabled = false;
        Application.DoEvents();
        try { Rus.RunWithMessages(inst, path.Text.Trim(), true); }
        finally { UseWaitCursor = false; UpdateStatus(); }
    }
}
