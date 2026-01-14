use crate::pdf::consts::{MARGIN, PAGE_WIDTH};
use printpdf::*;

pub fn draw_dynamic_footer_section(ops: &mut Vec<Op>, start_y_mm: f32) {
    let padding_top = 20.0;
    let signature_line_y = start_y_mm - padding_top;

    ops.push(Op::SaveGraphicsState);
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
        size: Pt(11.0),
        font: BuiltinFont::HelveticaBold,
    });

    // Left Signature
    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(MARGIN), Mm(signature_line_y)),
    });
    ops.push(Op::WriteTextBuiltinFont {
        items: vec![TextItem::Text("RECEIVER'S SIGNATURE".to_string())],
        font: BuiltinFont::HelveticaBold,
    });

    // Right Signature
    let right_text_width = 60.0;
    let right_x = (PAGE_WIDTH - MARGIN) - right_text_width;

    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(right_x), Mm(signature_line_y - 4.0)),
    });
    ops.push(Op::WriteTextBuiltinFont {
        items: vec![TextItem::Text("SUPERVISOR SIGNATURE".to_string())],
        font: BuiltinFont::HelveticaBold,
    });

    ops.push(Op::EndTextSection);
    ops.push(Op::RestoreGraphicsState);
}
