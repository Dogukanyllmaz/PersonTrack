using System.IO.Compression;
using System.Xml.Linq;

namespace PersonTrack.API.Helpers;

public static class ExcelHelper
{
    public static List<string[]> ReadXlsx(Stream stream, bool skipHeader = true)
    {
        var rows = new List<string[]>();
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

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
    /// Creates a styled xlsx file with headers and data rows.
    /// Headers get bold white text on a blue background.
    /// Data rows alternate between white and light blue.
    /// </summary>
    public static byte[] CreateXlsx(string[] headers, IEnumerable<string[]> rows,
        double[]? columnWidths = null)
    {
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            WriteEntry(archive, "[Content_Types].xml", ContentTypesXml());
            WriteEntry(archive, "_rels/.rels", RelsXml());
            WriteEntry(archive, "xl/_rels/workbook.xml.rels", WorkbookRelsXml());
            WriteEntry(archive, "xl/workbook.xml", WorkbookXml());
            WriteEntry(archive, "xl/styles.xml", StylesXml());

            var rowList = rows.ToList();

            // Build shared strings (all unique strings)
            var allStrings = new List<string>();
            allStrings.AddRange(headers);
            foreach (var row in rowList)
                allStrings.AddRange(row.Select(c => c ?? ""));

            WriteEntry(archive, "xl/sharedStrings.xml", BuildSharedStrings(allStrings));
            WriteEntry(archive, "xl/worksheets/sheet1.xml",
                BuildSheet(headers, rowList, allStrings, columnWidths));
        }

        return ms.ToArray();
    }

    // ── XML building ──────────────────────────────────────────────────────

    private static string ContentTypesXml() => @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Types xmlns=""http://schemas.openxmlformats.org/package/2006/content-types"">
  <Default Extension=""rels"" ContentType=""application/vnd.openxmlformats-package.relationships+xml""/>
  <Default Extension=""xml"" ContentType=""application/xml""/>
  <Override PartName=""/xl/workbook.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml""/>
  <Override PartName=""/xl/worksheets/sheet1.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml""/>
  <Override PartName=""/xl/sharedStrings.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml""/>
  <Override PartName=""/xl/styles.xml"" ContentType=""application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml""/>
</Types>";

    private static string RelsXml() => @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Relationships xmlns=""http://schemas.openxmlformats.org/package/2006/relationships"">
  <Relationship Id=""rId1"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"" Target=""xl/workbook.xml""/>
</Relationships>";

    private static string WorkbookRelsXml() => @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<Relationships xmlns=""http://schemas.openxmlformats.org/package/2006/relationships"">
  <Relationship Id=""rId1"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"" Target=""worksheets/sheet1.xml""/>
  <Relationship Id=""rId2"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings"" Target=""sharedStrings.xml""/>
  <Relationship Id=""rId3"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"" Target=""styles.xml""/>
</Relationships>";

    private static string WorkbookXml() => @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<workbook xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main"" xmlns:r=""http://schemas.openxmlformats.org/officeDocument/2006/relationships"">
  <sheets>
    <sheet name=""Sheet1"" sheetId=""1"" r:id=""rId1""/>
  </sheets>
</workbook>";

    /// <summary>
    /// Styles:
    ///   xf[0] = default
    ///   xf[1] = header  (bold, white text, blue fill, thin border)
    ///   xf[2] = data    (thin border, wrap text)
    ///   xf[3] = alt row (light blue fill, thin border, wrap text)
    /// </summary>
    private static string StylesXml() => @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<styleSheet xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main"">
  <fonts count=""2"">
    <font><sz val=""11""/><name val=""Calibri""/></font>
    <font><b/><sz val=""11""/><name val=""Calibri""/><color rgb=""FFFFFFFF""/></font>
  </fonts>
  <fills count=""4"">
    <fill><patternFill patternType=""none""/></fill>
    <fill><patternFill patternType=""gray125""/></fill>
    <fill><patternFill patternType=""solid""><fgColor rgb=""FF1E40AF""/><bgColor indexed=""64""/></patternFill></fill>
    <fill><patternFill patternType=""solid""><fgColor rgb=""FFE8EEFF""/><bgColor indexed=""64""/></patternFill></fill>
  </fills>
  <borders count=""2"">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style=""thin""><color rgb=""FFCBD5E1""/></left>
      <right style=""thin""><color rgb=""FFCBD5E1""/></right>
      <top style=""thin""><color rgb=""FFCBD5E1""/></top>
      <bottom style=""thin""><color rgb=""FFCBD5E1""/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count=""1"">
    <xf numFmtId=""0"" fontId=""0"" fillId=""0"" borderId=""0""/>
  </cellStyleXfs>
  <cellXfs count=""4"">
    <xf numFmtId=""0"" fontId=""0"" fillId=""0"" borderId=""0"" xfId=""0""/>
    <xf numFmtId=""0"" fontId=""1"" fillId=""2"" borderId=""1"" xfId=""0"" applyFont=""1"" applyFill=""1"" applyBorder=""1"" applyAlignment=""1"">
      <alignment vertical=""center"" wrapText=""1""/>
    </xf>
    <xf numFmtId=""0"" fontId=""0"" fillId=""0"" borderId=""1"" xfId=""0"" applyBorder=""1"" applyAlignment=""1"">
      <alignment vertical=""center"" wrapText=""1""/>
    </xf>
    <xf numFmtId=""0"" fontId=""0"" fillId=""3"" borderId=""1"" xfId=""0"" applyFill=""1"" applyBorder=""1"" applyAlignment=""1"">
      <alignment vertical=""center"" wrapText=""1""/>
    </xf>
  </cellXfs>
</styleSheet>";

    private static string BuildSharedStrings(List<string> strings)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append($@"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<sst xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main"" count=""{strings.Count}"" uniqueCount=""{strings.Count}"">");
        foreach (var s in strings)
            sb.Append($"<si><t xml:space=\"preserve\">{EscapeXml(s)}</t></si>");
        sb.Append("</sst>");
        return sb.ToString();
    }

    private static string BuildSheet(string[] headers, List<string[]> rows,
        List<string> allStrings, double[]? columnWidths)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append(@"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<worksheet xmlns=""http://schemas.openxmlformats.org/spreadsheetml/2006/main""><sheetViews>
  <sheetView tabSelected=""1"" workbookViewId=""0"">
    <pane ySplit=""1"" topLeftCell=""A2"" activePane=""bottomLeft"" state=""frozen""/>
  </sheetView>
</sheetViews>");

        // Column widths
        if (columnWidths != null && columnWidths.Length > 0)
        {
            sb.Append("<cols>");
            for (int i = 0; i < columnWidths.Length; i++)
                sb.Append($@"<col min=""{i + 1}"" max=""{i + 1}"" width=""{columnWidths[i]:F2}"" customWidth=""1""/>");
            sb.Append("</cols>");
        }

        sb.Append("<sheetData>");

        // Header row (style 1 = blue bold)
        sb.Append("<row r=\"1\" ht=\"20\" customHeight=\"1\">");
        for (int c = 0; c < headers.Length; c++)
        {
            var cellRef = ColName(c) + "1";
            var idx = allStrings.IndexOf(headers[c]);
            sb.Append($@"<c r=""{cellRef}"" t=""s"" s=""1""><v>{idx}</v></c>");
        }
        sb.Append("</row>");

        // Data rows
        int ssOffset = headers.Length;
        for (int r = 0; r < rows.Count; r++)
        {
            int rowNum = r + 2;
            int style = (r % 2 == 0) ? 2 : 3; // alternate white / light blue
            sb.Append($"<row r=\"{rowNum}\" ht=\"18\" customHeight=\"1\">");
            var row = rows[r];
            for (int c = 0; c < row.Length; c++)
            {
                var cellRef = ColName(c) + rowNum;
                var val = row[c] ?? "";
                var idx = allStrings.IndexOf(val, ssOffset);
                if (idx < 0) idx = allStrings.IndexOf(val);
                sb.Append($@"<c r=""{cellRef}"" t=""s"" s=""{style}""><v>{idx}</v></c>");
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
