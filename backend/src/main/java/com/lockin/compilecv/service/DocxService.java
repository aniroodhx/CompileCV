package com.lockin.compilecv.service;

import com.lockin.compilecv.model.resume.ResumeData;
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;

@Service
public class DocxService {

    public byte[] generateDocx(ResumeData data) throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Page margins — tight like the LaTeX PDF ───────────────────────
            CTSectPr sectPr = doc.getDocument().getBody().addNewSectPr();
            CTPageMar pageMar = sectPr.addNewPgMar();
            pageMar.setTop(BigInteger.valueOf(720));
            pageMar.setBottom(BigInteger.valueOf(720));
            pageMar.setLeft(BigInteger.valueOf(900));
            pageMar.setRight(BigInteger.valueOf(900));

            // ── Personal Info ─────────────────────────────────────────────────
            ResumeData.PersonalInfo info = data.getPersonalInfo();
            if (info != null) {
                XWPFParagraph namePara = doc.createParagraph();
                namePara.setAlignment(ParagraphAlignment.CENTER);
                setSpacing(namePara, 0, 40);
                XWPFRun nameRun = namePara.createRun();
                nameRun.setText(safe(info.getName()));
                nameRun.setBold(true);
                nameRun.setFontSize(14);
                nameRun.setFontFamily("Calibri");

                XWPFParagraph contactPara = doc.createParagraph();
                contactPara.setAlignment(ParagraphAlignment.CENTER);
                setSpacing(contactPara, 0, 60);
                XWPFRun contactRun = contactPara.createRun();
                StringBuilder contact = new StringBuilder();
                if (notEmpty(info.getPhone())) contact.append(info.getPhone());
                if (notEmpty(info.getEmail())) {
                    if (contact.length() > 0) contact.append("  |  ");
                    contact.append(info.getEmail());
                }
                if (notEmpty(info.getLinkedin())) {
                    if (contact.length() > 0) contact.append("  |  ");
                    contact.append(info.getLinkedin());
                }
                contactRun.setText(contact.toString());
                contactRun.setFontSize(9);
                contactRun.setFontFamily("Calibri");
            }

            // ── Skills ────────────────────────────────────────────────────────
            if (data.getSkills() != null) {
                addSectionHeader(doc, "SKILLS");
                ResumeData.Skills skills = data.getSkills();
                if (notEmpty(skills.getLanguages())) addSkillLine(doc, "Languages", skills.getLanguages());
                if (notEmpty(skills.getFrameworks())) addSkillLine(doc, "Frameworks", skills.getFrameworks());
                if (notEmpty(skills.getTools())) addSkillLine(doc, "Tools", skills.getTools());
            }

            // ── Education ─────────────────────────────────────────────────────
            if (data.getEducation() != null && !data.getEducation().isEmpty()) {
                addSectionHeader(doc, "EDUCATION");
                for (ResumeData.Education edu : data.getEducation()) {
                    XWPFParagraph p = doc.createParagraph();
                    setSpacing(p, 0, 0);
                    addTwoColumnRuns(p, safe(edu.getSchool()), safe(edu.getDate()), true);
                    XWPFParagraph p2 = doc.createParagraph();
                    setSpacing(p2, 0, 20);
                    addTwoColumnRuns(p2, safe(edu.getDegree()), safe(edu.getGpa()), false);
                }
            }

            // ── Experience ────────────────────────────────────────────────────
            if (data.getExperience() != null && !data.getExperience().isEmpty()) {
                addSectionHeader(doc, "INDUSTRIAL EXPERIENCE");
                for (ResumeData.Experience exp : data.getExperience()) {
                    XWPFParagraph p = doc.createParagraph();
                    setSpacing(p, 0, 0);
                    addTwoColumnRuns(p, safe(exp.getTitle()) + " \u2014 " + safe(exp.getCompany()), safe(exp.getDate()), true);
                    if (notEmpty(exp.getLocation()) || notEmpty(exp.getSummary())) {
                        XWPFParagraph p2 = doc.createParagraph();
                        setSpacing(p2, 0, 0);
                        addTwoColumnRuns(p2, safe(exp.getSummary()), safe(exp.getLocation()), false);
                    }
                    if (exp.getBulletPoints() != null) {
                        for (ResumeData.BulletPoint bp : exp.getBulletPoints()) {
                            String text = bp.isAccepted() ? safe(bp.getImproved()) : safe(bp.getOriginal());
                            addBullet(doc, text);
                        }
                    }
                }
            }

            // ── Projects ──────────────────────────────────────────────────────
            if (data.getProjects() != null && !data.getProjects().isEmpty()) {
                addSectionHeader(doc, "PROJECTS");
                for (ResumeData.Project proj : data.getProjects()) {
                    XWPFParagraph p = doc.createParagraph();
                    setSpacing(p, 0, 0);
                    String titleStr = safe(proj.getTitle());
                    if (notEmpty(proj.getLink())) titleStr += " (" + proj.getLink() + ")";
                    addTwoColumnRuns(p, titleStr, safe(proj.getDate()), true);
                    if (proj.getBulletPoints() != null) {
                        for (ResumeData.BulletPoint bp : proj.getBulletPoints()) {
                            String text = bp.isAccepted() ? safe(bp.getImproved()) : safe(bp.getOriginal());
                            addBullet(doc, text);
                        }
                    }
                }
            }

            // ── Certifications ────────────────────────────────────────────────
            if (data.getCertifications() != null && !data.getCertifications().isEmpty()) {
                addSectionHeader(doc, "CERTIFICATIONS");
                for (ResumeData.Certification cert : data.getCertifications()) {
                    XWPFParagraph p = doc.createParagraph();
                    setSpacing(p, 0, 20);
                    p.setIndentationLeft(200);
                    XWPFRun r = p.createRun();
                    String certText = safe(cert.getName());
                    if (notEmpty(cert.getIssuer())) certText += ", " + cert.getIssuer();
                    r.setText("\u2022 " + certText);
                    r.setFontSize(9);
                    r.setFontFamily("Calibri");
                }
            }

            doc.write(out);
            return out.toByteArray();
        }
    }

    private void addSectionHeader(XWPFDocument doc, String title) {
        XWPFParagraph p = doc.createParagraph();
        setSpacing(p, 80, 20);
        addTopBorder(p);
        XWPFRun r = p.createRun();
        r.setText(title);
        r.setBold(true);
        r.setFontSize(10);
        r.setFontFamily("Calibri");
        r.setSmallCaps(true);
    }

    private void addTwoColumnRuns(XWPFParagraph p, String left, String right, boolean bold) {
        XWPFRun leftRun = p.createRun();
        leftRun.setText(left);
        leftRun.setBold(bold);
        leftRun.setFontSize(bold ? 10 : 9);
        leftRun.setFontFamily("Calibri");
        if (notEmpty(right)) {
            p.createRun().addTab();
            XWPFRun rightRun = p.createRun();
            rightRun.setText(right);
            rightRun.setBold(bold);
            rightRun.setFontSize(bold ? 10 : 9);
            rightRun.setFontFamily("Calibri");
            CTPPr ppr = p.getCTP().getPPr() != null ? p.getCTP().getPPr() : p.getCTP().addNewPPr();
            CTTabs tabs = ppr.getTabs() != null ? ppr.getTabs() : ppr.addNewTabs();
            CTTabStop tab = tabs.addNewTab();
            tab.setVal(STTabJc.RIGHT);
            tab.setPos(BigInteger.valueOf(9350));
        }
    }

    private void addSkillLine(XWPFDocument doc, String label, String value) {
        XWPFParagraph p = doc.createParagraph();
        setSpacing(p, 0, 20);
        p.setIndentationLeft(200);
        XWPFRun labelRun = p.createRun();
        labelRun.setText(label + ": ");
        labelRun.setBold(true);
        labelRun.setFontSize(9);
        labelRun.setFontFamily("Calibri");
        XWPFRun valRun = p.createRun();
        valRun.setText(value);
        valRun.setFontSize(9);
        valRun.setFontFamily("Calibri");
    }

    private void addBullet(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        setSpacing(p, 0, 20);
        p.setIndentationLeft(360);
        p.setIndentationHanging(180);
        XWPFRun r = p.createRun();
        r.setText("\u2014 " + text);
        r.setFontSize(9);
        r.setFontFamily("Calibri");
    }

    private void setSpacing(XWPFParagraph p, int before, int after) {
        CTPPr ppr = p.getCTP().getPPr() != null ? p.getCTP().getPPr() : p.getCTP().addNewPPr();
        CTSpacing spacing = ppr.getSpacing() != null ? ppr.getSpacing() : ppr.addNewSpacing();
        if (before >= 0) spacing.setBefore(BigInteger.valueOf(before));
        if (after >= 0) spacing.setAfter(BigInteger.valueOf(after));
        spacing.setLine(BigInteger.valueOf(240)); // single line spacing
        spacing.setLineRule(STLineSpacingRule.AUTO);
    }

    private void addTopBorder(XWPFParagraph p) {
        CTPPr ppr = p.getCTP().getPPr() != null ? p.getCTP().getPPr() : p.getCTP().addNewPPr();
        CTPBdr border = ppr.getPBdr() != null ? ppr.getPBdr() : ppr.addNewPBdr();
        CTBorder bottom = border.addNewBottom();
        bottom.setVal(STBorder.SINGLE);
        bottom.setSz(BigInteger.valueOf(4));
        bottom.setSpace(BigInteger.valueOf(1));
        bottom.setColor("000000");
    }

    private boolean notEmpty(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}