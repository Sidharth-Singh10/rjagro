use crate::pdf::consts::{MARGIN, PAGE_WIDTH};
use printpdf::*;

pub fn draw_batch_expenses_section(ops: &mut Vec<Op>, start_y_mm: f32) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let gap_between_columns = 5.0;
    let full_content_width = PAGE_WIDTH - (MARGIN * 2.0);

    // Width is half - gap/2
    let section_width_mm = (full_content_width - gap_between_columns) / 2.0;
    let left_x_mm = MARGIN;

    // Y-offsets
    let header_height_mm = 8.0;
    let row_height_mm = 6.0;

    // Total rows based on the image (Header + 18 data rows)
    let total_data_rows = 18.0;
    let section_height_mm = header_height_mm + (row_height_mm * total_data_rows);
    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW BOX ---
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

    let left: Pt = Mm(left_x_mm).into();
    let right: Pt = Mm(left_x_mm + section_width_mm).into();
    let top: Pt = Mm(start_y_mm).into();
    let bottom: Pt = Mm(end_y_mm).into();

    // Box
    ops.push(Op::DrawPolygon {
        polygon: printpdf::Polygon {
            rings: vec![PolygonRing {
                points: vec![
                    LinePoint {
                        p: Point { x: left, y: top },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point { x: right, y: top },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point {
                            x: right,
                            y: bottom,
                        },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point { x: left, y: bottom },
                        bezier: false,
                    },
                ],
            }],
            mode: printpdf::PaintMode::Stroke,
            winding_order: printpdf::WindingOrder::NonZero,
        },
    });

    // Header Line
    let header_line_y: Pt = Mm(start_y_mm - header_height_mm).into();
    ops.push(Op::DrawLine {
        line: printpdf::Line {
            points: vec![
                LinePoint {
                    p: Point {
                        x: left,
                        y: header_line_y,
                    },
                    bezier: false,
                },
                LinePoint {
                    p: Point {
                        x: right,
                        y: header_line_y,
                    },
                    bezier: false,
                },
            ],
            is_closed: false,
        },
    });
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

    let label_x = left_x_mm + 2.0;
    // Separator closer to right side to accommodate long labels
    let sep_x = left_x_mm + section_width_mm - 35.0;
    let val_x = sep_x + 3.0;

    // -- HEADER --
    draw_text_absolute(
        "BATCH EXPENSES",
        label_x,
        start_y_mm - 5.5,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- DATA ROWS --
    // Helper to advance Y
    let mut current_y = (start_y_mm - header_height_mm) - 5.0;

    let rows = vec![
        ("NET CHICKS", "2854"),
        ("CHICKS COST", "99890"),
        ("CUM. MORTALITY", "199"),
        ("TOTAL MORTALITY %", "6.97"),
        ("1ST WEEK MORTALITY", ""), // Empty in image
        ("1ST WEEK MORTALITY %", ""),
        ("1ST WEEK MORT. DEDUCT", ""),
        ("AFTER 7 DAYS MORT.", ""),
        ("AFTER 30 DAYS MORT.", ""),
        ("CULLS", ""),
        ("FEED CONSUMED(KG)", "9350"),
        ("FEED COST( 41 PER KG)", "383350"), // Note the space inside parens matches image
        ("MEDICINE COST", "4000"),
        ("MEDICINE COST/BIRD", "1.40"),
        ("ADMIN. COST", "14270"),
        ("GROSS PRODUCTION COST", "501510"),
        ("ACT. PRODUCTION COST/KG", "94.90"),
        ("STD. PRODUCTION COST/KG", "87"),
    ];

    for (label, value) in rows {
        draw_text_absolute(label, label_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(":", sep_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        if !value.is_empty() {
            draw_text_absolute(value, val_x, current_y, BuiltinFont::Helvetica, 11.0);
        }
        current_y -= row_height_mm;
    }

    end_y_mm
}

pub fn draw_rearing_charges_section(ops: &mut Vec<Op>, start_y_mm: f32) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let gap_between_columns = 5.0;
    let full_content_width = PAGE_WIDTH - (MARGIN * 2.0);
    let section_width_mm = (full_content_width - gap_between_columns) / 2.0;

    // Start X is Margin + Left Box Width + Gap
    let left_x_mm = MARGIN + section_width_mm + gap_between_columns;

    let header_height_mm = 8.0;
    let row_height_mm = 6.0;

    // Total rows (Header + 14 data rows)
    let total_data_rows = 14.0;
    let section_height_mm = header_height_mm + (row_height_mm * total_data_rows);
    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW BOX ---
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

    let left: Pt = Mm(left_x_mm).into();
    let right: Pt = Mm(left_x_mm + section_width_mm).into();
    let top: Pt = Mm(start_y_mm).into();
    let bottom: Pt = Mm(end_y_mm).into();

    ops.push(Op::DrawPolygon {
        polygon: printpdf::Polygon {
            rings: vec![PolygonRing {
                points: vec![
                    LinePoint {
                        p: Point { x: left, y: top },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point { x: right, y: top },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point {
                            x: right,
                            y: bottom,
                        },
                        bezier: false,
                    },
                    LinePoint {
                        p: Point { x: left, y: bottom },
                        bezier: false,
                    },
                ],
            }],
            mode: printpdf::PaintMode::Stroke,
            winding_order: printpdf::WindingOrder::NonZero,
        },
    });

    let header_line_y: Pt = Mm(start_y_mm - header_height_mm).into();
    ops.push(Op::DrawLine {
        line: printpdf::Line {
            points: vec![
                LinePoint {
                    p: Point {
                        x: left,
                        y: header_line_y,
                    },
                    bezier: false,
                },
                LinePoint {
                    p: Point {
                        x: right,
                        y: header_line_y,
                    },
                    bezier: false,
                },
            ],
            is_closed: false,
        },
    });
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

    let label_x = left_x_mm + 2.0;
    // Labels here are long ("MORTALITY DEDUCTION/EARNING"), push separator right
    let sep_x = left_x_mm + section_width_mm - 28.0;
    let val_x = sep_x + 3.0;

    // -- HEADER --
    draw_text_absolute(
        "REARING CHARGES",
        label_x,
        start_y_mm - 5.5,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- DATA ROWS --
    let mut current_y = (start_y_mm - header_height_mm) - 5.0;

    let rows = vec![
        ("REARING CHARGES/KG", "4.05"),
        ("STD. REARING CHARGES/KG", "4.05"),
        ("PROD.COST INCENTIVES", "0"),
        ("REARING CHARGES/BIRD", "8.06"),
        ("TOTAL REARING CHARGES", "21404.475"),
        ("F.C.R. DEDUCT/EARNING", "0"),
        ("MORTALITY DEDUCT/EARNING", "0"),
        ("OTHER DEDUCTION", "0"),
        ("BIRD SHORTAGE COST", "0"),
        ("F.C.R INCENTIVES", "0"),
        ("MARKET INCENTIVES", "0"),
        ("CHARGES PAYABLE", "21404.475"),
        ("T.D.S. (%)", "0"),
        ("NET GROWING CHARGES", "21404.475"),
    ];

    for (label, value) in rows {
        draw_text_absolute(label, label_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(":", sep_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(value, val_x, current_y, BuiltinFont::Helvetica, 11.0);
        current_y -= row_height_mm;
    }

    end_y_mm
}
