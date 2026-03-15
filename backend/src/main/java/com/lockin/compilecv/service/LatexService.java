package com.lockin.compilecv.service;

import com.lockin.compilecv.model.resume.*;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.util.concurrent.TimeUnit;

@Service
public class LatexService {

    public byte[] generatePdf(ResumeData data) throws IOException, InterruptedException {
        String latexContent = buildLatex(data);

        File tempDir = Files.createTempDirectory("resume_gen").toFile();
        File texFile = new File(tempDir, "resume.tex");
        try (PrintWriter out = new PrintWriter(texFile)) {
            out.println(latexContent);
        }

        ProcessBuilder pb = new ProcessBuilder("tectonic", "resume.tex");
        pb.directory(tempDir);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println("[Tectonic] " + line);
        }

        boolean finished = process.waitFor(60, TimeUnit.SECONDS);
        if (!finished || process.exitValue() != 0) {
            throw new RuntimeException("Latex compilation failed");
        }

        File pdfFile = new File(tempDir, "resume.pdf");
        if (!pdfFile.exists()) {
            throw new RuntimeException("PDF file not generated");
        }
        return Files.readAllBytes(pdfFile.toPath());
    }

    private String buildLatex(ResumeData data) {
        StringBuilder sb = new StringBuilder();

        // ── Preamble ──────────────────────────────────────────────────────────────
        sb.append("\\documentclass[letterpaper,10pt]{article}\n");
        sb.append("\\usepackage{latexsym}\n");
        sb.append("\\usepackage[empty]{fullpage}\n");
        sb.append("\\usepackage{titlesec}\n");
        sb.append("\\usepackage{marvosym}\n");
        sb.append("\\usepackage[usenames,dvipsnames]{color}\n");
        sb.append("\\usepackage{verbatim}\n");
        sb.append("\\usepackage{enumitem}\n");
        sb.append("\\usepackage[colorlinks=true, urlcolor=blue, linkcolor=red]{hyperref}\n");
        sb.append("\\usepackage{fancyhdr}\n");
        sb.append("\\usepackage{babel}\n");
        sb.append("\\usepackage{tabularx}\n");
        sb.append("\\usepackage{fontawesome5}\n");
        sb.append("\\usepackage{multicol}\n");
        sb.append("\\setlength{\\multicolsep}{-3.0pt}\n");
        sb.append("\\setlength{\\columnsep}{-1pt}\n");
        // itemsep=2pt gives a little air between individual bullet lines
        sb.append("\\setlist[itemize]{nosep, topsep=3pt, partopsep=0pt, parsep=0pt, itemsep=2pt}\n");

        // ── Margins ───────────────────────────────────────────────────────────────
        sb.append("\\addtolength{\\oddsidemargin}{-0.6in}\n");
        sb.append("\\addtolength{\\evensidemargin}{-0.5in}\n");
        sb.append("\\addtolength{\\textwidth}{1.19in}\n");
        sb.append("\\addtolength{\\topmargin}{-.7in}\n");
        sb.append("\\addtolength{\\textheight}{1.4in}\n");
        sb.append("\\urlstyle{same}\n");
        sb.append("\\raggedbottom\n");
        sb.append("\\raggedright\n");
        sb.append("\\setlength{\\tabcolsep}{0in}\n");

        // KEY FIX: positive vspace(2pt) inside titleformat means LaTeX adds 2pt
        // of space ABOVE the section rule instead of eating into the previous block.
        sb.append("\\titleformat{\\section}{\\vspace{2pt}\\scshape\\raggedright\\normalsize\\selectfont}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]\n");

        // ── Custom commands ───────────────────────────────────────────────────────
        sb.append("\\newcommand{\\resumeItem}[1]{\\item\\small{#1}}\n");
        sb.append("\\newcommand{\\resumeSubheading}[4]{\n");
        sb.append("  \\vspace{-1pt}\\item\n");
        sb.append("  \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\n");
        sb.append("    \\textbf{#1} & \\textbf{\\small #2} \\\\[0pt]\n");
        sb.append("    \\textit{\\small#3} & \\textit{\\small #4} \\\\\n");
        sb.append("  \\end{tabular*}\\vspace{-4pt}}\n");
        sb.append("\\newcommand{\\resumeProjectHeading}[2]{\n");
        sb.append("  \\vspace{-1pt}\\item\n");
        sb.append("  \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}\n");
        sb.append("    \\small#1 & \\textbf{\\small #2}\\\\\n");
        sb.append("  \\end{tabular*}\\vspace{-4pt}}\n");
        sb.append("\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}\n");
        sb.append("\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}\n");
        sb.append("\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.2in]}\n");
        // vspace{2pt} after each bullet list = breathing room before next entry heading
        sb.append("\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{2pt}}\n");

        sb.append("\\begin{document}\n");

        // ── Personal Info ─────────────────────────────────────────────────────────
        ResumeData.PersonalInfo info = data.getPersonalInfo();
        if (info != null) {
            sb.append("\\begin{center}\n");
            sb.append("    {\\huge \\scshape ").append(escape(info.getName())).append("} \\\\ \\vspace{2pt}\n");
            sb.append("    \\small \\raisebox{-0.1\\height}\\faPhone\\ ").append(escape(info.getPhone())).append(" ~\n");
            sb.append("    \\href{mailto:").append(info.getEmail())
                    .append("}{\\raisebox{-0.2\\height}\\faEnvelope\\  \\underline{")
                    .append(escape(info.getEmail())).append("}} ~\n");
            if (info.getLinkedin() != null && !info.getLinkedin().isEmpty()) {
                sb.append("    \\href{").append(info.getLinkedin())
                        .append("}{\\raisebox{-0.2\\height}\\faLinkedin\\ \\underline{linkedin}} ~\n");
            }
            if (info.getPortfolio() != null && !info.getPortfolio().isEmpty()) {
                sb.append("    \\href{").append(info.getPortfolio())
                        .append("}{\\raisebox{-0.2\\height}\\Mundus\\ \\underline{portfolio}}\n");
            }
            sb.append("\\end{center}\n");
            sb.append("\\vspace{-8pt}\n");
        }

        // ── Education ─────────────────────────────────────────────────────────────
        if (data.getEducation() != null && !data.getEducation().isEmpty()) {
            sb.append("\\section{EDUCATION}\n");
            sb.append("\\resumeSubHeadingListStart\n");
            for (ResumeData.Education edu : data.getEducation()) {
                sb.append("  \\resumeSubheading\n");
                sb.append("    {").append(escape(edu.getSchool())).append("}{").append(escape(edu.getDate())).append("}\n");
                sb.append("    {").append(escape(edu.getDegree())).append("}{").append(escape(edu.getGpa())).append("}\n");
            }
            sb.append("\\resumeSubHeadingListEnd\n");
            // Positive gap → section titles never collide with the block above
            sb.append("\\vspace{6pt}\n");
        }

        // ── Skills ────────────────────────────────────────────────────────────────
        if (data.getSkills() != null) {
            sb.append("\\section{SKILLS}\n");
            sb.append("\\begin{itemize}[leftmargin=0.15in, label={}]\n");
            sb.append("\\small{\\item{\n");
            if (data.getSkills().getLanguages() != null)
                sb.append("\\textbf{Languages}{: ").append(escape(data.getSkills().getLanguages())).append("} \\\\\n");
            if (data.getSkills().getFrameworks() != null)
                sb.append("\\textbf{Frameworks}{: ").append(escape(data.getSkills().getFrameworks())).append("} \\\\\n");
            if (data.getSkills().getTools() != null)
                sb.append("\\textbf{Tools}{: ").append(escape(data.getSkills().getTools())).append("}\n");
            sb.append("}}\n");
            sb.append("\\end{itemize}\n");
            sb.append("\\vspace{4pt}\n");
        }

        // ── Experience ────────────────────────────────────────────────────────────
        if (data.getExperience() != null && !data.getExperience().isEmpty()) {
            sb.append("\\section{INDUSTRIAL EXPERIENCE}\n");
            sb.append("\\resumeSubHeadingListStart\n");
            for (int i = 0; i < data.getExperience().size(); i++) {
                ResumeData.Experience exp = data.getExperience().get(i);
                sb.append("  \\resumeSubheading\n");
                sb.append("    {").append(escape(exp.getTitle())).append(" -- ").append(escape(exp.getCompany()))
                        .append("}{").append(escape(exp.getDate())).append("}\n");
                sb.append("    {").append(escape(exp.getSummary())).append("}{").append(escape(exp.getLocation())).append("}\n");
                sb.append("    \\resumeItemListStart\n");
                if (exp.getBulletPoints() != null) {
                    for (ResumeData.BulletPoint bp : exp.getBulletPoints()) {
                        String text = bp.isAccepted() ? bp.getImproved() : bp.getOriginal();
                        sb.append("      \\resumeItem{").append(escape(text)).append("}\n");
                    }
                }
                sb.append("    \\resumeItemListEnd\n");
                if (i < data.getExperience().size() - 1) {
                    sb.append("    \\vspace{4pt}\n");
                }
            }
            sb.append("\\resumeSubHeadingListEnd\n");
            sb.append("\\vspace{6pt}\n");
        }

        // ── Projects ──────────────────────────────────────────────────────────────
        if (data.getProjects() != null && !data.getProjects().isEmpty()) {
            sb.append("\\section{PROJECTS}\n");
            sb.append("\\resumeSubHeadingListStart\n");
            for (int i = 0; i < data.getProjects().size(); i++) {
                ResumeData.Project proj = data.getProjects().get(i);

                boolean hasExtraInfo = (proj.getSummary() != null && !proj.getSummary().isEmpty()) ||
                        (proj.getLocation() != null && !proj.getLocation().isEmpty());

                if (hasExtraInfo) {
                    sb.append("  \\resumeSubheading\n");
                    sb.append("    {\\textbf{").append(escape(proj.getTitle())).append("}}{")
                            .append(escape(proj.getDate())).append("}\n");
                    sb.append("    {").append(escape(proj.getSummary())).append("}{")
                            .append(escape(proj.getLocation())).append("}\n");
                } else {
                    sb.append("  \\resumeProjectHeading\n");
                    sb.append("    {\\textbf{").append(escape(proj.getTitle())).append("}}{")
                            .append(escape(proj.getDate())).append("}\n");
                }

                sb.append("    \\resumeItemListStart\n");
                if (proj.getBulletPoints() != null) {
                    for (ResumeData.BulletPoint bp : proj.getBulletPoints()) {
                        String text = bp.isAccepted() ? bp.getImproved() : bp.getOriginal();
                        sb.append("      \\resumeItem{").append(escape(text)).append("}\n");
                    }
                }
                sb.append("    \\resumeItemListEnd\n");
                if (i < data.getProjects().size() - 1) {
                    sb.append("    \\vspace{4pt}\n");
                }
            }
            sb.append("\\resumeSubHeadingListEnd\n");
        }

        sb.append("\\end{document}\n");
        return sb.toString();
    }

    private String escape(String input) {
        if (input == null) return "";
        return input
                .replace("&", "\\&")
                .replace("%", "\\%")
                .replace("$", "\\$")
                .replace("#", "\\#")
                .replace("_", "\\_")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace("~", "\\textasciitilde ")
                .replace("^", "\\textasciicircum ");
    }
}