package com.lockin.rewrite.service;

import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@Service
public class DocumentParserService {

    public String parseDocx(byte[] fileData) {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(fileData);
                XWPFDocument document = new XWPFDocument(inputStream);
                XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {

            return extractor.getText();

        } catch (IOException e) {
            throw new RuntimeException("Failed to parse DOCX file", e);
        }
    }

    public String parsePdf(byte[] fileData) {
        try (PDDocument document = Loader.loadPDF(fileData)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse PDF file", e);
        }
    }
}
