use printpdf::*;

use crate::pdf::consts::{MARGIN, PAGE_WIDTH};

pub fn draw_remark_and_bank_section(ops: &mut Vec<Op>, start_y_mm: f32) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let gap_between_columns = 5.0;
    let full_content_width = PAGE_WIDTH - (MARGIN * 2.0);
    let section_width_mm = (full_content_width - gap_between_columns) / 2.0;

    // Start X positions
    let left_box_x = MARGIN;
    let right_box_x = MARGIN + section_width_mm + gap_between_columns;

    // Height Calculation
    // We base the height on the "Bank Details" content which is taller (Header + 4 rows)
    let header_height_mm = 8.0;
    let row_height_mm = 7.0;
    let total_rows = 5.0; // Header, Name, A/C, IFSC, Type
    let section_height_mm = header_height_mm + (row_height_mm * (total_rows - 1.0));

    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW BOXES ---
    ops.push(Op::SaveGraphicsState);
    ops.push(Op::SetOutlineThickness { pt: Pt(1.0) });
    ops.push(Op::SetOutlineColor {
        col: Color::Rgb(Rgb {
            r: 0.0,
            g: 0.0,
            b: 0.0,
            icc_profile: None,
        }),
    });

    // Helper to draw a rectangle
    let mut draw_rect = |x_mm: f32, width_mm: f32| {
        let l: Pt = Mm(x_mm).into();
        let r: Pt = Mm(x_mm + width_mm).into();
        let t: Pt = Mm(start_y_mm).into();
        let b: Pt = Mm(end_y_mm).into();

        ops.push(Op::DrawPolygon {
            polygon: printpdf::Polygon {
                rings: vec![PolygonRing {
                    points: vec![
                        LinePoint {
                            p: Point { x: l, y: t },
                            bezier: false,
                        },
                        LinePoint {
                            p: Point { x: r, y: t },
                            bezier: false,
                        },
                        LinePoint {
                            p: Point { x: r, y: b },
                            bezier: false,
                        },
                        LinePoint {
                            p: Point { x: l, y: b },
                            bezier: false,
                        },
                    ],
                }],
                mode: printpdf::PaintMode::Stroke,
                winding_order: printpdf::WindingOrder::NonZero,
            },
        });

        // Header separator line
        let header_y: Pt = Mm(start_y_mm - header_height_mm).into();
        ops.push(Op::DrawLine {
            line: printpdf::Line {
                points: vec![
                    LinePoint {
                        p: Point { x: l, y: header_y },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point { x: r, y: header_y },
                        bezier: false,
                    },
                ],
                is_closed: false,
            },
        });
    };

    // Draw Left Box (Remarks)
    draw_rect(left_box_x, section_width_mm);
    // Draw Right Box (Bank Details)
    draw_rect(right_box_x, section_width_mm);

    ops.push(Op::RestoreGraphicsState);

    // --- 2. DRAW TEXT ---
    let mut draw_text_absolute =
        |text: &str, x_mm: f32, y_mm: f32, font: BuiltinFont, size: f32| {
            ops.push(Op::StartTextSection);
            ops.push(Op::SetFillColor {
                col: Color::Rgb(Rgb {
                    r: 0.0,
                    g: 0.0,
                    b: 0.0,
                    icc_profile: None,
                }),
            });
            ops.push(Op::SetFontSizeBuiltinFont {
                size: Pt(size),
                font,
            });
            ops.push(Op::SetTextCursor {
                pos: Point::new(Mm(x_mm), Mm(y_mm)),
            });
            ops.push(Op::WriteTextBuiltinFont {
                items: vec![TextItem::Text(text.to_string())],
                font,
            });
            ops.push(Op::EndTextSection);
        };

    // --- LEFT BOX CONTENT (REMARKS) ---
    // Header
    let header_y = start_y_mm - 5.5;
    draw_text_absolute(
        "REMARK",
        left_box_x + 2.0,
        header_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // Content
    let remark_content_y = (start_y_mm - header_height_mm) - 5.0;
    // We place the "Total Payable" info here as part of the remark block
    draw_text_absolute(
        "TOTAL PAYABLE AMOUNT :",
        left_box_x + 2.0,
        remark_content_y,
        BuiltinFont::HelveticaBold,
        10.0,
    );
    draw_text_absolute(
        "21404.5 INR Only",
        left_box_x + 2.0,
        remark_content_y - 6.0,
        BuiltinFont::Helvetica,
        10.0,
    );

    // --- RIGHT BOX CONTENT (BANK DETAILS) ---
    // Header
    draw_text_absolute(
        "BANK DETAILS",
        right_box_x + 2.0,
        header_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // Content Rows
    let col1_x = right_box_x + 2.0;
    let sep_x = right_box_x + 35.0; // Label width approx 35mm
    let col2_x = sep_x + 3.0;

    let mut current_y = (start_y_mm - header_height_mm) - 5.0;
    let bank_rows = vec![
        ("NAME", "RAKESH RAO"),
        ("A/C NO.", ""),
        ("IFSC CODE", ""),
        ("A/C TYPE", ""),
    ];

    for (label, val) in bank_rows {
        draw_text_absolute(label, col1_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(":", sep_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        if !val.is_empty() {
            draw_text_absolute(val, col2_x, current_y, BuiltinFont::Helvetica, 11.0);
        }
        current_y -= row_height_mm;
    }

    end_y_mm
}
