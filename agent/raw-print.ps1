<#
    Envia bytes crus (ESC/POS) direto para a impressora, pelo spooler do
    Windows.

    Por que assim, e não pelo compartilhamento (\\localhost\NOME):
      - compartilhar depende de permissão de rede, e o Windows costuma
        responder "Acesso negado" mesmo para o próprio usuário local
      - imprimir pelo caminho comum (Word, `print`) renderiza o texto e
        descarta os comandos ESC/POS, perdendo o corte de papel e a acentuação

    Aqui falamos com winspool.drv usando o tipo de dados RAW, que entrega os
    bytes à impressora exatamente como estão.

    Uso:
      powershell -ExecutionPolicy Bypass -File raw-print.ps1 -Printer "ELGIN i9(USB)" -File cupom.bin
#>

param(
    [Parameter(Mandatory = $true)][string]$Printer,
    [Parameter(Mandatory = $true)][string]$File
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $File)) {
    Write-Error "Arquivo nao encontrado: $File"
    exit 1
}

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFO
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static void Send(string printerName, byte[] bytes)
    {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            throw new Exception("Nao foi possivel abrir a impressora '" + printerName +
                "'. Erro do Windows: " + Marshal.GetLastWin32Error());
        }

        try
        {
            DOCINFO di = new DOCINFO();
            di.pDocName = "Cupom Acougue Online";
            // RAW faz o spooler entregar os bytes sem interpretar nada
            di.pDataType = "RAW";

            if (!StartDocPrinter(hPrinter, 1, ref di))
                throw new Exception("StartDocPrinter falhou: " + Marshal.GetLastWin32Error());

            try
            {
                if (!StartPagePrinter(hPrinter))
                    throw new Exception("StartPagePrinter falhou: " + Marshal.GetLastWin32Error());

                IntPtr buffer = Marshal.AllocCoTaskMem(bytes.Length);
                try
                {
                    Marshal.Copy(bytes, 0, buffer, bytes.Length);
                    int escritos;
                    if (!WritePrinter(hPrinter, buffer, bytes.Length, out escritos))
                        throw new Exception("WritePrinter falhou: " + Marshal.GetLastWin32Error());
                    if (escritos != bytes.Length)
                        throw new Exception("Enviados " + escritos + " de " + bytes.Length + " bytes");
                }
                finally { Marshal.FreeCoTaskMem(buffer); }

                EndPagePrinter(hPrinter);
            }
            finally { EndDocPrinter(hPrinter); }
        }
        finally { ClosePrinter(hPrinter); }
    }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($File)

try {
    [RawPrinter]::Send($Printer, $bytes)
    Write-Output "OK - $($bytes.Length) bytes enviados para '$Printer'"
}
catch {
    # O PowerShell embrulha a excecao em varias linhas ("Excecao ao chamar
    # Send com 2 argumentos...", posicao no script, CategoryInfo). Quem
    # precisa aparecer para quem esta instalando e so o motivo.
    $motivo = $_.Exception.InnerException
    if ($null -eq $motivo) { $motivo = $_.Exception }

    [Console]::Error.WriteLine($motivo.Message)
    exit 1
}
