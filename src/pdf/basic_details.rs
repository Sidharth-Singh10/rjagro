use crate::pdf::{
    consts::{MARGIN, PAGE_WIDTH},
    view_models::FarmerDetails,
};
use printpdf::*;

pub fn draw_growing_charges_section(
    ops: &mut Vec<Op>,
    start_y_mm: f32,
    farmer_details: FarmerDetails,
) -> f32 {
    // --- LAYOUT CONSTANTS ---
    let section_width_mm = PAGE_WIDTH - (MARGIN * 2.0);
    let left_x_mm = MARGIN;

    // Y-offsets (Heights of rows)
    let header_height_mm = 8.0;
    let row_height_mm = 6.0;

    // Calculate total height
    let total_rows = 5.0;
    let section_height_mm = header_height_mm + (row_height_mm * (total_rows - 1.0));
    let end_y_mm = start_y_mm - section_height_mm;

    // --- 1. DRAW SHAPES (Box & Line) ---
    // (This part was working fine)
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

    // Separator Line
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

    // --- 2. DRAW TEXT (Using Absolute Positioning Helper) ---

    // Helper closure to draw independent text blocks
    // We pass 'ops' as a mutable reference so we can push to it
    let mut draw_text_absolute =
        |text: &str, x_mm: f32, y_mm: f32, font: BuiltinFont, size: f32| {
            ops.push(Op::StartTextSection); // Reset matrix to Identity

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

            // Because we started a NEW section, this coordinate is Absolute (relative to page 0,0)
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
    let col1_label_x = left_x_mm + 2.0;
    let col1_val_x = left_x_mm + 55.0;
    let col2_label_x = left_x_mm + 95.0;
    let col2_sep_x = left_x_mm + 135.0;
    let col2_val_x = left_x_mm + 140.0;

    // -- HEADER TITLE --
    let header_text_y = start_y_mm - 5.5;
    let header_center_x = left_x_mm + (section_width_mm / 2.0) - 20.0;
    draw_text_absolute(
        "GROWING CHARGES",
        header_center_x,
        header_text_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- ROW 1: "FARMER DETAILS -" --
    let row1_y = (start_y_mm - header_height_mm) - 5.0;
    draw_text_absolute(
        "FARMER DETAILS -",
        col1_label_x,
        row1_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );

    // -- ROW 2: FARMER NAME --
    let row2_y = row1_y - row_height_mm;
    draw_text_absolute(
        "FARMER NAME   :",
        col1_label_x,
        row2_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(
        &farmer_details.farmer_name,
        col1_val_x,
        row2_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    // -- ROW 3: MOB NO & SHED NO --
    let row3_y = row2_y - row_height_mm;
    draw_text_absolute(
        "FARM MOB. NO. :",
        col1_label_x,
        row3_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(
        &farmer_details.phone_number,
        col1_val_x,
        row3_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    draw_text_absolute(
        "SHED NO.",
        col2_label_x,
        row3_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", col2_sep_x, row3_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute("1", col2_val_x, row3_y, BuiltinFont::Helvetica, 11.0);

    // -- ROW 4: DATE & BATCH NO --
    let row4_y = row3_y - row_height_mm;
    draw_text_absolute(
        "DATE: ",
        col1_label_x,
        row4_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(
        &farmer_details.date.to_string(),
        col1_val_x,
        row4_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    draw_text_absolute(
        "BATCH NO.",
        col2_label_x,
        row4_y,
        BuiltinFont::HelveticaBold,
        11.0,
    );
    draw_text_absolute(":", col2_sep_x, row4_y, BuiltinFont::HelveticaBold, 11.0);
    draw_text_absolute(
        &farmer_details.get_batch_id(),
        col2_val_x,
        row4_y,
        BuiltinFont::Helvetica,
        11.0,
    );

    end_y_mm
}
