use axum::{
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use printpdf::*;
use reqwest::{header, Body, StatusCode};
use sea_orm::DatabaseConnection;

use crate::pdf::{
    bank_details::draw_remark_and_bank_section,
    basic_details::draw_growing_charges_section,
    batch_info::{draw_batch_info_section, draw_batch_sales_info_section},
    builder::{
        build_batch_info, build_batch_sales_info, build_farmer_details, calculate_batch_expenses,
    },
    consts::{COMPANY_ADDRESS, COMPANY_TITLE, MARGIN, PAGE_HEIGHT, PAGE_WIDTH},
    contexts::BatchExpensesCalculationContext,
    expanded_details::{draw_batch_expenses_section, draw_rearing_charges_section},
    footer::draw_dynamic_footer_section,
    view_models::Inputs,
};

pub fn draw_header(ops: &mut Vec<Op>, logo_image_id: XObjectId, logo_dims: (u32, u32)) {
    let target_width_mm = 10.0;
    let logo_top_margin = 30.0;
    let target_width_pt: Pt = Mm(target_width_mm).into();
    let image_width_px = logo_dims.0 as f32;
    let image_height_px = logo_dims.1 as f32;
    let scale = target_width_pt.0 / image_width_px;
    let logo_x = Mm(MARGIN).into_pt();
    let scaled_height_pt = image_height_px * scale;
    let logo_y = (Mm(PAGE_HEIGHT - logo_top_margin) - Pt(scaled_height_pt).into()).into_pt();

    ops.push(Op::UseXobject {
        id: logo_image_id,
        transform: XObjectTransform {
            translate_x: Some(logo_x),
            translate_y: Some(logo_y),
            scale_x: None,
            scale_y: None,
            rotate: None,
            dpi: None,
        },
    });

    ops.push(Op::SaveGraphicsState);

    ops.push(Op::StartTextSection);

    let title_text = COMPANY_TITLE;
    let title_size = 24.0;
    // Centering estimation for short title
    let title_x = PAGE_WIDTH / 2.0 - 25.0;
    let title_y = PAGE_HEIGHT - MARGIN - 10.0;

    ops.push(Op::SetFontSizeBuiltinFont {
        size: Pt(title_size),
        font: BuiltinFont::HelveticaBold,
    });

    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(title_x), Mm(title_y)),
    });

    ops.push(Op::WriteTextBuiltinFont {
        items: vec![TextItem::Text(title_text.to_string())],
        font: BuiltinFont::HelveticaBold,
    });

    ops.push(Op::EndTextSection);

    ops.push(Op::StartTextSection);

    let address_text = COMPANY_ADDRESS;
    let address_size = 10.0;
    let address_x = PAGE_WIDTH / 2.0 - 25.0;
    let address_y = title_y - 5.0;

    ops.push(Op::SetFontSizeBuiltinFont {
        size: Pt(address_size),
        font: BuiltinFont::Helvetica,
    });

    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(address_x), Mm(address_y)),
    });

    ops.push(Op::WriteTextBuiltinFont {
        items: vec![TextItem::Text(address_text.to_string())],
        font: BuiltinFont::Helvetica,
    });

    ops.push(Op::EndTextSection);

    ops.push(Op::RestoreGraphicsState);
}

pub async fn generate_pdf_handler(
    State(db): State<DatabaseConnection>,
    Json(input): Json<Inputs>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let batch_id = input.batch_id;
    let farmer_details = build_farmer_details(&db, batch_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let batch_info = build_batch_info(&db, batch_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let batch_sales_info = build_batch_sales_info(&db, batch_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let expenses_ctx =
        BatchExpensesCalculationContext::load(batch_id, batch_sales_info.clone(), input, &db)
            .await
            .map_err(|e| e.to_string())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let batch_expenses = calculate_batch_expenses(expenses_ctx);

    // 1. Create the PDF Document
    let mut doc = PdfDocument::new("Image Example");

    // 3. Load Image & Get Dimensions
    // We use the 'image' crate to decode it first to get dimensions easily
    let image_bytes = include_bytes!("../../assets/image/logo3.png");

    let image = RawImage::decode_from_bytes(image_bytes, &mut Vec::new()).unwrap();

    let image_id = doc.add_image(&image);

    let image_dims = (image.width as u32, image.height as u32);

    // Create the vector to hold low-level operations
    let mut ops = Vec::new();

    // 5. Call your custom draw function
    // We pass the operations vector, the IDs, and the dimensions
    draw_header(&mut ops, image_id, image_dims);

    let start_y_mm = PAGE_HEIGHT - MARGIN - 32.0;

    // 6. Draw Growing Charges Section
    // Note: We capture the returned 'end_y' in case we need to draw something below this later
    let growing_charges_end_y = draw_growing_charges_section(&mut ops, start_y_mm, farmer_details);

    let section_gap = 5.0;
    let split_section_start_y = growing_charges_end_y - section_gap;

    let batch_info_end_y = draw_batch_info_section(&mut ops, split_section_start_y, batch_info);
    let batch_sales_end_y =
        draw_batch_sales_info_section(&mut ops, split_section_start_y, batch_sales_info);

    let expenses_start_y2 = batch_info_end_y - section_gap;
    let expenses_start_y = batch_sales_end_y - section_gap;

    let expenses_end_y = draw_batch_expenses_section(&mut ops, expenses_start_y2, batch_expenses);
    let _rearing_end_y = draw_rearing_charges_section(&mut ops, expenses_start_y);

    let bank_details_start_y = expenses_end_y - 5.0;
    let remark_bank_end_y = draw_remark_and_bank_section(&mut ops, bank_details_start_y);
    draw_dynamic_footer_section(&mut ops, remark_bank_end_y);

    // 6. Apply the operations to the actual layer
    let page = PdfPage::new(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), ops);

    let pdf_bytes = doc
        .with_pages(vec![page])
        .save(&PdfSaveOptions::default(), &mut Vec::new());

    // 8. Return Response
    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"invoice_header.pdf\"",
        )
        .body(Body::from(pdf_bytes))
        .unwrap())
}
