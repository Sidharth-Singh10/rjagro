use crate::pdf::{
    consts::{MARGIN, PAGE_WIDTH},
    view_models::{BatchExpenses, RearingCharges},
};
use printpdf::*;

pub fn draw_batch_expenses_section(
    ops: &mut Vec<Op>,
    start_y_mm: f32,
    batch_expenses: BatchExpenses,
) -> f32 {
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
        ("NET CHICKS", batch_expenses.get_net_chicks()),
        ("CHICKS COST", batch_expenses.get_chicks_cost()),
        ("CUM. MORTALITY", batch_expenses.get_cum_mortality()),
        (
            "TOTAL MORTALITY %",
            batch_expenses.get_total_mortality_per(),
        ),
        (
            "1ST WEEK MORTALITY",
            batch_expenses.get_first_week_mortality(),
        ),
        (
            "1ST WEEK MORTALITY %",
            batch_expenses.get_first_week_mortality_per(),
        ),
        (
            "1ST WEEK MORT. DEDUCT",
            batch_expenses.get_first_week_mortality_deduction(),
        ),
        (
            "AFTER 7 DAYS MORT.",
            batch_expenses.get_after_seven_days_mortality(),
        ),
        (
            "AFTER 30 DAYS MORT.",
            batch_expenses.get_after_thirty_days_mortality(),
        ),
        ("CULLS", batch_expenses.get_culls()),
        ("FEED CONSUMED(KG)", batch_expenses.get_feed_consumed_kg()),
        ("FEED COST( 41 PER KG)", batch_expenses.get_feed_cost()),
        ("MEDICINE COST", batch_expenses.get_medicine_cost()),
        (
            "MEDICINE COST/BIRD",
            batch_expenses.get_medicine_cost_per_bird(),
        ),
        ("ADMIN. COST", batch_expenses.get_admin_cost()),
        (
            "GROSS PRODUCTION COST",
            batch_expenses.get_gross_production_cost(),
        ),
        (
            "ACT. PRODUCTION COST/KG",
            batch_expenses.get_actual_production_cost_per_kg(),
        ),
        (
            "STD. PRODUCTION COST/KG",
            batch_expenses.get_standard_production_cost_per_kg(),
        ),
    ];

    for (label, value) in rows {
        draw_text_absolute(label, label_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(":", sep_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        if !value.is_empty() {
            draw_text_absolute(&value, val_x, current_y, BuiltinFont::Helvetica, 11.0);
        }
        current_y -= row_height_mm;
    }

    end_y_mm
}

pub fn draw_rearing_charges_section(
    ops: &mut Vec<Op>,
    start_y_mm: f32,
    rearing_charges: RearingCharges,
) -> f32 {
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
        (
            "REARING CHARGES/KG",
            rearing_charges.get_rearing_charges_per_kg(),
        ),
        (
            "STD. REARING CHARGES/KG",
            rearing_charges.get_std_rearing_charges_per_kg(),
        ),
        (
            "PROD.COST INCENTIVES",
            rearing_charges.get_prod_cost_incentives(),
        ),
        (
            "REARING CHARGES/BIRD",
            rearing_charges.get_rearing_charges_per_bird(),
        ),
        (
            "TOTAL REARING CHARGES",
            rearing_charges.get_total_rearing_charges(),
        ),
        (
            "F.C.R. DEDUCT/EARNING",
            rearing_charges.get_fcr_deduct_earning(),
        ),
        (
            "MORTALITY DEDUCT/EARNING",
            rearing_charges.get_mortality_deduct_earning(),
        ),
        ("OTHER DEDUCTION", rearing_charges.get_other_deduction()),
        (
            "BIRD SHORTAGE COST",
            rearing_charges.get_bird_shortage_cost(),
        ),
        ("F.C.R INCENTIVES", rearing_charges.get_fcr_incentives()),
        ("MARKET INCENTIVES", rearing_charges.get_market_incentives()),
        ("CHARGES PAYABLE", rearing_charges.get_charges_payable()),
        ("T.D.S. (%)", rearing_charges.get_tds_percentage()),
        (
            "NET GROWING CHARGES",
            rearing_charges.get_net_growing_charges(),
        ),
    ];

    for (label, value) in rows {
        draw_text_absolute(label, label_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(":", sep_x, current_y, BuiltinFont::HelveticaBold, 11.0);
        draw_text_absolute(&value, val_x, current_y, BuiltinFont::Helvetica, 11.0);
        current_y -= row_height_mm;
    }

    end_y_mm
}
