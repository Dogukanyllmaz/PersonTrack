using System.IO.Compression;
using System.Xml.Linq;

namespace PersonTrack.API.Helpers;

public static class ExcelHelper
{
    /// <summary>
    /// Reads an xlsx file and returns rows as list of string arrays.
    /// First row is assumed to be headers and is skipped.
    /// </summary>
    public static List<string[]> ReadXlsx(Stream stream, bool skipHeader = true)
    {
        var rows = new List<string[]>();
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        // Read shared strings
        var sharedStrings = new List<string>();
        var ssEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (ssEntry != null)
        {
            using var ssStream = ssEntry.Open();
            var ssDoc = XDocument.Load(ssStream);
            XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
            foreach (var si in ssDoc.Descendants(ns + "si"))
            {
                var text = string.Concat(si.Descendants(ns + "t").Select(t => t.Value));
                sharedStrings.Add(text);
            }
        }

        // Read sheet1
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml");
        if (sheetEntry == null) return rows;

        using var sheetStream = sheetEntry.Open();
        var sheetDoc = XDocument.Load(sheetStream);
        XNamespace sn = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

        var sheetRows = sheetDoc.Descendants(sn + "row").ToList();
        bool isFirst = true;

        foreach (var row in sheetRows)
        {
            if (isFirst && skipHeader) { isFirst = false; continue; }
            isFirst = false;

            var cells = row.Elements(sn + "c").ToList();
            if (cells.Count == 0) continue;

            // Get max column index
            int maxCol = cells
                .Select(c => ColIndex(c.Attribute("r")?.Value ?? "A1"))
                .DefaultIfEmpty(0).Max();

            var rowData = new string[maxCol + 1];
            foreach (var cell in cells)
            {
                var cellRef = cell.Attribute("r")?.Value ?? "";
                int colIdx = ColIndex(cellRef);
                var type = cell.Attribute("t")?.Value;
                var value = cell.Element(sn + "v")?.Value ?? "";

                if (type == "s" && int.TryParse(value, out int ssIdx))
                    value = ssIdx < sharedStrings.Count ? sharedStrings[ssIdx] : value;

                if (colIdx < rowData.Length)
                    rowData[colIdx] = value;
            }

            rows.Add(rowData);
        }

        return rows;
    }

    private static int ColIndex(string cellRef)
    {
        int col = 0;
        foreach (char c in cellRef)
        {
            if (!char.IsLetter(c)) break;
            col = col * 26 + (char.ToUpper(c) - 'A' + 1);
        }
        return col - 1;
    }

    /// <summary>
    /// Creates a simple xlsx file with headers and rows.
    /// </summary>
    public static byte[] CreateXlsx(string[] headers, IEnumerable<string[]> rows)
    {
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            // [Content_Types].xml
            WriteEntry(archive, "[Content_Types].xml", @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Types xmlns=""http://schemas.openxmlformats.org/package/2006/content-types"">
  <Default Extension=""rels"" ContentType=""application/vnd.openxmlformats-package.relationships+xml""/>
  <Default Extension=""xml"" ContentType=""application/xml""/>
  <Override PartName=""/xl/workbook.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml""/>
  <Override PartName=""/xl/worksheets/sheet1.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml""/>
  <Override PartName=""/xl/sharedStrings.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml""/>
</Types>");

            // _rels/.rels
            WriteEntry(archive, "_rels/.rels", @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Relationships xmlns=""http://schemas.openxmlformats.org/package/2006/relationships"">
  <Relationship Id=""rId1"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"" Target=""xl/workbook.xml""/>
</Relationships>");

            // xl/_rels/workbook.xml.rels
            WriteEntry(archive, "xl/_rels/workbook.xml.rels", @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Relationships xmlns=""http://schemas.openxmlformats.org/package/2006/relationships"">
  <Relationship Id=""rId1"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"" Target=""worksheets/sheet1.xml""/>
  <Relationship Id=""rId2"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings"" Target=""sharedStrings.xml""/>
</Relationships>");

            // xl/workbook.xml
            WriteEntry(archive, "xl/workbook.xml", @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<workbook xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"">
  <sheets>
    <sheet name=""Sheet1"" sheetId=""1"" r:id=""rId1""/>
  </sheets>
</workbook>");

            // Build shared strings
            var strings = new List<string>();
            var rowList = rows.ToList();

            strings.AddRange(headers);
            foreach (var row in rowList)
                strings.AddRange(row.Select(c => c ?? ""));

            var ssXml = BuildSharedStrings(strings);
            WriteEntry(archive, "xl/sharedStrings.xml", ssXml);

            // xl/worksheets/sheet1.xml
            var sheetXml = BuildSheet(headers, rowList);
            WriteEntry(archive, "xl/worksheets/sheet1.xml", sheetXml);
        }

        return ms.ToArray();
    }

    private static string BuildSharedStrings(List<string> strings)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append($@"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<sst xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main"" count=""{strings.Count}"" uniqueCount=""{strings.Count}"">");
        foreach (var s in strings)
            sb.Append($"<si><t>{EscapeXml(s)}</t></si>");
        sb.Append("</sst>");
        return sb.ToString();
    }

    private static string BuildSheet(string[] headers, List<string[]> rows)
    {
        var strings = new List<string>();
        strings.AddRange(headers);
        foreach (var row in rows) strings.AddRange(row.Select(c => c ?? ""));

        var strIndex = new Dictionary<string, int>();
        for (int i = 0; i < strings.Count; i++)
            if (!strIndex.ContainsKey(strings[i]))
                strIndex[strings[i]] = i;

        var sb = new System.Text.StringBuilder();
        sb.Append(@"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<worksheet xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main""><sheetData>");

        // Header row
        sb.Append("<row r=\"1\">");
        for (int c = 0; c < headers.Length; c++)
        {
            var cellRef = ColName(c) + "1";
            var idx = strings.IndexOf(headers[c]);
            sb.Append($@"<c r=""{cellRef}"" t=""s""><v>{idx}</v></c>");
        }
        sb.Append("</row>");

        int ssOffset = headers.Length;
        for (int r = 0; r < rows.Count; r++)
        {
            sb.Append($"<row r=\"{r + 2}\">");
            var row = rows[r];
            for (int c = 0; c < row.Length; c++)
            {
                var cellRef = ColName(c) + (r + 2);
                var val = row[c] ?? "";
                var idx = strings.IndexOf(val, ssOffset);
                if (idx < 0) idx = strings.IndexOf(val);
                sb.Append($@"<c r=""{cellRef}"" t=""s""><v>{idx}</v></c>");
            }
            sb.Append("</row>");
            ssOffset += row.Length;
        }

        sb.Append("</sheetData></worksheet>");
        return sb.ToString();
    }

    private static string ColName(int index)
    {
        string name = "";
        index++;
        while (index > 0)
        {
            name = (char)('A' + (index - 1) % 26) + name;
            index = (index - 1) / 26;
        }
        return name;
    }

    private static void WriteEntry(ZipArchive archive, string name, string content)
    {
        var entry = archive.CreateEntry(name);
        using var writer = new StreamWriter(entry.Open(), System.Text.Encoding.UTF8);
        writer.Write(content);
    }

    private static string EscapeXml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
         .Replace("\"", "&quot;").Replace("'", "&apos;");
}
