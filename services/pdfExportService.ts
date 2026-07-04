import { PDFDocument, PDFHexString, rgb, degrees } from 'pdf-lib';
import { BoundingBox, ProjectData, TAG_COLORS } from '../types';
import { DEFAULT_PDF_EXPORT_OPTIONS, PdfExportOptions } from '../utils/exportOptions';

interface ExportPdfOptions {
    project: ProjectData;
    boxes: BoundingBox[];
    options?: PdfExportOptions;
}

const addCommentAnnotation = (
    pdfDoc: PDFDocument,
    page: ReturnType<PDFDocument['getPages']>[number],
    box: BoundingBox,
    rect: { x: number; y: number; width: number; height: number },
    color: { r: number; g: number; b: number },
) => {
    const comment = box.description?.trim();
    if (!comment) return;

    const annotation = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Square',
        Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
        Contents: PDFHexString.fromText(comment),
        T: PDFHexString.fromText(box.label || 'Smart PDF Tagger'),
        NM: PDFHexString.fromText(`smart-pdf-tagger-${box.id}`),
        M: PDFHexString.fromText(new Date().toISOString()),
        C: [color.r, color.g, color.b],
        CA: 0,
        Border: [0, 0, 0],
        F: 4,
    });

    const annotationRef = pdfDoc.context.register(annotation);
    page.node.addAnnot(annotationRef);
};

export const exportAnnotatedPdf = async ({ project, boxes, options = DEFAULT_PDF_EXPORT_OPTIONS }: ExportPdfOptions): Promise<void> => {
    const activeVersion = project.versions.find(v => v.id === project.activeVersionId);
    if (!activeVersion) return;

    try {
        const pdfDoc = await PDFDocument.load(activeVersion.pdfData);
        const helveticaFont = await pdfDoc.embedFont('Helvetica');
        const pages = pdfDoc.getPages();

        for (const box of boxes) {
            const pageIndex = box.page - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { width: rawW, height: rawH } = page.getSize();
            const rotation = page.getRotation().angle;

            // Canvas dimensions after rotation
            let canvasW = rawW, canvasH = rawH;
            if (rotation === 90 || rotation === 270) {
                canvasW = rawH;
                canvasH = rawW;
            }

            // Box in canvas pixels
            const cx = (box.x / 100) * canvasW;
            const cy = (box.y / 100) * canvasH;
            const cw = (box.width / 100) * canvasW;
            const ch = (box.height / 100) * canvasH;

            let rawX = 0, rawY = 0, rawWidth = 0, rawHeight = 0;

            if (rotation === 0) {
                rawX = cx;
                rawY = rawH - cy - ch;
                rawWidth = cw;
                rawHeight = ch;
            } else if (rotation === 90) {
                // For 90° CW rotation:
                // Visual top-left (0,0) = Raw top-right
                // Canvas X axis (right) = Raw Y axis (down from top = negative in raw)
                // Canvas Y axis (down) = Raw X axis (right)
                rawX = cy;
                rawY = cx;  // Changed: was rawH - cx - cw
                rawWidth = ch;
                rawHeight = cw;
            } else if (rotation === 180) {
                rawX = rawW - cx - cw;
                rawY = cy;
                rawWidth = cw;
                rawHeight = ch;
            } else if (rotation === 270) {
                rawX = rawW - cy - ch;
                rawY = rawH - cx - cw;  // Adjusted
                rawWidth = ch;
                rawHeight = cw;
            }

            // Parse color
            const hex = box.color || TAG_COLORS[2];
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const color = options.includeColors ? rgb(r, g, b) : rgb(0, 0, 0);
            const annotationColor = options.includeColors ? { r, g, b } : { r: 0, g: 0, b: 0 };

            // Draw Rectangle
            page.drawRectangle({
                x: rawX,
                y: rawY,
                width: rawWidth,
                height: rawHeight,
                borderColor: color,
                borderWidth: 2,
            });

            if (options.includeComments) {
                addCommentAnnotation(
                    pdfDoc,
                    page,
                    box,
                    { x: rawX, y: rawY, width: rawWidth, height: rawHeight },
                    annotationColor,
                );
            }

            // Draw Text - position above box visually
            const labelText = box.label || "Untitled";
            const textSize = 10;
            const textPadding = 4;

            let textX = rawX, textY = rawY + rawHeight + textPadding;
            let textRotation = 0;

            // For rotated pages, counter-rotate text so it appears upright
            if (rotation === 90) {
                textX = rawX - textPadding;
                textY = rawY;
                textRotation = 90;
            } else if (rotation === 180) {
                textX = rawX + rawWidth;
                textY = rawY - textPadding;
                textRotation = 180;
            } else if (rotation === 270) {
                textX = rawX + rawWidth + textPadding;
                textY = rawY + rawHeight;
                textRotation = -90;
            }

            if (options.includeLabels) {
                page.drawText(labelText, {
                    x: textX,
                    y: textY,
                    size: textSize,
                    font: helveticaFont,
                    color: color,
                    rotate: degrees(textRotation),
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.name}_annotated.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error exporting PDF", e);
        throw new Error("Failed to export PDF");
    }
};
