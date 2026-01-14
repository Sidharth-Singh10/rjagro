use printpdf::*;

use crate::pdf::consts::{MARGIN, PAGE_WIDTH};

pub fn draw_batch_info_section(ops: &mut Vec<Op>, start_y_mm: f32) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let gap_between_columns = 5.0; // Space between this box and the Sales box
    let full_content_width = PAGE_WIDTH - (MARGIN * 2.0);

    // Width is half of the total space, minus half the gap
    let section_width_mm = (full_content_width - gap_between_columns) / 2.0;

    let left_x_mm = MARGIN;

    // Y-offsets (Heights of rows)
    let header_height_mm = 8.0;
    let row_height_mm = 6.0;

    // Calculate total height based on 4 data rows + header
    // Rows: Chicks Place Date, Final Liquidation, Age, Avg Lifting Age
    let total_rows = 5.0;
    let section_height_mm = header_height_mm + (row_height_mm * (total_rows - 1.0));
    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW SHAPES (Box & Line) ---
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

    // Outer Box
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

    // Header Separator Line
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

    // (Helper closure redefined here for scope access)
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

    // -- Column X Coordinates --
    let label_x = left_x_mm + 2.0;
    // Calculate separator position roughly 65% across the box width
    let sep_x = left_x_mm + (section_width_mm * 0.65);
    let val_x = sep_x + 3.0;

    // -- HEADER --
    let header_text_y = start_y_mm - 5.5;
    draw_text_absolute(
        "BATCH INFORMATION",
        label_x, // Left aligned in header based on screenshot, or center if preferred
        header_text_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- ROW 1: CHICKS PLACE DATE --
    let row1_y = (start_y_mm - header_height_mm) - 5.0;
    draw_text_absolute(
        "CHICKS PLACE DATE",
        label_x,
        row1_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row1_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute(
        "15-November-25",
        val_x,
        row1_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    // -- ROW 2: FINAL LIQUIDATION DATE --
    let row2_y = row1_y - row_height_mm;
    draw_text_absolute(
        "FINAL LIQUIDATION DATE",
        label_x,
        row2_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row2_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute(
        "25-December-25",
        val_x,
        row2_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    // -- ROW 3: AGE AT LIQUIDATION --
    let row3_y = row2_y - row_height_mm;
    draw_text_absolute(
        "AGE AT LIQUIDATION",
        label_x,
        row3_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row3_y, BuiltinFont::HelveticaBold, 11.0);
    // Note: The screenshot shows the number aligned right, but standard text is left-aligned here.
    // If you need strict right alignment for numbers, you'd calculate text width.
    // For now, left aligned at value column is standard.
    draw_text_absolute("40", val_x, row3_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 4: AVG. LIFTING AGE --
    let row4_y = row3_y - row_height_mm;
    draw_text_absolute(
        "AVG. LIFTING AGE",
        label_x,
        row4_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row4_y, BuiltinFont::HelveticaBold, 11.0);
    // Value is empty in screenshot

    // Return the bottom Y coordinate so the next element can be placed below if needed
    // OR return the same start_y if the next element (Batch Sales) starts at the same height.
    end_y_mm
}

pub fn draw_batch_sales_info_section(ops: &mut Vec<Op>, start_y_mm: f32) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let gap_between_columns = 5.0;
    let full_content_width = PAGE_WIDTH - (MARGIN * 2.0);

    // Width is half of the total space, minus half the gap
    let section_width_mm = (full_content_width - gap_between_columns) / 2.0;

    // CRITICAL: The starting X for the right column is:
    // Margin + Width of Left Box + Gap
    let left_x_mm = MARGIN + section_width_mm + gap_between_columns;

    // Y-offsets
    let header_height_mm = 8.0;
    let row_height_mm = 6.0;

    // Calculate total height based on 6 data rows + header
    // Rows: Birds Sold, Total Weight, Avg Weight, Avg Rate, FCR, Converted FCR
    let total_rows = 7.0;
    let section_height_mm = header_height_mm + (row_height_mm * (total_rows - 1.0));
    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW SHAPES (Box & Line) ---
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

    // Outer Box
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

    // Header Separator Line
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

    // -- Column X Coordinates --
    let label_x = left_x_mm + 2.0;

    // These labels are long ("TOTAL WEIGHT..."), so we push the separator
    // further right than the previous box (approx 80mm from start of box)
    let sep_x = left_x_mm + (section_width_mm - 25.0);

    // We align values slightly to the right of the separator
    let val_x = sep_x + 3.0;

    // -- HEADER --
    let header_text_y = start_y_mm - 5.5;
    draw_text_absolute(
        "BATCH SALES INFORMATION",
        label_x,
        header_text_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- ROW 1: TOTAL BIRDS SOLD --
    let row1_y = (start_y_mm - header_height_mm) - 5.0;
    draw_text_absolute(
        "TOTAL BIRDS SOLD",
        label_x,
        row1_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row1_y, BuiltinFont::HelveticaBold, 11.0);

    // In the image, numbers are right-aligned. Here we are placing them at a fixed X.
    // If you need strict right alignment, you would calculate: (right_edge - text_width).
    // For now, placing them at val_x is consistent with your existing code.
    draw_text_absolute("2655", val_x, row1_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 2: TOTAL WEIGHT --
    let row2_y = row1_y - row_height_mm;
    draw_text_absolute(
        "TOTAL WEIGHT OF THE BIRDS(KG)",
        label_x,
        row2_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row2_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute("5284.65", val_x, row2_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 3: AVG WEIGHT --
    let row3_y = row2_y - row_height_mm;
    draw_text_absolute(
        "AVG. WEIGHT OF THE BIRDS(KG)",
        label_x,
        row3_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row3_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute("1.99", val_x, row3_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 4: AVG SELLING RATE --
    let row4_y = row3_y - row_height_mm;
    draw_text_absolute(
        "AVG. SELLING RATE/KG",
        label_x,
        row4_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row4_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute("0", val_x, row4_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 5: F.C.R. --
    let row5_y = row4_y - row_height_mm;
    draw_text_absolute("F.C.R.", label_x, row5_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute(":", sep_x, row5_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute("1.77", val_x, row5_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 6: CONVERTED F.C.R. --
    let row6_y = row5_y - row_height_mm;
    draw_text_absolute(
        "CONVERTED F.C.R.",
        label_x,
        row6_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", sep_x, row6_y, BuiltinFont::HelveticaBold, 11.0);
    // Value is empty in screenshot

    end_y_mm
}
